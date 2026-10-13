from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.deps import get_db, get_current_user, require_roles
from app.models.user import User
from app.models.debate import DebateTopic
from app.schemas.debate import TopicCreate, TopicUpdate, TopicRead

router = APIRouter(prefix="/topics", tags=["Debate Topics"])


@router.get("", response_model=list[TopicRead])
async def list_topics(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """List all debate topics. Any authenticated user can browse."""
    result = await db.execute(select(DebateTopic))
    return result.scalars().all()


@router.get("/{topic_id}", response_model=TopicRead)
async def get_topic(
    topic_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(DebateTopic).where(DebateTopic.id == topic_id))
    topic = result.scalar_one_or_none()
    if not topic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found")
    return topic


@router.post("", response_model=TopicRead, status_code=status.HTTP_201_CREATED)
async def create_topic(
    body: TopicCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("educator", "administrator")),
):
    """Create a debate topic. Educators and administrators only."""
    topic = DebateTopic(created_by=current_user.id, **body.model_dump())
    db.add(topic)
    await db.commit()
    await db.refresh(topic)
    return topic


@router.patch("/{topic_id}", response_model=TopicRead)
async def update_topic(
    topic_id: UUID,
    body: TopicUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("educator", "administrator")),
):
    result = await db.execute(select(DebateTopic).where(DebateTopic.id == topic_id))
    topic = result.scalar_one_or_none()
    if not topic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(topic, field, value)
    await db.commit()
    await db.refresh(topic)
    return topic


@router.delete("/{topic_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_topic(
    topic_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles("administrator")),
):
    """Delete a debate topic. Administrators only."""
    result = await db.execute(select(DebateTopic).where(DebateTopic.id == topic_id))
    topic = result.scalar_one_or_none()
    if not topic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found")
    await db.delete(topic)
    await db.commit()
