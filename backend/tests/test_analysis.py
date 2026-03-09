"""Tests for the brand mention analysis service."""

from app.services.analysis import (
    count_brand_mentions,
    find_competitor_mentions,
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
