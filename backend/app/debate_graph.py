"""LangGraph-compatible debate simulation with a dependency-free fallback."""
from typing import TypedDict


class DebateState(TypedDict, total=False):
    topic: str
    position: str
    transcript: str
    turn: int
    messages: list[dict]
    response: str


def _respond(state: DebateState) -> DebateState:
    position = state.get("position", "for")
    topic = state.get("topic", "the topic")
    return {**state, "turn": state.get("turn", 0) + 1, "response":
            f"An opponent would challenge your {position} position on {topic}. "
            "What evidence supports your strongest claim, and what trade-off would you accept?"}


def simulate_turn(state: DebateState) -> DebateState:
    """Run one turn. If LangGraph is installed, callers can use the same state shape."""
    try:
        from langgraph.graph import END, START, StateGraph
        graph = StateGraph(DebateState)
        graph.add_node("respond", _respond)
        graph.add_edge(START, "respond")
        graph.add_edge("respond", END)
        return graph.compile().invoke(state)
    except ImportError:
        return _respond(state)
