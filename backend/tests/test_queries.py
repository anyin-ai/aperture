"""Tests for the queries API."""


def _make_brand(client, name="Test Brand"):
    resp = client.post("/api/brands/", json={"name": name, "is_own_brand": True})
    return resp.json()["id"]


def test_create_query(client):
    brand_id = _make_brand(client)
    resp = client.post("/api/queries/", json={
        "brand_id": brand_id,
        "text": "What is the best project management tool?",
        "language": "en",
        "category": "product discovery",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["text"] == "What is the best project management tool?"
    assert data["brand_id"] == brand_id


def test_list_queries_filtered(client):
    brand_id = _make_brand(client, "FilterBrand")
    client.post("/api/queries/", json={"brand_id": brand_id, "text": "Q1"})
    client.post("/api/queries/", json={"brand_id": brand_id, "text": "Q2"})
    resp = client.get(f"/api/queries/?brand_id={brand_id}")
    assert resp.status_code == 200
    assert len(resp.json()) >= 2


def test_update_query(client):
    brand_id = _make_brand(client)
    resp = client.post("/api/queries/", json={"brand_id": brand_id, "text": "Old question"})
    query_id = resp.json()["id"]
    resp = client.put(f"/api/queries/{query_id}", json={"text": "Updated question", "language": "en"})
    assert resp.status_code == 200
    assert resp.json()["text"] == "Updated question"


def test_delete_query(client):
    brand_id = _make_brand(client)
    resp = client.post("/api/queries/", json={"brand_id": brand_id, "text": "Delete me"})
    query_id = resp.json()["id"]
    resp = client.delete(f"/api/queries/{query_id}")
    assert resp.status_code == 204
    resp = client.get(f"/api/queries/{query_id}")
    assert resp.status_code == 404


def test_create_query_invalid_brand(client):
    resp = client.post("/api/queries/", json={"brand_id": 99999, "text": "Query for ghost brand"})
    assert resp.status_code == 404
