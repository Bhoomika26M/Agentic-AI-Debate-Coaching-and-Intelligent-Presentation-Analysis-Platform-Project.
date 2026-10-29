"""
AI Debate Simulation Engine — Milestone 3
Provides:
 - Multi-turn AI opponent simulation (8 persona types)
 - Dynamic counterargument generation (5 counterargument types)
 - Challenge question generation
 - Debate strategy suggestions
 - Turn-based state management
"""

import random
import re
from dataclasses import dataclass, field
from typing import Literal

from app.services.ai_agent import ai_agent


# ── Persona templates ──────────────────────────────────────────────────────────

PERSONAS = {
    "analytical": {
        "name": "Dr. Reeves (Analytical Scholar)",
        "style": "evidence-based, methodical, data-driven",
        "opening": "Based on empirical evidence, I would like to challenge your position systematically.",
        "traits": ["cites studies", "uses statistics", "demands peer-reviewed sources"],
    },
    "aggressive": {
        "name": "Jordan Blake (Aggressive Debater)",
        "style": "assertive, confrontational, relentless",
        "opening": "Your argument is fundamentally flawed and I intend to demonstrate exactly why.",
        "traits": ["attacks premises directly", "never concedes", "exploits any logical gap"],
    },
    "philosophical": {
        "name": "Prof. Vann (Philosopher)",
        "style": "conceptual, Socratic, principle-based",
        "opening": "Before we proceed, I think we must first question the very foundations of this proposition.",
        "traits": ["uses analogies", "questions definitions", "invokes ethical principles"],
    },
    "pragmatic": {
        "name": "Alex Chen (Policy Pragmatist)",
        "style": "practical, cost-benefit focused, solutions-oriented",
        "opening": "Setting aside ideals, let us examine what actually works in practice.",
        "traits": ["focuses on implementation", "cites policy examples", "economic analysis"],
    },
    "ethical": {
        "name": "Maya Torres (Ethical Advocate)",
        "style": "values-driven, human-centered, moral clarity",
        "opening": "We must consider the profound moral implications of this position before anything else.",
        "traits": ["human rights framing", "stakeholder impact", "social justice lens"],
    },
    "devil_advocate": {
        "name": "Sam Reeves (Devil's Advocate)",
        "style": "provocative, contrarian, explorative",
        "opening": "Let me take the opposing view and push every assumption you have made to the limit.",
        "traits": ["challenges every premise", "proposes alternatives", "asks 'what if' questions"],
    },
    "coach": {
        "name": "Coach Williams (Socratic Coach)",
        "style": "guiding, question-driven, educational",
        "opening": "Rather than argue against you directly, I want you to think more deeply about each premise.",
        "traits": ["asks clarifying questions", "identifies gaps", "affirms good arguments"],
    },
    "balanced": {
        "name": "Dana Morris (Balanced Moderator)",
        "style": "nuanced, fair, sees both sides",
        "opening": "While there is merit in your position, there are important counterpoints worth exploring.",
        "traits": ["acknowledges strengths", "steelmans opposition", "seeks common ground"],
    },
}

# ── Counterargument type templates ─────────────────────────────────────────────

COUNTER_TEMPLATES = {
    "logical_rebuttal": [
        "The logical structure of your argument contains a flaw: {point}. Specifically, the inference from {premise} to {conclusion} requires bridging evidence that has not been provided.",
        "Your reasoning assumes {assumption}, yet this is precisely what is in dispute. Independent evidence must establish this claim before it can serve as a premise.",
        "The argument form you employ — if {p} then {q} — does not hold because there are well-documented cases where {p} exists without {q}.",
    ],
    "evidence_rebuttal": [
        "The data you cite is drawn from {source_type}, which is methodologically problematic because sample sizes were limited and controls inadequate. Peer-reviewed meta-analyses show a contradictory trend.",
        "Counter-evidence from authoritative sources — including international organisations and independent researchers — consistently indicates the opposite conclusion when measured with rigorous methodology.",
        "Your statistics measure {metric}, but the relevant metric for this debate is {better_metric}. When we examine that, the picture reverses entirely.",
    ],
    "ethical_counterargument": [
        "Even if factually sound, this policy raises critical ethical concerns around equity: who bears the burden and who reaps the benefit? The distribution is deeply unjust.",
        "A utilitarian calculus reveals the aggregate harm outweighs short-term gains. However, beyond consequences, deontological ethics demands we respect individual rights that this proposal violates.",
        "This proposal disproportionately affects marginalised communities. Any policy that creates structural disadvantage for vulnerable groups must carry an extraordinary burden of justification.",
    ],
    "practical_counterargument": [
        "Implementation reality undermines this proposal. Even sympathetic administrations have failed to execute similar policies due to coordination failures, budget overruns, and institutional resistance.",
        "The opportunity costs are staggering. Resources devoted to this initiative could deliver greater measurable impact through proven alternative interventions.",
        "Unintended consequences — as documented in comparable reforms — include market distortions, perverse incentives, and regulatory capture that ultimately harm the very people the policy aims to help.",
    ],
    "policy_counterargument": [
        "Comparative policy analysis from jurisdictions that adopted analogous measures reveals declining outcomes across key indicators within three to five years of implementation.",
        "International evidence demonstrates that voluntary, incentive-based alternatives consistently outperform coercive regulation in terms of compliance, innovation, and long-term sustainability.",
        "The regulatory burden this creates exceeds the problem it solves. A proportionality principle — enshrined in most democratic legal frameworks — would prohibit measures of this scope for problems of this magnitude.",
    ],
}

