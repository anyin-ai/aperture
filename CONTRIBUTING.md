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
5. Build the frontend: `cd frontend && npm run build`
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
2. Implement an async function that returns `LLMResponse`
3. Add the provider to `audit_service.py`'s `_call_provider` function
4. Add the provider to `SUPPORTED_PROVIDERS` in `audits.py`
5. Add the UI for the provider in the frontend `Audits.tsx` and `Settings.tsx`
6. Add tests

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
