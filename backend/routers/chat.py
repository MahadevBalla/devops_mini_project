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
from models.schemas import ChatRequest, ChatResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["chat"])

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
"""


async def _get_session_history(session_id: str) -> list[dict]:
    """Load chat history from agent_logs for this session."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(AgentLog)
            .where(AgentLog.session_id == session_id)
            .where(AgentLog.agent_name == "ChatAgent")
            .order_by(AgentLog.timestamp)
        )
        logs = result.scalars().all()
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


async def _get_feature_context(session_id: str) -> str:
    """Pull feature result summary from session state_json for context injection."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Session).where(Session.id == session_id)
        )
        session = result.scalar_one_or_none()
        if session and session.state_json and session.state_json != "{}":
            try:
                state = json.loads(session.state_json)
                return f"\n\n[User's financial context from this session: {json.dumps(state)[:800]}]"
            except Exception:
                pass
    return ""


@router.post("/chat")
async def chat(req: ChatRequest) -> ChatResponse:
    history = await _get_session_history(req.session_id)
    context_suffix = await _get_feature_context(req.session_id)

    system = _SYSTEM_PROMPT + context_suffix
    messages = [{"role": "system", "content": system}] + history + [
        {"role": "user", "content": req.message}
    ]

    try:
        reply = await chat_completion(messages)
    except LLMUnavailableError:
        reply = (
            "I'm having trouble connecting right now. "
            "Please try again in a moment. Your financial data is safe."
        )

    # Persist both turns
    await append_log(
        req.session_id, "ChatAgent", "user_message",
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
    history = await _get_session_history(session_id)
    context_suffix = await _get_feature_context(session_id)
    system = _SYSTEM_PROMPT + context_suffix

    messages = [{"role": "system", "content": system}] + history + [
        {"role": "user", "content": message}
    ]

    full_reply = ""
    try:
        # Groq supports streaming — use httpx streaming
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

    # Persist after full reply assembled
    await append_log(
        session_id, "ChatAgent", "user_message_stream",
        {"role": "user", "content": message},
        {"role": "assistant", "content": full_reply},
    )
