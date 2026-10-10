from app.routers.auth import router as auth_router
from app.routers.profiles import router as profiles_router
from app.routers.skills import router as skills_router
from app.routers.debates import router as debates_router
from app.routers.users import router as users_router

__all__ = [
    "auth_router",
    "profiles_router",
    "skills_router",
    "debates_router",
    "users_router",
]
