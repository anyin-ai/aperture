import json
from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, field_validator


# ── Brand ──────────────────────────────────────────────────────────────────────

def _decode_aliases(v):
    """Accept the ORM's JSON-string aliases (or None) and yield a list."""
    if v is None:
        return []
    if isinstance(v, str):
        try:
            return json.loads(v)
        except (ValueError, TypeError):
            return []
    return v


class CompetitorBase(BaseModel):
    name: str
    domain: Optional[str] = None
    aliases: list[str] = []


class CompetitorCreate(CompetitorBase):
    pass


class CompetitorOut(CompetitorBase):
    id: int
    brand_id: int
    created_at: datetime

    model_config = {"from_attributes": True}

    _decode_aliases = field_validator("aliases", mode="before")(_decode_aliases)


class BrandBase(BaseModel):
    name: str
    domain: Optional[str] = None
    description: Optional[str] = None
    is_own_brand: bool = True
    aliases: list[str] = []


class BrandCreate(BrandBase):
    competitors: list[CompetitorCreate] = []


class BrandUpdate(BrandBase):
    pass


class BrandOut(BrandBase):
    id: int
    created_at: datetime
    competitors: list[CompetitorOut] = []

    model_config = {"from_attributes": True}

    _decode_aliases = field_validator("aliases", mode="before")(_decode_aliases)


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
    provider: str  # validated against the providers catalog in the router (clear 400)
    model: str  # validated against the provider's models in the router (clear 400)


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
    success_count: int = 0
    error_count: int = 0
    mention_rate: Optional[float] = None
    error: Optional[str] = None
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


# ── Providers ─────────────────────────────────────────────────────────────────

class ProviderOut(BaseModel):
    id: str
    label: str
    models: list[str]
    default_model: str


# ── Dashboard ─────────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_audits: int
    total_queries_run: int
    avg_mention_rate: Optional[float]
    recent_runs: list[AuditRunOut]


# ── Ask Aperture ─────────────────────────────────────────────────────────────────────────────

class AskMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class AskRequest(BaseModel):
    brand_id: int
    question: str
    history: list[AskMessage] = []


class AnswerPart(BaseModel):
    type: Literal["kpi", "sov", "trend", "query_result", "raw_response"]
    data: dict[str, Any]


class AskResponse(BaseModel):
    answer_text: str
    grounded: bool
    refusal: Optional[str] = None
    parts: list[AnswerPart] = []
    suggested_followups: list[str] = []
    tool_trace: list[str] = []


class EvidenceResponse(BaseModel):
    result_id: int
    brand_id: int
    query: str
    provider: str
    model: str
    response_text: str
    brand_name: str
    competitor_names: list[str]
