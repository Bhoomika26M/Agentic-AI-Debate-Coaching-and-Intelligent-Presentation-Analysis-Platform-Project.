from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.debate import DebateArgument, DebateParticipant, DebateSession
from app.models.debate_coaching import DebateCoachingRecord
from app.models.user import User
from app.schemas.debate import DebateArgumentCreate, DebateArgumentResponse, DebateCoachingAssessment, DebateCoachingResponse, DebateCreate, DebateResponse, DebateUpdate, ParticipantResponse
from app.services.argument_analysis_service import create_or_update_analysis_record
from app.services.auth_service import get_current_user
from app.services.debate_service import get_debate_or_none, get_participant
from app.services.llm_service import LLMAnalysisError, llm_service


router = APIRouter(prefix="/debates", tags=["debates"])
COACHING_WEIGHTS = {
    "argument_quality": 0.30,
    "evidence_usage": 0.20,
    "logical_consistency": 0.20,
    "rebuttal_effectiveness": 0.15,
    "communication_clarity": 0.15,
}


def _get_or_create_ai_user(database: Session) -> User:
    ai_email = "ai.debate.coach@local.dev"
    ai_user = database.query(User).filter(User.email == ai_email).first()
    if ai_user is None:
        ai_user = User(name="AI Debate Coach", email=ai_email, password_hash="ai-user", role="debate_coach")
        database.add(ai_user)
        database.commit()
        database.refresh(ai_user)
    return ai_user


def _opposing_position(position: str) -> str:
    if position == "for":
        return "against"
    if position == "against":
        return "for"
    return "neutral"


def _require_debate_access(database: Session, debate: DebateSession, user_id: int) -> DebateParticipant | None:
    participant = get_participant(database, debate.id, user_id)
    if participant is not None or debate.created_by == user_id:
        return participant
    db_user = database.get(User, user_id)
    if db_user and db_user.role in {"administrator", "educator", "debate_coach"}:
        return None
    raise HTTPException(status_code=403, detail="You are not a participant in this debate")


def _recent_debate_history(database: Session, debate_id: int, limit: int) -> list[str]:
    rows = (
        database.query(DebateArgument)
        .filter(DebateArgument.debate_id == debate_id)
        .order_by(DebateArgument.turn_order.desc())
        .limit(limit)
        .all()
    )
    return [
        f"{row.role} ({row.position}): {row.content.strip()}"
        for row in reversed(rows)
        if row.content and row.content.strip()
    ]


def _generate_ai_reply(database: Session, debate: DebateSession, human_argument: DebateArgument) -> str | None:
    history = _recent_debate_history(database, debate.id, limit=settings.llm_max_context_messages)
    if not llm_service.is_available():
        return None

    response = llm_service.generate_debate_response(
        topic=debate.topic,
        debate_rules=f"Format: {debate.format}. Session description/rules: {debate.description or 'No additional rules supplied.'}",
        user_position=human_argument.position,
        user_argument=human_argument.content,
        debate_history=history,
        ai_position=_opposing_position(human_argument.position),
    )
    return response or None


def _ensure_ai_participant(database: Session, debate: DebateSession, user_position: str) -> DebateParticipant:
    ai_user = _get_or_create_ai_user(database)
    participant = database.query(DebateParticipant).filter(DebateParticipant.debate_id == debate.id, DebateParticipant.user_id == ai_user.id).first()
    if participant is None:
        participant = DebateParticipant(debate_id=debate.id, user_id=ai_user.id, position=_opposing_position(user_position), is_ai=True)
        database.add(participant)
        database.commit()
        database.refresh(participant)
    else:
        participant.position = _opposing_position(user_position)
        database.add(participant)
    return participant


