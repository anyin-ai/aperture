# Deploying Aperture (Vercel + Railway + Neon)

This is the managed-cloud deployment path. Aperture also runs fully self-hosted
via `docker compose up` (see [DOCS.md](DOCS.md)) — that remains the primary,
"data stays on your server" option.

## Topology

```
Browser ──▶ Vercel (Next.js frontend)
                │  /api/* proxied server-side (BACKEND_URL)
                ▼
            Railway (FastAPI backend)  ──▶  Neon (Postgres)
                                       ──▶  OpenAI / Perplexity (your BYOK keys)
```

- **Frontend → Vercel.** Native Next.js. The app's `/api/[...path]` route handler
  proxies to the backend at `BACKEND_URL`, so the browser only ever talks to the
  Vercel origin.
- **Backend → Railway.** A persistent container (the existing `backend/Dockerfile`),
  so the long-running background audits and a normal DB connection work — unlike
  serverless, which would truncate audits and can't keep SQLite.
- **Database → Neon Postgres.** Replaces the local SQLite file.

> **Note:** Railway is **not** a Vercel Marketplace integration — it's a separate
> platform. Only the database (Neon) is provisioned through Vercel
> (`vercel install neon`). The backend is deployed directly on Railway.

## Env wiring

| Service | Variable | Value |
|---------|----------|-------|
| **Railway** (backend) | `DATABASE_URL` | Neon connection string (`postgres://…` — the app normalizes it to `postgresql+psycopg://`) |
| **Railway** (backend) | `CORS_ALLOW_ORIGINS` | your Vercel URL, e.g. `https://aperture.vercel.app` |
| **Vercel** (frontend) | `BACKEND_URL` | your Railway URL, e.g. `https://aperture-backend.up.railway.app` |

> ⚠️ **Gotcha:** `vercel install neon` attaches `DATABASE_URL` to the **Vercel**
> project — but the frontend doesn't use the DB; the **backend** does. Copy the
> Neon connection string into **Railway's** `DATABASE_URL`. (Equivalently, just
> create the database at [neon.tech](https://neon.tech) and use its string.)

## Steps

### 1. Database — Neon

```bash
# from the linked Vercel (frontend) project, or provision directly at neon.tech
vercel install neon
```
Copy the resulting connection string for step 2.

### 2. Backend — Railway

Easiest via the Railway dashboard → **New Project → Deploy from GitHub repo**:
- **Root directory:** `backend` (uses `backend/Dockerfile` + `backend/railway.json`)
- **Variables:** `DATABASE_URL` (Neon), `CORS_ALLOW_ORIGINS` (Vercel URL)
- Railway injects `$PORT`; the container already binds to it. Health check: `/api/health`.

Tables are created automatically on first boot (`create_all`) — there are no
migrations, so a schema-changing release needs the DB reset (see DOCS.md).

### 3. Frontend — Vercel

```bash
cd frontend
vercel link          # select the team/project
vercel env add BACKEND_URL    # = your Railway backend URL (all environments)
vercel --prod
```
Or via the dashboard: **Import repo → Root Directory `frontend`** → add `BACKEND_URL`.

### 4. Verify

```bash
curl https://<your-vercel-url>/api/health          # {"status":"ok",...} proxied from Railway
curl https://<your-vercel-url>/api/providers/       # sonar / sonar-pro
```
Then open the UI, add a key in Settings, run an audit.

## Security reminder

On managed cloud, API keys are stored **unencrypted in Neon** and there is **no
auth** in front of the app. Restrict access (e.g. Vercel password protection /
an auth proxy) or keep it private. This is why the default story is self-hosting.
