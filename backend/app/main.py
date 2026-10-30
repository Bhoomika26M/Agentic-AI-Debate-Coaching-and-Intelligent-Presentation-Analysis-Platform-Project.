import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.responses import JSONResponse, FileResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.services.seed_data import seed_database
from app.services.ai_service import ai_service
from app.routers import (
    auth,
    users,
    debates,
    arguments,
    fallacies,
    counterarguments,
    presentation,
    coaching,
    analytics,
    notifications,
    admin
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("justitalk")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing JustiTalk Database tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Agentic AI Debate Coach & Presentation Analysis Platform API",
    version="1.0.0",
    lifespan=lifespan
)

# Centralized Error Handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"status": "error", "message": exc.detail, "code": exc.status_code}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    first_error = errors[0]["msg"] if errors else "Invalid request data format"
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"status": "error", "message": first_error, "details": errors, "code": 422}
    )

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers under /api
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(users.router, prefix=settings.API_V1_STR)
app.include_router(debates.router, prefix=settings.API_V1_STR)
app.include_router(arguments.router, prefix=settings.API_V1_STR)
app.include_router(fallacies.router, prefix=settings.API_V1_STR)
app.include_router(counterarguments.router, prefix=settings.API_V1_STR)
app.include_router(presentation.router, prefix=settings.API_V1_STR)
app.include_router(coaching.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)
app.include_router(notifications.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "app": "JustiTalk API",
        "version": "1.0.0"
    }

@app.get("/api/system/ai-status")
def get_ai_system_status():
    is_ready = ai_service.is_live_llm_ready()
    mode = ai_service.get_inference_mode()
    return {
        "live_ai_connected": is_ready,
        "inference_mode": mode,
        "model": settings.OPENAI_MODEL,
        "status_label": "OpenAI GPT-4o Active" if is_ready else "Offline Development NLP Engine (Deterministic Fallback)",
        "guidance": "Configured and operational" if is_ready else "Set OPENAI_API_KEY in backend/.env to activate live GPT-4o"
    }

# Serve Frontend static assets if built
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend_spa(full_path: str):
        if full_path.startswith("api"):
            raise HTTPException(status_code=404, detail="API route not found")
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
