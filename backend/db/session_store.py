"""
db/session_store.py
SQLite session store and agent audit log via SQLAlchemy async.
"""

from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import Column, DateTime, ForeignKey, String, Text, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from core.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

# Truncation limit as a named module-level constant
_MAX_LOG_CHARS = 10_000


# ORM models
class Base(DeclarativeBase):
    pass


class Session(Base):
    __tablename__ = "sessions"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    feature = Column(String(64), nullable=False)
    state_json = Column(Text, default="{}")


class AgentLog(Base):
    __tablename__ = "agent_logs"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), ForeignKey("sessions.id"), nullable=False)
    agent_name = Column(String(64), nullable=False)
    step = Column(String(128), nullable=False)
    input_json = Column(Text, default="{}")
    output_json = Column(Text, default="{}")
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))


# DB lifecycle
async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


# Repository helpers
async def create_session(feature: str) -> str:
    """Create a new session record and return its UUID."""
    session_id = str(uuid.uuid4())
    async with AsyncSessionLocal() as db:
        session = Session(id=session_id, feature=feature)
        db.add(session)
        await db.commit()
    return session_id


async def append_log(
    session_id: str,
    agent_name: str,
    step: str,
    input_data: Any,
    output_data: Any,
) -> dict:
    """Append an agent log entry and return it as a dict for the decision_log."""
    entry = {
        "agent": agent_name,
        "step": step,
        "timestamp": datetime.now(UTC).isoformat(),
        "input_summary": _summarise(input_data),
        "output_summary": _summarise(output_data),
    }
    async with AsyncSessionLocal() as db:
        log = AgentLog(
            session_id=session_id,
            agent_name=agent_name,
            step=step,
            # Use _MAX_LOG_CHARS constant instead of bare 10_000
            input_json=json.dumps(input_data, default=str)[:_MAX_LOG_CHARS],
            output_json=json.dumps(output_data, default=str)[:_MAX_LOG_CHARS],
        )
        db.add(log)
        await db.commit()
    return entry


async def get_session_logs(session_id: str) -> list[dict]:
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(AgentLog).where(AgentLog.session_id == session_id).order_by(AgentLog.timestamp)
        )
        logs = result.scalars().all()
        return [
            {
                "agent": log.agent_name,
                "step": log.step,
                "timestamp": log.timestamp.isoformat(),
            }
            for log in logs
        ]


def _summarise(data: Any) -> str:
    """Truncate large objects for the decision_log view."""
    if data is None:
        return "—"
    text = json.dumps(data, default=str)
    return text[:300] + "..." if len(text) > 300 else text
