import logging
import re

from langgraph.graph import END, StateGraph

from ..schemas import JudgeDimension, JudgeVerdict
from .state import JudgeState

logger = logging.getLogger(__name__)
WEIGHTS = {"argument": 30, "evidence": 20, "logical": 20, "rebuttal": 15, "communication": 15}
STOPWORDS = frozenset(
    """
    about above after again against all also am an and any are as at be because been before
    being below between both but by can cannot could did do does doing down during each few
    for from further had has have having he her here hers herself him himself his how i if in
    into is it its itself just me more most my myself no nor not now of off on once only or
    other our ours ourselves out over own same she should so some such than that the their
    theirs them themselves then there these they this those through to too under until up very
    was we were what when where which while who whom why will with would you your yours
    yourself yourselves
    """.split()
)
WORD_RE = re.compile(r"[A-Za-z']+")


def _ratings(state: JudgeState) -> dict:
    return (state.get("report") or {}).get("ratings", {})


def _score(ratings: dict, key: str) -> tuple[int, str]:
    entry = ratings.get(key, {})
    return int(entry.get("score", 3)), str(entry.get("note", ""))


def _content_words(text: str) -> set[str]:
    return {
        word.lower().strip("'")
        for word in WORD_RE.findall(text)
        if len(word) > 2 and word.lower() not in STOPWORDS
    }


def _clip(text: str, limit: int = 70) -> str:
    clean = " ".join(str(text).split())
    return clean if len(clean) <= limit else clean[: limit - 1].rstrip() + "…"


def _exchanges(turns: list[dict]) -> list[tuple[dict, dict, int]]:
    """Each learner turn paired with the opponent turn it answers, and its turn number.

    The number is 1-based across the learner's own turns, so the opening case can
    be told apart from a later reply. A learner turn with no preceding opponent
    turn has nothing to answer and is not a pair at all.
    """
    pairs: list[tuple[dict, dict, int]] = []
    prompt: dict | None = None
    learner_turns = 0
    for turn in turns:
        if turn.get("speaker") == "opponent":
            prompt = turn
        elif turn.get("speaker") == "learner":
            learner_turns += 1
            if prompt is not None:
                pairs.append((prompt, turn, learner_turns))
                prompt = None
    return pairs


def _rebuttal_reading(turns: list[dict], fallacies: list[dict]) -> dict | None:
    """Deterministic read of how the learner answered the opponent.

    Rebuttal quality is judged from what the learner actually said back: whether
    each reply takes up the opponent's own terms, whether it is developed enough
    to be an answer, and whether the reply itself contains a flagged fallacy.
    Nothing here depends on the AI-written counterpoints.
    """
    pairs = _exchanges(turns)
    # A challenge reply is always a rebuttal. Without one, only turns after the
    # learner's opening case count: an opening is a case, not a rebuttal.
    challenges = [pair for pair in pairs if pair[0].get("kind") == "challenge"]
    pairs = challenges or [pair for pair in pairs if pair[2] > 1]
    if not pairs:
        return None
    answered = 0
    developed = 0
    contaminated = 0
    citations: list[str] = []
    questions = 0
    for prompt, reply, _turn_number in pairs:
        prompt_words = _content_words(prompt.get("content", ""))
        reply_text = reply.get("content", "")
        reply_words = _content_words(reply_text)
        shared = prompt_words & reply_words
        direct = len(shared) >= 2
        if prompt.get("kind") == "challenge":
            questions += 1
        if direct:
            answered += 1
        if len(reply_text.split()) >= 15:
            developed += 1
        lowered = reply_text.lower()
        quoted = [
            f
            for f in fallacies
            if str(f.get("quote", "")).strip() and str(f.get("quote", "")).lower() in lowered
        ]
        if quoted:
            contaminated += 1
        if direct and len(citations) < 2:
            citations.append(f"{_clip(reply_text)} — takes up the opponent's own terms")
        elif not direct and len(citations) < 2 and prompt.get("kind") == "challenge":
            citations.append(f"{_clip(reply_text)} — moves away from the follow-up")
    total = len(pairs)
    answer_rate = answered / total
    development = developed / total
    contamination = contaminated / total
    score = round(min(5.0, 1 + 2.5 * answer_rate + development + 0.5 * (1 - contamination)), 1)
    subject = "follow-ups" if questions else "opponent points"
    met = answered
    if score >= 4:
        note = f"You met {met} of {total} {subject} head-on with a developed answer."
    elif score >= 2.5:
        note = (
            f"You answered {met} of {total} {subject} directly. Quote the question, "
            "then answer it in one sentence before adding a new claim."
        )
    else:
        note = (
            f"Only {met} of {total} {subject} were answered on their own terms. "
            "Restate the objection, then reply to it before making a new point."
        )
    return {
        "score": score,
        "note": note,
        "citations": citations,
        "answered": answered,
        "total": total,
    }


def argument_node(state: JudgeState) -> JudgeState:
    ratings = _ratings(state)
    parts = [(k, *_score(ratings, k)) for k in ("clarity", "relevance", "persuasiveness")]
    score = round(sum(p[1] for p in parts) / len(parts), 1)
    weakest = min(parts, key=lambda p: p[1])
    return {"dimensions": [{
        "key": "argument",
        "weight_pct": WEIGHTS["argument"],
        "score": score,
        "note": (
            f"Strongest: {max(parts, key=lambda p: p[1])[0]}. "
            f"Work on: {weakest[0]} — {weakest[2] or 'tighten the wording.'}"
        ),
        "citations": [],
    }]}


