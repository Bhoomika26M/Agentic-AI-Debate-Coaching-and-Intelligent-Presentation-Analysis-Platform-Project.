from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.models.analysis import ArgumentAnalysis, FallacyDetection, CounterArgument
from app.schemas.analysis import (
    ArgumentAnalysisRequest, ArgumentAnalysisOut,
    FallacyRequest, FallacyOut,
    CounterArgumentRequest, CounterArgumentOut,
)
from app.core.deps import get_current_user
from app.services import gemini_service

router = APIRouter(prefix="/api/analysis", tags=["analysis"])

@router.post("/argument", response_model=ArgumentAnalysisOut)
def analyze_argument(payload: ArgumentAnalysisRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        result = gemini_service.analyze_argument(payload.argument_text, payload.topic)
    except gemini_service.GeminiError as e:
        raise HTTPException(status_code=503, detail=str(e))

    overall = round((
        result.get("clarity_score", 50) * 0.25 +
        result.get("relevance_score", 50) * 0.25 +
        result.get("logical_consistency_score", 50) * 0.30 +
        result.get("persuasiveness_score", 50) * 0.20
    ), 2)

    record = ArgumentAnalysis(
        user_id=user.id, session_id=payload.session_id,
        argument_text=payload.argument_text,
        analysis_json=result, overall_score=overall,
    )
    db.add(record); db.commit(); db.refresh(record)

    return ArgumentAnalysisOut(
        id=record.id,
        main_claim=result.get("main_claim", ""),
        supporting_reasons=result.get("supporting_reasons", []),
        evidence_used=result.get("evidence_used", []),
        missing_evidence=result.get("missing_evidence", []),
        clarity_score=result.get("clarity_score", 0),
        relevance_score=result.get("relevance_score", 0),
        logical_consistency_score=result.get("logical_consistency_score", 0),
        persuasiveness_score=result.get("persuasiveness_score", 0),
        strengths=result.get("strengths", []),
        weaknesses=result.get("weaknesses", []),
        improvement_suggestions=result.get("improvement_suggestions", []),
        overall_score=overall,
    )

@router.post("/fallacy", response_model=FallacyOut)
def detect_fallacy(payload: FallacyRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        result = gemini_service.detect_fallacies(payload.argument_text)
    except gemini_service.GeminiError as e:
        raise HTTPException(status_code=503, detail=str(e))
    record = FallacyDetection(user_id=user.id, argument_text=payload.argument_text, fallacies_json=result)
    db.add(record); db.commit(); db.refresh(record)
    note = ("No clear logical fallacy detected. Fallacy identification depends on context and can be uncertain."
            if not result.get("fallacies") else
            "Fallacy identification is context-dependent; confidence levels are shown per item.")
    return FallacyOut(id=record.id, fallacies=result.get("fallacies", []), note=note)

@router.post("/counterargument", response_model=CounterArgumentOut)
def counterargument(payload: CounterArgumentRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        result = gemini_service.generate_counterarguments(payload.claim, payload.topic)
    except gemini_service.GeminiError as e:
        raise HTTPException(status_code=503, detail=str(e))
    record = CounterArgument(user_id=user.id, claim=payload.claim, counterarguments_json=result)
    db.add(record); db.commit(); db.refresh(record)
    return CounterArgumentOut(
        id=record.id,
        counterarguments=result.get("counterarguments", []),
        challenge_questions=result.get("challenge_questions", []),
        strategy_suggestions=result.get("strategy_suggestions", []),
    )

@router.get("/history")
def history(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return {
        "arguments": [{"id": a.id, "text": a.argument_text[:120], "score": a.overall_score,
                       "created_at": a.created_at.isoformat()}
                      for a in db.query(ArgumentAnalysis).filter_by(user_id=user.id).order_by(ArgumentAnalysis.created_at.desc()).limit(20)],
        "fallacies": [{"id": f.id, "text": f.argument_text[:120],
                       "count": len(f.fallacies_json.get("fallacies", [])),
                       "created_at": f.created_at.isoformat()}
                      for f in db.query(FallacyDetection).filter_by(user_id=user.id).order_by(FallacyDetection.created_at.desc()).limit(20)],
        "counterarguments": [{"id": c.id, "claim": c.claim[:120],
                              "created_at": c.created_at.isoformat()}
                             for c in db.query(CounterArgument).filter_by(user_id=user.id).order_by(CounterArgument.created_at.desc()).limit(20)],
    }