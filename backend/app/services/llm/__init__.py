"""Base interface and shared helpers for LLM provider integrations."""

from dataclasses import dataclass
from typing import Optional

# Reproducibility / cost knobs shared by all providers, in ONE place so an
# audit run is deterministic and bounded regardless of provider.
DEFAULT_TEMPERATURE = 0
DEFAULT_MAX_TOKENS = 1024

# Retry tuning shared by all providers (see retry.post_with_retries).
DEFAULT_MAX_RETRIES = 3
DEFAULT_BASE_DELAY = 0.5


@dataclass
class LLMResponse:
    text: str
    model: str
    sources: list[str]
    latency_ms: int
    error: Optional[str] = None


def extract_chat_content(data: dict) -> Optional[str]:
    """Safely pull choices[0].message.content from a chat-completions body.

    Returns None (never raises) on any missing/malformed key so the caller can
    surface a clean per-result error instead of an unhandled exception.
    """
    try:
        return data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError):
        return None
