import json

import pytest

from backend.app.agents import MultiAgentOrchestrator
from backend.app.provider import AnalysisProvider


def test_each_specialist_routes_to_its_task_and_validates_output():
    orchestrator = MultiAgentOrchestrator()
    payload = {"transcript": "A short practice transcript", "claim": "Practice builds skill"}
    replies = {
        "argument_analysis agent": {"summary": "Clear position.", "strengths": ["A thesis"], "improvements": ["Add evidence"]},
        "fallacy detection agent": {"fallacies": [{"type": "hasty generalization", "excerpt": "everyone agrees", "severity": "medium", "explanation": "Overgeneralizes.", "correction": "Qualify the claim."}]},
        "counterargument agent": {"counterarguments": [{"type": "evidence", "response": "What evidence supports this?"}]},
        "presentation delivery coach": {"summary": "Clear delivery plan.", "pacing_feedback": "Pause after key points.", "confidence_feedback": "", "engagement_feedback": "", "recommendations": ["Vary emphasis"]},
        "personal learning-plan agent": {"focus": "evidence", "recommendations": ["Cite a source"]},
        "debate opponent agent": "What evidence would change your mind?",
    }
    seen = []

    def complete(prompt):
        seen.append(prompt)
        for agent_name, value in replies.items():
            if agent_name in prompt:
                return json.dumps(value) if isinstance(value, dict) else value
        raise AssertionError("No specialist matched this prompt")

    expected_tasks = {
        "argument_analysis", "fallacy_detection", "counterarguments",
        "presentation_coaching", "learning_plan", "debate_opponent",
    }
    assert set(orchestrator.tasks) == expected_tasks
    for task in expected_tasks:
        result = orchestrator.run(task, complete, payload)
        assert result
    assert len(seen) == len(expected_tasks)
    assert all("INPUT_JSON:" in prompt for prompt in seen)


def test_specialist_rejects_malformed_structured_output():
    orchestrator = MultiAgentOrchestrator()
    with pytest.raises(ValueError):
        orchestrator.run("argument_analysis", lambda _: "not JSON", {"transcript": "Test"})


def test_unknown_task_is_not_silently_routed():
    orchestrator = MultiAgentOrchestrator()
    with pytest.raises(ValueError, match="Unknown specialist task"):
        orchestrator.run("unregistered", lambda _: "unused", {})


def test_unconfigured_provider_keeps_local_analysis_and_debate_fallbacks():
    class DisabledProvider:
        name = "test"
        model = "none"
        available = False

    provider = AnalysisProvider(ai=DisabledProvider())
    result = provider.analyze("A claim supported by research evidence.", "Practice", "for")
    response, engine = provider.debate_response("Practice", "for", "", "challenge")
    assert result["provider"] == "local"
    assert result["overall_score"] > 0
    assert response and engine == "deterministic_fallback"
