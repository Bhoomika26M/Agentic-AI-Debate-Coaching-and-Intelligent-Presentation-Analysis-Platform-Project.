from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from app.core.timezone import UTCDateTime


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    title: str
    message: str
    type: str
    is_read: bool
    created_at: UTCDateTime


class NotificationListResponse(BaseModel):
    unread_count: int
    notifications: list[NotificationResponse]


class AnnouncementRequest(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    message: str = Field(min_length=5, max_length=5000)
