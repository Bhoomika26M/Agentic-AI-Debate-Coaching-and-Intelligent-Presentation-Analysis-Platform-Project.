import re


FALLACY_PATTERNS = [
    {
        "name": "Ad Hominem",
        "patterns": [
            r"\byou are stupid\b",
            r"\byou are an idiot\b",
        ],
        "explanation": (
            "The argument may attack a person instead of "
            "addressing their claim."
        ),
    },
    {
        "name": "Bandwagon Fallacy",
        "patterns": [
            r"\beveryone knows\b",
            r"\beverybody does it\b",
            r"\beveryone is doing it\b",
        ],
        "explanation": (
            "The argument may treat popularity as proof "
            "that a claim is true."
        ),
    },
    {
        "name": "Slippery Slope",
        "patterns": [
            r"\bnext thing you know\b",
            r"\bthis will inevitably lead to\b",
        ],
        "explanation": (
            "The argument may assume a chain of consequences "
            "without sufficient evidence."
        ),
    },
    {
        "name": "False Dilemma",
        "patterns": [
            r"\bthere are only two options\b",
            r"\byou are either .+ or\b",
        ],
        "explanation": (
            "The argument may ignore other possible choices."
        ),
    },
]


def analyze_argument(text: str) -> dict:
    cleaned_text = re.sub(r"\s+", " ", text).strip()
    sentences = re.split(r"(?<=[.!?])\s+", cleaned_text)
    sentences = [s.strip() for s in sentences if s.strip()]

    claim = sentences[0] if sentences else cleaned_text

    reason_words = (
        "because",
        "since",
        "therefore",
        "for example",
        "due to",
        "this shows",
    )

    supporting_reasons = [
        sentence
        for sentence in sentences
        if any(word in sentence.lower() for word in reason_words)
    ]

    possible_fallacies = []

    for fallacy in FALLACY_PATTERNS:
        for pattern in fallacy["patterns"]:
            if re.search(pattern, cleaned_text, re.IGNORECASE):
                possible_fallacies.append({
                    "name": fallacy["name"],
                    "explanation": fallacy["explanation"],
                    "evidence": cleaned_text,
                })
                break

    if possible_fallacies:
        feedback = (
            "Review the flagged reasoning and check whether "
            "the evidence supports the conclusion. These are "
            "possible fallacies, not definitive judgments."
        )
    elif supporting_reasons:
        feedback = (
            "The text contains possible supporting reasons. "
            "Check whether they are relevant and backed by evidence."
        )
    else:
        feedback = (
            "Add clear supporting reasons and evidence to make "
            "the argument easier to evaluate."
        )

    return {
        "claim": claim,
        "supporting_reasons": supporting_reasons,
        "possible_fallacies": possible_fallacies,
        "sentence_count": len(sentences),
        "feedback": feedback,
        "analysis_method": "rule_based",
        "limitations": (
            "This initial version uses simple text patterns and "
            "may miss fallacies or flag statements incorrectly."
        ),
    }