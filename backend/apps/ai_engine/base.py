from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from .schemas import (
    ArgumentAnalysisResult,
    DebateTurnResponse,
    SpeechCritiqueResult,
    PresentationCritiqueResult,
    RebuttalEvaluationResult
)

class BaseAIService(ABC):
    """
    Abstract Interface for the AI Engine.
    Enables swapping between Gemini API, OpenAI, Anthropic, or Mock service.
    """

    @abstractmethod
    def analyze_argument(self, argument_text: str, context: str = "") -> ArgumentAnalysisResult:
        """
        Evaluates an argument by decomposing it into Toulmin components,
        detecting formal/informal logical fallacies, scoring against a rubric,
        and producing counter-arguments.
        """
        pass

    @abstractmethod
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
        """
        Evaluates the user's latest argument and generates the opponent's
        rebuttal turn according to the specified debate style and persona.
        """
        pass

    @abstractmethod
    def evaluate_speech(
        self,
        transcript: str,
        duration_seconds: float,
        filler_breakdown: Dict[str, int]
    ) -> SpeechCritiqueResult:
        """
        Evaluates speech delivery, cadence, pacing, and persuasive vocal enunciation.
        """
        pass

    @abstractmethod
    def evaluate_presentation_deck(
        self,
        slides_text: List[Dict[str, Any]],
        title: str = ""
    ) -> PresentationCritiqueResult:
        """
        Evaluates presentation slide deck structure, density, visual hierarchy,
        and cognitive load.
        """
        pass

    @abstractmethod
    def evaluate_rebuttal(
        self,
        target_claim: str,
        fallacy_type: str,
        user_rebuttal: str,
        context: str = ""
    ) -> RebuttalEvaluationResult:
        """
        Evaluates the user's rebuttal attempt against a targeted claim or logical fallacy.
        """
        pass

