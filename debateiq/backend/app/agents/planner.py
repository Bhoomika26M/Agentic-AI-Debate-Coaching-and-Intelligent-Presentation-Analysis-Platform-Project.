import logging
from typing import Dict, Any, Optional
from app.agents.specialists.argument_agent import ArgumentAnalyzerAgent
from app.agents.specialists.fallacy_agent import FallacyDetectorAgent, CANONICAL_FALLACIES
from app.agents.specialists.rebuttal_agent import RebuttalAgent
from app.agents.specialists.opponent_agent import OpponentAgent, AI_PERSONAS
from app.agents.specialists.scoring_agent import ScoringAgent
from app.agents.specialists.coach_agent import CoachAgent
from app.schemas.analysis import (
    ArgumentAnalysisResponse,
    FallacyDetectionResponse,
    RebuttalMatrixResponse,
)
from app.schemas.simulation import OpponentResponse, CoachWhisperResponse
from app.schemas.scoring import ScoringResponse
from app.schemas.coaching import CoachingFeedbackResponse

logger = logging.getLogger(__name__)

class AgentPlanner:
    """
    Central Agentic Orchestration Planner for DebateIQ.
    Manages workflow routing, parallel dispatching to specialist agents,
    cross-agent critique, and synthesis into unified feedback reports.
    """
    def __init__(self):
        self.argument_agent = ArgumentAnalyzerAgent()
        self.fallacy_agent = FallacyDetectorAgent()
        self.rebuttal_agent = RebuttalAgent()
        self.opponent_agent = OpponentAgent()
        self.scoring_agent = ScoringAgent()
        self.coach_agent = CoachAgent()

    def analyze_full_speech(self, text: str, context: str = "Debate Speech") -> Dict[str, Any]:
        """
        Orchestrates full diagnostic: Argument Decomposition + Fallacy Detection + Scoring.
        Acts as Critic & Aggregator.
        """
        # Step 1: Argument structure analysis
        arg_result = self.argument_agent.analyze(text, context)

        # Step 2: Fallacy detection scan
        fallacy_result = self.fallacy_agent.scan(text, context)

        # Step 3: Rebuttal synthesis
        rebuttal_result = self.rebuttal_agent.generate_rebuttals(
            target_claim=arg_result.claim,
            motion_context=context,
        )

        # Step 4: Scoring with exact weighted formula
        scores = arg_result.scores
        # Penalty adjustment for fallacies
        adjusted_logic = max(20.0, scores.logical_consistency - fallacy_result.credibility_penalty_total)
        scoring_result = self.scoring_agent.evaluate(
            argument_quality=scores.clarity,
            evidence_usage=scores.evidence_strength,
            logical_consistency=adjusted_logic,
            rebuttal_effectiveness=scores.persuasiveness,
            communication_skills=82.0,
            speech_text=text,
        )

        # Step 5: Coach feedback synthesis
        coach_feedback = self.coach_agent.generate_feedback(
            overall_score=scoring_result.scores.overall_performance_score,
            fallacy_count=fallacy_result.total_count,
            weakest_pillar="Logical Consistency" if fallacy_result.total_count > 0 else "Evidence Usage",
        )

        return {
            "argument_analysis": arg_result,
            "fallacy_detection": fallacy_result,
            "rebuttals": rebuttal_result,
            "scoring": scoring_result,
            "coach_feedback": coach_feedback,
        }

    def simulate_sparring_turn(
        self,
        motion_text: str,
        user_speech: str,
        ai_persona: str = "Socratic Questioner",
        difficulty: str = "Intermediate",
        round_number: int = 1,
    ) -> OpponentResponse:
        """
        Generates AI Opponent response turn using the specified persona and difficulty.
        """
        return self.opponent_agent.spar(
            motion_text=motion_text,
            user_argument=user_speech,
            ai_persona=ai_persona,
            difficulty=difficulty,
            round_number=round_number,
        )

    def provide_coach_whisper(
        self,
        motion_text: str,
        user_position: str,
        current_speech: str,
        opponent_speech: str = "",
    ) -> CoachWhisperResponse:
        """
        Generates real-time tactical advice during live debate rounds.
        """
        return self.coach_agent.whisper(
            motion_text=motion_text,
            user_position=user_position,
            current_speech=current_speech,
            opponent_speech=opponent_speech,
        )

# Global planner singleton
agent_planner = AgentPlanner()
