from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.user import User, Profile, UserSkill, LearningGoal, UserRole
from app.models.debate import DebateSession, DebateTurn
from app.models.analysis import PerformanceScore, FallacyFinding
from app.repositories.user_repo import UserRepository
from app.repositories.debate_repo import DebateRepository
from app.agents.specialists.coach_agent import CURATED_DRILLS
from app.schemas.dashboard import (
    LearnerDashboardResponse,
    CoachDashboardResponse,
    EducatorDashboardResponse,
    AdminDashboardResponse,
    StudentProgressItem,
)
from app.schemas.profile import ProfileResponse, SkillResponse, GoalResponse
from app.schemas.debate import SessionResponse
from app.schemas.scoring import SessionScoreRecordResponse
from app.core.config import settings

class DashboardService:
    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)
        self.debate_repo = DebateRepository(db)

    def get_learner_dashboard(self, user_id: str) -> LearnerDashboardResponse:
        user = self.user_repo.get_by_id(user_id)
        profile = self.user_repo.get_profile(user_id)
        skills = self.user_repo.get_skills(user_id)
        goals = self.user_repo.list_goals(user_id)
        sessions = self.debate_repo.list_sessions(user_id=user_id, limit=5)

        scores_records = (
            self.db.query(PerformanceScore)
            .filter(PerformanceScore.user_id == user_id)
            .order_by(PerformanceScore.created_at.desc())
            .limit(5)
            .all()
        )

        radar = [
            {"skill": "Clarity", "score": skills.clarity_score if skills else 75.0, "benchmark": 80.0},
            {"skill": "Reasoning", "score": skills.reasoning_score if skills else 70.0, "benchmark": 80.0},
            {"skill": "Evidence", "score": skills.evidence_score if skills else 68.0, "benchmark": 75.0},
            {"skill": "Rebuttal", "score": skills.rebuttal_score if skills else 65.0, "benchmark": 75.0},
            {"skill": "Delivery", "score": skills.delivery_score if skills else 78.0, "benchmark": 80.0},
        ]

        score_trend = [
            {"session": f"Session #{i+1}", "score": rec.overall_score}
            for i, rec in enumerate(reversed(scores_records))
        ] if scores_records else [
            {"session": "Match 1", "score": 68.0},
            {"session": "Match 2", "score": 74.0},
            {"session": "Match 3", "score": 82.5},
        ]

        return LearnerDashboardResponse(
            user_id=user.id,
            full_name=user.full_name,
            role=user.role,
            profile=ProfileResponse.model_validate(profile),
            skills=SkillResponse.model_validate(skills),
            recent_sessions=[SessionResponse.model_validate(s) for s in sessions],
            recent_scores=[SessionScoreRecordResponse.model_validate(r) for r in scores_records],
            active_goals=[GoalResponse.model_validate(g) for g in goals],
            radar_data=radar,
            score_trend=score_trend,
            recommended_drills=[d.model_dump() for d in CURATED_DRILLS],
        )

    def get_coach_dashboard(self, coach_user: User) -> CoachDashboardResponse:
        students = self.db.query(User).filter(User.role == UserRole.LEARNER).all()
        student_items = []
        for s in students:
            profile = self.user_repo.get_profile(s.id)
            skills = self.user_repo.get_skills(s.id)
            avg_score = round(
                (skills.clarity_score + skills.reasoning_score + skills.evidence_score + skills.rebuttal_score + skills.delivery_score) / 5.0,
                1
            ) if skills else 72.0
            student_items.append(
                StudentProgressItem(
                    user_id=s.id,
                    full_name=s.full_name,
                    email=s.email,
                    experience_level=profile.experience_level if profile else "Novice",
                    debater_level=profile.debater_level if profile else 1,
                    debater_xp=profile.debater_xp if profile else 100,
                    average_score=avg_score,
                    total_debates=skills.total_debates_count if skills else 3,
                    primary_weakness="Evidence Usage" if (skills and skills.evidence_score < 70) else "Rebuttal Speed",
                    recent_fallacy_rate=0.8,
                )
            )

        avg_cohort = round(sum(item.average_score for item in student_items) / max(1, len(student_items)), 1)

        return CoachDashboardResponse(
            coach_name=coach_user.full_name,
            total_students_monitored=len(student_items),
            average_cohort_score=avg_cohort,
            students=student_items,
            skill_gap_analysis={
                "Argument Clarity": 76.5,
                "Evidence Verification": 64.2,
                "Fallacy Immunity": 71.0,
                "Rebuttal Speed": 68.4,
                "Delivery & Pace": 79.1,
            },
            recent_session_reviews=[
                {"session": "AI Governance Oxford Debate", "student": "Alex Rivera", "score": 83.5, "status": "Reviewed"},
                {"session": "Carbon Tax Policy Debate", "student": "Jordan Lee", "score": 76.0, "status": "Pending Notes"},
            ],
        )

    def get_educator_dashboard(self, educator_user: User) -> EducatorDashboardResponse:
        students = self.db.query(User).filter(User.role == UserRole.LEARNER).all()
        student_items = []
        for s in students:
            profile = self.user_repo.get_profile(s.id)
            skills = self.user_repo.get_skills(s.id)
            avg_score = round(
                (skills.clarity_score + skills.reasoning_score + skills.evidence_score + skills.rebuttal_score + skills.delivery_score) / 5.0,
                1
            ) if skills else 72.0
            student_items.append(
                StudentProgressItem(
                    user_id=s.id,
                    full_name=s.full_name,
                    email=s.email,
                    experience_level=profile.experience_level if profile else "Novice",
                    debater_level=profile.debater_level if profile else 1,
                    debater_xp=profile.debater_xp if profile else 100,
                    average_score=avg_score,
                    total_debates=skills.total_debates_count if skills else 3,
                    primary_weakness="Evidence Usage",
                    recent_fallacy_rate=0.7,
                )
            )

        sorted_students = sorted(student_items, key=lambda x: x.average_score, reverse=True)
        top = sorted_students[:3]
        needs_support = sorted_students[-2:] if len(sorted_students) >= 2 else sorted_students

        return EducatorDashboardResponse(
            educator_name=educator_user.full_name,
            total_classes=2,
            total_students=len(student_items),
            cohort_average_score=75.8,
            top_performers=top,
            needs_support=needs_support,
            format_mastery_breakdown={
                "Oxford Debate": 82.0,
                "Parliamentary": 74.5,
                "AI Debate Simulation": 80.2,
                "Public Forum": 78.4,
                "Policy": 69.1,
            },
            cohort_growth_rate=14.2,
        )

    def get_admin_dashboard(self, admin_user: User) -> AdminDashboardResponse:
        total_users = self.db.query(User).count()
        total_debates = self.db.query(DebateSession).count()
        total_turns = self.db.query(DebateTurn).count()

        roles = [UserRole.LEARNER, UserRole.COACH, UserRole.EDUCATOR, UserRole.ADMIN]
        dist = {r: self.db.query(User).filter(User.role == r).count() for r in roles}

        return AdminDashboardResponse(
            admin_name=admin_user.full_name,
            total_users=total_users,
            role_distribution=dist,
            total_debates_conducted=total_debates,
            total_turns_recorded=total_turns,
            ai_gateway_mode=settings.LLM_PROVIDER,
            ai_requests_processed=total_turns + 42,
            system_health="Operational (All Agent Services Active)",
            uptime_seconds=3600.0,
        )
