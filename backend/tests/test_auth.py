import uuid

def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"
    assert data["ai_service"] == "available"

def test_login_demo_learner(client):
    response = client.post("/api/v1/auth/login", json={
        "email": "learner@debateai.com",
        "password": "Password123!"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "learner"
    assert data["email"] == "learner@debateai.com"

def test_login_invalid_credentials(client):
    response = client.post("/api/v1/auth/login", json={
        "email": "learner@debateai.com",
        "password": "WrongPassword999!"
    })
    assert response.status_code == 401

def test_registration_and_jwt_me(client):
    unique_email = f"user_{uuid.uuid4().hex[:8]}@debateai.com"
    register_payload = {
        "email": unique_email,
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!",
        "full_name": "Test Debater",
        "experience_level": "Intermediate",
        "role": "learner"
    }
    res = client.post("/api/v1/auth/register", json=register_payload)
    assert res.status_code == 200
    token = res.json()["access_token"]

    # Access protected route /users/me
    headers = {"Authorization": f"Bearer {token}"}
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["email"] == unique_email
    assert me_data["full_name"] == "Test Debater"
