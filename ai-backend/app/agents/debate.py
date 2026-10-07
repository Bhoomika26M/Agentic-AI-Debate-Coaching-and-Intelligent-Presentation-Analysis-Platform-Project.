import logging
import re
from collections.abc import AsyncIterator

from langgraph.graph import END, StateGraph

from ..prompts import build_messages
from ..schemas import DebateRequest
from .guard import redirect_reply, route_turn
from .llm import chat, stream
from .state import DebateState

logger = logging.getLogger(__name__)


def guard_node(state: DebateState) -> DebateState:
    route = route_turn(state.get("latest"))
    return {"route": route}


def redirect_node(state: DebateState) -> DebateState:
    return {"reply": redirect_reply(state.get("topic", ""))}


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
    )


_ROLE_LABEL = re.compile(r"^(the )?(strategist|skeptic|diplomat|assistant|opponent|ai)\s*:", re.IGNORECASE)


def check_reply(reply: str, topic: str) -> str | None:
    if len(reply.split()) > 160:
        return "reply over length cap"
    if _ROLE_LABEL.match(reply.strip()):
        return "reply carries a role label"
    if "##" in reply:
        return "reply carries analysis headings"
    return None


async def respond_node(state: DebateState) -> DebateState:
    request = _to_request(state)
    content = await chat(
        build_messages(request), temperature=0.75, num_predict=240
    )
    problem = check_reply(content, request.topic)
    if problem is not None:
        logger.info("Debate graph output flagged (%s); falling back to safe nudge.", problem)
        return {"reply": redirect_reply(request.topic)}
    return {"reply": content}


async def respond_stream(state: DebateState) -> AsyncIterator[str]:
    request = _to_request(state)
    async for delta in stream(
        build_messages(request), temperature=0.75, num_predict=240
    ):
        yield delta


def build_debate_graph():
    graph = StateGraph(DebateState)
    graph.add_node("guard", guard_node)
    graph.add_node("redirect", redirect_node)
    graph.add_node("respond", respond_node)
    graph.set_entry_point("guard")
    graph.add_conditional_edges(
        "guard", lambda s: s.get("route", "respond"),
        {"respond": "respond", "redirect": "redirect"},
    )
    graph.add_edge("respond", END)
    graph.add_edge("redirect", END)
    return graph.compile()


debate_graph = build_debate_graph()
