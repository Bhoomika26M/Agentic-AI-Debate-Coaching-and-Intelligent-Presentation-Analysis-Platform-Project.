import os
from typing import Dict, Any, List
from app.agents.base import BaseSpecialistAgent
from app.schemas.simulation import OpponentResponse, PersonaInfo

PROMPT_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "prompts", "opponent_prompt.txt")

AI_PERSONAS = [
    PersonaInfo(
        id="socratic",
        name="Socratic Questioner",
        title="Dialectical Inquisitor",
        style_description="Probes foundational definitions, exposes hidden axioms, and traps opponents in their own premises through targeted questioning.",
        strengths=["Exposing hidden assumptions", "Epistemological precision", "Dissecting definitions"],
        weaknesses=["Less direct evidence barrage", "Can appear overly philosophical"],
        default_difficulty="Intermediate",
    ),
    PersonaInfo(
        id="professor",
        name="Logical Professor",
        title="Academic Formalist",
        style_description="Employs formal syllogistic logic, demands rigorous peer-reviewed empirical data, and highlights methodological flaws.",
        strengths=["Empirical citation", "Methodological scrutiny", "Formal syllogisms"],
        weaknesses=["Occasionally dry delivery", "Dense academic terminology"],
        default_difficulty="Expert",
    ),
    PersonaInfo(
        id="politician",
        name="Aggressive Politician",
        title="Rhetorical Strategist",
        style_description="Focuses on real-world stakeholder impact, public sentiment, narrative framing, and immediate operational failure modes.",
        strengths=["Persuasive framing", "Emotional resonance", "Practical stakeholder analysis"],
        weaknesses=["Susceptible to appeal to emotion", "Vulnerable to statistical challenges"],
        default_difficulty="Intermediate",
    ),
]

class OpponentAgent(BaseSpecialistAgent):
    def __init__(self):
        super().__init__(name="OpponentAgent", prompt_file=PROMPT_PATH)

    def spar(
        self,
        motion_text: str,
        user_argument: str,
        ai_persona: str = "Socratic Questioner",
        difficulty: str = "Intermediate",
        round_number: int = 1,
    ) -> OpponentResponse:
        user_prompt = (
            f"Motion: {motion_text}\n"
            f"Persona: {ai_persona}\n"
            f"Difficulty: {difficulty}\n"
            f"Round: {round_number}\n"
            f"Opponent Argument:\n{user_argument}\n"
            f"Generate a rigorous debate rebuttal in character."
        )
        return self.execute(user_prompt, OpponentResponse)

    def generate_mock_output(self, user_input: str) -> Dict[str, Any]:
        """
        Deterministic mock generator tailoring responses to persona and difficulty.
        """
        # Parse persona from input
        persona = "Socratic Questioner"
        if "Logical Professor" in user_input:
            persona = "Logical Professor"
        elif "Aggressive Politician" in user_input:
            persona = "Aggressive Politician"

        difficulty = "Intermediate"
        if "Expert" in user_input:
            difficulty = "Expert"
        elif "Beginner" in user_input:
            difficulty = "Beginner"

        if persona == "Logical Professor":
            speech = (
                "Distinguished colleagues, while my opponent's presentation was rhetorically ambitious, "
                "it suffers from a severe inferential invalidity. Specifically, their central premise confuses "
                "temporal precedence with empirical causation. If we examine the 2023 longitudinal data from the "
                "National Economic Research Bureau, we observe that the proposed intervention yields zero statistically "
                "significant improvement over baseline variance once demographic covariates are properly controlled. "
                "Therefore, committing substantial public capital to an unverified mechanism is scientifically unwarranted."
            )
            strategy = "Empirical falsification and methodological critique."
            counterclaim = "The proposed intervention lacks empirical statistical significance when covariates are controlled."
            question = "What peer-reviewed methodology did you employ to isolate your claimed benefit from organic market drift?"
        elif persona == "Aggressive Politician":
            speech = (
                "Let's cut through the theoretical jargon and talk about what this resolution actually means for real people. "
                "My opponent stands here proposing massive, sweeping changes, but completely ignores who pays the bill. "
                "Small business owners, working families, and local communities will bear the immediate brunt of these "
                "disruptions while bureaucrats in distant offices experiment with livelihoods. We need pragmatic solutions "
                "that work right now, not high-risk gambles that gamble our economic future!"
            )
            strategy = "Stakeholder impact framing and populist risk aversion."
            counterclaim = "The policy places an unacceptable, disproportionate burden on working families and local businesses."
            question = "Can my opponent look a small business owner in the eye and guarantee their business won't shutter under these compliance costs?"
        else: # Socratic Questioner
            speech = (
                "My esteemed opponent makes a compelling appeal, yet we must pause and examine the axiom upon which "
                "their entire case rests. You tell us that this measure is necessary for progress, but how do you define "
                "the good that we are maximizing? If your policy achieves its stated metric only by curtailing the individual "
                "liberty of those who dissent, have we truly solved the dilemma, or merely displaced it into a deeper moral "
                "incoherence? I invite my opponent to defend the fundamental premise they took for granted."
            )
            strategy = "Dialectical questioning and exposing unexamined premises."
            counterclaim = "The argument assumes a utilitarian standard of progress without defending its moral costs."
            question = "If the presupposition underlying your thesis is contested, what independent warrant sustains your conclusion?"

        return {
            "ai_persona": persona,
            "difficulty": difficulty,
            "response_speech": speech,
            "core_counterclaim": counterclaim,
            "rhetorical_strategy_used": strategy,
            "fallacies_exploited_in_user": ["Unsubstantiated Causal Link", "Oversimplification"],
            "challenge_question": question,
            "round_number": 1,
        }
