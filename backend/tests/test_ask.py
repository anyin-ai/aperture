"""Grounding and API-contract tests for Ask Aperture."""

import json
from datetime import datetime
from unittest.mock import AsyncMock, patch

from app.models import AuditResult, AuditRun, Brand, Competitor, Query, Setting
from app.services.ask.tools import (
    get_mention_trend,
    get_query_results,
    get_share_of_voice,
    get_visibility_overview,
)


def _seed_visibility(db):
    brand = Brand(name="Signal Loom", domain="signalloom.test", is_own_brand=True)
    db.add(brand)
    db.flush()
    db.add(Competitor(brand_id=brand.id, name="Rival Scope"))
    query = Query(brand_id=brand.id, text="What is the best AI visibility platform?")
    db.add(query)
    db.flush()
    run = AuditRun(
        brand_id=brand.id,
        provider="openai",
        model="gpt-4o-mini",
        status="completed",
        total_queries=1,
        completed_queries=1,
        mention_rate=100.0,
        created_at=datetime(2026, 7, 1, 12, 0, 0),
    )
    db.add(run)
    db.flush()
    result = AuditResult(
        audit_run_id=run.id,
        query_id=query.id,
        provider="openai",
        model="gpt-4o-mini",
        response_text="Signal Loom is a strong option. Rival Scope is another option.",
        brand_mentioned=True,
        mention_count=1,
        competitor_mentions=json.dumps({"Rival Scope": 1}),
        created_at=datetime(2026, 7, 1, 12, 1, 0),
    )
    db.add(result)
    db.commit()
    db.refresh(brand)
    db.refresh(result)
    return brand, result


def test_grounding_tools_return_stored_measurements(db):
    brand, result = _seed_visibility(db)

    overview = get_visibility_overview(db, brand.id)
    assert overview["available"] is True
    assert overview["mention_rate"] == 100.0

    sov = get_share_of_voice(db, brand.id)
    assert sov["available"] is True
    assert sov["ranked"] == [
        {"name": "Signal Loom", "count": 1, "pct": 50.0, "you": True},
        {"name": "Rival Scope", "count": 1, "pct": 50.0, "you": False},
    ]

    trend = get_mention_trend(db, brand.id, weeks=52)
    assert trend["points"][0]["mention_rate"] == 100.0

    results = get_query_results(db, brand.id, "AI visibility")
    assert results["items"][0]["result_id"] == result.id


def test_ask_requires_api_key(client, db):
    brand, _ = _seed_visibility(db)
    db.query(Setting).filter(Setting.key == "openai_api_key").delete()
    db.commit()

    response = client.post("/api/ask/", json={
        "brand_id": brand.id,
        "question": "How is my visibility?",
    })
    assert response.status_code == 400
    assert "OpenAI API key" in response.json()["detail"]


def test_ask_returns_typed_grounded_parts(client, db):
    brand, result = _seed_visibility(db)
    setting = db.query(Setting).filter(Setting.key == "openai_api_key").first()
    if setting:
        setting.value = "sk-test-ask"
    else:
        db.add(Setting(key="openai_api_key", value="sk-test-ask"))
    db.commit()

    tool_message = {
        "role": "assistant",
        "content": None,
        "tool_calls": [{
            "id": "call-overview",
            "type": "function",
            "function": {
                "name": "get_visibility_overview",
                "arguments": json.dumps({"brand_id": brand.id}),
            },
        }],
    }
    final_message = {
        "role": "assistant",
        "content": "Your latest stored run measured a 100% mention rate.",
    }
    mock_call = AsyncMock(side_effect=[tool_message, final_message])

    with patch("app.services.ask.ask_service._call_openai", mock_call):
        response = client.post("/api/ask/", json={
            "brand_id": brand.id,
            "question": "How is my visibility?",
            "history": [],
        })

    assert response.status_code == 200
    body = response.json()
    assert body["grounded"] is True
    assert body["parts"][0]["type"] == "kpi"
    assert body["parts"][0]["data"]["mention_rate"] == 100.0
    assert body["tool_trace"] == ["get_visibility_overview"]

    evidence = client.get(
        f"/api/ask/evidence/{result.id}", params={"brand_id": brand.id}
    )
    assert evidence.status_code == 200
    assert evidence.json()["response_text"].startswith("Signal Loom")


def test_ask_refuses_when_brand_has_no_runs(client, db):
    brand = Brand(name="No Signal Yet", is_own_brand=True)
    db.add(brand)
    existing = db.query(Setting).filter(Setting.key == "openai_api_key").first()
    if existing:
        existing.value = "sk-test-ask"
    else:
        db.add(Setting(key="openai_api_key", value="sk-test-ask"))
    db.commit()
    db.refresh(brand)

    tool_message = {
        "role": "assistant",
        "content": None,
        "tool_calls": [{
            "id": "call-overview-empty",
            "type": "function",
            "function": {
                "name": "get_visibility_overview",
                "arguments": json.dumps({"brand_id": brand.id}),
            },
        }],
    }
    final_message = {"role": "assistant", "content": "There are no runs yet."}

    with patch(
        "app.services.ask.ask_service._call_openai",
        AsyncMock(side_effect=[tool_message, final_message]),
    ):
        response = client.post("/api/ask/", json={
            "brand_id": brand.id,
            "question": "How is my visibility?",
        })

    assert response.status_code == 200
    assert response.json()["grounded"] is False
    assert response.json()["refusal"] == "No completed audits exist for this brand."


def test_ask_deduplicates_repeated_tool_calls(client, db):
    brand, _ = _seed_visibility(db)
    setting = db.query(Setting).filter(Setting.key == "openai_api_key").first()
    if setting:
        setting.value = "sk-test-ask"
    else:
        db.add(Setting(key="openai_api_key", value="sk-test-ask"))
    db.commit()

    def tool_message(call_id):
        return {
            "role": "assistant",
            "content": None,
            "tool_calls": [{
                "id": call_id,
                "type": "function",
                "function": {
                    "name": "get_visibility_overview",
                    "arguments": json.dumps({"brand_id": brand.id}),
                },
            }],
        }

    with patch(
        "app.services.ask.ask_service._call_openai",
        AsyncMock(side_effect=[
            tool_message("call-first"),
            tool_message("call-repeat"),
            {"role": "assistant", "content": "The stored card contains the verified measurement."},
        ]),
    ):
        response = client.post("/api/ask/", json={
            "brand_id": brand.id,
            "question": "How is my visibility?",
        })

    assert response.status_code == 200
    body = response.json()
    assert body["tool_trace"] == ["get_visibility_overview"]
    assert len(body["parts"]) == 1
