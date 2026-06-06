"""OpenAI / ChatGPT integration."""

import time
from typing import Optional

import httpx

from app.services.llm import (
    DEFAULT_MAX_TOKENS,
    DEFAULT_TEMPERATURE,
    LLMResponse,
    extract_chat_content,
)
from app.services.llm.retry import post_with_retries

OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions"

DEFAULT_SYSTEM_PROMPT = (
    "You are a helpful assistant. Answer the user's question thoroughly and honestly."
)


async def query_openai(
    prompt: str,
    api_key: str,
    model: str = "gpt-4o-mini",
    base_url: Optional[str] = None,
    system_prompt: str = DEFAULT_SYSTEM_PROMPT,
) -> LLMResponse:
    url = base_url or OPENAI_CHAT_URL
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
        # Pinned for reproducible, cost-bounded audits (see app.services.llm).
        "temperature": DEFAULT_TEMPERATURE,
        "max_tokens": DEFAULT_MAX_TOKENS,
    }

    start = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await post_with_retries(client, url, json=payload, headers=headers)
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
            error="Unexpected OpenAI response shape",
        )
    return LLMResponse(text=content, model=model, sources=[], latency_ms=latency_ms)
