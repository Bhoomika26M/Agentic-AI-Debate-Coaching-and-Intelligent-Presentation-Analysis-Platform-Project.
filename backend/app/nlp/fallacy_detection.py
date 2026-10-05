"""
Logical Fallacy Detection Engine
---------------------------------
Pattern/keyword-based detector for the 8 fallacies named in the spec:
Ad Hominem, Straw Man, False Dilemma, Slippery Slope, Appeal to Authority,
Circular Reasoning, Hasty Generalization, Red Herring.

This is a heuristic, explainable baseline (no paid LLM). It will not catch
every subtle fallacy, but it's a legitimate, demonstrable NLP component for
an internship-scale project, and each hit comes with an explanation +
correction suggestion as required by the spec.
"""

import re
from typing import Dict, List

FallacyHit = Dict[str, str]

INSULT_WORDS = [
    "stupid", "idiot", "idiotic", "dumb", "moron", "pathetic", "clueless",
    "ignorant", "foolish", "incompetent",
]

_RULES = []


def _rule(fallacy_type: str, pattern: str, explanation: str, suggestion: str):
    _RULES.append(
        {
            "type": fallacy_type,
            "regex": re.compile(pattern, re.IGNORECASE),
            "explanation": explanation,
            "suggestion": suggestion,
        }
    )


# Ad Hominem: attacking the person rather than the argument
_rule(
    "Ad Hominem",
    r"\b(you|he|she|they)\s+(are|is|'re)\b.{0,20}\b(" + "|".join(INSULT_WORDS) + r")\b",
    "This attacks a person's character or intelligence instead of addressing their argument.",
    "Focus on the substance of the claim itself rather than the person making it.",
)
_rule(
    "Ad Hominem",
    r"\b(only an?|typical)\s+\w+\s+(would|could)\s+(say|think|believe)\b",
    "This dismisses the argument based on the type of person making it, not its content.",
    "Respond to the specific claim and evidence, not the perceived category of the speaker.",
)

# Straw Man: misrepresenting the opponent's argument
_rule(
    "Straw Man",
    r"\bso (you'?re|you are) (basically |really )?saying\b",
    "This reframes the opponent's position into an exaggerated or distorted version that's easier to attack.",
    "Quote or paraphrase the actual claim accurately before responding to it.",
)
_rule(
    "Straw Man",
    r"\bwhat you'?re really (trying to )?say(ing)? is\b",
    "This substitutes the opponent's actual claim with an extreme version of it.",
    "Address the specific wording and intent of the original argument.",
)

# False Dilemma: presenting only two options when more exist
_rule(
    "False Dilemma",
    r"\beither\s+.+\s+or\s+.+\b",
    "This frames the issue as having only two possible options, ignoring other alternatives.",
    "Acknowledge that a range of intermediate or alternative options may exist.",
)
_rule(
    "False Dilemma",
    r"\byou'?re either with (us|me) or against (us|me)\b",
    "This forces a binary choice that excludes middle-ground positions.",
    "Consider whether a more nuanced or partial position is possible.",
)

# Slippery Slope: claiming one step inevitably leads to an extreme outcome
_rule(
    "Slippery Slope",
    r"\b(will|would|could)\s+(inevitably\s+)?lead to\b.*\b(and then|eventually|ultimately)\b",
    "This assumes a small first step will inevitably cascade into an extreme outcome without justifying each step.",
    "Show the causal mechanism connecting each step, or acknowledge the chain is not guaranteed.",
)
_rule(
    "Slippery Slope",
    r"\bnext thing you know\b|\bbefore (we|you) know it\b",
    "This jumps from a minor premise to a drastic consequence without establishing the intermediate steps.",
    "Provide evidence for each link in the causal chain rather than assuming escalation.",
)
_rule(
    "Slippery Slope",
    r"\bif we (allow|permit|accept)\b.*\beventually\b.*(\band then\b.*){2,}",
    "This chains a small first step through several escalating 'and then' consequences without justifying each link.",
    "Justify each step in the chain separately, or acknowledge that the escalation isn't guaranteed.",
)

# Appeal to Authority: citing authority instead of evidence
_rule(
    "Appeal to Authority",
    r"\b(trust me|everyone knows|experts (agree|say)|scientists (agree|say))\b",
    "This leans on a vague appeal to authority or consensus instead of presenting the actual evidence.",
    "Cite the specific study, expert, or data source so the claim can be evaluated on its merits.",
)
_rule(
    "Appeal to Authority",
    r"\b(a famous|a well-known)\s+\w+\s+(said|believes|argues)\b",
    "This relies on someone's fame or status rather than the strength of their reasoning or evidence.",
    "Explain why the reasoning behind the claim holds up, independent of who said it.",
)

# Hasty Generalization: broad claim from limited evidence
_rule(
    "Hasty Generalization",
    r"\b(all|every|everyone|no one|nobody|always|never)\b\s+\w+\s+(is|are|do|does|will|can't|cannot)\b",
    "This draws a sweeping conclusion ('all', 'always', 'never') that likely overstates what the evidence supports.",
    "Qualify the claim (e.g. 'many', 'often', 'in most cases') or provide a broader evidence base.",
)

# Red Herring: introducing an irrelevant point to divert attention
_rule(
    "Red Herring",
    r"\b(but what about|speaking of which|that reminds me|more importantly)\b",
    "This shifts attention to a different, less relevant topic instead of engaging with the point at hand.",
    "Stay focused on the original claim before introducing a new line of argument.",
)

# Circular Reasoning: conclusion restates the premise
_CIRC_SPLIT = re.compile(r"\bbecause\b", re.IGNORECASE)


def _detect_circular_reasoning(text: str) -> List[FallacyHit]:
    hits = []
    for sentence in re.split(r"(?<=[.!?])\s+", text):
        if "because" not in sentence.lower():
            continue
        parts = _CIRC_SPLIT.split(sentence, maxsplit=1)
        if len(parts) != 2:
            continue
        claim, reason = parts[0].lower(), parts[1].lower()
        claim_words = set(re.findall(r"[a-zA-Z]{4,}", claim))
        reason_words = set(re.findall(r"[a-zA-Z]{4,}", reason))
        if not claim_words or not reason_words:
            continue
        overlap = claim_words & reason_words
        if len(overlap) >= max(2, int(0.6 * min(len(claim_words), len(reason_words)))):
            hits.append(
                {
                    "type": "Circular Reasoning",
                    "snippet": sentence.strip(),
                    "explanation": "The reason given largely repeats the claim itself instead of offering independent support.",
                    "suggestion": "Provide a reason that is logically independent of the conclusion, backed by separate evidence.",
                }
            )
    return hits


def detect_fallacies(text: str) -> List[FallacyHit]:
    hits: List[FallacyHit] = []
    sentences = re.split(r"(?<=[.!?])\s+", text)

    for sentence in sentences:
        for rule in _RULES:
            match = rule["regex"].search(sentence)
            if match:
                hits.append(
                    {
                        "type": rule["type"],
                        "snippet": sentence.strip(),
                        "explanation": rule["explanation"],
                        "suggestion": rule["suggestion"],
                    }
                )

    hits.extend(_detect_circular_reasoning(text))

    # De-duplicate identical (type, snippet) pairs
    seen = set()
    unique_hits = []
    for h in hits:
        key = (h["type"], h["snippet"])
        if key not in seen:
            seen.add(key)
            unique_hits.append(h)
    return unique_hits
