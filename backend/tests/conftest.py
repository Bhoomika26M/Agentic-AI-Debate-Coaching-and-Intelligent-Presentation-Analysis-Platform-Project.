import pytest
import asyncio
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.main import app
from app.db.session import Base, get_db
from app.models.models import User, Profile
from app.models.enums import UserRole, ExperienceLevel
from app.core.security import get_password_hash, create_access_token

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)



@pytest.fixture(autouse=True)
async def setup_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
    async with TestSessionLocal() as session:
        yield session

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

@pytest.fixture
async def admin_user() -> User:
    async with TestSessionLocal() as session:
        user = User(
            id="test-admin-id",
            email="admin_test@arena.ai",
            password_hash=get_password_hash("AdminPass123!"),
            full_name="Admin Tester",
            role=UserRole.ADMIN,
            is_active=True
        )
        session.add(user)
        session.add(Profile(
            user_id=user.id,
            experience_level=ExperienceLevel.ADVANCED,
            preferred_topics=[],
            presentation_domains=[]
        ))
        await session.commit()
        await session.refresh(user)
        return user

@pytest.fixture
async def learner_user() -> User:
    async with TestSessionLocal() as session:
        user = User(
            id="test-learner-id",
            email="learner_test@arena.ai",
            password_hash=get_password_hash("LearnerPass123!"),
            full_name="Learner Tester",
            role=UserRole.LEARNER,
            is_active=True
        )
        session.add(user)
        session.add(Profile(
            user_id=user.id,
            experience_level=ExperienceLevel.BEGINNER,
            preferred_topics=[],
            presentation_domains=[]
        ))
        await session.commit()
        await session.refresh(user)
        return user

@pytest.fixture
def admin_token(admin_user: User) -> str:
    return create_access_token(admin_user.id)

@pytest.fixture
def learner_token(learner_user: User) -> str:
    return create_access_token(learner_user.id)
