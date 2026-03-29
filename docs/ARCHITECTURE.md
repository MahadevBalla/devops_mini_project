# System Architecture

> Deterministic finance computation wrapped in an agent pipeline for explanation and safety.

This document is the quickest way to understand how the system is put together and why it looks the way it does.

It is not a product overview. It is the system view we wish every new engineer had on day one.

## 1. Overview

This system powers an AI-assisted personal finance product. The feature set is broad, but the execution model is pretty consistent:

- FIRE planning
- tax comparison and optimization
- money health scoring
- life-event planning
- couple financial planning
- mutual fund portfolio analysis
- conversational chat over user context and a small finance knowledge base

The core design choice is simple:

- finance math should be deterministic
- LLMs should explain, not calculate
- safety checks should happen before anything leaves the system

We do use LLMs heavily, but only in places where they are actually useful:

- validating and structuring messy input
- turning numbers into human-readable advice
- checking output for unsafe or non-compliant language
- answering chat questions with session context and retrieved documents

We do not let the model invent tax numbers, FIRE projections, XIRR, or health scores. That all stays in Python code under `finance/`.

## 2. High-Level Architecture

At a high level, the frontend talks to a FastAPI service. FastAPI routes authenticate the user, validate the request shape, run the pipeline, persist what matters, and return a typed response.

```text
Frontend
   ↓
FastAPI (routers)
   ↓
Agent pipeline
   ↓
Finance engine
   ↓
Response + persistence
```

In practice, the finance engine is invoked inside the pipeline, but it is kept conceptually separate because it is the source of truth for all numbers.

The slightly more realistic picture is this:

```text
Frontend
   |
   v
FastAPI
   |
   +--> Auth / Portfolio / Scenario / Chat routers
   |
   +--> IntakeAgent
   +--> Finance module
   +--> MentorAgent
   +--> GuardrailAgent
   |
   +--> SQLite persistence
   +--> RAG index / knowledge base
```

The system is modular on purpose. Agents, finance logic, routers, models, and persistence are kept separate so we can reason about failures and change one layer without rewriting the others.

## 3. Request Lifecycle

For the main finance features, a request usually goes through the same path.

### Step 1: API layer

The request lands in a feature router under `routers/`.

The router does a few boring but important things first:

- validates the outer request model with Pydantic
- resolves the authenticated user via JWT dependency
- creates a new session record for this run
- decides where the input should come from

That last point matters. Most feature endpoints support two modes:

- use the saved portfolio profile
- run a one-off what-if request with an explicit profile payload

We keep those paths separate instead of merging them. That avoids weird partial overrides and makes persistence rules easier to understand.

### Step 2: IntakeAgent

The raw input goes into the IntakeAgent.

This is where we clean up the input before any finance code sees it:

- structural validation
- obvious data-quality checks
- normalization into a typed `UserProfile`
- deterministic rules of thumb where we want consistent behavior

If the LLM path is unavailable or returns junk, the agent falls back to direct Pydantic validation. We still get a valid profile or a clean validation error.

### Step 3: Finance computation

Once we have a typed profile, the router calls the relevant finance module:

- `finance/fire.py`
- `finance/tax.py`
- `finance/health.py`
- `finance/life_event.py`
- `finance/couple.py`
- `finance/mf_xray.py`

This is the source of truth for every number we show the user.

### Step 4: MentorAgent

The finance result then goes into the MentorAgent. Its job is to explain the result, not reinterpret it.

The prompt and context are structured so the model works from computed output instead of re-deriving anything.

### Step 5: GuardrailAgent

Before we return advice, it goes through the GuardrailAgent.

This is the last gate. It looks for things we do not want in the output:

- specific stock or scheme recommendations
- guaranteed-return language
- contradictions with the reference numbers from the finance layer
- missing disclaimer text

There is also a deterministic regex-based backstop, so even if the LLM guardrail path fails, we still have a final check.

### Step 6: Persistence

The router then persists the useful parts:

- session state for later chat context
- agent logs for auditability
- portfolio result snapshots when the run is based on the saved profile
- scenarios for what-if runs when the user chooses to save them

### Step 7: Response

The final HTTP response is a typed model that usually includes:

- `session_id`
- normalized profile, where relevant
- deterministic result
- advice
- decision log

In practice, the execution trace looks like this:

```text
Request
  -> router validation + auth
  -> create session
  -> IntakeAgent
  -> finance module
  -> MentorAgent
  -> GuardrailAgent
  -> save state / logs / results
  -> response
```

## 4. Agent Pipeline

This is the center of the system.

```text
IntakeAgent -> Finance Engine -> MentorAgent -> GuardrailAgent
```

### IntakeAgent

What it does:

- validates raw user input
- checks for obvious inconsistencies
- normalizes the payload into a `UserProfile`
- applies a small set of deterministic rules of thumb

Why it exists:

- frontend input is not guaranteed to be complete or consistent
- finance modules should not be littered with cleanup logic
- we want one place to turn "user-shaped JSON" into "system-shaped input"

