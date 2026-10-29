import asyncio
import json
import logging
import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from httpx import HTTPError
from starlette.requests import Request

from .agents.debate import check_reply, guard_diagnostics, respond_stream
from .agents.guard import classify_turn, redirect_reply
from .agents.laya_selector import is_available as laya_available
from .auth import REQUIRE_AUTH, authenticate_request
from .providers import (
    is_available,
    is_loaded,
    model_name,
    provider as llm_provider,
    unavailable_hint,
    warm as warm_model,
)
from .rate_limit import client_key, enforce_model_rate_limit, request_limiter
from .runtime_config import validate_deployment
from .schemas import (
    AnalysisEnvelope,
    AnalysisRequest,
    ChallengeRequest,
    ChallengeResponse,
    DebateRequest,
    JudgeRequest,
    JudgeVerdict,
    PlanRequest,
    PlanResponse,
    PresentationResponse,
)
from .speech import (
    MAX_AUDIO_MB,
    AudioValidationError,
    check_duration,
    probe_duration,
    transcription_available,
    validate_audio,
)
from .usage_limits import follow_up_limiter

# The agent graphs log through logging.info; LOG_LEVEL=WARNING silences them.
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").strip().upper() or "INFO"
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(levelname)s %(name)s: %(message)s",
)

logger = logging.getLogger(__name__)
MAX_ACTIVE_STREAMS = max(1, int(os.getenv("MAX_ACTIVE_STREAMS", "2")))
stream_slots = asyncio.Semaphore(MAX_ACTIVE_STREAMS)
STREAM_DONE = "data: [DONE]\n\n"
BUSY_MESSAGE = "The opponent could not finish this turn. Please try again."


def sse_event(kind: str, text: str) -> str:
    """One server-sent event keyed by its event kind."""
    return f"data: {json.dumps({kind: text}, ensure_ascii=False)}\n\n"


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
DEPLOYMENT_ENV = validate_deployment(
    environment=os.getenv("DEPLOYMENT_ENV", "local"),
    require_auth=REQUIRE_AUTH,
    origins=origins,
    allowed_hosts=allowed_hosts,
)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=allowed_hosts)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = None
    # Health checks are exempt so an operator can always probe a saturated API.
    if request.url.path.startswith("/api/") and request.url.path != "/api/health":
        allowed, retry_after = request_limiter.allow(client_key(request))
        if not allowed:
            response = JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Wait a moment and try again."},
                headers={"Retry-After": str(retry_after)},
            )
    if response is None:
        response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    # Streaming responses must not weaken this to no-cache: no-store is the privacy promise.
    response.headers["Cache-Control"] = "no-store"
    return response


@app.get("/api/health")
async def health() -> dict[str, str | bool]:
    available = await is_available()
    loaded = await is_loaded() if available else False
    return {
        "status": "ready" if loaded else "warming" if available else "model_unavailable",
        "provider": llm_provider(),
        "model": model_name(),
        "hint": "" if available else unavailable_hint(),
        "model_available": available,
        "model_loaded": loaded,
        "transcription": "ready" if transcription_available() else "unavailable",
        "adaptive_tactics_available": True,
        "laya_available": laya_available(),
    }


