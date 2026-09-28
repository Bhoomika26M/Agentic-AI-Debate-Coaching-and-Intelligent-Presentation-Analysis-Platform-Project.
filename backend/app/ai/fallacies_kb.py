from typing import List, Dict, Any
import re

FALLACIES_DB: List[Dict[str, Any]] = [
    {
        "name": "Ad Hominem",
        "keywords": ["idiot", "corrupt", "biased", "fool", "naive", "stupid", "evil", "liar", "clueless", "hypocrite", "they just want", "only people who are"],
        "regex": r"\b(you|they|opponents|critics)\s+(are|is)\s+(stupid|evil|naive|corrupt|idiots|biased|clueless|incompetent|hypocritical)\b",
        "explanation": "Attacking the opponent's personal traits, character, or motives instead of engaging with their substantive argument.",
        "why_problematic": "Personal characteristics or motives do not invalidate the factual truth or logical validity of an argument.",
        "correct_reasoning": "Address the premises, data, or logical connections of the opposing claim directly without targeting personal attributes.",
        "suggested_correction": "Replace personal remarks with analytical critique of the premise or supporting data.",
        "sample_improved": "While critics express skepticism, their underlying data relies on an unverified sample rather than broader demographic trends."
    },
    {
        "name": "Straw Man",
        "keywords": ["so you think that", "wants to destroy", "completely eliminate", "ban everything", "wants everyone to", "claims that all"],
        "regex": r"\b(so you('re|\s+are)\s+saying|wants?\s+to\s+(destroy|ban\s+all|completely\s+eliminate|ruin))\b",
        "explanation": "Misrepresenting or exaggerating an opponent's position to make it easier to attack or disprove.",
        "why_problematic": "Refuting an exaggerated or distorted caricature does not defeat the actual claim put forward by the other party.",
        "correct_reasoning": "Steel-man the opponent's true position and refute its strongest form rather than a simplified caricature.",
        "suggested_correction": "Accurately state the opponent's nuanced policy proposal before demonstrating its limitations.",
        "sample_improved": "The opposing proposal recommends targeted regulatory guardrails rather than a blanket ban, yet even targeted measures introduce substantial compliance friction."
    },
    {
        "name": "False Dilemma",
        "keywords": ["either", "or we must", "the only alternative", "only two choices", "if we don't", "there is no middle ground", "you're either with us"],
        "regex": r"\b(either\s+we\s+.+\s+or\s+(we\s+will|disaster|ruin)|only\s+two\s+options|no\s+other\s+choice)\b",
        "explanation": "Presenting only two alternative states as the only possibilities, when in fact intermediate or alternative options exist.",
        "why_problematic": "Artificially constraining complex policy questions to a binary choice obscures pragmatic compromises and hybrid solutions.",
        "correct_reasoning": "Acknowledge the continuum of possibilities, phased rollouts, and hybrid approaches available between the extremes.",
        "suggested_correction": "Introduce nuanced middle-ground alternatives rather than an all-or-nothing framing.",
        "sample_improved": "Rather than choosing between unregulated deployment or total prohibition, we can implement tiered regulatory sandbox pilot programs."
    },
    {
        "name": "Slippery Slope",
        "keywords": ["will inevitably lead to", "next thing you know", "slippery slope", "will open the floodgates", "before long we will have", "will lead to the total"],
        "regex": r"\b(inevitably\s+lead\s+to|slippery\s+slope|open\s+the\s+floodgates|next\s+thing\s+you\s+know|lead\s+to\s+total)\b",
        "explanation": "Asserting that a relatively small first step will inevitably trigger a chain of negative events without demonstrating causal links.",
        "why_problematic": "Each step in a predictive chain requires its own empirical probability and causal justification; one event does not automatically mandate the next.",
        "correct_reasoning": "Demonstrate the precise causal mechanism and empirical likelihood of each sequential consequence.",
        "suggested_correction": "Quantify the probable scope of the immediate proposal rather than predicting catastrophic distant outcomes without evidence.",
        "sample_improved": "If this measure is passed, historical precedent in peer jurisdictions indicates a 4-7% shift in administrative overhead, rather than an irreversible collapse."
    },
    {
        "name": "Appeal to Authority",
        "keywords": ["experts say", "everyone knows", "famous people", "celebrities agree", "because doctor x said so", "an influential person"],
        "regex": r"\b(because\s+[A-Z][a-z]+\s+said\s+so|famous\s+people\s+agree|authority\s+says\s+it('s|\s+is)\s+true)\b",
        "explanation": "Claiming something must be true solely because an authority figure asserted it, especially outside their domain of expertise or without evidence.",
        "why_problematic": "Authorities can be mistaken, biased, or cited outside their actual technical domain; arguments stand on evidence, not status.",
        "correct_reasoning": "Cite peer-reviewed consensus, empirical trials, or foundational methodological reasoning behind the expert's claim.",
        "suggested_correction": "Provide the methodology or data that the authority used rather than just citing their name.",
        "sample_improved": "The 2024 meta-analysis published in Nature, which examined 42 randomized trials, demonstrated a statistically significant 18% improvement."
    },
    {
        "name": "Circular Reasoning",
        "keywords": ["because it is", "obviously true because", "is true because it's true", "self-evident", "it's right because", "by definition"],
        "regex": r"\b(is\s+(good|bad|true|false)\s+because\s+it('s|\s+is)\s+(good|bad|true|false)|true\s+because\s+it\s+is)\b",
        "explanation": "Using the conclusion itself as one of the premises to support the argument (begging the question).",
        "why_problematic": "A circular premise assumes the very proposition that is under debate, offering zero independent evidentiary support.",
        "correct_reasoning": "Provide external premises and verifiable independent indicators to support your central contention.",
        "suggested_correction": "Ground the claim in observable outcomes or measurable metrics independent of the conclusion.",
        "sample_improved": "Digital learning platforms enhance learning efficacy because longitudinal test scores show a 15% increase in STEM comprehension over 3 academic semesters."
    },
    {
        "name": "Hasty Generalization",
        "keywords": ["always", "never", "every single time", "i know a person who", "in my experience all", "everyone does this"],
        "regex": r"\b(everyone\s+(always|never)|in\s+my\s+experience\s+everyone|all\s+people\s+always|nobody\s+ever)\b",
        "explanation": "Drawing a broad conclusion from an insufficient or unrepresentative sample size.",
        "why_problematic": "Anecdotal experiences or tiny sample groups cannot reliably predict universal population behaviors or systemic outcomes.",
        "correct_reasoning": "Qualify assertions using probabilistic language and cite representative, randomized demographic research.",
        "suggested_correction": "Replace sweeping generalizations with hedged claims supported by representative datasets.",
        "sample_improved": "While personal experiences vary, broad empirical studies across 10,000 participants indicate a consistent trend in 64% of observed cases."
    },
    {
        "name": "Red Herring",
        "keywords": ["what about", "whatabout", "why are we talking about this when", "the real issue is", "look at what they did", "that doesn't matter because"],
        "regex": r"\b(what\s+about\s+the\s+fact|why\s+are\s+we\s+talking\s+about\s+this\s+when|the\s+real\s+issue\s+is\s+actually)\b",
        "explanation": "Introducing an irrelevant topic to divert attention from the original argument being debated.",
        "why_problematic": "Changing the subject evades the burden of proof and prevents resolution of the core debate resolution.",
        "correct_reasoning": "Remain focused on the specific motion and claims under discussion before transitioning to secondary concerns.",
        "suggested_correction": "Resolve the primary claim before exploring tangential or contextual issues.",
        "sample_improved": "While fiscal governance is undeniably important, our present motion specifically addresses algorithmic transparency in public institutions."
    }
]
