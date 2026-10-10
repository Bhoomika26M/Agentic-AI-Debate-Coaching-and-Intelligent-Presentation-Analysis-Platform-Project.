from datetime import UTC, datetime
import logging

from pymongo.database import Database

from app.services.llm_service import LLMUnavailableError, llm_enabled
from app.services.llm_simulation import simulate_with_llm

logger = logging.getLogger(__name__)

def _topic_seed(topic: str) -> tuple[str, str, str]:
    normalized = (topic or "AI in education").strip().lower()
    if "ai" in normalized:
        return (
            "AI should be integrated into classrooms to personalize learning and support teachers.",
            "AI can improve accessibility, immediate feedback, and adaptive instruction.",
            "Teachers still guide ethics, context, and critical thinking.",
        )
    if "climate" in normalized or "environment" in normalized:
        return (
            "Policy should prioritize long-term environmental protection over short-term economic convenience.",
            "The cost of inaction is greater than the cost of reform.",
            "A sustainable transition creates secure jobs and healthier communities.",
        )
    return (
        "The proposed policy creates better long-term outcomes than the status quo.",
        "It offers measurable gains, reduces uncertainty, and supports future growth.",
        "A stronger structure and clearer accountability create better results for everyone.",
    )


def build_simulation(topic: str, position: str, prompt: str | None = None) -> dict:
    normalized_position = (position or "FOR").upper()
    if normalized_position not in {"FOR", "AGAINST", "NEUTRAL"}:
        normalized_position = "FOR"
    opponent_position = "AGAINST" if normalized_position == "FOR" else "FOR"
    if llm_enabled():
        try:
            result = simulate_with_llm(topic, normalized_position, prompt)
            return {
                "topic": topic or "General debate topic",
                "position": normalized_position,
                "opponent_position": opponent_position,
                "prompt": prompt or f"Discuss the case for {topic or 'this policy'} from a {normalized_position.lower()} perspective.",
                **result,
            }
        except LLMUnavailableError as exc:
            logger.warning("OpenAI simulation unavailable; using local fallback: %s", exc)
    thesis, evidence, impact = _topic_seed(topic)
    if normalized_position == "AGAINST":
        thesis = "The proposed approach creates more risk than benefit and should be rejected."
        evidence = "The costs to trust, resources, and fairness outweigh the benefits of a rushed rollout."
        impact = "Avoiding unnecessary complexity protects long-term stability and accountability."
    if normalized_position == "NEUTRAL":
        thesis = "A balanced approach is needed, because both benefits and risks matter when evaluating the issue."
        evidence = "The best decision depends on implementation quality, evidence, and accountability."
        impact = "A measured strategy reduces risk without ignoring legitimate gains."

    opening_statement = (
        f"I support the motion that {thesis} "
        f"{evidence} {impact}"
    )
    prompt_text = prompt or f"Discuss the case for {topic or 'this policy'} from a {normalized_position.lower()} perspective."
    counterarguments = [
        "Focus on the strongest opposing evidence and explain why it does not override the core benefits.",
        "State a clear decision rule that separates short-term discomfort from long-term value.",
        "Name the assumptions behind the claim and show why they are realistic rather than speculative.",
    ]
    rebuttals = [
        "Acknowledge the risk, then show that mitigation is cheaper or more effective than inaction.",
        "Explain why the claim is not based on ideology but on measurable outcomes and accountability.",
    ]
    strengths = [
        "Clear thesis and prioritization of benefit over noise.",
        "Direct link between evidence, consequences, and decision-making.",
        "Practical framing that shows why the issue matters to real stakeholders.",
    ]
    weaknesses = [
        "Needs stronger examples to make abstract claims feel concrete.",
        "A brief acknowledgement of opposing risk can reduce perceived overconfidence.",
        "Additional evidence would make the claim more credible under scrutiny.",
    ]
    clarity = 84.0
    evidence_score = 79.0
    rebuttal_score = 82.0
    overall = round((clarity * 0.35) + (evidence_score * 0.35) + (rebuttal_score * 0.3), 2)
    return {
        "topic": topic or "General debate topic",
        "position": normalized_position,
        "opponent_position": opponent_position,
        "prompt": prompt_text,
        "opening_statement": opening_statement,
        "counterarguments": counterarguments,
        "rebuttals": rebuttals,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "score": {
            "clarity": clarity,
            "evidence": evidence_score,
            "rebuttal_strength": rebuttal_score,
            "overall": overall,
        },
    }


def save_simulation(db: Database, debate: dict, user: dict, payload: dict) -> dict:
    now = datetime.now(UTC)
    result = build_simulation(debate.get("topic", "General debate topic"), payload.get("position", "FOR"), payload.get("prompt"))
    existing = db.simulation_reports.find_one({"debate_id": debate["_id"]})
    report = {
        **result,
        "debate_id": debate["_id"],
        "generated_by": user["_id"],
        "created_at": existing.get("created_at", now) if existing else now,
        "updated_at": now,
    }
    attempt = {**report, "user_id": user["_id"]}
    attempt.pop("_id", None)
    db.simulation_attempts.insert_one(attempt)
    if existing:
        db.simulation_reports.replace_one({"_id": existing["_id"]}, report)
        report["_id"] = existing["_id"]
    else:
        report["_id"] = db.simulation_reports.insert_one(report).inserted_id
    db.skills.update_one(
        {"user_id": user["_id"]},
        {
            "$max": {
                "communication_score": round(result["score"]["clarity"]),
                "critical_thinking_score": round(result["score"]["evidence"]),
                "debate_score": round(result["score"]["overall"]),
            },
            "$set": {"updated_at": now},
            "$setOnInsert": {
                "presentation_score": 0,
                "created_at": now,
            },
        },
        upsert=True,
    )
    return report


def public_simulation(report: dict) -> dict:
    result = dict(report)
    result["id"] = str(result.pop("_id"))
    result["debate_id"] = str(result["debate_id"])
    result["generated_by"] = str(result["generated_by"])
    return result
