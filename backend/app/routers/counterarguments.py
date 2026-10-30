from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.argument import Counterargument
from app.schemas.argument import CounterargumentRequest, CounterargumentOut
from app.services.ai_service import ai_service

router = APIRouter(prefix="/counterarguments", tags=["Counterarguments"])

@router.post("/generate", response_model=CounterargumentOut)
def generate_counterarguments(
    req: CounterargumentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    clean_text = req.argument.strip()
    if len(clean_text) < 5:
        raise HTTPException(status_code=400, detail="Argument text must be at least 5 characters.")

    result = ai_service.generate_counterarguments(clean_text, req.topic)

    record = Counterargument(
        user_id=current_user.id,
        topic=req.topic,
        input_argument=clean_text,
        logical_rebuttals=result.get("logical_rebuttals", []),
        evidence_based_rebuttals=result.get("evidence_based_rebuttals", []),
        ethical_counterarguments=result.get("ethical_counterarguments", []),
        practical_counterarguments=result.get("practical_counterarguments", []),
        policy_counterarguments=result.get("policy_counterarguments", []),
        alternative_perspectives=result.get("alternative_perspectives", []),
        challenge_questions=result.get("challenge_questions", []),
        debate_strategy_suggestions=result.get("debate_strategy_suggestions", [])
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    out_dict = CounterargumentOut.model_validate(record).model_dump()
    out_dict["inference_mode"] = ai_service.get_inference_mode()
    return out_dict

@router.get("/history", response_model=List[CounterargumentOut])
def get_counterargument_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    records = db.query(Counterargument).filter(
        Counterargument.user_id == current_user.id
    ).order_by(Counterargument.created_at.desc()).limit(20).all()

    mode = ai_service.get_inference_mode()
    out = []
    for r in records:
        d = CounterargumentOut.model_validate(r).model_dump()
        d["inference_mode"] = mode
        out.append(d)
    return out
