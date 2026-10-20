import json
import math
import os
import re

from django.conf import settings

from .schemas import ArgumentAnalysisResult, ArgumentScoreRubric, FallacyItem, ToulminModel

DEFAULT_SCORE_WEIGHTS = {
    "clarity": 0.15,
    "relevance": 0.15,
    "evidence": 0.25,
    "logic": 0.30,
    "persuasiveness": 0.15,
}

FALLACY_RULES = (
    (
        "Ad Hominem",
        re.compile(
            r"\b(?:you|your opponent|the speaker|they|he|she)\b.{0,65}"
            r"\b(?:idiot|stupid|corrupt|incompetent|liar|unqualified|"
            r"untrustworthy|ignorant)\b|\b(?:idiot|stupid|corrupt|incompetent|"
            r"liar|unqualified|untrustworthy|ignorant)\b.{0,65}"
            r"\b(?:you|your opponent|the speaker|they|he|she)\b",
            re.IGNORECASE,
        ),
        "The wording attacks a person rather than addressing the merits of their claim.",
        "Remove the personal judgment and respond to the person's evidence or reasoning.",
        82,
    ),
    (
        "Straw Man",
        re.compile(
            r"\b(?:so|therefore),?\s+(?:you|they|your opponent)\s+"
            r"(?:want|believe|claim)\b.{0,110}\b(?:ban all|abolish|destroy|"
            r"control everyone|eliminate all|completely remove)\b",
            re.IGNORECASE,
        ),
        "This attributes an extreme position to an opponent without establishing that it is their actual argument.",
        "Restate the opponent's position accurately and address its strongest supported version.",
        78,
    ),
    (
        "False Dilemma",
        re.compile(
            r"\beither\b.{1,150}\bor\b.{0,100}\b(?:only|no other|no alternative)\b|"
            r"\bthe only (?:two )?(?:choices|options)\b",
            re.IGNORECASE,
        ),
        "The statement treats a limited set of choices as exhaustive without ruling out reasonable alternatives.",
        "Acknowledge viable middle-ground options and explain why they would or would not work.",
        76,
    ),
    (
        "Slippery Slope",
        re.compile(
            r"\bif\b.{1,100}\b(?:then )?(?:it )?will (?:inevitably|eventually|"
            r"lead to|cause|result in)\b.{1,120}\b(?:and|then|ultimately)\b",
            re.IGNORECASE,
        ),
        "The argument predicts a chain of escalating outcomes but does not establish the links between them.",
        "Identify and support each causal step, or qualify the prediction and its likelihood.",
        78,
    ),
    (
        "Appeal to Authority",
        re.compile(
            r"\b(?:this is true|this is correct|(?:the|this) policy is right|"
            r"the claim is true)\s+because\b.{0,100}\b(?:celebrity|actor|"
            r"expert|professor|authority|famous person)\b.{0,45}\b(?:says|said|believes)\b",
            re.IGNORECASE,
        ),
        "The statement treats a person's status or opinion as sufficient proof rather than evaluating relevant evidence.",
        "Use verifiable evidence and explain relevant expertise; an authority's view alone is not proof.",
        77,
    ),
    (
        "Circular Reasoning",
        re.compile(
            r"\b(?:the claim|(?:the|this) policy|the rule|the argument)\s+"
            r"(?:is true|is correct|is right)\s+because\s+"
            r"(?:the claim|(?:the|this) policy|the rule|the argument)\s+"
            r"(?:is true|is correct|is right)\b|\bit is true because it is true\b",
            re.IGNORECASE,
        ),
        "The reason repeats the conclusion instead of providing independent support.",
        "Add a premise or evidence that can be evaluated independently of the conclusion.",
        83,
    ),
    (
        "Hasty Generalization",
        re.compile(
            r"\b(?:one|a single|one single)\b.{1,90}\b(?:therefore|so)\b"
            r".{1,70}\b(?:everyone|all people|always|never|no one)\b|"
            r"\bafter (?:one|a single) .{1,80}\b(?:all|everyone|always|never)\b",
            re.IGNORECASE,
        ),
        "A broad conclusion is drawn from an explicitly limited example or sample.",
        "Use a representative sample, state its limits, and narrow the conclusion if needed.",
        76,
    ),
    (
        "Red Herring",
        re.compile(
            r"\b(?:instead of|rather than) (?:answering|addressing|discussing) "
            r".{1,100}\b(?:let's|we should|you should|talk about|focus on)\b",
            re.IGNORECASE,
        ),
        "The wording explicitly redirects attention from the issue at hand to a different issue.",
        "Address the original question directly before introducing a separate, relevant concern.",
        74,
    ),
)

SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+|\n+")
EVIDENCE_CUES = re.compile(
    r"\b(?:study|studies|research|survey|data|statistics|records|measured|"
    r"reported|according to|trial|experiment|for example|evidence|sample|percent)\b",
    re.IGNORECASE,
)
NUMBER_CUE = re.compile(r"\b\d+(?:\.\d+)?%?\b")
WORD_PATTERN = re.compile(r"[a-z]{3,}")
STOP_WORDS = {
    "about", "after", "again", "also", "because", "been", "being", "between",
    "could", "does", "during", "each", "from", "have", "into", "more", "most",
    "should", "since", "some", "such", "than", "that", "their", "there",
    "these", "they", "this", "those", "through", "under", "very", "were",
    "what", "when", "where", "which", "while", "will", "with", "would",
}


def _weights():
    configured = getattr(settings, "ARGUMENT_SCORE_WEIGHTS", None) or os.getenv(
        "ARGUMENT_SCORE_WEIGHTS", ""
    )
    if not configured:
        return DEFAULT_SCORE_WEIGHTS
    try:
        data = json.loads(configured) if isinstance(configured, str) else configured
        if set(data) != set(DEFAULT_SCORE_WEIGHTS):
            raise ValueError("All score dimensions must be configured.")
        weights = {key: float(value) for key, value in data.items()}
        if (
            any(not math.isfinite(value) or value < 0 for value in weights.values())
            or sum(weights.values()) <= 0
        ):
            raise ValueError("Weights must be non-negative and have a positive total.")
        return weights
    except (TypeError, ValueError, json.JSONDecodeError) as exc:
        raise ValueError(
            "ARGUMENT_SCORE_WEIGHTS must be a JSON object with non-negative weights "
            "for clarity, relevance, evidence, logic, and persuasiveness."
        ) from exc


def calculate_overall_score(scores):
    weights = _weights()
    total_weight = sum(weights.values())
    return round(sum(scores[key] * weight for key, weight in weights.items()) / total_weight)


def apply_overall_score(result, method):
    scores = {
        key: getattr(result.scores, key)
        for key in DEFAULT_SCORE_WEIGHTS
    }
    return result.model_copy(update={
        "analysis_method": method,
        "scores": result.scores.model_copy(update={
            "overall": calculate_overall_score(scores),
        }),
    })


def _words(text):
    return {word for word in WORD_PATTERN.findall(text.lower()) if word not in STOP_WORDS}


def _find_fallacies(sentences):
    detected = []
    for name, pattern, explanation, correction, confidence in FALLACY_RULES:
        excerpt = next((item for item in sentences if pattern.search(item)), None)
        if excerpt:
            detected.append(FallacyItem(
                type=name,
                excerpt=excerpt,
                explanation=explanation,
                correction=correction,
                confidence=confidence,
            ))
    return detected


