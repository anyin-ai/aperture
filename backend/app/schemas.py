from datetime import datetime
from typing import Optional

from pydantic import BaseModel


# ── Brand ──────────────────────────────────────────────────────────────────────

class CompetitorBase(BaseModel):
    name: str
    domain: Optional[str] = None


class CompetitorCreate(CompetitorBase):
    pass


class CompetitorOut(CompetitorBase):
    id: int
    brand_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class BrandBase(BaseModel):
    name: str
    domain: Optional[str] = None
    description: Optional[str] = None
    is_own_brand: bool = True


class BrandCreate(BrandBase):
    competitors: list[CompetitorCreate] = []


class BrandUpdate(BrandBase):
    pass


class BrandOut(BrandBase):
    id: int
    created_at: datetime
    competitors: list[CompetitorOut] = []

    model_config = {"from_attributes": True}


# ── Query ──────────────────────────────────────────────────────────────────────

class QueryBase(BaseModel):
    text: str
    language: str = "en"
    category: Optional[str] = None


class QueryCreate(QueryBase):
    brand_id: int


class QueryUpdate(QueryBase):
    pass


class QueryOut(QueryBase):
    id: int
    brand_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Audit ──────────────────────────────────────────────────────────────────────

class AuditRunRequest(BaseModel):
    brand_id: int
    query_ids: list[int]
    provider: str  # openai, perplexity
    model: str


class AuditResultOut(BaseModel):
    id: int
    audit_run_id: int
    query_id: int
    query_text: Optional[str] = None
    provider: str
    model: str
    response_text: Optional[str] = None
    brand_mentioned: bool
    mention_count: int
    competitor_mentions: Optional[str] = None
    sources: Optional[str] = None
    error: Optional[str] = None
    latency_ms: Optional[int] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AuditRunOut(BaseModel):
    id: int
    brand_id: int
    provider: str
    model: str
    status: str
    total_queries: int
    completed_queries: int
    mention_rate: Optional[float] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    results: list[AuditResultOut] = []

    model_config = {"from_attributes": True}


# ── Settings ───────────────────────────────────────────────────────────────────

class SettingOut(BaseModel):
    key: str
    value: Optional[str] = None
    updated_at: datetime

    model_config = {"from_attributes": True}


class SettingUpsert(BaseModel):
    key: str
    value: Optional[str] = None


# ── Dashboard ─────────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_audits: int
    total_queries_run: int
    avg_mention_rate: Optional[float]
    recent_runs: list[AuditRunOut]
