import json
import math
import os
import re
from collections.abc import Iterable

from django.conf import settings

from .schemas import (
    ArgumentAnalysisResult,
    ArgumentScoreRubric,
    FallacyItem,
    ToulminModel,
)


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
            r"\b(?:you|your opponent|the speaker|they|he|she)\b.{0,70}"
            r"\b(?:idiot|stupid|corrupt|incompetent|liar|unqualified|"
            r"untrustworthy|ignorant)\b|\b(?:idiot|stupid|corrupt|incompetent|"
            r"liar|unqualified|untrustworthy|ignorant)\b.{0,70}"
            r"\b(?:you|your opponent|the speaker|they|he|she)\b",
            re.IGNORECASE,
        ),
        "The statement attacks a person instead of addressing the merits of their claim.",
        "Remove the personal judgment and respond to the person's evidence or reasoning.",
    ),
    (
        "Straw Man",
        re.compile(
            r"\b(?:so|therefore),?\s+(?:you|they|your opponent)\s+"
            r"(?:want|believe|claim)\b.{0,100}\b(?:ban all|abolish|destroy|"
            r"control everyone|eliminate all|completely remove)\b",
            re.IGNORECASE,
        ),
        "This attributes an extreme position to an opponent without establishing that it represents their actual argument.",
        "Restate the opponent's position accurately and address its strongest supported version.",
    ),
    (
        "False Dilemma",
        re.compile(
            r"\beither\b.{1,180}\bor\b.{0,120}\b(?:only|no other|no alternative)\b|"
            r"\bthe only (?:two )?(?:choices|options)\b|"
            r"\bif we (?:do not|don't) .{1,120}\bthen\b",
            re.IGNORECASE,
        ),
        "The wording presents a limited set of choices as exhaustive without ruling out reasonable alternatives.",
        "Acknowledge viable middle-ground options and explain why they would or would not work.",
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
    ),
    (
        "Appeal to Authority",
        re.compile(
            r"\b(?:this is true|this is correct|(?:the|this) policy is right|"
            r"the claim is true)\s+because\b.{0,100}\b(?:celebrity|actor|"
            r"expert|professor|authority|famous person)\b.{0,50}\b(?:says|said|believes)\b",
            re.IGNORECASE,
        ),
        "The statement treats a person's status or opinion as sufficient proof, rather than evaluating relevant evidence.",
        "Use verifiable evidence and explain the person's relevant expertise; an authority's view alone is not proof.",
    ),
    (
        "Circular Reasoning",
        re.compile(
            r"\b(?:the claim|(?:the|this) policy|the rule|the argument)\s+"
            r"(?:is true|is correct|is right)\s+because\s+"
            r"(?:the claim|(?:the|this) policy|the rule|the argument)\s+"
            r"(?:is true|is correct|is right)\b|"
            r"\bit is true because it is true\b",
            re.IGNORECASE,
        ),
        "The reason repeats the conclusion instead of providing independent support.",
        "Add a premise or evidence that can be evaluated independently of the conclusion.",
    ),
    (
        "Hasty Generalization",
        re.compile(
            r"\b(?:one|a single|one single)\b.{1,90}\b(?:therefore|so)\b"
            r".{1,60}\b(?:everyone|all people|always|never|no one)\b|"
            r"\bafter (?:one|a single) .{1,80}\b(?:all|everyone|always|never)\b",
            re.IGNORECASE,
        ),
        "A broad conclusion is drawn from an explicitly limited example or sample.",
        "Use a representative sample, provide its size and limitations, and narrow the conclusion if needed.",
    ),
    (
        "Red Herring",
        re.compile(
            r"\b(?:instead of|rather than) (?:answering|addressing|discussing) "
            r".{1,100}\b(?:let's|we should|you should|talk about|focus on)\b",
            re.IGNORECASE,
        ),
        "The wording explicitly redirects attention from the issue under discussion to a different issue.",
        "Address the original question directly before introducing a separate, relevant concern.",
    ),
)

SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+|\n+")
EVIDENCE_CUES = re.compile(
    r"\b(?:study|studies|research|survey|data|statistics|records|"
    r"measured|reported|according to|trial|experiment|for example|"
    r"evidence|sample|percent)\b",
    re.IGNORECASE,
)
NUMBER_CUE = re.compile(r"\b\d+(?:\.\d+)?%?\b")
CONTENT_WORD = re.compile(r"[a-z]{3,}")
STOP_WORDS = {
    "about", "after", "again", "also", "because", "been", "being", "between",
    "could", "does", "during", "each", "from", "have", "into", "more", "most",
    "should", "since", "some", "such", "than", "that", "their", "there",
    "these", "they", "this", "those", "through", "under", "very", "were",
    "what", "when", "where", "which", "while", "will", "with", "would",
}


def _score_weights():
    configured = getattr(settings, "ARGUMENT_SCORE_WEIGHTS", None)
    if configured is None:
        configured = os.getenv("ARGUMENT_SCORE_WEIGHTS")
    if not configured:
        return DEFAULT_SCORE_WEIGHTS

    try:
        weights = json.loads(configured) if isinstance(configured, str) else configured
        if set(weights) != set(DEFAULT_SCORE_WEIGHTS):
            raise ValueError("Score weights must define all five score dimensions.")
        parsed = {key: float(value) for key, value in weights.items()}
        if any(not math.isfinite(value) or value < 0 for value in parsed.values()) or sum(parsed.values()) <= 0:
            raise ValueError("Score weights must be non-negative with a positive total.")
        return parsed
    except (TypeError, ValueError, json.JSONDecodeError) as exc:
        raise ValueError("ARGUMENT_SCORE_WEIGHTS must be a valid JSON object of non-negative weights.") from exc


def calculate_overall_score(scores: dict[str, int]) -> int:
    weights = _score_weights()
    total_weight = sum(weights.values())
    return round(sum(scores[key] * weight for key, weight in weights.items()) / total_weight)


def apply_overall_score(result: ArgumentAnalysisResult, method: str) -> ArgumentAnalysisResult:
    scores = {
        "clarity": result.scores.clarity,
        "relevance": result.scores.relevance,
        "evidence": result.scores.evidence,
        "logic": result.scores.logic,
        "persuasiveness": result.scores.persuasiveness,
    }
    return result.model_copy(update={
        "analysis_method": method,
        "scores": result.scores.model_copy(update={"overall": calculate_overall_score(scores)}),
    })


def _sentences(text: str) -> list[str]:
    return [sentence.strip() for sentence in SENTENCE_SPLIT.split(text.strip()) if sentence.strip()]


def _words(text: str) -> set[str]:
    return {word for word in CONTENT_WORD.findall(text.lower()) if word not in STOP_WORDS}


def _find_fallacies(sentences: Iterable[str]) -> list[FallacyItem]:
    found = []
    for name, pattern, explanation, correction in FALLACY_RULES:
        sentence = next((item for item in sentences if pattern.search(item)), None)
        if sentence:
            found.append(
                FallacyItem(
                    type=name,
                    excerpt=sentence,
                    explanation=explanation,
                    correction=correction,
                    confidence=78,
                )
            )
    return found


