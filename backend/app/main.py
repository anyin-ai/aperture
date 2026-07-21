"""
Aperture – AI Visibility Monitoring Backend
"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routers import ask, audits, brands, providers, queries, results, settings


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

# Explicit origins via env (comma-separated). Default covers the shipped nginx
# port (3000) and the vite dev server (5173). Note: a wildcard origin ('*')
# combined with allow_credentials=True is invalid per the CORS spec — if you
# add cookie/Authorization auth later, set explicit origins and only then
# enable credentials. In the Docker topology nginx proxies same-origin, so CORS
# is moot there; this matters for the cross-origin vite dev server.
_origins = os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:3000,http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _origins.split(",") if o.strip()],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(brands.router, prefix="/api/brands", tags=["brands"])
app.include_router(queries.router, prefix="/api/queries", tags=["queries"])
app.include_router(audits.router, prefix="/api/audits", tags=["audits"])
app.include_router(results.router, prefix="/api/results", tags=["results"])
app.include_router(settings.router, prefix="/api/settings", tags=["settings"])
app.include_router(providers.router, prefix="/api/providers", tags=["providers"])
app.include_router(ask.router, prefix="/api/ask", tags=["ask"])


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "0.1.0"}
