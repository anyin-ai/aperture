import asyncio

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AuditResult, AuditRun, Brand, Query
from app.schemas import AuditRunOut, AuditRunRequest
from app.services.audit_service import run_audit

router = APIRouter()

SUPPORTED_PROVIDERS = {"openai", "perplexity"}


@router.get("/", response_model=list[AuditRunOut])
def list_audits(brand_id: int | None = None, db: Session = Depends(get_db)):
    q = db.query(AuditRun)
    if brand_id is not None:
        q = q.filter(AuditRun.brand_id == brand_id)
    return q.order_by(AuditRun.created_at.desc()).all()


@router.post("/", response_model=AuditRunOut, status_code=201)
def create_audit(
    payload: AuditRunRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    if payload.provider not in SUPPORTED_PROVIDERS:
        raise HTTPException(status_code=400, detail=f"Unsupported provider: {payload.provider}")

    brand = db.query(Brand).filter(Brand.id == payload.brand_id).first()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")

    queries = db.query(Query).filter(
        Query.id.in_(payload.query_ids), Query.brand_id == payload.brand_id
    ).all()
    if not queries:
        raise HTTPException(status_code=400, detail="No valid queries found for this brand")

    run = AuditRun(
        brand_id=payload.brand_id,
        provider=payload.provider,
        model=payload.model,
        status="pending",
        total_queries=len(queries),
        completed_queries=0,
    )
    db.add(run)
    db.flush()

    for q in queries:
        db.add(AuditResult(
            audit_run_id=run.id,
            query_id=q.id,
            provider=payload.provider,
            model=payload.model,
        ))

    db.commit()
    db.refresh(run)

    background_tasks.add_task(_run_audit_bg, run.id)
    return run


def _run_audit_bg(audit_run_id: int):
    """Run the audit in a background thread with its own DB session."""
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        asyncio.run(run_audit(audit_run_id, db))
    finally:
        db.close()


@router.get("/{audit_id}", response_model=AuditRunOut)
def get_audit(audit_id: int, db: Session = Depends(get_db)):
    run = db.query(AuditRun).filter(AuditRun.id == audit_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Audit run not found")
    return run


@router.delete("/{audit_id}", status_code=204)
def delete_audit(audit_id: int, db: Session = Depends(get_db)):
    run = db.query(AuditRun).filter(AuditRun.id == audit_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Audit run not found")
    db.delete(run)
    db.commit()
