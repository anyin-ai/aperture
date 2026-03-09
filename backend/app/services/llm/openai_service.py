"""OpenAI / ChatGPT integration."""

import time
from typing import Optional

import httpx

from app.services.llm import LLMResponse

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
    }

    start = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
    except Exception as exc:
        latency_ms = int((time.monotonic() - start) * 1000)
        return LLMResponse(text="", model=model, sources=[], latency_ms=latency_ms, error=str(exc))

    latency_ms = int((time.monotonic() - start) * 1000)
    text = data["choices"][0]["message"]["content"]
    return LLMResponse(text=text, model=model, sources=[], latency_ms=latency_ms)
