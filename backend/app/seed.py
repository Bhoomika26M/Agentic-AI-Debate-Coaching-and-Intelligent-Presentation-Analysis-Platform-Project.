"""
Seed script — creates one user per role + 5 sample debate topics.

Run with:
    cd backend
    python -m app.seed
"""

import asyncio
import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import select

from app.core.config import settings
from app.core.security import hash_password
from app.models.user import User, UserRole, AuthProvider
from app.models.debate import DebateTopic


SEED_USERS = [
    {
        "name": "Admin User",
        "email": "admin@debatecoach.dev",
        "password": "Admin@1234",
        "role": UserRole.administrator,
    },
    {
        "name": "Educator Kim",
        "email": "educator@debatecoach.dev",
        "password": "Educator@1234",
        "role": UserRole.educator,
    },
    {
        "name": "Coach Alex",
        "email": "coach@debatecoach.dev",
        "password": "Coach@1234",
        "role": UserRole.debate_coach,
    },
    {
        "name": "Learner Jane",
        "email": "learner@debatecoach.dev",
        "password": "Learner@1234",
        "role": UserRole.learner,
    },
]

SAMPLE_TOPICS = [
    {
        "title": "AI will replace 50% of jobs by 2035",
        "description": "Advances in automation and generative AI will displace half the current workforce within a decade.",
        "category": "Technology",
    },
    {
        "title": "Climate change requires immediate binding global policy",
        "description": "Nations must adopt legally binding emissions targets enforceable by international bodies.",
        "category": "Politics",
    },
    {
        "title": "Universal Basic Income is economically viable and morally necessary",
        "description": "UBI should replace complex welfare systems to eliminate poverty and enable human flourishing.",
        "category": "Economics",
    },
    {
        "title": "Social media platforms should be legally liable for misinformation",
        "description": "Holding platforms liable under defamation law would incentivize better content moderation.",
        "category": "Law & Ethics",
    },
    {
        "title": "Gene editing in human embryos should be permitted for disease prevention",
        "description": "CRISPR-based germline editing should be allowed under strict regulatory oversight.",
        "category": "Bioethics",
    },
]


async def seed():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with Session() as db:
        # Create users
        admin_user = None
        for user_data in SEED_USERS:
            result = await db.execute(select(User).where(User.email == user_data["email"]))
            existing = result.scalar_one_or_none()
            if existing:
                print(f"[seed] User already exists: {user_data['email']}")
                if user_data["role"] == UserRole.administrator:
                    admin_user = existing
                continue

            user = User(
                name=user_data["name"],
                email=user_data["email"],
                hashed_password=hash_password(user_data["password"]),
                role=user_data["role"],
                auth_provider=AuthProvider.local,
            )
            db.add(user)
            await db.flush()
            print(f"[seed] Created user: {user.email} ({user.role.value})")
            if user_data["role"] == UserRole.administrator:
                admin_user = user

        await db.flush()

        # Create topics
        for topic_data in SAMPLE_TOPICS:
            result = await db.execute(
                select(DebateTopic).where(DebateTopic.title == topic_data["title"])
            )
            if result.scalar_one_or_none():
                print(f"[seed] Topic already exists: {topic_data['title'][:50]}...")
                continue

            topic = DebateTopic(
                title=topic_data["title"],
                description=topic_data["description"],
                category=topic_data["category"],
                created_by=admin_user.id if admin_user else None,
            )
            db.add(topic)
            print(f"[seed] Created topic: {topic_data['title'][:60]}...")

        await db.commit()

    await engine.dispose()
    print("[seed] Done!")


if __name__ == "__main__":
    asyncio.run(seed())
