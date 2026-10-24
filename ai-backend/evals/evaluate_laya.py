"""Score Laya's move selection against a small hand-labeled debate baseline.

This measures agreement with human labels on 24 turns. It does not measure
whether the chosen move improved a learner's practice.

Run after installing the `laya` extra and downloading the checkpoint:
    cd ai-backend && uv run python evals/evaluate_laya.py
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from collections import Counter
from pathlib import Path

DATA = Path(__file__).with_name("laya_moves.jsonl")
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
        if not isinstance(row.get("history"), list):
            problems.append(f"{label}: history must be a list")
        if row.get("expected_move") not in moves:
            problems.append(f"{label}: expected_move is not a supported move")
    return problems


async def evaluate(rows: list[dict]) -> tuple[list[dict], int]:
    from app.agents.laya_selector import select_move

    results: list[dict] = []
    no_move = 0
    for row in rows:
        move = await select_move(
            row["topic"],
            row["learner_position"],
            row["persona"],
            row["difficulty"],
            row.get("history") or [],
            row["latest"],
        )
        if move is None:
            no_move += 1
        results.append({**row, "predicted_move": move, "correct": move == row["expected_move"]})
    return results, no_move


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, default=0, help="Evaluate only the first N rows.")
    parser.add_argument("--json", action="store_true", help="Print machine-readable results.")
    args = parser.parse_args()

    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    try:
        from app.agents.laya_selector import MOVE_INSTRUCTIONS, is_available
    except ImportError as error:
        print(f"Could not import the selector: {error}", file=sys.stderr)
        return 2

    rows = load_rows()
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
            "Laya is not installed or ENABLE_LAYA_TACTICS is false. "
            "Install the laya extra, then rerun this script.",
            file=sys.stderr,
        )
        return 2

    results, no_move = asyncio.run(evaluate(rows))
    correct = sum(1 for result in results if result["correct"])
    accuracy = correct / len(results) if results else 0.0
    confusion = Counter(
        (result["expected_move"], result["predicted_move"] or "no_move") for result in results
    )
    if args.json:
        print(
            json.dumps(
                {
                    "turns": len(results),
                    "correct": correct,
                    "accuracy": round(accuracy, 3),
                    "no_move": no_move,
                    "confusion": {f"{a}->{b}": n for (a, b), n in confusion.items()},
                    "results": results,
                },
                indent=2,
            )
        )
        return 0

    print(f"Labeled turns: {len(results)}")
    print(f"Move agreement: {correct}/{len(results)} ({accuracy:.1%})")
    print(f"No move returned: {no_move}")
    print("\nExpected -> predicted:")
    for (expected, predicted), count in sorted(confusion.items()):
        print(f"  {expected} -> {predicted}: {count}")
    misses = [result for result in results if not result["correct"]]
    if misses:
        print("\nMisses:")
        for result in misses:
            print(
                f"  {result['id']}: expected {result['expected_move']}, "
                f"got {result['predicted_move'] or 'no_move'} — {result['note']}"
            )
    print(
        f"\nBaseline only: {len(results)} turns is too small to claim coaching accuracy, "
        "and label agreement is not learner improvement."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
