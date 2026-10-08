import asyncio
import json
import logging
import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import StreamingResponse
from httpx import HTTPError
from starlette.requests import Request

from .agents.debate import check_reply, respond_stream
from .agents.guard import redirect_reply, route_turn
from .auth import authenticate_request
from .ollama_client import OLLAMA_MODEL, is_available, is_loaded, warm_model
from .schemas import (
    AnalysisReport,
    AnalysisRequest,
    DebateRequest,
    JudgeRequest,
    JudgeVerdict,
    PresentationResponse,
)
from .speech import MAX_AUDIO_MB

logger = logging.getLogger(__name__)
MAX_ACTIVE_STREAMS = max(1, int(os.getenv("MAX_ACTIVE_STREAMS", "2")))
stream_slots = asyncio.Semaphore(MAX_ACTIVE_STREAMS)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    async def warm_until_loaded() -> None:
        for _ in range(20):
            if await is_loaded():
                return
            await warm_model()
            if await is_loaded():
                return
            await asyncio.sleep(5)

    warmup = asyncio.create_task(warm_until_loaded())
    yield
    warmup.cancel()


app = FastAPI(title="Debate Coach AI", version="0.1.0", lifespan=lifespan)
origins = [
    origin.strip()
    for origin in os.getenv("WEB_ORIGIN", "http://127.0.0.1:5173").split(",")
    if origin.strip()
]
if not origins or "*" in origins:
    raise ValueError("WEB_ORIGIN must contain explicit frontend origins.")
allowed_hosts = os.getenv(
    "ALLOWED_HOSTS", "localhost,127.0.0.1,0.0.0.0"
).split(",")
allowed_hosts = [host.strip() for host in allowed_hosts if host.strip()]
if not allowed_hosts or "*" in allowed_hosts:
    raise ValueError("ALLOWED_HOSTS must contain explicit host names.")
app.add_middleware(TrustedHostMiddleware, allowed_hosts=allowed_hosts)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Cache-Control", "no-store")
    return response


@app.get("/api/health")
async def health() -> dict[str, str | bool]:
    available = await is_available()
    loaded = await is_loaded() if available else False
    return {
        "status": "ready" if loaded else "warming" if available else "model_unavailable",
        "model": OLLAMA_MODEL,
        "model_available": available,
        "model_loaded": loaded,
    }


@app.post("/api/debate/stream", dependencies=[Depends(authenticate_request)])
async def debate_stream(request: DebateRequest) -> StreamingResponse:
    if route_turn(request.learner_argument) == "redirect":
        async def redirected() -> AsyncIterator[str]:
            yield f"data: {json.dumps({'delta': redirect_reply(request.topic)}, ensure_ascii=False)}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(
            redirected(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )
    if not await is_available():
        raise HTTPException(
            status_code=503,
            detail=(
                f"Ollama or model {OLLAMA_MODEL} is unavailable. "
                "Start Ollama and pull the model."
            ),
        )
    if stream_slots.locked():
        raise HTTPException(
            status_code=429,
            detail="The local opponent is busy. Please retry in a moment.",
            headers={"Retry-After": "5"},
        )

    await stream_slots.acquire()

    async def events() -> AsyncIterator[str]:
        try:
            assembled: list[str] = []
            async for delta in respond_stream(
                {
                    "topic": request.topic,
                    "learner_position": request.learner_position,
                    "persona": request.persona,
                    "difficulty": request.difficulty,
                    "history": [
                        {"speaker": t.speaker, "content": t.content}
                        for t in request.history
                    ],
                    "latest": request.learner_argument,
                }
            ):
                assembled.append(delta)
                yield f"data: {json.dumps({'delta': delta}, ensure_ascii=False)}\n\n"
            problem = check_reply("".join(assembled), request.topic)
            if problem is not None:
                logger.info("Streamed reply flagged (%s); see transcript.", problem)
            yield "data: [DONE]\n\n"
        except (HTTPError, ValueError) as error:
            message = "The opponent could not finish this turn. Please try again."
            yield f"data: {json.dumps({'error': message})}\n\n"
            logger.exception("Ollama streaming failed: %s", error)
        finally:
            stream_slots.release()

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post(
    "/api/debate/analyze",
    dependencies=[Depends(authenticate_request)],
    response_model=AnalysisReport,
)
async def debate_analysis(request: AnalysisRequest) -> AnalysisReport:
    if not await is_available():
        raise HTTPException(
            status_code=503,
            detail="The local model is unavailable. Start Ollama and retry.",
        )
    if stream_slots.locked():
        raise HTTPException(
            status_code=429,
            detail="The local model is busy. Please retry in a moment.",
        )
    await stream_slots.acquire()
    try:
        from .agents.analysis_graph import analyze_with_graph

        report, gaps = await analyze_with_graph(request)
        if report is not None and not gaps:
            return report
        detail = "The local model returned an incomplete coaching review. Try the review again."
        if gaps:
            detail = f"Incomplete coaching review ({'; '.join(gaps[:3])}). Try the review again."
        raise HTTPException(status_code=502, detail=detail)
    except HTTPError as error:
        logger.exception("Ollama transcript analysis failed: %s", error)
        raise HTTPException(
            status_code=503,
            detail="The local model could not finish analysis.",
        ) from error
    except HTTPException:
        raise
    except (ValueError, json.JSONDecodeError) as error:
        logger.exception("Ollama returned an invalid analysis: %s", error)
        raise HTTPException(
            status_code=502,
            detail="The local model returned an incomplete coaching review. Try the review again.",
        ) from error
    finally:
        stream_slots.release()


