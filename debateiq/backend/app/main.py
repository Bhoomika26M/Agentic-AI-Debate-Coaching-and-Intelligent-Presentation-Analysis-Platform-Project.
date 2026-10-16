import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1.router import api_v1_router
from app.utils.seed import seed_database

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("debateiq")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables created & auto-seed demo data
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Executing auto-seed checks...")
    try:
        seed_database()
    except Exception as e:
        logger.warning(f"Auto-seed encountered non-fatal notice: {e}")
    yield
    # Shutdown
    logger.info("DebateIQ backend shutting down.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description="DebateIQ: Agentic AI Debate Coach & Presentation Analysis Platform",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API v1
app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)
# Also mount directly under /api for frontend convenience
app.include_router(api_v1_router, prefix="/api")

@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": "DebateIQ Agentic AI Platform",
        "version": settings.PROJECT_VERSION,
        "database_backend": "SQLite" if settings.USE_SQLITE else "PostgreSQL",
        "llm_provider": settings.LLM_PROVIDER,
        "active_milestones": ["Milestone 1", "Milestone 2", "Milestone 3"],
    }

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global unhandled exception on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred.", "path": str(request.url.path)},
    )
