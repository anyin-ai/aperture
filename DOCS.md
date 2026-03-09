# Aperture — Documentation

> ⚠️ **Work in progress.** System architecture is being finalized. Details below are draft and subject to change.

---

## Quick Start

### Prerequisites

- Docker and Docker Compose
- At least one LLM API key

### Installation

```bash
git clone https://github.com/AnyinAI/aperture.git
cd aperture
cp .env.example .env
```

Add your API keys to `.env`:

```env
OPENAI_API_KEY=sk-...
PERPLEXITY_API_KEY=pplx-...
# Add any other providers
```

Start the stack:

```bash
docker compose up -d
```

Open `http://localhost:3000` in your browser.

---

## How It Works

### 1. Define your brand and competitors

```yaml
# config/brands.yml
brand:
  name: "YourBrand"
  aliases: ["Your Brand", "yourbrand.com"]

competitors:
  - name: "Competitor A"
    aliases: ["CompA", "competitora.com"]
  - name: "Competitor B"
    aliases: ["CompB"]
```

### 2. Define your audit queries

```yaml
# config/queries.yml
queries:
  - text: "Best USB-C hub for MacBook"
    languages: [en, de, fr]
    category: "product_recommendation"
  - text: "Most reliable GaN charger under €50"
    languages: [en, de]
    category: "purchase_intent"
```

### 3. Run an audit

```bash
aperture audit run --config config/
```

### 4. View results

Open the dashboard at `http://localhost:3000` or export:

```bash
aperture export --format csv --output results/
```

---

## Dashboard

The Aperture dashboard shows:

- **Visibility Score** — How often your brand appears vs. competitors per query
- **Citation Analysis** — Where AI models source their recommendations from
- **Language Gaps** — Which markets/languages your brand is invisible in
- **Trend Tracking** — Visibility changes over time across models
- **Competitor Matrix** — Side-by-side comparison of who gets recommended

---

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Query       │────▶│  LLM Router  │────▶│  Response    │
│  Engine      │     │  (BYOK)      │     │  Parser      │
└─────────────┘     └──────────────┘     └──────┬──────┘
                                                │
                    ┌──────────────┐     ┌──────▼──────┐
                    │  Dashboard   │◀────│  Brand      │
                    │  (Web UI)    │     │  Matcher    │
                    └──────────────┘     └─────────────┘
```

- **Query Engine** — Expands audit queries across languages and platforms
- **LLM Router** — Sends queries to configured providers using your API keys
- **Response Parser** — Extracts structured data from AI responses
- **Brand Matcher** — Detects brand mentions, aliases, and contextual references
- **Dashboard** — Web UI for visualization and reporting

---

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | No | OpenAI API key for ChatGPT queries |
| `PERPLEXITY_API_KEY` | No | Perplexity API key |
| `ANTHROPIC_API_KEY` | No | Anthropic API key for Claude queries |
| `GOOGLE_API_KEY` | No | Google API key for Gemini queries |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AUDIT_SCHEDULE` | No | Cron expression for scheduled audits (default: weekly) |

At least one LLM API key is required.

---

## Roadmap

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
