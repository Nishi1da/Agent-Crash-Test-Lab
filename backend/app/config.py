import os
from dataclasses import dataclass
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    provider: str
    groq_api_key: str
    groq_model: str
    anthropic_api_key: str
    anthropic_model: str
    judge_model: str
    allowed_origins: list[str]
    max_tokens: int

    @property
    def api_key(self) -> str:
        return self.groq_api_key if self.provider == "groq" else self.anthropic_api_key

    @property
    def model(self) -> str:
        return self.groq_model if self.provider == "groq" else self.anthropic_model

    @property
    def judge(self) -> str:
        return self.judge_model or self.model


@lru_cache
def get_settings() -> Settings:
    provider = os.getenv("LLM_PROVIDER", "groq").strip().lower()
    if provider not in {"groq", "anthropic"}:
        raise RuntimeError("LLM_PROVIDER must be 'groq' or 'anthropic'")

    origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
    return Settings(
        provider=provider,
        groq_api_key=os.getenv("GROQ_API_KEY", "").strip(),
        groq_model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile").strip(),
        anthropic_api_key=os.getenv("ANTHROPIC_API_KEY", "").strip(),
        anthropic_model=os.getenv("ANTHROPIC_MODEL", "claude-sonnet-5-5").strip(),
        judge_model=os.getenv("JUDGE_MODEL", "").strip(),
        allowed_origins=[o.strip() for o in origins.split(",") if o.strip()],
        max_tokens=int(os.getenv("MAX_TOKENS", "400")),
    )