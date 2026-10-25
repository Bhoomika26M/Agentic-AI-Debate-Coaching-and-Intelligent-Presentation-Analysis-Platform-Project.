from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from app.services.argument_engine import argument_engine, ArgumentComponent
from app.services.fallacy_engine import fallacy_engine, DetectedFallacyItem

class PerformanceScoreBreakdown(BaseModel):
    # Weighted Scoring Model specified in design spec:
    # Debate Performance Score =
    #   Argument Quality (30%)
    #   Evidence Usage (20%)
    #   Logical Consistency (20%)
    #   Rebuttal Effectiveness (15%)
    #   Communication Skills (15%)
    argument_quality: float = Field(..., ge=0.0, le=100.0)
    evidence_usage: float = Field(..., ge=0.0, le=100.0)
    logical_consistency: float = Field(..., ge=0.0, le=100.0)
    rebuttal_effectiveness: float = Field(..., ge=0.0, le=100.0)
    communication_skills: float = Field(..., ge=0.0, le=100.0)
    total_composite_score: float = Field(..., ge=0.0, le=100.0)
    grade: str  # Exemplary, Proficient, Developing, Novice

class DebateReportOutput(BaseModel):
    session_id: Optional[str] = None
    arguments: List[ArgumentComponent] = []
    fallacies: List[DetectedFallacyItem] = []
    scores: PerformanceScoreBreakdown
    strengths: List[str] = []
    weaknesses: List[str] = []
    coaching_recommendations: List[str] = []

class ScoringEngine:
    """
    Weighted Performance Scoring Engine following the exact rubric
    from Section 9 of the project architecture specifications.
    """

    def evaluate_debate_text(
        self,
        transcript_text: str,
        motion_context: Optional[str] = None,
        session_id: Optional[str] = None
    ) -> DebateReportOutput:
        args = argument_engine.analyze_text(transcript_text, motion_context)
        fallacies = fallacy_engine.detect_fallacies(transcript_text)

        # Calculate metrics from extracted arguments
        if args:
            avg_arg_quality = sum(a.overall_score for a in args) / len(args)
            avg_evidence = sum(a.evidence_score for a in args) / len(args)
            avg_consistency = sum(a.consistency_score for a in args) / len(args)
            avg_communication = sum(a.clarity_score for a in args) / len(args)
        else:
            avg_arg_quality = 50.0
            avg_evidence = 40.0
            avg_consistency = 70.0
            avg_communication = 60.0

        # Penalize consistency and argument quality based on detected fallacies
        penalty_deduction = sum(f.credibility_penalty for f in fallacies)
        adjusted_consistency = max(10.0, avg_consistency - (penalty_deduction * 0.8))
        adjusted_arg_quality = max(15.0, avg_arg_quality - (penalty_deduction * 0.5))

        # Rebuttal effectiveness baseline (derived from refutation markers)
        text_lower = transcript_text.lower()
        rebuttal_markers = ["opponent claims", "they argue", "in contrast", "refutation", "counterpoint", "they overlooked"]
        rebuttal_hits = sum(1 for rm in rebuttal_markers if rm in text_lower)
        rebuttal_score = min(96.0, 50.0 + (rebuttal_hits * 15.0))

        # Apply weights:
        # 30% Arg Quality + 20% Evidence + 20% Consistency + 15% Rebuttal + 15% Communication
        total_score = (
            (adjusted_arg_quality * 0.30) +
            (avg_evidence * 0.20) +
            (adjusted_consistency * 0.20) +
            (rebuttal_score * 0.15) +
            (avg_communication * 0.15)
        )
        total_score = round(total_score, 1)

        if total_score >= 85.0:
            grade = "Exemplary (Tournament Tier)"
        elif total_score >= 70.0:
            grade = "Proficient (Varsity Speaker)"
        elif total_score >= 50.0:
            grade = "Developing (Intermediate Debater)"
        else:
            grade = "Novice (Fundamental Forensics)"

        breakdown = PerformanceScoreBreakdown(
            argument_quality=round(adjusted_arg_quality, 1),
            evidence_usage=round(avg_evidence, 1),
            logical_consistency=round(adjusted_consistency, 1),
            rebuttal_effectiveness=round(rebuttal_score, 1),
            communication_skills=round(avg_communication, 1),
            total_composite_score=total_score,
            grade=grade
        )

        strengths = []
        weaknesses = []
        recs = []

        if avg_evidence >= 75.0:
            strengths.append("High-density empirical grounding with quantitative citations.")
        else:
            weaknesses.append("Insufficient empirical evidence backing primary assertions.")
            recs.append("Incorporate peer-reviewed statistics, case studies, or economic models into each warrant.")

        if len(fallacies) == 0:
            strengths.append("Clean syllogistic logic with zero detected fallacies.")
        else:
            weaknesses.append(f"Identified {len(fallacies)} logical fallacy patterns impacting argumentative credibility.")
            for f in fallacies[:3]:
                recs.append(f"Remediate {f.name}: {f.correction_suggestion}")

        if rebuttal_score >= 75.0:
            strengths.append("Direct clash engagement with opposing team's paradigm.")
        else:
            recs.append("Engage more directly with the opponent's strongest claims rather than advancing parallel points.")

        if not strengths:
            strengths.append("Clear vocal clarity and coherent thesis articulation.")

        return DebateReportOutput(
            session_id=session_id,
            arguments=args,
            fallacies=fallacies,
            scores=breakdown,
            strengths=strengths,
            weaknesses=weaknesses,
            coaching_recommendations=recs
        )

scoring_engine = ScoringEngine()
