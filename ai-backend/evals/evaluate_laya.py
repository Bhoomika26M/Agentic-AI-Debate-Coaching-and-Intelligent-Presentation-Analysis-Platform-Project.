"""Score the tactical selector against a small hand-labeled debate baseline.

The selector uses argument-shape rules first and Laya only for ambiguous turns.
Results are reported separately for those paths. This measures agreement with
human labels on a small hand-labeled set; it does not measure whether a move
improved practice.

Without Laya the script scores the argument policy only. To include the
checkpoint, install the extra and enable it, then run the tuning set:
    cd ai-backend && ENABLE_LAYA_TACTICS=true uv run --extra laya python evals/evaluate_laya.py

Run the separate held-out check:
    cd ai-backend && ENABLE_LAYA_TACTICS=true uv run --extra laya \
        python evals/evaluate_laya.py --data evals/laya_holdout.jsonl
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from collections import Counter
from pathlib import Path

DATA = Path(__file__).with_name("laya_moves.jsonl")
HOLDOUT = Path(__file__).with_name("laya_holdout.jsonl")
PERSONAS = {"strategist", "skeptic", "diplomat"}
DIFFICULTIES = {"warm-up", "challenge", "cross-examination"}
POSITIONS = {"for", "against"}


def load_rows(path: Path = DATA) -> list[dict]:
    rows: list[dict] = []
    for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError as error:
            raise ValueError(f"{path}:{number} is not valid JSON: {error}") from error
    return rows


def validate_rows(rows: list[dict], moves: set[str]) -> list[str]:
    problems: list[str] = []
    seen: set[str] = set()
    for index, row in enumerate(rows, start=1):
        label = row.get("id") or f"row {index}"
        if label in seen:
            problems.append(f"{label}: duplicate id")
        seen.add(label)
        if not str(row.get("topic", "")).strip():
            problems.append(f"{label}: topic is empty")
        if row.get("learner_position") not in POSITIONS:
            problems.append(f"{label}: learner_position is invalid")
        if row.get("persona") not in PERSONAS:
            problems.append(f"{label}: persona is invalid")
        if row.get("difficulty") not in DIFFICULTIES:
            problems.append(f"{label}: difficulty is invalid")
        if not str(row.get("latest", "")).strip():
            problems.append(f"{label}: latest turn is empty")
        history = row.get("history")
        if not isinstance(history, list):
            problems.append(f"{label}: history must be a list")
        else:
            for turn in history:
                if not isinstance(turn, dict):
                    problems.append(f"{label}: every history turn must be an object")
                    continue
                if turn.get("speaker") not in {"learner", "opponent"}:
                    problems.append(f"{label}: history speaker is invalid")
                if not str(turn.get("content", "")).strip():
                    problems.append(f"{label}: history content is empty")
                if "kind" in turn and turn["kind"] not in {"standard", "challenge"}:
                    problems.append(f"{label}: history kind is invalid")
        expected = row.get("expected_move")
        if expected not in moves:
            problems.append(f"{label}: expected_move is not a supported move")
        acceptable = row.get("acceptable_moves", [expected])
        if not isinstance(acceptable, list) or not acceptable:
            problems.append(f"{label}: acceptable_moves must be a non-empty list")
        else:
            unknown = [move for move in acceptable if move not in moves]
            if unknown:
                problems.append(f"{label}: acceptable_moves has unsupported moves {unknown}")
            if expected not in acceptable:
                problems.append(f"{label}: expected_move is missing from acceptable_moves")
            if len(set(acceptable)) != len(acceptable):
                problems.append(f"{label}: acceptable_moves repeats a move")
    return problems


async def evaluate(rows: list[dict]) -> tuple[list[dict], int]:
    from app.agents.laya_selector import rule_based_move, select_move

    results: list[dict] = []
    no_move = 0
    for row in rows:
        history = row.get("history") or []
        move = await select_move(
            row["topic"],
            row["learner_position"],
            row["persona"],
            row["difficulty"],
            history,
            row["latest"],
        )
        if move is None:
            no_move += 1
        acceptable = row.get("acceptable_moves") or [row["expected_move"]]
        results.append(
            {
                **row,
                "acceptable_moves": acceptable,
                "predicted_move": move,
                "correct": move == row["expected_move"],
                "acceptable": move in acceptable,
                "source": (
                    "policy"
                    if rule_based_move(history, row["latest"])
                    else "laya" if move else "none"
                ),
            }
        )
    return results, no_move


def wilson_interval(correct: int, total: int) -> tuple[float, float]:
    if total == 0:
        return 0.0, 0.0
    z = 1.96
    p = correct / total
    denominator = 1 + z * z / total
    center = (p + z * z / (2 * total)) / denominator
    margin = z * ((p * (1 - p) / total + z * z / (4 * total * total)) ** 0.5) / denominator
    return max(0.0, center - margin), min(1.0, center + margin)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=DATA, help="JSONL evaluation set to score.")
    parser.add_argument("--limit", type=int, default=0, help="Evaluate only the first N rows.")
    parser.add_argument("--json", action="store_true", help="Print machine-readable results.")
    args = parser.parse_args()

    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    try:
        from app.agents.laya_selector import MOVE_INSTRUCTIONS, is_available
    except ImportError as error:
        print(f"Could not import the selector: {error}", file=sys.stderr)
        return 2

    rows = load_rows(args.data)
    problems = validate_rows(rows, set(MOVE_INSTRUCTIONS))
    if problems:
        print("The evaluation set is invalid:", file=sys.stderr)
        for problem in problems:
            print(f"- {problem}", file=sys.stderr)
        return 2
    if args.limit > 0:
        rows = rows[: args.limit]
    if not is_available():
        print(
            "Laya is not installed or ENABLE_LAYA_TACTICS is false; "
            "evaluating the argument policy only. Install the laya extra and set "
            "ENABLE_LAYA_TACTICS=true to include the ambiguous turns.",
            file=sys.stderr,
        )

    results, no_move = asyncio.run(evaluate(rows))
    total = len(results)
    correct = sum(1 for result in results if result["correct"])
    acceptable_correct = sum(1 for result in results if result["acceptable"])
    accuracy = correct / total if total else 0.0
    acceptable_accuracy = acceptable_correct / total if total else 0.0
    strict_ci = wilson_interval(correct, total)
    acceptable_ci = wilson_interval(acceptable_correct, total)
    confusion = Counter(
        (result["expected_move"], result["predicted_move"] or "no_move") for result in results
    )
    if args.json:
        print(
            json.dumps(
                {
                    "set": str(args.data),
                    "turns": total,
                    "correct": correct,
                    "accuracy": round(accuracy, 3),
                    "accuracy_ci95": [round(value, 3) for value in strict_ci],
                    "acceptable_correct": acceptable_correct,
                    "acceptable_accuracy": round(acceptable_accuracy, 3),
                    "acceptable_accuracy_ci95": [round(value, 3) for value in acceptable_ci],
                    "no_move": no_move,
                    "confusion": {f"{a}->{b}": n for (a, b), n in confusion.items()},
                    "results": results,
                },
                indent=2,
            )
        )
        return 0

    policy = [result for result in results if result["source"] == "policy"]
    laya = [result for result in results if result["source"] == "laya"]
    policy_correct = sum(1 for result in policy if result["correct"])
    laya_correct = sum(1 for result in laya if result["correct"])
    print(f"Evaluation set: {args.data}")
    print(f"Labeled turns: {total}")
    print(
        f"Strict agreement: {correct}/{total} ({accuracy:.1%}; "
        f"95% CI {strict_ci[0]:.1%}-{strict_ci[1]:.1%})"
    )
    print(
        f"Acceptable agreement: {acceptable_correct}/{total} ({acceptable_accuracy:.1%}; "
        f"95% CI {acceptable_ci[0]:.1%}-{acceptable_ci[1]:.1%})"
    )
    print(f"No move returned: {no_move}")
    print(f"Policy-routed: {policy_correct}/{len(policy)}")
    if laya:
        print(f"Laya-routed: {laya_correct}/{len(laya)}")
    else:
        print("Laya-routed: not evaluated (disabled or not installed)")
    print("\nExpected -> predicted:")
    for (expected, predicted), count in sorted(confusion.items()):
        print(f"  {expected} -> {predicted}: {count}")
    misses = [result for result in results if not result["correct"]]
    if misses:
        print("\nMisses:")
        for result in misses:
            note = "acceptable alternative" if result["acceptable"] else "not acceptable"
            print(
                f"  {result['id']}: expected {result['expected_move']}, "
                f"got {result['predicted_move'] or 'no_move'} ({note}) — {result['note']}"
            )
    print(
        f"\nBaseline only: {total} turns is too small to claim coaching accuracy, "
        "and label agreement is not learner improvement. The tuning set shaped the "
        "policy; report held-out results separately from that baseline."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
