import asyncio
import json
import logging
import os
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from httpx import HTTPError

from .ollama_client import OLLAMA_MODEL, is_available, is_loaded, stream_chat, warm_model
from .prompts import build_messages
from .schemas import DebateRequest

logger = logging.getLogger(__name__)


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
origins = os.getenv("WEB_ORIGIN", "http://127.0.0.1:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in origins],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


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


@app.post("/api/debate/stream")
async def debate_stream(request: DebateRequest) -> StreamingResponse:
    if not await is_available():
        raise HTTPException(
            status_code=503,
            detail=f"Ollama or model {OLLAMA_MODEL} is unavailable. Start Ollama and pull the model.",
        )

    async def events() -> AsyncIterator[str]:
        try:
            async for delta in stream_chat(build_messages(request)):
                yield f"data: {json.dumps({'delta': delta}, ensure_ascii=False)}\n\n"
            yield "data: [DONE]\n\n"
        except (HTTPError, ValueError) as error:
            message = "The opponent could not finish this turn. Please try again."
            yield f"data: {json.dumps({'error': message})}\n\n"
            logger.exception("Ollama streaming failed: %s", error)

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
