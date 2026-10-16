from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.users import router as users_router
from app.api.v1.profiles import router as profiles_router
from app.api.v1.debates import router as debates_router
from app.api.v1.analysis import router as analysis_router
from app.api.v1.simulation import router as simulation_router
from app.api.v1.scoring import router as scoring_router
from app.api.v1.coaching import router as coaching_router
from app.api.v1.dashboards import router as dashboards_router

api_v1_router = APIRouter()

api_v1_router.include_router(auth_router)
api_v1_router.include_router(users_router)
api_v1_router.include_router(profiles_router)
api_v1_router.include_router(debates_router)
api_v1_router.include_router(analysis_router)
api_v1_router.include_router(simulation_router)
api_v1_router.include_router(scoring_router)
api_v1_router.include_router(coaching_router)
api_v1_router.include_router(dashboards_router)
