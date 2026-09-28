from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List
from backend.app.agents.argument_agent import argument_agent
from backend.app.agents.fallacy_agent import fallacy_agent
from backend.app.agents.counterargument_agent import counterargument_agent

router = APIRouter(prefix="/analysis", tags=["Analysis Engine"])

class ArgumentAnalyzeRequest(BaseModel):
    argument: str
    topic: str = "General Debate Topic"
    position: str = "For"

class FallacyAnalyzeRequest(BaseModel):
    statement: str

class CounterargumentRequest(BaseModel):
    argument: str
    topic: str = "General Debate Topic"
    position: str = "For"

@router.post("/argument", response_model=Dict[str, Any])
async def analyze_argument_endpoint(req: ArgumentAnalyzeRequest):
    return await argument_agent.analyze_argument(req.argument, req.topic, req.position)

@router.post("/fallacy", response_model=List[Dict[str, Any]])
async def analyze_fallacy_endpoint(req: FallacyAnalyzeRequest):
    return await fallacy_agent.detect_fallacies(req.statement)

@router.post("/counterargument", response_model=Dict[str, Any])
async def analyze_counterargument_endpoint(req: CounterargumentRequest):
    return await counterargument_agent.generate_counterarguments(req.argument, req.topic, req.position)
