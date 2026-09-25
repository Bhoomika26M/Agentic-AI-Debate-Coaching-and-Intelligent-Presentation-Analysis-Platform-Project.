import json
import csv
import io
from pathlib import Path
from uuid import uuid4
from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import desc, func, inspect, text
from sqlalchemy.orm import Session
from .analysis import analyze_transcript, serial_analysis
from .config import settings
from .db import Base, engine, get_db
from .models import Analysis, DebateSession, DebateTurn, MediaAsset, User
from .provider import provider
from .debate_graph import simulate_turn
from .schemas import (CounterargumentRequest, PresentationCreate, ProfileUpdate, SessionCreate,
                      SessionOut, Token, UserCreate, UserLogin, UserOut, DebateTurnRequest, RoleUpdate)
from .security import current_user, hash_password, make_token, verify_password, require_roles

Base.metadata.create_all(bind=engine)
# create_all does not add columns to an existing SQLite database used by local installs.
with engine.begin() as connection:
    columns = {c["name"] for c in inspect(engine).get_columns("users")}
    additions = {
        "experience_level": "VARCHAR(30) DEFAULT 'beginner'",
        "preferred_debate_topics": "TEXT DEFAULT '[]'",
        "presentation_domains": "TEXT DEFAULT '[]'",
        "learning_goals": "TEXT DEFAULT '[]'",
        "coaching_preferences": "TEXT DEFAULT '{}'",
        "tracked_skills": "TEXT DEFAULT '{}'",
    }
    for name, definition in additions.items():
        if name not in columns:
            connection.execute(text(f"ALTER TABLE users ADD COLUMN {name} {definition}"))
app = FastAPI(title="Debate Coach API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=settings.origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


@app.get("/api/health")
def health(): return {"status": "ok", "service": "debate-coach"}


@app.post("/api/auth/register", response_model=Token, status_code=201)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter_by(email=payload.email.lower()).first(): raise HTTPException(409, "Email already registered")
    user = User(email=payload.email.lower(), name=payload.name, password_hash=hash_password(payload.password))
    db.add(user); db.commit(); db.refresh(user)
    return {"access_token": make_token(user.id), "user": user}


@app.post("/api/auth/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter_by(email=payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.password_hash): raise HTTPException(401, "Incorrect email or password")
    return {"access_token": make_token(user.id), "user": user}


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
    db.commit(); db.refresh(target)
    return target


@app.get("/api/admin/users")
def list_users(admin: User = Depends(require_roles("administrator")), db: Session = Depends(get_db)):
    return [UserOut.model_validate(item) for item in db.query(User).order_by(User.id).all()]


@app.post("/api/sessions", response_model=SessionOut, status_code=201)
def create_session(payload: SessionCreate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    session = DebateSession(user_id=user.id, title=payload.title, topic=payload.topic, position=payload.position, transcript=payload.transcript)
    result = provider.analyze(payload.transcript, payload.topic, payload.position, payload.scoring_weights)
    session.overall_score = result["overall_score"]; db.add(session); db.flush()
    db.add(Analysis(session_id=session.id, clarity=result["clarity"], evidence=result["evidence"], persuasiveness=result["persuasiveness"], delivery=result["delivery"], fallacies=json.dumps(result["fallacies"]), counterarguments=json.dumps(result["counterarguments"]), recommendations=json.dumps(result["recommendations"]), pacing_wpm=result["pacing_wpm"], filler_words=result["filler_words"]))
    db.commit(); db.refresh(session); return session


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
    """Persist a multi-turn simulation; Gemini is optional and never required."""
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
    """Role-aware dashboard foundation without exposing other users' private work."""
    base = dashboard(user, db)
    actions = {
        "learner": ["practice_debate", "upload_presentation"],
        "debate_coach": ["review_progress", "assign_drill"],
        "educator": ["review_progress", "compare_cohorts"],
        "administrator": ["manage_users", "review_system_health"],
    }
    return {"role": user.role, "capabilities": actions.get(user.role, actions["learner"]), "dashboard": base}


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
    transcript = transcript[:30000]
    analysis = provider.analyze(transcript, topic, position) if transcript else {}
    asset = MediaAsset(user_id=user.id, filename=file.filename or safe_name, stored_path=str(destination),
                       media_type=media_type, content_type=content_type, size_bytes=len(data),
                       transcript=transcript, analysis_json=json.dumps(analysis),
                       status="analyzed" if transcript else "awaiting_transcript")
    db.add(asset); db.commit(); db.refresh(asset)
    return {"id": asset.id, "filename": asset.filename, "media_type": media_type,
            "content_type": content_type, "size_bytes": asset.size_bytes, "status": asset.status,
            "transcript_available": bool(transcript), "analysis": analysis,
            "message": "Upload stored. Add a transcript to run deterministic or Gemini analysis."
            if not transcript else "Upload analyzed."}


@app.get("/api/media")
def list_media(user: User = Depends(current_user), db: Session = Depends(get_db)):
    assets = db.query(MediaAsset).filter_by(user_id=user.id).order_by(desc(MediaAsset.created_at)).limit(50).all()
    return [{"id": a.id, "filename": a.filename, "media_type": a.media_type, "content_type": a.content_type,
             "size_bytes": a.size_bytes, "status": a.status, "created_at": a.created_at} for a in assets]


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
def presentation_analysis(payload: PresentationCreate, user: User = Depends(current_user)):
    result = analyze_transcript(payload.transcript, payload.title, "for")
    words = result["arguments"]["word_count"]
    duration = payload.duration_seconds
    if duration:
        result["pacing_wpm"] = round(words / (duration / 60), 1)
        result["delivery"] = max(35, min(100, 92 - result["filler_words"] * 3 - (8 if result["pacing_wpm"] > 180 else 0)))
    result["presentation"] = {"title": payload.title, "audience": payload.audience, "duration_seconds": duration,
                             "pause_opportunities": result["filler_words"], "recommended_wpm": "130-170"}
    return result


@app.get("/api/sessions/{session_id}/export")
def export_report(session_id: int, format: str = "json", user: User = Depends(current_user), db: Session = Depends(get_db)):
    result = report(session_id, user, db)
    if format.lower() != "csv":
        return result
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["metric", "value"])
    for key, value in result["analysis"].items():
        if isinstance(value, (str, int, float)): writer.writerow([key, value])
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv",
                             headers={"Content-Disposition": f'attachment; filename="debate-report-{session_id}.csv"'})


app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")