In the current code, IntakeAgent uses an LLM for structural checks and notes, but normalization rules that actually affect behavior are kept in code.

### Finance Engine

What it does:

- performs all deterministic financial computation
- returns typed domain results
- stays isolated from prompt wording and model behavior

Why the LLM is not used here:

- finance calculations must be reproducible
- debugging is impossible if numbers come from a model
- compliance gets much harder if there is no single numeric source of truth

If we need to explain a number, the finance engine computes it and the agents talk about it.

### MentorAgent

What it does:

- converts structured numeric output into readable advice
- generates summaries, action items, and risks
- keeps the tone user-friendly without changing the numbers

Why it sits after the finance engine:

- it should narrate the result, not shape it
- this keeps prompts smaller and more reliable
- it gives us a clean seam for deterministic fallbacks

### GuardrailAgent

What it does:

- checks advice for compliance and safety problems
- sanitizes problematic output
- ensures disclaimers are present
- acts as the final enforcement layer before response

Why it is last:

- it needs to inspect the actual advice text
- guardrails are more useful on final output than on intermediate prompts
- if we put it earlier, later stages could still reintroduce bad wording

### Why this order matters

The order is not arbitrary.

- Intake first, because bad input contaminates everything downstream.
- Finance second, because we want the numeric truth established early.
- Mentor third, because explanation depends on the computed result.
- Guardrail last, because we only care about final user-visible output.

If we collapse these stages into a single LLM call, we lose debuggability fast. We also lose the ability to say with confidence where a wrong answer came from.

## 5. Finance Engine Design

The finance engine lives under `finance/` and is intentionally simple. That is a good thing.

Modules are split by domain:

- `fire.py` for retirement corpus and SIP planning
- `tax.py` and `tax_constants.py` for regime comparison and statutory logic
- `health.py` for multi-dimension money health scoring
- `life_event.py` for scenario-style decisions
- `couple.py` for joint planning logic
- `mf_xray.py` for statement parsing and portfolio analysis
- `amfi.py` for NAV enrichment and caching

The important boundary is this:

- `finance/` returns numbers and structured results
- `agents/` explain those results

That separation buys us three things:

- reproducibility: same input gives the same result
- auditability: we can log and inspect the exact inputs and outputs
- testability: finance functions can be unit-tested without the LLM stack

This also keeps the failure modes clean. If the LLM is down, we may lose nice phrasing, but we do not lose the core computation.

## 6. Chat + RAG Flow

Chat is related to the feature pipeline, but it is not the same thing.

Feature endpoints are mostly "compute first, explain second." Chat is "assemble context, then respond."

The chat endpoint does a few specific things:

- verifies the session belongs to the current user
- loads recent chat history from agent logs
- reads saved session state from previous feature runs
- retrieves relevant snippets from the local knowledge base
- builds a prompt with user context plus retrieved text
- calls the LLM
- persists the new chat turn

Simple flow:

```text
User → Chat API → Session → RAG → LLM → Response
```

More complete flow:

```text
User message
  -> /api/chat or /api/chat/stream
  -> load session and recent history
  -> load saved feature context from session.state_json
  -> retrieve top-k docs from FAISS index
  -> call LLM
  -> append ChatAgent log
  -> return response
```

The RAG layer is intentionally small:

- documents live in `rag/documents/`
- the index is built at startup
- retrieval uses FAISS with Sentence Transformers
- if indexing fails, chat still works, just without retrieved context

That last part matters. RAG is helpful, but it is not allowed to take the whole chat system down.

One useful detail here: feature runs write summary data into `session.state_json`, and chat uses that state to answer follow-up questions about the user's FIRE plan, tax comparison, or health score without recomputing everything.

## 7. API Layer

The API layer lives in `routers/`. Each router owns one area of behavior.

Examples:

- auth routes under `/api/auth`
- feature routes like `/api/fire-planner`, `/api/health-score`, `/api/tax-wizard`
- portfolio routes under `/api/portfolio`
- chat routes under `/api/chat` and `/api/chat/stream`
- a plain `/health` route for liveness

We use feature-specific endpoints instead of a generic `/process` endpoint for a few reasons:

- each feature has different input rules
- each feature has different persistence behavior
- typed request and response models stay readable
- debugging is easier when the route name matches the business operation

A generic `/process` route sounds flexible, but it usually turns into a giant switch statement with weak typing and hard-to-read validation paths.

In this codebase, the routers are doing real orchestration work. They are not just thin transport wrappers. That is fine here because the logic is mostly request-scoped and feature-specific.

## 8. Data & Persistence

Persistence is handled through SQLAlchemy async in `db/session_store.py`. The default database is SQLite.

What we store:

- users
- refresh tokens
- sessions
- agent logs
- portfolio
- scenarios

### Users

User identity, auth state, verification state, and login metadata.

### Sessions

A session is the execution thread for a feature run or a chat conversation. It lets us tie later chat interactions back to prior feature output.

