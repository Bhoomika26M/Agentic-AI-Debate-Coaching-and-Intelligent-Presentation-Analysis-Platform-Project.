from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.argument_analyzer import analyze_argument


router = APIRouter(
    prefix="/api/v1/arguments",
    tags=["Argument Analysis"],
)


class ArgumentRequest(BaseModel):
    text: str = Field(
        min_length=10,
        max_length=10000,
        description="The argument to analyze",
    )


@router.post("/analyze")
def analyze(request: ArgumentRequest):
    return analyze_argument(request.text)