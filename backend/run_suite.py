import argparse
import asyncio
import json
import sys
import time

from app.engine import build_target_system
from app.judge import JudgeError, judge_turn
from app.llm import ProviderError, stream_chat
from app.presets import PRESETS
from app.schemas import AttackVector, Latency, TurnResult
from app.scoring import compute_readiness


async def run_case(target, system, turn_id, vector, attack) -> TurnResult:
    started = time.perf_counter()
    first = None
    parts: list[str] = []
    async for piece in stream_chat(system, attack):
        if first is None:
            first = time.perf_counter()
        parts.append(piece)
    ended = time.perf_counter()

    response = "".join(parts).strip()
    if not response or first is None:
        raise RuntimeError("the target returned an empty reply")

    latency = Latency(
        ttft_ms=round((first - started) * 1000, 1),
        total_ms=round((ended - started) * 1000, 1),
    )
    verdict = await judge_turn(target, vector, attack, response)
    return TurnResult(
        turn_id=turn_id,
        vector=vector,
        attack_prompt=attack,
        target_response=response,
        latency=latency,
        verdict=verdict,
    )


async def main(preset: str, suite_path: str, repeats: int) -> None:
    target = PRESETS[preset]
    system = build_target_system(target)
    with open(suite_path, encoding="utf-8") as f:
        suite = json.load(f)

    turns: list[TurnResult] = []
    rows: list[dict] = []
    turn_id = 0
    print(f"Suite: {len(suite)} attacks x {repeats} repeat(s) against {target.name}\n")

    for rep in range(1, repeats + 1):
        for item in suite:
            turn_id += 1
            vector = AttackVector(item["vector"])
            try:
                turn = await run_case(target, system, turn_id, vector, item["attack"])
            except (ProviderError, JudgeError, RuntimeError) as exc:
                print(f"[{turn_id}] SKIPPED ({vector.value}): {exc}")
                continue
            turns.append(turn)
            status = "PASS" if turn.verdict.passed else "FAIL"
            print(f"[{turn_id}] {status} {vector.value} (grounded {turn.verdict.groundedness}/10)")
            rows.append(
                {
                    "id": turn_id,
                    "repeat": rep,
                    "vector": vector.value,
                    "attack": item["attack"],
                    "reply": turn.target_response,
                    "judge_pass": turn.verdict.passed,
                    "judge_reason": turn.verdict.failure_reason,
                    "ttft_ms": turn.latency.ttft_ms,
                    "human_pass": None,
                }
            )

    score = compute_readiness(turns)
    print("\nBy attack type:")
    for v in AttackVector:
        mine = [t for t in turns if t.vector == v]
        if mine:
            passed = sum(1 for t in mine if t.verdict.passed)
            print(f"  {v.value}: {passed}/{len(mine)} passed")
    print(
        f"\nREADINESS: {score.score}/100 ({score.label}) | pass rate {score.pass_rate:.0%} | "
        f"avg groundedness {score.avg_groundedness} | avg TTFT {score.avg_ttft_ms} ms"
    )

    out = f"suite_results_{preset}.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(
            {"preset": preset, "score": score.model_dump(mode="json"), "rows": rows},
            f,
            indent=2,
            ensure_ascii=False,
        )
    print(f"Saved {out}")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser()
    parser.add_argument("--preset", default="hr_onboarding", choices=list(PRESETS.keys()))
    parser.add_argument("--suite", default="suite.json")
    parser.add_argument("--repeats", type=int, default=1)
    args = parser.parse_args()
    asyncio.run(main(args.preset, args.suite, args.repeats))