import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Brand, Competitor
from app.schemas import BrandCreate, BrandOut, BrandUpdate, CompetitorCreate, CompetitorOut

router = APIRouter()


def _encode_aliases(aliases: list[str] | None) -> str | None:
    """Serialize an alias list to JSON for the Text column (None when empty)."""
    return json.dumps(aliases) if aliases else None


@router.get("/", response_model=list[BrandOut])
def list_brands(db: Session = Depends(get_db)):
    return db.query(Brand).all()


@router.post("/", response_model=BrandOut, status_code=201)
def create_brand(payload: BrandCreate, db: Session = Depends(get_db)):
    brand = Brand(
        name=payload.name,
        domain=payload.domain,
        description=payload.description,
        is_own_brand=payload.is_own_brand,
        aliases=_encode_aliases(payload.aliases),
    )
    db.add(brand)
    db.flush()

    for comp in payload.competitors:
        db.add(Competitor(
            brand_id=brand.id,
            name=comp.name,
            domain=comp.domain,
            aliases=_encode_aliases(comp.aliases),
        ))

    db.commit()
    db.refresh(brand)
    return brand


@router.get("/{brand_id}", response_model=BrandOut)
def get_brand(brand_id: int, db: Session = Depends(get_db)):
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    return brand


@router.put("/{brand_id}", response_model=BrandOut)
def update_brand(brand_id: int, payload: BrandUpdate, db: Session = Depends(get_db)):
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    data = payload.model_dump(exclude_unset=True)
    # aliases is stored as JSON text, not a raw list — special-case it so the
    # generic setattr loop doesn't persist a Python list onto a Text column.
    if "aliases" in data:
        brand.aliases = _encode_aliases(data.pop("aliases"))
    for field, value in data.items():
        setattr(brand, field, value)
    db.commit()
    db.refresh(brand)
    return brand


@router.delete("/{brand_id}", status_code=204)
def delete_brand(brand_id: int, db: Session = Depends(get_db)):
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    db.delete(brand)
    db.commit()


# ── Competitors ────────────────────────────────────────────────────────────────

@router.post("/{brand_id}/competitors", response_model=CompetitorOut, status_code=201)
def add_competitor(brand_id: int, payload: CompetitorCreate, db: Session = Depends(get_db)):
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    comp = Competitor(
        brand_id=brand_id,
        name=payload.name,
        domain=payload.domain,
        aliases=_encode_aliases(payload.aliases),
    )
    db.add(comp)
    db.commit()
    db.refresh(comp)
    return comp


@router.delete("/{brand_id}/competitors/{competitor_id}", status_code=204)
def delete_competitor(brand_id: int, competitor_id: int, db: Session = Depends(get_db)):
    comp = db.query(Competitor).filter(
        Competitor.id == competitor_id, Competitor.brand_id == brand_id
    ).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Competitor not found")
    db.delete(comp)
    db.commit()
