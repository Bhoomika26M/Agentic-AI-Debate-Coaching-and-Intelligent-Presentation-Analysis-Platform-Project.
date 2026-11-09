import asyncio

from app import main
from app.agents import analysis_graph as graph_module
from app.schemas import (
    AnalysisRequest,
    Counterargument,
    CounterBranch,
    FallacyBranch,
    RubricBranch,
)

RATINGS = {
    "clarity": {"score": 4, "note": "clear"},
    "relevance": {"score": 4, "note": "on point"},
    "evidence_strength": {"score": 3, "note": "thin"},
    "logical_consistency": {"score": 4, "note": "sound"},
    "persuasiveness": {"score": 3, "note": "flat"},
}


def test_the_rubric_is_streamed_before_the_slower_review_branches(monkeypatch):
    release = asyncio.Event()

    async def fake_run_branch(
        model, request, system_extra, task, attempts=2, num_predict=700
    ):
        if model is RubricBranch:
            return (
                RubricBranch(
                    ratings=RATINGS,
                    strengths=["The case is easy to follow."],
                    next_steps=["Add one source for the attention claim."],
                ),
                "",
            )
        # The other branches deliberately wait until the rubric has been yielded.
        await release.wait()
        if model is FallacyBranch:
            return FallacyBranch(fallacies=[]), ""
        return (
            CounterBranch(
                counterarguments=[
                    Counterargument(
                        kind=kind,
                        response=f"{kind} challenge",
                        question="What evidence supports that?",
                    )
                    for kind in ("Logical", "Evidence-based", "Ethical", "Practical", "Policy")
                ]
            ),
            "",
        )

    monkeypatch.setattr(graph_module, "_run_branch", fake_run_branch)
    request = AnalysisRequest(
        topic="Should schools ban phones?",
        learner_position="for",
        turns=[
            {
                "speaker": "learner",
                "content": "Phones distract students from lessons, so schools should ban them.",
            }
        ],
    )

    async def collect():
        events = []
        async for event in graph_module.stream_analysis_with_graph(request):
            events.append(event)
            if event["event"] == "rubric":
                release.set()
        return events

    events = asyncio.run(asyncio.wait_for(collect(), timeout=2))

    assert [event["event"] for event in events] == ["rubric", "review"]
    assert events[0]["report"]["ratings"]["clarity"]["score"] == 4
    assert events[0]["report"]["strengths"] == ["The case is easy to follow."]
    assert "counterarguments" not in events[0]["report"]
    assert len(events[1]["report"]["counterarguments"]) == 5
    assert events[1]["gaps"] == []


def test_an_unconsumed_analysis_response_does_not_reserve_a_model_slot(monkeypatch):
    """The slot belongs to the generator, so a response that never starts owns nothing."""

    async def ready() -> bool:
        return True

    monkeypatch.setattr(main, "is_available", ready)
    slots = asyncio.Semaphore(1)
    monkeypatch.setattr(main, "stream_slots", slots)
    request = AnalysisRequest(
        topic="Should schools ban phones?",
        learner_position="for",
        turns=[{"speaker": "learner", "content": "Phones distract students."}],
    )

    async def start_response():
        return await main.debate_analysis_stream(request)

    asyncio.run(start_response())
    assert not slots.locked()
