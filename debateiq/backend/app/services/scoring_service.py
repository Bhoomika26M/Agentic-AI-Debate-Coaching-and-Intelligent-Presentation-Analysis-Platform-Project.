from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.repositories.analysis_repo import AnalysisRepository
from app.repositories.user_repo import UserRepository
from app.agents.planner import agent_planner
from app.schemas.scoring import ScoringResponse

class ScoringService:
    def __init__(self, db: Session):
        self.db = db
        self.analysis_repo = AnalysisRepository(db)
        self.user_repo = UserRepository(db)

    def evaluate_performance(
        self,
        session_id: Optional[str] = None,
        user_id: Optional[str] = None,
        argument_quality: Optional[float] = None,
        evidence_usage: Optional[float] = None,
        logical_consistency: Optional[float] = None,
        rebuttal_effectiveness: Optional[float] = None,
        communication_skills: Optional[float] = None,
        raw_speech_text: Optional[str] = None,
    ) -> ScoringResponse:
        scoring_resp = agent_planner.scoring_agent.evaluate(
            argument_quality=argument_quality,
            evidence_usage=evidence_usage,
            logical_consistency=logical_consistency,
            rebuttal_effectiveness=rebuttal_effectiveness,
            communication_skills=communication_skills,
            speech_text=raw_speech_text,
        )

        # If session_id and user_id are provided, persist score record and award XP
        if session_id and user_id:
            self.analysis_repo.save_score(
                session_id=session_id,
                user_id=user_id,
                overall_score=scoring_resp.scores.overall_performance_score,
                argument_quality_score=scoring_resp.scores.argument_quality,
                evidence_score=scoring_resp.scores.evidence_usage,
                logical_consistency_score=scoring_resp.scores.logical_consistency,
                rebuttal_score=scoring_resp.scores.rebuttal_effectiveness,
                communication_score=scoring_resp.scores.communication_skills,
                critical_thinking_score=scoring_resp.critical_thinking_index,
            )
            # Award Debater XP
            self.user_repo.add_xp(user_id=user_id, xp=scoring_resp.xp_awarded)

        return scoring_resp
