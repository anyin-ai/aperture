"""Tests for the settings API."""


def test_upsert_and_get_setting(client):
    resp = client.put("/api/settings/", json={"key": "openai_base_url", "value": "https://api.openai.com/v1"})
    assert resp.status_code == 200
    assert resp.json()["key"] == "openai_base_url"
    assert resp.json()["value"] == "https://api.openai.com/v1"


def test_secret_key_is_masked(client):
    client.put("/api/settings/", json={"key": "openai_api_key", "value": "sk-supersecret"})
    resp = client.get("/api/settings/")
    keys = {s["key"]: s["value"] for s in resp.json()}
    assert keys["openai_api_key"] == "••••••••"


def test_list_settings(client):
    client.put("/api/settings/", json={"key": "test_key", "value": "test_value"})
    resp = client.get("/api/settings/")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
