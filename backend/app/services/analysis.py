"""Brand mention analysis helpers."""

import json
import re
from typing import Optional


def count_brand_mentions(text: str, brand_name: str) -> int:
    """Return the number of times *brand_name* appears in *text* (case-insensitive)."""
    if not text or not brand_name:
        return 0
    pattern = re.compile(re.escape(brand_name), re.IGNORECASE)
    return len(pattern.findall(text))


def find_competitor_mentions(text: str, competitor_names: list[str]) -> dict[str, int]:
    """Return a mapping of competitor name → mention count."""
    mentions: dict[str, int] = {}
    for name in competitor_names:
        count = count_brand_mentions(text, name)
        if count:
            mentions[name] = count
    return mentions


def serialize_competitor_mentions(mentions: dict[str, int]) -> Optional[str]:
    if not mentions:
        return None
    return json.dumps(mentions)


def serialize_sources(sources: list[str]) -> Optional[str]:
    if not sources:
        return None
    return json.dumps(sources)
