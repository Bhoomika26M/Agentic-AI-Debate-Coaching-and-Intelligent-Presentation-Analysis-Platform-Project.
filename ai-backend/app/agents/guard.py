"""A coarse routing signal for turns that are not debate.

The patterns are deliberately narrow: this is not an injection defence. Hard
patterns are unambiguous requests for code, essays, or prompt exfiltration and
always redirect. Soft patterns are ambiguous meta requests, so they only
redirect when the turn does not look like debate at all. Anything an opponent
can answer as debate should reach the model, even when it happens to contain
words that also appear in an attack.
"""

import re
from dataclasses import dataclass
from typing import Literal

from .markup import strip_markers

Route = Literal["respond", "redirect"]
GuardKind = Literal["clean", "hard", "soft"]


@dataclass(frozen=True)
class GuardDecision:
    """Why a turn was routed the way it was, for logs and turn diagnostics."""

    route: Route
    kind: GuardKind
    pattern: str | None = None
    overridden: bool = False


# A real code request is never debate. These stay exact so prose cannot trip them.
_HARD = [
    ("code_fence", re.compile(r"```")),
    # Python's import/from-import shape only. "From my perspective" is not code.
    (
        "python_import",
        re.compile(
            r"^\s*import\s+[a-z_][\w.]*(?:\s*,\s*[a-z_][\w.]*)*(?:\s+as\s+\w+)?\s*$",
            re.MULTILINE,
        ),
    ),
    (
        "python_from_import",
        re.compile(r"^\s*from\s+[\w.]+\s+import\b", re.MULTILINE),
    ),
    ("python_definition", re.compile(r"\bdef\s+\w+\s*\(")),
    (
        "code_generation",
        re.compile(
            # A request has to start like a request, so ordinary debate prose
            # such as "the report should show a function of the data" is not
            # treated as code. "Program" is deliberately absent from the object
            # list because it is also ordinary policy language ("a housing program").
            r"^\s*(?:please\s+)?(?:(?:can|could|would)\s+you\s+)?"
            r"(?:write|draft|generate|produce|create|build|implement|give|show|"
            r"provide|code)\s+(?:me\s+|us\s+)?(?:an?\s+)?"
            r"(?:[a-z0-9+#.'-]+\s+){0,3}(?:code|function|script|algorithm|snippet)\b",
            re.IGNORECASE,
        ),
    ),
    (
        "writing_generation",
        re.compile(
            r"^\s*(?:please\s+)?(?:write|draft|generate|produce)\s+(?:me\s+)?(?:an?\s+)?"
            r"(?:essay|poem|story|email|letter)\b",
            re.IGNORECASE,
        ),
    ),
    (
        "direct_writing_request",
        re.compile(
            r"\b(?:write|draft|generate)\s+me\s+(?:an?\s+)?"
            r"(?:code|function|program|script|essay|poem|story)\b",
            re.IGNORECASE,
        ),
    ),
    (
        "polite_writing_request",
        re.compile(
            r"^\s*(?:can|could|would)\s+you\s+(?:please\s+)?(?:write|draft|generate|produce)"
            r"\s+(?:me\s+)?(?:an?\s+)?(?:code|function|program|script|essay|poem|story)\b",
            re.IGNORECASE,
        ),
    ),
    (
        # The polite request, with the helpers people actually use: "Could you
        # help me write an essay?", "I'd like you to write a function", or
        # "Would you mind writing me a poem?". The object still has to be a
        # generated artefact, so "help me build a stronger case" is untouched.
        "assisted_generation_request",
        re.compile(
            r"^\s*(?:please\s+)?(?:"
            r"(?:can|could|would|will)\s+you\s+(?:please\s+)?(?:mind\s+)?"
            r"|i(?:'d|\s+would)?\s+(?:like|need|want)\s+"
            r"|help\s+me\s+"
            r")"
            r"(?:you\s+to\s+|me\s+to\s+|us\s+to\s+|to\s+)?"
            r"(?:some\s+|any\s+|a\s+bit\s+of\s+)?"
            r"(?:help\s+(?:me\s+)?(?:to\s+|with\s+|in\s+)?)?"
            r"(?:write|writing|draft|drafting|generate|generating|produce|producing|"
            r"create|creating|build|building|implement|implementing|code|make|making|"
            r"give|show|provide)\s+"
            r"(?:me\s+|us\s+|for\s+me\s+)?(?:an?\s+)?"
            r"(?:[a-z0-9+#.'-]+\s+){0,3}"
            r"(?:code|function|script|algorithm|snippet|essay|poem|story|email|letter|program)\b",
            re.IGNORECASE,
        ),
    ),
    (
        "leetcode_request",
        re.compile(r"\bsolve\b[^.!?\n]{0,40}\b(?:leetcode|2\s?sum)\b", re.IGNORECASE),
    ),
    (
        "prompt_exfiltration",
        re.compile(
            r"\b(?:reveal|show|print|repeat|tell|give|share|disclose|explain)\s+"
            r"(?:me\s+)?(?:your\s+(?:system\s+|hidden\s+|private\s+)?(?:prompt|instructions)|"
            r"the\s+(?:system\s+prompt|hidden\s+prompt))\b",
            re.IGNORECASE,
        ),
    ),
    (
        "prompt_exfiltration",
        re.compile(
            r"\b(?:reveal|show|print|repeat|tell|give|share|disclose|explain)\s+"
            r"(?:me\s+)?what\s+(?:your|the)\s+(?:system\s+|hidden\s+|private\s+)?"
            r"(?:prompt|instructions)\b",
            re.IGNORECASE,
        ),
    ),
    (
        "prompt_exfiltration",
        re.compile(
            r"\bwhat\s+(?:is|are)\s+your\s+(?:system\s+)?(?:prompt|instructions)\b",
            re.IGNORECASE,
        ),
    ),
    (
        "jailbreak_phrase",
        re.compile(
            r"\b(?:enable|activate|enter|turn\s+on|switch\s+(?:in)?to)\s+developer\s+mode\b"
            r"|\bdeveloper\s+mode\s+(?:enabled|on|activated)\b"
            r"|^\s*do\s+anything\s+now\b(?!\s*\?)"
            r"|\byou\s+are\s+now\s+(?:dan|do\s+anything\s+now)\b",
            re.IGNORECASE,
        ),
    ),
]

