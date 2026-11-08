"""Time the scorecard path against the local model.

The scorecard waits for the review, then the deterministic judge. Before this
change it also waited for the practice-plan refresh. This benchmark measures:

* the review with the old 1400-token branch caps and with the current caps,
* the deterministic judge,
* the model-written plan refresh that used to block the scorecard.

Run from ai-backend:

    uv run python evals/measure_scorecard.py --runs 2

The result models the old sequence (analysis + plan + judge) and the new one
(analysis + judge, plan in the background). Supabase writes are not included.
"""

import argparse
import asyncio
import statistics
import sys
import time
from pathlib import Path

# Run as `uv run python evals/measure_scorecard.py` from ai-backend.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.agents import analysis_graph as analysis_module  # noqa: E402
from app.agents.judge import judge_with_graph  # noqa: E402
from app.agents.plan_graph import coach_plan  # noqa: E402
from app.providers import warm  # noqa: E402
from app.schemas import AnalysisRequest, PlanRequest  # noqa: E402

TURNS = [
    (
        "learner",
        "Schools should ban phones because attention improves when devices are away. "
        "A district pilot found fewer classroom interruptions after a bell-to-bell ban.",
    ),
    (
        "opponent",
        "A pilot can reflect better teaching or a quieter intake. Which part of the "
        "improvement do you attribute to the ban itself?",
    ),
    (
        "learner",
        "The ban is the only change that applies to every lesson. Teachers reported fewer "
        "off-task minutes in the same classrooms, with the same staff.",
    ),
    (
        "opponent",
        "Reports are not a measurement. What independent observation shows focus improving?",
    ),
    (
        "learner",
        "The district tracked off-task minutes in 120 classrooms and found a 12 percent drop. "
        "That is an independent observation, though it is not a randomised trial.",
    ),
    (
        "opponent",
        "A 12 percent drop could come from the novelty of a new rule. How would you separate "
        "novelty from a lasting effect?",
    ),
    (
        "learner",
        "I would compare the second term to the first. If the gain fades, novelty is doing "
        "the work; if it holds, the ban is.",
    ),
    (
        "opponent",
        "You have moved from a ban to a study design. Does the ban still do the work in "
        "your case?",
    ),
    (
        "learner",
        "Yes, because the mechanism is simple: removing the device removes the cue. The "
        "study tests the size of the effect, not whether the cue exists.",
    ),
    (
        "opponent",
        "Then a softer rule, like phone lockers at the door, should capture the same cue "
        "without a ban. Why ban instead?",
    ),
    (
        "learner",
        "A locker rule is a ban in practice. The question is whether the rule is enforced; "
        "without enforcement, the cue returns.",
    ),
    (
        "opponent",
        "Enforcement is a cost you have not counted. Who pays for it, and what is lost?",
    ),
    (
        "learner",
        "The school already pays for supervision. The cost is one staff member at the door, "
        "and the benefit is fewer interruptions in every lesson.",
    ),
    (
        "opponent",
        "One staff member at one door is a small sample. What happens in a school with "
        "several entrances?",
    ),
    (
        "learner",
        "The pilot covered three schools with multiple entrances, and the drop held. The "
        "staffing cost scaled with entrances, not with the number of students.",
    ),
    (
        "opponent",
        "Then your case depends on the pilot's staffing numbers. Can you name the cost per "
        "school without guessing?",
    ),
]

CLOSING = (
    "A ban works because it removes the cue, not because it is dramatic. The district's "
    "12 percent drop is evidence of the size, and the second-term comparison will show "
    "whether it lasts. The staffing cost is real, but it is one door and every lesson."
)


def analysis_request() -> AnalysisRequest:
    return AnalysisRequest(
        topic="Should schools ban phones?",
        learner_position="for",
        turns=[{"speaker": speaker, "content": content} for speaker, content in TURNS],
        closing_statement=CLOSING,
        persona="skeptic",
        difficulty="challenge",
    )


