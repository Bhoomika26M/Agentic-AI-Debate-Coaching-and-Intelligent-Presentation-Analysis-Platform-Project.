import enum
import random
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class OpponentPersona(str, enum.Enum):
    SOCRATIC = "SOCRATIC"                # Socratic Inquisitor: Questions premises & internal coherence
    EMPIRICAL = "EMPIRICAL"              # Data Wonk: Counters with peer-reviewed statistics & metrics
    RHETORICAL = "RHETORICAL"            # Rebuttal Specialist: Sharp clash, structural refutation
    ETHICIST = "ETHICIST"                # Moral Philosopher: Deontological harms, justice, systemic equity

class CounterargumentType(str, enum.Enum):
    LOGICAL = "LOGICAL"
    EVIDENCE_BASED = "EVIDENCE_BASED"
    ETHICAL = "ETHICAL"
    PRACTICAL = "PRACTICAL"
    POLICY = "POLICY"

class Counterargument(BaseModel):
    type: CounterargumentType
    title: str
    content: str
    rebuttal_strategy: str
    strength: str = "STRONG"

class PointOfInformation(BaseModel):
    challenge_question: str
    speaker_tag: str
    time_limit_sec: int = 15
    intent: str

class SimulationTurnResponse(BaseModel):
    turn_number: int
    opponent_name: str
    opponent_persona: OpponentPersona
    speech_rebuttal: str
    primary_counterargument: Counterargument
    alternative_counterarguments: List[Counterargument]
    point_of_information: Optional[PointOfInformation] = None
    coaching_tip: str

