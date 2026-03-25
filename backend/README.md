# AI Money Mentor — Backend

> India's AI-powered personal finance mentor.
> Deterministic finance engine + multi-agent LLM pipeline + voice layer, built on FastAPI.

## Table of Contents

- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Agent Pipeline](#agent-pipeline)
- [Finance Engine](#finance-engine)
- [Voice Layer](#voice-layer)
- [LLM Providers](#llm-providers)
- [Testing](#testing)
- [Development](#development)
- [Design Decisions](#design-decisions)

## Architecture

```md
Request
  └─► IntakeAgent        (LLM — validate + fill Indian defaults)
        └─► Finance Engine  (deterministic — pure Python math)
              └─► MentorAgent   (LLM — India-specific advice narrative)
                    └─► GuardrailAgent  (LLM — SEBI compliance scrub)
                          └─► Response  +  SQLite audit log
```

Every request runs the same 4-step pipeline. The finance engine is **fully deterministic** — no LLM
touches the numbers. The LLM only generates the natural-language advice layer on top of computed
results. Every agent step is written to `agent_logs` for full auditability.

## Project Structure

```txt
backend/
├── agents/
│   ├── __init__.py
│   ├── intake_agent.py        # Profile validation + Indian defaults (LLM)
│   ├── mentor_agent.py        # Advice for health/FIRE/tax features (LLM)
│   ├── guardrail_agent.py     # SEBI compliance check (LLM)
│   ├── life_event_agent.py    # Life event narrative (LLM)
│   ├── couple_agent.py        # Couple joint optimisation narrative (LLM)
│   └── mf_xray_agent.py       # MF portfolio advice narrative (LLM)
│
├── core/
│   ├── config.py              # All env vars via pydantic-settings — import `settings` everywhere
│   ├── exceptions.py          # Domain exception hierarchy
│   ├── llm_client.py          # Provider-agnostic LLM abstraction (Groq / Gemini)
│   └── voice.py               # Sarvam AI STT (Saaras) + TTS (Bulbul) client
│
├── db/
│   └── session_store.py       # SQLAlchemy async — sessions + agent_logs tables
│
├── finance/
│   ├── tax_constants.py       # India Finance Act FY2025-26 statutory constants
│   ├── tax.py                 # Old vs new regime comparison, 87A rebate, surcharge
│   ├── fire.py                # FIRE corpus, flat SIP, step-up SIP, projected FI age
│   ├── health.py              # 6-dimension money health score (0–100)
│   ├── life_event.py          # Bonus / inheritance / marriage / baby / job loss / home
│   ├── couple.py              # Joint HRA, NPS match, SIP split, combined tax saving
│   └── mf_xray.py             # CAMS/KFintech parser, XIRR, overlap, expense drag
│
├── models/
│   └── schemas.py             # Pydantic v2 — single source of truth for all I/O shapes
│
├── routers/
│   ├── health_score.py        # POST /api/health-score
│   ├── fire_planner.py        # POST /api/fire-planner
│   ├── tax_wizard.py          # POST /api/tax-wizard
│   ├── life_event.py          # POST /api/life-event
│   ├── couple_planner.py      # POST /api/couple-planner
│   ├── mf_xray.py             # POST /api/mf-xray  (file upload)
│   ├── chat.py                # POST /api/chat  +  GET /api/chat/stream (SSE)
│   └── voice.py               # POST /api/voice/stt  +  /tts  +  GET /voices
│
├── tests/
│   ├── conftest.py            # Shared fixtures (sample_profile)
│   ├── test_finance.py        # FIRE, tax, health score, profile validation
│   ├── test_fire_stepup.py    # Step-up SIP + projected FI age
│   ├── test_life_event.py     # All 6 life event branches
│   ├── test_couple.py         # Couple joint optimisation
│   └── test_mf_xray.py        # XIRR, overlap, category inference, portfolio analysis
│
├── main.py                    # App entry point, lifespan, CORS, router mounts
├── pyproject.toml
├── Makefile
├── .env.example
└── README.md
```

## Prerequisites

- Python 3.13+
- [uv](https://docs.astral.sh/uv/) — `curl -LsSf https://astral.sh/uv/install.sh | sh`
- A Groq/Gemini API key:
  - [console.groq.com](https://console.groq.com)
  - [aistudio.google.com/app/api-keys](https://aistudio.google.com/app/api-keys)
- Sarvam

## Quick Start

```bash
# 1. Clone and enter backend directory
git clone https://github.com/MahadevBalla/et-money-mentor.git
cd et-money-mentor/code/backend

# 2. Install all dependencies (creates .venv automatically)
make install

# 3. Add your API keys
#    Edit .env → set GROQ_API_KEY and SARVAM_API_KEY

# 4. Start the dev server
make dev
# API server:  http://localhost:8000
# Swagger UI:  http://localhost:8000/docs  (only when DEBUG=true)
```

## Configuration

All configuration is loaded once from `.env` via `core/config.py`.
**Never** read `os.environ` directly — always `from core.config import settings`.

```bash
# .env — copy from .env.example

# LLM Provider
LLM_PROVIDER=groq                          # "groq" (default) or "gemini"

GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_MAX_TOKENS=2048
GROQ_TEMPERATURE=0.3

GEMINI_API_KEY=                            # only if LLM_PROVIDER=gemini
GEMINI_MODEL=gemini-2.0-flash

# Voice Sarvam AI
SARVAM_API_KEY=your_key_here               # console.sarvam.ai
SARVAM_DEFAULT_VOICE=meera
SARVAM_DEFAULT_LANGUAGE=en-IN
SARVAM_TTS_PACE=1.0
SARVAM_TTS_SAMPLE_RATE=22050

# Database
DATABASE_URL=sqlite+aiosqlite:///./money_mentor.db

# App
APP_NAME=AI Money Mentor
APP_VERSION=1.0.0
DEBUG=true                                 # Enables /docs — does NOT affect log level

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Finance Engine defaults
# Economic assumptions — tunable per deployment
# Tax law constants (slabs, rebates, cess) live in finance/tax_constants.py — not here
DEFAULT_INFLATION_RATE=0.06
DEFAULT_EQUITY_RETURN=0.12
DEFAULT_DEBT_RETURN=0.07
DEFAULT_SAFE_WITHDRAWAL_RATE=0.04
DEFAULT_STEPUP_RATE=0.10
EMERGENCY_FUND_MONTHS=6
```

### `config.py` vs `tax_constants.py`

| File | What belongs here |
| --- | --- |
| `core/config.py` | Infrastructure (DB URL, API keys) + tunable economic assumptions (can differ staging vs prod) |
| `finance/tax_constants.py` | India Finance Act statutory constants — same everywhere, updated only when Budget changes |

## API Reference

All endpoints return a `session_id` and `decision_log` alongside the feature result.
`decision_log` is the full agent audit trail — every step, input summary, output summary, timestamp.

### `GET /health`

```json
{ "status": "ok", "version": "1.0.0" }
```

### `POST /api/health-score`

Returns a 6-dimension financial wellness score (0–100) with grade and LLM advice.

**Minimum request body:**

```json
{
  "age": 28,
  "city": "Mumbai",
  "monthly_gross_income": 100000,
  "monthly_expenses": 45000,
  "emergency_fund": 270000,
  "retirement_age": 60,
  "risk_profile": "moderate"
}
```

**Optional fields:** `assets`, `debts`, `insurance`, `tax_deductions`, `goals`

**Key response fields:**

```json
{
  "session_id": "uuid",
  "result": {
    "overall_score": 78.6,
    "grade": "B",
    "dimensions": [
      { "name": "Emergency Fund",        "score": 100.0, "label": "Excellent", "insight": "..." },
      { "name": "Debt Health",           "score": 100.0, "label": "Excellent", "insight": "..." },
      { "name": "Diversification",       "score": 100.0, "label": "Excellent", "insight": "..." },
      { "name": "Retirement Readiness",  "score": 46.2,  "label": "Fair",      "insight": "..." },
      { "name": "Insurance Coverage",    "score": 60.0,  "label": "Good",      "insight": "..." },
      { "name": "Tax Efficiency",        "score": 53.3,  "label": "Fair",      "insight": "..." }
    ],
    "monthly_surplus": 55000.0,
    "total_net_worth": 1070000.0
  },
  "advice": { "summary": "...", "key_actions": ["..."], "risks": ["..."], "disclaimer": "..." },
  "decision_log": [...]
}
```

### `POST /api/fire-planner`

Returns a complete FIRE plan with flat SIP, step-up SIP, and per-goal SIP projections.

**Additional request fields:** `retirement_age`, `goals`

```json
{
  "age": 30,
  "city": "Bangalore",
  "monthly_gross_income": 150000,
  "monthly_expenses": 60000,
  "retirement_age": 50,
  "risk_profile": "aggressive",
  "goals": [
    { "type": "house", "label": "Dream Home", "target_amount": 5000000, "target_year": 2030 }
  ]
}
```

**Key response fields:**

```json
{
  "result": {
    "fi_corpus_required": 87500000.0,
    "current_corpus": 0.0,
    "corpus_gap": 87500000.0,
    "required_monthly_sip": 45230.0,
    "required_stepup_sip": 18400.0,
    "stepup_rate": 0.10,
    "projected_fi_age": 47.3,
    "years_to_fi": 17.3,
    "monthly_retirement_expense": 290000.0,
    "on_track": true,
    "sip_goals": [
      {
        "goal_label": "Dream Home",
        "target_amount": 5000000.0,
        "target_year": 2030,
        "required_monthly_sip": 55753.0,
        "required_stepup_sip": 38200.0,
        "stepup_rate": 0.10
      }
    ]
  }
}
```

`required_stepup_sip` is the **initial** monthly SIP that increases 10% each year to reach the same
corpus as the flat SIP — typically 30–40% lower than the flat SIP amount.

### `POST /api/tax-wizard`

Compares old vs new regime, finds the better option, and lists unused deduction opportunities.

**Request:** standard `UserProfile` with `tax_deductions` populated for best results.

**Key response fields:**

```json
{
  "result": {
    "gross_income": 1800000.0,
    "old_regime_tax": 335400.0,
    "new_regime_tax": 215800.0,
    "recommended_regime": "new",
    "savings_by_switching": 119600.0,
    "effective_rate_old": 18.63,
    "effective_rate_new": 11.99,
    "missing_deductions": [
      "Section 80C: ₹1,00,000 unused — PPF, ELSS, EPF top-up, LIC premium",
      "NPS 80CCD(1B): ₹50,000 unused — additional NPS over 80C limit"
    ],
    "deduction_potential": 175000.0
  }
}
```

### `POST /api/life-event`

Deterministic allocation plan + LLM advice for 6 life event types.

**Request body:**

```json
{
  "age": 32,
  "city": "Mumbai",
  "monthly_gross_income": 120000,
  "monthly_expenses": 55000,
  "emergency_fund": 200000,
  "retirement_age": 60,
  "risk_profile": "moderate",
  "event_type": "bonus",
  "event_amount": 500000,
  "event_details": {}
}
```

**Supported `event_type` values:** `bonus` | `inheritance` | `marriage` | `new_baby` | `job_loss` | `home_purchase`

For `home_purchase`, pass `"event_details": { "property_value": 5000000 }`.

**Key response fields:**

```json
{
  "result": {
    "event_type": "bonus",
    "event_amount": 500000.0,
    "tax_impact": 154000.0,
    "allocations": [
      { "category": "Emergency Fund",              "amount": 90000.0,  "rationale": "..." },
      { "category": "Tax-Saving Investment (80C)", "amount": 60000.0,  "rationale": "..." },
      { "category": "Long-term Equity Investment", "amount": 350000.0, "rationale": "..." }
    ],
    "insurance_gaps": [],
    "priority_actions": ["Your ₹5,00,000 bonus will incur ~₹1,54,000 additional tax...", "..."]
  }
}
```

### `POST /api/couple-planner`

Joint financial optimisation — HRA split, NPS matching, SIP allocation, combined tax saving.

**Request body:**

```json
{
  "partner_a": {
    "age": 30, "city": "Mumbai", "monthly_gross_income": 150000,
    "monthly_expenses": 50000, "retirement_age": 60, "risk_profile": "moderate"
  },
  "partner_b": {
    "age": 28, "city": "Mumbai", "monthly_gross_income": 100000,
    "monthly_expenses": 40000, "retirement_age": 60, "risk_profile": "moderate"
  },
  "is_married": true,
  "joint_goals": []
}
```

**Key response fields:**

```json
{
  "result": {
    "combined_net_worth": 2500000.0,
    "combined_monthly_surplus": 110000.0,
    "better_hra_claimant": "partner_a",
    "hra_savings": 84000.0,
    "nps_matching_benefit": 31200.0,
    "partner_a_sip": 41250.0,
    "partner_b_sip": 27500.0,
    "joint_tax_saving": 93600.0,
    "joint_insurance_recommendation": "Insurance adequate — review sum assured annually",
    "recommendations": ["...", "..."]
  }
}
```

### `POST /api/mf-xray`

Upload a CAMS or KFintech consolidated account statement (CSV or PDF) for portfolio analysis.

**Request:** `multipart/form-data` with field `file` (`.csv` or `.pdf`).

```bash
curl -X POST http://localhost:8000/api/mf-xray \\
  -F "file=@cams_statement.csv"
```

**Key response fields:**

```json
{
  "result": {
    "total_invested": 500000.0,
    "total_current_value": 612000.0,
    "overall_xirr": 14.2,
    "absolute_return_pct": 22.4,
    "holdings": [...],
    "overlapping_pairs": [
      { "fund_a": "HDFC Top 100", "fund_b": "Axis Bluechip", "overlap_percent": 65.0, "common_stocks": ["HDFC Bank", "..."] }
    ],
    "category_breakdown": { "Large Cap": 300000.0, "Index/ETF": 200000.0, "Debt": 112000.0 },
    "high_expense_funds": ["HDFC Top 100 Regular Plan"],
    "rebalancing_suggestions": ["Switch high-TER funds to direct plans to save 0.5–1.5% p.a.", "..."]
  }
}
```

### `POST /api/chat`

Multi-turn AI chat. History is stored per session in `agent_logs` and automatically injected into every LLM call.

```json
{ "session_id": "uuid-from-any-prior-endpoint", "message": "Should I prepay my home loan?" }
```

Response:

```json
{ "session_id": "uuid", "reply": "Great question! Given your current EMI..." }
```

Pass the `session_id` from any feature endpoint to give the chat context about the user's financial profile.

### `GET /api/chat/stream`

Server-Sent Events (SSE) streaming version of chat.

```bash
GET /api/chat/stream?session_id=<uuid>&message=<text>

data: {"token": "Great"}
data: {"token": " question"}
data: {"token": "!"}
data: {"done": true}
```

JavaScript client:

```js
const es = new EventSource(`/api/chat/stream?session_id=${id}&message=${encodeURIComponent(msg)}`);
es.onmessage = e => {
  const d = JSON.parse(e.data);
  if (d.done) es.close();
  else appendToken(d.token);
};
```

### `POST /api/voice/stt`

Convert speech to text via Sarvam Saaras. Supports WAV, MP3, OGG. Auto-detects Indian languages.

```bash
curl -X POST http://localhost:8000/api/voice/stt \\
  -F "audio=@question.wav" \\
  -F "language_code=hi-IN"
```

Response: `{ "transcript": "मेरा SIP कितना होना चाहिए?", "language": "hi-IN" }`

### `POST /api/voice/tts`

Convert text to speech via Sarvam Bulbul. Returns raw WAV audio bytes.

```bash
curl -X POST http://localhost:8000/api/voice/tts \\
  -F "text=Aapka SIP rupaye paanch hazaar per month rehna chahiye" \\
  -F "voice=meera" \\
  -F "language_code=en-IN" \\
  --output response.wav
```

Available voices: `meera` (female, en-IN), `pavithra` (female, hi), `arvind` (male, en-IN), `amol` (male, hi).

### `GET /api/voice/voices`

List all available Sarvam voices and the current default.

## Agent Pipeline

Each feature request runs through all 4 agents in sequence. Every step is persisted to `agent_logs`.

| Agent | Type | Responsibility |
| --- | --- | --- |
| `IntakeAgent` | LLM | Validates raw profile JSON, fills Indian-context defaults, flags anomalies |
| `FinanceEngine` | Deterministic | Runs FIRE / Health / Tax / LifeEvent / Couple / MFXRay math — zero LLM |
| `MentorAgent` | LLM | Generates personalised India-specific advice referencing exact ₹ figures |
| `GuardrailAgent` | LLM | SEBI compliance scrub — removes stock picks, softens guaranteed-return language |

The `decision_log` array in every response is the live audit trail. Each entry contains:

- `agent` — which agent ran
- `step` — what it did
- `timestamp` — ISO 8601
- `input_summary` / `output_summary` — truncated to 300 chars for readability

Full input/output JSON is stored in the `agent_logs` DB table (truncated to 10,000 chars per field).

## Finance Engine

Pure Python, zero LLM dependency. All functions are stateless and deterministic. Safe to unit-test
with no secrets.

### Tax Constants (`finance/tax_constants.py`)

Frozen dataclasses for all India Finance Act constants. **Nothing else hardcodes tax values.**

```python
from finance.tax_constants import CURRENT as TAX

TAX.new_rebate_limit      # 700_000  (₹7L — 87A rebate threshold, new regime)
TAX.sec_80c_limit         # 150_000  (Section 80C ceiling)
TAX.cess_rate             # 0.04     (4% Health & Education Cess)
TAX.fy                    # "2025-26"
```

When Budget 2026 changes a slab, update only `FY2026_27 = IndiaFiscalYearConstants(...)` and change
the `CURRENT` alias. Every other module stays unchanged.

### Tax Engine (`finance/tax.py`)

- FY 2025-26 slabs for both regimes via `tax_constants.py`
- Standard deduction: ₹75,000 (new) / ₹50,000 (old)
- Section 87A rebate: zero tax if taxable income ≤ ₹7L (new) / ₹5L (old)
- Surcharge: old regime up to 37% at >₹5Cr; new regime capped at 25%
- 4% Health & Education Cess on (base tax + surcharge)
- Identifies unused deductions: 80C, 80D (self + parents), 80CCD(1B), HRA, Section 24(b)

### FIRE Engine (`finance/fire.py`)

| Function | Description |
| --- | --- |
| `compound_growth_value(pv, rate, years)` | Lump-sum future value |
| `future_value_sip(sip, rate, years)` | Flat monthly SIP future value |
| `future_value_stepup_sip(sip, rate, years, stepup)` | Step-up SIP FV (10% annual increase) |
| `required_monthly_sip(target, corpus, rate, years)` | Flat SIP via binary search |
| `required_stepup_sip(target, corpus, rate, years, stepup)` | Step-up SIP via binary search |
| `projected_fi_age(age, corpus, sip, target, rate, stepup)` | Earliest FI age with step-up SIP |
| `calculate_fi_corpus(profile)` | Inflation-adjusted corpus at SWR |
| `build_fire_plan(profile)` → `FIREPlan` | Full plan with both SIP types + goal SIPs |

`required_stepup_sip` initial amount is typically 30–40% lower than the flat SIP for the same
corpus target, making it more achievable at the start of a career.

### Health Score (`finance/health.py`)

6 equally-weighted dimensions (each 0–100), averaged for overall score:

| Dimension | Method | Key metric |
| --- | --- | --- |
| Emergency Fund | Linear scale | Months of expenses covered (target: 6) |
| Debt Health | EMI ratio + type penalty | EMI ÷ gross income; unsecured debt penalised more |
| Diversification | Herfindahl index | Concentration across equity / debt / gold / cash / PPF |
| Retirement Readiness | Corpus projection | Projected corpus at retirement ÷ required corpus |
| Insurance Coverage | Term + health adequacy | Term cover ÷ (10× annual income); health cover ÷ income |
| Tax Efficiency | Deduction utilisation | Claimed deductions ÷ max available deductions |

### Life Event Engine (`finance/life_event.py`)

Deterministic allocation rules for 6 event types:

| Event | Logic |
| --- | --- |
| `bonus` | High-interest debt (>18%) → emergency fund top-up → 80C → equity |
| `inheritance` | Emergency fund → debt clearance (>10%) → term insurance → STP |
| `marriage` | Insurance gap analysis + HRA + nomination checklist |
| `new_baby` | Education fund start + enhanced emergency fund + insurance gaps |
| `job_loss` | Runway calculation (emergency fund ÷ expenses) + liquidity preservation |
| `home_purchase` | 20% down payment + stamp duty + Section 24(b)/80C guidance |

### Couple Engine (`finance/couple.py`)

- `_better_hra_claimant(a, b)` — metro-adjusted HRA exemption, picks higher-benefit partner
- `_nps_matching_benefit(a, b)` — combined 80CCD(1B) unused allowance × marginal tax rate
- `_optimise_sip_split(a, b)` — proportional to investable surplus
- `_joint_tax_saving(a, b)` — both partners at max old-regime deductions vs current
- `optimise_couple_finances(couple)` → `CoupleOptimisation`

### MF X-Ray Engine (`finance/mf_xray.py`)

| Function | Description |
| --- | --- |
| `parse_cams_csv(bytes)` | CAMS consolidated statement CSV → normalised dicts |
| `parse_cams_pdf(bytes)` | pdfplumber text extraction from CAMS PDF |
| `compute_xirr(cash_flows)` | scipy brentq (primary) → numpy_financial fallback |
| `_infer_category(name)` | Keyword-based fund category (Liquid / Debt / Hybrid / Index / ...) |
| `detect_overlap(holdings)` | Category-based overlap heuristic with % estimate |
| `generate_rebalancing_suggestions(...)` | Consolidation, direct plan, gap analysis |
| `analyse_portfolio(holdings, cash_flows)` → `MFXRayResult` | Full portfolio report |

## Voice Layer

Powered by [Sarvam AI](https://docs.sarvam.ai). Handles 10+ Indian languages + Hinglish naturally.

```md
Audio (WAV/MP3/OGG)
  └─► POST /api/voice/stt  →  Sarvam Saaras STT  →  transcript text
                                                            ↓
                                                     POST /api/chat
                                                            ↓
                                                    AI Money Mentor reply
                                                            ↓
  WAV audio bytes  ←  Sarvam Bulbul TTS  ←  POST /api/voice/tts
```

**Text chunking:** TTS automatically splits text at sentence boundaries to stay under Sarvam\'s
490-character-per-request limit, then concatenates the audio chunks. Long LLM replies play seamlessly.

**Free tier:** ₹1,000 credits on signup at console.sarvam.ai — sufficient for hackathon demo volume.

## LLM Providers

Provider-agnostic design. Switch with a single env var — no agent code changes.

```bash
LLM_PROVIDER=groq    # default — fast, free tier
LLM_PROVIDER=gemini  # requires: uv add google-genai
```

**Adding a new provider (e.g., OpenAI):**

```python
# core/llm_client.py
class OpenAIProvider(BaseLLMProvider):
    def __init__(self):
        from openai import AsyncOpenAI
        self._client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    async def complete(self, messages, *, temperature, max_tokens, json_mode) -> str:
        ...

_REGISTRY["openai"] = OpenAIProvider
```

Then `LLM_PROVIDER=openai` in `.env`. No other changes.

Agents call only `chat_completion()` or `structured_chat()` — never instantiate providers directly.
`structured_chat()` strips markdown fences before `json.loads()`, so agents never need to handle
raw LLM output.

## Testing

```bash
make test          # Full suite (all test files)
make test-unit     # Finance tests only — fast, no LLM/DB/network
make test-cov      # With HTML coverage report
```

### Test matrix

| File | Class | Tests | What\'s covered |
| --- | --- | --- | --- |
| `test_finance.py` | `TestFIREMath` | 8 | Compound growth, SIP math, corpus, goal SIPs |
| `test_finance.py` | `TestTaxEngine` | 7 | Both regimes, rebates, cess, deduction gaps |
| `test_finance.py` | `TestHealthScore` | 10 | All 6 dimensions, net worth, grade |
| `test_finance.py` | `TestProfileValidation` | 3 | Cross-field validators |
| `test_fire_stepup.py` | `TestStepUpSIP` | 5 | Step-up FV, required SIP, edge cases |
| `test_fire_stepup.py` | `TestProjectedFIAge` | 3 | FI age projection, bounds |
| `test_life_event.py` | `TestBonusAllocation` | 8 | Debt-first, EF top-up, equity, tax impact |
| `test_life_event.py` | `TestInheritanceAllocation` | 2 | Debt clearance, STP |
| `test_life_event.py` | `TestMarriageEvent` | 3 | Insurance gaps, priority actions |
| `test_life_event.py` | `TestJobLossEvent` | 2 | Runway, health insurance gap |
| `test_life_event.py` | `TestHomePurchaseEvent` | 2 | Down payment 20%, allocation |
| `test_couple.py` | `TestNetWorth` | 2 | Assets − liabilities calculation |
| `test_couple.py` | `TestHRABenefit` | 2 | Metro vs non-metro, claimed amount |
| `test_couple.py` | `TestCoupleOptimisation` | 7 | NPS, SIP split, tax saving, insurance |
| `test_mf_xray.py` | `TestInferCategory` | 7 | Keyword-based category inference |
| `test_mf_xray.py` | `TestXIRR` | 5 | Positive/negative returns, multi-cashflow |
| `test_mf_xray.py` | `TestDetectOverlap` | 4 | Same/diff category, debt exclusion |
| `test_mf_xray.py` | `TestRebalancingSuggestions` | 5 | Fund count, index gap, expense flag |
| `test_mf_xray.py` | `TestAnalysePortfolio` | 5 | Returns, breakdown, XIRR, expense ids |
| **Total** | | **~80** | **All deterministic — zero LLM/DB/network** |

All tests use only fixtures and pure function calls. Safe to run in CI with no secrets.

## Development

```bash
make help          # All available commands

make install       # uv sync + cp .env.example .env
make dev           # Uvicorn hot-reload on :8000
make test          # Full pytest suite
make test-unit     # Finance tests only (fast)
make test-cov      # Coverage report → htmlcov/
make lint          # Ruff auto-fix
make reset-db      # Delete money_mentor.db (recreated on next startup)
make clean         # Remove __pycache__, .pytest_cache, *.pyc
```

### Adding a new API feature

1. **Schema** — add request/response Pydantic models to `models/schemas.py`
2. **Constants** — if Finance Act values needed, add to `finance/tax_constants.py`
3. **Finance engine** — pure functions in `finance/<feature>.py`, no I/O
4. **Agent** — LLM narrative in `agents/<feature>_agent.py`, imports from finance engine
5. **Router** — 4-step pipeline in `routers/<feature>.py`, copy `health_score.py` as template
6. **Mount** — `app.include_router(<feature>.router)` in `main.py`
7. **Tests** — deterministic unit tests in `tests/test_<feature>.py`

## Design Decisions

**Why deterministic finance engine + LLM advice layer (not end-to-end LLM)?**
LLMs hallucinate numbers. SIP amounts, tax figures, and corpus projections are too consequential
for a financial app. The engine guarantees mathematical accuracy; the LLM only handles language.
This also means you can unit-test every financial calculation without any API keys.

**Why `tax_constants.py` instead of config / magic numbers?**
Tax slabs are statutory Finance Act values — not infrastructure config (they don\'t vary
between staging and prod) but also not magic numbers scattered across functions. A versioned,
documented constants file is the right pattern. When Budget 2026 changes a slab, one file changes.

**Why step-up SIP alongside flat SIP?**
India\'s salaried workforce receives annual increments. A step-up SIP that increases 10% per year
matches salary growth naturally and typically requires 30–40% lower initial commitment — making
financial goals more accessible to early-career users.

**Why provider-agnostic LLM client?**
Groq for speed during development, Gemini for production optionality. The `BaseLLMProvider`
abstraction means switching is a one-line env var change — no agent code changes needed.

**Why SQLite now?**
Zero-config for hackathon/demo. The `engine` in `db/session_store.py` is the only place that
references SQLite. Moving to Postgres means changing `DATABASE_URL` in `.env`. The
`async_sessionmaker` pattern is identical for both.

**Why `DEBUG=true` doesn\'t change log level?**
`DEBUG` controls product features (Swagger UI at `/docs`). Log verbosity is a separate operational
concern. Setting root logger to `DEBUG` floods stdout with aiosqlite cursor operations and httpcore
TLS handshakes — noise that buries real errors. Log level is always `INFO`.

**Why audit-log every agent step?**
SEBI-style compliance requires an evidence trail. `decision_log` in the API response + `agent_logs`
in the DB means you can reconstruct exactly what the system told any user at any point in time.
The DB entries survive after the response is returned.

**Why Sarvam AI for voice?**
Sarvam is purpose-built for Indian languages. It handles Hinglish naturally ("Aapka SIP ₹5,000
hai"), understands Indian financial terminology, and supports 10+ regional languages. Google TTS
and ElevenLabs don\'t come close for the India-first use case.
