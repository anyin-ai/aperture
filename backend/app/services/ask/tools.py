"""Read-only tools available to the Ask Aperture reasoning model.

Every number returned by these tools is calculated from stored Aperture rows.
The same payloads are rendered by the frontend, keeping load-bearing data out
of model-authored prose.
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Any, Callable

from sqlalchemy.orm import Session

from app.models import AuditResult, AuditRun, Brand, Query


def _completed_runs(db: Session, brand_id: int) -> list[AuditRun]:
    return (
        db.query(AuditRun)
        .filter(AuditRun.brand_id == brand_id, AuditRun.status == "completed")
        .order_by(AuditRun.created_at.desc())
        .all()
    )


def get_visibility_overview(db: Session, brand_id: int) -> dict[str, Any]:
    runs = _completed_runs(db, brand_id)
    if not runs:
        return {"available": False, "reason": "No completed audits exist for this brand."}

    latest = runs[0]
    previous = next(
        (run for run in runs[1:] if run.provider == latest.provider),
        None,
    )
    current_rate = latest.mention_rate
    previous_rate = previous.mention_rate if previous else None
    delta = None
    if current_rate is not None and previous_rate is not None:
        delta = round(current_rate - previous_rate, 1)

    return {
        "available": current_rate is not None,
        "reason": None if current_rate is not None else "The latest audit has no successful results.",
        "brand_id": brand_id,
        "mention_rate": current_rate,
        "previous_mention_rate": previous_rate,
        "delta": delta,
        "provider": latest.provider,
        "model": latest.model,
        "audit_run_id": latest.id,
        "completed_queries": latest.completed_queries,
        "measured_at": latest.created_at.isoformat(),
    }


def get_share_of_voice(
    db: Session, brand_id: int, engine: str | None = None
) -> dict[str, Any]:
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if brand is None:
        return {"available": False, "reason": "Brand not found."}

    runs = _completed_runs(db, brand_id)
    latest = next((run for run in runs if not engine or run.provider == engine), None)
    if latest is None:
        return {"available": False, "reason": "No matching completed audit exists."}

    counts: dict[str, int] = {brand.name: 0}
    for competitor in brand.competitors:
        counts[competitor.name] = 0

    successful = [result for result in latest.results if result.error is None]
    for result in successful:
        counts[brand.name] += result.mention_count
        if result.competitor_mentions:
            try:
                mentions = json.loads(result.competitor_mentions)
            except (TypeError, ValueError):
                mentions = {}
            if isinstance(mentions, dict):
                for name, count in mentions.items():
                    if name in counts and isinstance(count, (int, float)):
                        counts[name] += int(count)

    total = sum(counts.values())
    ranked = [
        {
            "name": name,
            "count": count,
            "pct": round(count / total * 100, 1) if total else 0.0,
            "you": name == brand.name,
        }
        for name, count in sorted(counts.items(), key=lambda item: item[1], reverse=True)
    ]
    return {
        "available": bool(successful),
        "reason": None if successful else "The latest audit has no successful results.",
        "provider": latest.provider,
        "audit_run_id": latest.id,
        "responses_measured": len(successful),
        "ranked": ranked,
    }


def get_mention_trend(
    db: Session, brand_id: int, weeks: int = 8
) -> dict[str, Any]:
    weeks = max(1, min(weeks, 52))
    cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(weeks=weeks)
    runs = [run for run in reversed(_completed_runs(db, brand_id)) if run.created_at >= cutoff]
    points = [
        {
            "date": run.created_at.isoformat(),
            "mention_rate": run.mention_rate,
            "provider": run.provider,
            "model": run.model,
            "audit_run_id": run.id,
        }
        for run in runs
        if run.mention_rate is not None
    ]
    return {
        "available": bool(points),
        "reason": None if points else "No successful audit trend is available yet.",
        "weeks": weeks,
        "points": points,
    }


def get_query_results(
    db: Session, brand_id: int, query: str = ""
) -> dict[str, Any]:
    rows = (
        db.query(AuditResult)
        .join(AuditRun, AuditResult.audit_run_id == AuditRun.id)
        .join(Query, AuditResult.query_id == Query.id)
        .filter(AuditRun.brand_id == brand_id, AuditRun.status == "completed")
        .order_by(AuditResult.created_at.desc())
        .all()
    )
    needle = query.strip().lower()
    if needle:
        tokens = [token for token in needle.split() if len(token) > 2]
        matching = [
            row for row in rows
            if needle in row.query.text.lower()
            or (tokens and all(token in row.query.text.lower() for token in tokens))
        ]
    else:
        matching = rows

    seen: set[tuple[int, str]] = set()
    items: list[dict[str, Any]] = []
    for row in matching:
        key = (row.query_id, row.provider)
        if key in seen:
            continue
        seen.add(key)
        items.append({
            "result_id": row.id,
            "query_id": row.query_id,
            "query": row.query.text,
            "provider": row.provider,
            "model": row.model,
            "brand_mentioned": row.brand_mentioned,
            "mention_count": row.mention_count,
            "has_response": bool(row.response_text),
            "error": row.error,
            "measured_at": row.created_at.isoformat(),
        })
        if len(items) == 8:
            break

    return {
        "available": bool(items),
        "reason": None if items else "No stored results match that query.",
        "search": query,
        "items": items,
    }


def get_raw_response(db: Session, brand_id: int, result_id: int) -> dict[str, Any]:
    row = (
        db.query(AuditResult)
        .join(AuditRun, AuditResult.audit_run_id == AuditRun.id)
        .filter(AuditResult.id == result_id, AuditRun.brand_id == brand_id)
        .first()
    )
    if row is None or not row.response_text:
        return {"available": False, "reason": "No stored response was found."}
    return {
        "available": True,
        "result_id": row.id,
        "query": row.query.text,
        "provider": row.provider,
        "model": row.model,
        "response_text": row.response_text,
    }


TOOL_FUNCTIONS: dict[str, Callable[..., dict[str, Any]]] = {
    "get_visibility_overview": get_visibility_overview,
    "get_share_of_voice": get_share_of_voice,
    "get_mention_trend": get_mention_trend,
    "get_query_results": get_query_results,
    "get_raw_response": get_raw_response,
}


TOOL_CATALOG = [
    {
        "type": "function",
        "function": {
            "name": "get_visibility_overview",
            "description": "Get the latest measured mention rate and change for the selected brand.",
            "parameters": {
                "type": "object",
                "properties": {"brand_id": {"type": "integer"}},
                "required": ["brand_id"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_share_of_voice",
            "description": "Compare the selected brand's measured mentions with configured competitors.",
            "parameters": {
                "type": "object",
                "properties": {
                    "brand_id": {"type": "integer"},
                    "engine": {"type": ["string", "null"]},
                },
                "required": ["brand_id", "engine"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_mention_trend",
            "description": "Get stored mention-rate measurements over time.",
            "parameters": {
                "type": "object",
                "properties": {
                    "brand_id": {"type": "integer"},
                    "weeks": {"type": "integer", "minimum": 1, "maximum": 52},
                },
                "required": ["brand_id", "weeks"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_query_results",
            "description": "Find the newest stored audit results for a topic or buyer query.",
            "parameters": {
                "type": "object",
                "properties": {
                    "brand_id": {"type": "integer"},
                    "query": {"type": "string"},
                },
                "required": ["brand_id", "query"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_raw_response",
            "description": "Read the exact stored engine answer for a result id already returned by another tool.",
            "parameters": {
                "type": "object",
                "properties": {
                    "brand_id": {"type": "integer"},
                    "result_id": {"type": "integer"},
                },
                "required": ["brand_id", "result_id"],
                "additionalProperties": False,
            },
        },
    },
]


def execute_tool(
    name: str, arguments: dict[str, Any], db: Session, brand_id: int
) -> dict[str, Any]:
    function = TOOL_FUNCTIONS.get(name)
    if function is None:
        return {"available": False, "reason": f"Unknown tool: {name}"}
    safe_arguments = dict(arguments)
    # The request-scoped brand is authoritative; a model can never cross it.
    safe_arguments["brand_id"] = brand_id
    try:
        return function(db=db, **safe_arguments)
    except TypeError:
        return {"available": False, "reason": "The tool arguments were invalid."}
