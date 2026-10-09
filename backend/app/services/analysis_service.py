"""Deterministic debate analysis.

This deliberately uses small, explainable lexical heuristics rather than an
LLM.  It provides a stable baseline that can be replaced by a richer analyzer
without changing the API contract.
"""

import re
from collections.abc import Iterable

from datetime import UTC, datetime

from bson import ObjectId
from pymongo.database import Database


_EVIDENCE = re.compile(r"\b(?:because|evidence|study|research|data|statistics?|according to|percent|%)\b", re.I)
_REASONING = re.compile(r"\b(?:therefore|thus|so|which means|this shows|consequently|as a result)\b", re.I)
_SPLIT = re.compile(r"(?<=[.!?])\s+")

_FALLACIES: tuple[tuple[str, str, str, str], ...] = (
    ("ad_hominem", r"\b(?:idiot|stupid|uneducated|ignorant|incompetent)\b", "attacks a person instead of their argument", "medium"),
    ("straw_man", r"\b(?:so you(?:'re| are) saying|you want to abolish|you want everyone to)\b", "appears to misrepresent an opposing position", "medium"),
    ("false_dilemma", r"\b(?:either .+ or|only two options|there is no other choice)\b", "presents a limited choice as if it were exhaustive", "medium"),
    ("appeal_to_authority", r"\b(?:an expert says|authority says|famous .+ says|because .+ said so)\b", "relies on authority without explaining the supporting evidence", "low"),
    ("circular_reasoning", r"\b(?:true because it is true|because .+ is true)\b", "uses the conclusion as its own support", "medium"),
    ("slippery_slope", r"\b(?:if we allow .+ then .+ will inevitably|this will lead to|next thing you know)\b", "assumes an inevitable chain of consequences", "medium"),
    ("hasty_generalization", r"\b(?:everyone|nobody|always|never|all .+ are)\b", "makes a broad claim from insufficiently specific support", "medium"),
    ("red_herring", r"\b(?:what about|that reminds me|the real issue is)\b", "may divert attention from the question under debate", "low"),
)


def _sentences(transcript: str) -> list[str]:
    return [sentence.strip() for sentence in _SPLIT.split(transcript.strip()) if sentence.strip()]


def _arguments(sentences: list[str]) -> list[dict]:
    arguments = []
    for sentence in sentences:
        evidence = [sentence] if _EVIDENCE.search(sentence) else []
        reasoning = sentence if _REASONING.search(sentence) else None
        claim = sentence.rstrip(".!?")
        quality = min(100.0, 40.0 + (25.0 if evidence else 0) + (25.0 if reasoning else 0) + (10.0 if len(sentence.split()) >= 8 else 0))
        arguments.append({"text": sentence, "claim": claim, "evidence": evidence, "reasoning": reasoning, "quality": quality})
    return arguments


def _find_fallacies(sentences: Iterable[str]) -> list[dict]:
    findings = []
    for sentence in sentences:
        for name, pattern, explanation, severity in _FALLACIES:
            if re.search(pattern, sentence, re.I):
                findings.append({"type": name, "text": sentence, "explanation": explanation, "severity": severity})
    return findings


def analyze_transcript(transcript: str) -> dict:
    sentences = _sentences(transcript)
    arguments = _arguments(sentences)
    fallacies = _find_fallacies(sentences)
    claim_quality = min(100.0, 45.0 + min(40.0, len(arguments) * 8.0))
    evidence_quality = min(100.0, 35.0 + sum(bool(item["evidence"]) for item in arguments) * 15.0)
    reasoning_quality = min(100.0, 35.0 + sum(bool(item["reasoning"]) for item in arguments) * 15.0)
    fallacy_control = max(0.0, 100.0 - len(fallacies) * 15.0)
    overall = round(claim_quality * 0.3 + evidence_quality * 0.25 + reasoning_quality * 0.3 + fallacy_control * 0.15, 2)
    counterarguments = [
        f"Ask what evidence supports: {arguments[0]['claim']}." if arguments else "State the central claim explicitly.",
        "Acknowledge the strongest opposing view and explain why your evidence still supports your position.",
    ]
    feedback = [
        "State one precise claim before adding supporting points.",
        "Connect each piece of evidence to the claim with an explicit reasoning step.",
    ]
    if fallacies:
        feedback.append("Replace detected fallacies with evidence that addresses the opposing argument directly.")
    return {
        "arguments": arguments,
        "fallacies": fallacies,
        "counterarguments": counterarguments,
        "scores": {"claim_quality": claim_quality, "evidence_quality": evidence_quality, "reasoning_quality": reasoning_quality, "fallacy_control": fallacy_control, "overall": overall},
        "feedback": feedback,
    }


def save_analysis(db: Database, debate: dict, user: dict, transcript: str) -> dict:
    now = datetime.now(UTC)
    result = analyze_transcript(transcript)
    existing = db.analysis_reports.find_one({"debate_id": debate["_id"]})
    report = {**result, "debate_id": debate["_id"], "generated_by": user["_id"], "created_at": existing.get("created_at", now) if existing else now, "updated_at": now}
    if existing:
        db.analysis_reports.replace_one({"_id": existing["_id"]}, report)
        report["_id"] = existing["_id"]
    else:
        report["_id"] = db.analysis_reports.insert_one(report).inserted_id
    return report


def public_analysis(report: dict) -> dict:
    result = dict(report)
    result["id"] = str(result.pop("_id"))
    result["debate_id"] = str(result["debate_id"])
    result["generated_by"] = str(result["generated_by"])
    return result
