from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_register_and_login():
    r = client.post("/api/auth/register", json={
        "email": "pytest_user@example.com", "full_name": "PyTest User", "password": "StrongPass123"})
    assert r.status_code in (200, 400)  # 400 if already exists from prior run
    r2 = client.post("/api/auth/login", json={"email": "pytest_user@example.com", "password": "StrongPass123"})
    assert r2.status_code == 200
    assert "access_token" in r2.json()
    assert r2.json()["user"]["role"] == "learner"  # self-register never creates admin

def test_invalid_login():
    r = client.post("/api/auth/login", json={"email": "nobody@example.com", "password": "wrong"})
    assert r.status_code == 401

def test_protected_route_requires_token():
    r = client.get("/api/auth/me")
    assert r.status_code == 401