class DebateSimulationEngine:
    """
    Engine to simulate autonomous multi-turn debate sparring partners with
    diverse philosophical personas and 5 counterargument typologies.
    """

    PERSONA_PROFILES = {
        OpponentPersona.SOCRATIC: {
            "name": "Prof. Socraticus",
            "title": "Chamber Inquisitor",
            "avatar": "https://api.dicebear.com/7.x/bottts/svg?seed=socratic",
            "style": "Interrogative, syllogistic, unyielding on definitions and consistency.",
            "intro": "I do not seek to shout you down; I seek to examine whether your definitions survive their own logical conclusions."
        },
        OpponentPersona.EMPIRICAL: {
            "name": "Dr. Aris Thorne",
            "title": "Empirical Forensics Fellow",
            "avatar": "https://api.dicebear.com/7.x/bottts/svg?seed=empirical",
            "style": "Data-driven, statistical meta-analyses, cost-benefit quantification.",
            "intro": "Compelling rhetoric is meaningless without verifiable empirical backing. Let us inspect the actual data."
        },
        OpponentPersona.RHETORICAL: {
            "name": "Senator Vane",
            "title": "Varsity Parliamentary Rebuttalist",
            "avatar": "https://api.dicebear.com/7.x/bottts/svg?seed=rhetorical",
            "style": "Direct point-by-point refutation, clash acceleration, Toulmin dismantling.",
            "intro": "Every warrant you have laid down contains a fatal flaw. Watch how cleanly the house disassembles your case."
        },
        OpponentPersona.ETHICIST: {
            "name": "Justice Elena Vance",
            "title": "Moral Philosophy Fellow",
            "avatar": "https://api.dicebear.com/7.x/bottts/svg?seed=ethicist",
            "style": "Deontological ethics, distributive justice, rights-based evaluations.",
            "intro": "Even if your policy achieves fiscal utility, what fundamental human rights are compromised in the process?"
        }
    }

    def generate_counterarguments(
        self,
        motion: str,
        user_speech: str,
        persona: OpponentPersona
    ) -> List[Counterargument]:
        text_lower = user_speech.lower()
        counters: List[Counterargument] = []

        # 1. LOGICAL COUNTERARGUMENT
        counters.append(
            Counterargument(
                type=CounterargumentType.LOGICAL,
                title="Syllogistic Non-Sequitur & Causal Leap",
                content=(
                    f"The speaker assumes that because a problem exists regarding '{motion}', their specific intervention "
                    f"is the sole valid mechanism to resolve it. This confuses correlation with exclusive causation. "
                    f"Alternative explanatory variables have been dismissed without warrants."
                ),
                rebuttal_strategy="Expose the missing inferential bridge between the problem premise and the proposed mandate."
            )
        )

        # 2. EVIDENCE-BASED COUNTERARGUMENT
        counters.append(
            Counterargument(
                type=CounterargumentType.EVIDENCE_BASED,
                title="Empirical Disconfirmation & Longitudinal Trials",
                content=(
                    f"Recent comparative policy evaluations indicate that similar interventions yielded a 34% variance "
                    f"in unintended secondary externalities. Independent meta-analyses fail to replicate the speaker's "
                    f"optimistic projections under real-world economic constraints."
                ),
                rebuttal_strategy="Cite contradictory empirical studies and demand sample-size verification."
            )
        )

        # 3. ETHICAL COUNTERARGUMENT
        counters.append(
            Counterargument(
                type=CounterargumentType.ETHICAL,
                title="Disproportionate Burden & Distributive Injustice",
                content=(
                    f"By prioritizing aggregate utilitarian efficiency under '{motion}', this stance disproportionately "
                    f"imposes systemic friction upon vulnerable stakeholder demographics whose agency is compromised "
                    f"without their explicit democratic consent."
                ),
                rebuttal_strategy="Argue from a rights-based perspective that individual liberties cannot be traded for collective convenience."
            )
        )

        # 4. PRACTICAL COUNTERARGUMENT
        counters.append(
            Counterargument(
                type=CounterargumentType.PRACTICAL,
                title="Execution Friction & Fiscal Feasibility Bottlenecks",
                content=(
                    f"Even if philosophically sound, the operational logistics required to enforce this policy "
                    f"would induce catastrophic administrative backlogs, ballooning capital outlays by orders of magnitude "
                    f"beyond anticipated municipal budgets."
                ),
                rebuttal_strategy="Target enforcement costs, jurisdictional compliance gaps, and bureaucratic inertia."
            )
        )

        # 5. POLICY COUNTERARGUMENT
        counters.append(
            Counterargument(
                type=CounterargumentType.POLICY,
                title="Superior Non-Coercive Policy Substitute",
                content=(
                    f"A targeted regulatory framework paired with decentralized incentives achieves 85% of the speaker's "
                    f"stated objectives without introducing the monopolistic distortions and moral hazards inherent in their motion."
                ),
                rebuttal_strategy="Present a less invasive, counter-proposal policy that solves the dilemma cleanly."
            )
        )

        return counters

    def generate_poi(self, motion: str, user_speech: str, persona: OpponentPersona) -> PointOfInformation:
        poi_templates = {
            OpponentPersona.SOCRATIC: (
                f"Point of Information! If your principle regarding '{motion}' is universally valid, "
                f"how do you justify exempting the catastrophic edge-cases your policy explicitly produces?"
            ),
            OpponentPersona.EMPIRICAL: (
                f"Point of Information! What verifiable empirical baseline can you cite that demonstrates "
                f"your proposed threshold won't trigger immediate inflationary or systemic backlash?"
            ),
            OpponentPersona.RHETORICAL: (
                f"Point of Information! Aren't you conceding the central contention of the Opposition by admitting "
                f"that third-party verification is required to make your thesis viable?"
            ),
            OpponentPersona.ETHICIST: (
                f"Point of Information! Under what moral framework does the speaker defend overriding individual "
                f"autonomy in the name of your proposed societal collective benefit?"
            )
        }

        return PointOfInformation(
            challenge_question=poi_templates.get(persona, f"Point of Information on '{motion}'!"),
            speaker_tag=self.PERSONA_PROFILES[persona]["name"],
            time_limit_sec=15,
            intent="Force the speaker to defend their axiomatic warrants under cross-examination."
        )

    def generate_simulation_turn(
        self,
        motion: str,
        user_speech: str,
        turn_number: int,
        persona: OpponentPersona = OpponentPersona.SOCRATIC
    ) -> SimulationTurnResponse:
        profile = self.PERSONA_PROFILES.get(persona, self.PERSONA_PROFILES[OpponentPersona.SOCRATIC])
        all_counters = self.generate_counterarguments(motion, user_speech, persona)

        # Persona-aligned primary counterargument selection
        persona_counter_map = {
            OpponentPersona.SOCRATIC: CounterargumentType.LOGICAL,
            OpponentPersona.EMPIRICAL: CounterargumentType.EVIDENCE_BASED,
            OpponentPersona.RHETORICAL: CounterargumentType.POLICY,
            OpponentPersona.ETHICIST: CounterargumentType.ETHICAL
        }
        primary_type = persona_counter_map.get(persona, CounterargumentType.LOGICAL)
        primary = next((c for c in all_counters if c.type == primary_type), all_counters[0])
        alternatives = [c for c in all_counters if c != primary]

        # Generate custom sparring response speech text
        speech_rebuttal = (
            f"The Proposition asks this chamber to endorse '{motion}'. "
            f"However, their speech relies fundamentally on {primary.title.lower()}. "
            f"{primary.content} "
            f"Therefore, the opposition urges this house to reject the speaker's motion in full."
        )

        poi = self.generate_poi(motion, user_speech, persona) if turn_number >= 1 else None

        coaching_tips = [
            "In your next turn, directly counter the empirical disconfirmation by specifying your sample boundaries.",
            "Inoculate your thesis by acknowledging the practical friction before the opponent exploits it.",
            "Take the Point of Information confidently: spend 10 seconds rebutting it directly before resuming your argument.",
            "Use a 'Even If' argumentation structure: 'Even if the opponent's premise holds, our impacts outweigh theirs.'"
        ]

        return SimulationTurnResponse(
            turn_number=turn_number,
            opponent_name=profile["name"],
            opponent_persona=persona,
            speech_rebuttal=speech_rebuttal,
            primary_counterargument=primary,
            alternative_counterarguments=alternatives,
            point_of_information=poi,
            coaching_tip=random.choice(coaching_tips)
        )

simulation_engine = DebateSimulationEngine()
