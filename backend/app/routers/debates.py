import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas, auth
from ..database import get_db
from ..nlp import argument_analysis, fallacy_detection, counterargument, scoring

router = APIRouter(prefix="/debates", tags=["debates"])


@router.post("/sessions", response_model=schemas.DebateSessionOut, status_code=201)
def create_session(
    session_in: schemas.DebateSessionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    session = models.DebateSession(
        owner_id=current_user.id,
        topic=session_in.topic,
        debate_format=session_in.debate_format,
        position=session_in.position,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("/sessions", response_model=list[schemas.DebateSessionOut])
def list_sessions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    return (
        db.query(models.DebateSession)
        .filter(models.DebateSession.owner_id == current_user.id)
        .order_by(models.DebateSession.created_at.desc())
        .all()
    )


def _get_owned_session(session_id: int, db: Session, current_user: models.User) -> models.DebateSession:
    session = (
        db.query(models.DebateSession)
        .filter(
            models.DebateSession.id == session_id,
            models.DebateSession.owner_id == current_user.id,
        )
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Debate session not found")
    return session


def _build_analysis_out(analysis: models.AnalysisResult) -> schemas.AnalysisOut:
    return schemas.AnalysisOut(
        id=analysis.id,
        argument_id=analysis.argument_id,
        clarity=analysis.clarity,
        relevance=analysis.relevance,
        evidence_strength=analysis.evidence_strength,
        logical_consistency=analysis.logical_consistency,
        persuasiveness=analysis.persuasiveness,
        argument_quality_score=analysis.argument_quality_score,
        evidence_usage_score=analysis.evidence_usage_score,
        logical_consistency_score=analysis.logical_consistency_score,
        rebuttal_effectiveness_score=analysis.rebuttal_effectiveness_score,
        communication_skills_score=analysis.communication_skills_score,
        overall_score=analysis.overall_score,
        fallacies=[schemas.FallacyOut(**f) for f in json.loads(analysis.fallacies_json)],
        counterarguments=[
            schemas.CounterargumentOut(**c) for c in json.loads(analysis.counterarguments_json)
        ],
        claims=json.loads(analysis.claims_json),
        recommendations=json.loads(analysis.recommendations_json),
    )


@router.post("/arguments", response_model=schemas.ArgumentOut, status_code=201)
def submit_argument(
    arg_in: schemas.ArgumentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    session = _get_owned_session(arg_in.session_id, db, current_user)

    argument = models.Argument(session_id=session.id, text=arg_in.text)
    db.add(argument)
    db.commit()
    db.refresh(argument)

    # ---- Run the agentic analysis pipeline (fully local/free) ----
    analysis_dict = argument_analysis.analyze_argument(arg_in.text, topic=session.topic)
    fallacies = fallacy_detection.detect_fallacies(arg_in.text)
    counter = counterargument.generate_counterarguments(analysis_dict["claims"])
    scores = scoring.compute_scores(analysis_dict, fallacy_count=len(fallacies))
    recommendations = scoring.generate_recommendations(analysis_dict, fallacies, scores)

    all_counterarguments = counter["counterarguments"] + [
        {"type": "Challenge Question", "text": q} for q in counter["challenge_questions"]
    ]

    result = models.AnalysisResult(
        argument_id=argument.id,
        clarity=analysis_dict["clarity"],
        relevance=analysis_dict["relevance"],
        evidence_strength=analysis_dict["evidence_strength"],
        logical_consistency=analysis_dict["logical_consistency"],
        persuasiveness=analysis_dict["persuasiveness"],
        argument_quality_score=scores["argument_quality_score"],
        evidence_usage_score=scores["evidence_usage_score"],
        logical_consistency_score=scores["logical_consistency_score"],
        rebuttal_effectiveness_score=scores["rebuttal_effectiveness_score"],
        communication_skills_score=scores["communication_skills_score"],
        overall_score=scores["overall_score"],
        fallacies_json=json.dumps(fallacies),
        counterarguments_json=json.dumps(all_counterarguments),
        claims_json=json.dumps(analysis_dict["claims"]),
        recommendations_json=json.dumps(recommendations),
    )
    db.add(result)
    db.commit()
    db.refresh(result)
    db.refresh(argument)

    return schemas.ArgumentOut(
        id=argument.id,
        session_id=argument.session_id,
        text=argument.text,
        created_at=argument.created_at,
        analysis=_build_analysis_out(result),
    )


@router.get("/sessions/{session_id}/arguments", response_model=list[schemas.ArgumentOut])
def list_arguments(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    session = _get_owned_session(session_id, db, current_user)
    out = []
    for argument in sorted(session.arguments, key=lambda a: a.created_at):
        analysis_out = _build_analysis_out(argument.analysis) if argument.analysis else None
        out.append(
            schemas.ArgumentOut(
                id=argument.id,
                session_id=argument.session_id,
                text=argument.text,
                created_at=argument.created_at,
                analysis=analysis_out,
            )
        )
    return out
