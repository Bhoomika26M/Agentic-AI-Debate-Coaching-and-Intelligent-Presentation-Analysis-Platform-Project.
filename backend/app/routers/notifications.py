"""
Notification & Engagement Router — Milestone 4
Provides:
 - Debate reminders
 - Coaching feedback alerts
 - Practice session reminders
 - Skill milestone notifications
 - Platform announcements
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, or_
from pydantic import BaseModel, Field, ConfigDict

from app.core.database import get_db
from app.models.notification import Notification, NotificationType
from app.models.user import User
from app.routers.users import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notification & Engagement"])


class NotificationCreateRequest(BaseModel):
    user_id: str | None = Field(None, description="Target user ID or None for broadcast")
    title: str = Field(..., min_length=3, max_length=200)
    message: str = Field(..., min_length=5)
    type: str = Field(NotificationType.ANNOUNCEMENT, description="debate_reminder | coaching_feedback | practice_reminder | skill_milestone | announcement")
    link: str | None = None


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str | None
    title: str
    message: str
    type: str
    link: str | None
    is_read: bool
    created_at: datetime


class NotificationListResponse(BaseModel):
    unread_count: int
    total_count: int
    notifications: list[NotificationOut]


@router.get("", response_model=NotificationListResponse)
@router.get("/", response_model=NotificationListResponse)
async def list_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve real notifications for the authenticated user, including platform broadcasts.
    """
    result = await db.execute(
        select(Notification)
        .where(or_(Notification.user_id == current_user.id, Notification.user_id.is_(None)))
        .order_by(Notification.created_at.desc())
    )
    items = result.scalars().all()
    unread_count = sum(1 for n in items if not n.is_read)

    return NotificationListResponse(
        unread_count=unread_count,
        total_count=len(items),
        notifications=[NotificationOut.model_validate(n) for n in items],
    )


@router.put("/{notification_id}/read", response_model=NotificationOut)
async def mark_as_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark a specific notification as read."""
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            or_(Notification.user_id == current_user.id, Notification.user_id.is_(None))
        )
    )
    notif = result.scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found.")

    notif.is_read = True
    await db.flush()
    return NotificationOut.model_validate(notif)


@router.put("/read-all")
async def mark_all_as_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark all notifications for the user as read."""
    await db.execute(
        update(Notification)
        .where(or_(Notification.user_id == current_user.id, Notification.user_id.is_(None)))
        .values(is_read=True)
    )
    return {"status": "ok", "message": "All notifications marked as read."}


@router.post("/create", response_model=NotificationOut, status_code=status.HTTP_201_CREATED)
async def create_notification(
    payload: NotificationCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a notification. Coaches, Educators, and Admins can target any user or broadcast.
    Learners can trigger personal practice reminders.
    """
    if payload.user_id is None:
        if current_user.role == "learner":
            target_user_id = current_user.id
        else:
            target_user_id = None
    else:
        target_user_id = payload.user_id

    notif = Notification(
        user_id=target_user_id,
        title=payload.title,
        message=payload.message,
        type=payload.type,
        link=payload.link,
        is_read=False,
    )
    db.add(notif)
    await db.flush()
    return NotificationOut.model_validate(notif)


@router.post("/announcement", response_model=NotificationOut, status_code=status.HTTP_201_CREATED)
async def broadcast_announcement(
    title: str = Query(..., min_length=3),
    message: str = Query(..., min_length=5),
    link: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Broadcast an official platform announcement to all users (Admin/Coach/Educator)."""
    if current_user.role not in ("admin", "coach", "educator"):
        raise HTTPException(status_code=403, detail="Admin, coach, or educator privileges required.")

    notif = Notification(
        user_id=None,
        title=f"📢 {title}",
        message=message,
        type=NotificationType.ANNOUNCEMENT,
        link=link,
        is_read=False,
    )
    db.add(notif)
    await db.flush()
    return NotificationOut.model_validate(notif)
