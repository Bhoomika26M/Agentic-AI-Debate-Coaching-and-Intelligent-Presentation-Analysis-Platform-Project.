from typing import List, Dict, Any
from .base import BaseAIService
from .schemas import (
    ArgumentAnalysisResult,
    ToulminModel,
    ArgumentScoreRubric,
    FallacyItem,
    CounterArgumentItem,
    DebateTurnResponse,
    SpeechCritiqueResult,
    PresentationCritiqueResult,
    SlideCritiqueItem,
    RebuttalEvaluationResult
)

class MockAIService(BaseAIService):
    """
    Deterministic mock AI service for unit testing, CI pipelines,
    and development without requiring an active API key.
    """

    def analyze_argument(self, argument_text: str, context: str = "") -> ArgumentAnalysisResult:
        has_slope = "will" in argument_text.lower() or "inevitably" in argument_text.lower() or "replace" in argument_text.lower()
        
        fallacies = []
        if has_slope:
            fallacies.append(
                FallacyItem(
                    type="Slippery Slope / Overreach",
                    excerpt=argument_text[:80] + "...",
                    explanation="Causal link assumes an inevitable sequence of extreme outcomes without substantiating intermediate dependencies.",
                    correction="Qualify the proposition and support each causal mechanism with independent empirical citations."
                )
            )

        return ArgumentAnalysisResult(
            toulmin=ToulminModel(
                claim="The asserted proposition posits fundamental systemic change.",
                grounds="Empirical observation of recent technological and societal trends.",
                warrant="Societal institutions must adapt proactively when technical efficiency shifts.",
                backing="Sociotechnical transition theory establishes that technological shocks require institutional re-evaluations.",
                qualifier="Conditionally asserted subject to institutional oversight.",
                rebuttal="Unless countervailing human discretionary rights are statutorily codified as inalienable."
            ),
            scores=ArgumentScoreRubric(
                logic=78 if not fallacies else 65,
                evidence=72,
                persuasiveness=80,
                clarity=85,
                overall=78 if not fallacies else 71
            ),
            fallacies=fallacies,
            counterarguments=[
                CounterArgumentItem(
                    perspective="Empirical Counterpoint",
                    claim="Historical evidence suggests institutional lag creates unmanageable transitional costs."
                ),
                CounterArgumentItem(
                    perspective="Ethical Considerations",
                    claim="Deontological principles prioritize human agency over raw computational efficiency."
                )
            ],
            feedback="Your argument presents a clear thesis and articulate syntax. Ensure all causal predictions have direct supporting premises."
        )

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
        rebuttal = (
            f"While the {user_stance.capitalize()} side raises a compelling observation regarding '{topic}', "
            f"their argument assumes that efficiency automatically guarantees equitable outcomes. "
            f"In reality, empirical precedents demonstrate that unconstrained implementation introduces severe "
            f"systemic vulnerabilities. How does the {user_stance.capitalize()} resolve the governance paradox "
            f"when standard error mitigation frameworks fail?"
        )
        return DebateTurnResponse(
            analysis=analysis,
            ai_rebuttal=rebuttal,
            persona_notes=f"Delivered in {ai_persona} style conforming to {format_type} standards."
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
            f"While the claim argues that '{target_claim[:60]}...', this inference fails due to {fallacy_type or 'an unsupported warrant'}. "
            "Specifically, empirical precedents show that counter-mechanisms intervene, making the asserted outcome non-deterministic."
        )

        return RebuttalEvaluationResult(
            rebuttal_score=score,
            is_effective=is_eff,
            strengths=strengths or ["Clear thesis statement in response to the prompt."],
            flaws=flaws or ["Minor refinement needed in precision of statistical warrants."],
            improved_version=improved,
            coach_tip=f"When refuting {fallacy_type or 'flawed reasoning'}, isolate the unstated warrant and demonstrate an exception where the premise fails."
        )