# Meta requests a debater might plausibly make in character. These are routed
# only when the turn has no debate evidence to speak of.
_SOFT = [
    (
        "instruction_override",
        re.compile(
            r"^\s*(?:please\s+)?(?:ignore|disregard|forget)\b[^.!?\n]{0,40}\b"
            r"(?:previous|prior|above|earlier|your|these|the)\b[^.!?\n]{0,20}\b"
            r"(?:instructions?|rules?|orders?|prompts?)\b",
            re.IGNORECASE,
        ),
    ),
    (
        "role_claim",
        re.compile(
            r"\byou\s+are\s+now\s+an?\s+(?:[\w-]+\s+){0,3}"
            r"(?:assistant|ai|programmer|coder)\b",
            re.IGNORECASE,
        ),
    ),
    ("authority_claim", re.compile(r"\bi\s*(?:am|'m)\s+the\s+admin\b", re.IGNORECASE)),
    (
        "solve_request",
        re.compile(
            r"^\s*(?:can|could|would)\s+you\s+(?:please\s+)?solve\b",
            re.IGNORECASE,
        ),
    ),
    (
        "translate_request",
        re.compile(r"\btranslate\s+(?:this|the following)\b", re.IGNORECASE),
    ),
]

_HARD_RES = _HARD
_SOFT_RES = _SOFT

# Vocabulary that marks a turn as part of the argument rather than a side request.
_DEBATE_TERMS = frozenset(
    {
        "argue",
        "argued",
        "argues",
        "arguing",
        "argument",
        "claim",
        "claimed",
        "claims",
        "concede",
        "concedes",
        "concession",
        "conclusion",
        "cross",
        "debate",
        "debates",
        "debating",
        "evidence",
        "examination",
        "motion",
        "motions",
        "objection",
        "objections",
        "opponent",
        "opponents",
        "opposing",
        "position",
        "premise",
        "premises",
        "rebut",
        "rebuttal",
        "rebuttals",
        "rebutted",
        "rebutting",
        "rebuts",
    }
)

