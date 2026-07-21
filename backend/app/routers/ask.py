"""Ask Aperture API routes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AuditResult, AuditRun, Brand, Setting
from app.schemas import AskRequest, AskResponse, EvidenceResponse
from app.services.ask.ask_service import DEFAULT_ASK_MODEL, answer_question

router = APIRouter()


def _setting(db: Session, key: str) -> str | None:
    row = db.query(Setting).filter(Setting.key == key).first()
    return row.value if row else None


@router.post("/", response_model=AskResponse)
async def ask(payload: AskRequest, db: Session = Depends(get_db)):
    if not payload.question.strip():
        raise HTTPException(status_code=422, detail="Question cannot be empty")
    brand = db.query(Brand).filter(Brand.id == payload.brand_id).first()
    if brand is None:
        raise HTTPException(status_code=404, detail="Brand not found")
    api_key = _setting(db, "openai_api_key")
    if not api_key:
        raise HTTPException(
            status_code=400,
            detail="Add an OpenAI API key in Settings before using Ask Aperture.",
        )
    try:
        return await answer_question(
            db=db,
            brand=brand,
            question=payload.question,
            history=payload.history,
            api_key=api_key,
            model=_setting(db, "ask_model") or DEFAULT_ASK_MODEL,
            base_url=_setting(db, "openai_base_url"),
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Ask Aperture could not reach the reasoning model: {exc}") from exc


@router.get("/evidence/{result_id}", response_model=EvidenceResponse)
def evidence(result_id: int, brand_id: int, db: Session = Depends(get_db)):
    result = (
        db.query(AuditResult)
        .join(AuditRun, AuditResult.audit_run_id == AuditRun.id)
        .filter(AuditResult.id == result_id, AuditRun.brand_id == brand_id)
        .first()
    )
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if result is None or brand is None or not result.response_text:
        raise HTTPException(status_code=404, detail="Stored evidence not found")
    return EvidenceResponse(
        result_id=result.id,
        brand_id=brand.id,
        query=result.query.text,
        provider=result.provider,
        model=result.model,
        response_text=result.response_text,
        brand_name=brand.name,
        competitor_names=[competitor.name for competitor in brand.competitors],
    )
