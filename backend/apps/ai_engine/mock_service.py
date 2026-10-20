from typing import List, Dict, Any
from .base import BaseAIService
from .schemas import (
    ArgumentAnalysisResult,
    DebateTurnResponse,
    SpeechCritiqueResult,
    PresentationCritiqueResult,
    SlideCritiqueItem,
    RebuttalEvaluationResult
)
from .argument_analysis import analyze_argument_rule_based

class MockAIService(BaseAIService):
    """
    Deterministic rule-based analysis for offline use and testing.
    """

    def analyze_argument(self, argument_text: str, context: str = "") -> ArgumentAnalysisResult:
        return analyze_argument_rule_based(argument_text, context)

    def generate_debate_turn(
        self,
        topic: str,
        format_type: str,
        user_stance: str,
        ai_stance: str,
        ai_persona: str,
        user_argument: str,
        turn_history: List[Dict[str, str]]
    ) -> DebateTurnResponse:
        analysis = self.analyze_argument(user_argument, context=topic)
        claim = analysis.toulmin.claim
        if analysis.evidence:
            counterargument = (
                f"Even if the point in “{claim}” is accepted, the cited material does not by itself establish "
                "that the proposed policy is the best response to the resolution."
            )
            evidence_guidance = (
                "The argument cites material, but this baseline cannot verify it. Identify its source, sample, "
                "date, and how it supports the policy comparison."
            )
        else:
            counterargument = (
                f"The claim “{claim}” may identify a concern, but without supporting evidence it does not yet "
                "show that your side's proposed conclusion follows."
            )
            evidence_guidance = (
                "No checkable evidence was identified in this turn. Add a verifiable source or clearly label "
                "a concrete example as hypothetical."
            )
        if analysis.reasoning_weaknesses:
            logical_rebuttal = (
                "The key gap to answer is: " + analysis.reasoning_weaknesses[0]
                + " Establish the missing link before treating the conclusion as proven."
            )
        else:
            logical_rebuttal = (
                "The reasoning should compare this proposal with a plausible alternative and explain why its "
                "benefits outweigh the strongest trade-off."
            )
        alt_perspective = (
            f"From the {ai_stance.lower()} position, the same issue can be framed around whether the proposed "
            "solution is proportionate, workable, and preferable to available alternatives."
        )
        prior_ai_points = [
            turn.get("transcript", "")
            for turn in turn_history
            if turn.get("speaker") == "AI"
        ]
        if prior_ai_points:
            follow_up = (
                "How does your response address the unresolved challenge from the preceding round while "
                f"connecting your evidence to “{claim}”?"
            )
        else:
            follow_up = (
                f"What verifiable evidence links “{claim}” to the outcome you predict on “{topic}”?"
            )
        difficulty = format_type.casefold()
        if 'beginner' in difficulty:
            follow_up = (
                f"What is one reason and one checkable example that supports your claim: “{claim}”?"
            )
        elif 'advanced' in difficulty:
            follow_up = (
                f"What comparative evidence would show that “{claim}” is preferable to the strongest "
                "alternative, and what limitation could weaken that evidence?"
            )
        suggestions = list(analysis.recommendations[:2])
        if not suggestions:
            suggestions = [
                "State the warrant that connects your evidence to the claim.",
                "Address one plausible counterexample directly.",
            ]
        rebuttal = " ".join((
            counterargument,
            logical_rebuttal,
            evidence_guidance,
            follow_up,
        ))
        return DebateTurnResponse(
            analysis=analysis,
            ai_rebuttal=rebuttal,
            persona_notes=(
                f"Rule-based coaching response for {format_type}; this is not a live LLM answer. "
                "It responds to the submitted claim but may miss nuance."
            ),
            strongest_counterargument=counterargument,
            logical_rebuttal=logical_rebuttal,
            alternative_perspective=alt_perspective,
            evidence_guidance=evidence_guidance,
            follow_up_question=follow_up,
            next_response_suggestions=suggestions,
            response_method="rule_based",
        )

    def evaluate_speech(
        self,
        transcript: str,
        duration_seconds: float,
        filler_breakdown: Dict[str, int]
    ) -> SpeechCritiqueResult:
        words = transcript.strip().split()
        total_words = len(words)
        duration_min = max(duration_seconds / 60.0, 0.1)
        wpm = int(total_words / duration_min)
        filler_count = sum(filler_breakdown.values())

        pacing_score = 92 if 130 <= wpm <= 165 else (75 if 100 <= wpm <= 190 else 60)
        articulation_score = max(50, 95 - (filler_count * 3))
        overall = int((pacing_score * 0.5) + (articulation_score * 0.5))

        return SpeechCritiqueResult(
            wpm=wpm,
            total_words=total_words,
            duration_seconds=duration_seconds,
            filler_count=filler_count,
            filler_breakdown=filler_breakdown,
            scores={
                'pacing': pacing_score,
                'articulation': articulation_score,
                'cadence': 82,
                'overall_delivery': overall
            },
            feedback=f"Calculated pace is {wpm} WPM (target: 130-160 WPM). Detected {filler_count} vocal fillers. Maintain deliberate vocal breath pauses."
        )

    def evaluate_presentation_deck(
        self,
        slides_text: List[Dict[str, Any]],
        title: str = ""
    ) -> PresentationCritiqueResult:
        slides = []
        for s in slides_text:
            s_num = s.get('slide_number', 1)
            raw = s.get('text', '')
            words = len(raw.split())
            is_dense = words > 45
            slides.append(
                SlideCritiqueItem(
                    slide_number=s_num,
                    headline=raw[:40] + ("..." if len(raw) > 40 else "") or f"Slide {s_num}",
                    word_count=words,
                    density_rating='TOO_DENSE' if is_dense else 'OPTIMAL',
                    visual_structure_score=70 if is_dense else 90,
                    clarity_score=72 if is_dense else 88,
                    critique="Excessive textual density; consider the 6x6 rule." if is_dense else "Well-balanced visual hierarchy.",
                    recommendation="Convert paragraphs into 3 bullet points with visual icons." if is_dense else "Strong slide design."
                )
            )

        return PresentationCritiqueResult(
            title=title or "Uploaded Slide Presentation",
            total_slides=len(slides),
            overall_score=85,
            summary="Deck structure demonstrates cohesive narrative progression with room to streamline dense analytical slides.",
            slides=slides
        )

    def evaluate_rebuttal(
        self,
        target_claim: str,
        fallacy_type: str,
        user_rebuttal: str,
        context: str = ""
    ) -> RebuttalEvaluationResult:
        word_count = len(user_rebuttal.strip().split())
        has_evidence_words = any(w in user_rebuttal.lower() for w in ['because', 'evidence', 'study', 'however', 'specifically', 'premise', 'data'])
        
        score = 65
        if word_count > 15:
            score += 15
        if has_evidence_words:
            score += 10
        score = min(score, 94)

        is_eff = score >= 70

        strengths = []
        flaws = []

        if word_count > 10:
            strengths.append("Directly engages with the targeted premise rather than circumventing it.")
        if has_evidence_words:
            strengths.append("Employs connective causal reasoning and qualifying indicators.")
        else:
            flaws.append("Relies on assertion rather than introducing independent empirical or logical verification.")

        if word_count < 15:
            flaws.append("Brief statement; elaborate on why the opponent's warrant breaks down.")

        improved = (
            f"The claim that '{target_claim[:120]}' needs a clearer supporting link. "
            f"To challenge {fallacy_type or 'the reasoning'}, identify the premise that is unsupported, "
            "explain why it does not establish the conclusion, and add a verifiable source if making a factual claim."
        )

        return RebuttalEvaluationResult(
            rebuttal_score=score,
            is_effective=is_eff,
            strengths=strengths or ["Clear thesis statement in response to the prompt."],
            flaws=flaws or ["Minor refinement needed in precision of statistical warrants."],
            improved_version=improved,
            coach_tip=f"When refuting {fallacy_type or 'flawed reasoning'}, isolate the unstated warrant and demonstrate an exception where the premise fails.",
            analysis_method="rule_based",
        )
