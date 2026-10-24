"""A coarse routing signal for turns that are not debate.

The patterns are deliberately narrow: this is not an injection defence. It only
keeps obvious jailbreaks and clearly off-motion requests away from the model.
Anything an opponent can answer as debate should reach the model, even when it
happens to contain words that also appear in an attack.
"""

import re
from typing import Literal

from .markup import strip_markers

# Requests aimed at the assistant, not a phrase that merely appears in a case.
_INJECTION = [
    r"^\s*(please\s+)?(ignore|disregard|forget)\b[^.!?\n]{0,40}\b"
    r"(previous|prior|above|earlier|your|these|the)\b[^.!?\n]{0,20}\b"
    r"(instructions?|rules?|orders?|prompts?)\b",
    r"\byour\s+(system\s+prompt|instructions|rules)\b",
    r"\b(reveal|show|print|repeat)\s+(me\s+)?(your|the)\s+(system\s+)?(prompt|instructions)\b",
    r"\bi\s*(am|'m)\s+the\s+admin\b",
    r"\byou\s+are\s+now\s+an?\s+(assistant|ai|friend|helper|expert|programmer|coder|teacher)\b",
    r"\bdo\s+anything\s+now\b",
    r"\bdeveloper\s+mode\b",
]

_OFF_MOTION = [
    r"```",
    r"^\s*(please\s+)?(write|draft|generate|produce)\s+(me\s+)?(an?\s+)?"
    r"(code|function|program|script|essay|poem|story)\b",
    r"^\s*(can|could|would)\s+you\s+(please\s+)?(write|draft|generate|solve|translate)\b",
    r"\b(write|draft|generate)\s+(me\s+)?(an?\s+)?(code|function|program|script)\b",
    r"^\s*(import|from)\s+[a-z_][\w.]*",
    r"\bdef\s+\w+\s*\(",
    r"\bsolve\s+(this|the following)?\s*(leetcode|2\s?sum|problem)\b",
    r"\btranslate\s+(this|the following)\b",
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
    clean = " ".join(strip_markers(topic).split())
    return (
        f"I'm staying in character as your debate opponent on \"{clean}\", "
        "so I can't help with that. What's your strongest reason for your side?"
    )
