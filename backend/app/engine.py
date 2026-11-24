import logging
import time
from collections.abc import AsyncIterator
from typing import Any

from .attacker import generate_attack
from .judge import JudgeError, judge_turn
from .llm import ProviderError, stream_chat
from .schemas import AttackVector, Latency, StressTestRequest, TargetConfig, TurnResult
from .scoring import compute_readiness

log = logging.getLogger("crashlab")

Event = tuple[str, dict[str, Any]]


def build_target_system(target: TargetConfig) -> str:
    if target.reference_document.strip():
        return f"{target.system_prompt}\n\nREFERENCE POLICY DOCUMENT:\n{target.reference_document}"
    return target.system_prompt


async def _run_turn(
    turn_id: int,
    vector: AttackVector,
    target: TargetConfig,
    system: str,
    previous: dict[AttackVector, list[str]],
    done: list[TurnResult],
) -> AsyncIterator[Event]:
    yield "attack_generating", {"turn_id": turn_id, "vector": vector.value}
    attack = await generate_attack(target, vector, previous[vector])
    previous[vector].append(attack)
    yield "turn_started", {"turn_id": turn_id, "vector": vector.value, "attack_prompt": attack}

    started = time.perf_counter()
    first: float | None = None
    parts: list[str] = []
    async for piece in stream_chat(system, attack):
        if first is None:
            first = time.perf_counter()
        parts.append(piece)
        yield "target_delta", {"turn_id": turn_id, "text": piece}
    ended = time.perf_counter()

    response = "".join(parts).strip()
    if not response or first is None:
        yield "turn_error", {
            "turn_id": turn_id,
            "message": "The target returned no visible reply. Try raising MAX_TOKENS in .env.",
        }
        return

    latency = Latency(
        ttft_ms=round((first - started) * 1000, 1),
        total_ms=round((ended - started) * 1000, 1),
    )

    yield "judge_started", {"turn_id": turn_id}
    try:
        verdict = await judge_turn(target, vector, attack, response)
    except JudgeError as exc:
        yield "turn_error", {"turn_id": turn_id, "message": str(exc)}
        return

    turn = TurnResult(
        turn_id=turn_id,
        vector=vector,
        attack_prompt=attack,
        target_response=response,
        latency=latency,
        verdict=verdict,
    )
    done.append(turn)
    yield "turn_completed", turn.model_dump(mode="json")
    yield "score_updated", compute_readiness(done).model_dump(mode="json")


async def run_stress_test(req: StressTestRequest) -> AsyncIterator[Event]:
    target = req.target
    vectors = req.vectors or list(AttackVector)
    total = len(vectors) * req.turns_per_vector

    yield "run_started", {
        "target": target.name,
        "vectors": [v.value for v in vectors],
        "total_turns": total,
    }

    system = build_target_system(target)
    done: list[TurnResult] = []
    previous: dict[AttackVector, list[str]] = {v: [] for v in vectors}
    turn_id = 0

    try:
        for vector in vectors:
            for _ in range(req.turns_per_vector):
                turn_id += 1
                async for event in _run_turn(turn_id, vector, target, system, previous, done):
                    yield event
    except ProviderError as exc:
        yield "error", {"message": str(exc)}
        return
    except Exception:
        log.exception("Unexpected error during stress test")
        yield "error", {"message": "Unexpected server error. Check the server log."}
        return

    yield "run_completed", {
        "turns": len(done),
        "skipped": total - len(done),
        "score": compute_readiness(done).model_dump(mode="json"),
    }