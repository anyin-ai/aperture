from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Brand, Query
from app.schemas import QueryCreate, QueryOut, QueryUpdate

router = APIRouter()


@router.get("/", response_model=list[QueryOut])
def list_queries(brand_id: int | None = None, db: Session = Depends(get_db)):
    q = db.query(Query)
    if brand_id is not None:
        q = q.filter(Query.brand_id == brand_id)
    return q.all()


@router.post("/", response_model=QueryOut, status_code=201)
def create_query(payload: QueryCreate, db: Session = Depends(get_db)):
    brand = db.query(Brand).filter(Brand.id == payload.brand_id).first()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    query = Query(
        brand_id=payload.brand_id,
        text=payload.text,
        language=payload.language,
        category=payload.category,
    )
    db.add(query)
    db.commit()
    db.refresh(query)
    return query


@router.get("/{query_id}", response_model=QueryOut)
def get_query(query_id: int, db: Session = Depends(get_db)):
    query = db.query(Query).filter(Query.id == query_id).first()
    if not query:
        raise HTTPException(status_code=404, detail="Query not found")
    return query


@router.put("/{query_id}", response_model=QueryOut)
def update_query(query_id: int, payload: QueryUpdate, db: Session = Depends(get_db)):
    query = db.query(Query).filter(Query.id == query_id).first()
    if not query:
        raise HTTPException(status_code=404, detail="Query not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(query, field, value)
    db.commit()
    db.refresh(query)
    return query


@router.delete("/{query_id}", status_code=204)
def delete_query(query_id: int, db: Session = Depends(get_db)):
    query = db.query(Query).filter(Query.id == query_id).first()
    if not query:
        raise HTTPException(status_code=404, detail="Query not found")
    db.delete(query)
    db.commit()
