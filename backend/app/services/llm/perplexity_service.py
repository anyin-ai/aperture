"""Perplexity AI integration."""

import time

import httpx

from app.services.llm import (
    DEFAULT_MAX_TOKENS,
    DEFAULT_TEMPERATURE,
    LLMResponse,
    extract_chat_content,
)
from app.services.llm.retry import post_with_retries

PERPLEXITY_CHAT_URL = "https://api.perplexity.ai/chat/completions"

DEFAULT_SYSTEM_PROMPT = (
    "You are a helpful assistant. Answer the user's question thoroughly and honestly, "
    "citing sources where possible."
)


def _extract_sources(data: dict) -> list[str]:
    """Collect citation URLs from both the legacy 'citations' array and the
    current 'search_results' array, tolerating str/dict forms. De-duplicated,
    order-preserving, empties removed.
    """
    sources: list[str] = []
    for citation in data.get("citations", []) or []:
        if isinstance(citation, str):
            sources.append(citation)
        elif isinstance(citation, dict):
            sources.append(citation.get("url") or citation.get("source") or "")
    for result in data.get("search_results", []) or []:
        if isinstance(result, dict):
            sources.append(result.get("url") or "")
        elif isinstance(result, str):
            sources.append(result)

    seen: set[str] = set()
    deduped: list[str] = []
    for s in sources:
        if s and s not in seen:
            seen.add(s)
            deduped.append(s)
    return deduped


async def query_perplexity(
    prompt: str,
    api_key: str,
    # Default mirrors app.services.llm.providers.default_model("perplexity").
    # The audit path always passes an explicit model; this is a safety net only.
    model: str = "sonar",
) -> LLMResponse:
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": DEFAULT_SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        "return_citations": True,
        "temperature": DEFAULT_TEMPERATURE,
        "max_tokens": DEFAULT_MAX_TOKENS,
    }

    start = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await post_with_retries(client, PERPLEXITY_CHAT_URL, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
    except Exception as exc:
        latency_ms = int((time.monotonic() - start) * 1000)
        return LLMResponse(text="", model=model, sources=[], latency_ms=latency_ms, error=str(exc))

    latency_ms = int((time.monotonic() - start) * 1000)
    content = extract_chat_content(data)
    if content is None:
        return LLMResponse(
            text="", model=model, sources=[], latency_ms=latency_ms,
            error="Unexpected Perplexity response shape",
        )
    return LLMResponse(text=content, model=model, sources=_extract_sources(data), latency_ms=latency_ms)
