import logging

from langgraph.graph import END, StateGraph

from ..delivery import analyze_delivery
from ..presentation import IncompletePresentationError, coach_delivery
from ..schemas import DeliverySignals, PresentationRequest, PresentationSegment
from ..speech import AudioValidationError, TranscriptionUnavailableError, transcribe_audio
from .scrub import scrub_report
from .state import DeliveryState

logger = logging.getLogger(__name__)


async def transcribe_node(state: DeliveryState) -> DeliveryState:
    try:
        segments = await transcribe_audio(
            state.get("audio", b""),
            state.get("filename", "talk.webm"),
            state.get("content_type", "audio/webm"),
        )
    except AudioValidationError as error:
        return {"segments": [], "gaps": [str(error)]}
    except TranscriptionUnavailableError as error:
        return {"segments": [], "gaps": [str(error)]}
    kept = [s for s in segments if str(s.get("text", "")).strip()]
    if not kept:
        return {"segments": [], "gaps": ["No speech detected in that recording. Record closer to the mic and try again."]}
    return {"segments": kept, "gaps": []}


async def signals_node(state: DeliveryState) -> DeliveryState:
    signals = DeliverySignals.model_validate(analyze_delivery(state.get("segments", [])))
    return {"signals": signals.model_dump()}


async def coach_node(state: DeliveryState) -> DeliveryState:
    segments = [PresentationSegment.model_validate(s) for s in state.get("segments", [])]
    request = PresentationRequest(
        topic=state.get("topic"),
        segments=segments,
        signals=DeliverySignals.model_validate(state.get("signals", {})),
    )
    try:
        report = await coach_delivery(request)
    except IncompletePresentationError as error:
        return {"report": None, "gaps": [f"delivery coaching incomplete: {error}"]}
    cleaned, count = scrub_report(report.model_dump())
    if count:
        logger.info("Scrubbed %d contact span(s) from delivery report.", count)
    return {"report": cleaned, "gaps": []}


def _has_segments(state: DeliveryState) -> str:
    return "signals" if state.get("segments") else "done"


def build_delivery_graph():
    graph = StateGraph(DeliveryState)
    graph.add_node("transcribe", transcribe_node)
    graph.add_node("signals", signals_node)
    graph.add_node("coach", coach_node)
    graph.set_entry_point("transcribe")
    graph.add_conditional_edges("transcribe", _has_segments, {"signals": "signals", "done": END})
    graph.add_edge("signals", "coach")
    graph.add_edge("coach", END)
    return graph.compile()


delivery_graph = build_delivery_graph()


async def review_delivery_with_graph(
    audio: bytes, filename: str, content_type: str, topic: str | None
) -> tuple[dict | None, list[str]]:
    out = await delivery_graph.ainvoke(
        {"audio": audio, "filename": filename, "content_type": content_type, "topic": topic}
    )
    gaps: list[str] = list(out.get("gaps", []))
    if out.get("report") and out.get("segments") and out.get("signals"):
        transcript = " ".join(s.get("text", "") for s in out["segments"])
        return {
            "transcript": transcript,
            "segments": out["segments"],
            "signals": out["signals"],
            "report": out["report"],
            "retained": False,
        }, gaps
    partial: dict = {}
    if out.get("segments"):
        partial["segments"] = out["segments"]
    if out.get("signals"):
        partial["signals"] = out["signals"]
    return (partial or None), gaps or ["delivery review incomplete"]