def evidence_logic_node(state: JudgeState) -> JudgeState:
    ratings = _ratings(state)
    evidence, evidence_note = _score(ratings, "evidence_strength")
    logic, logic_note = _score(ratings, "logical_consistency")
    fallacies = (state.get("report") or {}).get("fallacies", [])
    cites = [
        f"\u201c{f.get('quote', '')}\u201d flagged as {f.get('label', 'a fallacy')}"
        for f in fallacies[:2]
    ]
    return {"dimensions": [
        {
            "key": "evidence",
            "weight_pct": WEIGHTS["evidence"],
            "score": float(evidence),
            "note": evidence_note or "Cite one source per claim.",
            "citations": [],
        },
        {
            "key": "logical",
            "weight_pct": WEIGHTS["logical"],
            "score": float(logic),
            "note": logic_note or "Check each claim against its evidence.",
            "citations": cites,
        },
    ]}


def rebuttal_comm_node(state: JudgeState) -> JudgeState:
    report = state.get("report") or {}
    dims: list[dict] = []
    reading = _rebuttal_reading(state.get("turns") or [], report.get("fallacies", []))
    if reading:
        dims.append({
            "key": "rebuttal",
            "weight_pct": WEIGHTS["rebuttal"],
            "score": reading["score"],
            "note": reading["note"],
            "citations": reading["citations"],
        })
    delivery = state.get("delivery") or {}
    comm = ((delivery.get("report") or {}).get("communication_score"))
    if isinstance(comm, (int, float)):
        dims.append({
            "key": "communication",
            "weight_pct": WEIGHTS["communication"],
            "score": float(comm),
            "note": "Delivery reviewed from your closing take.",
            "citations": [
                f"{d.get('pattern', '?')} at {d.get('start', 0):.0f}s: {d.get('what_happened', '')}"
                for d in (delivery.get("report") or {}).get("drills", [])[:2]
            ],
        })
    return {"dimensions": dims}


def _renormalize(dims: list[dict]) -> list[dict]:
    """Rescale the weights of the scored dimensions so they add up to 100.

    Largest-remainder rounding keeps integer percentages that sum exactly to 100
    and stays deterministic when a dimension is missing.
    """
    total = sum(d["weight_pct"] for d in dims)
    if total <= 0 or total == 100:
        return dims
    exact = [d["weight_pct"] * 100 / total for d in dims]
    floors = [int(value) for value in exact]
    remainder = 100 - sum(floors)
    order = sorted(range(len(dims)), key=lambda i: (-(exact[i] - floors[i]), i))
    for index in order[:remainder]:
        floors[index] += 1
    for dim, weight in zip(dims, floors, strict=True):
        dim["weight_pct"] = weight
    return dims


def _clip_note(note: str, limit: int = 280) -> str:
    note = " ".join(str(note).split())
    return note if len(note) <= limit else note[: limit - 1].rstrip() + "…"


def merge_node(state: JudgeState) -> JudgeState:
    dims = sorted(state.get("dimensions", []), key=lambda d: list(WEIGHTS).index(d["key"]))
    gaps = list(state.get("gaps", []))
    if not dims:
        return {"verdict": None, "gaps": gaps or ["no scored dimensions"]}
    for d in dims:
        # Rating notes arrive verbatim from the analysis model and can exceed
        # the display cap, so clip before schema validation.
        d["note"] = _clip_note(d.get("note") or "Scored from this rehearsal.")
    missing = [key for key in WEIGHTS if key not in {d["key"] for d in dims}]
    if missing:
        gaps.insert(
            0,
            f"{' and '.join(missing)} not scored — the remaining weights were "
            "renormalized to 100%.",
        )
    dims = _renormalize(dims)
    validated = [JudgeDimension.model_validate(d).model_dump() for d in dims]
    overall = round(sum(d["score"] * d["weight_pct"] for d in validated) / 100, 1)
    verdict = JudgeVerdict(overall=overall, dimensions=validated, gaps=gaps[:3])
    return {"verdict": verdict.model_dump(), "gaps": verdict.gaps}


def build_judge_graph():
    graph = StateGraph(JudgeState)
    graph.add_node("scatter", lambda s: {})
    graph.add_node("argument", argument_node)
    graph.add_node("evidence_logic", evidence_logic_node)
    graph.add_node("rebuttal_comm", rebuttal_comm_node)
    graph.add_node("merge", merge_node)
    graph.set_entry_point("scatter")
    for branch in ("argument", "evidence_logic", "rebuttal_comm"):
        graph.add_edge("scatter", branch)
        graph.add_edge(branch, "merge")
    graph.add_edge("merge", END)
    return graph.compile()


judge_graph = build_judge_graph()


async def judge_with_graph(
    report: dict,
    delivery: dict | None = None,
    turns: list[dict] | None = None,
) -> tuple[dict | None, list[str]]:
    out = await judge_graph.ainvoke(
        {"report": report, "delivery": delivery or {}, "turns": turns or []}
    )
    verdict = out.get("verdict")
    if verdict:
        return verdict, out.get("gaps", [])
    return None, out.get("gaps", ["no scored dimensions"])
