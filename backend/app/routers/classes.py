import json
import uuid
from typing import Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.core.database import get_db
from app.models.classroom import Classroom
from app.models.user import User
from app.routers.users import get_current_user

router = APIRouter(prefix="/classes", tags=["Classrooms & Cohorts"])


def _normalize_student_ids(raw) -> list[str]:
    """Safely convert database JSON or raw string/list into a list of string user IDs."""
    if not raw:
        return []
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, list):
                return [str(x) for x in parsed if x]
        except Exception:
            return []
    if isinstance(raw, list):
        return [str(x) for x in raw if x]
    return []


class ClassCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    description: str | None = None
    coach_id: str | None = None
    student_ids: list[str] = Field(default_factory=list)


class ClassUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    coach_id: str | None = None
    student_ids: list[str] | None = None


class ClassOut(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str | None = None
    educator_id: str
    educator_name: str | None = None
    coach_id: str | None = None
    coach_name: str | None = None
    student_ids: list[str] = Field(default_factory=list)
    student_count: int = 0
    students: list[dict] = Field(default_factory=list)
    created_at: Any = None
    updated_at: Any = None


@router.get("", response_model=list[ClassOut])
@router.get("/", response_model=list[ClassOut])
async def list_classes(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List classrooms.
    - Admin: All classrooms.
    - Educator: Classrooms created by the educator.
    - Coach: Classrooms assigned to the coach.
    - Learner: Classrooms the learner is enrolled in.
    """
    if current_user.role == "admin":
        stmt = select(Classroom).order_by(Classroom.created_at.desc())
    elif current_user.role == "educator":
        stmt = select(Classroom).where(Classroom.educator_id == current_user.id).order_by(Classroom.created_at.desc())
    elif current_user.role == "coach":
        stmt = select(Classroom).where(Classroom.coach_id == current_user.id).order_by(Classroom.created_at.desc())
    else:
        # Learner
        stmt = select(Classroom).order_by(Classroom.created_at.desc())

    result = await db.execute(stmt)
    classes = list(result.scalars().all())

    # Normalize student_ids on all records
    for c in classes:
        c.student_ids = _normalize_student_ids(c.student_ids)

    # Filter for learners if needed
    if current_user.role == "learner":
        classes = [c for c in classes if current_user.id in c.student_ids]

    # Batch fetch user details for coach and students
    user_ids = set()
    for c in classes:
        user_ids.add(c.educator_id)
        if c.coach_id:
            user_ids.add(c.coach_id)
        for sid in c.student_ids:
            user_ids.add(sid)

    user_map = {}
    if user_ids:
        u_res = await db.execute(select(User).where(User.id.in_(list(user_ids))))
        user_map = {u.id: u for u in u_res.scalars().all()}

    output = []
    for c in classes:
        ed = user_map.get(c.educator_id)
        co = user_map.get(c.coach_id) if c.coach_id else None
        st_list = []
        for sid in c.student_ids:
            st = user_map.get(sid)
            if st:
                st_list.append({
                    "id": st.id,
                    "name": st.full_name,
                    "email": st.email,
                    "avg_score": st.avg_score or 0.0,
                    "total_sessions": st.total_sessions or 0,
                })
        output.append(ClassOut(
            id=c.id,
            name=c.name,
            description=c.description,
            educator_id=c.educator_id,
            educator_name=ed.full_name if ed else "Educator",
            coach_id=c.coach_id,
            coach_name=co.full_name if co else None,
            student_ids=c.student_ids,
            student_count=len(c.student_ids),
            students=st_list,
            created_at=c.created_at,
            updated_at=c.updated_at,
        ))
    return output


@router.post("", response_model=ClassOut, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=ClassOut, status_code=status.HTTP_201_CREATED)
async def create_class(
    payload: ClassCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new classroom/cohort. Educators and Admins only."""
    if current_user.role not in ("educator", "admin"):
        raise HTTPException(status_code=403, detail="Only educators and admins can create classes.")

    coach_id = payload.coach_id.strip() if payload.coach_id and payload.coach_id.strip() else None
    student_ids = _normalize_student_ids(payload.student_ids)

    new_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    classroom = Classroom(
        id=new_id,
        name=payload.name.strip(),
        description=payload.description.strip() if payload.description else None,
        educator_id=current_user.id,
        coach_id=coach_id,
        student_ids=student_ids,
        created_at=now,
        updated_at=now,
    )
    db.add(classroom)
    await db.commit()
    await db.refresh(classroom)

    # Fetch coach name if coach assigned
    coach_name = None
    if classroom.coach_id:
        c_res = await db.execute(select(User).where(User.id == classroom.coach_id))
        co = c_res.scalar_one_or_none()
        if co:
            coach_name = co.full_name

    # Fetch assigned student details
    st_list = []
    if student_ids:
        st_res = await db.execute(select(User).where(User.id.in_(student_ids)))
        for st in st_res.scalars().all():
            st_list.append({
                "id": st.id,
                "name": st.full_name,
                "email": st.email,
                "avg_score": st.avg_score or 0.0,
                "total_sessions": st.total_sessions or 0,
            })

    return ClassOut(
        id=classroom.id,
        name=classroom.name,
        description=classroom.description,
        educator_id=classroom.educator_id,
        educator_name=current_user.full_name,
        coach_id=classroom.coach_id,
        coach_name=coach_name,
        student_ids=student_ids,
        student_count=len(student_ids),
        students=st_list,
        created_at=classroom.created_at,
        updated_at=classroom.updated_at,
    )


@router.put("/{class_id}", response_model=ClassOut)
async def update_class(
    class_id: str,
    payload: ClassUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Modify a classroom (reassign coach, students, name). Educator owner or Admin."""
    result = await db.execute(select(Classroom).where(Classroom.id == class_id))
    classroom = result.scalar_one_or_none()
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found.")

    if current_user.role != "admin" and classroom.educator_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to modify this class.")

    if payload.name is not None:
        classroom.name = payload.name.strip()
    if payload.description is not None:
        classroom.description = payload.description.strip() if payload.description else None
    if payload.coach_id is not None:
        classroom.coach_id = payload.coach_id.strip() if payload.coach_id and payload.coach_id.strip() else None
    if payload.student_ids is not None:
        classroom.student_ids = _normalize_student_ids(payload.student_ids)

    classroom.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(classroom)

    # Fetch details
    ed_res = await db.execute(select(User).where(User.id == classroom.educator_id))
    ed = ed_res.scalar_one_or_none()
    coach_name = None
    if classroom.coach_id:
        c_res = await db.execute(select(User).where(User.id == classroom.coach_id))
        co = c_res.scalar_one_or_none()
        if co:
            coach_name = co.full_name

    norm_ids = _normalize_student_ids(classroom.student_ids)
    st_list = []
    if norm_ids:
        st_res = await db.execute(select(User).where(User.id.in_(norm_ids)))
        for st in st_res.scalars().all():
            st_list.append({
                "id": st.id,
                "name": st.full_name,
                "email": st.email,
                "avg_score": st.avg_score or 0.0,
                "total_sessions": st.total_sessions or 0,
            })

    return ClassOut(
        id=classroom.id,
        name=classroom.name,
        description=classroom.description,
        educator_id=classroom.educator_id,
        educator_name=ed.full_name if ed else "Educator",
        coach_id=classroom.coach_id,
        coach_name=coach_name,
        student_ids=norm_ids,
        student_count=len(norm_ids),
        students=st_list,
        created_at=classroom.created_at,
        updated_at=classroom.updated_at,
    )


@router.delete("/{class_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_class(
    class_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a classroom. Educator owner or Admin."""
    result = await db.execute(select(Classroom).where(Classroom.id == class_id))
    classroom = result.scalar_one_or_none()
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found.")
    if current_user.role != "admin" and classroom.educator_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to delete this class.")

    await db.delete(classroom)
    await db.commit()


@router.get("/roster/options")
async def get_roster_options(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return available coaches and learners for class assignment."""
    if current_user.role not in ("educator", "coach", "admin"):
        raise HTTPException(status_code=403, detail="Forbidden")

    coaches_res = await db.execute(select(User).where(User.role == "coach").order_by(User.full_name))
    coaches = coaches_res.scalars().all()

    students_res = await db.execute(select(User).where(User.role == "learner").order_by(User.full_name))
    students = students_res.scalars().all()

    return {
        "coaches": [{"id": c.id, "name": c.full_name, "email": c.email} for c in coaches],
        "students": [{"id": s.id, "name": s.full_name, "email": s.email, "avg_score": s.avg_score or 0.0} for s in students],
    }
