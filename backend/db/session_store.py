"""
db/session_store.py
SQLite session store, agent audit log, and user authentication via SQLAlchemy async.
"""

from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime
from typing import Any, Optional

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, String, Text, event, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from core.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


@event.listens_for(engine.sync_engine, "connect")
def _set_sqlite_pragma(dbapi_conn, _connection_record) -> None:
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


_MAX_LOG_CHARS = 10_000

# Valid portfolio result fields — intentionally excludes "profile" to prevent
# accidental profile mutation from feature endpoints
_PORTFOLIO_RESULT_FIELDS = {"fire", "health", "tax", "mf", "couple", "life_event"}


class Base(DeclarativeBase):
    pass


class Session(Base):
    """
    Execution thread for a single feature run or chat continuation.
    One session per feature invocation — never reused across feature runs.
    Chat continues a session created by a prior feature run.

    Ownership: every session belongs to exactly one user.
    agent_logs traces back to user via session.user_id.
    """

    __tablename__ = "sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    feature = Column(String(64), nullable=False, index=True)
    state_json = Column(Text, default="{}")

    __table_args__ = (
        Index("idx_sessions_user_feature", "user_id", "feature"),
        Index("idx_sessions_user_created", "user_id", "created_at"),
    )


class AgentLog(Base):
    __tablename__ = "agent_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(
        String(36),
        ForeignKey("sessions.id", ondelete="CASCADE"),  # logs die with their session
        nullable=False,
    )
    agent_name = Column(String(64), nullable=False)
    step = Column(String(128), nullable=False)
    input_json = Column(Text, default="{}")
    output_json = Column(Text, default="{}")
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    __table_args__ = (Index("idx_agent_logs_session_ts", "session_id", "timestamp"),)


class User(Base):
    """
    Core identity and auth metadata.
    Financial profile data lives in Portfolio, not here.
    """

    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    full_name = Column(String(50), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)

    is_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    verification_token = Column(String(6), nullable=True)
    verification_token_expires_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )
    last_login_at = Column(DateTime(timezone=True), nullable=True)


class RefreshToken(Base):
    """
    Refresh token storage for JWT authentication.
    One user can have multiple active tokens for multi-device support.
    Tokens are revoked on logout or expiry.
    """

    __tablename__ = "refresh_tokens"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    token = Column(String(512), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_revoked = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    revoked_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (Index("idx_refresh_user_active", "user_id", "is_revoked"),)


class Portfolio(Base):
    """
    1:1 with User — single source of truth for the user's real financial state.

    Write rules (enforced at application layer):
    - profile_json  : ONLY via update_portfolio_profile(), called from PATCH /api/portfolio/profile
    - result fields : ONLY via update_portfolio_result(), called from feature endpoints (use_profile=True)
    - Never written by what-if / scenario runs
    """

    __tablename__ = "portfolios"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    profile_json = Column(Text, default="{}")
    fire_json = Column(Text, default="{}")
    health_json = Column(Text, default="{}")
    tax_json = Column(Text, default="{}")
    mf_json = Column(Text, default="{}")
    couple_json = Column(Text, default="{}")
    life_event_json = Column(Text, default="{}")

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    # No onupdate= — helpers always set updated_at explicitly (intentional)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))


class Scenario(Base):
    """
    1:N with User — stores what-if runs.
    Never modifies Portfolio. input_json is always fully self-contained.
    Created only when the user explicitly sets save_scenario=True.
    """

    __tablename__ = "scenarios"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name = Column(String(128), nullable=True)
    feature = Column(String(32), nullable=False, index=True)

    session_type = Column(
        String(16),
        nullable=False,
        default="scenario",      # safe default for existing rows
        index=True,
    )

    input_json = Column(Text, default="{}")
    result_json = Column(Text, default="{}")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    __table_args__ = (
        Index("idx_scenarios_user_created", "user_id", "created_at"),
        Index("idx_scenarios_user_feature", "user_id", "feature"),
    )


# DB lifecycle
async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


# Session helpers
async def create_session(user_id: str, feature: str) -> str:
    """
    Create a new session owned by user_id. Returns the session UUID.
    Always called internally by feature routers — never from client input.
    """
    session_id = str(uuid.uuid4())
    async with AsyncSessionLocal() as db:
        session = Session(id=session_id, user_id=user_id, feature=feature)
        db.add(session)
        await db.commit()
    return session_id


async def get_session_for_user(session_id: str, user_id: str) -> Optional[Session]:
    """
    Ownership-safe session fetch.
    Returns None if session does not exist OR belongs to a different user.
    Use this everywhere a session is read — never query by session_id alone.
    """
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Session).where(
                Session.id == session_id,
                Session.user_id == user_id,
            )
        )
        return result.scalars().first()


