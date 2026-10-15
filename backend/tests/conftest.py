import pytest
from unittest.mock import patch

@pytest.fixture
def mock_gemini_argument():
    with patch("app.services.gemini_service.analyze_argument") as m:
        m.return_value = {
            "main_claim": "Test claim",
            "supporting_reasons": ["r1"],
            "evidence_used": ["e1"],
            "missing_evidence": ["m1"],
            "clarity_score": 80.0,
            "relevance_score": 75.0,
            "logical_consistency_score": 85.0,
            "persuasiveness_score": 70.0,
            "strengths": ["clear structure"],
            "weaknesses": ["weak evidence"],
            "improvement_suggestions": ["add statistics"],
        }
        yield m

@pytest.fixture
def mock_gemini_fallacy():
    with patch("app.services.gemini_service.detect_fallacies") as m:
        m.return_value = {"fallacies": []}
        yield m

@pytest.fixture
def mock_gemini_opponent():
    with patch("app.services.gemini_service.ai_opponent_response") as m:
        m.return_value = "AI counterargument text."
        yield m