@app.post(
    "/api/debate/stream",
    dependencies=[Depends(authenticate_request), Depends(enforce_model_rate_limit)],
)
async def debate_stream(request: DebateRequest) -> StreamingResponse:
    # A declined turn never needs the model or a stream slot.
    guard_history = [
        {"speaker": turn.speaker, "content": turn.content} for turn in request.history
    ]
    decision = classify_turn(
        request.learner_argument,
        topic=request.topic,
        history=guard_history,
    )
    if decision.route == "redirect":
        reply = redirect_reply(request.topic)
        logger.info(
            "Guard redirected the turn (%s: %s).", decision.kind, decision.pattern
        )

        async def redirected() -> AsyncIterator[str]:
            yield sse_event("final_delta", reply)
            yield sse_event(
                "diagnostics",
                guard_diagnostics(decision, reply, history_turns=len(guard_history)),
            )
            yield STREAM_DONE

        return StreamingResponse(
            redirected(),
            media_type="text/event-stream",
            headers={"X-Accel-Buffering": "no"},
        )
    if not await is_available():
        raise HTTPException(status_code=503, detail=unavailable_hint())
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
            async for kind, text in respond_stream(
                {
                    "topic": request.topic,
                    "learner_position": request.learner_position,
                    "persona": request.persona,
                    "difficulty": request.difficulty,
                    "history": [
                        {
                            "speaker": t.speaker,
                            "content": t.content,
                            "kind": t.kind,
                        }
                        for t in request.history
                    ],
                    "latest": request.learner_argument,
                    "memory": [digest.model_dump() for digest in request.memory],
                    "preferences": (
                        request.preferences.model_dump()
                        if request.preferences
                        else None
                    ),
                    "adaptive_tactics": request.adaptive_tactics,
                    "reply_length": request.reply_length,
                }
            ):
                if kind == "final_delta":
                    assembled.append(text)
                yield sse_event(kind, text)
            problem = check_reply("".join(assembled), request.topic)
            if problem is not None:
                logger.info("Streamed reply flagged (%s); see transcript.", problem)
            yield STREAM_DONE
        except (HTTPError, ValueError) as error:
            yield sse_event("error", BUSY_MESSAGE)
            logger.exception("Model streaming failed: %s", error)
        finally:
            stream_slots.release()

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"X-Accel-Buffering": "no"},
    )


@app.post(
    "/api/debate/analyze",
    dependencies=[Depends(authenticate_request), Depends(enforce_model_rate_limit)],
    response_model=AnalysisEnvelope,
)
async def debate_analysis(request: AnalysisRequest) -> AnalysisEnvelope:
    if not await is_available():
        raise HTTPException(
            status_code=503,
            detail=unavailable_hint(),
        )
    if stream_slots.locked():
        raise HTTPException(
            status_code=429,
            detail="The model is busy. Please retry in a moment.",
        )
    await stream_slots.acquire()
    try:
        from .agents.analysis_graph import analyze_with_graph

        report, gaps = await analyze_with_graph(request)
        if report is None:
            detail = "The model returned an incomplete coaching review. Try the review again."
            if gaps:
                detail = (
                f"Incomplete coaching review ({'; '.join(gaps[:3])}). Try the review again."
            )
            raise HTTPException(status_code=502, detail=detail)
        return AnalysisEnvelope.model_validate({**report, "gaps": gaps})
    except HTTPError as error:
        logger.exception("Model transcript analysis failed: %s", error)
        raise HTTPException(
            status_code=503,
            detail="The model could not finish analysis.",
        ) from error
    except HTTPException:
        raise
    except (ValueError, json.JSONDecodeError) as error:
        logger.exception("Model returned an invalid analysis: %s", error)
        raise HTTPException(
            status_code=502,
            detail="The model returned an incomplete coaching review. Try the review again.",
        ) from error
    finally:
        stream_slots.release()


@app.post(
    "/api/debate/challenge",
    dependencies=[Depends(enforce_model_rate_limit)],
    response_model=ChallengeResponse,
)
async def debate_challenge(
    request: ChallengeRequest,
    http_request: Request,
    subject: str | None = Depends(authenticate_request),
) -> ChallengeResponse:
    if request.depth >= 2:
        return ChallengeResponse(done=True, depth=request.depth)
    if not await is_available():
        raise HTTPException(
            status_code=503,
            detail=unavailable_hint(),
        )
    if stream_slots.locked():
        raise HTTPException(
            status_code=429,
            detail="The model is busy. Please retry in a moment.",
        )
    identity = subject or (http_request.client.host if http_request.client else "anonymous")
    # The client's depth is a display hint; the follow-up cap is enforced here.
    allowed, depth = follow_up_limiter.claim(identity, request.latest)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail="This turn already has two follow-ups. Make your next case.",
            headers={"Retry-After": "60"},
        )
    await stream_slots.acquire()
    try:
        from .agents.challenger import challenge_turn

        result = await challenge_turn(
            [{"speaker": t.speaker, "content": t.content} for t in request.history],
            request.latest,
            request.topic,
            depth - 1,
            request.preferences.model_dump() if request.preferences else None,
        )
        if result is None:
            follow_up_limiter.release(identity, request.latest)
            return ChallengeResponse(done=True, depth=request.depth)
        return ChallengeResponse(
            done=False,
            target_sentence=result["target_sentence"],
            follow_up=result["follow_up"],
            depth=depth,
        )
    except HTTPError as error:
        follow_up_limiter.release(identity, request.latest)
        logger.exception("Model challenger failed: %s", error)
        raise HTTPException(
            status_code=503,
            detail="The model could not ask a follow-up.",
        ) from error
    finally:
        stream_slots.release()


