import json
import csv
import io
from pathlib import Path
from uuid import uuid4
from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import desc, func, inspect, text
from sqlalchemy.orm import Session
from .analysis import analyze_transcript, serial_analysis, transcribe_media
from .config import settings
from .db import Base, engine, get_db
from .models import AIUsageLog, Analysis, AuditLog, ClassGroup, ClassMember, CounterargumentPractice, CurriculumItem, DebateSession, DebateTurn, FallacyFinding, LearningAssignment, MediaAsset, Presentation, User
from .provider import provider
from .debate_graph import simulate_turn
from .schemas import (CounterargumentRequest, PresentationCreate, ProfileUpdate, SessionCreate,
                       SessionOut, Token, UserCreate, UserLogin, UserOut, DebateTurnRequest, RoleUpdate, SessionUpdate,
                       AssignmentCreate, SubmissionCreate, EvaluationCreate, ClassCreate, ClassMemberCreate)
from .schemas import CurriculumCreate, FallacyCreate, CounterargumentCreate
from .security import current_user, hash_password, make_token, verify_password, require_roles

Base.metadata.create_all(bind=engine)
# create_all does not add columns to an existing SQLite database used by local installs.
with engine.begin() as connection:
    user_columns = {c["name"] for c in inspect(engine).get_columns("users")}
    user_additions = {
        "experience_level": "VARCHAR(30) DEFAULT 'beginner'",
        "preferred_debate_topics": "TEXT DEFAULT '[]'",
        "presentation_domains": "TEXT DEFAULT '[]'",
        "learning_goals": "TEXT DEFAULT '[]'",
        "coaching_preferences": "TEXT DEFAULT '{}'",
        "tracked_skills": "TEXT DEFAULT '{}'",
    }
    for name, definition in user_additions.items():
        if name not in user_columns:
            connection.execute(text(f"ALTER TABLE users ADD COLUMN {name} {definition}"))
    session_columns = {c["name"] for c in inspect(engine).get_columns("debate_sessions")}
    session_additions = {"debate_format": "VARCHAR(30) DEFAULT 'one_on_one'", "scheduled_at": "DATETIME"}
    for name, definition in session_additions.items():
        if name not in session_columns:
            connection.execute(text(f"ALTER TABLE debate_sessions ADD COLUMN {name} {definition}"))
