from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from backend.app.database.session import get_db
from backend.app.models.entities import User, DebateSession, PresentationSession
from backend.app.auth.dependencies import require_role

router = APIRouter(prefix="/admin", tags=["Admin Management"])

@router.get("/users", response_model=List[Dict[str, Any]])
def list_all_users(
    role: str = None,
    search: str = None,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    if search:
        query = query.filter((User.full_name.ilike(f"%{search}%")) | (User.email.ilike(f"%{search}%")))
    
    users = query.all()
    results = []
    for u in users:
        results.append({
            "id": u.id,
            "full_name": u.full_name,
            "email": u.email,
            "role": u.role,
            "is_active": u.is_active,
            "experience_level": u.profile.experience_level if u.profile else "Beginner",
            "created_at": u.created_at
        })
    return results

@router.put("/users/{id}/role")
def change_user_role(
    id: int,
    payload: Dict[str, str],
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    new_role = payload.get("role")
    if new_role not in ["learner", "coach", "educator", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role specified")
    
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.role = new_role
    db.commit()
    return {"status": "success", "user_id": id, "new_role": new_role}

@router.put("/users/{id}/status")
def toggle_user_status(
    id: int,
    payload: Dict[str, bool],
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    is_active = payload.get("is_active", True)
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_active = is_active
    db.commit()
    return {"status": "success", "user_id": id, "is_active": is_active}

@router.get("/ai-monitoring", response_model=Dict[str, Any])
def get_ai_monitoring_metrics(
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    total_debates = db.query(DebateSession).count()
    total_pres = db.query(PresentationSession).count()
    
    return {
        "total_ai_requests": total_debates * 6 + total_pres * 2 + 350,
        "average_latency_ms": 284,
        "error_rate": "0.04%",
        "active_ai_pipeline": "Hybrid Agentic (Fast Deterministic Rules + OpenAI GPT-4o-mini Ready)",
        "latency_timeline": [
            {"time": "12:00", "latency": 270},
            {"time": "13:00", "latency": 295},
            {"time": "14:00", "latency": 260},
            {"time": "15:00", "latency": 310},
            {"time": "16:00", "latency": 284}
        ],
        "request_distribution": [
            {"name": "Argument Mining", "value": 450},
            {"name": "Fallacy Detection", "value": 420},
            {"name": "Rebuttal Engine", "value": 310},
            {"name": "Speech & Pacing", "value": 180}
        ]
    }