# ── Challenge question bank ────────────────────────────────────────────────────

CHALLENGE_QUESTIONS = [
    "Can you define precisely what you mean by '{keyword}'? Different interpretations lead to entirely different conclusions.",
    "What is your strongest piece of evidence for the central claim, and how do you respond to the most rigorous critique of that evidence?",
    "If your premise is correct, why do we observe {counterfactual} in real-world data?",
    "How does your argument account for the interests and perspective of those most negatively affected by this position?",
    "What would need to be true for you to change your position? If nothing could change it, is this a reasoned argument or a belief?",
    "Your argument depends on a causal link. What mechanism do you propose, and what evidence demonstrates causation rather than mere correlation?",
    "How does your proposal compare on a cost-benefit basis to the three most credible alternative approaches?",
    "Where does your argument draw its boundaries? Does it apply universally, or are there exceptions that reveal hidden assumptions?",
    "What are the second and third-order consequences of adopting your position at scale?",
    "If the opposing side's most charitable interpretation is correct, what part of your argument survives?",
]

# ── Strategy suggestions ───────────────────────────────────────────────────────

STRATEGY_SUGGESTIONS = [
    "Signpost your structure clearly: 'I will make three distinct arguments — economic, ethical, and practical.' Structured speeches are significantly more persuasive.",
    "Use the PEEL framework: Point → Evidence → Explanation → Link back to the motion. This creates airtight, well-supported arguments.",
    "Anticipate your opponent's strongest objection and address it proactively. This demonstrates intellectual honesty and pre-empts attacks.",
    "Quantify whenever possible. Vague claims like 'many people' or 'significant impact' are far less persuasive than precise figures with cited sources.",
    "Use analogical reasoning: comparing your position to a well-understood, accepted case creates immediate intuitive understanding.",
    "After your opponent speaks, always begin with a direct rebuttal before presenting new material. Failure to rebut signals you cannot counter their arguments.",
    "Control the framing of the debate. Define key terms in your favour early and force the opposition to argue on your terms.",
    "Use rhetorical tricolon (groups of three) for emphasis: 'This policy is economically sound, socially just, and practically achievable.'",
    "End with a clear crystallisation: summarise what has been proven, what has been disproven, and why the net balance favours your side.",
    "Vary your sentence length for rhythm. Short punchy sentences land the biggest blows. Longer, more complex sentences demonstrate nuance and depth.",
]


@dataclass
class SimulationTurn:
    turn_number: int
    role: Literal["user", "ai"]
    content: str
    word_count: int = 0
    coaching_note: str = ""

    def __post_init__(self):
        self.word_count = len(self.content.split())


@dataclass
class SimulationState:
    session_id: str
    topic: str
    user_position: Literal["proposition", "opposition"]
    ai_position: Literal["proposition", "opposition"]
    persona_key: str
    turns: list[SimulationTurn] = field(default_factory=list)
    current_turn: int = 0
    is_complete: bool = False
    total_turns: int = 6


def _extract_keywords(text: str) -> list[str]:
    """Extract meaningful keywords from user speech."""
    stop = {"the","a","an","is","are","was","were","be","been","being","have","has","had",
            "do","does","did","will","would","could","should","may","might","shall","must",
            "that","this","these","those","it","its","we","our","you","your","they","their",
            "and","but","or","so","for","nor","yet","in","on","at","to","of","by","with",
            "from","about","as","into","through","during","before","after","above","below",
            "between","out","off","over","under","again","then","once","i","my","me","he","she"}
    words = re.findall(r'\b[a-z]{4,}\b', text.lower())
    keywords = [w for w in words if w not in stop]
    counts = {}
    for w in keywords:
        counts[w] = counts.get(w, 0) + 1
    return sorted(counts, key=lambda x: -counts[x])[:5]


