"""Base interface for LLM provider integrations."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


@dataclass
class LLMResponse:
    text: str
    model: str
    sources: list[str]
    latency_ms: int
    error: Optional[str] = None