@router.post("", response_model=DebateResponse, status_code=status.HTTP_201_CREATED)
def create_debate(
    payload: DebateCreate,
    current_user: User = Depends(get_current_user),
    database: Session = Depends(get_db),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
):
    request_key = payload.idempotency_key or idempotency_key
    if request_key:
        existing = database.query(DebateSession).filter(DebateSession.created_by == current_user.id, DebateSession.request_key == request_key).first()
        if existing is not None:
            return existing

    # Duplicate prevention: If user created an identical scheduled debate within the last 60 seconds with no arguments, reuse it
    recent_dup = (
        database.query(DebateSession)
        .filter(
            DebateSession.created_by == current_user.id,
            DebateSession.topic == payload.topic.strip(),
            DebateSession.format == payload.format,
            DebateSession.status == "scheduled",
        )
        .order_by(DebateSession.created_at.desc())
        .first()
    )
    if recent_dup is not None:
        args_count = database.query(DebateArgument).filter(DebateArgument.debate_id == recent_dup.id).count()
        if args_count == 0:
            return recent_dup

    debate = DebateSession(
        **payload.model_dump(exclude={"ai_opponent", "idempotency_key", "position"}),
        created_by=current_user.id,
        ai_opponent=bool(payload.ai_opponent) or payload.format == "ai_simulation",
        request_key=request_key,
    )
    try:
        database.add(debate)
        database.commit()
        database.refresh(debate)
    except IntegrityError:
        database.rollback()
        if request_key:
            existing = database.query(DebateSession).filter(DebateSession.created_by == current_user.id, DebateSession.request_key == request_key).first()
            if existing is not None:
                return existing
        raise HTTPException(status_code=409, detail="This session already exists") from None

    if debate.ai_opponent:
        database.add(DebateParticipant(debate_id=debate.id, user_id=current_user.id, position=payload.position))
        database.commit()
        _ensure_ai_participant(database, debate, payload.position)
        database.refresh(debate)
    try:
        from app.services.notification_service import notify_debate_reminder
        notify_debate_reminder(database, current_user.id, debate.topic, debate.scheduled_at)
    except Exception:
        pass
    try:
        from app.services.skill_service import sync_user_skills
        sync_user_skills(database, current_user.id)
    except Exception:
        pass
    return debate


