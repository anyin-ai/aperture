"""Perplexity AI integration."""

import time

import httpx

from app.services.llm import LLMResponse

PERPLEXITY_CHAT_URL = "https://api.perplexity.ai/chat/completions"

DEFAULT_SYSTEM_PROMPT = (
    "You are a helpful assistant. Answer the user's question thoroughly and honestly, "
    "citing sources where possible."
)


async def query_perplexity(
    prompt: str,
    api_key: str,
    model: str = "llama-3.1-sonar-small-128k-online",
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
    }

    start = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(PERPLEXITY_CHAT_URL, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
    except Exception as exc:
        latency_ms = int((time.monotonic() - start) * 1000)
        return LLMResponse(text="", model=model, sources=[], latency_ms=latency_ms, error=str(exc))

    latency_ms = int((time.monotonic() - start) * 1000)
    text = data["choices"][0]["message"]["content"]
    sources: list[str] = []
    for citation in data.get("citations", []):
        if isinstance(citation, str):
            sources.append(citation)
        elif isinstance(citation, dict):
            sources.append(citation.get("url", ""))

    return LLMResponse(text=text, model=model, sources=[s for s in sources if s], latency_ms=latency_ms)
