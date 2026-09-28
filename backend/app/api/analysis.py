from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Dict, List
from ..services.llm_engine import llm_engine
from .deps import get_current_active_user
from ..models.user import User

router = APIRouter(prefix="/analysis", tags=["analysis"])

class ArgumentInput(BaseModel):
    text: str

@router.post("/analyze")
async def analyze_argument(input_data: ArgumentInput, current_user: User = Depends(get_current_active_user)):
    result = await llm_engine.analyze_argument(input_data.text)
    return result

@router.post("/fallacies")
async def detect_fallacies(input_data: ArgumentInput, current_user: User = Depends(get_current_active_user)):
    result = await llm_engine.detect_fallacies(input_data.text)
    return {"fallacies": result}

@router.post("/counterargument")
async def get_counterargument(input_data: ArgumentInput, current_user: User = Depends(get_current_active_user)):
    result = await llm_engine.generate_counterargument(input_data.text)
    return result
