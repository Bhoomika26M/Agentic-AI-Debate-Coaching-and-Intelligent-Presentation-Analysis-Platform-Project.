from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.repositories.analysis_repo import AnalysisRepository
from app.agents.planner import agent_planner
from app.agents.specialists.fallacy_agent import CANONICAL_FALLACIES
from app.schemas.analysis import (
    ArgumentAnalysisResponse,
    FallacyDetectionResponse,
    FallacyCatalogItem,
    RebuttalMatrixResponse,
    FeedbackReportResponse,
)
from app.models.analysis import DebateFeedbackReport

class AnalysisService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = AnalysisRepository(db)

    def analyze_argument(self, text: str, context: str = "Debate Speech") -> ArgumentAnalysisResponse:
        result = agent_planner.argument_agent.analyze(text=text, context=context)
        # Persist findings
        self.repo.save_argument_finding(
            claim=result.claim,
            premises=[p.model_dump() for p in result.premises],
            evidence=[e.model_dump() for e in result.evidence],
            scores=result.scores.model_dump(),
            strengths=result.strengths,
            weaknesses=result.weaknesses,
            suggestions=result.suggestions,
        )
        return result

    def detect_fallacies(self, text: str, context: str = "Debate Speech") -> FallacyDetectionResponse:
        result = agent_planner.fallacy_agent.scan(text=text, context=context)
        if result.fallacies_detected:
            self.repo.save_fallacy_findings(
                fallacies=[f.model_dump() for f in result.fallacies_detected]
            )
        return result

    def get_fallacy_catalog(self) -> List[FallacyCatalogItem]:
        return [FallacyCatalogItem(**item) for item in CANONICAL_FALLACIES]

    def generate_rebuttals(
        self,
        target_claim: str,
        motion_context: str = "Debate Resolution",
        target_position: str = "opposition",
    ) -> RebuttalMatrixResponse:
        return agent_planner.rebuttal_agent.generate_rebuttals(
            target_claim=target_claim,
            motion_context=motion_context,
            target_position=target_position,
        )

    def generate_session_feedback_report(
        self,
        session_id: str,
        user_id: str,
        speech_text: str,
        motion_context: str = "Debate Resolution",
    ) -> DebateFeedbackReport:
        analysis_pkg = agent_planner.analyze_full_speech(text=speech_text, context=motion_context)
        scoring = analysis_pkg["scoring"]
        fallacy = analysis_pkg["fallacy_detection"]
        coach = analysis_pkg["coach_feedback"]

        summary = (
            f"Adjudication Summary: Debate speech delivered with an overall performance score of "
            f"{scoring.scores.overall_performance_score:.1f}/100 and a Credibility Index of "
            f"{fallacy.overall_credibility_score:.1f}/100. "
            f"Primary focus area: {coach.primary_skill_gap}."
        )

        return self.repo.save_feedback_report(
            session_id=session_id,
            user_id=user_id,
            executive_summary=summary,
            overall_performance_score=scoring.scores.overall_performance_score,
            credibility_index=fallacy.overall_credibility_score,
            key_strengths=coach.strengths_observed,
            critical_vulnerabilities=coach.improvement_recommendations,
            coaching_drills_prescribed=[d.title for d in coach.personalized_drills],
        )

    def list_reports(self, user_id: Optional[str] = None) -> List[DebateFeedbackReport]:
        return self.repo.list_reports(user_id=user_id)

    def get_report(self, report_id: str) -> Optional[DebateFeedbackReport]:
        return self.repo.get_report_by_id(report_id)
