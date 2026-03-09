from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Setting
from app.schemas import SettingOut, SettingUpsert

router = APIRouter()

# Keys we expose (never return raw secret values to the frontend)
_SECRET_KEYS = {"openai_api_key", "perplexity_api_key", "anthropic_api_key", "gemini_api_key"}


def _mask(key: str, value: str | None) -> str | None:
    if value and key in _SECRET_KEYS:
        return "•" * 8
    return value


@router.get("/", response_model=list[SettingOut])
def list_settings(db: Session = Depends(get_db)):
    rows = db.query(Setting).all()
    result = []
    for row in rows:
        result.append(SettingOut(
            key=row.key,
            value=_mask(row.key, row.value),
            updated_at=row.updated_at,
        ))
    return result


@router.put("/", response_model=SettingOut)
def upsert_setting(payload: SettingUpsert, db: Session = Depends(get_db)):
    row = db.query(Setting).filter(Setting.key == payload.key).first()
    if row:
        # Don't overwrite secret with masked placeholder
        if payload.value and payload.value != "•" * 8:
            row.value = payload.value
    else:
        row = Setting(key=payload.key, value=payload.value)
        db.add(row)
    db.commit()
    db.refresh(row)
    return SettingOut(
        key=row.key,
        value=_mask(row.key, row.value),
        updated_at=row.updated_at,
    )
