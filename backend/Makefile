.PHONY: help install dev dev-prod test test-unit test-cov test-watch lint fmt check clean reset-db

PYTHON  := uv run python
UVICORN := uv run uvicorn

help:
	@echo ""
	@echo "  AI Money Mentor — Backend"
	@echo ""
	@echo "  make install     Install all dependencies"
	@echo "  make dev         Start dev server with hot reload"
	@echo "  make test        Run all tests"
	@echo "  make test-unit   Run only finance engine tests (no LLM/DB)"
	@echo "  make test-watch  Re-run tests on file change"
	@echo "  make lint        Run ruff linter (with auto-fix)"
	@echo "  make fmt         Run ruff formatter"
	@echo "  make check       lint + fmt + test  (CI gate)"
	@echo "  make reset-db    Delete local SQLite DB"
	@echo "  make clean       Remove __pycache__ and .pytest_cache"
	@echo ""

install:
	cp -n .env.example .env || true
	uv sync

dev:
	$(UVICORN) main:app --reload --port 8000

dev-prod:
	$(UVICORN) main:app --host 0.0.0.0 --port 8000 --workers 2

test:
	uv run pytest tests/ -v

test-unit:
	uv run pytest tests/test_finance.py tests/test_mf_xray.py tests/test_fire_stepup.py -v

test-cov:
	uv run pytest tests/ -v --cov=. --cov-report=term-missing

# Watch mode: re-runs failing tests on every save.
# Requires pytest-watch: uv add --dev pytest-watch
test-watch:
	uv run pytest tests/ -v --tb=short -f

lint:
	uv run ruff check . --fix

# Formatter target (ruff format, not just lint)
fmt:
	uv run ruff format .

check: lint fmt test
	@echo ""
	@echo "  All checks passed."
	@echo ""

reset-db:
	rm -f money_mentor.db
	@echo "Database reset."

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -name "*.pyc" -delete 2>/dev/null || true
	@echo "Cleaned."