def analyze_argument_rule_based(argument_text: str, context: str = "") -> ArgumentAnalysisResult:
    sentences = _sentences(argument_text)
    claim_markers = re.compile(
        r"\b(?:therefore|thus|so|consequently|this means|we should|"
        r"should|must|ought to|the conclusion is)\b",
        re.IGNORECASE,
    )
    claim_index = next(
        (index for index in range(len(sentences) - 1, -1, -1) if claim_markers.search(sentences[index])),
        len(sentences) - 1,
    )
    claim = sentences[claim_index]
    supporting_claims = [item for index, item in enumerate(sentences) if index != claim_index]
    evidence = [
        sentence for sentence in supporting_claims
        if EVIDENCE_CUES.search(sentence) or NUMBER_CUE.search(sentence)
    ]
    fallacies = _find_fallacies(sentences)

    words = argument_text.split()
    word_count = len(words)
    average_sentence_words = word_count / max(len(sentences), 1)
    clarity = round(max(
        30,
        min(96, 92 - max(0, word_count - 120) // 8 - max(0, average_sentence_words - 24) * 2),
    ))
    evidence_score = min(
        95,
        35 + len(evidence) * 18 + sum(bool(NUMBER_CUE.search(item)) for item in evidence) * 8,
    )

    if context.strip():
        relevant_terms = _words(context)
        argument_terms = _words(" ".join([claim, *supporting_claims]))
        overlap = len(relevant_terms & argument_terms)
        relevance = min(95, 50 + overlap * 7)
    else:
        relevant_terms = set()
        relevance = min(82, 65 + min(len(supporting_claims), 3) * 5)

    logic = max(25, 84 - len(fallacies) * 13)
    if not supporting_claims:
        logic = max(25, logic - 10)
    if re.search(r"\balways\b.{0,100}\bnever\b|\bnever\b.{0,100}\balways\b", argument_text, re.IGNORECASE):
        logic = max(25, logic - 12)

    persuasiveness = round((clarity + relevance + evidence_score + logic) / 4)
    score_dimensions = {
        "clarity": clarity,
        "relevance": relevance,
        "evidence": evidence_score,
        "logic": logic,
        "persuasiveness": persuasiveness,
    }
    overall = calculate_overall_score(score_dimensions)

    weaknesses = []
    if not evidence:
        weaknesses.append("No verifiable source, measurement, or concrete example is identified in the text.")
    if not supporting_claims:
        weaknesses.append("The argument states a conclusion but provides no separate supporting point.")
    if fallacies:
        weaknesses.extend(f"{item.type}: {item.explanation}" for item in fallacies)
    elif logic < 75:
        weaknesses.append("The short text does not provide enough structure to assess how its premises support the conclusion.")
    if context.strip() and not relevant_terms.intersection(_words(argument_text)):
        weaknesses.append("The argument uses few terms connected to the supplied debate context.")

    recommendations = []
    if not evidence:
        recommendations.append("Add a relevant, checkable source, data point, or concrete example for the main claim.")
    else:
        recommendations.append("Explain how each cited fact supports the claim and identify its source.")
    if supporting_claims:
        recommendations.append("Make the link between each supporting point and the conclusion explicit.")
    if fallacies:
        recommendations.extend(item.correction for item in fallacies)
    else:
        recommendations.append("Consider a plausible counterexample and qualify the claim where appropriate.")
    recommendations = list(dict.fromkeys(recommendations))

    improved_argument = argument_text.strip()
    improved_argument = re.sub(
        r"\bwill (?:inevitably|certainly|undoubtedly)\b",
        "may",
        improved_argument,
        flags=re.IGNORECASE,
    )
    improved_argument = re.sub(
        r"\b(?:always|inevitably|certainly|undoubtedly)\b",
        "often",
        improved_argument,
        flags=re.IGNORECASE,
    )
    improved_argument = (
        f"A more carefully qualified version: {improved_argument} "
        "This conclusion should be supported with relevant, verifiable evidence."
    )

    grounds = " ".join(evidence) if evidence else "No explicit verifiable evidence or concrete example was identified."
    warrant = (
        "The argument's stated reasons are intended to support its conclusion; the connecting inference should be made explicit."
        if supporting_claims
        else "No separate premise is stated to connect evidence to the conclusion."
    )
    feedback = (
        f"This transparent rule-based review scores the argument {overall}/100 using a weighted average of clarity "
        "(15%), relevance (15%), evidence (25%), logical consistency (30%), and persuasiveness (15%). "
        "The heuristic review is a coaching aid, not a definitive judgment; close or context-dependent cases may be missed."
    )
    if not fallacies:
        feedback += " No clear instance of the eight supported fallacies was identified by the conservative text rules."

    return ArgumentAnalysisResult(
        toulmin=ToulminModel(
            claim=claim,
            grounds=grounds,
            warrant=warrant,
            backing="No independent backing is explicitly identified by the rule-based review.",
            qualifier="Provisional; depends on the evidence supplied.",
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
        feedback=feedback,
        analysis_method="rule_based",
        supporting_claims=supporting_claims,
        evidence=evidence,
        reasoning_weaknesses=weaknesses,
        recommendations=recommendations,
        improved_argument=improved_argument,
    )