@app.post(
    "/api/coach/plan",
    dependencies=[Depends(authenticate_request), Depends(enforce_model_rate_limit)],
    response_model=PlanResponse,
)
async def coach_plan_endpoint(request: PlanRequest) -> PlanResponse:
    """The coaching agent: archive in, a grounded practice plan out."""
    from .agents.plan_graph import coach_plan

    # A plan for a learner with nothing saved is deterministic, so it works with the model off.
    use_model = bool(request.digests) and await is_available()
    if use_model and stream_slots.locked():
        raise HTTPException(
            status_code=429,
            detail="The model is busy. Please retry in a moment.",
        )
    if use_model:
        await stream_slots.acquire()
    try:
        plan, gaps = await coach_plan(request, use_model=use_model)
        if plan is None:
            raise HTTPException(
                status_code=502,
                detail=("; ".join(gaps[:3]) if gaps else "The coach could not build a plan.")
                + " Try again.",
            )
        return PlanResponse(plan=plan, gaps=gaps)
    except HTTPError as error:
        logger.exception("Model plan drafting failed: %s", error)
        raise HTTPException(
            status_code=503, detail="The model could not finish your plan."
        ) from error
    except HTTPException:
        raise
    finally:
        if use_model:
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
    verdict_dict, gaps = await judge_with_graph(
        report_dict, delivery_dict, [turn.model_dump() for turn in request.turns]
    )
    if verdict_dict is None:
        detail = "; ".join(gaps[:3]) if gaps else "Scoring failed."
        raise HTTPException(status_code=502, detail=f"{detail} Try again.")
    cleaned, _ = scrub_report(verdict_dict)
    return JudgeVerdict.model_validate(cleaned)


@app.post(
    "/api/presentation/analyze",
    dependencies=[Depends(authenticate_request), Depends(enforce_model_rate_limit)],
    response_model=PresentationResponse,
)
async def presentation_analysis(
    audio: UploadFile = File(...),  # noqa: B008 - FastAPI reads the upload from this default.
    topic: str | None = Form(default=None, min_length=3, max_length=240),
) -> PresentationResponse:
    # Persistence stays in the browser; Python holds audio in memory and discards it.
    data = await audio.read(MAX_AUDIO_MB * 1024 * 1024 + 1)
    filename = audio.filename or "talk.webm"
    content_type = audio.content_type or "audio/webm"
    # Size, type, and duration are rejected at the boundary, before a model slot is taken.
    try:
        validate_audio(filename, content_type, data)
        duration = await asyncio.to_thread(probe_duration, data)
        if duration is not None:
            check_duration(duration)
    except AudioValidationError as error:
        too_large = len(data) > MAX_AUDIO_MB * 1024 * 1024
        raise HTTPException(
            status_code=413 if too_large else 400,
            detail=str(error),
        ) from error
    if stream_slots.locked():
        raise HTTPException(
            status_code=429,
            detail="The model is busy. Please retry in a moment.",
        )
    await stream_slots.acquire()
    try:
        from .agents.delivery_graph import review_delivery_with_graph

        result, gaps, kind = await review_delivery_with_graph(
            data, filename, content_type, topic or None
        )
        if result is not None and not gaps:
            return PresentationResponse.model_validate({**result, "ser_reflection": []})
        detail = "; ".join(gaps[:3]) if gaps else "Delivery review failed."
        status = {"audio": 413, "unavailable": 503, "no_speech": 400}.get(kind, 502)
        if status == 502:
            raise HTTPException(status_code=502, detail=f"{detail} Try again.")
        raise HTTPException(status_code=status, detail=detail)
    except HTTPError as error:
        logger.exception("Model delivery coaching failed: %s", error)
        raise HTTPException(
            status_code=503, detail="The model could not finish delivery review."
        ) from error
    except HTTPException:
        raise
    except Exception as error:
        logger.exception("Delivery review failed unexpectedly: %s", error)
        raise HTTPException(
            status_code=503,
            detail="Delivery review failed. Check the backend logs and try again.",
        ) from error
    finally:
        stream_slots.release()
