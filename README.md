# AI Money Mentor

Full-stack personal finance app for Indian users.

It combines a deterministic finance engine with an agent pipeline to run planners, portfolio analysis, and chat on top of typed user and session data.

## Table of Contents

- [Demo](#demo)
- [Problem](#problem)
- [What This App Does](#what-this-app-does)
- [How It Works](#how-it-works)
- [Tech Overview](#tech-overview)
- [Repository Structure](#repository-structure)
- [Quick Start](#quick-start)
- [Full Setup Guide](#full-setup-guide)
- [Impact](#impact)
- [Documentation](#documentation)
- [Deployment and Operations](#deployment-and-operations)
- [Environment and Security Notes](#environment-and-security-notes)
- [Troubleshooting](#troubleshooting)

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
- RAG embeddings: Hugging Face Inference API
- Voice: Sarvam AI
- Runtime: Docker and Docker Compose
- CI/CD and quality: Jenkins, SonarQube, Docker Hub
- Monitoring: Prometheus, Grafana, node-exporter, cAdvisor
- Infrastructure: Terraform and Ansible for the EC2 deployment path

## Repository Structure

```text
et-money-mentor/
├─ ansible/
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
├─ monitoring/
├─ terraform/
├─ docker-compose.yml
├─ docker-compose.prod.yml
├─ Jenkinsfile
└─ README.md
```

## Quick Start

```bash
# backend
cd backend
uv sync --group dev
cp .env.example .env
uv run uvicorn main:app --reload

# frontend (new terminal)
cd frontend
npm install
npm run dev
```

If you prefer standard Python tooling instead of `uv`, use the `venv + pip` flow in the backend setup section below and run backend commands without the `uv run` prefix.

## Full Setup Guide

### 1. Prerequisites

- Python 3.13+
- Node.js 22+
- npm 9+
- Git
- `uv` (recommended for faster environment and dependency management): <https://docs.astral.sh/uv/getting-started/installation/>

Alternative backend setup is also supported with native Python tooling (`python -m venv` + `pip`).

Optional but useful:

- Groq API key or Gemini API key
- Hugging Face token for RAG-backed chat context
- Sarvam API key for voice features

### 2. Clone Repository

```bash
git clone https://github.com/MahadevBalla/et-money-mentor
cd et-money-mentor
```

### 3. Backend Setup

Choose one setup path:

#### Option A (recommended): `uv`

```bash
cd backend
uv sync --group dev
```

#### Option B: native Python (`venv` + `pip`)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

Windows PowerShell activation:

```powershell
.\.venv\Scripts\Activate.ps1
```

> Note: If you are not using `uv`, run backend commands without the `uv run` prefix.

Create and configure environment:

```bash
cp .env.example .env
```

Update these values in [backend/.env](backend/.env):

- `LLM_PROVIDER`
- `GROQ_API_KEY` or `GEMINI_API_KEY`
- `HF_TOKEN` if using RAG-backed chat context
- `SARVAM_API_KEY` if using voice
- `SECRET_KEY`

Run backend:

```bash
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend URLs:

- API: `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`
- Metrics: `http://localhost:8000/metrics`

### 4. Frontend Setup

Open a new terminal:

```bash
cd frontend
npm install
```

Create environment file if needed:

```bash
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
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
uv run pytest tests -v
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
uv run uvicorn main:app --reload
```

If you are using the native Python path (Option B), run:

```bash
cd backend
source .venv/bin/activate
uvicorn main:app --reload
```

Terminal 2:

```bash
cd frontend
npm run dev
```

### 7. Docker Compose Workflow

The root Compose file builds the backend and frontend from local source:

```bash
docker compose up --build
```

Compose exposes:

- Backend: `http://localhost:8000`
- Frontend: `http://localhost:3000`

The backend SQLite database is persisted in the `backend_data` Docker volume.

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
- Deployment: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- Impact Model: [docs/IMPACT_MODEL.md](docs/IMPACT_MODEL.md)

## Deployment and Operations

The repository includes a deployment path for EC2:

- Terraform provisions the instance and security group
- Ansible installs Docker and prepares Jenkins, SonarQube, and runtime files
- Jenkins runs backend tests, SonarQube analysis, Docker image builds, and Compose deployment
- Prometheus and Grafana monitor the running application and host/container metrics

For the full deployment flow, see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

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
  Run `npm run build` in [frontend](frontend) and backend tests in [backend](backend)
  using either `uv run pytest tests -v` or `pytest tests -v` (if using `venv + pip`).
