"""Audit execution service – runs LLM queries and stores results."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.models import AuditRun, Brand, Setting
from app.services.analysis import (
    count_brand_mentions,
    find_competitor_mentions,
    serialize_competitor_mentions,
    serialize_sources,
)
from app.services.llm import LLMResponse
from app.services.llm.openai_service import query_openai
from app.services.llm.perplexity_service import query_perplexity


def _get_setting(db: Session, key: str) -> Optional[str]:
    row = db.query(Setting).filter(Setting.key == key).first()
    return row.value if row else None


async def _call_provider(
    prompt: str,
    provider: str,
    model: str,
    db: Session,
) -> LLMResponse:
    if provider == "openai":
        api_key = _get_setting(db, "openai_api_key") or ""
        base_url = _get_setting(db, "openai_base_url") or None
        return await query_openai(prompt, api_key, model, base_url)
    elif provider == "perplexity":
        api_key = _get_setting(db, "perplexity_api_key") or ""
        return await query_perplexity(prompt, api_key, model)
    else:
        from app.services.llm import LLMResponse as R
        return R(text="", model=model, sources=[], latency_ms=0, error=f"Unknown provider: {provider}")


def _fail_run(db: Session, run: AuditRun, message: str) -> None:
    """Move *run* to a durable terminal 'failed' state with a cause."""
    db.rollback()  # a failing commit may leave the session dirty
    run.status = "failed"
    run.error = message
    run.completed_at = datetime.now(timezone.utc)
    db.commit()


async def run_audit(
    audit_run_id: int,
    db: Session,
) -> None:
    """Execute all queries for an audit run in the background.

    The run always reaches a terminal state: 'completed' on success (even if
    individual queries errored — those are recorded per-result), or 'failed'
    with a run-level error message on an unexpected exception or a missing brand.
    """
    run = db.query(AuditRun).filter(AuditRun.id == audit_run_id).first()
    if not run:
        # A missing run id is a no-op, not a failed audit.
        return

    brand = db.query(Brand).filter(Brand.id == run.brand_id).first()
    if brand is None:
        # Don't silently score 0% against an empty brand name.
        _fail_run(db, run, "Brand not found")
        return

    competitor_names = [c.name for c in brand.competitors]

    try:
        run.status = "running"
        db.commit()

        result_rows = run.results
        completed = 0

        for result_row in result_rows:
            query = result_row.query
            if not query:
                continue

            llm_resp = await _call_provider(query.text, run.provider, run.model, db)

            mention_count = count_brand_mentions(llm_resp.text, brand.name)
            competitor_mentions = find_competitor_mentions(llm_resp.text, competitor_names)

            result_row.response_text = llm_resp.text
            result_row.brand_mentioned = mention_count > 0
            result_row.mention_count = mention_count
            result_row.competitor_mentions = serialize_competitor_mentions(competitor_mentions)
            result_row.sources = serialize_sources(llm_resp.sources)
            result_row.error = llm_resp.error
            result_row.latency_ms = llm_resp.latency_ms

            completed += 1
            run.completed_queries = completed
            db.commit()

        # Honest mention rate: only count successfully-queried rows. An
        # all-errored run leaves mention_rate=None so it is distinguishable
        # from a genuine 0% visibility result.
        successful = [r for r in result_rows if r.error is None]
        if successful:
            mentioned = sum(1 for r in successful if r.brand_mentioned)
            run.mention_rate = round(mentioned / len(successful) * 100, 1)
        else:
            run.mention_rate = None

        run.status = "completed"
        run.completed_at = datetime.now(timezone.utc)
        db.commit()
    except Exception as exc:  # noqa: BLE001 — durably record any unexpected failure
        _fail_run(db, run, str(exc))
