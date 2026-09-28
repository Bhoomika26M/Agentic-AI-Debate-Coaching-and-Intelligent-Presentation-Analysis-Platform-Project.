import pytest
from backend.app.agents.scoring_agent import scoring_agent
from backend.app.agents.argument_agent import argument_agent
from backend.app.agents.fallacy_agent import fallacy_agent
from backend.app.agents.counterargument_agent import counterargument_agent

def test_exact_weighted_scoring_formula():
    """Verify Section 16 exact weighted debate scoring:
    Argument Quality: 30%
    Evidence Usage: 20%
    Logical Consistency: 20%
    Rebuttal Effectiveness: 15%
    Communication Skills: 15%
    Total = 100%
    """
    mock_analysis = {
        "argument_strength_score": 80.0,
        "relevance_score": 90.0,
        "evidence_score": 70.0,
        "consistency_score": 85.0,
        "persuasiveness_score": 75.0,
        "clarity_score": 80.0
    }
    fallacies_count = 1
    word_count = 60

    scores = scoring_agent.calculate_round_score(mock_analysis, fallacies_count, word_count)

    # AQ = 80*0.6 + 90*0.4 = 84.0
    # EU = 70.0
    # LC = 85.0 - (1 * 8) = 77.0
    # RE = 75*0.7 + 80*0.3 = 76.5
    # CS = min(98.0, 80 + 4) = 84.0
    # Overall = 84*0.3 + 70*0.2 + 77*0.2 + 76.5*0.15 + 84*0.15
    # Overall = 25.2 + 14.0 + 15.4 + 11.475 + 12.6 = 78.675 -> 78.7
    assert scores["argument_quality"] == 84.0
    assert scores["evidence_usage"] == 70.0
    assert scores["logical_consistency"] == 77.0
    assert scores["rebuttal_effectiveness"] == 76.5
    assert scores["communication_skills"] == 84.0
    assert scores["overall_score"] == 78.7

@pytest.mark.asyncio
async def test_fallacy_detection_ad_hominem():
    text = "The critics of this bill are naive corrupt idiots who just want to profit."
    fallacies = await fallacy_agent.detect_fallacies(text)
    assert len(fallacies) > 0
    names = [f["fallacy_name"] for f in fallacies]
    assert "Ad Hominem" in names

@pytest.mark.asyncio
async def test_fallacy_detection_straw_man():
    text = "So you are saying we should ban all technology and force humanity back into the dark ages!"
    fallacies = await fallacy_agent.detect_fallacies(text)
    assert len(fallacies) > 0
    names = [f["fallacy_name"] for f in fallacies]
    assert "Straw Man" in names

@pytest.mark.asyncio
async def test_counterargument_tiers():
    res = await counterargument_agent.generate_counterarguments(
        user_argument="Universal basic income should be instituted to eradicate poverty.",
        topic="Universal Basic Income",
        position="For"
    )
    assert "logical_rebuttal" in res
    assert "evidence_rebuttal" in res
    assert "ethical_rebuttal" in res
    assert "practical_rebuttal" in res
    assert "policy_rebuttal" in res
    assert len(res["challenge_questions"]) > 0
