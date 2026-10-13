
from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.presentation_analyzer import analyze_presentation


router = APIRouter(
    prefix="/api/v1/presentations",
    tags=["Presentation Coaching"],
)


class PresentationRequest(BaseModel):
    text: str = Field(
        ...,
        min_length=1,
        max_length=10000,
        description="The presentation script to analyze.",
    )


@router.post("/analyze")
def analyze_presentation_script(
    request: PresentationRequest,
):
    return analyze_presentation(request.text)