### Agent logs

Every meaningful step is logged with:

- agent name
- step label
- input summary
- output summary
- timestamp

This is useful for auditability and for debugging weird outputs without reading raw prompts all day.

### Portfolio

This is the saved financial state for the user. It stores the canonical profile plus the latest computed outputs for each feature.

The code is pretty strict about write paths here. For example, the profile is only updated through the portfolio profile endpoint, not incidentally by feature runs.

### Scenarios

Scenarios are saved what-if runs. They let the user compare hypothetical outcomes without mutating the main portfolio.

Why persistence matters:

- chat needs continuity across requests
- feature runs should be traceable
- we need to support saved plans and what-if analysis
- finance advice is easier to defend when there is an execution trail

## 9. Error Handling & Guardrails

Error handling is layered. That is deliberate.

### Validation

We validate at two levels:

- Pydantic at the API boundary
- IntakeAgent inside the pipeline

This catches different classes of problems:

- malformed request shape
- logically questionable finance input

### LLM failure handling

LLM calls go through a provider abstraction in `core/llm_client.py`.

If the provider is unavailable:

- structured feature flows can fall back to deterministic validation or canned advice
- guardrail logic still has a deterministic backstop
- chat returns a safe fallback message instead of exploding

So the system degrades, but it usually does not fail all at once.

### Guardrail enforcement

Guardrails are not just prompt text. They are enforced in two layers:

- LLM-based review of final advice against reference numbers
- deterministic regex checks for banned patterns and disclaimer handling

That second layer is important because compliance cannot depend entirely on a model behaving nicely.

## 10. Design Decisions

These are the main decisions that shape the codebase.

### Why agents instead of one big pipeline function

Because the responsibilities are different enough that mixing them becomes messy fast.

- intake is about cleanup
- finance is about deterministic computation
- mentoring is about explanation
- guardrails are about enforcement

Keeping them separate makes failures easier to isolate and prompts easier to reason about.

### Why a deterministic finance engine

Because finance features need repeatable outputs.

If the same profile can produce different corpus gaps or tax liability numbers on different runs, the system is not trustworthy. This is the one place where "close enough" is not good enough.

### Why guardrails at the end

Because we care about the final user-visible text, not just an intermediate draft.

The last stage should be the one that sees exactly what is about to leave the system.

### Why no generic `/process` endpoint

Because it would hide important differences between features and make the API harder to understand.

The current route structure is more verbose, but it keeps contracts explicit.

### Why RAG for chat

Because general LLM knowledge is not enough for this product.

We want chat responses to be grounded in:

- the user's actual saved state
- curated finance documents we control

That combination is much more useful than a standalone chat model answering from memory.

## 11. Tradeoffs & Limitations

There are some real limitations in the current design.

### Sequential pipeline

The pipeline is linear and request-scoped. That keeps it easy to follow, but it is not an orchestration engine. We are not doing parallel execution, retries per stage, or resumable workflows.

### SQLite as the default store

SQLite is fine for local development and small deployments. It is not where we want to stay if write volume or concurrency grows.

The code already hints at this. For example, shutdown comments mention a future move to Postgres.

### LLM dependency risk

The system degrades reasonably well, but the quality of advice still depends on external model providers. Chat is especially exposed here.

Also, the standard chat path and the streaming chat path are not implemented through exactly the same abstraction. That is workable, but it is not ideal.

### Mixed levels of production-readiness

Some parts are strong and explicit:

- typed models
- deterministic finance logic
- clear router boundaries
- audit-friendly persistence

Some parts still need hardening:

- database migration story
- richer observability
- stronger background job / workflow support
- more formal production infrastructure assumptions

### Single-process assumptions in a few areas

Some caches are in-memory and startup work is local to the app process. That is fine right now, but distributed deployment will need more deliberate coordination.

## 12. Future Improvements

There are a few obvious next steps if we keep pushing this backend.

### Better agent orchestration

- stage-level retries
- clearer pipeline composition
- better support for long-running or multi-step plans

### Streaming outside chat

- stream mentor responses for feature endpoints
- expose progress events for heavy workflows like MF X-Ray

### Better observability

- structured tracing across router -> agent -> finance steps
- metrics for LLM latency, fallbacks, and guardrail modifications
- easier inspection of session history in ops tooling

### Database scaling

- move from SQLite to Postgres
- add migrations
- tighten transactional behavior around session and result writes

### Workflow engine, if needed

Right now, plain request/response is enough. If we start doing more expensive multi-stage planning or asynchronous jobs, a workflow engine may be worth it. We are not there yet, and that is okay.

## Closing Notes

If you are new to the codebase, the shortest useful path is:

1. start with `main.py`
2. read one feature router end to end, like `routers/health_score.py`
3. read `agents/intake_agent.py`, `agents/mentor_agent.py`, and `agents/guardrail_agent.py`
4. read the corresponding finance module
5. read `db/session_store.py`

That path gives you the real shape of the system quickly.
