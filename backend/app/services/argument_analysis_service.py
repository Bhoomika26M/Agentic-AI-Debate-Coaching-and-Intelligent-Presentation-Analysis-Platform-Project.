import json
import re
from typing import Any

from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.models.argument_analysis import ArgumentAnalysis
from app.schemas.argument_analysis import ArgumentAnalysisInput, ArgumentAnalysisResult
from app.services.llm_service import LLMAnalysisError, llm_service


FALLACY_HINTS = {
    "Ad Hominem": ["idiot", "stupid", "crazy", "incompetent", "weak", "clown", "corrupt"],
    "Straw Man": ["they want to ban everything", "they want to destroy", "you just want to"],
    "False Dilemma": ["either we", "only two choices", "if you are not with us you are against us", "you must choose"],
    "Slippery Slope": ["if we allow", "then they will", "before long", "it will lead to"],
    "Appeal to Authority": ["according to the expert", "a professor says", "a doctor says", "my teacher said", "research says"],
    "Circular Reasoning": ["because it is true", "because it is good", "it is the best because it is best"],
    "Hasty Generalization": ["everyone", "always", "never", "nobody", "all", "everybody"],
    "Red Herring": ["by the way", "also, consider", "not to mention", "let us talk about something else"],
}


def _clean_text(value: str) -> str:
    return value.strip()


def validate_argument_input(payload: ArgumentAnalysisInput) -> ArgumentAnalysisInput:
    cleaned = ArgumentAnalysisInput.model_validate(payload.model_dump())
    if len(cleaned.argument_text.strip()) < 20:
        raise ValueError("Argument text must be at least 20 characters long.")
    if len(cleaned.topic.strip()) < 3:
        raise ValueError("Topic must contain at least 3 characters.")
    return cleaned


def detect_fallacies(argument_text: str) -> list[dict[str, Any]]:
    lowered = argument_text.lower()
    findings: list[dict[str, Any]] = []
    for name, hints in FALLACY_HINTS.items():
        match = any(hint in lowered for hint in hints)
        if not match:
            continue
        excerpt = argument_text[:180] if len(argument_text) > 180 else argument_text
        if name == "Ad Hominem":
            explanation = "The argument attacks the person rather than the claim itself."
            suggestion = "Keep the focus on the evidence and reasoning instead of insulting the speaker or opponent."
        elif name == "Straw Man":
            explanation = "The argument misrepresents the opposing view in a stronger or weaker form than it actually takes."
            suggestion = "State the opposing position accurately before responding to it."
        elif name == "False Dilemma":
            explanation = "The reasoning presents only two options when additional possibilities may exist."
            suggestion = "Describe the range of available options and explain why the alternatives are less convincing."
        elif name == "Slippery Slope":
            explanation = "The argument assumes one action will automatically trigger a chain of negative outcomes without evidence."
            suggestion = "Explain the exact causal pathway and provide evidence for each step."
        elif name == "Appeal to Authority":
            explanation = "The argument relies mainly on authority figures or sources rather than the quality of the supporting evidence."
            suggestion = "Explain why the cited authority is relevant and what evidence supports the claim beyond the authority alone."
        elif name == "Circular Reasoning":
            explanation = "The claim appears to be supported by itself instead of by independent evidence."
            suggestion = "Use different evidence or reasoning steps for the conclusion and the support."
        elif name == "Hasty Generalization":
            explanation = "The argument uses broad language that extends a limited example to a broad conclusion."
            suggestion = "Limit the claim to the evidence provided or add more examples and qualifiers."
        else:
            explanation = "The reasoning appears to divert attention away from the central claim and toward a different issue."
            suggestion = "Return to the main topic and show how the new point connects to the original conclusion."
        findings.append({
            "name": name,
            "excerpt": excerpt,
            "explanation": explanation,
            "confidence": 65,
            "suggestion": suggestion,
        })
    return findings


