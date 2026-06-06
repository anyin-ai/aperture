"""Bounded async retry with exponential backoff + jitter for provider calls.

Retries only transient failures (HTTP 429 and 5xx), honoring ``Retry-After``
when present. Permanent failures (401 bad key, 400 bad model, other 4xx) are
returned immediately so they surface as the per-result error without delay.

Implemented as a small explicit loop on purpose (no ``tenacity``, no httpx
transport retries) so the Retry-After + jitter behavior is visible and testable.
"""

from __future__ import annotations

import asyncio
import random

import httpx

from app.services.llm import DEFAULT_BASE_DELAY, DEFAULT_MAX_RETRIES


def _retry_after_seconds(resp: httpx.Response) -> float | None:
    value = resp.headers.get("Retry-After")
    if not value:
        return None
    try:
        return float(int(value))
    except (TypeError, ValueError):
        return None  # HTTP-date form is not honored; fall back to backoff


async def post_with_retries(
    client: httpx.AsyncClient,
    url: str,
    *,
    json: dict,
    headers: dict,
    max_retries: int = DEFAULT_MAX_RETRIES,
    base_delay: float = DEFAULT_BASE_DELAY,
    max_delay: float = 8.0,
) -> httpx.Response:
    """POST with bounded retries on 429/5xx. Returns the last response.

    Never raises for HTTP status; the caller's ``raise_for_status()`` keeps the
    existing error-surfacing behavior after retries are exhausted.
    """
    resp = await client.post(url, json=json, headers=headers)
    for attempt in range(max_retries):
        retryable = resp.status_code == 429 or 500 <= resp.status_code < 600
        if not retryable:
            return resp
        retry_after = _retry_after_seconds(resp)
        if retry_after is not None:
            delay = min(max_delay, retry_after)
        else:
            delay = min(max_delay, base_delay * 2 ** attempt) + random.uniform(0, base_delay)
        await asyncio.sleep(delay)
        resp = await client.post(url, json=json, headers=headers)
    return resp
