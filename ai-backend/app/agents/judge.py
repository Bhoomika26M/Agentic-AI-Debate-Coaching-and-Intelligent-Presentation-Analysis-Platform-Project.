import logging

from langgraph.graph import END, StateGraph

from ..schemas import JudgeDimension, JudgeVerdict
from .state import JudgeState

logger = logging.getLogger(__name__)
WEIGHTS = {"argument": 30, "evidence": 20, "logical": 20, "rebuttal": 15, "communication": 15}


def _ratings(state: JudgeState) -> dict:
    return (state.get("report") or {}).get("ratings", {})


def _score(ratings: dict, key: str) -> tuple[int, str]:
    entry = ratings.get(key, {})
    return int(entry.get("score", 3)), str(entry.get("note", ""))


def argument_node(state: JudgeState) -> JudgeState:
    ratings = _ratings(state)
    parts = [(k, *_score(ratings, k)) for k in ("clarity", "relevance", "persuasiveness")]
    score = round(sum(p[1] for p in parts) / len(parts), 1)
    weakest = min(parts, key=lambda p: p[1])
    return {"dimensions": [{
        "key": "argument",
        "weight_pct": WEIGHTS["argument"],
        "score": score,
        "note": f"Strongest: {max(parts, key=lambda p: p[1])[0]}. Work on: {weakest[0]} — {weakest[2] or 'tighten the wording.'}",
        "citations": [],
    }]}


def evidence_logic_node(state: JudgeState) -> JudgeState:
    ratings = _ratings(state)
    evidence, evidence_note = _score(ratings, "evidence_strength")
    logic, logic_note = _score(ratings, "logical_consistency")
    fallacies = (state.get("report") or {}).get("fallacies", [])
    cites = [f"\u201c{f.get('quote', '')}\u201d flagged as {f.get('label', 'a fallacy')}" for f in fallacies[:2]]
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
    fallacies = report.get("fallacies", [])
    counters = report.get("counterarguments", [])
    dims = []
    if counters:
        score = 5 - min(len(fallacies), 4)
        kinds = ", ".join(c.get("kind", "?") for c in counters)
        dims.append({
            "key": "rebuttal",
            "weight_pct": WEIGHTS["rebuttal"],
            "score": float(score),
            "note": f"Counters ready across: {kinds}." if score >= 4 else "Answer one counter each round before adding new claims.",
            "citations": [],
        })
    else:
        dims.append({
            "key": "rebuttal",
            "weight_pct": WEIGHTS["rebuttal"],
            "score": 3.0,
            "note": "Counterpoints missing — run a full review first.",
            "citations": [],
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
    else:
        dims.append({
            "key": "communication",
            "weight_pct": WEIGHTS["communication"],
            "score": 3.0,
            "note": "No delivery review yet — record a closing take to score this.",
            "citations": [],
        })
    return {"dimensions": dims}


def merge_node(state: JudgeState) -> JudgeState:
    dims = sorted(state.get("dimensions", []), key=lambda d: list(WEIGHTS).index(d["key"]))
    gaps = list(state.get("gaps", []))
    if not dims:
        return {"verdict": None, "gaps": gaps or ["no scored dimensions"]}
    validated = [JudgeDimension.model_validate(d).model_dump() for d in dims]
    overall = round(sum(d["score"] * d["weight_pct"] for d in validated) / 100, 1)
    for d in validated:
        if d["note"].startswith(("Counterpoints missing", "No delivery review")):
            gaps.append(f"{d['key']} scored neutral: {d['note']}")
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


async def judge_with_graph(report: dict, delivery: dict | None = None) -> tuple[dict | None, list[str]]:
    out = await judge_graph.ainvoke({"report": report, "delivery": delivery or {}})
    verdict = out.get("verdict")
    if verdict:
        return verdict, out.get("gaps", [])
    return None, out.get("gaps", ["no scored dimensions"])
