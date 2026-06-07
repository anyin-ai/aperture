# Contributing to Aperture

Thank you for your interest in contributing! Aperture is open source and welcomes contributions of all kinds.

## How to Contribute

### Reporting Bugs

Please open a GitHub issue with:
- A clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Your environment (OS, Docker version, browser)

### Suggesting Features

Open a GitHub issue with the `enhancement` label. Describe:
- The use case you're trying to solve
- Your proposed solution
- Any alternatives you've considered

### Submitting Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes following the guidelines below
4. Run tests: `cd backend && pytest tests/ -v`
5. Build the frontend: `cd frontend && pnpm run build`
6. Open a pull request with a clear description of your changes

## Development Setup

See [DOCS.md](DOCS.md) for full setup instructions.

## Code Style

### Backend (Python)

- Follow PEP 8
- Use type hints throughout
- Write docstrings for public functions
- Keep functions small and focused
- Add tests for new functionality in `backend/tests/`

### Frontend (TypeScript/React)

- Use TypeScript strict mode
- Functional components with hooks (no class components)
- Keep components focused — split large components
- Use Tailwind CSS for styling
- No inline styles

## Adding a New LLM Provider

1. Create `backend/app/services/llm/<provider>_service.py`
2. Implement an async function returning `LLMResponse` (reuse `post_with_retries`, `extract_chat_content`, and the reproducibility constants from `app.services.llm`)
3. Add the provider + its models to the catalog in `backend/app/services/llm/providers.py` — this is the single source of truth; the `/api/providers` endpoint, audit-create validation, and the frontend dropdown all derive from it
4. Wire the provider into `audit_service.py`'s `_call_provider` function
5. Add the provider's API-key field to the frontend Settings UI (`frontend/src/views/Settings.tsx`); the model dropdown in `views/Audits.tsx` updates automatically from `/api/providers`
6. Add tests (mock the HTTP with `httpx.MockTransport` — no real network calls)

## Commit Messages

Use conventional commits:
- `feat:` — new feature
- `fix:` — bug fix
- `docs:` — documentation changes
- `test:` — adding or fixing tests
- `refactor:` — code refactoring
- `chore:` — maintenance tasks

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