def analyze_argument_rule_based(argument_text, context=""):
    sentences = [part.strip() for part in SENTENCE_SPLIT.split(argument_text.strip()) if part.strip()]
    claim_pattern = re.compile(
        r"\b(?:therefore|thus|consequently|this means|we should|should|"
        r"must|ought to|the conclusion is)\b",
        re.IGNORECASE,
    )
    claim_index = next(
        (i for i in range(len(sentences) - 1, -1, -1) if claim_pattern.search(sentences[i])),
        len(sentences) - 1,
    )
    claim = sentences[claim_index]
    supporting_claims = [sentence for i, sentence in enumerate(sentences) if i != claim_index]
    evidence = [
        sentence for sentence in supporting_claims
        if EVIDENCE_CUES.search(sentence) or NUMBER_CUE.search(sentence)
    ]
    fallacies = _find_fallacies(sentences)

    word_count = len(argument_text.split())
    average_sentence_length = word_count / max(len(sentences), 1)
    clarity = round(max(
        30,
        min(96, 92 - max(0, word_count - 120) // 8 - max(0, average_sentence_length - 24) * 2),
    ))
    evidence_score = min(
        95,
        35 + len(evidence) * 18 + sum(bool(NUMBER_CUE.search(item)) for item in evidence) * 8,
    )
    if context.strip():
        topic_words = _words(context)
        argument_words = _words(argument_text)
        relevance = min(95, 50 + 7 * len(topic_words & argument_words))
    else:
        relevance = min(82, 65 + min(len(supporting_claims), 3) * 5)

    logic = max(25, 84 - 13 * len(fallacies))
    if not supporting_claims:
        logic = max(25, logic - 10)
    persuasiveness = round((clarity + relevance + evidence_score + logic) / 4)
    dimensions = {
        "clarity": clarity,
        "relevance": relevance,
        "evidence": evidence_score,
        "logic": logic,
        "persuasiveness": persuasiveness,
    }
    overall = calculate_overall_score(dimensions)

    weaknesses = []
    recommendations = []
    if not evidence:
        weaknesses.append("No explicit verifiable source, measurement, or concrete example was identified.")
        recommendations.append("Add a relevant, checkable source, data point, or concrete example.")
    else:
        recommendations.append("Identify the source and explain how each piece of evidence supports the claim.")
    if not supporting_claims:
        weaknesses.append("The argument states a conclusion but no separate supporting point.")
    if fallacies:
        weaknesses.extend(f"{item.type}: {item.explanation}" for item in fallacies)
        recommendations.extend(item.correction for item in fallacies)
    else:
        recommendations.append("Consider a plausible counterexample and qualify the claim where appropriate.")
    recommendations.append("State the reasoning link between each supporting point and the conclusion.")
    recommendations = list(dict.fromkeys(recommendations))

    improved = re.sub(
        r"\bwill (?:inevitably|certainly|undoubtedly)\b",
        "may",
        argument_text.strip(),
        flags=re.IGNORECASE,
    )
    improved = re.sub(
        r"\b(?:always|inevitably|certainly|undoubtedly)\b",
        "often",
        improved,
        flags=re.IGNORECASE,
    )
    if improved == argument_text.strip():
        improved += " State the evidence and reasoning that support this conclusion."

    return ArgumentAnalysisResult(
        toulmin=ToulminModel(
            claim=claim,
            grounds=" ".join(evidence) if evidence else "No explicit verifiable evidence or example was identified.",
            warrant=(
                "The stated reasons are intended to support the conclusion; explain the link between them."
                if supporting_claims
                else "No separate premise is stated to connect evidence to the conclusion."
            ),
            backing="No independent backing is explicitly identified by the rule-based review.",
            qualifier="Provisional; depends on evidence and context supplied.",
            rebuttal="Consider what counterexample or alternative explanation could weaken the claim.",
        ),
        scores=ArgumentScoreRubric(
            logic=logic,
            evidence=evidence_score,
            persuasiveness=persuasiveness,
            clarity=clarity,
            overall=overall,
            relevance=relevance,
        ),
        fallacies=fallacies,
        feedback=(
            f"Rule-based coaching review. Overall score {overall}/100 is the weighted mean of clarity (15%), "
            "relevance (15%), evidence (25%), logical consistency (30%), and persuasiveness (15%). "
            "Text heuristics can miss context and do not verify factual claims."
            + (
                " No clear instance of the eight supported fallacies was identified; this is not proof the argument is fallacy-free."
                if not fallacies else ""
            )
        ),
        analysis_method="rule_based",
        supporting_claims=supporting_claims,
        evidence=evidence,
        reasoning_weaknesses=weaknesses,
        recommendations=recommendations,
        improved_argument=improved,
    )
