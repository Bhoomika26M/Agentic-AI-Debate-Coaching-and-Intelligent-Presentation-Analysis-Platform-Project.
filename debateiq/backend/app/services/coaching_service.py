from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.repositories.analysis_repo import AnalysisRepository
from app.agents.specialists.coach_agent import CURATED_DRILLS, CoachAgent
from app.models.analysis import LearningPlan
from app.schemas.coaching import CoachingFeedbackResponse, DrillRecommendation

class CoachingService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = AnalysisRepository(db)
        self.coach_agent = CoachAgent()

    def get_drills(self) -> List[DrillRecommendation]:
        return CURATED_DRILLS

    def list_plans(self, user_id: str) -> List[LearningPlan]:
        return self.repo.list_learning_plans(user_id=user_id)

    def create_plan(
        self,
        user_id: str,
        title: str,
        target_skill: str,
        focus_areas: List[str],
        milestone_goals: List[str],
    ) -> LearningPlan:
        drills = [d.model_dump() for d in CURATED_DRILLS]
        return self.repo.create_learning_plan(
            user_id=user_id,
            title=title,
            target_skill=target_skill,
            focus_areas=focus_areas,
            milestone_goals=milestone_goals,
            prescribed_drills=drills,
        )

    def get_recommendations(self, user_id: str) -> CoachingFeedbackResponse:
        return self.coach_agent.generate_feedback(overall_score=82.0, fallacy_count=0)
