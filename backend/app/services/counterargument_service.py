import json
import re
from typing import Any

from app.schemas.counterargument import CounterargumentItem, CounterargumentRequest, CounterargumentResponse
from app.services.llm_service import LLMAnalysisError, _extract_json_payload, llm_service


COUNTERARGUMENT_TYPES = [
    "Logical Rebuttals",
    "Evidence-Based Rebuttals",
    "Ethical Counterarguments",
    "Practical Counterarguments",
    "Policy Counterarguments",
]


def _build_heuristic_counterarguments(topic: str, argument_text: str, position: str) -> CounterargumentResponse:
    opposing_stance = "against" if position == "for" else ("for" if position == "against" else "alternative")
    clean_text = argument_text.strip()
    first_sentence = re.split(r"[.!?]", clean_text)[0].strip() or clean_text[:80]

    items = [
        CounterargumentItem(
            type="Logical Rebuttals",
            claim=f"Assuming '{first_sentence}' automatically produces the intended outcome overlooks critical intervening factors.",
            rebuttal=(
                f"Correlation does not imply causation in '{topic}'. "
                "Competing variables and unstated assumptions weaken the logical link between the initial premise and conclusion."
            ),
            counterpoint=(
                "Alternative causal explanations show that the same results can be achieved without relying on this unproven assumption."
            ),
        ),
        CounterargumentItem(
            type="Evidence-Based Rebuttals",
            claim=f"The empirical support offered for '{topic}' lacks broad representativeness.",
            rebuttal=(
                "The argument draws on selective observations rather than comprehensive baseline data. "
                "Broader benchmark studies often show conflicting outcomes."
            ),
            counterpoint=(
                "Independent comparative data indicates that real-world outcomes vary widely depending on specific local conditions."
            ),
        ),
        CounterargumentItem(
            type="Ethical Counterarguments",
            claim=f"Focusing purely on the primary objective in '{topic}' creates disproportionate burdens for key stakeholders.",
            rebuttal=(
                "An ethical approach must balance overall benefits with fairness, transparency, and the rights of vulnerable groups."
            ),
            counterpoint=(
                "Principles of equity suggest that fundamental stakeholder protections should not be sacrificed for speculative aggregate gains."
            ),
        ),
        CounterargumentItem(
            type="Practical Counterarguments",
            claim=f"Operational constraints and resource limits make implementation in '{topic}' difficult to sustain.",
            rebuttal=(
                "Unanticipated overhead, budget limits, and logistical friction frequently hinder theoretical efficiency in practice."
            ),
            counterpoint=(
                "Focusing finite resources on lower-risk, targeted interventions consistently delivers more dependable real-world results."
            ),
        ),
        CounterargumentItem(
            type="Policy Counterarguments",
            claim=f"Enacting broad mandates around '{topic}' introduces regulatory friction and unintended side effects.",
            rebuttal=(
                "Sweeping policy interventions often create compliance burdens and perverse incentives that complicate the original problem."
            ),
            counterpoint=(
                "Flexible, targeted standards provide greater adaptability without incurring heavy compliance and enforcement overhead."
            ),
        ),
    ]

    perspectives = [
        f"A utilitarian perspective weighing systemic economic impacts across diverse communities in '{topic}'.",
        "A rights-based framework prioritizing individual agency, fairness, and transparent consent.",
        "A risk-mitigation viewpoint focused on building fallback safeguards and institutional resilience.",
    ]

    questions = [
        f"What measurable threshold would prove that the benefits of this proposal outweigh its hidden costs?",
        "How does this approach address the uneven distribution of burdens across affected groups?",
        "What specific safeguards prevent the most probable unintended side effects?",
    ]

    strategies = [
        "Acknowledge the positive intent of the opposing stance while demonstrating that its implementation mechanics are fragile.",
        "Highlight opportunity costs by demonstrating what valuable alternative approaches are foreclosed.",
        "Request concrete definitions and verifiable benchmarks for key assertions to uncover hidden ambiguities.",
    ]

    return CounterargumentResponse(
        topic=topic,
        counterarguments=items,
        alternative_perspectives=perspectives,
        challenge_questions=questions,
        debate_strategies=strategies,
    )


def generate_counterarguments(payload: CounterargumentRequest) -> CounterargumentResponse:
    if llm_service.is_available():
        system_prompt = (
            "You are a master collegiate debater and critical thinking coach. Given a debate topic, user argument, and position, "
            "generate five rigorous, concise counterarguments matching exactly these types:\n"
            "1. 'Logical Rebuttals'\n"
            "2. 'Evidence-Based Rebuttals'\n"
            "3. 'Ethical Counterarguments'\n"
            "4. 'Practical Counterarguments'\n"
            "5. 'Policy Counterarguments'\n"
            "Keep each item short, direct, and conversational (1-2 sentences, max 35 words each):\n"
            "- claim: 1 crisp sentence stating the core opposing point (max 25 words)\n"
            "- rebuttal: 1-2 concise sentences outlining the rebuttal strategy (max 35 words)\n"
            "- counterpoint: 1-2 spoken sentences providing a clear, natural example counterargument (max 35 words)\n"
            "Also return alternative_perspectives (list of 3 short viewpoints, max 20 words each), "
            "challenge_questions (list of 3 probing debate questions, max 20 words each), and "
            "debate_strategies (list of 3 actionable tactical debate tips, max 20 words each).\n"
            "Avoid repetition, academic filler, and invented statistics. Return valid JSON only."
        )
        user_prompt = json.dumps({
            "topic": payload.topic,
            "argument_text": payload.argument_text,
            "position": payload.position,
        })
        try:
            content = llm_service._request_chat_completion(system_prompt, user_prompt, response_json=True, max_output_tokens=1400)
            if content:
                data = _extract_json_payload(content)
                if "counterarguments" in data and len(data["counterarguments"]) >= 5:
                    return CounterargumentResponse.model_validate({
                        "topic": payload.topic,
                        "counterarguments": data["counterarguments"],
                        "alternative_perspectives": data.get("alternative_perspectives", []),
                        "challenge_questions": data.get("challenge_questions", []),
                        "debate_strategies": data.get("debate_strategies", []),
                    })
        except Exception:
            # Fall back safely to heuristic generation if LLM call fails
            pass

    return _build_heuristic_counterarguments(payload.topic, payload.argument_text, payload.position)
