"""
routers/chat.py
POST /api/chat          — standard JSON chat response
GET  /api/chat/stream   — SSE streaming response

Multi-turn conversation: history stored in DB session, sent with every LLM call.
"""

from __future__ import annotations

import json
import logging
from typing import AsyncGenerator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from sqlalchemy import select

from core.exceptions import LLMUnavailableError
from core.llm_client import chat_completion
from db.session_store import AgentLog, AsyncSessionLocal, Session, append_log
from models import ChatRequest, ChatResponse
from rag.knowledge_base import query as rag_query

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["chat"])

_MAX_HISTORY_TURNS = 10

_SYSTEM_PROMPT = """You are an AI Money Mentor embedded in the Economic Times — India's leading financial newspaper.

Your persona:
- Knowledgeable, warm, concise — like a smart CA friend who actually explains things.
- India-first: use Indian financial instruments, INR amounts, SEBI/RBI context.
- Educational only — NO specific stock picks, fund names, or guaranteed-return claims.
- Reference numbers from the user's session context when available.
- Keep replies under 150 words unless the question demands depth.
- Use Hinglish naturally when appropriate ("Agar aapka SIP ₹5,000 hai...").

Hard rules:
1. Never invent return rates — cite "historical equity returns of ~12% p.a." style.
2. Always end advice with a one-line disclaimer.
3. If asked about illegal activity or market manipulation — refuse politely.

When user asks about their financial plan (FIRE, health score, tax, etc.):
- ALWAYS reference projected_fi_age, corpus_gap, monthly_surplus, and required SIP vs actual surplus.
- Highlight if surplus > required SIP — tell them they can ACCELERATE their FIRE.
- Mention projected FI age if it's earlier than retirement age — that's a win worth calling out.
- Give 2–3 specific, numbers-backed next steps.
- Never give generic advice when you have real numbers in the session context.
"""


async def _get_chat_context(session_id: str) -> tuple[list[dict], str]:
    """
    Returns (history, context_suffix) in a single DB transaction.

    history        — last N user+assistant message pairs, chronological order.
    context_suffix — stringified session state_json for system prompt injection.
    """
    async with AsyncSessionLocal() as db:
        log_result = await db.execute(
            select(AgentLog)
            .where(AgentLog.session_id == session_id)
            .where(AgentLog.agent_name == "ChatAgent")
            .order_by(AgentLog.timestamp.desc())
            .limit(_MAX_HISTORY_TURNS)
        )
        logs = list(reversed(log_result.scalars().all()))

        sess_result = await db.execute(select(Session).where(Session.id == session_id))
        session = sess_result.scalar_one_or_none()

    history = _parse_logs_to_history(logs)
    context_suffix = _parse_state_to_context(session)
    return history, context_suffix


def _parse_logs_to_history(logs: list) -> list[dict]:
    history = []
    for log in logs:
        try:
            inp = json.loads(log.input_json)
            out = json.loads(log.output_json)
            if inp.get("role") and inp.get("content"):
                history.append({"role": inp["role"], "content": inp["content"]})
            if out.get("role") and out.get("content"):
                history.append({"role": out["role"], "content": out["content"]})
        except Exception:
            pass
    return history


def _fmt(x) -> str:
    if isinstance(x, (int, float)):
        return f"₹{x:,}"
    return str(x) if x is not None else "N/A"


