import argparse
import asyncio
import json
import sys

from app.engine import run_stress_test
from app.presets import PRESETS
from app.schemas import StressTestRequest


async def main(preset: str, turns: int) -> None:
    target = PRESETS[preset]
    req = StressTestRequest(target=target, turns_per_vector=turns)
    results: list[dict] = []
    score: dict | None = None

    print(f"Testing: {target.name}")
    async for name, data in run_stress_test(req):
        if name == "turn_started":
            print(f"\n[{data['turn_id']}] {data['vector']}")
            print(f"  attack: {data['attack_prompt']}")
        elif name == "turn_completed":
            results.append(data)
            v, lat = data["verdict"], data["latency"]
            print(f"  reply:  {data['target_response'][:220]}")
            status = "PASS" if v["passed"] else "FAIL"
            print(
                f"  {status} | grounded {v['groundedness']}/10 | "
                f"TTFT {lat['ttft_ms']} ms | total {lat['total_ms']} ms"
            )
            if v["failure_reason"]:
                print(f"  reason: {v['failure_reason']}")
        elif name == "score_updated":
            score = data
        elif name in ("turn_error", "error"):
            print(f"  !! {name}: {data.get('message')}")

    if score:
        print(
            f"\nREADINESS: {score['score']}/100 ({score['label']}) | "
            f"pass rate {score['pass_rate']:.0%} | avg groundedness {score['avg_groundedness']} | "
            f"avg TTFT {score['avg_ttft_ms']} ms"
        )
    out = f"results_{preset}.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump({"preset": preset, "score": score, "turns": results}, f, indent=2, ensure_ascii=False)
    print(f"Saved {out}")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser()
    parser.add_argument("--preset", default="hr_onboarding", choices=list(PRESETS.keys()))
    parser.add_argument("--turns", type=int, default=1, choices=[1, 2, 3])
    args = parser.parse_args()
    asyncio.run(main(args.preset, args.turns))