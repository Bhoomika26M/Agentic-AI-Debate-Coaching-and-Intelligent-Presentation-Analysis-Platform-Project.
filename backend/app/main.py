import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import get_settings
from app.routers import auth, debates, analysis, presentations, dashboard, coaching, reports

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
settings = get_settings()

app = FastAPI(title="Agentic AI Debate Coach", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def unhandled(request: Request, exc: Exception):
    logger.exception("Unhandled error: %s", exc)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

@app.get("/api/health")
def health():
    return {"status": "ok", "model": settings.GEMINI_MODEL}

app.include_router(auth.router)
app.include_router(debates.router)
app.include_router(analysis.router)
app.include_router(presentations.router)
app.include_router(dashboard.router)
app.include_router(coaching.router)
app.include_router(reports.router)