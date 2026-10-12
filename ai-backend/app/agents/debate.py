"""The opponent turn: guard, memory, planner, draft, verifier, reviser, fallback."""

import logging
import re
from collections.abc import AsyncIterator

from langgraph.graph import END, StateGraph

from ..prompts import build_messages
from ..schemas import DebateRequest
from .guard import redirect_reply, route_turn
from .llm import chat, stream
from .memory import summarize_history
from .planner import plan_brief, pressure_hint
from .state import DebateState
from .verifier import MAX_REPLY_WORDS, inspect_reply, repair_reply

logger = logging.getLogger(__name__)

ReplyEvent = tuple[str, str]  # ("delta" | "replace", text)

_ROLE_LABEL = re.compile(
    r"^(the )?(strategist|skeptic|diplomat|assistant|opponent|ai|coach)\s*:", re.IGNORECASE
)


def guard_node(state: DebateState) -> DebateState:
    route = route_turn(state.get("latest"))
    return {"route": route}


def redirect_node(state: DebateState) -> DebateState:
    return {"reply": redirect_reply(state.get("topic", "")), "verified": True}


def memory_node(state: DebateState) -> DebateState:
    """Reduce stored digests into the opponent's private brief."""
    brief = summarize_history(state.get("memory", []))
    if brief:
        logger.info("Memory agent briefed the opponent from stored history.")
    return {"memory_brief": brief}


def _to_request(state: DebateState) -> DebateRequest:
    return DebateRequest(
        topic=state.get("topic", ""),
        learner_position=state.get("learner_position", "for"),  # type: ignore[arg-type]
        persona=state.get("persona", "skeptic"),  # type: ignore[arg-type]
        difficulty=state.get("difficulty", "challenge"),  # type: ignore[arg-type]
        history=[
            {"speaker": t["speaker"], "content": t["content"]}
            for t in state.get("history", [])
        ],
        learner_argument=state.get("latest"),
        preferences=state.get("preferences"),
    )


def check_reply(reply: str, topic: str) -> str | None:
    """Return only the first verification finding, or None."""
    problems = inspect_reply(reply)
    if problems:
        return problems[0]
    if len(reply.split()) > MAX_REPLY_WORDS:
        return "reply over length cap"
    return None


def _pressure_line(history: list[dict], latest: str | None) -> str | None:
    hint = pressure_hint(history, latest)
    if hint == "up":
        return "The learner is cruising: raise the pressure one notch toward cross-examination."
    if hint == "down":
        return "The learner is stalling: ease back toward a welcoming warm-up tone."
    return None


def _private_context(state: DebateState, history: list[dict]) -> str | None:
    """Context the opponent may use but must never quote."""
    parts: list[str] = []
    if state.get("brief"):
        parts.append(str(state["brief"]))
    summary = state.get("memory_brief")
    if summary:
        parts.append(f"Private history, never quote it. {summary}")
    pressure = _pressure_line(history, state.get("latest"))
    if pressure:
        parts.append(pressure)
    if not parts:
        return None
    joined = " ".join(parts)
    if not joined.startswith("Private"):
        joined = f"Private coaching brief, never quote it. {joined}"
    return joined


def _briefed_messages(state: DebateState, request: DebateRequest) -> list[dict[str, str]]:
    messages = build_messages(request)
    history = [
        {"speaker": t["speaker"], "content": t["content"]} for t in state.get("history", [])
    ]
    context = _private_context(state, history)
    if context:
        messages = messages + [{"role": "system", "content": context}]
    return messages


async def planner_node(state: DebateState) -> DebateState:
    history = [
        {"speaker": t["speaker"], "content": t["content"]} for t in state.get("history", [])
    ]
    brief = await plan_brief(
        history,
        state.get("latest"),
        state.get("topic", ""),
        state.get("persona", "skeptic"),
        memory_brief=state.get("memory_brief"),
    )
    if brief:
        logger.info("Planner briefed this turn.")
    return {"brief": brief}


async def draft_node(state: DebateState) -> DebateState:
    """Draft one in-persona turn, briefed by memory and planner."""
    request = _to_request(state)
    reply = await chat(_briefed_messages(state, request), temperature=0.75, num_predict=240)
    return {"draft": reply, "reply": reply}


