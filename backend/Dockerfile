# syntax=docker/dockerfile:1 

# Stage 1: Builder
FROM python:3.13-slim AS builder

WORKDIR /app

# Copy uv as a static binary
COPY --from=ghcr.io/astral-sh/uv:0.11.7 /uv /uvx /bin/

# System deps needed to compile some packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# uv env vars
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never

# cache deps
COPY pyproject.toml uv.lock ./

RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev --no-install-project

# Stage 2: Runtime
FROM python:3.13-slim AS runtime

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /app/.venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH"

# Non-root user + SQLite data dir
RUN adduser --disabled-password --gecos "" appuser && \
    mkdir -p /app/data && \
    chown appuser:appuser /app/data

# Copy appln source
COPY --chown=appuser:appuser . .

USER appuser

EXPOSE 8000

# Run with uvicorn - workers=1 keeps SQLite safe (no concurrent writes)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
