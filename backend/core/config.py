"""
core/config.py — All env vars loaded once here.
Import `settings` everywhere; never read os.environ directly.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    APP_NAME: str = "AI Money Mentor"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./money_mentor.db"

    # Security & JWT
    SECRET_KEY: str = "CHANGE_THIS_IN_PRODUCTION_USE_openssl_rand_hex_32"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15  # 15 minutes
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7  # 7 days

    # Email / SMTP
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    SMTP_FROM_NAME: str = "AI Money Mentor"

    # LLM provider selection
    LLM_PROVIDER: str = "groq"  # "groq" | "gemini"

    # Groq
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    GROQ_MAX_TOKENS: int = 2048
    GROQ_TEMPERATURE: float = 0.3

    # Gemini (only needed if LLM_PROVIDER=gemini)
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3-flash-preview"

    # HuggingFace — for RAG embeddings
    HF_TOKEN: str = ""
    HF_RAG_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"  # BAAI/bge-small-en-v1.5 (~33MB) | BAAI/bge-base-en-v1.5 (~100MB) | BAAI/bge-large-en-v1.5 (~335MB)

    # Sarvam AI — voice
    SARVAM_API_KEY: str = ""
    SARVAM_DEFAULT_VOICE: str = "meera"
    SARVAM_DEFAULT_LANGUAGE: str = "en-IN"
    SARVAM_TTS_PACE: float = 1.0
    SARVAM_TTS_SAMPLE_RATE: int = 22050

    # Economic assumptions
    DEFAULT_INFLATION_RATE: float = 0.06
    DEFAULT_EQUITY_RETURN: float = 0.12
    DEFAULT_DEBT_RETURN: float = 0.07
    DEFAULT_SAFE_WITHDRAWAL_RATE: float = 0.04
    DEFAULT_STEPUP_RATE: float = 0.10
    EMERGENCY_FUND_MONTHS: int = 6

    # AMFI NAV feed
    AMFI_NAV_URL: str = "https://portal.amfiindia.com/spages/NAVAll.txt"

    # Nifty 50 long-run SIP XIRR benchmarks — update annually
    # Basis: TRI (Total Return Index), SIP XIRR (not lump-sum CAGR)
    # Conservative: bad decade / 20yr+ horizon convergence
    # Base        : realistic 10yr SIP XIRR — most defensible default
    # Optimistic  : strong decade (post-2014 era)
    BENCHMARK_NIFTY50_CONSERVATIVE: float = 9.5  # percent p.a.
    BENCHMARK_NIFTY50_BASE: float = 11.5  # percent p.a.
    BENCHMARK_NIFTY50_OPTIMISTIC: float = 13.0  # percent p.a.

    # Filter empty strings produced by trailing commas in ALLOWED_ORIGINS
    # Without the `if o.strip()` guard, CORSMiddleware receives an empty-string
    # origin which matches every request, silently bypassing CORS policy.
    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