def _build_analysis_scores(argument_text: str, fallacies: list[dict[str, Any]]) -> list[dict[str, Any]]:
    evidence_markers = sum(1 for token in ["for example", "such as", "according to", "data", "study", "research", "survey", "evidence", "because"] if token in argument_text.lower())
    clarity = min(100, max(35, 55 + min(len(argument_text) // 22, 30) + (5 if len(argument_text.split()) > 20 else 0)))
    relevance = min(100, max(40, 60 + evidence_markers * 6))
    evidence_strength = min(100, max(25, 30 + evidence_markers * 10))
    logical_consistency = max(20, 85 - len(fallacies) * 12)
    persuasiveness = min(100, max(35, 48 + (5 if evidence_markers else 0) + (12 if len(argument_text.split()) > 30 else 0) - len(fallacies) * 8))
    criteria = [
        {"criterion": "clarity", "score": int(round(clarity)), "explanation": "The argument is readable and relatively easy to follow when the claim and examples are clearly stated."},
        {"criterion": "relevance", "score": int(round(relevance)), "explanation": "The points in the text stay on topic and support the central argument without drifting too far away."},
        {"criterion": "evidence_strength", "score": int(round(evidence_strength)), "explanation": "The argument includes some evidence markers, but the strength depends on whether the support is specific and directly tied to the claim."},
        {"criterion": "logical_consistency", "score": int(round(logical_consistency)), "explanation": "The reasoning appears generally coherent, though some potential fallacies or unsupported jumps may reduce confidence."},
        {"criterion": "persuasiveness", "score": int(round(persuasiveness)), "explanation": "The argument has a fair persuasive structure, but it can be made stronger by adding clearer evidence and stronger causal logic."},
    ]
    return criteria


def _extract_main_claim(argument_text: str, position: str | None) -> str:
    sentences = re.split(r"(?<=[.!?])\s+", argument_text.strip())
    if not sentences:
        return "The argument presents a position without a clearly separated conclusion."
    first_sentence = sentences[0].strip()
    if position:
        return f"The speaker is {position} and argues that {first_sentence}"
    return first_sentence


def _build_reasoning(argument_text: str, fallacies: list[dict[str, Any]]) -> dict[str, Any]:
    lowered = argument_text.lower()
    relationship = "The reasoning ties the conclusion to examples or evidence in the text, but the connection is stronger when each example directly supports the claim."
    if "because" in lowered or "therefore" in lowered or "this means" in lowered:
        relationship = "The argument connects its conclusion to supporting reasons and examples, which helps readers follow the logic."
    gaps = []
    if "for example" not in lowered and "such as" not in lowered and "data" not in lowered:
        gaps.append("The argument would be stronger with more explicit examples or evidence.")
    if not fallacies:
        logical_consistency = "The reasoning is mostly coherent and avoids obvious contradictions in the text provided."
    else:
        logical_consistency = "The reasoning contains a few possible weaknesses that may reduce confidence in the conclusion."
    unsupported_assumptions = []
    if "everyone" in lowered or "always" in lowered:
        unsupported_assumptions.append("The argument may rely on broad assumptions that need clearer evidence or qualifiers.")
    contradictions = []
    if "but" in lowered and "however" in lowered:
        contradictions.append("The text contains a contrastive turn that may weaken the apparent certainty of the claim.")
    suggestions = [
        "State the main claim in one clear sentence before the supporting points.",
        "Tie each example directly to the conclusion it supports.",
        "Replace unsupported generalizations with precise evidence or qualifications.",
    ]
    return {
        "relationship": relationship,
        "logical_consistency": logical_consistency,
        "gaps": gaps,
        "unsupported_assumptions": unsupported_assumptions,
        "contradictions": contradictions,
        "suggestions": suggestions,
    }


def _build_improvement_suggestions(argument_text: str, fallacies: list[dict[str, Any]]) -> list[str]:
    suggestions = [
        "Add one or two concrete examples that directly support the conclusion.",
        "Explain why the evidence matters and how it changes the reader's view.",
        "Avoid broad claims such as 'everyone' or 'always' unless they are clearly supported.",
    ]
    if fallacies:
        suggestions.append("Address the identified fallacy by explaining the claim more carefully and narrowing the conclusion to the evidence provided.")
    return suggestions[:4]


def _build_feedback_report(topic: str, argument_text: str, scores: list[dict[str, Any]], fallacies: list[dict[str, Any]], suggestions: list[str]) -> str:
    score_text = ", ".join(f"{entry['criterion']}: {entry['score']}/100" for entry in scores)
    if fallacies:
        detected = "; ".join(f["name"] for f in fallacies)
        return (
            f"For the topic '{topic}', the argument presents a workable case but could be stronger. "
            f"Overall scoring: {score_text}. Detected concerns: {detected}. "
            f"Recommendation: {suggestions[0]}"
        )
    return (
        f"For the topic '{topic}', the argument is generally coherent and grounded in the text provided. "
        f"Overall scoring: {score_text}. The strongest next step is to deepen the evidence section and make the supporting links more explicit."
    )


def _normalize_result(result: dict[str, Any]) -> dict[str, Any]:
    normalized = ArgumentAnalysisResult.model_validate(result)
    return normalized.model_dump()


def _fallback_analysis(topic: str, argument_text: str, position: str | None) -> dict[str, Any]:
    fallacies = detect_fallacies(argument_text)
    scores = _build_analysis_scores(argument_text, fallacies)
    overall_score = round(sum(item["score"] for item in scores) / len(scores), 2)
    main_claim = _extract_main_claim(argument_text, position)
    claims = [{"claim_type": "main", "text": main_claim, "position": position}] 
    sentences = [sentence.strip() for sentence in re.split(r"(?<=[.!?])\s+", argument_text.strip()) if sentence.strip()]
    for sentence in sentences[1:4]:
        claims.append({"claim_type": "supporting", "text": sentence, "position": position})
    evidence = []
    for sentence in sentences:
        lower = sentence.lower()
        if any(token in lower for token in ["for example", "such as", "according to", "data", "study", "research", "survey", "evidence", "because"]):
            evidence.append({
                "evidence_text": sentence,
                "supports_claim": main_claim,
                "relevance": 72,
                "strength": 68,
                "explicitly_present": True,
                "notes": "This sentence contains evidence or example language that can be used to support the claim.",
            })
    if not evidence:
        evidence = [{
            "evidence_text": argument_text[:300],
            "supports_claim": main_claim,
            "relevance": 45,
            "strength": 35,
            "explicitly_present": True,
            "notes": "No distinct evidence markers were found in the text, so the support is limited to the argument as written.",
        }]
    reasoning = _build_reasoning(argument_text, fallacies)
    suggestion_list = _build_improvement_suggestions(argument_text, fallacies)
    result = {
        "overall_score": overall_score,
        "scores": scores,
        "claims": claims,
        "evidence": evidence,
        "reasoning": reasoning,
        "fallacies": fallacies,
        "feedback_report": _build_feedback_report(topic, argument_text, scores, fallacies, suggestion_list),
        "improvement_suggestions": suggestion_list,
    }
    return _normalize_result(result)


def generate_argument_analysis(topic: str, argument_text: str, position: str | None) -> dict[str, Any]:
    cleaned_topic = _clean_text(topic)
    cleaned_text = _clean_text(argument_text)
    if not cleaned_topic or not cleaned_text:
        raise ValueError("Topic and argument text are required.")
    try:
        if llm_service.is_available():
            llm_result = llm_service.generate_analysis(cleaned_topic, cleaned_text, position)
            if llm_result:
                return _normalize_result(llm_result)
    except (LLMAnalysisError, ValidationError, Exception):
        pass
    return _fallback_analysis(cleaned_topic, cleaned_text, position)


def create_or_update_analysis_record(database: Session, *, user_id: int, topic: str, argument_text: str, position: str | None, debate_session_id: int | None = None, analysis_id: int | None = None) -> ArgumentAnalysis:
    analysis = database.get(ArgumentAnalysis, analysis_id) if analysis_id is not None else None
    if analysis is None:
        analysis = ArgumentAnalysis(user_id=user_id, debate_session_id=debate_session_id, topic=topic, argument_text=argument_text, position=position)
        database.add(analysis)
    else:
        analysis.topic = topic
        analysis.argument_text = argument_text
        analysis.position = position
        analysis.debate_session_id = debate_session_id

    payload = generate_argument_analysis(topic, argument_text, position)
    analysis.status = "completed"
    analysis.overall_score = payload["overall_score"]
    analysis.claims = payload.get("claims", [])
    analysis.evidence = payload.get("evidence", [])
    analysis.reasoning_assessment = payload.get("reasoning", {})
    analysis.detected_fallacies = payload.get("fallacies", [])
    analysis.scores = payload.get("scores", [])
    analysis.improvement_suggestions = payload.get("improvement_suggestions", [])
    analysis.feedback_report = payload.get("feedback_report")
    database.commit()
    database.refresh(analysis)
    return analysis
