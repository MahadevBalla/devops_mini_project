"""
db/session_store.py
SQLite session store, agent audit log, and user authentication via SQLAlchemy async.
"""

from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime
from typing import Any, Optional

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text, select
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


class User(Base):
    """
    User authentication table.
    Contains core identity + auth metadata.
    Financial profile data (age, income, etc.) is NOT stored here — it's collected
    per-feature-request and stored in sessions/agent_logs.
    """

    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    full_name = Column(String(50), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)  # bcrypt hash
    phone = Column(String(20), nullable=True)  # +91-XXXXXXXXXX format

    # Auth metadata
    is_verified = Column(Boolean, default=False)  # Email verification status
    is_active = Column(Boolean, default=True)  # Soft delete / ban capability
    verification_token = Column(String(6), nullable=True)  # 6-digit OTP for email verification
    verification_token_expires_at = Column(DateTime(timezone=True), nullable=True)

    # Timestamps
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
    One user can have multiple refresh tokens (multi-device support).
    Tokens are revoked on logout or expiry.
    """

    __tablename__ = "refresh_tokens"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    token = Column(String(512), unique=True, nullable=False, index=True)  # JWT refresh token
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_revoked = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    revoked_at = Column(DateTime(timezone=True), nullable=True)


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


# User lifecycle and auth management
async def create_user(
    full_name: str, email: str, hashed_password: str, phone: Optional[str] = None
) -> User:
    """Create a new user and return the User ORM object."""
    user = User(
        id=str(uuid.uuid4()),
        full_name=full_name,
        email=email.lower(),  # Normalize email to lowercase
        hashed_password=hashed_password,
        phone=phone,
        is_verified=False,  # Require email verification
        is_active=True,
    )
    async with AsyncSessionLocal() as db:
        db.add(user)
        await db.commit()
        await db.refresh(user)
    return user


async def get_user_by_email(email: str) -> Optional[User]:
    """Find user by email (case-insensitive)."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == email.lower()))
        return result.scalars().first()


async def get_user_by_id(user_id: str) -> Optional[User]:
    """Find user by UUID."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalars().first()


async def update_user_last_login(user_id: str) -> None:
    """Update last_login_at timestamp."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalars().first()
        if user:
            user.last_login_at = datetime.now(UTC)
            await db.commit()


async def store_refresh_token(user_id: str, token: str, expires_at: datetime) -> str:
    """Store a refresh token and return its ID."""
    token_id = str(uuid.uuid4())
    refresh_token = RefreshToken(
        id=token_id,
        user_id=user_id,
        token=token,
        expires_at=expires_at,
        is_revoked=False,
    )
    async with AsyncSessionLocal() as db:
        db.add(refresh_token)
        await db.commit()
    return token_id


async def get_refresh_token(token: str) -> Optional[RefreshToken]:
    """Find refresh token by token string."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(RefreshToken).where(RefreshToken.token == token))
        return result.scalars().first()


async def revoke_refresh_token(token: str) -> bool:
    """Revoke a refresh token (logout). Returns True if found and revoked."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(RefreshToken).where(RefreshToken.token == token))
        refresh_token = result.scalars().first()
        if refresh_token and not refresh_token.is_revoked:
            refresh_token.is_revoked = True
            refresh_token.revoked_at = datetime.now(UTC)
            await db.commit()
            return True
        return False


async def revoke_all_user_tokens(user_id: str) -> int:
    """Revoke all refresh tokens for a user (logout from all devices). Returns count revoked."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(RefreshToken).where(
                RefreshToken.user_id == user_id, RefreshToken.is_revoked.is_(False)
            )
        )
        tokens = result.scalars().all()
        count = len(tokens)
        for token in tokens:
            token.is_revoked = True
            token.revoked_at = datetime.now(UTC)
        await db.commit()
        return count


async def set_verification_token(user_id: str, token: str, expires_at: datetime) -> None:
    """Set email verification token (6-digit OTP)."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalars().first()
        if user:
            user.verification_token = token
            user.verification_token_expires_at = expires_at
            await db.commit()


async def verify_user_email(user_id: str) -> bool:
    """Mark user email as verified. Returns True if successful."""
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


async def update_session_state(session_id: str, feature: str, result_summary: dict) -> None:
    """Write computed feature result into session state_json for chat context injection."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Session).where(Session.id == session_id))
        session = result.scalars().first()
        if session:
            existing = {}
            try:
                existing = json.loads(session.state_json or "{}")
            except Exception:
                pass
            existing[feature] = result_summary
            session.state_json = json.dumps(existing)
            await db.commit()
