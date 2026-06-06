"""Single source of truth for supported LLM providers and their models.

Everything that needs to know which providers/models Aperture supports — the
``/api/providers`` endpoint, the provider service defaults, audit-create-time
validation, the frontend dropdown (via the endpoint), and the docs — derives
from this module so the list can never drift across the codebase.

Pure Python on purpose: no DB, no Pydantic, trivially importable everywhere.
"""

from __future__ import annotations

# Canonical, read-only catalog. Insertion order is preserved (openai first).
PROVIDERS: dict[str, dict] = {
    "openai": {
        "label": "OpenAI",
        "models": ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"],
        "default_model": "gpt-4o-mini",
    },
    "perplexity": {
        "label": "Perplexity",
        # The old llama-3.1-sonar-* family was retired in early 2025; the
        # current online-search models are `sonar` and `sonar-pro`.
        "models": ["sonar", "sonar-pro"],
        "default_model": "sonar",
    },
}


def supported_providers() -> set[str]:
    """Return the set of supported provider ids."""
    return set(PROVIDERS.keys())


def default_model(provider: str) -> str | None:
    """Return the default model id for *provider*, or None if unknown."""
    entry = PROVIDERS.get(provider)
    return entry["default_model"] if entry else None


def is_valid_model(provider: str, model: str) -> bool:
    """Return whether *model* is a supported model for *provider*."""
    entry = PROVIDERS.get(provider)
    return bool(entry) and model in entry["models"]


def validate_provider_model(provider: str, model: str) -> str | None:
    """Validate a (provider, model) pair.

    Returns ``None`` when the pair is valid, otherwise a clear, human-readable
    error string suitable for a 400 response.
    """
    entry = PROVIDERS.get(provider)
    if entry is None:
        supported = ", ".join(PROVIDERS.keys())
        return f"Unsupported provider '{provider}'. Supported: {supported}"
    if model not in entry["models"]:
        supported = ", ".join(entry["models"])
        return (
            f"Model '{model}' is not supported for provider '{provider}'. "
            f"Supported models: {supported}"
        )
    return None
