from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.deps import get_db, get_current_user, require_roles
from app.models.user import User
from app.models.skill import SkillRecord, SkillType
from app.schemas.skill import SkillRecordCreate, SkillRecordRead, SkillSummary, SkillSummaryItem

router = APIRouter(prefix="/skills", tags=["Skills"])


@router.get("/me", response_model=list[SkillRecordRead])
async def list_my_skills(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return all skill records for the current user, newest first."""
    result = await db.execute(
        select(SkillRecord)
        .where(SkillRecord.user_id == current_user.id)
        .order_by(desc(SkillRecord.recorded_at))
    )
    return result.scalars().all()


@router.post("/me", response_model=SkillRecordRead, status_code=status.HTTP_201_CREATED)
async def add_skill_record(
    body: SkillRecordCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a skill score for the current user (self-assessment or manual)."""
    record = SkillRecord(user_id=current_user.id, **body.model_dump())
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record


@router.get("/me/summary", response_model=SkillSummary)
async def get_skill_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return the latest score per skill type and a trend
    (difference between latest and previous score).
    """
    summary_items: list[SkillSummaryItem] = []

    for skill in SkillType:
        result = await db.execute(
            select(SkillRecord)
            .where(
                SkillRecord.user_id == current_user.id,
                SkillRecord.skill_type == skill,
            )
            .order_by(desc(SkillRecord.recorded_at))
            .limit(2)
        )
        records = result.scalars().all()

        if not records:
            continue

        latest = records[0].score
        previous = records[1].score if len(records) > 1 else None
        trend = (latest - previous) if previous is not None else None

        summary_items.append(
            SkillSummaryItem(
                skill_type=skill,
                latest_score=latest,
                previous_score=previous,
                trend=trend,
            )
        )

    return SkillSummary(skills=summary_items)


# Coach can add skill records on behalf of a learner
@router.post("/users/{user_id}", response_model=SkillRecordRead, status_code=status.HTTP_201_CREATED)
async def add_skill_for_user(
    user_id: UUID,
    body: SkillRecordCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("debate_coach", "educator", "administrator")),
):
    """Allow coaches/educators/admins to add skill records for a specific learner."""
    result = await db.execute(select(User).where(User.id == user_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    record = SkillRecord(user_id=user_id, **body.model_dump())
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record
