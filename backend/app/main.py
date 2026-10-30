import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.services.seed_data import seed_database
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
    # Startup: create tables and seed default data
    logger.info("Initializing JustiTalk Database tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield
    # Shutdown

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Agentic AI Debate Coach & Presentation Analysis Platform API",
    version="1.0.0",
    lifespan=lifespan
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

# Serve Frontend static assets if built (Single-port production / preview deployment)
import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend_spa(full_path: str):
        if full_path.startswith("api"):
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="API route not found")
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