def plan_request() -> PlanRequest:
    ratings = {
        "clarity": {"score": 3, "note": "The case is understandable but repetitive."},
        "relevance": {"score": 4, "note": "Stays close to the motion."},
        "evidence_strength": {"score": 2, "note": "One pilot carries most of the proof."},
        "logical_consistency": {"score": 3, "note": "The novelty objection is partly answered."},
        "persuasiveness": {"score": 3, "note": "The mechanism is clear, the cost is thin."},
    }
    digests = [
        {
            "ratings": ratings,
            "fallacy_labels": ["Hasty Generalization"],
            "filler_rate_per_100w": 4.2,
        },
        {
            "ratings": {
                key: {**value, "score": max(1, value["score"] - 1)}
                for key, value in ratings.items()
            },
            "fallacy_labels": ["Hasty Generalization"],
            "filler_rate_per_100w": 3.6,
        },
    ]
    return PlanRequest(
        goals="Hold my nerve in cross-examination.",
        experience="developing",
        digests=digests,
    )


async def timed_analysis(
    request: AnalysisRequest, force_predict: int | None = None
) -> tuple[float, dict | None, list[str]]:
    original = analysis_module._run_branch
    if force_predict is not None:

        async def forced(*args, **kwargs):
            kwargs["num_predict"] = force_predict
            return await original(*args, **kwargs)

        analysis_module._run_branch = forced
    try:
        started = time.perf_counter()
        report, gaps = await analysis_module.analyze_with_graph(request)
        elapsed = (time.perf_counter() - started) * 1000
    finally:
        analysis_module._run_branch = original
    return elapsed, report, gaps


async def timed_judge(report: dict, request: AnalysisRequest) -> tuple[float, list[str]]:
    started = time.perf_counter()
    _, gaps = await judge_with_graph(
        report, {}, [{"speaker": t.speaker, "content": t.content} for t in request.turns]
    )
    return (time.perf_counter() - started) * 1000, gaps


async def timed_plan() -> tuple[float, list[str]]:
    started = time.perf_counter()
    _, gaps = await coach_plan(plan_request(), use_model=True)
    return (time.perf_counter() - started) * 1000, gaps


def median(values: list[float]) -> float:
    return statistics.median(values) if values else float("nan")


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--runs", type=int, default=2)
    args = parser.parse_args()

    print("warming the model…", flush=True)
    started = time.perf_counter()
    await warm()
    print(f"warm-up: {(time.perf_counter() - started) * 1000:.0f}ms")

    request = analysis_request()
    old_analysis: list[float] = []
    new_analysis: list[float] = []
    report: dict | None = None
    gaps: list[str] = []

    for run in range(max(1, args.runs)):
        old_ms, _, old_gaps = await timed_analysis(request, force_predict=1400)
        new_ms, new_report, new_gaps = await timed_analysis(request)
        old_analysis.append(old_ms)
        new_analysis.append(new_ms)
        print(
            f"run {run + 1}: old caps {old_ms:.0f}ms ({'; '.join(old_gaps[:1]) or 'complete'}), "
            f"new caps {new_ms:.0f}ms ({'; '.join(new_gaps[:1]) or 'complete'})",
            flush=True,
        )
        if new_report is not None:
            report = new_report
        gaps = new_gaps

    if report is None:
        print(f"no complete report to judge ({'; '.join(gaps[:3])})")
        return

    judge_ms, judge_gaps = await timed_judge(report, request)
    plan_ms, plan_gaps = await timed_plan()
    print(f"judge: {judge_ms:.0f}ms ({'; '.join(judge_gaps[:1]) or 'scored'})")
    print(f"plan refresh: {plan_ms:.0f}ms ({'; '.join(plan_gaps[:1]) or 'grounded'})")

    old_wait = median(old_analysis) + plan_ms + judge_ms
    new_wait = median(new_analysis) + judge_ms
    print(f"old scorecard wait (analysis + plan + judge): {old_wait:.0f}ms")
    print(f"new scorecard wait (analysis + judge): {new_wait:.0f}ms")
    print(f"removed from the scorecard path: {old_wait - new_wait:.0f}ms")


if __name__ == "__main__":
    asyncio.run(main())