@app.post(
    "/api/debate/judge",
    dependencies=[Depends(authenticate_request)],
    response_model=JudgeVerdict,
)
async def debate_judge(request: JudgeRequest) -> JudgeVerdict:
    from .agents.judge import judge_with_graph
    from .agents.scrub import scrub_report

    report_dict = request.report.model_dump()
    delivery_dict = request.delivery.model_dump() if request.delivery else {}
    verdict_dict, gaps = await judge_with_graph(report_dict, delivery_dict)
    if verdict_dict is None:
        detail = "; ".join(gaps[:3]) if gaps else "Scoring failed."
        raise HTTPException(status_code=502, detail=f"{detail} Try again.")
    cleaned, _ = scrub_report(verdict_dict)
    return JudgeVerdict.model_validate(cleaned)


@app.post(
    "/api/presentation/analyze",
    dependencies=[Depends(authenticate_request)],
    response_model=PresentationResponse,
)
async def presentation_analysis(
    audio: UploadFile = File(...),
    topic: str | None = Form(default=None, min_length=3, max_length=240),
) -> PresentationResponse:
    # Persistence stays in the browser via Supabase RLS; Python holds audio in memory only and discards it.
    if stream_slots.locked():
        raise HTTPException(
            status_code=429,
            detail="The local model is busy. Please retry in a moment.",
        )
    await stream_slots.acquire()
    try:
        from .agents.delivery_graph import review_delivery_with_graph

        data = await audio.read(MAX_AUDIO_MB * 1024 * 1024 + 1)
        result, gaps = await review_delivery_with_graph(
            data, audio.filename or "talk.webm", audio.content_type or "audio/webm", topic or None
        )
        if result is not None and not gaps:
            return PresentationResponse.model_validate({**result, "ser_reflection": []})
        detail = "; ".join(gaps[:3]) if gaps else "Delivery review failed."
        if "over " in detail or "webm" in detail or "No audio" in detail or "filename" in detail:
            raise HTTPException(status_code=413, detail=detail)
        if "unavailable" in detail:
            raise HTTPException(status_code=503, detail=detail)
        if "No speech" in detail:
            raise HTTPException(status_code=400, detail=detail)
        raise HTTPException(status_code=502, detail=f"{detail} Try again.")
    except HTTPError as error:
        logger.exception("Ollama delivery coaching failed: %s", error)
        raise HTTPException(status_code=503, detail="The local model could not finish delivery review.") from error
    except HTTPException:
        raise
    except Exception as error:
        logger.exception("Delivery review failed unexpectedly: %s", error)
        raise HTTPException(status_code=503, detail="Delivery review failed. Check the backend logs and try again.") from error
    finally:
        stream_slots.release()
