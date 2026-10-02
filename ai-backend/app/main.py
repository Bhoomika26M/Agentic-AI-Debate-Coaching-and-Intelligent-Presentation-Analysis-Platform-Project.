import asyncio
import json
import logging
import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import StreamingResponse
from httpx import HTTPError
from starlette.requests import Request

from .analysis import analyze_transcript
from .auth import authenticate_request
from .ollama_client import OLLAMA_MODEL, is_available, is_loaded, stream_chat, warm_model
from .prompts import build_messages
from .schemas import AnalysisReport, AnalysisRequest, DebateRequest

logger = logging.getLogger(__name__)
MAX_ACTIVE_STREAMS = max(1, int(os.getenv("MAX_ACTIVE_STREAMS", "2")))
stream_slots = asyncio.Semaphore(MAX_ACTIVE_STREAMS)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    async def warm_until_loaded() -> None:
        while not await is_loaded():
            await warm_model()
            if not await is_loaded():
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
            async for delta in stream_chat(build_messages(request)):
                yield f"data: {json.dumps({'delta': delta}, ensure_ascii=False)}\n\n"
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
        return (await analyze_transcript(request)).model_dump()
    except HTTPError as error:
        logger.exception("Ollama transcript analysis failed: %s", error)
        raise HTTPException(
            status_code=503,
            detail="The local model could not finish analysis.",
        ) from error
    except (ValueError, json.JSONDecodeError) as error:
        logger.exception("Ollama returned an invalid analysis: %s", error)
        raise HTTPException(
            status_code=502,
            detail="The local model returned an incomplete coaching review. Try the review again.",
        ) from error
    finally:
        stream_slots.release()
