import json
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import desc, func
from sqlalchemy.orm import Session
from .analysis import analyze_transcript, serial_analysis
from .config import settings
from .db import Base, engine, get_db
from .models import Analysis, DebateSession, User
from .schemas import ProfileUpdate, SessionCreate, SessionOut, Token, UserCreate, UserLogin, UserOut
from .security import current_user, hash_password, make_token, verify_password

Base.metadata.create_all(bind=engine)
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
    db.commit(); db.refresh(user); return user


@app.post("/api/sessions", response_model=SessionOut, status_code=201)
def create_session(payload: SessionCreate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    session = DebateSession(user_id=user.id, title=payload.title, topic=payload.topic, position=payload.position, transcript=payload.transcript)
    result = analyze_transcript(payload.transcript, payload.topic, payload.position)
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
    return {"session": SessionOut.model_validate(session), "analysis": serial_analysis(analysis) if analysis else None}


@app.get("/api/dashboard")
def dashboard(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.query(DebateSession).filter_by(user_id=user.id).all()
    scores = [s.overall_score for s in rows]
    return {"sessions_count": len(rows), "average_score": round(sum(scores) / len(scores), 1) if scores else 0, "best_score": max(scores) if scores else 0, "recent_sessions": [SessionOut.model_validate(s) for s in sorted(rows, key=lambda x: x.created_at, reverse=True)[:5]]}


@app.get("/api/sessions/{session_id}/report")
def report(session_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    result = session_detail(session_id, user, db)
    return {"report_title": f"Debate report: {result['session'].title}", **result}


app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")
