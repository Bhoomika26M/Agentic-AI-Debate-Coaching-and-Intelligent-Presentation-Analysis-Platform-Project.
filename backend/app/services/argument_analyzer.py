
import re
import json

from app.services.local_ai import generate_ai_response


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
    """Analyze an argument using predefined rules."""

    cleaned_text = re.sub(r"\s+", " ", text).strip()

    sentences = re.split(r"(?<=[.!?])\s+", cleaned_text)
    sentences = [s.strip() for s in sentences if s.strip()]

    claim = sentences[0] if sentences else cleaned_text
    supporting_reasons = []

    reason_pattern = re.compile(
        r"\b(because|since|due to)\b",
        re.IGNORECASE,
    )

    for sentence in sentences:
        match = reason_pattern.search(sentence)

        if match:
            possible_claim = sentence[:match.start()].strip()
            possible_reason = sentence[match.end():].strip()

            possible_claim = possible_claim.rstrip(" ,;:")
            possible_reason = possible_reason.lstrip(" ,;:")

            if possible_claim:
                claim = possible_claim

            if possible_reason:
                supporting_reasons.append(possible_reason)

        elif re.search(
            r"\b(therefore|for example|this shows)\b",
            sentence,
            re.IGNORECASE,
        ):
            supporting_reasons.append(sentence)

    supporting_reasons = list(dict.fromkeys(supporting_reasons))

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


def analyze_argument_with_ai(text: str) -> dict:
    """Analyze an argument using Ollama with improved extraction."""

    cleaned_text = re.sub(r"\s+", " ", text).strip()

    # Calculate sentence count using Python.
    sentences = re.split(r"(?<=[.!?])\s+", cleaned_text)
    sentences = [
        sentence.strip()
        for sentence in sentences
        if sentence.strip()
    ]
    actual_sentence_count = len(sentences)

    prompt = f"""
You are an expert debate coach.

Analyze the argument and separate the main claim from
the reasons supporting it.

ARGUMENT:
{cleaned_text}

RULES:

1. CLAIM:
   - Return only the main conclusion or position.
   - Keep it short and complete.
   - Do not copy the entire argument.
   - Do not include a reason introduced by because, since,
     or due to when that reason can be separated.
   - Prefer the conclusion the speaker wants the audience to accept.

2. SUPPORTING REASONS:
   - Return only distinct supporting reasons or evidence.
   - Do not repeat the whole argument.
   - Do not include the claim itself as a reason.
   - Do not invent facts.
   - If no clear reasons exist, return an empty list.

3. FALLACIES:
   - Identify only fallacies supported by the wording.
   - Appeal to Popularity means popularity is used as justification
     for accepting a claim without adequate supporting evidence.
   - Slippery Slope requires an unsupported chain of consequences.
   - Do not label popularity or a decision alone as Slippery Slope.
   - Return an empty list if no fallacy is clear.
   - Each evidence field must be an exact quotation from the input.

4. FEEDBACK:
   - Provide one or two sentences of constructive advice.
   - Explain how the argument could be strengthened.

5. OUTPUT:
   - Return only valid JSON, without Markdown fences.
   - Set sentence_count to 0; Python will calculate it.

Use exactly this structure:
{{
  "claim": "The main conclusion",
  "supporting_reasons": ["A distinct supporting reason"],
  "possible_fallacies": [
    {{
      "name": "Fallacy name",
      "explanation": "Why the reasoning may be fallacious",
      "evidence": "Exact quotation from the argument"
    }}
  ],
  "sentence_count": 0,
  "feedback": "Constructive feedback"
}}
"""

    ai_text = generate_ai_response(prompt)

    # Extract the JSON object.
    start = ai_text.find("{")
    end = ai_text.rfind("}")

    if start == -1 or end == -1:
        raise ValueError("The AI did not return a JSON object.")

    result = json.loads(ai_text[start:end + 1])

    required_keys = [
        "claim",
        "supporting_reasons",
        "possible_fallacies",
        "sentence_count",
        "feedback",
    ]

    if not all(key in result for key in required_keys):
        raise ValueError("The AI response is missing required fields.")

    claim = result["claim"]
    reasons = result["supporting_reasons"]
    fallacies = result["possible_fallacies"]
    feedback = result["feedback"]

    if not isinstance(claim, str) or not claim.strip():
        raise ValueError("The AI returned an invalid claim.")

    if not isinstance(reasons, list) or not all(
        isinstance(reason, str) for reason in reasons
    ):
        raise ValueError("The AI returned invalid supporting reasons.")

    if not isinstance(fallacies, list):
        raise ValueError("The AI returned invalid fallacies.")

    if not isinstance(feedback, str):
        raise ValueError("The AI returned invalid feedback.")

    # If the AI returns the whole argument as the claim,
    # try to extract a conclusion following words such as "so".
    if claim.strip().casefold() == cleaned_text.casefold():
        extracted_claim = None

        for sentence in sentences:
            match = re.search(
                r"\b(so|therefore|thus|hence)\b",
                sentence,
                re.IGNORECASE,
            )

            if match:
                extracted_claim = sentence[match.end():].strip(" ,;:")

                if extracted_claim:
                    break

        if extracted_claim:
            claim = extracted_claim

    # Remove duplicate or whole-argument supporting reasons.
    cleaned_reasons = []
    seen_reasons = set()

    for reason in reasons:
        reason = reason.strip()

        if not reason:
            continue

        reason_key = reason.casefold()

        if reason_key in {
            claim.strip().casefold(),
            cleaned_text.casefold(),
        }:
            continue

        if reason_key not in seen_reasons:
            cleaned_reasons.append(reason)
            seen_reasons.add(reason_key)

    # Correct claims that include a reason introduced by
    # "because", "since", or "due to".
    reason_match = re.search(
        r"\b(because|since|due to)\b",
        claim,
        re.IGNORECASE,
    )

    if reason_match:
        extracted_claim = claim[:reason_match.start()].strip(" ,;:")
        extracted_reason = claim[reason_match.end():].strip(" ,;:")

        if extracted_claim:
            claim = extracted_claim

        if extracted_reason:
            reason_key = extracted_reason.casefold()

            if reason_key not in {
                reason.casefold() for reason in cleaned_reasons
            }:
                cleaned_reasons.append(extracted_reason)

    # Keep only fallacies with evidence found in the original input.
    validated_fallacies = []

    for fallacy in fallacies:
        if not isinstance(fallacy, dict):
            continue

        name = fallacy.get("name")
        explanation = fallacy.get("explanation")
        evidence = fallacy.get("evidence")

        if not all(
            isinstance(value, str) and value.strip()
            for value in (name, explanation, evidence)
        ):
            continue

        if evidence.casefold() not in cleaned_text.casefold():
            continue

        validated_fallacies.append({
            "name": name,
            "explanation": explanation,
            "evidence": evidence,
        })

    # Build the final response.
    result["claim"] = claim.strip()
    result["supporting_reasons"] = cleaned_reasons
    result["possible_fallacies"] = validated_fallacies
    result["sentence_count"] = actual_sentence_count
    result["feedback"] = feedback.strip()
    result["analysis_method"] = "ollama"
    result["limitations"] = (
        "AI-generated claims, reasons, and fallacy assessments may "
        "still be inaccurate. Review the results before relying on them."
    )

    return result