async def verifier_node(state: DebateState) -> DebateState:
    draft = state.get("draft") or state.get("reply", "")
    problems = inspect_reply(draft, latest=state.get("latest"), brief=state.get("brief"))
    if problems:
        logger.info("Verifier flagged the turn (%s).", "; ".join(problems))
    return {"problems": problems}


def _after_verify(state: DebateState) -> str:
    if not state.get("problems"):
        return "accept"
    if state.get("revise_count", 0) >= 1:
        return "fallback"
    return "revise"


async def reviser_node(state: DebateState) -> DebateState:
    revised = await repair_reply(
        state.get("draft") or state.get("reply", ""),
        list(state.get("problems", [])),
        topic=state.get("topic", ""),
        persona=state.get("persona", "skeptic"),
        learner_position=state.get("learner_position", "for"),
        latest=state.get("latest"),
    )
    if revised is None:
        return {"problems": ["no usable revision"], "revise_count": 1}
    return {
        "draft": revised,
        "reply": revised,
        "revise_count": state.get("revise_count", 0) + 1,
    }


def fallback_node(state: DebateState) -> DebateState:
    """Replace an unfixable draft with the in-character redirect."""
    logger.info("Verifier rejected the turn after repair; using the in-character redirect.")
    return {"reply": redirect_reply(state.get("topic", "")), "verified": False}


def accept_node(state: DebateState) -> DebateState:
    return {"verified": True}


def build_debate_graph():
    graph = StateGraph(DebateState)
    graph.add_node("guard", guard_node)
    graph.add_node("redirect", redirect_node)
    graph.add_node("memory", memory_node)
    graph.add_node("planner", planner_node)
    graph.add_node("draft", draft_node)
    graph.add_node("verifier", verifier_node)
    graph.add_node("reviser", reviser_node)
    graph.add_node("fallback", fallback_node)
    graph.add_node("accept", accept_node)
    graph.set_entry_point("guard")
    graph.add_conditional_edges(
        "guard", lambda s: s.get("route", "respond"),
        {"respond": "memory", "redirect": "redirect"},
    )
    graph.add_edge("memory", "planner")
    graph.add_edge("planner", "draft")
    graph.add_edge("draft", "verifier")
    graph.add_conditional_edges(
        "verifier", _after_verify,
        {"accept": "accept", "revise": "reviser", "fallback": "fallback"},
    )
    graph.add_edge("reviser", "verifier")
    graph.add_edge("accept", END)
    graph.add_edge("fallback", END)
    graph.add_edge("redirect", END)
    return graph.compile()


debate_graph = build_debate_graph()


async def respond_verified(state: DebateState) -> dict:
    """Run one turn through the whole graph."""
    out = await debate_graph.ainvoke(state)
    return {
        "reply": out.get("reply", ""),
        "verified": bool(out.get("verified")),
        "problems": list(out.get("problems", [])),
    }


async def respond_stream(state: DebateState) -> AsyncIterator[ReplyEvent]:
    """Same pipeline as `respond_verified`, streamed as (kind, text) events."""
    if route_turn(state.get("latest")) == "redirect":
        yield ("delta", redirect_reply(state.get("topic", "")))
        return

    state = {**state, **memory_node(state)}
    state = {**state, **await planner_node(state)}

    request = _to_request(state)
    assembled: list[str] = []
    messages = _briefed_messages(state, request)
    async for delta in stream(messages, temperature=0.75, num_predict=240):
        assembled.append(delta)
        yield ("delta", delta)

    draft = "".join(assembled)
    problems = inspect_reply(draft, latest=state.get("latest"), brief=state.get("brief"))
    if not problems:
        return

    logger.info("Verifier flagged the streamed turn (%s).", "; ".join(problems))
    revised = await repair_reply(
        draft,
        problems,
        topic=state.get("topic", ""),
        persona=state.get("persona", "skeptic"),
        learner_position=state.get("learner_position", "for"),
        latest=state.get("latest"),
    )
    if revised is not None:
        remaining = inspect_reply(revised, latest=state.get("latest"), brief=state.get("brief"))
        if len(remaining) < len(problems):
            yield ("replace", revised)
            return
        logger.info("Revision still failed the verifier (%s).", "; ".join(remaining))
    yield ("replace", redirect_reply(state.get("topic", "")))
