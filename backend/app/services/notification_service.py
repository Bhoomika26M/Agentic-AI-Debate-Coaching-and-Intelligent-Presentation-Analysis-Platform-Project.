from datetime import datetime
from sqlalchemy.orm import Session

from app.core.timezone import format_ist
from app.models.notification import Notification
from app.models.user import User


def create_notification(
    database: Session,
    user_id: int,
    title: str,
    message: str,
    type: str = "general",
) -> Notification:
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=type,
    )
    database.add(notification)
    database.commit()
    database.refresh(notification)
    return notification


def notify_debate_reminder(
    database: Session,
    user_id: int,
    debate_topic: str,
    scheduled_at: datetime | None = None,
) -> Notification:
    time_str = f" scheduled for {format_ist(scheduled_at, '%b %d, %Y at %I:%M %p')}" if scheduled_at else ""
    return create_notification(
        database,
        user_id=user_id,
        title="Debate Session Reminder",
        message=f"Your debate session on '{debate_topic}'{time_str} is ready for practice.",
        type="debate_reminder",
    )


def notify_coaching_feedback(
    database: Session,
    user_id: int,
    debate_topic: str,
    score: float | None = None,
) -> Notification:
    score_str = f" Overall score: {score}/100." if score is not None else ""
    return create_notification(
        database,
        user_id=user_id,
        title="New Coaching Feedback Ready",
        message=f"Coaching feedback and personalized improvement suggestions have been generated for '{debate_topic}'.{score_str}",
        type="coaching_alert",
    )


def notify_skill_milestone(
    database: Session,
    user_id: int,
    skill_name: str,
    score: int,
) -> Notification:
    return create_notification(
        database,
        user_id=user_id,
        title="Skill Milestone Reached!",
        message=f"Congratulations! Your {skill_name.replace('_', ' ')} score has been updated to {score}/100.",
        type="skill_milestone",
    )


def broadcast_announcement(
    database: Session,
    title: str,
    message: str,
) -> int:
    users = database.query(User).all()
    count = 0
    for user in users:
        database.add(
            Notification(
                user_id=user.id,
                title=title,
                message=message,
                type="announcement",
            )
        )
        count += 1
    database.commit()
    return count
