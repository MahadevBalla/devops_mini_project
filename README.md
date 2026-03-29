# AI Money Mentor

AI Money Mentor is a full-stack personal finance assistant for Indian users.
It combines deterministic finance calculations with an LLM-powered guidance layer to help users plan, analyze, and act across major money decisions.

## What This App Does

- Generates personalized FIRE plans with corpus gap and SIP projections.
- Calculates a multi-dimension money health score.
- Compares old vs new tax regime and surfaces tax optimization opportunities.
- Simulates life-event outcomes like bonus, inheritance, marriage, new baby, job loss, and home purchase.
- Provides couple-level financial optimization.
- Runs MF X-Ray analysis for portfolio structure insights.
- Offers chat and voice-assisted financial Q&A on top of computed results.

## Tech Overview

- Backend: FastAPI, Pydantic, SQLAlchemy, deterministic finance engine, multi-agent orchestration.
- Frontend: Next.js App Router, TypeScript, Tailwind CSS.
- Database: SQLite (default local development).
- AI Providers: Groq and Gemini (switchable via environment config).
- Voice: Sarvam AI integration (STT/TTS).

## Monorepo Navigation

- Backend README: [backend/README.md](backend/README.md)
- Frontend README: [frontend/README.md](frontend/README.md)

## Project Structure

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

## Full Setup Guide

## 1) Prerequisites

- Python 3.11+ (3.13 recommended by project docs)
- Node.js 18+
- npm 9+
- Git

Optional but recommended:

- A Groq API key or Gemini API key
- A Sarvam API key for voice features

## 2) Clone Repository

```bash
git clone <your-repo-url>
cd et-money-mentor
```

## 3) Backend Setup

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

Update these required values in [backend/.env](backend/.env):

- LLM provider config: `LLM_PROVIDER`, `GROQ_API_KEY` or `GEMINI_API_KEY`
- Voice config (if using voice): `SARVAM_API_KEY`
- Security config: `SECRET_KEY`

Run backend:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend URLs:

- API: http://localhost:8000
- Swagger: http://localhost:8000/docs

## 4) Frontend Setup

Open a new terminal:

```bash
cd frontend
npm install
```

Create environment file if needed (based on project config):

```bash
cp .env.example .env.local
```

Set API base URL in frontend env (if not already set):

- `NEXT_PUBLIC_API_URL=http://localhost:8000`

Run frontend:

```bash
npm run dev
```

Frontend URL:

- App: http://localhost:3000

## 5) Run Tests

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

## 6) Typical Local Workflow

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

## Environment and Security Notes

- Never commit real API keys or production secrets.
- Rotate leaked keys immediately.
- Use a strong random `SECRET_KEY` for JWT signing in production.
- Keep `DEBUG=false` in production.

## Troubleshooting

- Frontend cannot connect to backend:
	- Verify backend is running on port 8000.
	- Verify `NEXT_PUBLIC_API_URL` points to backend URL.
- CORS errors:
	- Add frontend URL to `ALLOWED_ORIGINS` in [backend/.env](backend/.env).
- Build/type errors:
	- Run `npm run build` inside [frontend](frontend).
	- Run `pytest` in [backend](backend).

## Deep Dives

- Backend architecture, API flow, and agent pipeline: [backend/README.md](backend/README.md)
- Frontend routing, UI, and component conventions: [frontend/README.md](frontend/README.md)
