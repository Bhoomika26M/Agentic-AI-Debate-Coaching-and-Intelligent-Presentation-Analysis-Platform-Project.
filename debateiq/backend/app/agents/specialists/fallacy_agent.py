import os
import re
from typing import Dict, Any, List
from app.agents.base import BaseSpecialistAgent
from app.schemas.analysis import FallacyDetectionResponse

PROMPT_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "prompts", "fallacy_prompt.txt")

CANONICAL_FALLACIES = [
    {
        "name": "Ad Hominem",
        "category": "Relevance",
        "description": "Attacking an opponent's character, motive, or personal traits rather than engaging their argument.",
        "classic_example": "You cannot trust Senator Smith's tax reform because he is an uneducated fool.",
        "remediation_strategy": "Direct critique strictly to the data, assumptions, or methodology of the claim.",
        "counter_tactic": "Call out the abusive diversion and refocus the adjudicator on the substantive warrant.",
    },
    {
        "name": "Straw Man",
        "category": "Distortion",
        "description": "Misrepresenting, oversimplifying, or caricaturing an opponent's position to make it easier to attack.",
        "classic_example": "My opponent wants to expand bike lanes, which proves they want to ban all personal cars and destroy our freedom.",
        "remediation_strategy": "Accurately state the opponent's strongest argument (steel-manning) before refuting it.",
        "counter_tactic": "Clarify original proposition boundaries and show the opponent attacked an invented caricature.",
    },
    {
        "name": "False Dilemma",
        "category": "Presumption",
        "description": "Presenting two alternative states as the only possibilities, when in fact intermediate or third options exist.",
        "classic_example": "Either we completely ban artificial intelligence tomorrow, or human civilization will be destroyed.",
        "remediation_strategy": "Acknowledge the multi-faceted nature of the dilemma and propose proportional risk management.",
        "counter_tactic": "Introduce plausible third alternatives and compromise policy frameworks.",
    },
    {
        "name": "Slippery Slope",
        "category": "Causal Fallacy",
        "description": "Asserting that a relatively small first step will inevitably lead to a chain of catastrophic events without warrant.",
        "classic_example": "If we allow students to use calculators in algebra, nobody will know how to think and society will collapse.",
        "remediation_strategy": "Demonstrate clear regulatory checkpoints and empirical thresholds between stages.",
        "counter_tactic": "Sever the unproven causal links between the initial reform and the extreme terminus.",
    },
    {
        "name": "Appeal to Authority",
        "category": "Relevance",
        "description": "Asserting that an argument must be true solely because an authority figure said so, often outside their domain.",
        "classic_example": "Quantum physics must support astrology because a Nobel Prize-winning chemist once tweeted that stars guide souls.",
        "remediation_strategy": "Cite domain-specific consensus, peer-reviewed data, and empirical methodology rather than mere prestige.",
        "counter_tactic": "Scrutinize the authority's domain relevance, consensus alignment, and empirical warrants.",
    },
    {
        "name": "Circular Reasoning",
        "category": "Presumption",
        "description": "The premise presupposes the truth of the conclusion, providing no independent supporting justification.",
        "classic_example": "This policy is the most effective because it produces the best outcomes, and we know it produces the best outcomes because it is so effective.",
        "remediation_strategy": "Ground the assertion in independent external metrics and objective outcome benchmarks.",
        "counter_tactic": "Expose the tautological loop and request external, independent warrants.",
    },
    {
        "name": "Hasty Generalization",
        "category": "Induction",
        "description": "Drawing a broad conclusion from an unrepresentative or insufficient sample size.",
        "classic_example": "I met two rude tourists from France, therefore all French citizens are completely inhospitable.",
        "remediation_strategy": "Specify sample size boundaries and rely on broad statistical datasets.",
        "counter_tactic": "Cite comprehensive demographic studies that disprove the anomalous sample.",
    },
    {
        "name": "Red Herring",
        "category": "Relevance",
        "description": "Introducing an irrelevant topic into an argument to distract the audience and adjudicators from the original issue.",
        "classic_example": "Why are we debating carbon taxes when our children's math scores in elementary school are dropping?",
        "remediation_strategy": "Maintain strict thematic fidelity to the motion resolution under debate.",
        "counter_tactic": "Point out the conversational bait and guide the debate back to the primary resolution.",
    },
]

