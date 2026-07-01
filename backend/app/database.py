import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./aperture.db")

# Managed Postgres (Neon, Railway, etc.) often hands out a "postgres://" or bare
# "postgresql://" URL; SQLAlchemy 2.0 needs an explicit driver. Normalize to
# psycopg (v3) so one DATABASE_URL works on Railway/Neon and locally.
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = "postgresql+psycopg://" + DATABASE_URL[len("postgres://"):]
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = "postgresql+psycopg://" + DATABASE_URL[len("postgresql://"):]

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
    # Neon (and other cloud Postgres) close idle connections; without these a
    # reused dead connection raises "SSL connection has been closed
    # unexpectedly" on the next query. pre_ping validates/reconnects before use;
    # recycle drops connections older than 5 min. No-op for local SQLite.
    pool_pre_ping=True,
    pool_recycle=300,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from app import models  # noqa: F401 – registers all models

    Base.metadata.create_all(bind=engine)
