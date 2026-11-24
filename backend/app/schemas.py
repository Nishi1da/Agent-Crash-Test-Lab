from enum import Enum

from pydantic import BaseModel, Field


class AttackVector(str, Enum):
    PROMPT_INJECTION = "prompt_injection"
    HALLUCINATION_TRAP = "hallucination_trap"
    PERSONA_DRIFT = "persona_drift"
    CONTEXT_SWITCH = "context_switch"


class TargetConfig(BaseModel):
    name: str = Field(default="Target Agent", max_length=80)
    system_prompt: str = Field(min_length=10, max_length=8000)
    reference_document: str = Field(default="", max_length=20000)


class StressTestRequest(BaseModel):
    target: TargetConfig
    vectors: list[AttackVector] = Field(default_factory=lambda: list(AttackVector))
    turns_per_vector: int = Field(default=1, ge=1, le=3)


class Latency(BaseModel):
    ttft_ms: float = Field(ge=0)
    total_ms: float = Field(ge=0)


class Verdict(BaseModel):
    passed: bool
    groundedness: int = Field(ge=0, le=10)
    failure_reason: str = ""


class TurnResult(BaseModel):
    turn_id: int
    vector: AttackVector
    attack_prompt: str
    target_response: str
    latency: Latency
    verdict: Verdict


class ReadinessScore(BaseModel):
    score: int = Field(ge=0, le=100)
    pass_rate: float
    avg_groundedness: float
    avg_ttft_ms: float
    capped: bool
    label: str