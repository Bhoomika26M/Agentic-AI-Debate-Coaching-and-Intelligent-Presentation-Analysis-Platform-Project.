from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.rebuttal_generator import generate_rebuttal


router = APIRouter(
    prefix="/api/v1/rebuttals",
    tags=["Rebuttal Generation"],
)


class RebuttalRequest(BaseModel):
    argument: str = Field(
        min_length=10,
        max_length=10000,
        description="The opposing argument to respond to",
    )


@router.post("/generate")
def create_rebuttal(request: RebuttalRequest):
    return generate_rebuttal(request.argument)