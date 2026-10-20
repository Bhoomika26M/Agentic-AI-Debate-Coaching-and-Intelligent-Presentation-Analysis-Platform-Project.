import os
import logging
from typing import List, Dict, Any
from google import genai
from google.genai import types
from .base import BaseAIService
from .schemas import (
    ArgumentAnalysisResult,
    DebateTurnResponse,
    SpeechCritiqueResult,
    PresentationCritiqueResult,
    RebuttalEvaluationResult
)
from .mock_service import MockAIService
from .argument_analysis import apply_overall_score

logger = logging.getLogger(__name__)

class GeminiAIService(BaseAIService):
    """
    Google Gemini API implementation using the official google-genai SDK.
    Enforces rigid Pydantic JSON schemas via response_schema.
    """

    def __init__(self, api_key: str = None, model: str = "gemini-2.5-flash"):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY", "")
        self.model = model
        self.mock_fallback = MockAIService()
        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)
        else:
            self.client = None

    def analyze_argument(self, argument_text: str, context: str = "") -> ArgumentAnalysisResult:
        if not self.client:
            return self.mock_fallback.analyze_argument(argument_text, context)

        prompt = f"""
You are a collegiate debate adjudicator and philosophical logician.
Deconstruct the user's argument using the rigorous 6-part Toulmin model:
1. Claim: The central assertion or conclusion.
2. Grounds (Data): The empirical premises, observations, or factual evidence provided.
3. Warrant: The connecting principle/reasoning that bridges grounds to the claim.
4. Backing: The foundational justification or institutional support for why the warrant is valid.
5. Qualifier: The scope or degree of certainty (e.g., 'under specific circumstances', 'in most instances', 'universally').
6. Rebuttal (Reservation): Anticipated counter-conditions or edge cases where the claim does not hold.

Detect only well-supported instances of Ad Hominem, Straw Man, False Dilemma, Slippery Slope, Appeal to Authority, Circular Reasoning, Hasty Generalization, and Red Herring. If evidence is insufficient, return no fallacy. Provide exact excerpts and confidence from 0 to 100.
Extract the main claim, supporting claims, explicit evidence, reasoning weaknesses, recommendations, and an improved argument without introducing facts.
Do not invent citations, facts, or examples. Score clarity, relevance, evidence strength, logical consistency, and persuasiveness from 0 to 100. The application calculates the weighted overall score.
Set analysis_method to "gemini".

Argument to analyze:
"{argument_text}"

Context/Topic:
"{context}"
"""
        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=ArgumentAnalysisResult,
                    temperature=0.2,
                ),
            )
            result = ArgumentAnalysisResult.model_validate_json(response.text)
            return apply_overall_score(result, "gemini")
        except Exception:
            logger.exception('Gemini argument analysis failed; using the disclosed rule-based baseline.')
            return self.mock_fallback.analyze_argument(argument_text, context)

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
        if not self.client:
            return self.mock_fallback.generate_debate_turn(
                topic, format_type, user_stance, ai_stance, ai_persona, user_argument, turn_history
            )

        history_str = "\n".join(
            [f"{t.get('speaker', 'Debater')}: {t.get('transcript', '')}" for t in turn_history]
        )[-12000:]

        prompt = f"""
You are an expert collegiate debate opponent in a {format_type} debate match.
Resolution: "{topic}"
Your Persona: {ai_persona}
Your Stance: {ai_stance}
Opponent (User) Stance: {user_stance}

Recent Debate History:
{history_str}

User's Latest Argument:
"{user_argument}"

Task:
1. Stay in the assigned {ai_stance} position and directly answer the user's latest argument, accounting for previous turns without repeating yourself.
2. Deconstruct the latest argument and provide its strongest counterargument, a logical rebuttal, and an alternative perspective.
3. Do not invent citations, statistics, research, or factual evidence. If external evidence is unavailable, say what evidence should be checked and label examples hypothetical.
4. Ask one challenging follow-up question and give concrete suggestions for the user's next response.
5. Avoid treating the user's position as automatically wrong. Keep the response relevant to the topic and appropriately challenging for {format_type}.
6. Set response_method to "gemini".
"""
        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=DebateTurnResponse,
                    temperature=0.6,
                ),
            )
            result = DebateTurnResponse.model_validate_json(response.text)
            return result.model_copy(update={
                "response_method": "gemini",
                "analysis": apply_overall_score(result.analysis, "gemini"),
            })
        except Exception:
            logger.exception("Gemini debate response failed; using the disclosed rule-based baseline.")
            return self.mock_fallback.generate_debate_turn(
                topic, format_type, user_stance, ai_stance, ai_persona, user_argument, turn_history
            )

    def evaluate_speech(
        self,
        transcript: str,
        duration_seconds: float,
        filler_breakdown: Dict[str, int]
    ) -> SpeechCritiqueResult:
        return self.mock_fallback.evaluate_speech(transcript, duration_seconds, filler_breakdown)

    def evaluate_presentation_deck(
        self,
        slides_text: List[Dict[str, Any]],
        title: str = ""
    ) -> PresentationCritiqueResult:
        return self.mock_fallback.evaluate_presentation_deck(slides_text, title)

    def evaluate_rebuttal(
        self,
        target_claim: str,
        fallacy_type: str,
        user_rebuttal: str,
        context: str = ""
    ) -> RebuttalEvaluationResult:
        if not self.client:
            return self.mock_fallback.evaluate_rebuttal(target_claim, fallacy_type, user_rebuttal, context)

        prompt = f"""
You are a collegiate debate adjudicator.
Evaluate the user's rebuttal against an argument or logical fallacy.

Target Claim / Flawed Argument:
"{target_claim}"

Identified Flaw / Fallacy Type:
"{fallacy_type}"

User's Attempted Rebuttal:
"{user_rebuttal}"

Topic Context:
"{context}"

Instructions:
1. Score the rebuttal efficacy from 0 to 100.
2. Determine if it is effective (is_effective: true/false).
3. List 1-3 specific logical strengths of the user's rebuttal.
4. List 1-3 specific flaws, missing warrants, or lingering weaknesses.
5. Provide an improved exemplar version demonstrating collegiate precision.
6. Provide an actionable strategic coach tip.
7. Do not invent facts, sources, statistics, or citations; recommend what evidence to verify when needed.
"""
        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=RebuttalEvaluationResult,
                    temperature=0.3,
                ),
            )
            result = RebuttalEvaluationResult.model_validate_json(response.text)
            return result.model_copy(update={"analysis_method": "gemini"})
        except Exception:
            logger.exception("Gemini rebuttal evaluation failed; using the disclosed rule-based baseline.")
            return self.mock_fallback.evaluate_rebuttal(target_claim, fallacy_type, user_rebuttal, context)
