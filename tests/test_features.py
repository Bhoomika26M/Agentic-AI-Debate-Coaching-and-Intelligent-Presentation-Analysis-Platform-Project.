from uuid import uuid4

from fastapi.testclient import TestClient

from backend.app.main import app


client = TestClient(app)


def account():
    response = client.post("/api/auth/register", json={
        "email": f"{uuid4().hex}@example.com", "password": "password123", "name": "Feature Test"
    })
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_report_exports_pdf_and_excel():
    headers = account()
    session = client.post("/api/sessions", headers=headers, json={
        "title": "Export", "topic": "A useful topic",
        "transcript": "This claim has research evidence because the data supports it.",
    }).json()
    for extension, content_type in (("pdf", "application/pdf"),
                                    ("xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")):
        response = client.get(f"/api/sessions/{session['id']}/export?format={extension}", headers=headers)
        assert response.status_code == 200
        assert response.headers["content-type"].startswith(content_type)
        assert len(response.content) > 100


def test_media_without_transcript_has_explicit_fallback():
    headers = account()
    response = client.post(
        "/api/media/upload", headers=headers,
        files={"file": ("speech.wav", b"RIFF" + b"\0" * 16, "audio/wav")},
        data={"topic": "Presentation"},
    )
    assert response.status_code == 200
    assert response.json()["transcription_engine"] == "deterministic_no_transcript"
    assert response.json()["status"] == "awaiting_transcript"