_WORD = re.compile(r"[a-z][a-z'-]{2,}")
_STOPWORDS = frozenset(
    {
        "about",
        "after",
        "again",
        "against",
        "all",
        "also",
        "and",
        "any",
        "are",
        "because",
        "been",
        "before",
        "being",
        "between",
        "both",
        "but",
        "can",
        "could",
        "did",
        "does",
        "doing",
        "during",
        "each",
        "even",
        "every",
        "for",
        "from",
        "get",
        "got",
        "had",
        "has",
        "have",
        "her",
        "here",
        "his",
        "how",
        "however",
        "into",
        "its",
        "just",
        "like",
        "made",
        "make",
        "many",
        "may",
        "me",
        "might",
        "more",
        "most",
        "much",
        "must",
        "my",
        "not",
        "now",
        "off",
        "one",
        "only",
        "other",
        "our",
        "out",
        "over",
        "own",
        "per",
        "same",
        "say",
        "says",
        "said",
        "she",
        "should",
        "some",
        "still",
        "such",
        "than",
        "that",
        "the",
        "their",
        "them",
        "then",
        "there",
        "these",
        "they",
        "this",
        "those",
        "through",
        "two",
        "under",
        "until",
        "upon",
        "us",
        "use",
        "used",
        "using",
        "very",
        "via",
        "was",
        "way",
        "we",
        "well",
        "were",
        "what",
        "when",
        "where",
        "whether",
        "which",
        "while",
        "who",
        "why",
        "will",
        "with",
        "within",
        "without",
        "would",
        "you",
        "your",
        "yours",
    }
)


def _stem(word: str) -> str:
    """A light plural stem, enough to match "ban" with "bans" and "school" with "schools"."""
    if word.endswith("'s"):
        word = word[:-2]
    if word.endswith("ies") and len(word) > 4:
        return word[:-3] + "y"
    if word.endswith("es") and len(word) > 4:
        return word[:-2]
    if word.endswith("s") and not word.endswith("ss") and len(word) > 4:
        return word[:-1]
    return word


def _content_words(text: str | None) -> set[str]:
    if not text:
        return set()
    return {
        _stem(word)
        for word in _WORD.findall(text.lower())
        if word not in _STOPWORDS and len(word) >= 3
    }


def _looks_like_debate(
    turn: str,
    *,
    topic: str | None,
    history: list[dict] | None,
    pattern: str | None = None,
) -> bool:
    """A soft pattern is harmless when the turn is clearly arguing the motion."""
    words = _content_words(turn)
    if words & _DEBATE_TERMS:
        return True
    # "Translate this into plain English: you want to cut the budget" is a
    # challenge to restate a position, not a request for a translation service.
    if pattern == "translate_request" and re.search(
        r":\s*(?:you|your)\b", turn, re.IGNORECASE
    ):
        return True
    if topic and words & _content_words(topic):
        return True
    for prior in (history or [])[-6:]:
        prior_content = prior.get("content") if isinstance(prior, dict) else None
        if len(words & _content_words(prior_content)) >= 2:
            return True
    return False


def classify_turn(
    content: str | None,
    *,
    topic: str | None = None,
    history: list[dict] | None = None,
) -> GuardDecision:
    """Route a learner turn, returning the evidence behind the decision."""
    if not content or not content.strip():
        return GuardDecision("respond", "clean")

    for name, pattern in _HARD_RES:
        if pattern.search(content):
            return GuardDecision("redirect", "hard", name)

    for name, pattern in _SOFT_RES:
        if not pattern.search(content):
            continue
        if _looks_like_debate(
            content,
            topic=topic,
            history=history,
            pattern=name,
        ):
            return GuardDecision("respond", "soft", name, overridden=True)
        return GuardDecision("redirect", "soft", name)

    return GuardDecision("respond", "clean")


def route_turn(
    content: str | None,
    *,
    topic: str | None = None,
    history: list[dict] | None = None,
) -> Route:
    return classify_turn(content, topic=topic, history=history).route


def redirect_reply(topic: str) -> str:
    """A guard hit still gets a debate turn, not an assistant-style refusal."""
    clean = " ".join(strip_markers(topic).split()) or "the motion"
    return (
        f"Let's keep this on the motion: \"{clean}\". "
        "Put your strongest reason on the table. What is it?"
    )
