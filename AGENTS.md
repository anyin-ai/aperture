# AGENTS.md — Context for AI Assistants

**Aperture** is open-source AI visibility infrastructure: it tracks how brands appear (or don’t) across ChatGPT, Perplexity, and other LLM-powered search engines. Self-hosted, bring your own API keys.

## Stack

| Layer   | Tech |
|--------|------|
| Backend | Python 3, FastAPI, SQLAlchemy, Pydantic |
| Frontend | TypeScript, React, Vite, Tailwind CSS |
| Run     | Docker Compose (optional); can run backend/frontend locally |

## Where to Look

- **API & app entry:** `backend/app/main.py`
- **DB models & schemas:** `backend/app/models.py`, `backend/app/schemas.py`
- **API routes:** `backend/app/routers/` (brands, queries, audits, results, settings)
- **Business logic:** `backend/app/services/` — `audit_service.py`, `analysis.py`, `services/llm/*.py` for each provider
- **Tests:** `backend/tests/` (pytest)
- **Frontend:** `frontend/src/` — `App.tsx`, `pages/`, `components/`, `api/`, `types/`

## Run & Test

- **Full stack:** `docker compose up -d` → UI http://localhost:3000, API http://localhost:8000
- **Backend dev:** `cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload`
- **Frontend dev:** `cd frontend && npm install && npm run dev`
- **Backend tests:** `cd backend && pytest tests/ -v`
- **Frontend build:** `cd frontend && npm run build`

## Conventions

See [CONTRIBUTING.md](CONTRIBUTING.md) for code style (PEP 8, type hints, docstrings; TS strict, functional components, Tailwind). See [DOCS.md](DOCS.md) for architecture and configuration.
