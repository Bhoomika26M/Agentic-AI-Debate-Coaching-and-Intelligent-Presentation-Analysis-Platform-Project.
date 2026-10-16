from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from app.models.analysis import (
    ArgumentFinding,
    FallacyFinding,
    RebuttalSuggestion,
    PerformanceScore,
    DebateFeedbackReport,
    LearningPlan,
)

class AnalysisRepository:
    def __init__(self, db: Session):
        self.db = db

    def save_argument_finding(
        self,
        claim: str,
        premises: List[Dict[str, Any]],
        evidence: List[Dict[str, Any]],
        scores: Dict[str, float],
        strengths: List[str],
        weaknesses: List[str],
        suggestions: List[str],
        turn_id: Optional[str] = None,
    ) -> ArgumentFinding:
        finding = ArgumentFinding(
            turn_id=turn_id,
            claim=claim,
            premises=premises,
            evidence=evidence,
            clarity_score=scores.get("clarity", 70.0),
            relevance_score=scores.get("relevance", 70.0),
            evidence_score=scores.get("evidence_strength", 70.0),
            logic_score=scores.get("logical_consistency", 70.0),
            persuasion_score=scores.get("persuasiveness", 70.0),
            overall_score=scores.get("overall", 70.0),
            strengths=strengths,
            weaknesses=weaknesses,
            suggestions=suggestions,
        )
        self.db.add(finding)
        self.db.commit()
        self.db.refresh(finding)
        return finding

    def save_fallacy_findings(
        self,
        fallacies: List[Dict[str, Any]],
        turn_id: Optional[str] = None,
    ) -> List[FallacyFinding]:
        results = []
        for item in fallacies:
            f = FallacyFinding(
                turn_id=turn_id,
                fallacy_type=item.get("fallacy_type", "Unknown Fallacy"),
                excerpt_text=item.get("excerpt_text", ""),
                span_start=item.get("span_start", 0),
                span_end=item.get("span_end", 0),
                confidence=item.get("confidence", 0.90),
                severity=item.get("severity", "Medium"),
                explanation=item.get("explanation", ""),
                corrected_rewrite=item.get("corrected_rewrite", ""),
                credibility_impact=item.get("credibility_impact", -10.0),
            )
            self.db.add(f)
            results.append(f)
        self.db.commit()
        return results

    def save_score(
        self,
        session_id: str,
        user_id: str,
        overall_score: float,
        argument_quality_score: float,
        evidence_score: float,
        logical_consistency_score: float,
        rebuttal_score: float,
        communication_score: float,
        critical_thinking_score: float,
        raw_metrics: Optional[Dict[str, Any]] = None,
    ) -> PerformanceScore:
        score_record = PerformanceScore(
            session_id=session_id,
            user_id=user_id,
            overall_score=overall_score,
            argument_quality_score=argument_quality_score,
            evidence_score=evidence_score,
            logical_consistency_score=logical_consistency_score,
            rebuttal_score=rebuttal_score,
            communication_score=communication_score,
            critical_thinking_score=critical_thinking_score,
            raw_metrics=raw_metrics or {},
        )
        self.db.add(score_record)
        self.db.commit()
        self.db.refresh(score_record)
        return score_record

    def save_feedback_report(
        self,
        session_id: str,
        user_id: str,
        executive_summary: str,
        overall_performance_score: float,
        credibility_index: float,
        key_strengths: List[str],
        critical_vulnerabilities: List[str],
        coaching_drills_prescribed: List[str],
    ) -> DebateFeedbackReport:
        report = DebateFeedbackReport(
            session_id=session_id,
            user_id=user_id,
            executive_summary=executive_summary,
            overall_performance_score=overall_performance_score,
            credibility_index=credibility_index,
            key_strengths=key_strengths,
            critical_vulnerabilities=critical_vulnerabilities,
            coaching_drills_prescribed=coaching_drills_prescribed,
        )
        self.db.add(report)
        self.db.commit()
        self.db.refresh(report)
        return report

    def list_reports(self, user_id: Optional[str] = None, limit: int = 20) -> List[DebateFeedbackReport]:
        query = self.db.query(DebateFeedbackReport)
        if user_id:
            query = query.filter(DebateFeedbackReport.user_id == user_id)
        return query.order_by(DebateFeedbackReport.created_at.desc()).limit(limit).all()

    def get_report_by_id(self, report_id: str) -> Optional[DebateFeedbackReport]:
        return self.db.query(DebateFeedbackReport).filter(DebateFeedbackReport.id == report_id).first()

    def list_learning_plans(self, user_id: str) -> List[LearningPlan]:
        return self.db.query(LearningPlan).filter(LearningPlan.user_id == user_id).order_by(LearningPlan.created_at.desc()).all()

    def create_learning_plan(
        self,
        user_id: str,
        title: str,
        target_skill: str,
        focus_areas: List[str],
        milestone_goals: List[str],
        prescribed_drills: List[Dict[str, Any]],
    ) -> LearningPlan:
        plan = LearningPlan(
            user_id=user_id,
            title=title,
            target_skill=target_skill,
            focus_areas=focus_areas,
            milestone_goals=milestone_goals,
            prescribed_drills=prescribed_drills,
            status="active",
            progress_percentage=0.0,
        )
        self.db.add(plan)
        self.db.commit()
        self.db.refresh(plan)
        return plan
