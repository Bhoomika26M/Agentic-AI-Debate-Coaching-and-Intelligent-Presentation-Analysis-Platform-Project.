"""Measure fallacy detection precision and recall on hand-labelled snippets.

Each row is one labelled learner statement: one of the eight supported fallacy
types, or `none` for a well-formed argument. The script runs the same fallacy
branch the product runs, including the verbatim-quote filter, then reports
per-flag precision/recall plus per-type recall.

Labels are the author's reading of the snippet, not a community adjudication,
and 50 snippets is a small set. Report these numbers as a baseline, not as
proof the coaching is accurate.

Usage:
    cd ai-backend && uv run python evals/evaluate_fallacies.py
    cd ai-backend && uv run python evals/evaluate_fallacies.py --check
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from collections import Counter
from pathlib import Path

DATA = Path(__file__).with_name("fallacy_snippets.jsonl")
LABELS = {
    "Ad Hominem",
    "Straw Man",
    "False Dilemma",
    "Slippery Slope",
    "Appeal to Authority",
    "Circular Reasoning",
    "Hasty Generalization",
    "Red Herring",
}
NONE = "none"


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


def validate_rows(rows: list[dict]) -> list[str]:
    problems: list[str] = []
    seen: set[str] = set()
    for index, row in enumerate(rows, start=1):
        label = row.get("id") or f"row {index}"
        if label in seen:
            problems.append(f"{label}: duplicate id")
        seen.add(label)
        if row.get("label") not in LABELS | {NONE}:
            problems.append(f"{label}: label is not a supported fallacy type or 'none'")
        if not str(row.get("snippet", "")).strip():
            problems.append(f"{label}: snippet is empty")
        if len(str(row.get("snippet", "")).split()) < 6:
            problems.append(f"{label}: snippet is too short to judge")
        if not str(row.get("topic", "")).strip():
            problems.append(f"{label}: topic is empty")
        if row.get("learner_position") not in {"for", "against"}:
            problems.append(f"{label}: learner_position is invalid")
        if not str(row.get("why", "")).strip():
            problems.append(f"{label}: missing the labelling rationale")
    return problems


def wilson_interval(successes: int, total: int) -> tuple[float, float]:
    if total == 0:
        return 0.0, 0.0
    z = 1.96
    p = successes / total
    denominator = 1 + z * z / total
    center = (p + z * z / (2 * total)) / denominator
    margin = z * ((p * (1 - p) / total + z * z / (4 * total * total)) ** 0.5) / denominator
    return max(0.0, center - margin), min(1.0, center + margin)


def score(rows: list[dict], predictions: dict[str, dict]) -> dict:
    """Score flag-level precision/recall from already-grounded predictions.

    `predictions[id]` is `{"labels": [...], "dropped": int, "error": str | None}`.
    A label predicted on a clean snippet, or a second label on a flagged one, is
    a false positive; a missed expected label is a false negative.
    """
    tp = fp = fn = dropped = errors = 0
    hits = 0
    per_type: dict[str, dict] = {
        label: {"rows": 0, "found": 0, "false_positives": 0} for label in sorted(LABELS)
    }
    misses: list[dict] = []
    false_positives: list[dict] = []
    for row in rows:
        expected = row["label"]
        entry = predictions.get(row["id"], {})
        predicted = list(dict.fromkeys(entry.get("labels", [])))
        dropped += int(entry.get("dropped", 0))
        if entry.get("error"):
            errors += 1
        if expected == NONE:
            if not predicted:
                hits += 1
            for label in predicted:
                fp += 1
                if label in per_type:
                    per_type[label]["false_positives"] += 1
                false_positives.append({"id": row["id"], "predicted": label, "expected": NONE})
            continue
        per_type[expected]["rows"] += 1
        for label in predicted:
            if label == expected:
                tp += 1
                per_type[expected]["found"] += 1
            else:
                fp += 1
                if label in per_type:
                    per_type[label]["false_positives"] += 1
                false_positives.append(
                    {"id": row["id"], "predicted": label, "expected": expected}
                )
        if expected in predicted:
            hits += 1
        else:
            fn += 1
            misses.append(
                {"id": row["id"], "expected": expected, "predicted": predicted}
            )
    precision = tp / (tp + fp) if tp + fp else None
    recall = tp / (tp + fn) if tp + fn else None
    f1 = (
        2 * precision * recall / (precision + recall)
        if precision is not None and recall is not None and precision + recall
        else None
    )
    return {
        "snippets": len(rows),
        "hits": hits,
        "detection_accuracy": round(hits / len(rows), 3) if rows else 0.0,
        "true_positives": tp,
        "false_positives": fp,
        "false_negatives": fn,
        "precision": None if precision is None else round(precision, 3),
        "recall": None if recall is None else round(recall, 3),
        "f1": None if f1 is None else round(f1, 3),
        "precision_ci95": (
            None
            if precision is None
            else [round(value, 3) for value in wilson_interval(tp, tp + fp)]
        ),
        "recall_ci95": (
            None
            if recall is None
            else [round(value, 3) for value in wilson_interval(tp, tp + fn)]
        ),
        "quotes_dropped_as_not_verbatim": dropped,
        "rows_with_model_error": errors,
        "per_type": per_type,
        "misses": misses,
        "false_positive_flags": false_positives,
    }


async def evaluate(rows: list[dict]) -> dict[str, dict]:
    from app.agents.analysis_graph import (
        FALLACY_INSTRUCTIONS,
        FALLACY_TASK,
        _run_branch,
        keep_grounded,
    )
    from app.schemas import AnalysisRequest, FallacyBranch

    predictions: dict[str, dict] = {}
    for row in rows:
        request = AnalysisRequest(
            topic=row["topic"],
            learner_position=row["learner_position"],
            turns=[{"speaker": "learner", "content": row["snippet"]}],
        )
        report, problem = await _run_branch(
            FallacyBranch, request, FALLACY_INSTRUCTIONS, FALLACY_TASK
        )
        if report is None:
            predictions[row["id"]] = {"labels": [], "dropped": 0, "error": problem}
            continue
        kept = keep_grounded(report.fallacies, row["snippet"])
        predictions[row["id"]] = {
            "labels": [flag.label for flag in kept],
            "dropped": len(report.fallacies) - len(kept),
            "error": None,
        }
    return predictions


def _percent(value: float | None) -> str:
    return "n/a" if value is None else f"{value:.1%}"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=DATA, help="JSONL snippet set to score.")
    parser.add_argument("--limit", type=int, default=0, help="Score only the first N rows.")
    parser.add_argument("--json", action="store_true", help="Print machine-readable results.")
    parser.add_argument(
        "--check", action="store_true", help="Validate the set only; no model calls."
    )
    args = parser.parse_args()

    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    try:
        rows = load_rows(args.data)
    except (OSError, ValueError) as error:
        print(f"Could not read the snippet set: {error}", file=sys.stderr)
        return 2
    problems = validate_rows(rows)
    if problems:
        print("The snippet set is invalid:", file=sys.stderr)
        for problem in problems:
            print(f"- {problem}", file=sys.stderr)
        return 2
    if args.check:
        counts = Counter(row["label"] for row in rows)
        print(f"{args.data}: {len(rows)} labelled snippets, no model calls made.")
        for label, count in sorted(counts.items()):
            print(f"  {label}: {count}")
        return 0
    if args.limit > 0:
        rows = rows[: args.limit]

    from app.providers import is_available, unavailable_hint

    if not asyncio.run(is_available()):
        print(f"The model is unavailable: {unavailable_hint()}", file=sys.stderr)
        return 2

    predictions = asyncio.run(evaluate(rows))
    results = score(rows, predictions)
    if args.json:
        print(json.dumps(results, indent=2))
        return 0

    print(f"Snippet set: {args.data}")
    print(f"Labelled snippets: {results['snippets']}")
    print(
        f"Precision: {_percent(results['precision'])} "
        f"({results['true_positives']} TP, {results['false_positives']} FP)"
        + ("" if results["precision"] is None else f", 95% CI {results['precision_ci95']}")
    )
    print(
        f"Recall: {_percent(results['recall'])} "
        f"({results['true_positives']} TP, {results['false_negatives']} FN)"
        + ("" if results["recall"] is None else f", 95% CI {results['recall_ci95']}")
    )
    print(f"F1: {_percent(results['f1'])}")
    print(
        f"Per-snippet detection: {results['hits']}/{results['snippets']} "
        f"({_percent(results['detection_accuracy'])})"
    )
    print(f"Quotes dropped as not verbatim: {results['quotes_dropped_as_not_verbatim']}")
    if results["rows_with_model_error"]:
        print(f"Rows with a model error: {results['rows_with_model_error']}")
    print("\nPer type:")
    for label, entry in results["per_type"].items():
        print(
            f"  {label}: found {entry['found']}/{entry['rows']} · "
            f"false positives {entry['false_positives']}"
        )
    if results["misses"]:
        print("\nMissed fallacies:")
        for miss in results["misses"]:
            got = ", ".join(miss["predicted"]) or "nothing"
            print(f"  {miss['id']}: expected {miss['expected']}, predicted {got}")
    if results["false_positive_flags"]:
        print("\nFalse positives:")
        for flag in results["false_positive_flags"]:
            print(f"  {flag['id']}: {flag['predicted']} (expected {flag['expected']})")
    print(
        "\nBaseline only: 50 author-labelled snippets do not establish coaching "
        "accuracy, and a flag counts as correct when its type matches — the quote "
        "is only checked for being verbatim."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
