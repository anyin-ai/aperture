# Aperture — Documentation

> ⚠️ **Work in progress.** System architecture is being finalized. Details below are draft and subject to change.

---

## Quick Start

### Prerequisites

- Docker and Docker Compose
- API keys for the AI providers you want to use (OpenAI, Perplexity, etc.)

### 1. Clone and Start

```bash
git clone https://github.com/anyin-ai/aperture
cd aperture
docker compose up -d
```

The UI is available at **http://localhost:3000** and the API at **http://localhost:8000**.

### 2. Configure API Keys

1. Open **http://localhost:3000**
2. Go to **Settings**
3. Enter your API keys for the providers you want to use:
   - **OpenAI**: Get your key from [platform.openai.com](https://platform.openai.com/api-keys)
   - **Perplexity**: Get your key from [perplexity.ai](https://www.perplexity.ai/settings/api)
4. Click **Save** for each key

Keys are stored **unencrypted** in your local SQLite database and are only ever sent to the AI provider you query. See [Security & Self-Hosting](#security--self-hosting) before deploying.

### 3. Set Up Your Brand

1. Go to **Brands**
2. Click **Add Brand**
3. Enter your brand name, domain, and description
4. Add your competitors so Aperture can track whether they get cited instead of you

### 4. Create Queries

1. Go to **Queries**
2. Click **Add Query**
3. Add the questions that your target audience asks AI engines:
   - "What is the best project management tool?"
   - "Recommend a CRM for small businesses"
   - "Which tool should I use for team collaboration?"
4. Set the language and category for each query

### 5. Run an Audit

1. Go to **Audits**
2. Click **New Audit**
3. Select your brand, provider (OpenAI or Perplexity), and model
4. Select the queries to run
5. Click **Run Audit**

Aperture will send each query to the selected AI engine and analyze the response for brand mentions. The Audits view updates live by polling every ~3 seconds while a run is active, and each run always finishes in a terminal **completed** or **failed** state.

### 6. Track Results

- The **Dashboard** shows your overall mention rate and trends over time
- Each audit run shows which queries mentioned your brand and which didn't
- Competitor mention counts help you understand who AI recommends instead

---

## Architecture

```
aperture/
├── backend/                 # Python FastAPI backend
│   ├── app/
│   │   ├── main.py          # FastAPI app entry point
│   │   ├── database.py      # SQLAlchemy setup
│   │   ├── models.py        # Database models
│   │   ├── schemas.py       # Pydantic schemas
│   │   ├── routers/         # API route handlers
│   │   │   ├── brands.py
│   │   │   ├── queries.py
│   │   │   ├── audits.py
│   │   │   ├── results.py
│   │   │   └── settings.py
│   │   └── services/        # Business logic
│   │       ├── llm/         # LLM provider integrations
│   │       │   ├── openai_service.py
│   │       │   └── perplexity_service.py
│   │       ├── analysis.py  # Brand mention detection
│   │       └── audit_service.py
│   ├── tests/               # pytest test suite
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                # React + TypeScript frontend
│   ├── src/
│   │   ├── App.tsx
│   │   ├── api/             # API client
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page components
│   │   └── types/           # TypeScript types
│   ├── package.json
│   └── Dockerfile
└── docker-compose.yml
```

### Data Model

| Entity | Description |
|--------|-------------|
| **Brand** | A brand to monitor (yours or a competitor) |
| **Competitor** | Competitor linked to a brand for tracking |
| **Query** | A question sent to AI engines |
| **AuditRun** | A batch execution of queries against one LLM provider |
| **AuditResult** | Per-query result from an audit run |
| **Setting** | Key-value configuration (API keys, etc.) |

### Analysis Engine

Aperture uses case-insensitive regex matching to detect brand mentions in LLM responses:

1. Each LLM response is scanned for the brand name
2. Competitor names are also scanned to track citation rates
3. Mention counts and citation sources are stored per result
4. Aggregated mention rate = (queries with brand mentioned / total queries) × 100

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite:///./aperture.db` | Database connection string |

### Supported Providers

The canonical list is served by the backend at `GET /api/providers` (the UI reads it from there), so this table can't drift from what actually runs:

| Provider | Status | Models |
|----------|--------|--------|
| OpenAI | ✅ | gpt-4o-mini, gpt-4o, gpt-4-turbo, gpt-3.5-turbo |
| Perplexity | ✅ | sonar, sonar-pro |
| Anthropic | 🟡 Planned | — |
| Google | 🟡 Planned | — |

### Custom OpenAI-Compatible Endpoints

For Ollama, vLLM, or other OpenAI-compatible APIs, set the **Base URL** in Settings to your endpoint, e.g.:
- Ollama: `http://localhost:11434/v1`
- vLLM: `http://your-server:8080/v1`

Then use your custom model name in audit runs.

---

## Security & Self-Hosting

Aperture is built for single-tenant self-hosting. Be aware of the MVP security posture:

- **API keys are stored unencrypted (plaintext)** in the SQLite database. Anyone with file or shell access to the host can read them. Encryption-at-rest is planned.
- **There is no built-in authentication.** Every visitor to the UI/API has full access.
- **Do not expose the instance to the public internet.** Keep it on `localhost` / a private network, or front it with a reverse proxy that enforces auth.
- **CORS** defaults to `http://localhost:3000` and `http://localhost:5173`. Override with the `CORS_ALLOW_ORIGINS` env var (comma-separated). In the Docker topology nginx proxies the API same-origin, so CORS is not exercised there.
- Audit data and keys are only ever transmitted to the AI provider you query — nowhere else.

## Database & Upgrades

The schema is created automatically with SQLAlchemy `create_all` on startup; **there are no migrations**. When upgrading to a version that adds or changes columns, delete the SQLite database and let it be recreated:

```bash
# local dev
rm backend/aperture.db
# docker (named volume)
docker compose down -v
```

Back up first if you need to keep prior audit history.

---

## Development

### Backend

**Python:** 3.12 (matches the `python:3.12-slim` Docker image and CI). Use `pyenv local 3.12` for the venv if your system default differs.

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API docs available at http://localhost:8000/docs

### Frontend

```bash
cd frontend
pnpm install
pnpm run dev
```

UI available at http://localhost:5173

### Tests

```bash
cd backend
pytest tests/ -v
```

---

## Roadmap

- [ ] Google AI Overviews tracking
- [ ] Claude (Anthropic) integration
- [ ] Gemini integration
- [ ] Sentiment analysis on brand mentions
- [ ] Scheduled audit runs (cron)
- [ ] Email/webhook notifications
- [ ] Export to CSV/JSON
- [ ] Multi-language query support improvements
- [ ] Bulk query import
- [ ] Competitive share-of-voice charts
- [ ] Core audit engine
- [ ] BYOK multi-provider support
- [ ] Brand mention detection
- [ ] Web dashboard
- [ ] Google AI Overviews integration
- [ ] Citation source extraction
- [ ] Scheduled audits with alerting
- [ ] REST API for external integrations
- [ ] Multi-tenant support
- [ ] Webhook notifications
