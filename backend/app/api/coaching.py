
from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.personalized_coach import (
    generate_personalized_coaching,
)

router = APIRouter(
    prefix="/api/v1/coaching",
    tags=["Personalized Coaching"],
)


class CoachingRequest(BaseModel):
    argument_score: int = Field(ge=0, le=100)
    rebuttal_score: int = Field(ge=0, le=100)
    presentation_score: int = Field(ge=0, le=100)
    clarity_score: int = Field(ge=0, le=100)


@router.post("/generate")
def generate_coaching(request: CoachingRequest):
    return generate_personalized_coaching(
        argument_score=request.argument_score,
        rebuttal_score=request.rebuttal_score,
        presentation_score=request.presentation_score,
        clarity_score=request.clarity_score,
    )
