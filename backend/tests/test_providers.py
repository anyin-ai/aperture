"""Tests for the providers catalog and the GET /api/providers endpoint."""

import app.services.llm.providers as providers_module
from app.services.llm.providers import (
    PROVIDERS,
    is_valid_model,
    validate_provider_model,
)


def test_catalog_has_two_providers_with_current_models():
    assert set(PROVIDERS) == {"openai", "perplexity"}
    assert PROVIDERS["perplexity"]["models"] == ["sonar", "sonar-pro"]
    # The retired model family must not appear anywhere in the module source.
    import inspect
    assert "llama-3.1-sonar" not in inspect.getsource(providers_module)


def test_is_valid_model():
    assert is_valid_model("perplexity", "sonar") is True
    assert is_valid_model("perplexity", "llama-3.1-sonar-small-128k-online") is False
    assert is_valid_model("bogus", "x") is False


def test_validate_provider_model():
    assert validate_provider_model("openai", "gpt-4o-mini") is None
    assert validate_provider_model("bogus", "x")  # non-empty error string
    assert validate_provider_model("perplexity", "nope")  # non-empty error string


def test_providers_endpoint(client):
    resp = client.get("/api/providers/")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    by_id = {p["id"]: p for p in data}
    assert by_id["perplexity"]["models"] == ["sonar", "sonar-pro"]
    assert by_id["perplexity"]["default_model"] == "sonar"
    assert data[0]["id"] == "openai"  # insertion order preserved
