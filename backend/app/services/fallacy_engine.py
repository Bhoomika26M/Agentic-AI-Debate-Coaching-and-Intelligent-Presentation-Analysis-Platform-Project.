import re
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from app.models.enums_m2 import FallacyType

class DetectedFallacyItem(BaseModel):
    fallacy_type: FallacyType
    name: str
    quote: str
    explanation: str
    correction_suggestion: str
    credibility_penalty: int  # Deducted from forensic credibility score (1-20)
    severity: str  # HIGH, MEDIUM, LOW

class FallacyDetectionEngine:
    """
    Engine to identify 8 formal and informal debate fallacies,
    generate pedagogical refutation notes, and prescribe correction advice.
    """

    FALLACY_DEFINITIONS = {
        FallacyType.AD_HOMINEM: {
            "name": "Ad Hominem",
            "desc": "Attacking an opponent's character, motive, or identity rather than their substantive argument.",
            "patterns": [
                r"\b(you are|he is|she is|they are)\s+(clueless|naive|corrupt|dishonest|an idiot|hypocrite|incompetent|foolish)\b",
                r"\bhow can we trust (someone|anyone|him|her)\s+who\b",
                r"\bonly an uneducated person would believe\b",
                r"\byou wouldn't understand because you're (young|biased|rich|poor)\b"
            ],
            "explanation": "Dismissing a position based on personal traits rather than logical merits.",
            "correction": "Refocus strictly on the factual premises and counter the evidence directly without personal character references.",
            "penalty": 18,
            "severity": "HIGH"
        },
        FallacyType.STRAW_MAN: {
            "name": "Straw Man",
            "desc": "Misrepresenting or exaggerating an opposing argument to make it easier to attack.",
            "patterns": [
                r"\bso you are saying (we should|that)\s+(destroy|ban all|ignore completely|let everyone die|abandon)\b",
                r"\byou basically want to (destroy|eliminate|abolish all)\b",
                r"\bmy opponent wants to leave our country defenseless\b",
                r"\bif we follow your logic we might as well give up on\b"
            ],
            "explanation": "Caricaturizing the opponent's nuance into an absurd extreme.",
            "correction": "Steel-man the opponent's strongest interpretation before presenting refutations.",
            "penalty": 15,
            "severity": "HIGH"
        },
        FallacyType.FALSE_DILEMMA: {
            "name": "False Dilemma (Either/Or)",
            "desc": "Presenting only two opposing choices while ignoring viable middle grounds or alternatives.",
            "patterns": [
                r"\beither we\s+.+\s+or\s+(we perish|disaster strikes|everything is lost|we fail completely)\b",
                r"\byou are either with us or (against us|you hate)\b",
                r"\bthere are only two options\b",
                r"\bit's my way or the highway\b"
            ],
            "explanation": "Artificially constraining a complex multidimensional spectrum into a binary ultimatum.",
            "correction": "Acknowledge third-way compromises, gradual policy implementations, and hybrid paradigms.",
            "penalty": 12,
            "severity": "MEDIUM"
        },
        FallacyType.SLIPPERY_SLOPE: {
            "name": "Slippery Slope",
            "desc": "Claiming that a modest initial step inevitably leads to a chain of catastrophic consequences without evidence.",
            "patterns": [
                r"\bif we allow\s+.+\s+(next thing you know|eventually|inevitably)\s+.+\s+(total collapse|tyranny|anarchy|extinction)\b",
                r"\bthis will inevitably lead to the downfall of\b",
                r"\bonce we start doing this, there will be no stopping\b",
                r"\bwill open the floodgates to\b"
            ],
            "explanation": "Asserting an unproven causal domino cascade to trigger irrational fear.",
            "correction": "Demonstrate existing regulatory guardrails and empirically evaluate intermediate step probabilities.",
            "penalty": 14,
            "severity": "HIGH"
        },
        FallacyType.APPEAL_TO_AUTHORITY: {
            "name": "Appeal to Authority",
            "desc": "Asserting a claim is true solely because a figure of authority said so, without supporting proof.",
            "patterns": [
                r"\bbecause (celebrity|my teacher|an influencer|a famous person)\s+said so\b",
                r"\bevery scientist agrees that\b",
                r"\btrust me, expert consensus cannot be questioned\b",
                r"\ba Nobel prize winner said so, so it must be true\b"
            ],
            "explanation": "Replacing primary reasoning and empirical data with blind deference to a figurehead.",
            "correction": "Quote the underlying peer-reviewed methodology and statistical findings rather than relying solely on the persona's status.",
            "penalty": 10,
            "severity": "LOW"
        },
        FallacyType.CIRCULAR_REASONING: {
            "name": "Circular Reasoning (Begging the Question)",
            "desc": "Using the claim itself as the premise to prove the conclusion.",
            "patterns": [
                r"\bit is true because it is a fact\b",
                r"\bwe know it works because it is successful\b",
                r"\bthis law is good because the law says so\b",
                r"\bi am right because i cannot be wrong\b"
            ],
            "explanation": "Assuming the conclusion in the premise without external justification.",
            "correction": "Introduce independent criteria or verifiable benchmarks outside the premise itself.",
            "penalty": 16,
            "severity": "HIGH"
        },
        FallacyType.HASTY_GENERALIZATION: {
            "name": "Hasty Generalization",
            "desc": "Drawing a universal conclusion from an unrepresentative or insufficient sample size.",
            "patterns": [
                r"\bi know (one person|someone|a guy)\s+who\s+.+\s+so all\s+.+\s+must\b",
                r"\beveryone knows that (all|every)\b",
                r"\bit happened once, therefore it will always happen\b",
                r"\ball politicians are\b",
                r"\ball companies always\b"
            ],
            "explanation": "Extrapolating sweeping societal rules from isolated anecdotal occurrences.",
            "correction": "Rely on meta-analyses, longitudinal randomized trials, or quantified sample distributions.",
            "penalty": 12,
            "severity": "MEDIUM"
        },
        FallacyType.RED_HERRING: {
            "name": "Red Herring",
            "desc": "Introducing an irrelevant topic to divert attention from the actual motion under debate.",
            "patterns": [
                r"\bwhy are we talking about\s+.+\s+when people in\s+.+\s+are starving\b",
                r"\bwhat about\s+.+\s+instead\b",
                r"\bthat may be so, but what about\b",
                r"\blet's not get distracted by facts, think about the children\b"
            ],
            "explanation": "Sidestepping the central resolution to exploit unrelated emotional tangents.",
            "correction": "Explicitly address the primary resolution first before discussing peripheral contextual factors.",
            "penalty": 14,
            "severity": "MEDIUM"
        }
    }

    def detect_fallacies(self, text: str) -> List[DetectedFallacyItem]:
        if not text or not text.strip():
            return []

        detected: List[DetectedFallacyItem] = []
        text_lower = text.lower()

        for fallacy_type, config in self.FALLACY_DEFINITIONS.items():
            for pattern in config["patterns"]:
                match = re.search(pattern, text_lower)
                if match:
                    # Find exact substring in original text
                    start, end = match.span()
                    quote = text[start:end]
                    # Avoid duplicate fallacy type on same text chunk
                    if not any(d.fallacy_type == fallacy_type for d in detected):
                        detected.append(
                            DetectedFallacyItem(
                                fallacy_type=fallacy_type,
                                name=config["name"],
                                quote=quote,
                                explanation=config["explanation"],
                                correction_suggestion=config["correction"],
                                credibility_penalty=config["penalty"],
                                severity=config["severity"]
                            )
                        )
                        break

        return detected

fallacy_engine = FallacyDetectionEngine()