class FallacyDetectorAgent(BaseSpecialistAgent):
    def __init__(self):
        super().__init__(name="FallacyDetectorAgent", prompt_file=PROMPT_PATH)

    def scan(self, text: str, context: str = "Debate Speech") -> FallacyDetectionResponse:
        user_prompt = f"Context: {context}\nScan the following text for all 8 canonical fallacies:\n\n{text}"
        return self.execute(user_prompt, FallacyDetectionResponse)

    def generate_mock_output(self, user_input: str) -> Dict[str, Any]:
        """
        Deterministic regex and pattern matching engine detecting the 8 canonical fallacies.
        Provides exact span offsets, severity, penalty, and guided rewrite.
        """
        findings = []
        text_lower = user_input.lower()

        patterns = [
            (
                "Ad Hominem",
                r"(he is an? (uneducated fool|idiot|clueless|corrupt liar)|she is incompetent|cannot trust .*? because he is|you are just stupid|opponent is a hypocrite)",
                "High",
                -15.0,
                "Ad hominem displaces argument by attacking personal character rather than addressing the substantive claim.",
                "Replace the character attack with a direct critique of the data or policy assumptions.",
            ),
            (
                "Straw Man",
                r"(wants to (ban all|destroy|abolish all|eliminate everything)|proves they want to destroy personal freedom|my opponent wants to ruin)",
                "High",
                -12.0,
                "Straw man misrepresents the opponent's nuanced position into an extreme, undefendable caricature.",
                "Accurately steel-man the opponent's actual argument before presenting counter-evidence.",
            ),
            (
                "False Dilemma",
                r"(either we .*? or .*? will (end|die|collapse|be destroyed)|there are only two choices|you are either with us or)",
                "High",
                -12.0,
                "False dilemma forces a binary choice where reasonable intermediate and complementary policies exist.",
                "Present a graduated spectrum of policy solutions rather than an all-or-nothing dichotomy.",
            ),
            (
                "Slippery Slope",
                r"(if we (allow|pass|implement) .*? (society will collapse|inevitably lead to catastrophe|everyone will stop|disaster will follow))",
                "Medium",
                -10.0,
                "Slippery slope posits a chain reaction ending in disaster without demonstrating causal necessity at each step.",
                "Establish concrete safeguards and regulatory thresholds that prevent unchecked escalation.",
            ),
            (
                "Appeal to Authority",
                r"(must be true because (celebrity|famous actor|nobel laureate in chemistry|my professor) said so|because .*? tweeted it)",
                "Medium",
                -8.0,
                "Appeal to authority substitutes deference to a figurehead in place of domain-specific empirical warrants.",
                "Reference peer-reviewed meta-analyses and consensus within the relevant scientific discipline.",
            ),
            (
                "Circular Reasoning",
                r"(because it is .*? and it is .*? because|is true because it is correct|the bible is true because god wrote it)",
                "Medium",
                -10.0,
                "Circular reasoning assumes the conclusion in its premise, creating a non-informative tautology.",
                "Supply independent external benchmarks that justify the truth value of the conclusion.",
            ),
            (
                "Hasty Generalization",
                r"(i met (two|one|a few) .*? therefore all|in my personal experience everyone|one time it failed so it never works)",
                "Medium",
                -10.0,
                "Hasty generalization projects a broad rule onto an entire class from an unrepresentative anecdote.",
                "Rely on statistically representative sample sizes and longitudinal studies.",
            ),
            (
                "Red Herring",
                r"(why are we debating .*? when .*?|what about the children's math scores|look at the other scandal instead)",
                "Low",
                -8.0,
                "Red herring introduces an irrelevant topic to divert attention away from the core resolution.",
                "Explicitly reconnect the commentary to the resolution's primary burden of proof.",
            ),
        ]

        for fallacy_type, regex_pattern, severity, penalty, explanation, rewrite_guide in patterns:
            match = re.search(regex_pattern, user_input, re.IGNORECASE)
            if match:
                excerpt = match.group(0)
                findings.append({
                    "fallacy_type": fallacy_type,
                    "excerpt_text": excerpt,
                    "span_start": match.start(),
                    "span_end": match.end(),
                    "confidence": 0.94,
                    "severity": severity,
                    "explanation": explanation,
                    "corrected_rewrite": f"[Corrected Reformulation]: {rewrite_guide}",
                    "credibility_impact": penalty,
                })

        total_penalty = sum(f["credibility_impact"] for f in findings)
        credibility_score = max(20.0, min(100.0, 100.0 + total_penalty))
        summary = (
            f"Detected {len(findings)} logical fallacy instances. Credibility impact: {total_penalty:.1f} pts."
            if findings
            else "No canonical logical fallacies detected. Discourse maintains dialectical rigor."
        )

        return {
            "fallacies_detected": findings,
            "total_count": len(findings),
            "credibility_penalty_total": abs(total_penalty),
            "overall_credibility_score": credibility_score,
            "reasoning_summary": summary,
        }
