import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_argument_extraction_and_scoring(client: AsyncClient, learner_token: str):
    speech = (
        "We must ban autonomous weapon systems because lethal decision making requires human moral accountability. "
        "According to research published by the UN Institute for Disarmament, over 74% of international legal scholars "
        "argue that algorithms cannot satisfy international humanitarian law criteria."
    )
    res = await client.post(
        "/api/v1/analysis/arguments",
        headers={"Authorization": f"Bearer {learner_token}"},
        json={"text": speech, "motion_context": "Autonomous Weapons Ban"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total_arguments"] >= 1
    arg = data["arguments"][0]
    assert "claim" in arg
    assert arg["evidence_score"] >= 70.0
    assert arg["overall_score"] >= 60.0

@pytest.mark.asyncio
async def test_fallacy_detection_engine(client: AsyncClient, learner_token: str):
    fallacious_speech = (
        "My opponent wants to abolish all borders and let everyone die in chaos. "
        "You are completely naive and foolish, so why should we listen to you?"
    )
    res = await client.post(
        "/api/v1/analysis/fallacies",
        headers={"Authorization": f"Bearer {learner_token}"},
        json={"text": fallacious_speech}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total_fallacies"] >= 2
    fallacy_types = [f["fallacy_type"] for f in data["fallacies"]]
    assert "STRAW_MAN" in fallacy_types
    assert "AD_HOMINEM" in fallacy_types
    assert data["credibility_penalty_total"] > 25

@pytest.mark.asyncio
async def test_full_session_evaluation_report(client: AsyncClient, learner_token: str):
    speech = (
        "We should adopt universal basic income because automation will displace 30% of manufacturing jobs by 2030. "
        "According to a study from MIT Economics, unconditional cash transfers increased local entrepreneurship by 22%. "
        "Opponent claims that inflation will spike, but data demonstrates that price levels stabilized within six months."
    )
    res = await client.post(
        "/api/v1/analysis/session/session-seed-01/evaluate",
        headers={"Authorization": f"Bearer {learner_token}"},
        json={"transcript_text": speech, "motion_context": "Universal Basic Income"}
    )
    assert res.status_code == 200
    report = res.json()
    assert "scores" in report
    scores = report["scores"]
    assert scores["argument_quality"] >= 60.0
    assert scores["evidence_usage"] >= 60.0
    assert scores["total_composite_score"] >= 60.0
    assert len(report["strengths"]) >= 1
