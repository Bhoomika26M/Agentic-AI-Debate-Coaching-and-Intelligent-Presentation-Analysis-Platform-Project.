from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app
from app.services.llm_service import LLMAnalysisError


client = TestClient(app)


def auth_headers():
    email = f"presentation-{uuid4().hex}@example.com"
    registered = client.post(
        "/auth/register",
        json={"name": "Presentation Learner", "email": email, "password": "strongpassword123", "role": "learner"},
    )
    assert registered.status_code == 201
    logged_in = client.post("/auth/login", json={"email": email, "password": "strongpassword123"})
    assert logged_in.status_code == 200
    token_headers = {"Authorization": "Bearer " + logged_in.json()["access_token"]}
    assert client.get("/auth/me", headers=token_headers).status_code == 200
    return token_headers


def test_presentation_upload_persists_analysis_and_is_owner_scoped(tmp_path, monkeypatch):
    monkeypatch.setattr("app.core.config.settings.presentation_upload_directory", str(tmp_path))
    monkeypatch.setattr(
        "app.services.presentation_service.llm_service.analyze_presentation",
        lambda transcript: {
            "overall_score": 81,
            "strengths": ["Clear claim"],
            "improvement_areas": ["Add supporting evidence"],
            "recommendations": ["Practice citing a relevant example"],
            "delivery_observations": ["Uses direct wording"],
            "limitations": ["Transcript cannot show eye contact"],
        },
    )
    headers = auth_headers()
    transcript = b"Our proposal improves access. For example, the local pilot served more families. We should examine its costs."
    submitted = client.post(
        "/presentations",
        headers={**headers, "Idempotency-Key": "presentation-request-1"},
        files={"file": ("speech.txt", transcript, "text/plain")},
    )
    assert submitted.status_code == 201
    payload = submitted.json()
    assert payload["status"] == "completed"
    assert payload["transcript"].startswith("Our proposal")
    assert payload["word_count"] == 17
    assert payload["speaking_rate_wpm"] is None
    assert "storage_key" not in payload

    fetched = client.get(f"/presentations/{payload['id']}", headers=headers)
    assert fetched.status_code == 200
    assert fetched.json()["analysis_result"]["overall_score"] == 81
    repeated = client.post(
        "/presentations",
        headers={**headers, "Idempotency-Key": "presentation-request-1"},
        files={"file": ("speech.txt", transcript, "text/plain")},
    )
    assert repeated.status_code == 201
    assert repeated.json()["id"] == payload["id"]

    dashboard = client.get("/presentations/dashboard", headers=headers)
    assert dashboard.status_code == 200
    assert dashboard.json()["total_submissions"] == 1
    assert dashboard.json()["average_score"] == 81

    report = client.get("/presentations/reports.json", headers=headers)
    assert report.status_code == 200
    assert report.json()[0]["id"] == payload["id"]
    csv_report = client.get("/presentations/reports.csv", headers=headers)
    assert csv_report.status_code == 200
    assert "presentation-request-1" not in csv_report.text
    assert "Add supporting evidence" in csv_report.text

    other_headers = auth_headers()
    assert client.get(f"/presentations/{payload['id']}", headers=other_headers).status_code == 404


def test_missing_llm_credentials_preserve_transcript_as_failed_submission(tmp_path, monkeypatch):
    monkeypatch.setattr("app.core.config.settings.presentation_upload_directory", str(tmp_path))
    monkeypatch.setattr("app.services.presentation_service.llm_service.is_available", lambda: False)
    headers = auth_headers()
    submitted = client.post(
        "/presentations",
        headers=headers,
        files={"file": ("speech.md", b"A transcript saved without configured credentials.", "text/markdown")},
    )
    assert submitted.status_code == 201
    payload = submitted.json()
    assert payload["status"] == "failed"
    assert "not configured" in payload["error_message"]
    assert payload["transcript"] == "A transcript saved without configured credentials."
    assert client.get(f"/presentations/{payload['id']}", headers=headers).json()["status"] == "failed"


def test_provider_failure_is_reported_and_submission_is_kept(tmp_path, monkeypatch):
    monkeypatch.setattr("app.core.config.settings.presentation_upload_directory", str(tmp_path))

    def fail_analysis(transcript):
        raise LLMAnalysisError("The AI provider timed out.", 504)

    monkeypatch.setattr("app.services.presentation_service.llm_service.analyze_presentation", fail_analysis)
    headers = auth_headers()
    response = client.post(
        "/presentations",
        headers=headers,
        files={"file": ("speech.txt", b"This transcript must survive provider timeouts.", "text/plain")},
    )
    assert response.status_code == 201
    assert response.json()["status"] == "failed"
    assert response.json()["error_message"] == "The AI provider timed out."
    assert response.json()["transcript"] == "This transcript must survive provider timeouts."


def test_audio_transcription_uses_provider_duration_for_measured_rate(tmp_path, monkeypatch):
    monkeypatch.setattr("app.core.config.settings.presentation_upload_directory", str(tmp_path))
    monkeypatch.setattr(
        "app.services.presentation_service.llm_service.transcribe_presentation_audio",
        lambda content, filename, mime_type: {
            "transcript": "Um, a clear claim with an example.",
            "duration_seconds": 30,
        },
    )
    monkeypatch.setattr(
        "app.services.presentation_service.llm_service.analyze_presentation",
        lambda transcript: {
            "overall_score": None,
            "strengths": ["The claim is stated clearly"],
            "improvement_areas": [],
            "recommendations": [],
            "delivery_observations": [],
            "limitations": ["Automated score unavailable"],
        },
    )
    headers = auth_headers()
    wav_file = b"RIFF" + b"\x00" * 4 + b"WAVE" + b"\x00" * 20
    response = client.post(
        "/presentations",
        headers=headers,
        files={"file": ("speech.wav", wav_file, "audio/wav")},
    )
    assert response.status_code == 201
    assert response.json()["submission_type"] == "audio"
    assert response.json()["duration_seconds"] == 30
    assert response.json()["word_count"] == 7
    assert response.json()["filler_word_count"] == 1
    assert response.json()["speaking_rate_wpm"] == 14


def test_upload_validation_and_authentication(tmp_path, monkeypatch):
    monkeypatch.setattr("app.core.config.settings.presentation_upload_directory", str(tmp_path))
    assert client.post(
        "/presentations",
        files={"file": ("speech.txt", b"Unauthenticated upload.", "text/plain")},
    ).status_code == 401

    headers = auth_headers()
    unsupported = client.post(
        "/presentations",
        headers=headers,
        files={"file": ("speech.exe", b"not supported", "application/octet-stream")},
    )
    assert unsupported.status_code == 422

    monkeypatch.setattr("app.core.config.settings.presentation_max_upload_bytes", 8)
    oversized = client.post(
        "/presentations",
        headers=headers,
        files={"file": ("speech.txt", b"this is too large", "text/plain")},
    )
    assert oversized.status_code == 413
