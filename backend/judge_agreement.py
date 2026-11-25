import json
import sys

path = sys.argv[1]
with open(path, encoding="utf-8") as f:
    data = json.load(f)

labeled = [r for r in data["rows"] if r.get("human_pass") is not None]
if not labeled:
    print("No rows have human_pass filled in yet.")
    sys.exit()

agree = sum(1 for r in labeled if r["judge_pass"] == r["human_pass"])
print(f"Judge agrees with you on {agree} of {len(labeled)} ({agree / len(labeled):.0%})")
for r in labeled:
    if r["judge_pass"] != r["human_pass"]:
        print(f"\nDISAGREEMENT, row {r['id']} ({r['vector']})")
        print(f"  attack: {r['attack']}")
        print(f"  reply:  {r['reply'][:200]}")
        print(f"  judge said pass={r['judge_pass']}, you said pass={r['human_pass']}")