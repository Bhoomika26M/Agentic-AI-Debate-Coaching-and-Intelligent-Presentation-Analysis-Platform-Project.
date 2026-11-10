"""The delivery graph reports why a review stopped, so the API can map it to a status code."""

import asyncio

import pytest
from fastapi import HTTPException

from app import main
from app.agents import delivery_graph
from app.delivery import analyze_delivery
from app.schemas import DeliverySignals, PresentationReport, PresentationRequest
from app.speech import AudioValidationError, TranscriptionUnavailableError

REPORT = {
    "transcript": "Good morning everyone",
    "communication_score": 4,
    "strengths": ["clear opening"],
    "drills": [
        {
            "start": 0.0,
            "end": 4.0,
            "pattern": "rushed",
            "what_happened": "spoke quickly",
            "try_this": "pause between points",
            "example": "Good morning everyone.",
        }
    ],
    "next_line": "Take a breath before the next point.",
}
SEGMENTS = [{"text": "Good morning everyone", "start": 0.0, "end": 2.4}]


def _patch_transcription(monkeypatch, result=None, error=None):
    async def fake_transcribe(*_args, **_kwargs):
        if error is not None:
            raise error
        return result or []

    monkeypatch.setattr(delivery_graph, "transcribe_audio", fake_transcribe)


def test_a_missing_transcription_engine_is_reported_as_unavailable(monkeypatch):
    _patch_transcription(
        monkeypatch,
        error=TranscriptionUnavailableError("Transcription is unavailable."),
    )

    result, gaps, kind = asyncio.run(
        delivery_graph.review_delivery_with_graph(b"audio", "talk.webm", "audio/webm", None)
    )

    assert result is None
    assert kind == "unavailable"
    assert gaps and "unavailable" in gaps[0].lower()


def test_a_rejected_upload_is_reported_as_an_audio_problem(monkeypatch):
    _patch_transcription(monkeypatch, error=AudioValidationError("Audio is over 180s."))

    result, gaps, kind = asyncio.run(
        delivery_graph.review_delivery_with_graph(b"audio", "talk.webm", "audio/webm", None)
    )

    assert result is None
    assert kind == "audio"


def test_a_silent_recording_is_reported_as_no_speech(monkeypatch):
    _patch_transcription(monkeypatch, result=[])

    result, gaps, kind = asyncio.run(
        delivery_graph.review_delivery_with_graph(b"audio", "talk.webm", "audio/webm", None)
    )

    assert result is None
    assert kind == "no_speech"
    assert gaps


def test_a_complete_review_returns_the_transcript_and_report(monkeypatch):
    _patch_transcription(monkeypatch, result=SEGMENTS)

    async def fake_coach(_request):
        return PresentationReport.model_validate(REPORT)

    monkeypatch.setattr(delivery_graph, "coach_delivery", fake_coach)

    result, gaps, kind = asyncio.run(
        delivery_graph.review_delivery_with_graph(b"audio", "talk.webm", "audio/webm", "A topic")
    )

    assert kind == ""
    assert gaps == []
    assert result is not None
    assert result["transcript"] == "Good morning everyone"
    assert result["segments"] == SEGMENTS
    assert result["signals"]["words"] == 3
    assert result["report"]["communication_score"] == 4


def _signals() -> dict:
    return DeliverySignals.model_validate(analyze_delivery(SEGMENTS)).model_dump()


def test_transcription_returns_signals_without_calling_the_model(monkeypatch):
    _patch_transcription(monkeypatch, result=SEGMENTS)

    async def fake_coach(_request):
        raise AssertionError("transcription must not coach")

    monkeypatch.setattr(delivery_graph, "coach_delivery", fake_coach)

    result, gaps, kind = asyncio.run(
        delivery_graph.transcribe_delivery(b"audio", "talk.webm", "audio/webm")
    )

    assert kind == ""
    assert gaps == []
    assert result is not None
    assert result["transcript"] == "Good morning everyone"
    assert result["signals"]["words"] == 3


