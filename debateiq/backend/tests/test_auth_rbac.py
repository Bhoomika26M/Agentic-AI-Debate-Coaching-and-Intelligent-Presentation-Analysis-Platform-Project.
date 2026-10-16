import pytest

def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "DebateIQ" in data["service"]

def test_login_demo_learner(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "learner@debateiq.ai", "password": "password123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data

def test_login_invalid_password(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "learner@debateiq.ai", "password": "wrongpassword"},
    )
    assert response.status_code == 401

def test_register_and_rbac(client):
    import uuid
    random_email = f"user_{uuid.uuid4().hex[:6]}@debateiq.ai"
    reg_resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": random_email,
            "password": "password123",
            "full_name": "Test Debater",
            "role": "Learner",
        },
    )
    assert reg_resp.status_code == 201
    token = reg_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Access current user profile
    me_resp = client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == random_email

    # Learner should NOT be allowed to access admin dashboard
    admin_dash_resp = client.get("/api/v1/dashboards/admin", headers=headers)
    assert admin_dash_resp.status_code == 403

def test_admin_access(client):
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@debateiq.ai", "password": "password123"},
    )
    admin_token = login_resp.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    dash_resp = client.get("/api/v1/dashboards/admin", headers=admin_headers)
    assert dash_resp.status_code == 200
    data = dash_resp.json()
    assert data["admin_name"] == "System Administrator"
    assert "role_distribution" in data
