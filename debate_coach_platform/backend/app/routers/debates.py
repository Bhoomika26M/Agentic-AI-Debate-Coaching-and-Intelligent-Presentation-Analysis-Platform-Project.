from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.models.debate import (
    DebateTopic,
    DebateSession,
    SessionParticipant,
    DebateFormat,
    SessionStatus,
    ParticipantPosition,
)
from app.schemas.debate import (
    DebateTopicCreate,
    DebateTopicRead,
    DebateSessionCreate,
    DebateSessionUpdate,
    DebateSessionRead,
    ParticipantJoinRequest,
    ParticipantRead,
)
from app.security.rbac import get_current_active_user, require_roles

router = APIRouter(prefix="/debates", tags=["Debate Session Management"])

# --- DEBATE FORMATS ---
@router.get("/formats", response_model=List[dict])
def list_supported_debate_formats():
    return [
        {
            "id": DebateFormat.ONE_ON_ONE,
            "name": DebateFormat.ONE_ON_ONE,
            "description": "Head-to-head proposition vs. opposition debate with strict alternating speaking rounds.",
            "team_size": 1,
            "rounds": ["Opening Proposition (4m)", "Opening Opposition (4m)", "Rebuttal Prop (3m)", "Closing Opp (3m)"]
        },
        {
            "id": DebateFormat.PARLIAMENTARY,
            "name": DebateFormat.PARLIAMENTARY,
            "description": "British Parliamentary style featuring Government vs Opposition teams with Points of Information (POI).",
            "team_size": 2,
            "rounds": ["Prime Minister", "Leader of Opposition", "Deputy PM", "Deputy Opposition", "Member Speeches", "Whip Speeches"]
        },
        {
            "id": DebateFormat.OXFORD,
            "name": DebateFormat.OXFORD,
            "description": "Traditional Oxford Union style with pre-debate and post-debate audience voting swings determining the victor.",
            "team_size": 2,
            "rounds": ["First Proposition", "First Opposition", "Second Proposition", "Second Opposition", "Floor Questions", "Summaries"]
        },
        {
            "id": DebateFormat.POLICY,
            "name": DebateFormat.POLICY,
            "description": "Evidence-heavy debate focusing on policy implementation, harms, inherency, solvency, and counterplans.",
            "team_size": 2,
            "rounds": ["Constructive Speeches (8m)", "Cross-Examinations (3m)", "Rebuttal Speeches (5m)"]
        },
        {
            "id": DebateFormat.PUBLIC_FORUM,
            "name": DebateFormat.PUBLIC_FORUM,
            "description": "Current events debate structured with rapid crossfire questioning accessible to citizen audiences.",
            "team_size": 2,
            "rounds": ["Constructive (4m)", "Crossfire (3m)", "Rebuttal (4m)", "Grand Crossfire (3m)", "Final Focus (2m)"]
        },
        {
            "id": DebateFormat.AI_SIMULATION,
            "name": DebateFormat.AI_SIMULATION,
            "description": "Adaptive AI Agent sparring partner simulating diverse persona styles and dynamic counterargument generation.",
            "team_size": 1,
            "rounds": ["Human Argument", "AI Fallacy Scan & Rebuttal", "Cross-Examination Challenge", "Closing Feedback"]
        }
    ]

# --- TOPIC MANAGEMENT ---
@router.get("/topics", response_model=List[DebateTopicRead])
def list_debate_topics(
    category: Optional[str] = Query(None, description="Filter topics by category"),
    search: Optional[str] = Query(None, description="Search keyword in title or motion"),
    db: Session = Depends(get_db)
):
    query = db.query(DebateTopic)
    if category:
        query = query.filter(DebateTopic.category == category)
    if search:
        query = query.filter(
            DebateTopic.title.ilike(f"%{search}%") | DebateTopic.motion_text.ilike(f"%{search}%")
        )
    return query.order_by(DebateTopic.created_at.desc()).all()


