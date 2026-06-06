"""Tests for run_audit lifecycle: terminal states, honest metrics, query_text.

All provider calls are mocked — these tests make zero network calls.
"""

import asyncio
from unittest.mock import patch

from app.models import AuditResult, AuditRun, Brand, Competitor, Query
from app.services.audit_service import run_audit
from app.services.llm import LLMResponse


def _seed_run(db, *, n_queries=1, with_brand=True):
    """Create a brand (optional), queries, an audit run and its result rows."""
    brand_id = None
    if with_brand:
        brand = Brand(name="Acme", is_own_brand=True)
        db.add(brand)
        db.flush()
        db.add(Competitor(brand_id=brand.id, name="Globex"))
        brand_id = brand.id
    else:
        brand_id = 99999  # non-existent

    queries = []
    for i in range(n_queries):
        q = Query(brand_id=brand_id if with_brand else 1, text=f"best tool {i}?")
        db.add(q)
        db.flush()
        queries.append(q)

    run = AuditRun(brand_id=brand_id, provider="openai", model="gpt-4o-mini",
                   status="pending", total_queries=len(queries))
    db.add(run)
    db.flush()
    for q in queries:
        db.add(AuditResult(audit_run_id=run.id, query_id=q.id,
                           provider="openai", model="gpt-4o-mini"))
    db.commit()
    return run


def test_unexpected_exception_marks_run_failed(db):
    run = _seed_run(db, n_queries=1)
    with patch("app.services.audit_service._call_provider",
               side_effect=RuntimeError("boom")):
        asyncio.run(run_audit(run.id, db))
    db.refresh(run)
    assert run.status == "failed"
    assert run.completed_at is not None
    assert run.error and "boom" in run.error


def test_missing_brand_marks_run_failed(db):
    run = _seed_run(db, n_queries=1, with_brand=False)
    asyncio.run(run_audit(run.id, db))
    db.refresh(run)
    assert run.status == "failed"
    assert run.error == "Brand not found"
    assert run.mention_rate is None


def test_per_query_error_still_completes(db):
    run = _seed_run(db, n_queries=1)
    resp = LLMResponse(text="", model="gpt-4o-mini", sources=[],
                       latency_ms=5, error="401 bad key")
    with patch("app.services.audit_service._call_provider", return_value=resp):
        asyncio.run(run_audit(run.id, db))
    db.refresh(run)
    # An all-errored run completes but is distinguishable from genuine 0%.
    assert run.status == "completed"
    assert run.mention_rate is None
    assert run.success_count == 0
    assert run.error_count == 1


def test_mention_rate_excludes_errored_rows(db):
    run = _seed_run(db, n_queries=2)
    ok = LLMResponse(text="Acme is great", model="gpt-4o-mini", sources=[], latency_ms=5)
    err = LLMResponse(text="", model="gpt-4o-mini", sources=[], latency_ms=5, error="timeout")
    with patch("app.services.audit_service._call_provider", side_effect=[ok, err]):
        asyncio.run(run_audit(run.id, db))
    db.refresh(run)
    assert run.status == "completed"
    # 1 mentioned out of 1 successful row -> 100.0, not 50.0 over both rows.
    assert run.mention_rate == 100.0
    assert run.success_count == 1
    assert run.error_count == 1


def test_query_text_property_populates_on_results(db):
    run = _seed_run(db, n_queries=1)
    ok = LLMResponse(text="Acme wins", model="gpt-4o-mini", sources=[], latency_ms=5)
    with patch("app.services.audit_service._call_provider", return_value=ok):
        asyncio.run(run_audit(run.id, db))
    db.refresh(run)
    result = run.results[0]
    assert result.query_text == "best tool 0?"
