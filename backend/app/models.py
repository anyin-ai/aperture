import json
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Brand(Base):
    __tablename__ = "brands"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    domain: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_own_brand: Mapped[bool] = mapped_column(Boolean, default=True)
    aliases: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON list of name variants
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

    queries: Mapped[list["Query"]] = relationship("Query", back_populates="brand", cascade="all, delete-orphan")
    competitors: Mapped[list["Competitor"]] = relationship("Competitor", back_populates="brand", cascade="all, delete-orphan")

    @property
    def alias_list(self) -> list[str]:
        """The stored alias JSON decoded to a list (empty when unset)."""
        return json.loads(self.aliases) if self.aliases else []


class Competitor(Base):
    __tablename__ = "competitors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    brand_id: Mapped[int] = mapped_column(Integer, ForeignKey("brands.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    domain: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    aliases: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON list of name variants
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

    brand: Mapped["Brand"] = relationship("Brand", back_populates="competitors")

    @property
    def alias_list(self) -> list[str]:
        """The stored alias JSON decoded to a list (empty when unset)."""
        return json.loads(self.aliases) if self.aliases else []


class Query(Base):
    __tablename__ = "queries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    brand_id: Mapped[int] = mapped_column(Integer, ForeignKey("brands.id"), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    language: Mapped[str] = mapped_column(String(10), default="en")
    category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

    brand: Mapped["Brand"] = relationship("Brand", back_populates="queries")
    results: Mapped[list["AuditResult"]] = relationship("AuditResult", back_populates="query", cascade="all, delete-orphan")


class AuditRun(Base):
    __tablename__ = "audit_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    brand_id: Mapped[int] = mapped_column(Integer, ForeignKey("brands.id"), nullable=False)
    provider: Mapped[str] = mapped_column(String(50), nullable=False)  # openai, perplexity
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, running, completed, failed
    total_queries: Mapped[int] = mapped_column(Integer, default=0)
    completed_queries: Mapped[int] = mapped_column(Integer, default=0)
    mention_rate: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    # Run-level error, set when the whole run fails (e.g. brand deleted mid-run,
    # an unexpected exception). NULL for healthy runs. Mirrors AuditResult.error.
    error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    brand: Mapped["Brand"] = relationship("Brand")
    results: Mapped[list["AuditResult"]] = relationship("AuditResult", back_populates="audit_run", cascade="all, delete-orphan")

    @property
    def success_count(self) -> int:
        """Number of result rows that completed without a provider error."""
        return sum(1 for r in self.results if r.error is None)

    @property
    def error_count(self) -> int:
        """Number of result rows that errored (bad key, stale model, network)."""
        return sum(1 for r in self.results if r.error is not None)


class AuditResult(Base):
    __tablename__ = "audit_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    audit_run_id: Mapped[int] = mapped_column(Integer, ForeignKey("audit_runs.id"), nullable=False)
    query_id: Mapped[int] = mapped_column(Integer, ForeignKey("queries.id"), nullable=False)
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    response_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    brand_mentioned: Mapped[bool] = mapped_column(Boolean, default=False)
    mention_count: Mapped[int] = mapped_column(Integer, default=0)
    competitor_mentions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON
    sources: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON
    error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    latency_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

    audit_run: Mapped["AuditRun"] = relationship("AuditRun", back_populates="results")
    query: Mapped["Query"] = relationship("Query", back_populates="results")

    @property
    def query_text(self) -> Optional[str]:
        """The underlying question text, read via from_attributes on serialize.

        Lets AuditResultOut.query_text populate everywhere (including nested
        under AuditRunOut.results on the polled audits path), not just in the
        standalone /results/ endpoint.
        """
        return self.query.text if self.query else None


class Setting(Base):
    __tablename__ = "settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    key: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now())
