import os
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User, UserRole
from app.models.debate import (
    DebateSession,
    DebateParticipant,
    DebateMessage,
    DebateEvaluation,
    DebateStatus,
    DebatePosition,
    DebateFormat
)
from app.schemas.debate import (
    DebateCreate,
    DebateSessionOut,
    DebateMessageCreate,
    DebateMessageOut,
    DebateEvaluationOut
)
from app.services.ai_service import ai_service
from app.services.export_service import export_service

router = APIRouter(prefix="/debates", tags=["Debate Sessions"])

@router.post("/", response_model=DebateSessionOut)
def create_debate(
    debate_in: DebateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ai_pos = DebatePosition.AGAINST if debate_in.user_position == DebatePosition.FOR else DebatePosition.FOR

    debate = DebateSession(
        creator_id=current_user.id,
        title=debate_in.title,
        topic=debate_in.topic,
        format=debate_in.format,
        difficulty=debate_in.difficulty,
        duration_minutes=debate_in.duration_minutes,
        user_position=debate_in.user_position,
        ai_position=ai_pos,
        status=DebateStatus.IN_PROGRESS,
        current_round=1,
        max_rounds=debate_in.max_rounds
    )
    db.add(debate)
    db.commit()
    db.refresh(debate)

    # Participants
    p1 = DebateParticipant(
        debate_id=debate.id,
        user_id=current_user.id,
        name=current_user.full_name,
        position=debate_in.user_position,
        is_ai=False,
        role_name="Prime Debater"
    )
    p2 = DebateParticipant(
        debate_id=debate.id,
        user_id=None,
        name=f"JustiTalk {debate_in.difficulty} AI",
        position=ai_pos,
        is_ai=True,
        role_name="AI Opponent"
    )
    db.add_all([p1, p2])

    # If user is AGAINST, AI speaks first (Opening speech). If user is FOR, AI can greet or wait for user.
    if debate_in.user_position == DebatePosition.AGAINST:
        ai_turn = ai_service.generate_debate_turn(
            topic=debate.topic,
            user_position=debate.user_position.value,
            ai_position=debate.ai_position.value,
            difficulty=debate.difficulty,
            current_round=1,
            messages_history=[]
        )
        opening_msg = DebateMessage(
            debate_id=debate.id,
            round_number=1,
            sender_type="ai",
            sender_name=f"JustiTalk {debate_in.difficulty} AI",
            content=ai_turn["response_content"],
            instant_critique=ai_turn.get("instant_critique")
        )
        db.add(opening_msg)

    # Update profile counter
    if current_user.profile:
        current_user.profile.total_debates += 1
        db.commit()

    db.commit()
    db.refresh(debate)
    return debate

@router.get("/", response_model=List[DebateSessionOut])
def list_debates(
    status_filter: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(DebateSession).order_by(DebateSession.created_at.desc())
    if status_filter:
        query = query.filter(DebateSession.status == status_filter)
    return query.limit(limit).all()

@router.get("/my-history", response_model=List[DebateSessionOut])
def list_my_debates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(DebateSession).filter(
        DebateSession.creator_id == current_user.id
    ).order_by(DebateSession.created_at.desc()).all()

@router.get("/{debate_id}", response_model=DebateSessionOut)
def get_debate(debate_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    debate = db.query(DebateSession).filter(DebateSession.id == debate_id).first()
    if not debate:
        raise HTTPException(status_code=404, detail="Debate session not found")
    return debate

@router.post("/{debate_id}/turn", response_model=DebateSessionOut)
def submit_debate_turn(
    debate_id: int,
    message_in: DebateMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    debate = db.query(DebateSession).filter(DebateSession.id == debate_id).first()
    if not debate:
        raise HTTPException(status_code=404, detail="Debate session not found")
    
    # Ownership and authorization verification
    if debate.creator_id != current_user.id and current_user.role != UserRole.ADMINISTRATOR:
        raise HTTPException(status_code=403, detail="You are not authorized to participate in this debate session.")

    if debate.status == DebateStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="This debate session is already completed.")

    clean_content = message_in.content.strip()
    if len(clean_content) < 2:
        raise HTTPException(status_code=400, detail="Turn statement must be at least 2 characters.")

    # 1. Add User Message
    user_msg = DebateMessage(
        debate_id=debate.id,
        round_number=debate.current_round,
        sender_type="user",
        sender_name=current_user.full_name,
        content=clean_content
    )
    db.add(user_msg)
    db.commit()

    # 2. Build history for AI context
    all_msgs = db.query(DebateMessage).filter(DebateMessage.debate_id == debate.id).order_by(DebateMessage.id).all()
    history_dicts = [{"sender_type": m.sender_type, "sender_name": m.sender_name, "content": m.content} for m in all_msgs]

    # 3. AI Opponent Turn
    ai_turn = ai_service.generate_debate_turn(
        topic=debate.topic,
        user_position=debate.user_position.value,
        ai_position=debate.ai_position.value,
        difficulty=debate.difficulty,
        current_round=debate.current_round,
        messages_history=history_dicts
    )

    ai_msg = DebateMessage(
        debate_id=debate.id,
        round_number=debate.current_round,
        sender_type="ai",
        sender_name=f"JustiTalk {debate.difficulty} AI",
        content=ai_turn["response_content"],
        instant_critique=ai_turn.get("instant_critique")
    )
    db.add(ai_msg)

    # Increment round
    if debate.current_round < debate.max_rounds:
        debate.current_round += 1
    else:
        # Max rounds reached -> auto-finalize
        debate.status = DebateStatus.COMPLETED
        debate.ended_at = datetime.utcnow()

    db.commit()
    db.refresh(debate)
    return debate

@router.post("/{debate_id}/evaluate", response_model=DebateEvaluationOut)
def evaluate_debate(
    debate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    debate = db.query(DebateSession).filter(DebateSession.id == debate_id).first()
    if not debate:
        raise HTTPException(status_code=404, detail="Debate session not found")

    # Authorization verification
    if debate.creator_id != current_user.id and current_user.role != UserRole.ADMINISTRATOR:
        raise HTTPException(status_code=403, detail="You are not authorized to evaluate this debate session.")

    if debate.evaluation:
        return debate.evaluation

    all_msgs = db.query(DebateMessage).filter(DebateMessage.debate_id == debate.id).order_by(DebateMessage.id).all()
    history_dicts = [{"sender_type": m.sender_type, "sender_name": m.sender_name, "content": m.content} for m in all_msgs]

    eval_result = ai_service.evaluate_debate(
        topic=debate.topic,
        user_position=debate.user_position.value,
        ai_position=debate.ai_position.value,
        messages_history=history_dicts
    )

    evaluation = DebateEvaluation(
        debate_id=debate.id,
        user_id=debate.creator_id,
        argument_quality=eval_result["argument_quality"],
        evidence_usage=eval_result["evidence_usage"],
        logical_consistency=eval_result["logical_consistency"],
        rebuttal_effectiveness=eval_result["rebuttal_effectiveness"],
        communication_skills=eval_result["communication_skills"],
        total_score=eval_result["total_score"],
        winner=eval_result["winner"],
        summary=eval_result.get("summary"),
        strengths=eval_result.get("strengths", []),
        weaknesses=eval_result.get("weaknesses", []),
        actionable_feedback=eval_result.get("actionable_feedback", []),
        rubric_breakdown=eval_result.get("rubric_breakdown", {})
    )
    db.add(evaluation)

    debate.status = DebateStatus.COMPLETED
    debate.ended_at = datetime.utcnow()
    debate.winner = eval_result["winner"]

    # If user won, update profile
    creator = db.query(User).filter(User.id == debate.creator_id).first()
    if eval_result["winner"] == "User" and creator and creator.profile:
        creator.profile.debates_won += 1

    db.commit()
    db.refresh(evaluation)
    return evaluation

@router.get("/{debate_id}/export/pdf")
def export_debate_pdf(
    debate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    debate = db.query(DebateSession).filter(DebateSession.id == debate_id).first()
    if not debate:
        raise HTTPException(status_code=404, detail="Debate session not found")

    if debate.creator_id != current_user.id and current_user.role != UserRole.ADMINISTRATOR:
        raise HTTPException(status_code=403, detail="You are not authorized to export this debate dossier.")

    eval_dict = {}
    if debate.evaluation:
        eval_dict = {
            "argument_quality": debate.evaluation.argument_quality,
            "evidence_usage": debate.evaluation.evidence_usage,
            "logical_consistency": debate.evaluation.logical_consistency,
            "rebuttal_effectiveness": debate.evaluation.rebuttal_effectiveness,
            "communication_skills": debate.evaluation.communication_skills,
            "total_score": debate.evaluation.total_score,
            "summary": debate.evaluation.summary,
            "strengths": debate.evaluation.strengths,
            "actionable_feedback": debate.evaluation.actionable_feedback
        }

    debate_data = {
        "id": debate.id,
        "title": debate.title,
        "topic": debate.topic,
        "format": debate.format.value,
        "difficulty": debate.difficulty,
        "user_position": debate.user_position.value,
        "winner": debate.winner,
        "evaluation": eval_dict
    }

    pdf_path = export_service.generate_debate_pdf(debate_data)
    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=f"JustiTalk_Debate_{debate.id}_Report.pdf"
    )