async def append_log(
    session_id: str,
    agent_name: str,
    step: str,
    input_data: Any,
    output_data: Any,
) -> dict:
    """Append an agent log entry. Returns a dict for inclusion in the response decision_log."""
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
            input_json=json.dumps(input_data, default=str)[:_MAX_LOG_CHARS],
            output_json=json.dumps(output_data, default=str)[:_MAX_LOG_CHARS],
        )
        db.add(log)
        await db.commit()
    return entry


async def get_session_logs(session_id: str, user_id: str) -> list[dict]:
    """
    Ownership-enforced log fetch.
    Verifies session belongs to user_id before returning any logs.
    Returns empty list if session not found or not owned by the requesting user.
    """
    async with AsyncSessionLocal() as db:
        sess_result = await db.execute(
            select(Session).where(
                Session.id == session_id,
                Session.user_id == user_id,
            )
        )
        if not sess_result.scalars().first():
            return []

        log_result = await db.execute(
            select(AgentLog).where(AgentLog.session_id == session_id).order_by(AgentLog.timestamp)
        )
        logs = log_result.scalars().all()
        return [
            {
                "agent": log.agent_name,
                "step": log.step,
                "timestamp": log.timestamp.isoformat(),
            }
            for log in logs
        ]


async def update_session_state(
    session_id: str, user_id: str, feature: str, result_summary: dict
) -> None:
    """
    Write a computed feature result into session.state_json for chat context injection.
    Ownership enforced — silently skips if session does not belong to user_id.
    """
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Session).where(
                Session.id == session_id,
                Session.user_id == user_id,
            )
        )
        session = result.scalars().first()
        if session:
            existing = _safe_json(session.state_json)
            existing[feature] = result_summary
            session.state_json = json.dumps(existing)
            await db.commit()


# Internal helpers
def _summarise(data: Any) -> str:
    """Truncate large objects for the decision_log view."""
    if data is None:
        return "—"
    text = json.dumps(data, default=str)
    return text[:300] + "..." if len(text) > 300 else text


def _safe_json(text: str | None) -> dict:
    try:
        return json.loads(text or "{}")
    except Exception:
        return {}


# User lifecycle and auth management
async def create_user(
    full_name: str, email: str, hashed_password: str, phone: Optional[str] = None
) -> User:
    """Create a new user and return the User ORM object."""
    user = User(
        id=str(uuid.uuid4()),
        full_name=full_name,
        email=email.lower(),
        hashed_password=hashed_password,
        phone=phone,
        is_verified=False,
        is_active=True,
    )
    async with AsyncSessionLocal() as db:
        db.add(user)
        await db.commit()
        await db.refresh(user)
    return user


async def get_user_by_email(email: str) -> Optional[User]:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == email.lower()))
        return result.scalars().first()


async def get_user_by_id(user_id: str) -> Optional[User]:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalars().first()


async def update_user_last_login(user_id: str) -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalars().first()
        if user:
            user.last_login_at = datetime.now(UTC)
            await db.commit()


async def store_refresh_token(user_id: str, token: str, expires_at: datetime) -> None:
    async with AsyncSessionLocal() as db:
        db.add(
            RefreshToken(
                id=str(uuid.uuid4()),
                user_id=user_id,
                token=token,
                expires_at=expires_at,
                is_revoked=False,
            )
        )
        await db.commit()


async def get_refresh_token(token: str) -> Optional[RefreshToken]:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(RefreshToken).where(RefreshToken.token == token))
        return result.scalars().first()


async def revoke_refresh_token(token: str) -> bool:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(RefreshToken).where(RefreshToken.token == token))
        rt = result.scalars().first()
        if rt and not rt.is_revoked:
            rt.is_revoked = True
            rt.revoked_at = datetime.now(UTC)
            await db.commit()
            return True
        return False


async def revoke_all_user_tokens(user_id: str) -> int:
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(RefreshToken).where(
                RefreshToken.user_id == user_id,
                RefreshToken.is_revoked.is_(False),
            )
        )
        tokens = result.scalars().all()
        for t in tokens:
            t.is_revoked = True
            t.revoked_at = datetime.now(UTC)
        await db.commit()
        return len(tokens)


async def set_verification_token(user_id: str, token: str, expires_at: datetime) -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalars().first()
        if user:
            user.verification_token = token
            user.verification_token_expires_at = expires_at
            await db.commit()


async def verify_user_email(user_id: str) -> bool:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalars().first()
        if user:
            user.is_verified = True
            user.verification_token = None
            user.verification_token_expires_at = None
            await db.commit()
            return True
        return False


