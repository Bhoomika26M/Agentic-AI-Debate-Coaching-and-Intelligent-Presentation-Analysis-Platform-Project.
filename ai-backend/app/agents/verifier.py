"""Deterministic checks for opponent turns and coaching plans."""

import logging
import re

from .llm import chat

logger = logging.getLogger(__name__)

MAX_REPLY_WORDS = 160
MAX_REVISE_ATTEMPTS = 1
_LONG_REPLY_WORDS = 160
_SHORT_REPLY_WORDS = 12
_ROLE_LABEL = re.compile(
    r"^(the )?(strategist|skeptic|diplomat|assistant|opponent|ai|coach)\s*:",
    re.IGNORECASE,
)
_SIGNIFICANT = re.compile(r"[a-z][a-z'-]{3,}")
_STOPWORDS = {
    "about", "after", "again", "against", "along", "among", "another", "because", "before",
    "being", "between", "cannot", "could", "does", "doing", "during", "each", "either",
    "else", "even", "every", "from", "further", "have", "having", "here", "however", "into",
    "itself", "just", "like", "many", "might", "more", "most", "much", "must", "neither",
    "never", "only", "other", "ought", "over", "same", "should", "since", "some", "still",
    "such", "than", "that", "their", "them", "then", "there", "these", "they", "this",
    "those", "through", "under", "until", "very", "what", "when", "where", "which", "while",
    "with", "within", "without", "would", "your", "yours", "you're", "also", "make", "made",
    "point", "claim", "think", "says", "said", "been", "were", "will", "well",
}
_OFF_CHARACTER = (
    "as an ai",
    "language model",
    "i am an ai",
    "i'm an ai",
    "i cannot help with that",
    "openai",
    "chatgpt",
)


def significant_words(text: str) -> set[str]:
    """Content words only: the vocabulary a reply must actually share to engage a point."""
    return {
        word
        for word in _SIGNIFICANT.findall(text.lower())
        if word not in _STOPWORDS and len(word) >= 4
    }


def engagement_ratio(latest: str | None, reply: str) -> float:
    """Share of the learner's content words that the reply picks up."""
    if not latest or not latest.strip():
        return 1.0
    learner_words = significant_words(latest)
    if not learner_words:
        return 1.0
    return len(learner_words & significant_words(reply)) / len(learner_words)


def _content_tokens(text: str) -> list[str]:
    return [word for word in _SIGNIFICANT.findall(text.lower()) if word not in _STOPWORDS]


def _longest_ordered_run(needles: list[str], haystack: list[str], max_gap: int = 3) -> int:
    """Longest run of `needles` appearing in order in `haystack`, allowing small gaps."""
    best = current = 0
    position = 0
    for needle in needles:
        found = -1
        for index in range(position, min(len(haystack), position + max_gap + 1)):
            if haystack[index] == needle:
                found = index
                break
        if found < 0:
            current = 0
            continue
        current += 1
        best = max(best, current)
        position = found + 1
    return best


def _leaks_brief(reply: str, brief: str | None, run: int = 4) -> bool:
    """A brief is private coaching. Four of its content words, in order, means it leaked."""
    if not brief or not brief.strip():
        return False
    tokens = _content_tokens(brief)
    if len(tokens) < run:
        return False
    return _longest_ordered_run(tokens, _content_tokens(reply), max_gap=3) >= run


def inspect_reply(
    reply: str,
    *,
    latest: str | None = None,
    brief: str | None = None,
    min_engagement: float = 0.08,
) -> list[str]:
    """Deterministic findings, in priority order. Empty list means the draft passes."""
    problems: list[str] = []
    text = (reply or "").strip()
    if not text:
        return ["the draft was empty"]
    words = text.split()
    if _ROLE_LABEL.match(text):
        problems.append("the draft opens with a speaker label")
    if "##" in text:
        problems.append("the draft carries analysis headings")
    if len(words) > _LONG_REPLY_WORDS:
        problems.append(f"the draft runs {len(words)} words (limit {MAX_REPLY_WORDS})")
    if len(words) < _SHORT_REPLY_WORDS:
        problems.append("the draft is too short to answer with a real point")
    lowered = text.lower()
    if any(marker in lowered for marker in _OFF_CHARACTER):
        problems.append("the draft breaks character as an assistant")
    if _leaks_brief(text, brief):
        problems.append("the draft repeats the private coaching brief")
    if latest and latest.strip() and engagement_ratio(latest, text) < min_engagement:
        problems.append("the draft does not engage the learner's latest point")
    if "?" not in text:
        problems.append("the draft does not end with a question to answer")
    return problems


