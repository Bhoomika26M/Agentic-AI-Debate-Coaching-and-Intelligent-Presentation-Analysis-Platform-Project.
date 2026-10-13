
import sys
from pathlib import Path

# Make the backend directory available during testing.
BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from app.services.argument_analyzer import analyze_argument
from app.services.rebuttal_generator import generate_rebuttal
from app.services.presentation_analyzer import analyze_presentation


def test_argument_claim_and_reason_are_separated():
    text = (
        "Schools should start later because students need "
        "enough sleep to concentrate and learn effectively."
    )

    result = analyze_argument(text)

    assert result["claim"] == "Schools should start later"
    assert result["supporting_reasons"] == [
        "students need enough sleep to concentrate and learn effectively."
    ]


def test_ad_hominem_fallacy_is_detected():
    text = (
        "You are an idiot, so your opinion about school "
        "timings is wrong."
    )

    result = analyze_argument(text)

    fallacy_names = [
        item["name"]
        for item in result["possible_fallacies"]
    ]

    assert "Ad Hominem" in fallacy_names


def test_rebuttal_handles_school_timing_argument():
    argument = (
        "Schools should start early because students need "
        "more time in the afternoon for other activities."
    )

    result = generate_rebuttal(argument)

    assert result["original_argument"] == argument
    assert result["strategy"] == "Context-specific counterargument"
    assert "afternoon" in result["rebuttal"].lower()


def test_rebuttal_handles_empty_argument():
    result = generate_rebuttal("   ")

    assert result["rebuttal"] == ""
    assert result["strategy"] == "No argument provided"


def test_presentation_score_and_filler_detection():
    script = (
        "Basically, students should practice public speaking "
        "because practice builds confidence."
    )

    result = analyze_presentation(script)

    assert result["word_count"] > 0
    assert result["sentence_count"] == 1
    assert result["filler_words"]["basically"] == 1
    assert result["presentation_score"] == 80
    assert result["analysis_method"] == "rule_based"


def test_empty_presentation_returns_zero_score():
    result = analyze_presentation("   ")

    assert result["word_count"] == 0
    assert result["presentation_score"] == 0
    assert result["filler_words"] == {}