def test_coaching_reuses_existing_transcript_and_signals(monkeypatch):
    transcribed = False

    async def fake_transcribe(*_args, **_kwargs):
        nonlocal transcribed
        transcribed = True
        return SEGMENTS

    async def fake_coach(_request):
        return PresentationReport.model_validate(REPORT)

    monkeypatch.setattr(delivery_graph, "transcribe_audio", fake_transcribe)
    monkeypatch.setattr(delivery_graph, "coach_delivery", fake_coach)

    report, gaps, kind = asyncio.run(
        delivery_graph.coach_transcript("A topic", SEGMENTS, _signals())
    )

    assert kind == ""
    assert gaps == []
    assert report is not None
    assert report["communication_score"] == 4
    assert transcribed is False


def test_the_transcribe_endpoint_returns_before_coaching(monkeypatch):
    monkeypatch.setattr(main, "validate_audio", lambda *_args: None)
    monkeypatch.setattr(main, "probe_duration", lambda *_args: None)

    async def fake_transcribe(*_args, **_kwargs):
        return {
            "transcript": "Good morning everyone",
            "segments": SEGMENTS,
            "signals": _signals(),
            "retained": False,
        }, [], ""

    monkeypatch.setattr(delivery_graph, "transcribe_delivery", fake_transcribe)

    response = asyncio.run(main.presentation_transcribe(audio=_Upload()))

    assert response.transcript == "Good morning everyone"
    assert response.signals.words == 3


def test_the_coach_endpoint_accepts_existing_segments(monkeypatch):
    async def fake_coach(topic, segments, signals):
        assert topic == "A topic"
        assert segments == SEGMENTS
        assert signals["words"] == 3
        return REPORT, [], ""

    monkeypatch.setattr(delivery_graph, "coach_transcript", fake_coach)
    request = PresentationRequest(
        topic="A topic",
        segments=SEGMENTS,
        signals=_signals(),
    )

    report = asyncio.run(main.presentation_coach(request=request))

    assert report.communication_score == 4


class _Upload:
    filename = "talk.webm"
    content_type = "audio/webm"

    async def read(self, _limit: int) -> bytes:
        return b"audio"


def _api_status(monkeypatch, kind: str, gaps: list[str]) -> int:
    async def fake_review(*_args, **_kwargs):
        return None, gaps, kind

    monkeypatch.setattr(main, "validate_audio", lambda *_args: None)
    monkeypatch.setattr(main, "probe_duration", lambda *_args: None)
    monkeypatch.setattr(delivery_graph, "review_delivery_with_graph", fake_review)
    with pytest.raises(HTTPException) as raised:
        asyncio.run(main.presentation_analysis(audio=_Upload(), topic=None))
    return raised.value.status_code


def test_the_api_reports_a_missing_transcription_engine_as_unavailable(monkeypatch):
    status = _api_status(monkeypatch, "unavailable", ["Transcription is unavailable."])
    assert status == 503


def test_the_api_reports_a_rejected_upload_as_too_large(monkeypatch):
    status = _api_status(monkeypatch, "audio", ["Audio is over 180s. Trim and retry."])
    assert status == 413


def test_the_api_reports_a_silent_recording_as_a_bad_request(monkeypatch):
    status = _api_status(monkeypatch, "no_speech", ["No speech detected in that recording."])
    assert status == 400


def test_the_api_reports_an_incomplete_coaching_run_as_a_bad_gateway(monkeypatch):
    status = _api_status(monkeypatch, "failed", ["delivery coaching incomplete: bad reply"])
    assert status == 502


def test_the_api_rejects_an_overlong_recording_before_reviewing_it(monkeypatch):
    reviewed = False

    async def fake_review(*_args, **_kwargs):
        nonlocal reviewed
        reviewed = True
        return None, [], ""

    monkeypatch.setattr(main, "validate_audio", lambda *_args: None)
    monkeypatch.setattr(main, "probe_duration", lambda *_args: 240.0)
    monkeypatch.setattr(delivery_graph, "review_delivery_with_graph", fake_review)

    with pytest.raises(HTTPException) as raised:
        asyncio.run(main.presentation_analysis(audio=_Upload(), topic=None))

    assert raised.value.status_code == 400
    assert "over 180s" in raised.value.detail
    assert reviewed is False


def test_the_api_rejects_audio_that_is_not_really_audio(monkeypatch):
    with pytest.raises(HTTPException) as raised:
        asyncio.run(main.presentation_analysis(audio=_Upload(), topic=None))

    assert raised.value.status_code == 400
    assert "look like audio" in raised.value.detail