def _parse_state_to_context(session: Session | None) -> str:
    if not session or not session.state_json or session.state_json == "{}":
        return ""
    try:
        state = json.loads(session.state_json)
    except Exception:
        return ""

    lines: list[str] = []

    fire = state.get("fire")
    if fire:
        lines.append("----- User's FIRE Plan -----")
        lines.append(f"- Required corpus:       {_fmt(fire.get('fi_corpus_required'))}")
        lines.append(f"- Current corpus:        {_fmt(fire.get('current_corpus'))}")
        lines.append(f"- Corpus gap:            {_fmt(fire.get('corpus_gap'))}")
        lines.append(f"- Required monthly SIP:  {_fmt(fire.get('required_monthly_sip'))}")
        lines.append(
            f"- Step-up SIP option:    {_fmt(fire.get('required_stepup_sip'))}/mo (+10%/yr)"
        )
        lines.append(f"- Projected FI age:      {fire.get('projected_fi_age', 'N/A')}")
        lines.append(f"- Years to FI:           {fire.get('years_to_fi', 'N/A')}")
        if fire.get("on_track"):
            lines.append("- Status: On track")
        else:
            lines.append("- Status: Off track")

    health = state.get("health")
    if health:
        lines.append("----- Money Health Score -----")
        lines.append(f"- Score: {health.get('overall_score')} / 100 (Grade {health.get('grade')})")
        lines.append(f"- Monthly surplus: {_fmt(health.get('monthly_surplus'))}")
        lines.append(f"- Net worth: {_fmt(health.get('total_net_worth'))}")
        for d in health.get("dimensions", []):
            lines.append(
                f"  • {d.get('name')}: {d.get('score')} ({d.get('label')}) — {d.get('insight')}"
            )

    if health and fire:
        delta = health.get("monthly_surplus", 0) - fire.get("required_monthly_sip", 0)
        lines.append(f"- Surplus vs SIP delta:  {_fmt(delta)}")

    tax = state.get("tax")
    if tax:
        lines.append("----- Tax Wizard -----")
        lines.append(
            f"- Old regime: ₹{tax.get('old_regime_tax', 0):,} | New: ₹{tax.get('new_regime_tax', 0):,}"
        )
        lines.append(
            f"- Recommended: {tax.get('recommended_regime')} | Saving: ₹{tax.get('savings_by_switching', 0):,}"
        )

    profile = state.get("profile")
    if profile:
        lines.append("----- User Profile -----")
        surplus = profile.get("monthly_gross_income", 0) - profile.get("monthly_expenses", 0)
        lines.append(f"- Age: {profile.get('age')} | Surplus: ₹{surplus:,}/mo")
        lines.append(
            f"- Risk: {profile.get('risk_profile')} | Retirement age: {profile.get('retirement_age')}"
        )

    if not lines:
        return f"\n\n[User's financial context: {json.dumps(state)[:600]}]"

    return "\n\n" + "\n".join(lines)


@router.post("/chat")
async def chat(req: ChatRequest) -> ChatResponse:
    history, context_suffix = await _get_chat_context(req.session_id)

    rag_context = rag_query(req.message)
    rag_suffix = f"\n\nRELEVANT KNOWLEDGE BASE:\n{rag_context}" if rag_context else ""

    system = _SYSTEM_PROMPT + context_suffix + rag_suffix
    messages = (
        [{"role": "system", "content": system}]
        + history
        + [{"role": "user", "content": req.message}]
    )

    try:
        reply = await chat_completion(messages)
    except LLMUnavailableError:
        reply = (
            "I'm having trouble connecting right now. "
            "Please try again in a moment. Your financial data is safe."
        )

    await append_log(
        req.session_id,
        "ChatAgent",
        "user_message",
        {"role": "user", "content": req.message},
        {"role": "assistant", "content": reply},
    )

    return ChatResponse(session_id=req.session_id, reply=reply)


@router.get("/chat/stream")
async def chat_stream(session_id: str, message: str) -> StreamingResponse:
    """
    SSE streaming endpoint.
    Client receives: data: {"token": "..."} per token, then data: {"done": true}
    """
    return StreamingResponse(
        _stream_reply(session_id, message),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


async def _stream_reply(session_id: str, message: str) -> AsyncGenerator[str, None]:
    history, context_suffix = await _get_chat_context(session_id)

    rag_context = rag_query(message)
    rag_suffix = f"\n\nRELEVANT KNOWLEDGE BASE:\n{rag_context}" if rag_context else ""

    system = _SYSTEM_PROMPT + context_suffix + rag_suffix

    messages = (
        [{"role": "system", "content": system}] + history + [{"role": "user", "content": message}]
    )

    full_reply = ""
    try:
        import httpx

        from core.config import settings

        payload = {
            "model": settings.GROQ_MODEL,
            "messages": messages,
            "temperature": settings.GROQ_TEMPERATURE,
            "max_tokens": settings.GROQ_MAX_TOKENS,
            "stream": True,
        }
        headers = {
            "Authorization": f"Bearer {settings.GROQ_API_KEY}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream(
                "POST",
                "https://api.groq.com/openai/v1/chat/completions",
                json=payload,
                headers=headers,
            ) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    data_str = line[6:].strip()
                    if data_str == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data_str)
                        token = chunk["choices"][0]["delta"].get("content", "")
                        if token:
                            full_reply += token
                            yield f"data: {json.dumps({'token': token})}\n\n"
                    except Exception:
                        continue

    except Exception as e:
        logger.error("SSE stream error: %s", e)
        fallback = "I'm having connection issues. Please use the standard chat for now."
        full_reply = fallback
        yield f"data: {json.dumps({'token': fallback})}\n\n"

    yield f"data: {json.dumps({'done': True})}\n\n"

    await append_log(
        session_id,
        "ChatAgent",
        "user_message_stream",
        {"role": "user", "content": message},
        {"role": "assistant", "content": full_reply},
    )
