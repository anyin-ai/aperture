"""
Aperture – AI Visibility Monitoring Backend
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routers import brands, queries, audits, results, settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Aperture",
    description="Open-source AI visibility infrastructure. Track how your brand appears across LLMs.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(brands.router, prefix="/api/brands", tags=["brands"])
app.include_router(queries.router, prefix="/api/queries", tags=["queries"])
app.include_router(audits.router, prefix="/api/audits", tags=["audits"])
app.include_router(results.router, prefix="/api/results", tags=["results"])
app.include_router(settings.router, prefix="/api/settings", tags=["settings"])


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "0.1.0"}
