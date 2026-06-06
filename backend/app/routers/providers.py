"""Read-only endpoint exposing the supported providers/models catalog.

This is the single source of truth the frontend dropdown derives from, so the
model list can never drift from what the backend actually supports. Static and
stateless — no DB, no API keys required (works on a fresh clean clone).
"""

from fastapi import APIRouter

from app.schemas import ProviderOut
from app.services.llm.providers import PROVIDERS

router = APIRouter()


@router.get("/", response_model=list[ProviderOut])
def list_providers():
    return [
        ProviderOut(
            id=pid,
            label=entry["label"],
            models=entry["models"],
            default_model=entry["default_model"],
        )
        for pid, entry in PROVIDERS.items()
    ]
