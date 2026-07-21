"""Bounded OpenAI tool-calling loop for Ask Aperture."""

from __future__ import annotations

import json
import re
from typing import Any

import httpx
from sqlalchemy.orm import Session

from app.models import Brand
from app.schemas import AnswerPart, AskMessage, AskResponse
from app.services.ask.tools import TOOL_CATALOG, execute_tool
from app.services.llm.openai_service import OPENAI_CHAT_URL
from app.services.llm.retry import post_with_retries

MAX_TOOL_CALLS = 4
DEFAULT_ASK_MODEL = "gpt-5.6-terra"

SYSTEM_PROMPT = """You are Ask Aperture, an analyst of stored AI-visibility audits.
You must ground every factual claim and every number in tool output from this conversation.
Never estimate, invent, or use general knowledge as evidence. Call tools before answering.
If the stored rows cannot answer, say exactly what measurement is missing.
Keep the answer concise (2-4 short paragraphs), use plain language, and distinguish providers.
Do not expose tool implementation details. Recommendations may be qualitative, never fabricated facts.
"""


async def _call_openai(
    *, api_key: str, model: str, base_url: str | None,
    messages: list[dict[str, Any]], allow_tools: bool,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": 0,
        "max_tokens": 700,
    }
    if allow_tools:
        payload["tools"] = TOOL_CATALOG
        payload["tool_choice"] = "auto"

    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await post_with_retries(
            client, base_url or OPENAI_CHAT_URL, json=payload, headers=headers
        )
        response.raise_for_status()
        data = response.json()
    try:
        return data["choices"][0]["message"]
    except (KeyError, IndexError, TypeError) as exc:
        raise ValueError("Unexpected OpenAI response shape") from exc


def _part_for_tool(name: str, data: dict[str, Any]) -> AnswerPart | None:
    if not data.get("available"):
        return None
    mapping = {
        "get_visibility_overview": "kpi",
        "get_share_of_voice": "sov",
        "get_mention_trend": "trend",
        "get_query_results": "query_result",
        "get_raw_response": "raw_response",
    }
    part_type = mapping.get(name)
    return AnswerPart(type=part_type, data=data) if part_type else None


def _followups(tool_trace: list[str]) -> list[str]:
    candidates: list[str] = []
    if "get_visibility_overview" not in tool_trace:
        candidates.append("How is my visibility overall?")
    if "get_share_of_voice" not in tool_trace:
        candidates.append("Who is ahead of us in share of voice?")
    if "get_mention_trend" not in tool_trace:
        candidates.append("Is our mention rate improving?")
    if "get_query_results" not in tool_trace:
        candidates.append("Which buyer questions are we missing?")
    return candidates[:3]


def _has_unsupported_number(answer: str, tool_payloads: list[dict[str, Any]]) -> bool:
    """Catch obvious invented digits before prose reaches the client."""
    evidence = json.dumps(tool_payloads, sort_keys=True)
    return any(number not in evidence for number in re.findall(r"\d+(?:\.\d+)?", answer))


async def answer_question(
    *, db: Session, brand: Brand, question: str, history: list[AskMessage],
    api_key: str, model: str = DEFAULT_ASK_MODEL, base_url: str | None = None,
) -> AskResponse:
    messages: list[dict[str, Any]] = [{"role": "system", "content": SYSTEM_PROMPT}]
    for message in history[-8:]:
        messages.append({"role": message.role, "content": message.content[:4000]})
    messages.append({
        "role": "user",
        "content": f"Selected brand: {brand.name} (brand_id={brand.id}).\nQuestion: {question.strip()}",
    })

    tool_trace: list[str] = []
    tool_payloads: list[dict[str, Any]] = []
    parts: list[AnswerPart] = []
    final_text = ""
    seen_calls: set[str] = set()
    force_final = False

    while True:
        allow_tools = not force_final and len(tool_trace) < MAX_TOOL_CALLS
        message = await _call_openai(
            api_key=api_key,
            model=model,
            base_url=base_url,
            messages=messages,
            allow_tools=allow_tools,
        )
        tool_calls = message.get("tool_calls") or []
        if not tool_calls:
            final_text = (message.get("content") or "").strip()
            break

        messages.append(message)
        for call in tool_calls:
            if len(tool_trace) >= MAX_TOOL_CALLS:
                break
            function = call.get("function") or {}
            name = function.get("name", "")
            try:
                arguments = json.loads(function.get("arguments") or "{}")
            except (TypeError, ValueError):
                arguments = {}
            signature = f"{name}:{json.dumps(arguments, sort_keys=True)}"
            if signature in seen_calls:
                messages.append({
                    "role": "tool",
                    "tool_call_id": call.get("id", f"tool-{len(tool_trace) + 1}"),
                    "content": json.dumps({
                        "available": False,
                        "reason": "This measurement was already retrieved; answer from the existing result.",
                    }),
                })
                force_final = True
                continue
            seen_calls.add(signature)
            payload = execute_tool(name, arguments, db, brand.id)
            tool_trace.append(name)
            tool_payloads.append(payload)
            part = _part_for_tool(name, payload)
            if part:
                parts.append(part)
            messages.append({
                "role": "tool",
                "tool_call_id": call.get("id", f"tool-{len(tool_trace)}"),
                "content": json.dumps(payload),
            })

        if len(tool_trace) >= MAX_TOOL_CALLS:
            # One final narration call, now without tools.
            continue

    available = any(payload.get("available") for payload in tool_payloads)
    if not available:
        reasons = [payload.get("reason") for payload in tool_payloads if payload.get("reason")]
        refusal = reasons[0] if reasons else "The stored audits do not contain evidence for that question yet."
        return AskResponse(
            answer_text=refusal,
            grounded=False,
            refusal=refusal,
            tool_trace=tool_trace,
            suggested_followups=["Run a fresh audit", "Show my configured buyer questions"],
        )

    if not final_text or _has_unsupported_number(final_text, tool_payloads):
        final_text = "Here is what Aperture can verify from your stored audit runs. The measurement cards below are the source of truth."

    return AskResponse(
        answer_text=final_text,
        grounded=True,
        parts=parts,
        suggested_followups=_followups(tool_trace),
        tool_trace=tool_trace,
    )
