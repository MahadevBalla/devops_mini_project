# AI Money Mentor

Full-stack personal finance app for Indian users.

It combines a deterministic finance engine with an agent pipeline to run planners, portfolio analysis, and chat on top of typed user and session data.

## Demo

[*Product walkthrough (video)*](https://youtu.be/5ho6rQHla9g)

## Problem

Good financial planning is usually either expensive, fragmented, or both.

Most users do not have a structured way to compare tax choices, plan for retirement, review portfolios, or think through major money decisions.

## What This App Does

- Builds FIRE plans with corpus gap and SIP projections
- Computes a money health score
- Compares old vs new tax regime
- Runs life-event planning for common financial scenarios
- Supports couple-level financial planning
- Analyses mutual fund portfolios with MF X-Ray
- Provides chat and voice flows on top of computed results

## How It Works

```text
User input -> API -> Intake -> Finance Engine -> Mentor -> Guardrail -> Response
```

- The finance layer computes all numbers. The pipeline handles validation, explanation, and final safety checks.
- For a deeper system walkthrough, see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Tech Overview

- Backend: FastAPI, Pydantic, SQLAlchemy, deterministic finance modules, agent pipeline
- Frontend: Next.js App Router, TypeScript, Tailwind CSS
- Database: SQLite by default for local development
- LLM providers: Groq and Gemini
- Voice: Sarvam AI

## Repository Structure

```text
et-money-mentor/
├─ backend/
│  ├─ agents/
│  ├─ core/
│  ├─ db/
│  ├─ finance/
│  ├─ models/
│  ├─ rag/
│  ├─ routers/
│  ├─ tests/
│  └─ main.py
├─ frontend/
│  ├─ src/
│  ├─ public/
│  └─ package.json
└─ README.md
```

## Quick Start

```bash
# backend
cd backend
uvicorn main:app --reload

# frontend (new terminal)
cd frontend
npm run dev
```

## Full Setup Guide

### 1. Prerequisites

- Python 3.11+ (3.13 used in local project docs)
- Node.js 18+
- npm 9+
- Git

Optional but useful:

- Groq API key or Gemini API key
- Sarvam API key for voice features

### 2. Clone Repository

```bash
git clone https://github.com/MahadevBalla/et-money-mentor
cd et-money-mentor
```

### 3. Backend Setup

```bash
cd backend
python -m venv .venv
```

Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

macOS/Linux:

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

Create and configure environment:

```bash
cp .env.example .env
```

Update these values in [backend/.env](backend/.env):

- `LLM_PROVIDER`
- `GROQ_API_KEY` or `GEMINI_API_KEY`
- `SARVAM_API_KEY` if using voice
- `SECRET_KEY`

Run backend:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend URLs:

- API: `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`

### 4. Frontend Setup

Open a new terminal:

```bash
cd frontend
npm install
```

Create environment file if needed:

```bash
cp .env.example .env.local
```

Set the frontend API base URL if required:

- `NEXT_PUBLIC_API_URL=http://localhost:8000`

Run frontend:

```bash
npm run dev
```

Frontend URL:

- App: `http://localhost:3000`

### 5. Run Tests

Backend tests:

```bash
cd backend
pytest
```

Frontend checks:

```bash
cd frontend
npm run build
```

### 6. Typical Local Workflow

Terminal 1:

```bash
cd backend
uvicorn main:app --reload
```

Terminal 2:

```bash
cd frontend
npm run dev
```

## Impact

- Reduces the need for expensive advisor-led planning for common use cases
- Cuts planning and comparison work from hours or days to minutes
- Makes tax, FIRE, and portfolio decisions easier to inspect
- Gives users a clearer baseline before involving a human advisor

## Documentation

- Backend: [backend/README.md](backend/README.md)
- Frontend: [frontend/README.md](frontend/README.md)
- Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- API Contract: [docs/API_CONTRACT.md](docs/API_CONTRACT.md)
- Impact Model: [docs/IMPACT_MODEL.md](docs/IMPACT_MODEL.md)

## Environment and Security Notes

- Do not commit real API keys or production secrets
- Rotate leaked keys immediately
- Use a strong random `SECRET_KEY` in production
- Keep `DEBUG=false` in production

## Troubleshooting

- Frontend cannot reach backend:
  Verify the backend is running on port `8000` and `NEXT_PUBLIC_API_URL` points to it.
- CORS errors:
  Add the frontend URL to `ALLOWED_ORIGINS` in [backend/.env](backend/.env).
- Build or type errors:
  Run `npm run build` in [frontend](frontend) and `pytest` in [backend](backend).
