"""Brand mention analysis helpers.

Matching uses *conditional* word boundaries rather than a blanket ``\\b`` so
that ordinary names don't produce substring false positives ("Arc" inside
"search", "Notion" inside "notional") while tokens that start/end with
non-word characters (Node.js, C++) still match correctly.
"""

import functools
import json
import re
from typing import Optional


@functools.lru_cache(maxsize=512)
def _compile_name_pattern(name: str) -> re.Pattern:
    """Compile a case-insensitive pattern for *name* with conditional boundaries.

    A blanket ``\\b`` breaks for names like ``Node.js`` or ``C++`` (which end in
    non-word characters). Instead we only forbid an adjacent word character on
    a side where *name* itself has a word character — so "C++" matches in
    "I love C++" but "Arc" does not match inside "search".
    """
    stripped = name.strip()
    left = r"(?<!\w)" if re.match(r"\w", stripped) else ""
    right = r"(?!\w)" if re.search(r"\w$", stripped) else ""
    return re.compile(left + re.escape(stripped) + right, re.IGNORECASE)


def count_brand_mentions(text: str, brand_name: str) -> int:
    """Return how many times *brand_name* appears in *text* (case-insensitive).

    Single-term matching. For name + alias matching use
    :func:`count_name_with_aliases`.
    """
    if not text or not brand_name or not brand_name.strip():
        return 0
    return len(_compile_name_pattern(brand_name).findall(text))


def count_name_with_aliases(
    text: str, name: str, aliases: Optional[list[str]] = None
) -> int:
    """Sum mentions of *name* and each of its *aliases* in *text*.

    Terms are de-duplicated case-insensitively so passing an alias equal to the
    name does not double-count. Note (known MVP limitation): if an alias is a
    substring of another term for the same entity (e.g. "AI" within "Open AI"),
    counts are additive — accepted as a conscious tradeoff.
    """
    seen: set[str] = set()
    terms: list[str] = []
    for term in [name, *(aliases or [])]:
        if not term or not term.strip():
            continue
        key = term.strip().lower()
        if key in seen:
            continue
        seen.add(key)
        terms.append(term)
    return sum(count_brand_mentions(text, term) for term in terms)


def find_competitor_mentions(text: str, competitor_names: list[str]) -> dict[str, int]:
    """Return a mapping of competitor name → mention count (zero counts omitted)."""
    mentions: dict[str, int] = {}
    for name in competitor_names:
        count = count_brand_mentions(text, name)
        if count:
            mentions[name] = count
    return mentions


def find_competitor_mentions_with_aliases(
    text: str, competitors: list[tuple[str, list[str]]]
) -> dict[str, int]:
    """Alias-aware competitor counting.

    *competitors* is a list of ``(canonical_name, aliases)`` tuples. Returns
    ``{canonical_name: total_count}`` with alias hits counted toward the
    canonical name; zero-count entries are omitted.
    """
    mentions: dict[str, int] = {}
    for name, aliases in competitors:
        count = count_name_with_aliases(text, name, aliases)
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
