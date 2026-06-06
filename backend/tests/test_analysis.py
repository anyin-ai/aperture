"""Tests for the brand mention analysis service."""

from app.services.analysis import (
    count_brand_mentions,
    count_name_with_aliases,
    find_competitor_mentions,
    find_competitor_mentions_with_aliases,
    serialize_competitor_mentions,
    serialize_sources,
)


def test_count_brand_mentions_basic():
    text = "Acme is the best. I love Acme products. ACME is everywhere."
    assert count_brand_mentions(text, "Acme") == 3


def test_count_brand_mentions_case_insensitive():
    assert count_brand_mentions("BRAND brand Brand", "brand") == 3


def test_count_brand_mentions_no_match():
    assert count_brand_mentions("No match here", "Acme") == 0


def test_count_brand_mentions_empty():
    assert count_brand_mentions("", "Acme") == 0
    assert count_brand_mentions("Some text", "") == 0


def test_find_competitor_mentions():
    text = "Rival is good. Competitor X is okay. Nobody knows Brand Z."
    result = find_competitor_mentions(text, ["Rival", "Competitor X", "Brand Z", "Unknown"])
    assert result["Rival"] == 1
    assert result["Competitor X"] == 1
    assert result["Brand Z"] == 1
    assert "Unknown" not in result


def test_serialize_competitor_mentions():
    import json
    mentions = {"Rival": 2, "Comp": 1}
    serialized = serialize_competitor_mentions(mentions)
    assert json.loads(serialized) == mentions


def test_serialize_competitor_mentions_empty():
    assert serialize_competitor_mentions({}) is None


def test_serialize_sources():
    import json
    sources = ["https://example.com", "https://other.com"]
    serialized = serialize_sources(sources)
    assert json.loads(serialized) == sources


def test_serialize_sources_empty():
    assert serialize_sources([]) is None


# ── Word-boundary correctness (no substring false positives) ─────────────────

def test_no_false_positive_arc_in_search():
    assert count_brand_mentions("I will search for it", "Arc") == 0


def test_no_false_positive_notion_in_notional():
    assert count_brand_mentions("a notional value", "Notion") == 0


def test_no_false_positive_ada_in_canada():
    assert count_brand_mentions("I live in Canada", "Ada") == 0


def test_true_positive_boundaries():
    assert count_brand_mentions("The Arc browser is great", "Arc") == 1
    assert count_brand_mentions("Notion is a note app", "Notion") == 1
    assert count_brand_mentions("Ada Lovelace", "Ada") == 1


def test_technical_tokens():
    assert count_brand_mentions("use Node.js today", "Node.js") == 1
    assert count_brand_mentions("Node.jsx framework", "Node.js") == 0
    assert count_brand_mentions("I love C++ a lot", "C++") == 1


def test_multi_word_name():
    assert count_brand_mentions("Use Open AI now", "Open AI") == 1
    assert count_brand_mentions("OpenAImagery", "OpenAI") == 0


def test_find_competitor_mentions_no_substring_false_positive():
    # The old substring matcher would have returned {'Arc': 1} here.
    assert find_competitor_mentions("I will search for results", ["Arc"]) == {}


# ── Alias-aware matching ─────────────────────────────────────────────────────

def test_count_name_with_aliases_sums_all_terms():
    assert count_name_with_aliases(
        "Try OpenAI and Open AI and ChatGPT", "OpenAI", ["Open AI", "ChatGPT"]
    ) == 3


def test_count_name_with_aliases_no_match():
    assert count_name_with_aliases("No mention here", "OpenAI", ["Open AI"]) == 0


def test_count_name_with_aliases_dedupes_name_as_alias():
    assert count_name_with_aliases("OpenAI OpenAI", "OpenAI", ["OpenAI"]) == 2


def test_find_competitor_mentions_with_aliases():
    result = find_competitor_mentions_with_aliases(
        "Use Notion and Coda", [("Notion", ["Notion App"]), ("Coda", [])]
    )
    assert result == {"Notion": 1, "Coda": 1}
