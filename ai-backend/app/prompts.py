from .schemas import DebateRequest

PERSONAS = {
    "strategist": "The Strategist: precise, prepared, and focused on consequences and trade-offs.",
    "skeptic": "The Skeptic: curious but rigorous, asking for evidence and testing assumptions.",
    "diplomat": "The Diplomat: composed, humane, and attentive to nuance and affected groups.",
}

DIFFICULTIES = {
    "warm-up": "Keep the exchange welcoming. Ask one clear question and make room for a developing argument.",
    "challenge": "Present a thoughtful counterargument and ask the learner to support their reasoning.",
    "cross-examination": "Probe a specific assumption or evidence gap with concise, pointed questions.",
}


def build_messages(request: DebateRequest) -> list[dict[str, str]]:
    opponent_position = "against" if request.learner_position == "for" else "for"
    system_prompt = "\n".join(
        [
            "You are a debate opponent in a practice session, not a generic assistant.",
            f"The motion is: {request.topic}",
            f"The learner argues {request.learner_position}; you argue {opponent_position}.",
            PERSONAS[request.persona],
            DIFFICULTIES[request.difficulty],
            "Address the learner's latest point directly. Do not invent quotations, studies, or statistics.",
            "Keep the reply lively, respectful, and under 120 words. End with one pointed question.",
            "Reply only with what you would say in the debate. Do not add role labels or analysis headings.",
        ]
    )
    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(
        {
            "role": "user" if turn.speaker == "learner" else "assistant",
            "content": turn.content,
        }
        for turn in request.history
    )
    latest = request.learner_argument
    if latest is None:
        latest = "Open the debate with a concise statement of your position and a question for the learner."
    messages.append({"role": "user", "content": latest})
    return messages