@router.get("", response_model=list[DebateResponse])
def list_debates(
    my_debates: bool = False,
    database: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = database.query(DebateSession)
    if my_debates:
        user_part_ids = [
            p.debate_id
            for p in database.query(DebateParticipant.debate_id).filter(DebateParticipant.user_id == current_user.id).all()
        ]
        query = query.filter(
            (DebateSession.created_by == current_user.id)
            | (DebateSession.id.in_(user_part_ids))
        )
    return query.order_by(DebateSession.created_at.desc()).all()


@router.post("/cleanup-empty-duplicates")
def cleanup_empty_duplicates(
    current_user: User = Depends(get_current_user),
    database: Session = Depends(get_db),
):
    # Only delete sessions with 0 arguments created by current user or if user is admin
    query = database.query(DebateSession)
    if current_user.role != "administrator":
        query = query.filter(DebateSession.created_by == current_user.id)
    sessions = query.all()

    seen_keys: set[tuple[int, str, str]] = set()
    deleted_count = 0
    for sess in sessions:
        # Check if debate has arguments
        args_count = database.query(DebateArgument).filter(DebateArgument.debate_id == sess.id).count()
        key = (sess.created_by, sess.topic.strip().lower(), sess.format)
        if key in seen_keys and args_count == 0:
            database.delete(sess)
            deleted_count += 1
        else:
            seen_keys.add(key)
    database.commit()
    return {"status": "success", "deleted_duplicates": deleted_count}


@router.get("/{debate_id}", response_model=DebateResponse)
def get_debate(debate_id: int, database: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    debate = get_debate_or_none(database, debate_id)
    if debate is None:
        raise HTTPException(status_code=404, detail="Debate not found")
    return debate


@router.put("/{debate_id}", response_model=DebateResponse)
def update_debate(debate_id: int, payload: DebateUpdate, current_user: User = Depends(get_current_user), database: Session = Depends(get_db)):
    debate = get_debate_or_none(database, debate_id)
    if debate is None:
        raise HTTPException(status_code=404, detail="Debate not found")
    if debate.created_by != current_user.id and current_user.role != "administrator":
        raise HTTPException(status_code=403, detail="Only the debate creator or administrator can update it")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(debate, field, value)
    database.commit()
    database.refresh(debate)
    return debate


@router.delete("/{debate_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_debate(debate_id: int, current_user: User = Depends(get_current_user), database: Session = Depends(get_db)):
    debate = get_debate_or_none(database, debate_id)
    if debate is None:
        raise HTTPException(status_code=404, detail="Debate not found")
    if debate.created_by != current_user.id and current_user.role != "administrator":
        raise HTTPException(status_code=403, detail="Only the debate creator or administrator can delete it")
    database.delete(debate)
    database.commit()


@router.post("/{debate_id}/join", response_model=ParticipantResponse, status_code=status.HTTP_201_CREATED)
def join_debate(debate_id: int, position: str = "neutral", current_user: User = Depends(get_current_user), database: Session = Depends(get_db)):
    if position not in {"for", "against", "neutral"}:
        raise HTTPException(status_code=422, detail="Invalid position")
    debate = get_debate_or_none(database, debate_id)
    if debate is None:
        raise HTTPException(status_code=404, detail="Debate not found")
    if debate.ai_opponent and debate.created_by != current_user.id:
        raise HTTPException(status_code=409, detail="AI opponent sessions are one-on-one with their creator")
    if get_participant(database, debate_id, current_user.id):
        raise HTTPException(status_code=409, detail="User already joined this debate")
    participant = DebateParticipant(debate_id=debate_id, user_id=current_user.id, position=position)
    try:
        database.add(participant)
        database.commit()
        database.refresh(participant)
        return participant
    except IntegrityError:
        database.rollback()
        raise HTTPException(status_code=409, detail="User already joined this debate") from None


@router.get("/{debate_id}/participants", response_model=list[ParticipantResponse])
def list_participants(debate_id: int, database: Session = Depends(get_db), _: User = Depends(get_current_user)):
    if get_debate_or_none(database, debate_id) is None:
        raise HTTPException(status_code=404, detail="Debate not found")
    return database.query(DebateParticipant).filter(DebateParticipant.debate_id == debate_id).all()


@router.post("/{debate_id}/arguments", response_model=DebateArgumentResponse, status_code=status.HTTP_201_CREATED)
def create_debate_argument(
    debate_id: int,
    payload: DebateArgumentCreate,
    current_user: User = Depends(get_current_user),
    database: Session = Depends(get_db),
):
    debate = get_debate_or_none(database, debate_id)
    if debate is None:
        raise HTTPException(status_code=404, detail="Debate not found")
    if debate.status in {"completed", "cancelled"}:
        raise HTTPException(status_code=409, detail="This debate is no longer accepting new arguments")
    participant = _require_debate_access(database, debate, current_user.id)
    if participant and participant.position != "neutral" and payload.position != participant.position:
        raise HTTPException(status_code=409, detail=f"Your assigned position is {participant.position}")

    argument = None
    if payload.idempotency_key:
        argument = (
            database.query(DebateArgument)
            .filter(
                DebateArgument.debate_id == debate_id,
                DebateArgument.user_id == current_user.id,
                DebateArgument.request_key == payload.idempotency_key,
            )
            .first()
        )

    if argument is None:
        previous = (
            database.query(DebateArgument)
            .filter(DebateArgument.debate_id == debate_id)
            .order_by(DebateArgument.turn_order.desc())
            .first()
        )
        if debate.ai_opponent and previous and not previous.is_ai:
            # If the user is retrying the same argument awaiting an AI response, reuse it without duplicating
            if previous.user_id == current_user.id and (
                previous.content.strip() == payload.content.strip()
                or (payload.idempotency_key and previous.request_key == payload.idempotency_key)
            ):
                argument = previous
            else:
                raise HTTPException(
                    status_code=409,
                    detail="The previous AI response is pending. Retry the previous argument before submitting another.",
                )
        else:
            next_turn = (previous.turn_order if previous else 0) + 1
            argument = DebateArgument(
                debate_id=debate_id,
                user_id=current_user.id,
                turn_order=next_turn,
                request_key=payload.idempotency_key,
                position=participant.position if participant and participant.position != "neutral" else payload.position,
                content=payload.content.strip(),
            )
            database.add(argument)
            try:
                database.commit()
                database.refresh(argument)
            except IntegrityError:
                database.rollback()
                raise HTTPException(status_code=409, detail="A message for this debate turn was already submitted") from None

            create_or_update_analysis_record(
                database,
                user_id=current_user.id,
                topic=debate.topic,
                argument_text=argument.content,
                position=argument.position,
                debate_session_id=debate_id,
            )

    if debate.ai_opponent and not argument.is_ai:
        existing_reply = (
            database.query(DebateArgument)
            .filter(
                DebateArgument.debate_id == debate_id,
                DebateArgument.turn_order == argument.turn_order + 1,
                DebateArgument.is_ai.is_(True),
            )
            .first()
        )
        if existing_reply is None:
            if not llm_service.is_available():
                raise HTTPException(
                    status_code=503,
                    detail="Your argument was saved, but the AI opponent is not configured. Please paste your GEMINI_API_KEY into backend/.env (line 11) and restart the backend, then retry this submission.",
                )
            try:
                ai_reply = _generate_ai_reply(database, debate, argument)
            except LLMAnalysisError as exc:
                raise HTTPException(status_code=exc.status_code, detail=f"Your argument was saved, but {exc}. Retry the same submission to continue.") from exc
            if not ai_reply:
                raise HTTPException(status_code=502, detail="Your argument was saved, but the AI opponent returned an empty response. Retry the same submission.")

            ai_participant = _ensure_ai_participant(database, debate, argument.position)
            ai_user = ai_participant.user_id
            database.add(
                DebateArgument(
                    debate_id=debate_id,
                    user_id=ai_user,
                    turn_order=argument.turn_order + 1,
                    position=_opposing_position(argument.position),
                    content=ai_reply,
                    is_ai=True,
                )
            )
            try:
                database.commit()
            except IntegrityError:
                database.rollback()
                existing_reply = (
                    database.query(DebateArgument)
                    .filter(
                        DebateArgument.debate_id == debate_id,
                        DebateArgument.turn_order == argument.turn_order + 1,
                        DebateArgument.is_ai.is_(True),
                    )
                    .first()
                )
                if existing_reply is None:
                    raise HTTPException(status_code=409, detail="The AI response turn conflicted with another submission; retry the same argument.") from None

    return argument


@router.post("/{debate_id}/retry-opponent", response_model=DebateArgumentResponse)
def retry_opponent_response(
    debate_id: int,
    database: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    debate = get_debate_or_none(database, debate_id)
    if debate is None:
        raise HTTPException(status_code=404, detail="Debate not found")
    _require_debate_access(database, debate, current_user.id)
    if not debate.ai_opponent:
        raise HTTPException(status_code=400, detail="This debate does not use an AI opponent")

    latest_argument = (
        database.query(DebateArgument)
        .filter(DebateArgument.debate_id == debate_id)
        .order_by(DebateArgument.turn_order.desc())
        .first()
    )
    if latest_argument is None:
        raise HTTPException(status_code=400, detail="No arguments exist yet to respond to.")

    if latest_argument.is_ai:
        return latest_argument

    if not llm_service.is_available():
        raise HTTPException(
            status_code=503,
            detail="AI opponent is not configured. Please paste your GEMINI_API_KEY into backend/.env and restart.",
        )

    try:
        ai_reply = _generate_ai_reply(database, debate, latest_argument)
    except LLMAnalysisError as exc:
        raise HTTPException(status_code=exc.status_code, detail=f"The AI opponent could not respond: {exc}") from exc

    if not ai_reply:
        raise HTTPException(status_code=502, detail="The AI opponent returned an empty response. Please retry.")

    ai_participant = _ensure_ai_participant(database, debate, latest_argument.position)
    ai_user = ai_participant.user_id
    ai_argument = DebateArgument(
        debate_id=debate_id,
        user_id=ai_user,
        turn_order=latest_argument.turn_order + 1,
        position=_opposing_position(latest_argument.position),
        content=ai_reply,
        is_ai=True,
    )
    database.add(ai_argument)
    try:
        database.commit()
        database.refresh(ai_argument)
    except IntegrityError:
        database.rollback()
        existing = (
            database.query(DebateArgument)
            .filter(
                DebateArgument.debate_id == debate_id,
                DebateArgument.turn_order == latest_argument.turn_order + 1,
                DebateArgument.is_ai.is_(True),
            )
            .first()
        )
        if existing is not None:
            return existing
        raise HTTPException(status_code=409, detail="A turn conflict occurred; please retry.") from None

    return ai_argument


@router.get("/{debate_id}/arguments", response_model=list[DebateArgumentResponse])
def list_debate_arguments(debate_id: int, database: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    debate = get_debate_or_none(database, debate_id)
    if debate is None:
        raise HTTPException(status_code=404, detail="Debate not found")
    _require_debate_access(database, debate, current_user.id)
    return (
        database.query(DebateArgument)
        .filter(DebateArgument.debate_id == debate_id)
        .order_by(DebateArgument.turn_order.asc())
        .all()
    )


@router.get("/{debate_id}/coach-feedback", response_model=list[DebateCoachingResponse])
def list_coach_feedback(
    debate_id: int,
    current_user: User = Depends(get_current_user),
    database: Session = Depends(get_db),
):
    debate = get_debate_or_none(database, debate_id)
    if debate is None:
        raise HTTPException(status_code=404, detail="Debate not found")
    _require_debate_access(database, debate, current_user.id)
    return (
        database.query(DebateCoachingRecord)
        .filter(
            DebateCoachingRecord.debate_id == debate_id,
            DebateCoachingRecord.user_id == current_user.id,
        )
        .order_by(DebateCoachingRecord.source_argument_count.desc())
        .all()
    )


@router.post("/{debate_id}/coach-feedback", response_model=DebateCoachingResponse)
def request_coach_feedback(
    debate_id: int,
    current_user: User = Depends(get_current_user),
    database: Session = Depends(get_db),
):
    debate = get_debate_or_none(database, debate_id)
    if debate is None:
        raise HTTPException(status_code=404, detail="Debate not found")
    participant = _require_debate_access(database, debate, current_user.id)
    arguments = (
        database.query(DebateArgument)
        .filter(DebateArgument.debate_id == debate_id)
        .order_by(DebateArgument.turn_order.asc())
        .all()
    )
    user_argument_count = sum(1 for item in arguments if item.user_id == current_user.id and not item.is_ai)
    if user_argument_count == 0:
        raise HTTPException(status_code=400, detail="Submit at least one argument before requesting coaching feedback")
    saved = (
        database.query(DebateCoachingRecord)
        .filter(
            DebateCoachingRecord.debate_id == debate_id,
            DebateCoachingRecord.user_id == current_user.id,
            DebateCoachingRecord.source_argument_count == user_argument_count,
        )
        .first()
    )
    if saved is not None:
        return saved
    if not llm_service.is_available():
        hint = "GEMINI_API_KEY" if settings.llm_provider == "gemini" else "OPENAI_API_KEY"
        raise HTTPException(
            status_code=503,
            detail=f"AI coaching is unavailable. Set LLM_PROVIDER={settings.llm_provider} and {hint} in backend/.env before requesting coaching feedback.",
        )

    history = [
        {
            "role": "user" if item.user_id == current_user.id and not item.is_ai else "opponent",
            "content": item.content,
        }
        for item in arguments
    ]
    previous_feedback = [
        {
            "source_argument_count": record.source_argument_count,
            "overall_score": record.overall_score,
            "category_scores": record.category_scores,
            "strengths": record.strengths,
            "weaknesses": record.weaknesses,
        }
        for record in database.query(DebateCoachingRecord)
        .filter(
            DebateCoachingRecord.debate_id == debate_id,
            DebateCoachingRecord.user_id == current_user.id,
        )
        .order_by(DebateCoachingRecord.source_argument_count.asc())
        .all()
    ]
    try:
        response = llm_service.generate_coaching_feedback(
            topic=debate.topic,
            user_position=participant.position if participant else "neutral",
            debate_history=history[-settings.llm_max_context_messages:],
            previous_feedback=previous_feedback,
        )
    except LLMAnalysisError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    if response is None:
        raise HTTPException(status_code=502, detail="The AI coach returned no feedback. Please try again later.")
    try:
        assessment = DebateCoachingAssessment.model_validate(response)
    except ValidationError as exc:
        raise HTTPException(status_code=502, detail="The AI coach returned feedback in an invalid format. Please try again later.") from exc

    if set(assessment.category_scores) != set(COACHING_WEIGHTS):
        raise HTTPException(status_code=502, detail="The AI coach did not return all required score categories. Please try again.")
    scores = assessment.category_scores
    overall_score = None
    if all(scores[name].score is not None for name in COACHING_WEIGHTS):
        overall_score = round(
            sum(scores[name].score * weight for name, weight in COACHING_WEIGHTS.items()),
            2,
        )
    progress_indicators = []
    if previous_feedback:
        prior_scores = previous_feedback[-1]["category_scores"]
        for category in COACHING_WEIGHTS:
            old_score = prior_scores.get(category, {}).get("score")
            new_score = scores[category].score
            if old_score is None or new_score is None:
                continue
            change = new_score - old_score
            if change > 0:
                direction = "increased"
            elif change < 0:
                direction = "decreased"
            else:
                direction = "remained unchanged"
            progress_indicators.append(
                f"The AI-assisted {category.replace('_', ' ')} estimate {direction} from {old_score} to {new_score} compared with the previous saved report."
            )
    assessment.improvement_plan.progress_indicators = progress_indicators
    if not previous_feedback:
        assessment.improvement_plan.progress_indicators = []
        assessment.overall_assessment = (
            "There is not enough debate history to identify progress trends. " + assessment.overall_assessment
        )
    record = DebateCoachingRecord(
        debate_id=debate_id,
        user_id=current_user.id,
        category_scores={
            name: scores[name].model_dump()
            for name in COACHING_WEIGHTS
        },
        overall_score=overall_score,
        overall_assessment=assessment.overall_assessment,
        strengths=assessment.strengths,
        weaknesses=assessment.weaknesses,
        improvement_suggestions=assessment.improvement_suggestions,
        improvement_plan=assessment.improvement_plan.model_dump(),
        source_argument_count=user_argument_count,
        provider=llm_service.provider,
        model=llm_service.model,
    )
    database.add(record)
    try:
        database.commit()
        database.refresh(record)
    except IntegrityError:
        database.rollback()
        saved = (
            database.query(DebateCoachingRecord)
            .filter(
                DebateCoachingRecord.debate_id == debate_id,
                DebateCoachingRecord.user_id == current_user.id,
                DebateCoachingRecord.source_argument_count == user_argument_count,
            )
            .first()
        )
        if saved is None:
            raise HTTPException(status_code=409, detail="Unable to save coaching feedback; please retry.") from None
        return saved
    try:
        from app.services.notification_service import notify_coaching_feedback
        notify_coaching_feedback(database, current_user.id, debate.topic, record.overall_score)
    except Exception:
        pass
    try:
        from app.services.skill_service import sync_user_skills
        sync_user_skills(database, current_user.id)
    except Exception:
        pass
    return record


@router.delete("/{debate_id}/participants/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_participant(debate_id: int, user_id: int, current_user: User = Depends(get_current_user), database: Session = Depends(get_db)):
    debate = get_debate_or_none(database, debate_id)
    if debate is None:
        raise HTTPException(status_code=404, detail="Debate not found")
    if debate.created_by != current_user.id and user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the creator can remove other participants")
    participant = get_participant(database, debate_id, user_id)
    if participant is None:
        raise HTTPException(status_code=404, detail="Participant not found")
    database.delete(participant)
    database.commit()
