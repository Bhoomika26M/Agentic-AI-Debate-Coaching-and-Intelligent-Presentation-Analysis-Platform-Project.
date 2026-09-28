import pytest
from backend.app.ai.speech_analyzer import speech_analyzer
from backend.app.services.export_service import export_service

@pytest.mark.asyncio
async def test_speech_filler_words_and_wpm():
    speech_text = "Good morning. Um, basically, like, we need to focus on sustainable energy. You know, so we can succeed."
    res = await speech_analyzer.analyze_speech(speech_text, duration_seconds=60.0)
    
    assert res["filler_words_count"] >= 4
    assert "um" in res["filler_words_breakdown"]
    assert "basically" in res["filler_words_breakdown"]
    assert "you know" in res["filler_words_breakdown"]
    assert res["words_per_minute"] > 0
    assert res["confidence_score"] > 0
    assert res["clarity_score"] > 0
    assert len(res["pace_timeline"]) == 4

def test_excel_export_generation():
    dummy_data = {
        "argument_quality": 82.0,
        "evidence_usage": 75.0,
        "logical_consistency": 80.0,
        "rebuttal_effectiveness": 78.0,
        "communication_skills": 85.0,
        "overall_score": 80.2,
        "wpm": 142.0,
        "filler_count": 4,
        "confidence_score": 84.0,
        "clarity_score": 88.0
    }
    excel_buf = export_service.generate_excel_report(dummy_data)
    assert excel_buf.getvalue() is not None
    assert len(excel_buf.getvalue()) > 500

def test_pdf_export_generation():
    dummy_data = {
        "topic": "Should AI replace traditional education?",
        "position": "For",
        "argument_quality": 80.0,
        "evidence_usage": 72.0,
        "logical_consistency": 82.0,
        "rebuttal_effectiveness": 76.0,
        "communication_skills": 84.0,
        "overall_score": 78.8,
        "strongest_argument": "Adaptive personalized pacing in STEM.",
        "weakest_argument": "Overlooking socio-emotional mentorship."
    }
    pdf_buf = export_service.generate_pdf_report(dummy_data)
    assert pdf_buf.getvalue() is not None
    assert len(pdf_buf.getvalue()) > 500
