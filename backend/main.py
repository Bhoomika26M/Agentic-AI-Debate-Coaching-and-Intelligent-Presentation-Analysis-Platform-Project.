from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import create_tables
from app.routers import auth, users, sessions, analysis, simulation, coaching, presentation, reports, notifications


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create DB tables on startup (dev). Use Alembic for production migrations."""
    await create_tables()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "Agentic AI Debate Coach & Presentation Analysis Platform — Backend API\n\n"
        "**Milestones implemented:**\n"
        "- M1: Authentication, OAuth2 SSO, User Profiles, Session Management (6 formats)\n"
        "- M2: Argument Analysis & Logical Fallacy Detection (8 fallacies)\n"
        "- M3: AI Debate Simulation, Counterargument Generation, Coaching & Learning Plans\n"
        "- M4: Presentation Analysis, PDF/Excel/CSV Reports, Notifications & Admin Analytics"
    ),
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers (all versioned under /api/v1) ─────────────────────────
_PREFIX = "/api/v1"

# Milestone 1 — Auth, Users, Sessions
app.include_router(auth.router,          prefix=_PREFIX)
app.include_router(users.router,         prefix=_PREFIX)
app.include_router(sessions.router,      prefix=_PREFIX)

# Milestone 2 — Argument Analysis & Fallacy Detection
app.include_router(analysis.router,      prefix=_PREFIX)

# Milestone 3 — Simulation, Coaching
app.include_router(simulation.router,    prefix=_PREFIX)
app.include_router(coaching.router,      prefix=_PREFIX)

# Milestone 4 — Presentation Analysis, Reports, Notifications & Export
app.include_router(presentation.router,  prefix=_PREFIX)
app.include_router(reports.router,       prefix=_PREFIX)
app.include_router(notifications.router, prefix=_PREFIX)


# ── Health endpoints ──────────────────────────────────────────────
@app.get("/", tags=["Health"])
async def root():
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": "2.0.0",
        "milestones": ["M1: Auth & Sessions", "M2: Analysis", "M3: Simulation & Coaching", "M4: Presentation & Reports"],
    }


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy"}
