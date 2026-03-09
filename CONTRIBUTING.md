# Contributing to Aperture

Thanks for your interest in contributing.

This guide is intentionally lightweight. If anything is unclear, open an issue and we can improve it together.

## Ways to contribute

- Report bugs
- Suggest features
- Improve docs
- Submit code changes

## Opening issues

Please search existing issues first to avoid duplicates.

### Bug reports

Include:

- What happened
- What you expected to happen
- Steps to reproduce
- Environment details (OS, browser, Docker version, relevant package versions)
- Logs or screenshots when useful

### Feature requests

Include:

- Problem to solve
- Proposed solution
- Alternatives considered
- Any constraints (performance, security, compatibility)

## Local setup

Use the setup steps in [DOCS.md](DOCS.md) as the source of truth.

At a high level:

- Frontend: Next.js
- Backend: Python
- Database: PostgreSQL
- Local runtime: Docker Compose

## Coding standards (minimal)

### General

- Keep changes focused and small
- Prefer clear names over clever code
- Update docs when behavior changes
- Avoid unrelated refactors in the same PR

### Frontend (Next.js)

- Follow existing project structure and naming
- Keep components and hooks small and readable
- Run lint/type checks before opening a PR (if configured)

### Backend (Python)

- Follow PEP 8 style
- Prefer type hints for new or changed public functions
- Keep modules cohesive and easy to test

### Database (PostgreSQL)

- Make schema changes through migrations
- Include safe defaults for backward compatibility when possible
- Document data-impacting changes in the PR description

## Pull request process

1. Fork the repo and create a feature branch
2. Make your changes
3. Run relevant checks/tests locally
4. Open a pull request with a clear description

### PR checklist

- Explain the problem and solution
- Link related issue(s)
- Note testing performed
- Add screenshots for UI changes
- Update docs when needed

### Review and merge

- One approval is required before merge
- Keep commit message format flexible (no strict convention required)
- Maintainers may request follow-up changes before merging

## Scope and expectations

- Large changes should start with an issue or discussion first
- Breaking changes should include migration notes
- Be respectful and collaborative in review discussions

Thanks again for helping improve Aperture.