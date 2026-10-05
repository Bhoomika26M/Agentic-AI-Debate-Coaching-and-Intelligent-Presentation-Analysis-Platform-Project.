"""
Counterargument Generation Engine
-----------------------------------
Free/local template-based generator. For each extracted claim, produces one
counterargument per type required by the spec: Logical, Evidence-Based,
Ethical, Practical, and Policy rebuttals, plus a challenge question and a
short debate-strategy suggestion.

This is deliberately template-driven (not an LLM) so it runs with zero cost
and zero external dependency. It is straightforward to later swap in an LLM
call for higher-quality generation without changing the API surface.
"""

import random
from typing import Dict, List

_TEMPLATES = {
    "Logical Rebuttal": [
        "One could question the logic here: does '{claim}' actually follow from the reasons given, or are there missing steps in between?",
        "It's worth asking whether '{claim}' holds even in edge cases -- the argument may not generalize as broadly as it assumes.",
    ],
    "Evidence-Based Rebuttal": [
        "Are there studies or data that contradict '{claim}'? Without cited sources, this claim remains an assertion rather than a demonstrated fact.",
        "A skeptic might ask for the specific evidence behind '{claim}', since anecdote alone doesn't establish the pattern.",
    ],
    "Ethical Counterargument": [
        "Even if '{claim}' were true, one might ask whether acting on it is fair to those most affected by the outcome.",
        "There's an ethical angle to consider: does '{claim}' hold up when weighed against the rights or interests of the minority affected?",
    ],
    "Practical Counterargument": [
        "In practice, implementing the idea behind '{claim}' could run into resource, cost, or logistical constraints not addressed here.",
        "How would '{claim}' actually be enforced or carried out at scale? The practical mechanics matter as much as the principle.",
    ],
    "Policy Counterargument": [
        "From a policy standpoint, alternatives to the position in '{claim}' might achieve a similar goal with fewer downsides.",
        "Policymakers might weigh '{claim}' against existing regulations or precedents that suggest a different approach is safer.",
    ],
}

_CHALLENGE_QUESTIONS = [
    "What evidence would change your mind about '{claim}'?",
    "How does '{claim}' hold up against the strongest counterexample you can think of?",
    "What assumption is '{claim}' relying on that hasn't been stated explicitly?",
]

_STRATEGY_SUGGESTIONS = [
    "Lead with your strongest piece of evidence before your opponent can anticipate it.",
    "Pre-empt the most likely rebuttal by addressing it directly in your opening.",
    "Use a concrete example to ground an otherwise abstract claim.",
    "Concede a minor point to build credibility before making your central argument.",
]


def generate_counterarguments(claims: List[str], max_claims: int = 3) -> Dict:
    counterarguments = []
    for claim in claims[:max_claims]:
        clean_claim = claim.strip().rstrip(".")
        for c_type, templates in _TEMPLATES.items():
            template = random.choice(templates)
            counterarguments.append(
                {"type": c_type, "text": template.format(claim=clean_claim)}
            )

    challenge_questions = [
        q.format(claim=claims[0].strip().rstrip(".")) for q in _CHALLENGE_QUESTIONS
    ] if claims else []

    strategy = random.sample(_STRATEGY_SUGGESTIONS, k=min(2, len(_STRATEGY_SUGGESTIONS)))

    return {
        "counterarguments": counterarguments,
        "challenge_questions": challenge_questions,
        "strategy_suggestions": strategy,
    }
