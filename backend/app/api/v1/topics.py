from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.session import get_db
from app.models.models import User, DebateTopic
from app.models.enums import UserRole, TopicDifficulty
from app.schemas.topic_session import TopicCreate, TopicUpdate, TopicResponse
from app.api.deps import get_current_user, require_roles

router = APIRouter()

@router.get("/", response_model=List[TopicResponse])
async def list_topics(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    category: Optional[str] = None,
    difficulty: Optional[TopicDifficulty] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Browse debate topics with optional search, category, and difficulty filters."""
    query = select(DebateTopic).order_by(DebateTopic.created_at.desc()).offset(skip).limit(limit)
    if category:
        query = query.where(DebateTopic.category == category)
    if difficulty:
        query = query.where(DebateTopic.difficulty == difficulty)
    if search:
        query = query.where(DebateTopic.title.ilike(f"%{search}%"))
        
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/{topic_id}", response_model=TopicResponse)
async def get_topic(topic_id: str, db: AsyncSession = Depends(get_db)):
    """Retrieve details of a single debate topic."""
    topic = await db.get(DebateTopic, topic_id)
    if not topic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found")
    return topic

@router.post("/", response_model=TopicResponse, status_code=status.HTTP_201_CREATED)
async def create_topic(
    topic_in: TopicCreate,
    current_user: User = Depends(require_roles([UserRole.DEBATE_COACH, UserRole.EDUCATOR, UserRole.ADMIN])),
    db: AsyncSession = Depends(get_db)
):
    """Create a new debate topic. Restricted to Coaches, Educators, and Admins."""
    topic = DebateTopic(
        title=topic_in.title,
        description=topic_in.description,
        category=topic_in.category,
        difficulty=topic_in.difficulty,
        created_by=current_user.id
    )
    db.add(topic)
    await db.commit()
    await db.refresh(topic)
    return topic

@router.patch("/{topic_id}", response_model=TopicResponse)
async def update_topic(
    topic_id: str,
    topic_in: TopicUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a debate topic. Restricted to the creator or an Admin."""
    topic = await db.get(DebateTopic, topic_id)
    if not topic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found")
    if topic.created_by != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot edit another user's topic")

    update_data = topic_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(topic, field, value)

    await db.commit()
    await db.refresh(topic)
    return topic

@router.delete("/{topic_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_topic(
    topic_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a debate topic. Restricted to creator or Admin."""
    topic = await db.get(DebateTopic, topic_id)
    if not topic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found")
    if topic.created_by != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot delete this topic")

    await db.delete(topic)
    await db.commit()
    return None