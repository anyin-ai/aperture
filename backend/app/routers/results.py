from fastapi import APIRouter, Depends, Query as QueryParam
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AuditResult, AuditRun, Query
from app.schemas import AuditResultOut, AuditRunOut, DashboardStats

router = APIRouter()


@router.get("/dashboard", response_model=DashboardStats)
def dashboard(brand_id: int | None = None, db: Session = Depends(get_db)):
    q = db.query(AuditRun)
    if brand_id is not None:
        q = q.filter(AuditRun.brand_id == brand_id)

    all_runs = q.order_by(AuditRun.created_at.desc()).all()
    completed_runs = [r for r in all_runs if r.status == "completed"]
    total_queries_run = sum(r.completed_queries for r in all_runs)

    rates = [r.mention_rate for r in completed_runs if r.mention_rate is not None]
    avg_mention_rate = round(sum(rates) / len(rates), 1) if rates else None

    recent_runs = all_runs[:5]

    return DashboardStats(
        total_audits=len(all_runs),
        total_queries_run=total_queries_run,
        avg_mention_rate=avg_mention_rate,
        recent_runs=recent_runs,
    )


@router.get("/", response_model=list[AuditResultOut])
def list_results(
    audit_run_id: int | None = None,
    brand_id: int | None = None,
    db: Session = Depends(get_db),
):
    q = db.query(AuditResult)
    if audit_run_id is not None:
        q = q.filter(AuditResult.audit_run_id == audit_run_id)
    if brand_id is not None:
        run_ids = [r.id for r in db.query(AuditRun).filter(AuditRun.brand_id == brand_id).all()]
        q = q.filter(AuditResult.audit_run_id.in_(run_ids))

    results = q.order_by(AuditResult.created_at.desc()).all()

    # Enrich with query text
    output = []
    for r in results:
        query = db.query(Query).filter(Query.id == r.query_id).first()
        item = AuditResultOut.model_validate(r)
        item.query_text = query.text if query else None
        output.append(item)

    return output


@router.get("/trends")
def mention_trends(brand_id: int, db: Session = Depends(get_db)):
    """Return mention rate per audit run for trend charts."""
    runs = (
        db.query(AuditRun)
        .filter(AuditRun.brand_id == brand_id, AuditRun.status == "completed")
        .order_by(AuditRun.created_at.asc())
        .all()
    )
    return [
        {
            "date": run.created_at.isoformat(),
            "mention_rate": run.mention_rate,
            "provider": run.provider,
            "model": run.model,
            "audit_run_id": run.id,
        }
        for run in runs
    ]
