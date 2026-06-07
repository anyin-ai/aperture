"""Offline tests for the LLM provider services and retry helper.

All HTTP is faked with httpx.MockTransport — zero real network calls. The
services construct their own httpx.AsyncClient, so we patch that class in each
service module to return a client bound to a MockTransport.
"""

import json

import httpx
from unittest.mock import patch

from app.services.llm import retry as retry_mod
from app.services.llm.openai_service import query_openai
from app.services.llm.perplexity_service import query_perplexity
from app.services.llm.retry import post_with_retries

OK_BODY = {"choices": [{"message": {"content": "Acme is great"}}]}

# Capture the real class BEFORE any patch: `import httpx` in the service modules
# shares the global module object, so patching e.g.
# `openai_service.httpx.AsyncClient` actually rebinds httpx.AsyncClient
# globally — the factory must use this saved reference to avoid recursing.
_REAL_ASYNC_CLIENT = httpx.AsyncClient


def _client_factory(handler):
    """A drop-in for httpx.AsyncClient(...) that ignores ctor kwargs and binds
    the given MockTransport handler."""
    def factory(*args, **kwargs):
        return _REAL_ASYNC_CLIENT(transport=httpx.MockTransport(handler))
    return factory


def _json_handler(body, status=200, headers=None):
    def handler(request):
        return httpx.Response(status, json=body, headers=headers or {})
    return handler


# ── Reproducibility params ───────────────────────────────────────────────────

async def test_openai_pins_temperature_and_max_tokens():
    captured = {}

    def handler(request):
        captured.update(json.loads(request.content))
        return httpx.Response(200, json=OK_BODY)

    with patch("app.services.llm.openai_service.httpx.AsyncClient", _client_factory(handler)):
        resp = await query_openai("q", "key", "gpt-4o-mini")
    assert resp.text == "Acme is great"
    assert captured["temperature"] == 0
    assert isinstance(captured["max_tokens"], int)


async def test_perplexity_pins_temperature_and_max_tokens():
    captured = {}

    def handler(request):
        captured.update(json.loads(request.content))
        return httpx.Response(200, json=OK_BODY)

    with patch("app.services.llm.perplexity_service.httpx.AsyncClient", _client_factory(handler)):
        await query_perplexity("q", "key", "sonar")
    assert captured["temperature"] == 0
    assert isinstance(captured["max_tokens"], int)


# ── Perplexity citation extraction ───────────────────────────────────────────

async def test_perplexity_citations_only():
    body = {**OK_BODY, "citations": ["https://a.com", "https://b.com"]}
    with patch("app.services.llm.perplexity_service.httpx.AsyncClient",
               _client_factory(_json_handler(body))):
        resp = await query_perplexity("q", "key", "sonar")
    assert resp.sources == ["https://a.com", "https://b.com"]


async def test_perplexity_search_results_only():
    body = {**OK_BODY, "search_results": [{"url": "https://a.com"}, {"url": "https://b.com"}]}
    with patch("app.services.llm.perplexity_service.httpx.AsyncClient",
               _client_factory(_json_handler(body))):
        resp = await query_perplexity("q", "key", "sonar")
    assert resp.sources == ["https://a.com", "https://b.com"]


async def test_perplexity_citations_and_search_results_deduped():
    body = {
        **OK_BODY,
        "citations": ["https://a.com"],
        "search_results": [{"url": "https://a.com"}, {"url": "https://b.com"}],
    }
    with patch("app.services.llm.perplexity_service.httpx.AsyncClient",
               _client_factory(_json_handler(body))):
        resp = await query_perplexity("q", "key", "sonar")
    assert resp.sources == ["https://a.com", "https://b.com"]


# ── Defensive parsing ────────────────────────────────────────────────────────

async def test_openai_malformed_response_returns_error_not_raise():
    with patch("app.services.llm.openai_service.httpx.AsyncClient",
               _client_factory(_json_handler({"unexpected": True}))):
        resp = await query_openai("q", "key", "gpt-4o-mini")
    assert resp.text == ""
    assert resp.error is not None
    assert resp.sources == []


async def test_perplexity_malformed_response_returns_error_not_raise():
    with patch("app.services.llm.perplexity_service.httpx.AsyncClient",
               _client_factory(_json_handler({"unexpected": True}))):
        resp = await query_perplexity("q", "key", "sonar")
    assert resp.text == ""
    assert resp.error is not None


# ── Retry / backoff ──────────────────────────────────────────────────────────

def _scripted_handler(script):
    """script: list of (status, headers). Last entry repeats if exhausted."""
    state = {"n": 0}

    def handler(request):
        status, headers = script[min(state["n"], len(script) - 1)]
        state["n"] += 1
        return httpx.Response(status, json={"ok": True}, headers=headers)

    return handler, state


async def test_retry_on_429_then_success(monkeypatch):
    sleeps = []

    async def fake_sleep(d):
        sleeps.append(d)

    monkeypatch.setattr(retry_mod.asyncio, "sleep", fake_sleep)
    handler, state = _scripted_handler([(429, {"Retry-After": "1"}), (200, {})])
    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        resp = await post_with_retries(client, "http://x", json={}, headers={})
    assert resp.status_code == 200
    assert state["n"] == 2          # exactly two POST attempts
    assert sleeps == [1.0]          # Retry-After honored, slept once


async def test_no_retry_on_401(monkeypatch):
    sleeps = []

    async def fake_sleep(d):
        sleeps.append(d)

    monkeypatch.setattr(retry_mod.asyncio, "sleep", fake_sleep)
    handler, state = _scripted_handler([(401, {}), (200, {})])
    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        resp = await post_with_retries(client, "http://x", json={}, headers={})
    assert resp.status_code == 401
    assert state["n"] == 1          # no retry on a permanent failure
    assert sleeps == []


async def test_success_first_try_no_extra_attempts():
    handler, state = _scripted_handler([(200, {})])
    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        resp = await post_with_retries(client, "http://x", json={}, headers={})
    assert resp.status_code == 200
    assert state["n"] == 1
