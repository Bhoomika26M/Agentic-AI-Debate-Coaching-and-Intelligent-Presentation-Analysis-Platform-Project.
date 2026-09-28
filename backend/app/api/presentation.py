from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from typing import Dict
from ..services.presentation_engine import presentation_engine
from .deps import get_current_active_user
from ..models.user import User

router = APIRouter(prefix="/presentation", tags=["presentation"])

@router.post("/analyze-speech")
async def analyze_speech(file: UploadFile = File(...), current_user: User = Depends(get_current_active_user)):
    # In a real app, save the file to AWS S3/Azure or local storage, then process.
    # We pass the filename here as a mock.
    result = await presentation_engine.analyze_speech(file.filename)
    return result

@router.post("/evaluate-delivery")
async def evaluate_delivery(file: UploadFile = File(...), current_user: User = Depends(get_current_active_user)):
    # Mock file processing
    result = await presentation_engine.evaluate_delivery(file.filename)
    return result
