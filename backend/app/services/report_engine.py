from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field

from app.services.argument_engine import argument_engine, ArgumentComponent
from app.services.fallacy_engine import fallacy_engine, DetectedFallacyItem
from app.services.scoring_engine import scoring_engine, PerformanceScoreBreakdown, DebateReportOutput
from app.services.presentation_engine import presentation_engine, PresentationMetrics

class FullDebateForensicsReport(BaseModel):
    session_id: str
    motion: str
    generated_at: str
    adjudication_summary: str
    overall_performance_grade: str
    scores: PerformanceScoreBreakdown
    presentation_metrics: PresentationMetrics
    arguments_extracted: List[ArgumentComponent]
    fallacies_detected: List[DetectedFallacyItem]
    mastery_strengths: List[str]
    critical_weaknesses: List[str]
    coaching_action_items: List[str]

class ReportGeneratorEngine:
    """
    Synthesizes arguments, fallacies, weighted performance scores,
    and presentation delivery metrics into a cohesive exportable debate report.
    """

    def generate_full_report(
        self,
        session_id: str,
        motion: str,
        transcript_text: str,
        speech_duration_sec: Optional[float] = None
    ) -> FullDebateForensicsReport:
        # 1. Argument & Fallacy Scoring
        eval_report = scoring_engine.evaluate_debate_text(transcript_text, motion_context=motion, session_id=session_id)

        # 2. Presentation Analytics
        pres_metrics = presentation_engine.analyze_presentation(transcript_text, audio_duration_sec=speech_duration_sec)

        # 3. Overall Performance Grade
        composite = (eval_report.scores.total_composite_score * 0.70) + (pres_metrics.composite_presentation_score * 0.30)
        composite = round(composite, 1)

        if composite >= 88.0:
            grade = "Chamber Laureate (Tournament Grandmaster)"
        elif composite >= 75.0:
            grade = "Varsity Forensics Advocate"
        elif composite >= 60.0:
            grade = "Developing Collegiate Competitor"
        else:
            grade = "Chamber Apprentice"

        summary = (
            f"The speaker addressed the motion '{motion}' across {pres_metrics.total_words} words "
            f"delivered at {pres_metrics.words_per_minute} WPM ({pres_metrics.pace_rating}). "
            f"The case achieved a {eval_report.scores.argument_quality}% Argument Quality index, with "
            f"{len(eval_report.fallacies)} detected logical fallacies and {pres_metrics.filler_words_count} filler hesitations. "
            f"Overall chamber standing is evaluated at {composite}% ({grade})."
        )

        all_weaknesses = eval_report.weaknesses + [
            f for f in pres_metrics.delivery_feedback if "Your pace" in f or "High vocal" in f or "Replace hedging" in f
        ]

        all_actions = eval_report.coaching_recommendations + [
            f for f in pres_metrics.delivery_feedback if "Practice substituting" in f or "Insert intentional" in f
        ]

        return FullDebateForensicsReport(
            session_id=session_id,
            motion=motion,
            generated_at=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
            adjudication_summary=summary,
            overall_performance_grade=grade,
            scores=eval_report.scores,
            presentation_metrics=pres_metrics,
            arguments_extracted=eval_report.arguments,
            fallacies_detected=eval_report.fallacies,
            mastery_strengths=eval_report.strengths,
            critical_weaknesses=all_weaknesses,
            coaching_action_items=all_actions
        )

report_engine = ReportGeneratorEngine()
