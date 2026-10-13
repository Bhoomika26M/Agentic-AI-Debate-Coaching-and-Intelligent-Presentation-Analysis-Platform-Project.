"""
pytest conftest.py — sets up an in-memory SQLite test database and async test client.

The test DB uses SQLite (via aiosqlite) so no Postgres/Docker is needed for pytest.
All tests share the same engine per session; each test function gets a fresh DB.
"""

import asyncio
import pytest
import pytest_asyncio

from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.main import app
from app.db.base import Base
from app.db.session import AsyncSessionLocal
from app.core.deps import get_db

# Use SQLite in-memory for tests (no Postgres required)
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
)
TestSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


@pytest_asyncio.fixture(scope="session")
def event_loop():
    """Use a single event loop for the whole test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session", autouse=True)
async def create_tables():
    """Create all tables once per test session."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture(autouse=True)
async def clear_tables():
    """Truncate all tables between tests for isolation."""
    yield
    async with test_engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            await conn.execute(table.delete())


async def override_get_db():
    async with TestSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


# Override the DB dependency for all tests
app.dependency_overrides[get_db] = override_get_db


@pytest_asyncio.fixture
async def client() -> AsyncClient:
    """Async HTTP test client bound to the FastAPI app."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac


@pytest_asyncio.fixture
async def db() -> AsyncSession:
    """Direct DB session fixture for setup helpers."""
    async with TestSessionLocal() as session:
        yield session


# ─── Helper factories ─────────────────────────────────────────────────────────

async def create_user_and_token(client: AsyncClient, email: str, password: str,
                                 name: str = "Test User", role: str = "learner") -> tuple[dict, str]:
    """Register a user and log in, returning (user_data, access_token)."""
    # Register
    reg_resp = await client.post("/api/v1/auth/register", json={
        "name": name, "email": email, "password": password, "role": role
    })
    assert reg_resp.status_code == 201, reg_resp.text

    # Login
    login_resp = await client.post("/api/v1/auth/login", json={
        "email": email, "password": password
    })
    assert login_resp.status_code == 200, login_resp.text
    token = login_resp.json()["access_token"]
    return reg_resp.json(), token


async def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}