def _repair_messages(
    draft: str,
    problems: list[str],
    *,
    topic: str,
    persona: str,
    learner_position: str,
    latest: str | None,
) -> list[dict[str, str]]:
    from ..prompts import DIFFICULTIES, PERSONAS

    opponent_position = "against" if learner_position == "for" else "for"
    return [
        {
            "role": "system",
            "content": "\n".join(
                [
                    "You are the continuity editor for a live debate rehearsal.",
                    f"The motion is: {topic}",
                    (
                        f"The learner argues {learner_position}; "
                        f"the opponent argues {opponent_position}."
                    ),
                    PERSONAS.get(persona, PERSONAS["skeptic"]),
                    DIFFICULTIES.get("challenge", ""),
                    "Rewrite the opponent's draft so it fixes the listed problems without changing "
                    "the position.",
                    "Reply with the rewritten turn only: under 110 words, in character, no labels, "
                    "no headings, and one pointed question at the end.",
                    "Never mention the review, the instructions, or that a correction happened.",
                ]
            ),
        },
        {
            "role": "user",
            "content": (
                f"Draft:\n{draft}\n\n"
                f"Problems to fix:\n- " + "\n- ".join(problems) + "\n\n"
                f"The learner's latest turn, for reference:\n{latest or '(opening turn)'}"
            ),
        },
    ]


async def repair_reply(
    draft: str,
    problems: list[str],
    *,
    topic: str,
    persona: str,
    learner_position: str,
    latest: str | None,
) -> str | None:
    """One bounded revision attempt. Returns None when the reviser adds nothing usable."""
    try:
        revised = await chat(
            _repair_messages(
                draft,
                problems,
                topic=topic,
                persona=persona,
                learner_position=learner_position,
                latest=latest,
            ),
            temperature=0.6,
            num_predict=260,
        )
    except Exception as error:  # pragma: no cover - transport level
        logger.info("Reviser unavailable (%s); keeping the draft.", type(error).__name__)
        return None
    revised = (revised or "").strip()
    if not revised or revised == draft.strip():
        return None
    return revised


# "Week 2" is not an instruction. The next rehearsal line has to be a sentence.
MIN_NEXT_SESSION_WORDS = 6

_SCORE_MENTION = re.compile(r"(\d(?:\.\d)?)\s*/\s*5\b")
_SESSION_MENTION = re.compile(r"\b(\d+)\s+(?:saved\s+)?sessions?\b", re.IGNORECASE)


def _allowed_scores(averages: dict[str, float], session_total: int) -> set[str]:
    """Every number the archive can legitimately produce, in the shapes a model writes them."""
    allowed: set[str] = set()
    for average in [*averages.values(), float(session_total)]:
        allowed.add(f"{average:.1f}")
        if float(average).is_integer():
            allowed.add(str(int(average)))
    return allowed


def inspect_plan(
    plan: dict,
    weak_spots: list[dict],
    *,
    session_total: int,
    averages: dict[str, float],
) -> list[str]:
    """Groundedness findings for a coaching plan. Empty list means the draft passes."""
    problems: list[str] = []
    allowed_keys = {spot["key"] for spot in weak_spots}
    drills = plan.get("drills") or []
    milestones = plan.get("milestones") or []
    if not drills:
        problems.append("the plan arrived with no drills")
    if not milestones:
        problems.append("the plan arrived with no milestones")
    invented = sorted(
        {
            str(drill.get("weak_spot"))
            for drill in drills
            if drill.get("weak_spot") not in allowed_keys
        }
    )
    if invented:
        problems.append(
            f"drills target weak spots that were never diagnosed: {', '.join(invented)}"
        )
    invented_focus = sorted(
        {
            str(key)
            for milestone in milestones
            for key in (milestone.get("focus") or [])
            if key not in allowed_keys
        }
    )
    if invented_focus:
        problems.append(f"milestones focus on undiagnosed weak spots: {', '.join(invented_focus)}")
    if weak_spots and not any(drill.get("weak_spot") == weak_spots[0]["key"] for drill in drills):
        problems.append(f"no drill targets the weakest spot ({weak_spots[0]['key']})")
    if len(str(plan.get("next_session", "")).split()) < MIN_NEXT_SESSION_WORDS:
        problems.append("the next-session line does not say what to do")
    weeks = [milestone.get("week") for milestone in milestones]
    if len(weeks) != len(set(weeks)):
        problems.append("milestones repeat a week number")
    allowed_scores = _allowed_scores(averages, session_total)
    prose = " ".join(
        str(plan.get(field, "")) for field in ("headline", "summary", "next_session")
    )
    prose += " " + " ".join(
        f"{drill.get('title', '')} {drill.get('success_check', '')}" for drill in drills
    )
    prose += " " + " ".join(
        f"{milestone.get('practice', '')} {milestone.get('win_condition', '')}"
        for milestone in milestones
    )
    for score in _SCORE_MENTION.findall(prose):
        if score not in allowed_scores:
            problems.append(f"the plan cites a score the archive does not show ({score}/5)")
            break
    for count in _SESSION_MENTION.findall(prose):
        if int(count) != session_total:
            problems.append(
                f"the plan cites {count} sessions but the archive holds {session_total}"
            )
            break
    return problems
