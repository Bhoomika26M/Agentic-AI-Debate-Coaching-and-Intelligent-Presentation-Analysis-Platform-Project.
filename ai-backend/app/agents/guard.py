import re
from typing import Literal

_INJECTION = [
    r"ignore (all )?(previous|prior|above|earlier) instructions",
    r"disregard (all )?(previous|prior|above|your|these|the) (instructions|rules|orders)",
    r"forget (all )?(your|these|the) (instructions|rules)",
    r"i am the admin",
    r"i'?m the admin",
    r"you are now an? (assistant|ai|friend|helper|expert|programmer|coder|teacher)",
    r"reveal (your )?instructions",
    "system prompt",
    r"do anything now",
    r"developer mode",
]

_OFF_MOTION = [
    "```",
    r"\bdef \w+\s*\(",
    r"\bimport \w+",
    r"\b2\s?sum\b",
    r"\bleetcode\b",
    r"write (me )?an? (code|function|program|script|essay|poem|story)",
    r"write (me )?(\w+ ){1,3}(code|function|program|script)\b",
    r"solve .* in python",
    r"answer .* trivia",
    r"translate .* to (french|spanish|german|hindi)",
]

_INJECTION_RES = [re.compile(p, re.IGNORECASE) for p in _INJECTION]
_OFF_MOTION_RES = [re.compile(p, re.IGNORECASE) for p in _OFF_MOTION]

Route = Literal["respond", "redirect"]


def route_turn(content: str | None) -> Route:
    if not content or not content.strip():
        return "respond"
    if any(r.search(content) for r in _INJECTION_RES):
        return "redirect"
    if any(r.search(content) for r in _OFF_MOTION_RES):
        return "redirect"
    return "respond"


def redirect_reply(topic: str) -> str:
    clean = " ".join(topic.split())
    return (
        f"I'm staying in character as your debate opponent on \"{clean}\", "
        "so I can't help with that. What's your strongest reason for your side?"
    )
