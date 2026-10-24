"""The opponent turn: guard, memory, planner, draft, verifier, reviser, fallback."""

import asyncio
import json
import logging
from collections.abc import AsyncIterator
from time import perf_counter
from typing import Literal

from langgraph.graph import END, StateGraph

from ..prompts import build_messages
from ..schemas import DebateRequest
from .conversation import MAX_CONTEXT_TURNS
from .guard import redirect_reply, route_turn
from .laya_selector import move_instruction, select_move
from .llm import chat, stream
from .markup import MarkerStream, strip_markers
from .memory import summarize_history
from .planner import plan_brief, pressure_hint
from .response_limits import MAX_REPLY_WORDS, REPLY_LENGTH_LIMITS
from .state import DebateState
from .verifier import inspect_reply, repair_reply

logger = logging.getLogger(__name__)

ReplyEvent = tuple[Literal["final_delta", "diagnostics"], str]


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
            {"speaker": t["speaker"], "content": t["content"]} for t in state.get("history", [])
        ],
        learner_argument=state.get("latest"),
        preferences=state.get("preferences"),
        adaptive_tactics=state.get("adaptive_tactics", True),
        reply_length=state.get("reply_length", "standard"),
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
    tactic = move_instruction(state.get("tactic"))
    if tactic:
        parts.append(f"For this turn, take this debate move without announcing it: {tactic}")
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
    history = [{"speaker": t["speaker"], "content": t["content"]} for t in state.get("history", [])]
    context = _private_context(state, history)
    if context:
        messages = [messages[0], {"role": "system", "content": context}, *messages[1:]]
    return messages


async def planner_node(state: DebateState) -> DebateState:
    history = [{"speaker": t["speaker"], "content": t["content"]} for t in state.get("history", [])]
    tactic = None
    if state.get("adaptive_tactics", True):
        tactic = await select_move(
            state.get("topic", ""),
            state.get("learner_position", "for"),
            state.get("persona", "skeptic"),
            state.get("difficulty", "challenge"),
            history,
            state.get("latest"),
        )
    if tactic:
        return {"tactic": tactic, "brief": None}

    brief = await plan_brief(
        history,
        state.get("latest"),
        state.get("topic", ""),
        state.get("persona", "skeptic"),
        memory_brief=state.get("memory_brief"),
    )
    if brief:
        logger.info("Planner briefed this turn.")
    return {"brief": brief, "tactic": None}


async def draft_node(state: DebateState) -> DebateState:
    """Draft one in-persona turn, briefed by memory and planner."""
    request = _to_request(state)
    token_limit = 160 if request.reply_length == "concise" else 240
    reply = await chat(_briefed_messages(state, request), temperature=0.75, num_predict=token_limit)
    reply = strip_markers(reply)
    return {"draft": reply, "reply": reply}


async def verifier_node(state: DebateState) -> DebateState:
    draft = state.get("draft") or state.get("reply", "")
    word_limit = REPLY_LENGTH_LIMITS.get(state.get("reply_length", "standard"), MAX_REPLY_WORDS)
    history = [{"speaker": t["speaker"], "content": t["content"]} for t in state.get("history", [])]
    problems = inspect_reply(
        draft,
        latest=state.get("latest"),
        # Everything private that shaped the draft: brief, history summary, tactic, pressure.
        private_context=_private_context(state, history),
        max_words=word_limit,
    )
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
        max_words=REPLY_LENGTH_LIMITS.get(state.get("reply_length", "standard"), 110),
    )
    if revised is None:
        return {"problems": ["no usable revision"], "revise_count": 1}
    revised = strip_markers(revised)
    if not revised:
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
        "guard",
        lambda s: s.get("route", "respond"),
        {"respond": "memory", "redirect": "redirect"},
    )
    graph.add_edge("memory", "planner")
    graph.add_edge("planner", "draft")
    graph.add_edge("draft", "verifier")
    graph.add_conditional_edges(
        "verifier",
        _after_verify,
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
        "reply": strip_markers(out.get("reply", "")),
        "verified": bool(out.get("verified")),
        "problems": list(out.get("problems", [])),
    }


async def respond_stream(state: DebateState) -> AsyncIterator[ReplyEvent]:
    """Verify a complete candidate before streaming its final text."""
    started = perf_counter()
    if route_turn(state.get("latest")) == "redirect":
        async for event in _stream_final_reply(redirect_reply(state.get("topic", ""))):
            yield event
        return

    history = [{"speaker": t["speaker"], "content": t["content"]} for t in state.get("history", [])]
    history_turns = len(history)
    state = {**state, **memory_node(state)}
    state = {**state, **await planner_node(state)}

    request = _to_request(state)
    assembled: list[str] = []
    messages = _briefed_messages(state, request)
    scrubber = MarkerStream()
    token_limit = 160 if request.reply_length == "concise" else 240
    draft_started = perf_counter()
    async for delta in stream(messages, temperature=0.75, num_predict=token_limit):
        clean = scrubber.feed(delta)
        if clean:
            assembled.append(clean)
    tail = scrubber.flush()
    if tail:
        assembled.append(tail)
    draft_ms = round((perf_counter() - draft_started) * 1000)

    draft = "".join(assembled)
    word_limit = REPLY_LENGTH_LIMITS[request.reply_length]
    private_context = _private_context(state, history)
    review_started = perf_counter()
    problems = inspect_reply(
        draft,
        latest=state.get("latest"),
        private_context=private_context,
        max_words=word_limit,
    )
    final_reply = draft
    verified = not problems
    fallback_used = False
    if problems:
        logger.info("Verifier flagged the streamed turn (%s).", "; ".join(problems))
        revised = await repair_reply(
            draft,
            problems,
            topic=state.get("topic", ""),
            persona=state.get("persona", "skeptic"),
            learner_position=state.get("learner_position", "for"),
            latest=state.get("latest"),
            max_words=word_limit,
        )
        if revised is not None:
            revised = strip_markers(revised)
            remaining = inspect_reply(
                revised,
                latest=state.get("latest"),
                private_context=private_context,
                max_words=word_limit,
            )
            if not remaining:
                final_reply = revised
                verified = True
            else:
                logger.info("Revision still failed the verifier (%s).", "; ".join(remaining))
                final_reply = redirect_reply(state.get("topic", ""))
                fallback_used = True
        else:
            final_reply = redirect_reply(state.get("topic", ""))
            fallback_used = True
    review_ms = round((perf_counter() - review_started) * 1000)
    model_ms = round((perf_counter() - started) * 1000)

    async for event in _stream_final_reply(final_reply):
        yield event
    yield (
        "diagnostics",
        json.dumps(
            {
                "verified": verified,
                "fallback": fallback_used,
                "history_turns": history_turns,
                "context_turns": min(history_turns, MAX_CONTEXT_TURNS),
                "summarized_turns": max(0, history_turns - MAX_CONTEXT_TURNS),
                "tactic": state.get("tactic"),
                "brief_used": bool(state.get("brief")),
                "memory_used": bool(state.get("memory_brief")),
                "reply_words": len(final_reply.split()),
                "problems": problems[:4],
                "draft_ms": draft_ms,
                "review_ms": review_ms,
                "model_ms": model_ms,
            },
            ensure_ascii=False,
        ),
    )


async def _stream_final_reply(reply: str) -> AsyncIterator[ReplyEvent]:
    for start in range(0, len(reply), 42):
        yield ("final_delta", reply[start : start + 42])
        await asyncio.sleep(0.015)
