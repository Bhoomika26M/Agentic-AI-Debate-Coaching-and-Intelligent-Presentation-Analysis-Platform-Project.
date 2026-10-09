import os
from collections.abc import Generator

os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key")
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("MONGO_DATABASE", "test")

import mongomock
import pytest
from fastapi.testclient import TestClient

from app.database.database import configure_indexes, get_db
from app.main import app


@pytest.fixture()
def client() -> Generator[TestClient, None, None]:
    mongo_client = mongomock.MongoClient()
    database = mongo_client["test"]
    configure_indexes(database)

    def override_get_db() -> Generator:
        yield database

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    mongo_client.drop_database("test")


def register(client: TestClient, email: str = "learner@example.com", role: str = "LEARNER") -> dict:
    response = client.post("/api/auth/register", json={"name": "Test User", "email": email, "password": "password123", "role": role})
    assert response.status_code == 201, response.text
    return response.json()


def login(client: TestClient, email: str = "learner@example.com") -> str:
    response = client.post("/api/auth/login", json={"email": email, "password": "password123"})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]