def _build_counter_response(user_text: str, persona_key: str, turn_num: int,
                              topic: str, user_position: str) -> tuple[str, str]:
    """Generate a structured AI counter-response and coaching note."""
    persona = PERSONAS.get(persona_key, PERSONAS["balanced"])
    keywords = _extract_keywords(user_text)
    keyword = keywords[0] if keywords else topic.split()[0] if topic else "this issue"

    # Choose counter type based on persona
    if persona_key == "analytical":
        counter_types = ["logical_rebuttal", "evidence_rebuttal"]
    elif persona_key == "ethical":
        counter_types = ["ethical_counterargument", "policy_counterargument"]
    elif persona_key == "pragmatic":
        counter_types = ["practical_counterargument", "policy_counterargument"]
    elif persona_key == "aggressive":
        counter_types = ["logical_rebuttal", "practical_counterargument"]
    elif persona_key == "philosophical":
        counter_types = ["ethical_counterargument", "logical_rebuttal"]
    else:
        counter_types = list(COUNTER_TEMPLATES.keys())

    counter_type = random.choice(counter_types)
    template = random.choice(COUNTER_TEMPLATES[counter_type])

    # Fill template slots
    counter_text = (template
        .replace("{point}", f"regarding {keyword}")
        .replace("{premise}", f"your assertion about {keyword}")
        .replace("{conclusion}", "the policy outcome you describe")
        .replace("{assumption}", f"that {keyword} functions as claimed")
        .replace("{p}", f"we adopt measures around {keyword}")
        .replace("{q}", "the outcomes described materialise")
        .replace("{source_type}", "a single primary source")
        .replace("{metric}", keyword)
        .replace("{better_metric}", "long-term systemic impact")
        .replace("{counterfactual}", f"outcomes contrary to your predictions in comparable contexts")
    )

    # Build challenge question
    challenge_q = random.choice(CHALLENGE_QUESTIONS).replace("{keyword}", keyword)

    # Build strategy component
    strategy = random.choice(STRATEGY_SUGGESTIONS)

    # Compose full AI turn
    opener = persona["opening"] if turn_num == 1 else random.choice([
        f"Examining your argument on {keyword} more closely,",
        f"I appreciate your points, however,",
        f"Building on what we have established,",
        f"The crux of the disagreement on {keyword} is this:",
    ])

    ai_response = f"{opener} {counter_text}\n\n{challenge_q}"

    # Coaching note for the user
    user_strengths = []
    user_gaps = []
    wc = len(user_text.split())
    if wc < 50:
        user_gaps.append("Your response was quite brief. Aim for at least 100 words to build a complete argument.")
    if not any(w in user_text.lower() for w in ["because", "therefore", "since", "evidence", "data", "study", "research"]):
        user_gaps.append("You did not cite evidence or use logical connectives. Add 'because', 'therefore', or cite sources.")
    if any(w in user_text.lower() for w in ["always", "never", "everyone", "nobody", "all", "none"]):
        user_gaps.append("Avoid absolute terms (always/never/all) — they are easy to attack. Use qualified language.")
    if len(keywords) > 1 and any(k in user_text.lower() for k in ["however", "although", "while", "despite"]):
        user_strengths.append("Good use of concessive language, showing nuance.")
    if wc >= 80:
        user_strengths.append("Solid response length — you are giving the topic appropriate depth.")

    coaching_parts = []
    if user_strengths:
        coaching_parts.append("✅ " + " | ".join(user_strengths))
    if user_gaps:
        coaching_parts.append("⚠️ " + " | ".join(user_gaps))
    coaching_parts.append(f"💡 Strategy tip: {strategy}")

    coaching_note = "\n".join(coaching_parts)
    return ai_response, coaching_note


# ── Public API ─────────────────────────────────────────────────────────────────

