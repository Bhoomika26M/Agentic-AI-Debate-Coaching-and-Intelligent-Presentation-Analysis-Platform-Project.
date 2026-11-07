"""Router package — exposes all API routers for Milestones 1–4."""
from app.routers import auth, users, sessions, analysis, simulation, coaching, presentation, reports, notifications, classes

__all__ = ["auth", "users", "sessions", "analysis", "simulation", "coaching", "presentation", "reports", "notifications", "classes"]
