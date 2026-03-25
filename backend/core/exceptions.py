"""
core/exceptions.py
All custom exceptions for the application.
Centralising here prevents scattered try/except anti-patterns.
"""


class MoneyMentorError(Exception):
    """Base exception for all domain errors."""

    def __init__(self, message: str, code: str = "INTERNAL_ERROR"):
        super().__init__(message)
        self.message = message
        self.code = code


class ValidationError(MoneyMentorError):
    def __init__(self, message: str):
        super().__init__(message, code="VALIDATION_ERROR")


class FinanceEngineError(MoneyMentorError):
    def __init__(self, message: str):
        super().__init__(message, code="FINANCE_ENGINE_ERROR")


class AgentError(MoneyMentorError):
    def __init__(self, message: str):
        super().__init__(message, code="AGENT_ERROR")


class LLMUnavailableError(AgentError):
    """Raised when Groq/LLM API is down — triggers graceful degradation."""

    def __init__(self):
        super().__init__("LLM service temporarily unavailable. Returning deterministic results.")