@router.post("/topics", response_model=DebateTopicRead, status_code=status.HTTP_201_CREATED)
def create_debate_topic(
    topic_in: DebateTopicCreate,
    current_user: User = Depends(require_roles(UserRole.COACH, UserRole.EDUCATOR, UserRole.ADMIN)),
    db: Session = Depends(get_db)
):
    new_topic = DebateTopic(
        title=topic_in.title,
        motion_text=topic_in.motion_text,
        category=topic_in.category,
        difficulty_level=topic_in.difficulty_level,
        proposition_stance=topic_in.proposition_stance,
        opposition_stance=topic_in.opposition_stance,
        created_by=current_user.id
    )
    db.add(new_topic)
    db.commit()
    db.refresh(new_topic)
    return new_topic


@router.get("/topics/{topic_id}", response_model=DebateTopicRead)
def get_debate_topic_by_id(topic_id: str, db: Session = Depends(get_db)):
    topic = db.query(DebateTopic).filter(DebateTopic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Debate topic not found")
    return topic

# --- DEBATE SESSION MANAGEMENT ---
@router.get("/sessions", response_model=List[DebateSessionRead])
def list_debate_sessions(
    status_filter: Optional[str] = Query(None, alias="status"),
    debate_format: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(DebateSession)
    if status_filter:
        query = query.filter(DebateSession.status == status_filter)
    if debate_format:
        query = query.filter(DebateSession.debate_format == debate_format)
    
    sessions = query.order_by(DebateSession.scheduled_start.desc()).all()
    
    # Enrich participant data with user names
    results = []
    for s in sessions:
        participants_data = []
        for p in s.participants:
            u = p.user
            participants_data.append(
                ParticipantRead(
                    id=p.id,
                    session_id=p.session_id,
                    user_id=p.user_id,
                    position=p.position,
                    speaking_order=p.speaking_order,
                    score_awarded=p.score_awarded,
                    joined_at=p.joined_at,
                    user_name=u.full_name if u else "Unknown",
                    user_role=u.role if u else "Learner"
                )
            )
        
        session_read = DebateSessionRead(
            id=s.id,
            topic_id=s.topic_id,
            debate_format=s.debate_format,
            session_title=s.session_title,
            status=s.status,
            scheduled_start=s.scheduled_start,
            actual_start=s.actual_start,
            actual_end=s.actual_end,
            created_by=s.created_by,
            created_at=s.created_at,
            topic=DebateTopicRead.model_validate(s.topic) if s.topic else None,
            participants=participants_data
        )
        results.append(session_read)
    return results


@router.post("/sessions", response_model=DebateSessionRead, status_code=status.HTTP_201_CREATED)
def schedule_debate_session(
    session_in: DebateSessionCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Validate topic
    topic = db.query(DebateTopic).filter(DebateTopic.id == session_in.topic_id).first()
    if not topic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Specified debate topic does not exist")
    
    # Validate format
    if session_in.debate_format not in DebateFormat.ALL:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid debate format. Choose one of: {', '.join(DebateFormat.ALL)}"
        )
    
    new_session = DebateSession(
        topic_id=session_in.topic_id,
        debate_format=session_in.debate_format,
        session_title=session_in.session_title,
        status=SessionStatus.SCHEDULED,
        scheduled_start=session_in.scheduled_start,
        created_by=current_user.id
    )
    db.add(new_session)
    db.flush()

    # Automatically add creator as participant with requested initial position
    initial_position = session_in.initial_position or ParticipantPosition.PROPOSITION
    if initial_position not in ParticipantPosition.ALL:
        initial_position = ParticipantPosition.PROPOSITION
    
    participant = SessionParticipant(
        session_id=new_session.id,
        user_id=current_user.id,
        position=initial_position,
        speaking_order=1
    )
    db.add(participant)
    db.commit()
    db.refresh(new_session)

    # If it is an AI Debate Simulation, also attach the AI Opponent participant record
    if new_session.debate_format == DebateFormat.AI_SIMULATION:
        ai_position = ParticipantPosition.OPPOSITION if initial_position == ParticipantPosition.PROPOSITION else ParticipantPosition.PROPOSITION
        ai_participant = SessionParticipant(
            session_id=new_session.id,
            user_id=current_user.id, # linked session marker
            position=ai_position,
            speaking_order=2
        )
        # Note: in later milestones this links directly to the AI Agent runner
        db.add(ai_participant)
        db.commit()
        db.refresh(new_session)

    # Format return
    participants_data = [
        ParticipantRead(
            id=p.id,
            session_id=p.session_id,
            user_id=p.user_id,
            position=p.position,
            speaking_order=p.speaking_order,
            score_awarded=p.score_awarded,
            joined_at=p.joined_at,
            user_name=current_user.full_name,
            user_role=current_user.role
        )
        for p in new_session.participants
    ]

    return DebateSessionRead(
        id=new_session.id,
        topic_id=new_session.topic_id,
        debate_format=new_session.debate_format,
        session_title=new_session.session_title,
        status=new_session.status,
        scheduled_start=new_session.scheduled_start,
        actual_start=new_session.actual_start,
        actual_end=new_session.actual_end,
        created_by=new_session.created_by,
        created_at=new_session.created_at,
        topic=DebateTopicRead.model_validate(topic),
        participants=participants_data
    )


@router.get("/sessions/{session_id}", response_model=DebateSessionRead)
def get_debate_session_by_id(session_id: str, db: Session = Depends(get_db)):
    session = db.query(DebateSession).filter(DebateSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Debate session not found")
    
    participants_data = [
        ParticipantRead(
            id=p.id,
            session_id=p.session_id,
            user_id=p.user_id,
            position=p.position,
            speaking_order=p.speaking_order,
            score_awarded=p.score_awarded,
            joined_at=p.joined_at,
            user_name=p.user.full_name if p.user else "User",
            user_role=p.user.role if p.user else "Learner"
        )
        for p in session.participants
    ]

    return DebateSessionRead(
        id=session.id,
        topic_id=session.topic_id,
        debate_format=session.debate_format,
        session_title=session.session_title,
        status=session.status,
        scheduled_start=session.scheduled_start,
        actual_start=session.actual_start,
        actual_end=session.actual_end,
        created_by=session.created_by,
        created_at=session.created_at,
        topic=DebateTopicRead.model_validate(session.topic) if session.topic else None,
        participants=participants_data
    )


@router.patch("/sessions/{session_id}", response_model=DebateSessionRead)
def update_debate_session(
    session_id: str,
    updates: DebateSessionUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    session = db.query(DebateSession).filter(DebateSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Debate session not found")
    
    # Only creator, Coach, or Admin can edit session
    if session.created_by != current_user.id and current_user.role not in [UserRole.COACH, UserRole.ADMIN]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied to modify this session")
    
    if updates.session_title:
        session.session_title = updates.session_title
    if updates.scheduled_start:
        session.scheduled_start = updates.scheduled_start
    if updates.status:
        if updates.status not in SessionStatus.ALL:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid session status")
        session.status = updates.status
        if updates.status == SessionStatus.IN_PROGRESS and not session.actual_start:
            session.actual_start = datetime.now(timezone.utc)
        elif updates.status == SessionStatus.COMPLETED and not session.actual_end:
            session.actual_end = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(session)
    return get_debate_session_by_id(session_id, db)


@router.post("/sessions/{session_id}/join", response_model=DebateSessionRead)
def join_debate_session(
    session_id: str,
    req: ParticipantJoinRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    session = db.query(DebateSession).filter(DebateSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Debate session not found")
    
    if req.position not in ParticipantPosition.ALL:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid position")

    # Check if user already joined
    existing_participant = db.query(SessionParticipant).filter(
        SessionParticipant.session_id == session_id,
        SessionParticipant.user_id == current_user.id
    ).first()

    if existing_participant:
        # Update existing position
        existing_participant.position = req.position
        existing_participant.speaking_order = req.speaking_order
    else:
        participant = SessionParticipant(
            session_id=session_id,
            user_id=current_user.id,
            position=req.position,
            speaking_order=req.speaking_order
        )
        db.add(participant)
    
    db.commit()
    return get_debate_session_by_id(session_id, db)


@router.post("/sessions/{session_id}/leave")
def leave_debate_session(
    session_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    participant = db.query(SessionParticipant).filter(
        SessionParticipant.session_id == session_id,
        SessionParticipant.user_id == current_user.id
    ).first()

    if not participant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User is not a participant in this session")
    
    db.delete(participant)
    db.commit()
    return {"message": "Successfully left the debate session"}
