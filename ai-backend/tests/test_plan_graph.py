import asyncio

from fakes import digest, make_chat, plan_json

from app.agents import plan_graph
from app.agents.plan_graph import coach_plan
from app.agents.plan_graph import plan_graph as graph
from app.schemas import PlanRequest, PracticePreferences, SessionDigest


def _request(**overrides) -> PlanRequest:
    digests = overrides.pop("digests", [digest(evidence_strength=2), digest(evidence_strength=2)])
    return PlanRequest(
        goals=overrides.pop("goals", "hold my nerve in cross-examination"),
        experience=overrides.pop("experience", "developing"),
        digests=[SessionDigest.model_validate(d) for d in digests],
        **overrides,
    )


def test_an_empty_archive_still_yields_a_usable_plan():
    plan, gaps = asyncio.run(coach_plan(_request(digests=[]), use_model=True))
    assert plan is not None
    assert plan["generated_for"] == 0
    assert plan["weak_spots"][0]["key"] == "practice_volume"
    assert plan["drills"] and plan["milestones"]
    assert any("baseline" in gap for gap in gaps)


def test_a_grounded_model_draft_is_accepted(monkeypatch):
    chat = make_chat([plan_json()])
    monkeypatch.setattr(plan_graph, "chat", chat)
    plan, gaps = asyncio.run(coach_plan(_request(), use_model=True))
    assert len(chat.calls) == 1, "a grounded plan costs one model call"
    assert gaps == []
    assert plan["headline"] == "Sharpen the evidence line"
    assert [drill["weak_spot"] for drill in plan["drills"]] == ["evidence_strength"]


def test_an_ungrounded_draft_is_repaired_once(monkeypatch):
    bad = plan_json(summary="Your evidence score sits at 4.9/5.")
    chat = make_chat([bad, plan_json()])
    monkeypatch.setattr(plan_graph, "chat", chat)
    plan, gaps = asyncio.run(coach_plan(_request(), use_model=True))
    assert len(chat.calls) == 2, "the reviser gets one bounded attempt"
    assert gaps == []
    assert "4.9" not in plan["summary"]
    assert any("rejected" in message["content"] for message in chat.calls[1])


def test_a_persistently_ungrounded_draft_falls_back_to_the_scores(monkeypatch):
    chat = make_chat([plan_json(summary="Your evidence score sits at 4.9/5.")])
    monkeypatch.setattr(plan_graph, "chat", chat)
    plan, gaps = asyncio.run(coach_plan(_request(), use_model=True))
    assert len(chat.calls) == 2
    assert any("grounded" in gap for gap in gaps)
    diagnosed = {spot["key"] for spot in plan["weak_spots"]}
    assert {drill["weak_spot"] for drill in plan["drills"]} <= diagnosed
    assert plan["weak_spots"][0]["key"] in {drill["weak_spot"] for drill in plan["drills"]}


def test_an_invented_weak_spot_never_reaches_the_learner(monkeypatch):
    invented = plan_json(
        drills=[
            {
                "weak_spot": "delivery",
                "title": "Slow down",
                "minutes": 5,
                "steps": ["Breathe."],
                "success_check": "Fewer fillers next take.",
            }
        ]
    )
    monkeypatch.setattr(plan_graph, "chat", make_chat([invented]))
    plan, _gaps = asyncio.run(coach_plan(_request(), use_model=True))
    diagnosed = {spot["key"] for spot in plan["weak_spots"]}
    assert "delivery" not in diagnosed
    assert all(drill["weak_spot"] in diagnosed for drill in plan["drills"])


def test_a_missing_model_still_produces_a_plan(monkeypatch):
    def explode(*_args, **_kwargs):
        raise RuntimeError("ollama is down")

    monkeypatch.setattr(plan_graph, "chat", explode)
    plan, gaps = asyncio.run(coach_plan(_request(), use_model=True))
    assert plan is not None
    assert plan["headline"]
    assert gaps, "the learner is told the coach was not consulted"


def test_goals_are_sent_to_the_model_as_context(monkeypatch):
    chat = make_chat([plan_json()])
    monkeypatch.setattr(plan_graph, "chat", chat)
    asyncio.run(coach_plan(_request(goals="stop rambling in rebuttal"), use_model=True))
    assert "stop rambling in rebuttal" in chat.calls[0][1]["content"]


def test_the_plan_leads_with_the_weak_spot_the_learner_asked_for():
    default_plan, _ = asyncio.run(coach_plan(_request(), use_model=False))
    assert default_plan["weak_spots"][0]["key"] == "evidence_strength"
    structured, _ = asyncio.run(
        coach_plan(_request(preferences=PracticePreferences(goal="structure")), use_model=False)
    )
    assert structured["weak_spots"][0]["key"] == "clarity"
    assert structured["drills"][0]["weak_spot"] == "clarity"


def test_the_learners_aim_reaches_the_coach_as_context(monkeypatch):
    chat = make_chat([plan_json()])
    monkeypatch.setattr(plan_graph, "chat", chat)
    asyncio.run(
        coach_plan(
            _request(preferences=PracticePreferences(goal="evidence", focus=["delivery"])),
            use_model=True,
        )
    )
    payload = chat.calls[0][1]["content"]
    assert "grounding every claim" in payload
    assert "steadier delivery" in payload


def test_a_baseline_plan_still_answers_the_learner_goal():
    plan, _gaps = asyncio.run(
        coach_plan(_request(digests=[], preferences=PracticePreferences(goal="evidence")), use_model=False)
    )
    assert plan["weak_spots"][0]["key"] == "practice_volume"
    assert "source or example" in plan["next_session"]


def test_the_aim_never_introduces_an_ungrounded_weak_spot(monkeypatch):
    monkeypatch.setattr(plan_graph, "chat", make_chat([plan_json()]))
    plan, _gaps = asyncio.run(
        coach_plan(_request(preferences=PracticePreferences(goal="nerves")), use_model=True)
    )
    diagnosed = {spot["key"] for spot in plan["weak_spots"]}
    assert "delivery" not in diagnosed
    assert all(drill["weak_spot"] in diagnosed for drill in plan["drills"])


def test_plan_graph_declares_every_agent_role():
    nodes = set(graph.get_graph().nodes)
    assert {"diagnose", "coach", "verify", "refine", "fallback", "merge"} <= nodes
