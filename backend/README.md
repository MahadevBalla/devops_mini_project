# AI Money Mentor Backend

FastAPI backend for the AI Money Mentor product.

This service handles the finance features, chat, auth, portfolio state, and the agent pipeline that turns structured input into deterministic results plus user-facing advice.

If you want the deeper system walkthrough, read [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md).

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Folder Structure](#folder-structure)
- [Agent System](#agent-system)
- [API Design](#api-design)
- [Data Flow](#data-flow)
- [Setup](#setup)
- [Environment Variables](#environment-variables)
- [Docker](#docker)
- [Testing](#testing)
- [Error Handling](#error-handling)
- [Future Improvements](#future-improvements)

## Overview

This service does two things:

- compute finance outputs we can trust
- explain those outputs in a way that is useful to the user

The product surface includes:

- FIRE planning
- tax comparison
- money health scoring
- life-event planning
- couple planning
- mutual fund portfolio analysis
- conversational finance chat

The main design rule is simple: numbers come from code, not from the model.

LLMs are used for:

- input validation help
- explanation
- chat
- guardrails

LLMs are not used for:

- corpus calculations
- tax math
- scoring logic
- portfolio analytics

## Quick Start

Choose one setup path:

### Option A (recommended): `uv`

```bash
cd backend

uv sync --group dev
cp .env.example .env

uv run uvicorn main:app --reload
```

### Option B: native Python (`venv` + `pip`)

```bash
cd backend

python -m venv .venv
source .venv/bin/activate

pip install -r requirements.txt
pip install -r requirements-dev.txt
cp .env.example .env

uvicorn main:app --reload
```

Windows PowerShell activation:

```powershell
.\.venv\Scripts\Activate.ps1
```

> Note: If you are not using `uv`, run backend commands without the `uv run` prefix.

API: `http://localhost:8000`

Docs (if `DEBUG=true`): `http://localhost:8000/docs`

## Features

- agent pipeline for feature execution (intake → finance → mentor → guardrail)
- deterministic finance modules for FIRE, tax, health, life events, couple planning, and MF X-Ray
- RAG for chat over curated finance documents, backed by Hugging Face embeddings
- authenticated APIs for users, portfolio state, scenarios, and chat
- session and agent logging for continuity and debugging
- deterministic fallback behavior when LLM-dependent steps fail
- Prometheus metrics exposed at `/metrics`

## Tech Stack

### Core

- FastAPI
- Uvicorn
- Python 3.13+
- Pydantic and `pydantic-settings`

### Persistence

- SQLAlchemy async
- SQLite by default

### AI and Retrieval

- provider abstraction in [`core/llm_client.py`](./core/llm_client.py)
- Groq and Gemini adapters in the current codebase
- Hugging Face `InferenceClient` for chat RAG embeddings
- in-memory cosine search over curated markdown chunks
- curated markdown docs in [`rag/documents/`](./rag/documents)

### Observability

- `prometheus-fastapi-instrumentator`
- `/metrics` endpoint for Prometheus scraping

### Other notable dependencies

- `httpx`
- `numpy`, `numpy-financial`, `scipy`
- `passlib`, `pyjwt`
- `python-multipart`
- `huggingface-hub`

## Architecture

The backend is split by responsibility:

- `routers/` handles HTTP and request orchestration
- `agents/` handles validation, explanation, and safety checks
- `finance/` handles deterministic computation
- `models/` holds typed request and response models
- `db/` handles persistence
- `rag/` handles chat retrieval
- `core/` holds shared config, auth, exceptions, and LLM plumbing

### Main pipeline

```text
Client
  -> FastAPI Router
  -> IntakeAgent
  -> Finance Engine
  -> MentorAgent
  -> GuardrailAgent
  -> Response
```

For most feature endpoints, that is the actual execution order.

### Why it is structured this way

- IntakeAgent cleans up input before the finance layer sees it.
- Finance code stays deterministic and testable.
- MentorAgent explains results instead of generating them.
- GuardrailAgent gets the final say on user-visible advice.

This keeps the failure modes easier to reason about than a single large LLM-driven flow.

## Folder Structure

```text
backend/
├── agents/
├── core/
├── db/
├── finance/
├── models/
├── rag/
├── routers/
├── tests/
└── main.py
```

### What goes where

| Path | Responsibility |
| --- | --- |
| `agents/` | Intake, mentor, guardrail, and feature-specific advisory agents |
| `finance/` | Deterministic finance logic and portfolio analysis |
| `rag/` | Retrieval logic plus the local knowledge documents used by chat |
| `routers/` | FastAPI route handlers and per-request orchestration |
| `models/` | Pydantic request, response, and domain models |
| `db/` | Sessions, agent logs, users, portfolio state, scenarios, and token persistence |
| `core/` | Config, auth dependencies, security, exceptions, LLM client, voice helpers |
| `tests/` | Pytest suite for finance and backend behavior |
| `main.py` | App setup, startup lifecycle, middleware, exception handlers, and route mounting |

## Agent System

### IntakeAgent

This is the first cleanup layer.

It validates raw input, flags obvious issues, normalizes the payload into a typed profile, and applies a few deterministic rules where we want consistent behavior.

### Finance Engine

This is the source of truth for numbers.

It computes FIRE plans, tax comparisons, health scores, life-event outputs, couple planning results, and MF X-Ray analytics. It does not depend on prompt wording or model behavior.

### MentorAgent

This agent turns structured results into readable advice.

It gets the finance output as context and is expected to explain it, not to recreate it.

### GuardrailAgent

This is the final safety pass.

It checks for misleading wording, specific recommendations we do not want to surface, missing disclaimers, and contradictions with the reference numbers from the finance layer.

## API Design

Routes are feature-specific on purpose. There is no generic `/process` endpoint.

Each workflow has its own route so validation, persistence, and response shape stay explicit and easier to debug.

### Main routes

| Route | Purpose |
| --- | --- |
| `GET /health` | health check and version |
| `POST /api/auth/*` | signup, verify email, login, refresh, logout, current user |
| `POST /api/fire-planner` | FIRE planning |
| `POST /api/health-score` | financial health scoring |
| `POST /api/tax-wizard` | tax comparison and recommendation |
| `POST /api/life-event` | life-event planning |
| `POST /api/couple-planner` | joint planning |
| `POST /api/mf-xray` | mutual fund portfolio analysis from uploaded statement |
| `POST /api/chat` | standard chat |
| `GET /api/chat/stream` | streaming chat |
| `POST /api/session` | create chat session |
| `GET/PATCH /api/portfolio/*` | portfolio retrieval and profile update |
| `GET/DELETE /api/portfolio/scenarios/*` | scenario list, detail, and deletion |
| `POST /api/voice/*` | voice endpoints |

### Request flow

For a normal finance feature request:

```text
Request
  -> auth + outer validation
  -> create session
  -> resolve profile input
  -> IntakeAgent
  -> finance module
  -> MentorAgent
  -> GuardrailAgent
  -> persist state and logs
  -> return typed response
```

Feature responses typically include:

- `session_id`
- `profile` when relevant
- `result`
- `advice`
- `decision_log`

### Example Response (FIRE Planner)

```json
{
  "session_id": "abc123",
  "profile": { "age": 28, "income": 1200000 },
  "result": {
    "fire_number": 30000000,
    "monthly_investment": 45000
  },
  "advice": "Increase SIP by 10% annually to reach FIRE by age 50.",
  "decision_log": [
    "validated_input",
    "computed_fire_projection",
    "generated_advice",
    "applied_guardrails"
  ]
}
```

## Data Flow

### Feature flow

```text
Client
  -> API
  -> IntakeAgent
  -> Finance Engine
  -> MentorAgent
  -> GuardrailAgent
  -> Persistence
  -> Response
```

### Chat flow

```text
User
  -> Chat API
  -> Session lookup
  -> RAG retrieval
  -> LLM
  -> Chat log persistence
  -> Response
```

Chat is slightly different from the feature endpoints:

- it loads recent chat history
- it reads saved session state from earlier feature runs
- it optionally adds retrieved context from the curated finance knowledge base

That is how follow-up questions can refer back to a previous FIRE or tax result without recomputing everything.

## Setup

### Prerequisites

- Python 3.13+
- `uv` (recommended for faster environment and dependency management): <https://docs.astral.sh/uv/getting-started/installation/>
- or native Python tooling (`python -m venv` + `pip`)
- credentials for the LLM provider you plan to use
- `HF_TOKEN` if you want document retrieval in chat

### Local setup

Choose one setup path:

- Option A (recommended): `uv`

  ```bash
  cd backend

  uv sync --group dev

  cp .env.example .env
  ```

- Option B: native Python (`venv` + `pip`)

  ```bash
  cd backend

  python -m venv .venv
  source .venv/bin/activate

  pip install -r requirements.txt
  pip install -r requirements-dev.txt

  cp .env.example .env
  ```

> Note: If you are not using `uv`, run backend commands without the `uv run` prefix.

### Run the server

```bash
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

If `DEBUG=true`, docs are available at:

- `http://localhost:8000/docs`
- `http://localhost:8000/redoc`

### Makefile helpers

```bash
make install
make dev
make test
make lint
make fmt
```

## Environment Variables

Example `.env`:

```bash
DATABASE_URL=sqlite+aiosqlite:///./money_mentor.db

APP_NAME=AI Money Mentor
APP_VERSION=1.0.0
DEBUG=true

ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

LLM_PROVIDER=groq
GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_MAX_TOKENS=2048
GROQ_TEMPERATURE=0.3

GEMINI_API_KEY=
GEMINI_MODEL=gemini-3-flash-preview

HF_TOKEN=
HF_RAG_MODEL=sentence-transformers/all-MiniLM-L6-v2

SECRET_KEY=CHANGE_THIS_IN_PRODUCTION_USE_openssl_rand_hex_32
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=
SMTP_FROM_NAME=AI Money Mentor

SARVAM_API_KEY=
SARVAM_DEFAULT_VOICE=meera
SARVAM_DEFAULT_LANGUAGE=en-IN
SARVAM_TTS_PACE=1.0
SARVAM_TTS_SAMPLE_RATE=22050

DEFAULT_INFLATION_RATE=0.06
DEFAULT_EQUITY_RETURN=0.12
DEFAULT_DEBT_RETURN=0.07
DEFAULT_SAFE_WITHDRAWAL_RATE=0.04
DEFAULT_STEPUP_RATE=0.10
EMERGENCY_FUND_MONTHS=6
```

Notes:

- The app reads `GROQ_API_KEY` or `GEMINI_API_KEY` based on `LLM_PROVIDER`.
- `HF_TOKEN` enables RAG embeddings through Hugging Face. If it is missing or the API is unavailable, chat still runs without retrieved document context.
- `DATABASE_URL`, `DEBUG`, and `ALLOWED_ORIGINS` are actively used at runtime.
- `DEBUG=true` enables Swagger and ReDoc routes.

## Docker

The backend ships with a `Dockerfile`, and the repo has Compose config at [`../docker-compose.yml`](../docker-compose.yml).

The Dockerfile uses a multi-stage `uv` build on `python:3.13-slim`, installs locked production dependencies from `uv.lock`, copies the virtual environment into the runtime image, and runs Uvicorn as a non-root `appuser`.

### Build the backend image

```bash
DOCKER_BUILDKIT=1 docker build -t ai-money-mentor-backend .
```

### Run with Docker Compose

```bash
docker compose up --build
```

The current Compose setup:

- builds the backend from `backend/Dockerfile`
- persists SQLite data in a named volume
- exposes port `8000`
- checks `/health`
- exposes `/metrics` from the FastAPI app for Prometheus
- starts the frontend after the backend is healthy

## Testing

Tests use `pytest`.

Run all tests:

```bash
uv run pytest tests -v
```

Or use:

```bash
make test
```

The current suite covers things like:

- finance calculations
- FIRE step-up logic
- life-event analysis
- couple planning
- MF X-Ray analysis

CI runs the deterministic backend test subset with `uv`, writes `coverage.xml`, and sends that coverage to SonarQube for backend analysis.

## Error Handling

Error handling is layered.

### Validation

- Pydantic validates request shape at the API boundary.
- IntakeAgent validates and normalizes finance input inside the pipeline.

### Fallbacks

- if the LLM is unavailable, feature flows can fall back to deterministic validation or fallback advice
- chat returns a safe fallback response rather than a raw failure
- finance modules remain the numeric source of truth either way

### Guardrails

- advice goes through a final guardrail pass before response
- disclaimers are enforced
- risky language is softened or removed
- deterministic regex checks backstop the LLM guardrail layer

## Future Improvements

- better orchestration for multi-stage or long-running flows
- streaming beyond chat
- stronger observability around agent steps and LLM failures
- move off SQLite when write volume and concurrency demand it
- add a more formal migration story
