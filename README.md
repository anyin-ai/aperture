# Aperture

**Open-source AI visibility infrastructure.**

Track how your brand appears (or doesn't) across ChatGPT, Perplexity, Google AI Overviews, and other LLM-powered search engines. Self-hosted. Bring your own keys.

Free alternative to [Profound](https://tryprofound.com) and [Peec AI](https://peec.ai).

---

## Why Aperture?

AI search engines are replacing traditional search for product recommendations, brand discovery, and purchase decisions. If an LLM doesn't mention your brand, you're invisible to a growing share of your customers.

Aperture lets you:

- **Monitor** — Track whether AI models recommend your brand for the queries that matter
- **Compare** — See which competitors get cited instead of you
- **Audit** — Run structured visibility audits across models, languages, and markets
- **Track** — Measure changes over time as you optimize your content

No vendor lock-in. No per-seat pricing. Your infrastructure, your data, your keys.

---

## Tracked AI Search Engines

| Engine | Status |
|--------|--------|
| ChatGPT (OpenAI) | 🟢 Supported |
| Perplexity | 🟢 Supported |
| Google AI Overviews | 🟡 Planned |
| Claude (Anthropic) | 🟡 Planned |

## Supported LLM Providers (BYOK)

Aperture doesn't ship with API keys. Bring your own:

- **OpenAI** — 🟢 Supported (`gpt-4o-mini`, `gpt-4o`, `gpt-4-turbo`, `gpt-3.5-turbo`)
- **Perplexity** — 🟢 Supported (`sonar`, `sonar-pro`)
- **Anthropic** — 🟡 Planned
- **Google (Gemini)** — 🟡 Planned
- Any OpenAI-compatible endpoint (Ollama, vLLM, etc.) — set a custom Base URL in Settings

The supported provider/model list is served by the backend at `GET /api/providers`, so the UI never drifts from what actually works.

---

## Use Cases

- **Brands** — Monitor whether AI recommends you or your competitors
- **Agencies** — Run client audits at scale without per-seat SaaS costs
- **SEO/AEO teams** — Track the impact of content optimization on AI visibility
- **Researchers** — Study LLM recommendation patterns across markets and languages

---

## Comparison

How Aperture compares to commercial AI visibility tools:

| Feature | Aperture | Peec AI | LLMrefs | Semrush | Profound | Otterly AI |
|---------|----------|---------|---------|---------|----------|------------|
| Self-hosted | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Open source | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| BYOK (bring your own keys) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Multi-language queries | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| ChatGPT tracking | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Perplexity tracking | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Google AI Overviews | 🟡 Planned | ✅ | ✅ | ✅ | ✅ | ✅ |
| Competitor benchmarking | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Citation/source tracking | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Sentiment analysis | 🟡 Planned | ✅ | ❌ | ✅ | ✅ | ✅ |
| Your data stays on your server | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| No per-seat pricing | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| API/export | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Pricing | Free | €89/mo+ | Free tier / paid | $$$+ | Enterprise | Enterprise |

**Why self-host?** Your audit queries, brand strategy, and competitive intelligence never leave your infrastructure. No vendor lock-in, no usage caps, no surprise pricing changes.

> **Security note (MVP):** API keys are stored **unencrypted** in the local SQLite database, and Aperture ships with **no authentication**. Keep your instance on localhost / a private network, or put it behind a reverse proxy with auth — do not expose it to the public internet. See [DOCS.md](DOCS.md#security--self-hosting) for details.

---

## Documentation

See [DOCS.md](DOCS.md) for quick start guide, architecture, configuration, and roadmap.

---

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

[MIT](LICENSE)

---

## Acknowledgements

Aperture is built by [Anyin](https://anyin.ai) (安引), an AEO agency helping brands become visible in AI-powered search.
