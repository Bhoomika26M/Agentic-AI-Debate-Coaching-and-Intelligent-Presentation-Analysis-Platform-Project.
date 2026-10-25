from fastapi import APIRouter
from app.api.v1 import auth, users, profile, skills, goals, topics, sessions, analysis, simulation, presentation

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(profile.router, prefix="/profile", tags=["Profile"])
api_router.include_router(skills.router, prefix="/skills", tags=["Skills"])
api_router.include_router(goals.router, prefix="/goals", tags=["Learning Goals"])
api_router.include_router(topics.router, prefix="/topics", tags=["Debate Topics"])
api_router.include_router(sessions.router, prefix="/sessions", tags=["Debate Sessions"])
api_router.include_router(analysis.router, prefix="/analysis", tags=["AI Debate Analysis & Fallacies"])
api_router.include_router(simulation.router, prefix="/simulation", tags=["AI Debate Simulation & Coaching"])
api_router.include_router(presentation.router, prefix="/presentation", tags=["Presentation Analytics & Reports"])