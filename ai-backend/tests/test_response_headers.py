"""The privacy header must win over a streaming handler's own cache header."""

from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.testclient import TestClient

from app import main
from app.rate_limit import SlidingWindowLimiter


def _client(monkeypatch, limit: int = 100) -> TestClient:
    monkeypatch.setattr(main, "request_limiter", SlidingWindowLimiter(limit))
    app = FastAPI()
    app.middleware("http")(main.add_security_headers)

    @app.get("/api/ping")
    def ping():
        return StreamingResponse(
            iter(["data: ok\n\n"]),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache"},
        )

    @app.get("/api/health")
    def health():
        return {"status": "ready"}

    return TestClient(app)


def test_a_streaming_response_is_no_store(monkeypatch):
    response = _client(monkeypatch).get("/api/ping")
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["x-content-type-options"] == "nosniff"


def test_health_is_exempt_from_the_request_limit(monkeypatch):
    client = _client(monkeypatch, limit=1)
    assert client.get("/api/health").status_code == 200
    assert client.get("/api/health").status_code == 200


def test_a_rate_limited_response_keeps_the_privacy_headers(monkeypatch):
    client = _client(monkeypatch, limit=1)
    assert client.get("/api/ping").status_code == 200
    limited = client.get("/api/ping")
    assert limited.status_code == 429
    assert limited.headers["retry-after"]
    assert limited.headers["cache-control"] == "no-store"
