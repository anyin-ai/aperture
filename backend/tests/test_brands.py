"""Tests for the brands API."""


def test_create_brand(client):
    resp = client.post("/api/brands/", json={
        "name": "Acme Corp",
        "domain": "acme.com",
        "description": "Test brand",
        "is_own_brand": True,
        "competitors": [{"name": "Rival Co", "domain": "rival.com"}],
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Acme Corp"
    assert len(data["competitors"]) == 1
    assert data["competitors"][0]["name"] == "Rival Co"


def test_list_brands(client):
    client.post("/api/brands/", json={"name": "Brand A", "is_own_brand": True})
    resp = client.get("/api/brands/")
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


def test_get_brand_not_found(client):
    resp = client.get("/api/brands/99999")
    assert resp.status_code == 404


def test_update_brand(client):
    resp = client.post("/api/brands/", json={"name": "Old Name", "is_own_brand": True})
    brand_id = resp.json()["id"]
    resp = client.put(f"/api/brands/{brand_id}", json={"name": "New Name", "is_own_brand": True})
    assert resp.status_code == 200
    assert resp.json()["name"] == "New Name"


def test_delete_brand(client):
    resp = client.post("/api/brands/", json={"name": "To Delete", "is_own_brand": True})
    brand_id = resp.json()["id"]
    resp = client.delete(f"/api/brands/{brand_id}")
    assert resp.status_code == 204
    resp = client.get(f"/api/brands/{brand_id}")
    assert resp.status_code == 404


def test_add_competitor(client):
    resp = client.post("/api/brands/", json={"name": "My Brand", "is_own_brand": True})
    brand_id = resp.json()["id"]
    resp = client.post(f"/api/brands/{brand_id}/competitors", json={"name": "Competitor X"})
    assert resp.status_code == 201
    assert resp.json()["name"] == "Competitor X"