class DebateSimulationEngine:

    def start_simulation(
        self,
        session_id: str,
        topic: str,
        user_position: str = "proposition",
        persona_key: str = "balanced",
        total_turns: int = 6,
    ) -> dict:
        """Initialise a simulation and return the AI opening statement."""
        ai_position = "opposition" if user_position.lower() == "proposition" else "proposition"
        persona = PERSONAS.get(persona_key, PERSONAS["balanced"])

        opening_line = (
            f"Welcome to this debate on the motion: '{topic}'. "
            f"I am arguing the {ai_position} position. "
            f"{persona['opening']} "
            f"I expect a rigorous exchange grounded in evidence, logic, and sound reasoning."
        )

        challenge = random.choice(CHALLENGE_QUESTIONS).replace(
            "{keyword}", topic.split()[0] if topic else "this"
        )
        opening = f"{opening_line}\n\n{challenge}"

        return {
            "session_id": session_id,
            "topic": topic,
            "user_position": user_position,
            "ai_position": ai_position,
            "persona": {"key": persona_key, "name": persona["name"], "style": persona["style"]},
            "persona_name": persona["name"],
            "persona_style": persona["style"],
            "total_turns": total_turns,
            "current_turn": 0,
            "ai_opening": opening,
            "opening_statement": opening,
            "status": "active",
        }

    def process_turn(
        self,
        session_id: str,
        topic: str,
        user_speech: str,
        persona_key: str,
        turn_number: int,
        user_position: str,
        history: list[dict] | None = None,
    ) -> dict:
        """
        Process user speech and return AI counter + real-time coaching feedback.
        If Agentic AI (Gemini / OpenAI) is active, generates in-character context-rich
        rebuttal for ANY debate topic, plus challenge question and critique.
        Falls back to template builder if offline or no API key.
        """
        # Attempt LLM generation first
        if ai_agent.get_status()["active"]:
            try:
                persona_info = PERSONAS.get(persona_key, PERSONAS["balanced"])
                ai_turn = ai_agent.generate_opponent_turn(
                    topic=topic,
                    user_speech=user_speech,
                    persona=persona_info,
                    turn_number=turn_number,
                    user_position=user_position,
                    history=history,
                )
                if ai_turn and ai_turn.get("ai_speech"):
                    ai_response = ai_turn["ai_speech"]
                    if turn_number >= 6:
                        ai_response += (
                            "\n\nWe have now completed our exchange. I want to commend you for engaging "
                            "with these arguments. The debate has been instructive. I maintain my position "
                            "based on the balance of evidence and reasoning presented."
                        )
                    challenge_q = ai_turn.get("challenge_question") or random.choice(CHALLENGE_QUESTIONS).replace("{keyword}", topic)
                    coaching_note = ai_turn.get("coaching_critique") or "Strong presentation of your claim; ensure every factual assertion is linked back to your primary motion."
                    turn_score = int(ai_turn.get("turn_score", 78))
                    strategy = random.choice(STRATEGY_SUGGESTIONS)

                    return {
                        "session_id": session_id,
                        "turn_number": turn_number,
                        "ai_response": ai_response,
                        "ai_speech": ai_response,
                        "coaching_note": coaching_note,
                        "coaching_feedback": {
                            "turn_score": turn_score,
                            "challenge_question": challenge_q,
                            "recommended_counter_strategy": strategy,
                            "notes": coaching_note,
                        },
                        "strategy_suggestion": strategy,
                        "is_final_turn": turn_number >= 6,
                        "word_count": len(user_speech.split()),
                    }
            except Exception:
                pass

        # Deterministic Heuristic Fallback
        ai_response, coaching_note = _build_counter_response(
            user_text=user_speech,
            persona_key=persona_key,
            turn_num=turn_number,
            topic=topic,
            user_position=user_position,
        )

        # Closing remarks on last turn
        if turn_number >= 6:
            ai_response += (
                "\n\nWe have now completed our exchange. I want to commend you for engaging "
                "with these arguments. The debate has been instructive. I maintain my position "
                "based on the balance of evidence and reasoning presented."
            )

        keywords = _extract_keywords(user_speech)
        keyword = keywords[0] if keywords else topic.split()[0] if topic else "this motion"
        turn_score = max(55, min(95, 65 + int(len(user_speech.split()) / 4)))

        challenge_q = random.choice(CHALLENGE_QUESTIONS).replace("{keyword}", keyword)
        strategy = random.choice(STRATEGY_SUGGESTIONS)

        return {
            "session_id": session_id,
            "turn_number": turn_number,
            "ai_response": ai_response,
            "ai_speech": ai_response,
            "coaching_note": coaching_note,
            "coaching_feedback": {
                "turn_score": turn_score,
                "challenge_question": challenge_q,
                "recommended_counter_strategy": strategy,
                "notes": coaching_note,
            },
            "strategy_suggestion": strategy,
            "is_final_turn": turn_number >= 6,
            "word_count": len(user_speech.split()),
        }

    def generate_counterarguments(
        self,
        argument_text: str,
        topic: str | None = None,
        num_counters: int = 3,
    ) -> dict:
        """
        Generate multiple typed counterarguments for a given argument.
        If Agentic AI is active, leverages LLM for deep topic-specific refutation.
        """
        keywords = _extract_keywords(argument_text)
        keyword = keywords[0] if keywords else (topic or "the issue")

        # Attempt LLM generation first
        if ai_agent.get_status()["active"]:
            try:
                ai_counters = ai_agent.generate_counterarguments(
                    topic=topic,
                    argument_text=argument_text,
                    num_counters=num_counters,
                )
                if ai_counters and ai_counters.get("counterarguments"):
                    formatted_counters = []
                    for c in ai_counters["counterarguments"]:
                        raw_type = c.get("type", "logical_rebuttal").replace("_rebuttal", "").replace("_counterargument", "")
                        formatted_counters.append({
                            "type": raw_type,
                            "type_label": c.get("title") or c.get("type", "").replace("_", " ").title(),
                            "counter": c.get("counterargument", ""),
                            "rebuttal": c.get("counterargument", ""),
                            "challenge_question": c.get("challenge_question", "How does your argument address this counter-evidence?"),
                            "debate_strategy": c.get("debate_strategy", "Focus on the weakest empirical premise."),
                            "rebuttal_tip": c.get("debate_strategy", "Focus on the weakest empirical premise."),
                        })

                    challenge_questions = [c["challenge_question"] for c in formatted_counters if "challenge_question" in c]
                    return {
                        "original_argument": argument_text[:200] + "..." if len(argument_text) > 200 else argument_text,
                        "topic": topic,
                        "key_themes": keywords,
                        "counterarguments": formatted_counters,
                        "challenge_questions": challenge_questions or [random.choice(CHALLENGE_QUESTIONS).replace("{keyword}", keyword)],
                        "debate_strategies": [c.get("debate_strategy") for c in formatted_counters if c.get("debate_strategy")] or random.sample(STRATEGY_SUGGESTIONS, min(3, len(STRATEGY_SUGGESTIONS))),
                        "recommended_strategy": ai_counters.get("recommended_strategy", "Target the central inferential bridge before refuting secondary premises."),
                    }
            except Exception:
                pass

        # Deterministic Heuristic Fallback

        counter_types = random.sample(list(COUNTER_TEMPLATES.keys()), min(num_counters, len(COUNTER_TEMPLATES)))
        counters = []
        for ct in counter_types:
            template = random.choice(COUNTER_TEMPLATES[ct])
            text = (template
                .replace("{point}", f"regarding {keyword}")
                .replace("{premise}", f"the claim about {keyword}")
                .replace("{conclusion}", "the stated policy outcome")
                .replace("{assumption}", f"that {keyword} behaves as claimed")
                .replace("{p}", f"we adopt {keyword}")
                .replace("{q}", "the described outcome")
                .replace("{source_type}", "limited sources")
                .replace("{metric}", keyword)
                .replace("{better_metric}", "long-term systemic impact")
                .replace("{counterfactual}", "contrary outcomes in comparable cases")
            )
            raw_type = ct.replace("_rebuttal", "").replace("_counterargument", "")
            strategy = random.choice(STRATEGY_SUGGESTIONS)
            challenge_q = random.choice(CHALLENGE_QUESTIONS).replace("{keyword}", keyword)

            counters.append({
                "type": raw_type,
                "type_label": ct.replace("_", " ").title(),
                "counter": text,
                "rebuttal": text,
                "challenge_question": challenge_q,
                "debate_strategy": strategy,
                "rebuttal_tip": strategy,
            })

        challenge_questions = random.sample(CHALLENGE_QUESTIONS, min(3, len(CHALLENGE_QUESTIONS)))
        formatted_questions = [q.replace("{keyword}", keyword) for q in challenge_questions]

        return {
            "original_argument": argument_text[:200] + "..." if len(argument_text) > 200 else argument_text,
            "topic": topic,
            "key_themes": keywords,
            "counterarguments": counters,
            "challenge_questions": formatted_questions,
            "debate_strategies": random.sample(STRATEGY_SUGGESTIONS, min(3, len(STRATEGY_SUGGESTIONS))),
        }

    def get_personas(self) -> list[dict]:
        """Return all available AI opponent personas."""
        return [
            {
                "key": k,
                "name": v["name"],
                "style": v["style"],
                "traits": v["traits"],
            }
            for k, v in PERSONAS.items()
        ]


simulation_engine = DebateSimulationEngine()