# Portfolio helpers
async def _get_or_create_portfolio(user_id: str, db: Any) -> Portfolio:
    """Internal: fetch or create portfolio within an existing open session."""
    result = await db.execute(select(Portfolio).where(Portfolio.user_id == user_id))
    portfolio = result.scalars().first()
    if not portfolio:
        portfolio = Portfolio(user_id=user_id)
        db.add(portfolio)
        await db.flush()
    return portfolio


async def load_portfolio(user_id: str) -> dict:
    """Return full portfolio as a plain dict. Creates an empty record if none exists."""
    async with AsyncSessionLocal() as db:
        portfolio = await _get_or_create_portfolio(user_id, db)
        await db.commit()
        return {
            "profile": _safe_json(portfolio.profile_json),
            "fire": _safe_json(portfolio.fire_json),
            "health": _safe_json(portfolio.health_json),
            "tax": _safe_json(portfolio.tax_json),
            "mf": _safe_json(portfolio.mf_json),
            "couple": _safe_json(portfolio.couple_json),
            "life_event": _safe_json(portfolio.life_event_json),
        }


async def update_portfolio_profile(user_id: str, data: dict) -> None:
    """
    THE ONLY function that writes portfolio.profile_json.
    Called only from PATCH /api/portfolio/profile.
    """
    async with AsyncSessionLocal() as db:
        portfolio = await _get_or_create_portfolio(user_id, db)
        portfolio.profile_json = json.dumps(data)
        portfolio.updated_at = datetime.now(UTC)
        await db.commit()


async def update_portfolio_result(user_id: str, feature: str, data: dict) -> None:
    """
    Write a computed feature result to portfolio.<feature>_json.
    Called only from feature endpoints when use_profile=True.
    Raises ValueError if feature name is not in _PORTFOLIO_RESULT_FIELDS.
    """
    if feature not in _PORTFOLIO_RESULT_FIELDS:
        raise ValueError(
            f"Invalid portfolio result field: '{feature}'. "
            f"Must be one of: {sorted(_PORTFOLIO_RESULT_FIELDS)}. "
            "Use update_portfolio_profile() to update the profile."
        )
    async with AsyncSessionLocal() as db:
        portfolio = await _get_or_create_portfolio(user_id, db)
        setattr(portfolio, f"{feature}_json", json.dumps(data))
        portfolio.updated_at = datetime.now(UTC)
        await db.commit()


# Scenario helpers
async def save_scenario(
    user_id: str,
    feature: str,
    input_data: dict,
    result_data: dict,
    name: Optional[str] = None,
    session_type: str = "scenario",
) -> str:
    """Persist a what-if scenario. Returns the new scenario id."""
    scenario = Scenario(
        user_id=user_id,
        feature=feature,
        name=name,
        session_type=session_type,
        input_json=json.dumps(input_data),
        result_json=json.dumps(result_data),
    )
    async with AsyncSessionLocal() as db:
        db.add(scenario)
        await db.commit()
        await db.refresh(scenario)
    return scenario.id


async def list_scenarios(user_id: str, feature: Optional[str] = None, session_type: Optional[str] = None) -> list[dict]:
    """List saved scenarios for a user, newest first. Summary view only (no input_data)."""
    async with AsyncSessionLocal() as db:
        q = select(Scenario).where(Scenario.user_id == user_id)
        if feature:
            q = q.where(Scenario.feature == feature)
        if session_type:
            q = q.where(Scenario.session_type == session_type)
        q = q.order_by(Scenario.created_at.desc())
        result = await db.execute(q)
        scenarios = result.scalars().all()
    return [
        {
            "id": s.id,
            "name": s.name or f"{s.feature} run",
            "feature": s.feature,
            "session_type": s.session_type,
            "created_at": s.created_at.isoformat(),
            "result": _safe_json(s.result_json),
        }
        for s in scenarios
    ]


async def get_scenario_by_id(scenario_id: str, user_id: str) -> Optional[dict]:
    """Fetch a single scenario with full input_data. Ownership enforced."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Scenario).where(
                Scenario.id == scenario_id,
                Scenario.user_id == user_id,
            )
        )
        s = result.scalars().first()
    if not s:
        return None
    return {
        "id": s.id,
        "name": s.name or f"{s.feature} run",
        "feature": s.feature,
        "session_type": s.session_type,
        "created_at": s.created_at.isoformat(),
        "input_data": _safe_json(s.input_json),
        "result": _safe_json(s.result_json),
    }


async def delete_scenario(scenario_id: str, user_id: str) -> bool:
    """Hard delete a scenario. Ownership verified. Returns True if deleted."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Scenario).where(
                Scenario.id == scenario_id,
                Scenario.user_id == user_id,
            )
        )
        scenario = result.scalars().first()
        if not scenario:
            return False
        await db.delete(scenario)
        await db.commit()
    return True
