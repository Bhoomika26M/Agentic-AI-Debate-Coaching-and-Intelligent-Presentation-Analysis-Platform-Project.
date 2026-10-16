from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_active_user, require_roles
from app.models.user import User, UserRole
from app.services.dashboard_service import DashboardService
from app.schemas.dashboard import (
    LearnerDashboardResponse,
    CoachDashboardResponse,
    EducatorDashboardResponse,
    AdminDashboardResponse,
)

router = APIRouter(prefix="/dashboards", tags=["Dashboards & Analytics"])

@router.get("/learner", response_model=LearnerDashboardResponse)
def get_learner_dashboard(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    service = DashboardService(db)
    return service.get_learner_dashboard(current_user.id)

@router.get("/coach", response_model=CoachDashboardResponse)
def get_coach_dashboard(
    current_user: User = Depends(require_roles(UserRole.COACH, UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    service = DashboardService(db)
    return service.get_coach_dashboard(current_user)

@router.get("/educator", response_model=EducatorDashboardResponse)
def get_educator_dashboard(
    current_user: User = Depends(require_roles(UserRole.EDUCATOR, UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    service = DashboardService(db)
    return service.get_educator_dashboard(current_user)

@router.get("/admin", response_model=AdminDashboardResponse)
def get_admin_dashboard(
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    service = DashboardService(db)
    return service.get_admin_dashboard(admin_user=current_user)
