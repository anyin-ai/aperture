"""Tests for audit run creation (without actual LLM calls)."""

from unittest.mock import patch


def _make_brand_with_query(client):
    resp = client.post("/api/brands/", json={
        "name": "MyBrand",
        "is_own_brand": True,
        "competitors": [{"name": "TheirBrand"}],
    })
    brand_id = resp.json()["id"]
    resp = client.post("/api/queries/", json={
        "brand_id": brand_id,
        "text": "What is the best tool for project management?",
    })
    query_id = resp.json()["id"]
    return brand_id, query_id


def test_create_audit_returns_pending(client):
    brand_id, query_id = _make_brand_with_query(client)
    # Stub the background runner so creation never touches the network or the
    # real DB — run_audit execution is covered offline in test_audit_lifecycle.
    with patch("app.routers.audits._run_audit_bg") as bg:
        resp = client.post("/api/audits/", json={
            "brand_id": brand_id,
            "query_ids": [query_id],
            "provider": "openai",
            "model": "gpt-4o-mini",
        })
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] in ("pending", "running", "completed")
    assert data["total_queries"] == 1
    assert data["brand_id"] == brand_id
    bg.assert_called_once()


def test_create_audit_unsupported_provider(client):
    brand_id, query_id = _make_brand_with_query(client)
    resp = client.post("/api/audits/", json={
        "brand_id": brand_id,
        "query_ids": [query_id],
        "provider": "unknown_provider",
        "model": "some-model",
    })
    assert resp.status_code == 400


def test_create_audit_invalid_model(client):
    brand_id, query_id = _make_brand_with_query(client)
    resp = client.post("/api/audits/", json={
        "brand_id": brand_id,
        "query_ids": [query_id],
        "provider": "perplexity",
        "model": "llama-3.1-sonar-small-128k-online",  # retired model
    })
    assert resp.status_code == 400
    assert "sonar" in resp.json()["detail"]


def test_create_audit_invalid_brand(client):
    resp = client.post("/api/audits/", json={
        "brand_id": 99999,
        "query_ids": [1],
        "provider": "openai",
        "model": "gpt-4o-mini",
    })
    assert resp.status_code == 404


def test_list_audits(client):
    resp = client.get("/api/audits/")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_get_audit_not_found(client):
    resp = client.get("/api/audits/99999")
    assert resp.status_code == 404


def test_results_dashboard(client):
    resp = client.get("/api/results/dashboard")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_audits" in data
    assert "avg_mention_rate" in data
