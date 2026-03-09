"""Audit execution service – runs LLM queries and stores results."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.models import AuditResult, AuditRun, Brand, Query, Setting
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


async def run_audit(
    audit_run_id: int,
    db: Session,
) -> None:
    """Execute all queries for an audit run in the background."""
    run = db.query(AuditRun).filter(AuditRun.id == audit_run_id).first()
    if not run:
        return

    brand = db.query(Brand).filter(Brand.id == run.brand_id).options().first()
    competitor_names = [c.name for c in brand.competitors] if brand else []

    run.status = "running"
    db.commit()

    queries = db.query(Query).filter(Query.id.in_(
        [r.query_id for r in run.results]
    )).all()

    # Fetch queries from the audit run results
    result_rows = run.results
    completed = 0

    for result_row in result_rows:
        query = db.query(Query).filter(Query.id == result_row.query_id).first()
        if not query:
            continue

        llm_resp = await _call_provider(query.text, run.provider, run.model, db)

        mention_count = count_brand_mentions(llm_resp.text, brand.name if brand else "")
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

    # Calculate overall mention rate
    total = len(result_rows)
    if total > 0:
        mentioned = sum(1 for r in result_rows if r.brand_mentioned)
        run.mention_rate = round(mentioned / total * 100, 1)
    run.status = "completed"
    run.completed_at = datetime.now(timezone.utc)
    db.commit()
