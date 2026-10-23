import json
from app.services.local_ai import generate_ai_response
from fastapi import APIRouter
from pydantic import BaseModel, Field


from app.services.argument_analyzer import (
    analyze_argument,
    analyze_argument_with_ai,
)

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
    try:
        return analyze_argument_with_ai(request.text)
    except Exception as error:
        print(f"AI analysis failed; using rule-based analysis: {error}")
        return analyze_argument(request.text)
