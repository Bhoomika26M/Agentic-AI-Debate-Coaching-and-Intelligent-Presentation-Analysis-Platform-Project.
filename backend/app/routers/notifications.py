from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import AnnouncementRequest, NotificationListResponse, NotificationResponse
from app.services.auth_service import get_current_user, require_administrator
from app.services.notification_service import broadcast_announcement


router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=NotificationListResponse)
def list_notifications(
    limit: int = Query(default=50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    database: Session = Depends(get_db),
):
    query = (
        database.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
    )
    items = query.limit(limit).all()
    unread_count = (
        database.query(Notification)
        .filter(Notification.user_id == current_user.id, Notification.is_read.is_(False))
        .count()
    )
    return NotificationListResponse(
        unread_count=unread_count,
        notifications=items,
    )


@router.post("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    database: Session = Depends(get_db),
):
    notification = database.get(Notification, notification_id)
    if notification is None or notification.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Notification not found")
    notification.is_read = True
    database.commit()
    database.refresh(notification)
    return notification


@router.post("/read-all")
def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    database: Session = Depends(get_db),
):
    database.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read.is_(False),
    ).update({"is_read": True})
    database.commit()
    return {"message": "All notifications marked as read"}


@router.post("/announcement", status_code=status.HTTP_201_CREATED)
def make_announcement(
    payload: AnnouncementRequest,
    current_user: User = Depends(require_administrator),
    database: Session = Depends(get_db),
):
    recipients = broadcast_announcement(database, payload.title, payload.message)
    return {"message": f"Announcement sent to {recipients} platform users"}
