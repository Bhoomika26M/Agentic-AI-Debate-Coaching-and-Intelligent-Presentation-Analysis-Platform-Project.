import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database.session import SessionLocal, Base, engine
from backend.app.database.seed_data import init_db

@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    init_db()
    yield

@pytest.fixture
def client():
    return TestClient(app)
