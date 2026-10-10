def test_seed_users_login(client):
    """Test that seeded demo users can log in successfully."""
    response = client.post("/api/auth/login", json={
        "email": "learner@debatecoach.ai",
        "password": "password123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "Learner"
    assert data["full_name"] == "Alex Rivera"

def test_login_invalid_password(client):
    """Test that login fails with wrong password."""
    response = client.post("/api/auth/login", json={
        "email": "learner@debatecoach.ai",
        "password": "wrongpassword"
    })
    assert response.status_code == 401
    assert "Invalid email or password" in response.json()["detail"]

def test_register_new_user(client):
    """Test self-registration as a Learner and token issue."""
    response = client.post("/api/auth/register", json={
        "email": "newbie@debatecoach.ai",
        "password": "mypassword123",
        "full_name": "Jordan Lee",
        "role": "Learner"
    })
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "newbie@debatecoach.ai"
    assert data["role"] == "Learner"
    assert "access_token" in data

    # Verify user can immediately access /api/auth/me
    token = data["access_token"]
    me_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == "newbie@debatecoach.ai"

def test_register_duplicate_email(client):
    """Test that duplicate registration returns 400."""
    response = client.post("/api/auth/register", json={
        "email": "learner@debatecoach.ai",
        "password": "password123",
        "full_name": "Another User",
        "role": "Learner"
    })
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]

def test_register_invalid_role(client):
    """Test that invalid roles are rejected."""
    response = client.post("/api/auth/register", json={
        "email": "badrole@debatecoach.ai",
        "password": "password123",
        "full_name": "Bad Role User",
        "role": "SuperSupremeLeader"
    })
    assert response.status_code == 400
    assert "Invalid role" in response.json()["detail"]