app = FastAPI(title="Debate Coach API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=settings.origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


@app.get("/api/health")
def health(): return {"status": "ok", "service": "debate-coach"}


@app.post("/api/auth/register", response_model=Token, status_code=201)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter_by(email=payload.email.lower()).first(): raise HTTPException(409, "Email already registered")
    user = User(email=payload.email.lower(), name=payload.name, role=payload.role,
                password_hash=hash_password(payload.password))
    db.add(user); db.commit(); db.refresh(user)
    return {"access_token": make_token(user.id), "user": user}


@app.post("/api/auth/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter_by(email=payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.password_hash): raise HTTPException(401, "Incorrect email or password")
    return {"access_token": make_token(user.id), "user": user}


@app.post("/api/auth/token")
def oauth2_login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter_by(email=form.username.lower()).first()
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(401, "Incorrect email or password", headers={"WWW-Authenticate": "Bearer"})
    return {"access_token": make_token(user.id), "token_type": "bearer"}


@app.get("/api/auth/me", response_model=UserOut)
def me(user: User = Depends(current_user)): return user


@app.patch("/api/profile", response_model=UserOut)
def profile(payload: ProfileUpdate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if payload.name is not None: user.name = payload.name
    if payload.bio is not None: user.bio = payload.bio
    for field in ("experience_level", "preferred_debate_topics", "presentation_domains", "learning_goals", "coaching_preferences", "tracked_skills"):
        value = getattr(payload, field)
        if value is not None:
            setattr(user, field, json.dumps(value) if isinstance(value, (list, dict)) else value)
    db.commit(); db.refresh(user); return user


@app.get("/api/profile", response_model=UserOut)
def get_profile(user: User = Depends(current_user)): return user


@app.patch("/api/admin/users/{user_id}/role", response_model=UserOut)
def update_role(user_id: int, payload: RoleUpdate, admin: User = Depends(require_roles("administrator")),
                db: Session = Depends(get_db)):
    target = db.get(User, user_id)
    if not target: raise HTTPException(404, "User not found")
    if target.id == admin.id and payload.role != "administrator":
        raise HTTPException(400, "Administrators cannot remove their own administrator role")
    target.role = payload.role
    db.add(AuditLog(actor_id=admin.id, action="role_changed", target=f"user:{target.id}:{payload.role}"))
    db.commit(); db.refresh(target)
    return target


def assignment_view(item: LearningAssignment):
    return {"id": item.id, "creator_id": item.creator_id, "learner_id": item.learner_id,
            "class_id": item.class_id, "title": item.title, "assignment_type": item.assignment_type,
            "instructions": item.instructions, "due_at": item.due_at, "status": item.status,
            "submission": item.submission, "evaluation": json.loads(item.evaluation), "created_at": item.created_at}


@app.get("/api/coach/learners")
def coach_learners(coach: User = Depends(require_roles("debate_coach")), db: Session = Depends(get_db)):
    learners = db.query(User).filter_by(role="learner").order_by(User.name).all()
    return [{"id": learner.id, "name": learner.name, "email": learner.email} for learner in learners]


@app.post("/api/coach/learners/{learner_id}/assign", status_code=201)
def coach_assign(learner_id: int, payload: AssignmentCreate, coach: User = Depends(require_roles("debate_coach")), db: Session = Depends(get_db)):
    learner = db.query(User).filter_by(id=learner_id, role="learner").first()
    if not learner: raise HTTPException(404, "Learner not found")
    item = LearningAssignment(creator_id=coach.id, learner_id=learner_id, title=payload.title,
                              assignment_type=payload.assignment_type, instructions=payload.instructions,
                              due_at=payload.due_at, class_id=payload.class_id)
    db.add(item); db.commit(); db.refresh(item)
    return assignment_view(item)


@app.get("/api/coach/assignments")
def coach_assignments(coach: User = Depends(require_roles("debate_coach")), db: Session = Depends(get_db)):
    return [assignment_view(item) for item in db.query(LearningAssignment).filter_by(creator_id=coach.id).order_by(desc(LearningAssignment.created_at)).all()]


@app.post("/api/coach/assignments/{assignment_id}/evaluate")
def evaluate_assignment(assignment_id: int, payload: EvaluationCreate, coach: User = Depends(require_roles("debate_coach")), db: Session = Depends(get_db)):
    item = db.query(LearningAssignment).filter_by(id=assignment_id, creator_id=coach.id).first()
    if not item: raise HTTPException(404, "Assignment not found")
    item.evaluation = json.dumps({"score": payload.score, "feedback": payload.feedback, "evaluated_by": coach.id})
    item.status = "evaluated"
    db.commit(); db.refresh(item)
    return assignment_view(item)


@app.post("/api/educator/classes", status_code=201)
def create_class(payload: ClassCreate, educator: User = Depends(require_roles("educator")), db: Session = Depends(get_db)):
    item = ClassGroup(educator_id=educator.id, name=payload.name, description=payload.description)
    db.add(item); db.commit(); db.refresh(item)
    return {"id": item.id, "name": item.name, "description": item.description}


@app.get("/api/educator/classes")
def educator_classes(educator: User = Depends(require_roles("educator")), db: Session = Depends(get_db)):
    groups = db.query(ClassGroup).filter_by(educator_id=educator.id).all()
    return [{"id": item.id, "name": item.name, "description": item.description,
             "learners": db.query(ClassMember).filter_by(class_id=item.id).count()} for item in groups]


@app.post("/api/educator/curriculum", status_code=201)
def create_curriculum(payload: CurriculumCreate, educator: User = Depends(require_roles("educator")), db: Session = Depends(get_db)):
    item = CurriculumItem(educator_id=educator.id, title=payload.title, description=payload.description,
                          module=payload.module, order_index=payload.order_index)
    db.add(item); db.commit(); db.refresh(item)
    return {"id": item.id, "title": item.title, "description": item.description, "module": item.module, "order_index": item.order_index}


@app.get("/api/educator/curriculum")
def list_curriculum(educator: User = Depends(require_roles("educator")), db: Session = Depends(get_db)):
    return [{"id": item.id, "title": item.title, "description": item.description, "module": item.module, "order_index": item.order_index}
            for item in db.query(CurriculumItem).filter_by(educator_id=educator.id).order_by(CurriculumItem.order_index).all()]


@app.delete("/api/educator/curriculum/{item_id}", status_code=204)
def delete_curriculum(item_id: int, educator: User = Depends(require_roles("educator")), db: Session = Depends(get_db)):
    item = db.query(CurriculumItem).filter_by(id=item_id, educator_id=educator.id).first()
    if not item: raise HTTPException(404, "Curriculum item not found")
    db.delete(item); db.commit()


@app.post("/api/educator/classes/{class_id}/learners", status_code=201)
def add_class_learner(class_id: int, payload: ClassMemberCreate, educator: User = Depends(require_roles("educator")), db: Session = Depends(get_db)):
    group = db.query(ClassGroup).filter_by(id=class_id, educator_id=educator.id).first()
    learner = db.query(User).filter_by(id=payload.learner_id, role="learner").first()
    if not group or not learner: raise HTTPException(404, "Class or learner not found")
    if db.query(ClassMember).filter_by(class_id=class_id, learner_id=learner.id).first(): raise HTTPException(409, "Learner already enrolled")
    member = ClassMember(class_id=class_id, learner_id=learner.id)
    db.add(member); db.commit()
    return {"class_id": class_id, "learner_id": learner.id, "status": "enrolled"}


@app.post("/api/educator/assignments", status_code=201)
def educator_assignment(payload: AssignmentCreate, educator: User = Depends(require_roles("educator")), db: Session = Depends(get_db)):
    if payload.class_id:
        members = db.query(ClassMember).filter_by(class_id=payload.class_id).all()
        if not db.query(ClassGroup).filter_by(id=payload.class_id, educator_id=educator.id).first(): raise HTTPException(404, "Class not found")
        created = []
        for member in members:
            item = LearningAssignment(creator_id=educator.id, learner_id=member.learner_id, class_id=payload.class_id,
                                      title=payload.title, assignment_type=payload.assignment_type,
                                      instructions=payload.instructions, due_at=payload.due_at)
            db.add(item); created.append(item)
        db.commit()
        return [assignment_view(item) for item in created]
    learner = db.query(User).filter_by(id=payload.learner_id, role="learner").first()
    if not learner: raise HTTPException(404, "Learner not found")
    item = LearningAssignment(creator_id=educator.id, learner_id=learner.id, title=payload.title,
                              assignment_type=payload.assignment_type, instructions=payload.instructions, due_at=payload.due_at)
    db.add(item); db.commit(); db.refresh(item)
    return assignment_view(item)


@app.get("/api/learner/assignments")
def learner_assignments(learner: User = Depends(require_roles("learner")), db: Session = Depends(get_db)):
    return [assignment_view(item) for item in db.query(LearningAssignment).filter_by(learner_id=learner.id).order_by(desc(LearningAssignment.created_at)).all()]


@app.post("/api/learner/assignments/{assignment_id}/submit")
def submit_assignment(assignment_id: int, payload: SubmissionCreate, learner: User = Depends(require_roles("learner")), db: Session = Depends(get_db)):
    item = db.query(LearningAssignment).filter_by(id=assignment_id, learner_id=learner.id).first()
    if not item: raise HTTPException(404, "Assignment not found")
    item.submission = payload.submission; item.status = "submitted"
    db.commit(); db.refresh(item)
    return assignment_view(item)


@app.get("/api/admin/users")
def list_users(admin: User = Depends(require_roles("administrator")), db: Session = Depends(get_db)):
    return [UserOut.model_validate(item) for item in db.query(User).order_by(User.id).all()]


@app.get("/api/admin/audit-logs")
def audit_logs(admin: User = Depends(require_roles("administrator")), db: Session = Depends(get_db)):
    return [{"id": item.id, "actor_id": item.actor_id, "action": item.action, "target": item.target, "created_at": item.created_at}
            for item in db.query(AuditLog).order_by(desc(AuditLog.created_at)).limit(100).all()]


@app.get("/api/admin/ai-monitoring")
def ai_monitoring(admin: User = Depends(require_roles("administrator")), db: Session = Depends(get_db)):
    return {"provider": provider.ai.name, "model": provider.ai.model, "configured": provider.ai.available,
            "requests": db.query(AIUsageLog).count(), "failures": db.query(AIUsageLog).filter_by(success=False).count(),
            "recent": [{"operation": item.operation, "success": item.success, "error": item.error, "created_at": item.created_at}
                       for item in db.query(AIUsageLog).order_by(desc(AIUsageLog.created_at)).limit(50).all()]}


@app.post("/api/analysis/fallacy-findings", status_code=201)
def save_fallacy(payload: FallacyCreate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    item = FallacyFinding(user_id=user.id, session_id=payload.session_id, fallacy_type=payload.fallacy_type,
                          excerpt=payload.excerpt, explanation=payload.explanation, correction=payload.correction)
    db.add(item); db.commit(); db.refresh(item)
    return {"id": item.id, "fallacy_type": item.fallacy_type, "resolved": item.resolved}


@app.get("/api/analysis/fallacy-findings")
def saved_fallacies(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return [{"id": item.id, "fallacy_type": item.fallacy_type, "excerpt": item.excerpt, "explanation": item.explanation,
             "correction": item.correction, "resolved": item.resolved} for item in db.query(FallacyFinding).filter_by(user_id=user.id).all()]


@app.post("/api/analysis/counterargument-practice", status_code=201)
def save_counterargument(payload: CounterargumentCreate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    item = CounterargumentPractice(user_id=user.id, claim=payload.claim, counter_type=payload.counter_type, response=payload.response)
    db.add(item); db.commit(); db.refresh(item)
    return {"id": item.id, "claim": item.claim, "counter_type": item.counter_type, "status": item.status}


@app.get("/api/analysis/counterargument-practice")
def saved_counterarguments(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return [{"id": item.id, "claim": item.claim, "counter_type": item.counter_type, "response": item.response, "status": item.status}
            for item in db.query(CounterargumentPractice).filter_by(user_id=user.id).all()]


@app.post("/api/sessions", response_model=SessionOut, status_code=201)
def create_session(payload: SessionCreate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    session = DebateSession(user_id=user.id, title=payload.title, topic=payload.topic, position=payload.position,
                            debate_format=payload.debate_format, scheduled_at=payload.scheduled_at,
                            status="scheduled" if payload.scheduled_at else "completed", transcript=payload.transcript)
    result = provider.analyze(payload.transcript, payload.topic, payload.position, payload.scoring_weights)
    session.overall_score = result["overall_score"]; db.add(session); db.flush()
    db.add(Analysis(session_id=session.id, clarity=result["clarity"], evidence=result["evidence"], persuasiveness=result["persuasiveness"], delivery=result["delivery"], fallacies=json.dumps(result["fallacies"]), counterarguments=json.dumps(result["counterarguments"]), recommendations=json.dumps(result["recommendations"]), pacing_wpm=result["pacing_wpm"], filler_words=result["filler_words"]))
    db.commit(); db.refresh(session); return session


@app.patch("/api/sessions/{session_id}", response_model=SessionOut)
def update_session(session_id: int, payload: SessionUpdate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    session = db.query(DebateSession).filter_by(id=session_id, user_id=user.id).first()
    if not session:
        raise HTTPException(404, "Session not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(session, field, value)
    db.commit(); db.refresh(session)
    return session


@app.post("/api/sessions/{session_id}/lifecycle/{action}", response_model=SessionOut)
def session_lifecycle(session_id: int, action: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    allowed = {"start": "active", "pause": "paused", "resume": "active", "complete": "completed", "cancel": "cancelled"}
    if action not in allowed: raise HTTPException(400, "Action must be start, pause, resume, complete, or cancel")
    item = db.query(DebateSession).filter_by(id=session_id, user_id=user.id).first()
    if not item: raise HTTPException(404, "Session not found")
    item.status = allowed[action]; db.commit(); db.refresh(item)
    return item


@app.get("/api/sessions", response_model=list[SessionOut])
def sessions(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return db.query(DebateSession).filter_by(user_id=user.id).order_by(desc(DebateSession.created_at)).all()


@app.get("/api/sessions/{session_id}")
def session_detail(session_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    session = db.query(DebateSession).filter_by(id=session_id, user_id=user.id).first()
    if not session: raise HTTPException(404, "Session not found")
    analysis = db.query(Analysis).filter_by(session_id=session.id).first()
    detail = serial_analysis(analysis) if analysis else None
    if detail:
        # Recompute the explainable enrichment from the original transcript.
        detail.update(analyze_transcript(session.transcript, session.topic, session.position))
    return {"session": SessionOut.model_validate(session), "analysis": detail}


@app.get("/api/dashboard")
def dashboard(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.query(DebateSession).filter_by(user_id=user.id).all()
    scores = [s.overall_score for s in rows]
    ordered = sorted(rows, key=lambda x: x.created_at)
    skill_totals = {key: [] for key in ("clarity", "evidence", "persuasiveness", "delivery")}
    for item in rows:
        analysis = db.query(Analysis).filter_by(session_id=item.id).first()
        if analysis:
            for key in skill_totals: skill_totals[key].append(getattr(analysis, key))
    skills = {key: round(sum(values) / len(values), 1) if values else 0 for key, values in skill_totals.items()}
    return {"sessions_count": len(rows), "average_score": round(sum(scores) / len(scores), 1) if scores else 0,
            "best_score": max(scores) if scores else 0, "skills": skills,
            "trend": [{"date": s.created_at.date().isoformat(), "score": s.overall_score} for s in ordered[-10:]],
            "recent_sessions": [SessionOut.model_validate(s) for s in ordered[-5:][::-1]]}


@app.get("/api/dashboard/learner")
def learner_dashboard(user: User = Depends(require_roles("learner")), db: Session = Depends(get_db)):
    base = dashboard(user, db)
    return {"role": "learner", "debate_history": base["recent_sessions"],
            "performance_scores": {"average": base["average_score"], "best": base["best_score"], "skills": base["skills"]},
            "improvement_trends": base["trend"],
            "recommended_exercises": coaching_plan(user, db)["weeks"],
            "coaching_insights": {"focus": coaching_plan(user, db)["focus"], "goals": json.loads(user.learning_goals)}}


@app.get("/api/dashboard/coach")
def coach_dashboard(user: User = Depends(require_roles("debate_coach")), db: Session = Depends(get_db)):
    learners = db.query(User).filter(User.role == "learner").all()
    progress = []
    for learner in learners:
        sessions = db.query(DebateSession).filter_by(user_id=learner.id).all()
        scores = [item.overall_score for item in sessions]
        progress.append({"student_id": learner.id, "student_name": learner.name,
                         "sessions": len(scores), "average_score": round(sum(scores) / len(scores), 1) if scores else 0,
                         "skill_gaps": ["clarity", "evidence"] if not scores else []})
    return {"role": "debate_coach", "student_progress": progress,
            "debate_evaluations": [{"student_id": item["student_id"], "average_score": item["average_score"]} for item in progress],
            "skill_gap_analysis": [{"student_id": item["student_id"], "gaps": item["skill_gaps"]} for item in progress],
            "coaching_recommendations": [{"student_id": item["student_id"], "recommendation": "Assign a structured evidence drill."} for item in progress]}


@app.get("/api/dashboard/educator")
def educator_dashboard(user: User = Depends(require_roles("educator")), db: Session = Depends(get_db)):
    learners = db.query(User).filter(User.role == "learner").all()
    ranking = []
    for learner in learners:
        sessions = db.query(DebateSession).filter_by(user_id=learner.id).all()
        scores = [item.overall_score for item in sessions]
        ranking.append({"student_id": learner.id, "student_name": learner.name,
                        "average_score": round(sum(scores) / len(scores), 1) if scores else 0,
                        "sessions": len(scores)})
    ranking.sort(key=lambda item: item["average_score"], reverse=True)
    return {"role": "educator", "class_analytics": {"learners": len(learners), "sessions": db.query(DebateSession).count()},
            "student_rankings": ranking,
            "debate_performance_reports": [{"student_id": item["student_id"], "average_score": item["average_score"]} for item in ranking],
            "presentation_assessment_reports": [{"student_id": learner.id, "presentations": db.query(Presentation).filter_by(user_id=learner.id).count()} for learner in learners]}


@app.get("/api/dashboard/admin")
def administrator_dashboard(admin: User = Depends(require_roles("administrator")), db: Session = Depends(get_db)):
    return {"role": "administrator", "user_management": {"users": db.query(User).count(), "roles": {
                role: db.query(User).filter_by(role=role).count() for role in ("learner", "debate_coach", "educator", "administrator")}},
            "platform_analytics": {"sessions": db.query(DebateSession).count(), "presentations": db.query(Presentation).count(),
                                    "media_assets": db.query(MediaAsset).count()},
            "ai_model_monitoring": {"provider": provider.ai.name, "model": provider.ai.model, "configured": provider.ai.available},
            "system_reports": {"health": "ok", "api_version": app.version}}


@app.get("/api/sessions/{session_id}/report")
def report(session_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    result = session_detail(session_id, user, db)
    return {"report_title": f"Debate report: {result['session'].title}", **result}


@app.post("/api/sessions/{session_id}/counterarguments")
def counterarguments(session_id: int, payload: CounterargumentRequest, user: User = Depends(current_user),
                     db: Session = Depends(get_db)):
    session = db.query(DebateSession).filter_by(id=session_id, user_id=user.id).first()
    if not session: raise HTTPException(404, "Session not found")
    return {"claim": payload.claim, "counterargument": f"A strong opponent could challenge '{payload.claim}' by asking for its evidence, scope, and trade-offs.",
            "coaching_prompt": "Steelman that objection, then answer it with one source and one concrete example."}


@app.post("/api/debate/turn")
def debate_turn(payload: DebateTurnRequest, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Persist a multi-turn simulation; OpenRouter is optional with a local fallback."""
    session = db.get(DebateSession, payload.session_id) if payload.session_id else None
    if session and session.user_id != user.id: raise HTTPException(404, "Simulation not found")
    if not session:
        session = DebateSession(user_id=user.id, title=f"Debate: {payload.topic}", topic=payload.topic,
                                position=payload.position, status="active", transcript="")
        db.add(session); db.flush()
    existing = db.query(DebateTurn).filter_by(session_id=session.id).count()
    turn_number = existing + 1
    prior = "\n".join(t.content for t in session.turns)
    state = {"topic": session.topic, "position": session.position, "transcript": prior,
             "turn": existing, "messages": []}
    response, engine = provider.debate_response(session.topic, session.position, prior, payload.turn_type)
    if engine == "deterministic_fallback":
        response = simulate_turn(state)["response"]
    if payload.content:
        db.add(DebateTurn(session_id=session.id, turn_number=turn_number, speaker="learner",
                          turn_type=payload.turn_type, content=payload.content, evaluation=json.dumps({"engine": engine})))
        session.transcript = (session.transcript + "\n" + payload.content).strip()
        if payload.turn_type == "final_evaluation":
            session.status = "completed"
    db.add(DebateTurn(session_id=session.id, turn_number=turn_number + (1 if payload.content else 0),
                      speaker="coach", turn_type="final_evaluation" if payload.turn_type == "final_evaluation" else "challenge",
                      content=response, evaluation=json.dumps({"engine": engine})))
    db.commit(); db.refresh(session)
    return {"session_id": session.id, "topic": session.topic, "position": session.position,
            "turn": turn_number, "response": response, "engine": engine,
            "status": session.status,
            "turns": [{"turn_number": t.turn_number, "speaker": t.speaker, "turn_type": t.turn_type,
                       "content": t.content} for t in session.turns]}


@app.get("/api/role-dashboard")
def role_dashboard(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Role-specific aggregate dashboard; private learner transcripts remain private."""
    base = dashboard(user, db)
    actions = {"learner": ["practice_debate", "upload_presentation", "follow_learning_plan"],
               "debate_coach": ["review_progress", "assign_drill", "coach_sessions"],
               "educator": ["review_progress", "compare_cohorts", "design_curriculum"],
               "administrator": ["manage_users", "review_system_health", "manage_roles"]}
    result = {"role": user.role, "capabilities": actions.get(user.role, actions["learner"]),
              "dashboard": base}
    if user.role in ("debate_coach", "educator", "administrator"):
        result["platform"] = {"total_users": db.query(User).count(),
                               "total_sessions": db.query(DebateSession).count(),
                               "active_media": db.query(MediaAsset).filter_by(status="analyzed").count()}
        learners = db.query(User).filter(User.role == "learner").all()
        result["students"] = []
        for learner in learners:
            learner_sessions = db.query(DebateSession).filter_by(user_id=learner.id).all()
            scores = [item.overall_score for item in learner_sessions]
            result["students"].append({"id": learner.id, "name": learner.name, "email": learner.email,
                                       "sessions_count": len(scores),
                                       "average_score": round(sum(scores) / len(scores), 1) if scores else 0})
    if user.role == "learner":
        result["learning_plan"] = coaching_plan(user, db)
    return result


ALLOWED_MEDIA = {
    "audio": {"audio/mpeg", "audio/wav", "audio/x-wav", "audio/webm", "audio/ogg"},
    "video": {"video/mp4", "video/webm", "video/quicktime"},
}


@app.post("/api/media/upload")
async def upload_media(file: UploadFile = File(...), transcript: str = Form(""),
                       topic: str = Form("Presentation upload"), position: str = Form("for"),
                       user: User = Depends(current_user), db: Session = Depends(get_db)):
    content_type = (file.content_type or "").lower()
    media_type = next((kind for kind, types in ALLOWED_MEDIA.items() if content_type in types), None)
    if not media_type:
        raise HTTPException(415, "Only supported audio or video files can be uploaded")
    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    data = await file.read(max_bytes + 1)
    if len(data) > max_bytes:
        raise HTTPException(413, f"File exceeds {settings.max_upload_size_mb} MB limit")
    extension = Path(file.filename or "").suffix.lower()
    safe_name = f"{uuid4().hex}{extension}"
    upload_root = Path(settings.upload_dir)
    upload_root.mkdir(parents=True, exist_ok=True)
    destination = upload_root / safe_name
    destination.write_bytes(data)
    transcript, transcription_engine = transcribe_media(str(destination), transcript)
    analysis = provider.analyze(transcript, topic, position) if transcript else {
        "provider": transcription_engine, "overall_score": 0, "metrics": {}
    }
    analysis["transcription_engine"] = transcription_engine
    asset = MediaAsset(user_id=user.id, filename=file.filename or safe_name, stored_path=str(destination),
                       media_type=media_type, content_type=content_type, size_bytes=len(data),
                       transcript=transcript, analysis_json=json.dumps(analysis),
                       status="analyzed" if transcript else "awaiting_transcript")
    db.add(asset); db.commit(); db.refresh(asset)
    return {"id": asset.id, "filename": asset.filename, "media_type": media_type,
            "content_type": content_type, "size_bytes": asset.size_bytes, "status": asset.status,
            "transcript_available": bool(transcript), "analysis": analysis,
            "transcription_engine": transcription_engine,
            "message": "Upload stored; no transcript was available. Install/configure Whisper or provide a transcript."
            if not transcript else "Upload transcribed and analyzed."}


@app.get("/api/media")
def list_media(user: User = Depends(current_user), db: Session = Depends(get_db)):
    assets = db.query(MediaAsset).filter_by(user_id=user.id).order_by(desc(MediaAsset.created_at)).limit(50).all()
    return [{"id": a.id, "filename": a.filename, "media_type": a.media_type, "content_type": a.content_type,
             "size_bytes": a.size_bytes, "status": a.status, "created_at": a.created_at,
             "transcript": a.transcript, "analysis": json.loads(a.analysis_json)} for a in assets]


@app.get("/api/media/{asset_id}")
def media_detail(asset_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    asset = db.query(MediaAsset).filter_by(id=asset_id, user_id=user.id).first()
    if not asset: raise HTTPException(404, "Media asset not found")
    return {"id": asset.id, "filename": asset.filename, "media_type": asset.media_type,
            "content_type": asset.content_type, "size_bytes": asset.size_bytes, "status": asset.status,
            "transcript": asset.transcript, "analysis": json.loads(asset.analysis_json), "created_at": asset.created_at}


@app.get("/api/coaching/plan")
def coaching_plan(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.query(DebateSession).filter_by(user_id=user.id).order_by(desc(DebateSession.created_at)).limit(5).all()
    analyses = [db.query(Analysis).filter_by(session_id=s.id).first() for s in rows]
    avg = lambda key: round(sum(getattr(a, key) for a in analyses if a) / max(1, len([a for a in analyses if a])), 1)
    priorities = sorted(((k, avg(k)) for k in ("clarity", "evidence", "persuasiveness", "delivery")), key=lambda x: x[1])
    focus = priorities[0][0]
    drills = {"clarity": "Deliver a 30-second thesis with two signposted reasons.",
              "evidence": "Add one verifiable source and one specific example to each claim.",
              "persuasiveness": "Steelman the opposing view before stating your strongest trade-off.",
              "delivery": "Practice once while replacing filler words with intentional pauses."}
    return {"focus": focus, "baseline": dict(priorities), "weeks": [{"week": 1, "goal": drills[focus]},
            {"week": 2, "goal": "Repeat a timed practice and compare your trend."},
            {"week": 3, "goal": "Rehearse a counterargument without notes."}]}


@app.post("/api/presentations/analyze")
@app.post("/api/presentation-analysis")
def presentation_analysis(payload: PresentationCreate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    result = analyze_transcript(payload.transcript, payload.title, "for")
    words = result["arguments"]["word_count"]
    duration = payload.duration_seconds
    if duration:
        result["pacing_wpm"] = round(words / (duration / 60), 1)
        result["delivery"] = max(35, min(100, 92 - result["filler_words"] * 3 - (8 if result["pacing_wpm"] > 180 else 0)))
    result["presentation"] = {"title": payload.title, "audience": payload.audience, "duration_seconds": duration,
                              "pause_opportunities": result["filler_words"], "recommended_wpm": "130-170",
                              "speech_pace_wpm": result["pacing_wpm"], "filler_word_usage": result["filler_words"],
                              "confidence_score": result["confidence_score"], "clarity_score": result["clarity"],
                              "audience_engagement_score": result["engagement_score"]}
    presentation = Presentation(user_id=user.id, title=payload.title, audience=payload.audience,
                                transcript=payload.transcript, duration_seconds=duration or 0,
                                analysis_json=json.dumps(result))
    db.add(presentation); db.commit(); db.refresh(presentation)
    result["presentation_id"] = presentation.id
    return result


@app.get("/api/presentations")
def list_presentations(user: User = Depends(current_user), db: Session = Depends(get_db)):
    items = db.query(Presentation).filter_by(user_id=user.id).order_by(desc(Presentation.created_at)).limit(50).all()
    return [{"id": item.id, "title": item.title, "audience": item.audience,
             "duration_seconds": item.duration_seconds, "created_at": item.created_at,
             "analysis": json.loads(item.analysis_json)} for item in items]


@app.get("/api/presentations/{presentation_id}")
def presentation_detail(presentation_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    item = db.query(Presentation).filter_by(id=presentation_id, user_id=user.id).first()
    if not item: raise HTTPException(404, "Presentation not found")
    return {"id": item.id, "title": item.title, "audience": item.audience,
            "transcript": item.transcript, "duration_seconds": item.duration_seconds,
            "created_at": item.created_at, "analysis": json.loads(item.analysis_json)}


@app.post("/api/analysis/arguments")
def argument_analysis(payload: PresentationCreate, user: User = Depends(current_user)):
    result = analyze_transcript(payload.transcript, payload.title, "for")
    return {"arguments": result["arguments"], "score_dimensions": result["score_dimensions"],
            "reasoning_score": result["reasoning_score"], "recommendations": result["recommendations"]}


@app.post("/api/analysis/fallacies")
def fallacy_analysis(payload: PresentationCreate, user: User = Depends(current_user)):
    result = analyze_transcript(payload.transcript, payload.title, "for")
    return {"fallacies": result["fallacies"], "corrections": [item["correction"] for item in result["fallacies"]]}


@app.post("/api/analysis/counterarguments")
def counterargument_analysis(payload: CounterargumentRequest, user: User = Depends(current_user)):
    return {"claim": payload.claim, "counterarguments": [
        {"type": "logical_rebuttal", "response": f"Test the assumptions behind '{payload.claim}' and identify the missing condition."},
        {"type": "evidence_based_rebuttal", "response": "Request a verifiable source, then compare its scope and quality with the claim."},
        {"type": "alternative_perspective", "response": "Steelman the strongest opposing perspective before defending the claim."},
        {"type": "challenge_question", "response": "What evidence would change your mind about this claim?"},
    ]}


@app.get("/api/sessions/{session_id}/export")
def export_report(session_id: int, format: str = "json", user: User = Depends(current_user), db: Session = Depends(get_db)):
    result = report(session_id, user, db)
    requested = format.lower()
    if requested == "json":
        return result
    if requested in ("xlsx", "excel"):
        from openpyxl import Workbook
        from openpyxl.styles import Font
        output = io.BytesIO()
        workbook = Workbook()
        sheet = workbook.active
        sheet.title = "Report"
        sheet.append(["Metric", "Value"]); sheet["A1"].font = Font(bold=True)
        for key, value in result["analysis"].items():
            if isinstance(value, (str, int, float)): sheet.append([key, value])
        workbook.save(output); output.seek(0)
        return StreamingResponse(output, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                                 headers={"Content-Disposition": f'attachment; filename="debate-report-{session_id}.xlsx"'})
    if requested == "pdf":
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen.canvas import Canvas
        output = io.BytesIO(); canvas = Canvas(output, pagesize=letter)
        y = 760; canvas.setFont("Helvetica-Bold", 15); canvas.drawString(48, y, result["report_title"]); y -= 30
        canvas.setFont("Helvetica", 10)
        for key, value in result["analysis"].items():
            if isinstance(value, (str, int, float)):
                canvas.drawString(48, y, f"{key}: {value}"); y -= 16
                if y < 48: canvas.showPage(); y = 760
        canvas.save(); output.seek(0)
        return StreamingResponse(output, media_type="application/pdf",
                                 headers={"Content-Disposition": f'attachment; filename="debate-report-{session_id}.pdf"'})
    if requested != "csv":
        raise HTTPException(400, "format must be json, csv, pdf, or xlsx")
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["metric", "value"])
    for key, value in result["analysis"].items():
        if isinstance(value, (str, int, float)): writer.writerow([key, value])
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv",
                             headers={"Content-Disposition": f'attachment; filename="debate-report-{session_id}.csv"'})


frontend_dist = Path("frontend/dist")
app.mount("/", StaticFiles(directory=str(frontend_dist if frontend_dist.exists() else Path("frontend")), html=True), name="frontend")
