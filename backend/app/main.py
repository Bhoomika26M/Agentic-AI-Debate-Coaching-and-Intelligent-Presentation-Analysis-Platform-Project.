from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app import models  # noqa: F401
from app.routers import analysis, auth, coaching, debates, health, profiles, skills, users


app = FastAPI(
	title=settings.app_name,
	version=settings.app_version,
	description="Backend foundation for the Agentic AI Debate Coach platform.",
)

app.add_middleware(
	CORSMiddleware,
	allow_origins=settings.cors_origin_list,
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(profiles.router)
app.include_router(skills.router)
app.include_router(debates.router)
app.include_router(analysis.router)
app.include_router(coaching.router)
