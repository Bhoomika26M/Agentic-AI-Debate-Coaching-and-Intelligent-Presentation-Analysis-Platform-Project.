import json
import csv
import io
from datetime import datetime, timedelta
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
from .models import AIUsageLog, Analysis, AuditLog, ClassGroup, ClassMember, CounterargumentPractice, CurriculumItem, DebateSession, DebateTurn, FallacyFinding, LearningAssignment, MediaAsset, Notification, Presentation, User
from .provider import provider
from .debate_graph import simulate_turn
from .schemas import (CounterargumentRequest, PresentationCreate, ProfileUpdate, SessionCreate,
                       SessionOut, Token, UserCreate, UserLogin, UserOut, DebateTurnRequest, RoleUpdate, SessionUpdate,
                       AssignmentCreate, SubmissionCreate, EvaluationCreate, ClassCreate, ClassMemberCreate)
from .schemas import CurriculumCreate, FallacyCreate, CounterargumentCreate, NotificationCreate
from .security import current_user, hash_password, make_token, verify_password, require_roles

Base.metadata.create_all(bind=engine)
# create_all does not add columns to an existing SQLite database used by local installs.
with engine.begin() as connection:
    user_columns = {c["name"] for c in inspect(engine).get_columns("users")}
    user_additions = {
        "approval_status": "VARCHAR(20) DEFAULT 'approved'",
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
    assignment_columns = {c["name"] for c in inspect(engine).get_columns("learning_assignments")}
    if "curriculum_id" not in assignment_columns:
        connection.execute(text("ALTER TABLE learning_assignments ADD COLUMN curriculum_id INTEGER"))
app = FastAPI(title="Debate Coach API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=settings.origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


@app.get("/api/health")
def health(): return {"status": "ok", "service": "debate-coach"}


def add_notification(db: Session, user_id: int, notification_type: str, title: str,
                     message: str, link: str = ""):
    db.add(Notification(user_id=user_id, notification_type=notification_type, title=title,
                        message=message, link=link))


def notification_view(item: Notification):
    return {"id": item.id, "notification_type": item.notification_type, "title": item.title,
            "message": item.message, "link": item.link, "read": item.read,
            "created_at": item.created_at}


@app.get("/api/notifications")
def notifications(user: User = Depends(current_user), db: Session = Depends(get_db)):
    now = datetime.utcnow()
    scheduled = db.query(DebateSession).filter(
        DebateSession.user_id == user.id, DebateSession.status == "scheduled",
        DebateSession.scheduled_at != None, DebateSession.scheduled_at >= now,
        DebateSession.scheduled_at <= now + timedelta(hours=24)).all()
    for item in scheduled:
        marker = f"session-reminder:{item.id}"
        if not db.query(Notification).filter_by(user_id=user.id, link=marker).first():
            add_notification(db, user.id, "reminder", "Debate reminder",
                             f"Your scheduled debate '{item.title}' starts within 24 hours.", marker)
    due_assignments = db.query(LearningAssignment).filter(
        LearningAssignment.learner_id == user.id, LearningAssignment.status == "assigned",
        LearningAssignment.due_at != None, LearningAssignment.due_at >= now,
        LearningAssignment.due_at <= now + timedelta(hours=24)).all()
    for item in due_assignments:
        marker = f"assignment-reminder:{item.id}"
        if not db.query(Notification).filter_by(user_id=user.id, link=marker).first():
            add_notification(db, user.id, "reminder", "Assignment due soon",
                             f"'{item.title}' is due within 24 hours.", marker)
    db.commit()
    items = db.query(Notification).filter_by(user_id=user.id).order_by(
        desc(Notification.created_at)).limit(100).all()
    return {"unread_count": sum(not item.read for item in items),
            "items": [notification_view(item) for item in items]}


@app.patch("/api/notifications/{notification_id}/read")
def mark_notification_read(notification_id: int, user: User = Depends(current_user),
                            db: Session = Depends(get_db)):
    item = db.query(Notification).filter_by(id=notification_id, user_id=user.id).first()
    if not item:
        raise HTTPException(404, "Notification not found")
    item.read = True
    db.commit()
    return notification_view(item)


@app.post("/api/notifications/read-all")
def mark_all_notifications_read(user: User = Depends(current_user), db: Session = Depends(get_db)):
    db.query(Notification).filter_by(user_id=user.id, read=False).update({"read": True})
    db.commit()
    return {"updated": True}


@app.post("/api/admin/notifications", status_code=201)
def create_notification(payload: NotificationCreate,
                        admin: User = Depends(require_roles("administrator")),
                        db: Session = Depends(get_db)):
    if not db.get(User, payload.user_id):
        raise HTTPException(404, "User not found")
    add_notification(db, payload.user_id, payload.notification_type, payload.title,
                     payload.message, payload.link)
    db.add(AuditLog(actor_id=admin.id, action="notification_created",
                    target=f"user:{payload.user_id}"))
    db.commit()
    return {"created": True}


@app.get("/api/analytics/metrics")
def analytics_metrics(user: User = Depends(current_user), db: Session = Depends(get_db)):
    query = db.query(DebateSession)
    if user.role != "administrator":
        query = query.filter_by(user_id=user.id)
    sessions = query.order_by(DebateSession.created_at).all()
    scores = [item.overall_score for item in sessions]
    completed = [item for item in sessions if item.status == "completed"]
    analyses = [analysis for item in completed
                for analysis in [db.query(Analysis).filter_by(session_id=item.id).first()]
                if analysis]
    return {
        "sessions_total": len(sessions),
        "sessions_completed": len(completed),
        "completion_rate": round(len(completed) / len(sessions) * 100, 1) if sessions else 0,
        "average_score": round(sum(scores) / len(scores), 1) if scores else 0,
        "score_growth": round(completed[-1].overall_score - completed[0].overall_score, 1)
        if len(completed) > 1 else 0,
        "fallacy_findings": sum(len(json.loads(item.fallacies or "[]")) for item in analyses),
        "average_pacing_wpm": round(sum(item.pacing_wpm for item in analyses) / len(analyses), 1)
        if analyses else 0,
        "average_filler_words": round(sum(item.filler_words for item in analyses) / len(analyses), 1)
        if analyses else 0,
        "measurement_note": "Scores are coaching estimates from deterministic or configured AI analysis.",
    }


@app.post("/api/auth/register", response_model=Token, status_code=201)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter_by(email=payload.email.lower()).first(): raise HTTPException(409, "Email already registered")
    approval_status = "pending" if payload.role in ("educator", "debate_coach") else "approved"
    user = User(email=payload.email.lower(), name=payload.name, role=payload.role,
                approval_status=approval_status, password_hash=hash_password(payload.password))
    db.add(user); db.commit(); db.refresh(user)
    return {"access_token": make_token(user.id) if approval_status == "approved" else "",
            "user": user}


@app.post("/api/auth/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter_by(email=payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.password_hash): raise HTTPException(401, "Incorrect email or password")
    if user.approval_status != "approved":
        raise HTTPException(403, "Your account is awaiting administrator approval")
    return {"access_token": make_token(user.id), "user": user}


@app.post("/api/auth/token")
def oauth2_login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter_by(email=form.username.lower()).first()
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(401, "Incorrect email or password", headers={"WWW-Authenticate": "Bearer"})
    if user.approval_status != "approved":
        raise HTTPException(403, "Your account is awaiting administrator approval", headers={"WWW-Authenticate": "Bearer"})
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


@app.get("/api/admin/approval-requests")
def approval_requests(admin: User = Depends(require_roles("administrator")), db: Session = Depends(get_db)):
    return [{"id": item.id, "name": item.name, "email": item.email, "role": item.role,
             "approval_status": item.approval_status, "created_at": item.created_at}
            for item in db.query(User).filter(User.approval_status == "pending")
            .order_by(User.created_at).all()]


@app.patch("/api/admin/users/{user_id}/approval")
def update_approval(user_id: int, approved: bool,
                    admin: User = Depends(require_roles("administrator")),
                    db: Session = Depends(get_db)):
    target = db.get(User, user_id)
    if not target or target.role not in ("educator", "debate_coach"):
        raise HTTPException(404, "Approval request not found")
    target.approval_status = "approved" if approved else "rejected"
    db.add(AuditLog(actor_id=admin.id, action="account_approved" if approved else "account_rejected",
                    target=f"user:{target.id}:{target.role}"))
    db.commit(); db.refresh(target)
    return {"id": target.id, "approval_status": target.approval_status}


def assignment_view(item: LearningAssignment):
    return {"id": item.id, "creator_id": item.creator_id, "learner_id": item.learner_id,
            "class_id": item.class_id, "curriculum_id": item.curriculum_id, "title": item.title, "assignment_type": item.assignment_type,
            "instructions": item.instructions, "due_at": item.due_at, "status": item.status,
            "submission": item.submission, "evaluation": json.loads(item.evaluation), "created_at": item.created_at}


@app.get("/api/coach/learners")
def coach_learners(coach: User = Depends(require_roles("debate_coach")), db: Session = Depends(get_db)):
    learners = db.query(User).filter_by(role="learner").order_by(User.name).all()
    result = []
    for learner in learners:
        sessions = db.query(DebateSession).filter_by(user_id=learner.id).all()
        scores = [item.overall_score for item in sessions]
        result.append({
            "id": learner.id,
            "name": learner.name,
            "email": learner.email,
            "bio": learner.bio,
            "experience_level": learner.experience_level,
            "preferred_debate_topics": json.loads(learner.preferred_debate_topics),
            "presentation_domains": json.loads(learner.presentation_domains),
            "learning_goals": json.loads(learner.learning_goals),
            "tracked_skills": json.loads(learner.tracked_skills),
            "sessions_count": len(sessions),
            "average_score": round(sum(scores) / len(scores), 1) if scores else 0,
            "latest_score": scores[-1] if scores else 0,
        })
    return result


@app.get("/api/coach/learners/{learner_id}")
def coach_learner_detail(learner_id: int, coach: User = Depends(require_roles("debate_coach")),
                         db: Session = Depends(get_db)):
    learner = db.query(User).filter_by(id=learner_id, role="learner").first()
    if not learner:
        raise HTTPException(404, "Learner not found")
    sessions = db.query(DebateSession).filter_by(user_id=learner.id).order_by(desc(DebateSession.created_at)).limit(10).all()
    return {
        "id": learner.id,
        "name": learner.name,
        "email": learner.email,
        "bio": learner.bio,
        "experience_level": learner.experience_level,
        "preferred_debate_topics": json.loads(learner.preferred_debate_topics),
        "presentation_domains": json.loads(learner.presentation_domains),
        "learning_goals": json.loads(learner.learning_goals),
        "coaching_preferences": json.loads(learner.coaching_preferences),
        "tracked_skills": json.loads(learner.tracked_skills),
        "recent_sessions": [SessionOut.model_validate(item) for item in sessions],
        "assignments": [
            assignment_view(item) for item in db.query(LearningAssignment)
            .filter_by(learner_id=learner.id, creator_id=coach.id)
            .order_by(desc(LearningAssignment.created_at)).limit(10).all()
        ],
    }


@app.post("/api/coach/learners/{learner_id}/assign", status_code=201)
def coach_assign(learner_id: int, payload: AssignmentCreate, coach: User = Depends(require_roles("debate_coach")), db: Session = Depends(get_db)):
    learner = db.query(User).filter_by(id=learner_id, role="learner").first()
    if not learner: raise HTTPException(404, "Learner not found")
    if payload.learner_id != learner_id:
        raise HTTPException(400, "Learner selection does not match the assignment URL")
    item = LearningAssignment(creator_id=coach.id, learner_id=learner_id, title=payload.title,
                              assignment_type=payload.assignment_type, instructions=payload.instructions,
                              due_at=payload.due_at, class_id=payload.class_id, curriculum_id=payload.curriculum_id)
    db.add(item); db.commit(); db.refresh(item)
    add_notification(db, learner_id, "feedback", "New coaching assignment",
                     f"{payload.title} has been assigned to you.", f"/assignments/{item.id}")
    db.commit()
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
    add_notification(db, item.learner_id, "feedback", "Assignment feedback is ready",
                     f"Your coach evaluated '{item.title}'.", f"/assignments/{item.id}")
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
             "learners": [{"id": learner.id, "name": learner.name, "email": learner.email}
                          for learner in db.query(User).join(ClassMember, ClassMember.learner_id == User.id)
                          .filter(ClassMember.class_id == item.id).order_by(User.name).all()]} for item in groups]


@app.get("/api/educator/learners")
def educator_learners(educator: User = Depends(require_roles("educator")), db: Session = Depends(get_db)):
    learners = db.query(User).filter_by(role="learner").order_by(User.name).all()
    return [{"id": learner.id, "name": learner.name, "email": learner.email}
            for learner in learners]


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
                                      instructions=payload.instructions, due_at=payload.due_at,
                                      curriculum_id=payload.curriculum_id)
            db.add(item); created.append(item)
            add_notification(db, member.learner_id, "feedback", "New class assignment",
                             f"{payload.title} has been assigned to your class.", f"/assignments/{item.id}")
        db.commit()
        return [assignment_view(item) for item in created]
    if payload.learner_id is None:
        raise HTTPException(400, "Choose a class or learner")
    learner = db.query(User).filter_by(id=payload.learner_id, role="learner").first()
    if not learner: raise HTTPException(404, "Learner not found")
    item = LearningAssignment(creator_id=educator.id, learner_id=learner.id, title=payload.title,
                              assignment_type=payload.assignment_type, instructions=payload.instructions,
                              due_at=payload.due_at, curriculum_id=payload.curriculum_id)
    db.add(item); db.commit(); db.refresh(item)
    add_notification(db, learner.id, "feedback", "New educator assignment",
                     f"{payload.title} has been assigned to you.", f"/assignments/{item.id}")
    db.commit()
    return assignment_view(item)


@app.get("/api/educator/assignments")
def educator_assignments(educator: User = Depends(require_roles("educator")), db: Session = Depends(get_db)):
    return [assignment_view(item) for item in db.query(LearningAssignment)
            .filter_by(creator_id=educator.id).order_by(desc(LearningAssignment.created_at)).all()]


@app.post("/api/educator/assignments/{assignment_id}/evaluate")
def evaluate_educator_assignment(assignment_id: int, payload: EvaluationCreate,
                                 educator: User = Depends(require_roles("educator")),
                                 db: Session = Depends(get_db)):
    item = db.query(LearningAssignment).filter_by(id=assignment_id, creator_id=educator.id).first()
    if not item:
        raise HTTPException(404, "Assignment not found")
    if not item.submission:
        raise HTTPException(400, "This assignment has not been submitted yet")
    item.evaluation = json.dumps({"score": payload.score, "feedback": payload.feedback,
                                  "evaluated_by": educator.id})
    item.status = "evaluated"
    add_notification(db, item.learner_id, "feedback", "Class assignment feedback is ready",
                     f"Your educator evaluated '{item.title}'.", f"/assignments/{item.id}")
    db.commit(); db.refresh(item)
    return assignment_view(item)


@app.get("/api/learner/assignments")
def learner_assignments(learner: User = Depends(require_roles("learner")), db: Session = Depends(get_db)):
    return [assignment_view(item) for item in db.query(LearningAssignment).filter_by(learner_id=learner.id).order_by(desc(LearningAssignment.created_at)).all()]


@app.get("/api/learner/classes")
def learner_classes(learner: User = Depends(require_roles("learner")), db: Session = Depends(get_db)):
    memberships = db.query(ClassMember).filter_by(learner_id=learner.id).all()
    return [{"id": group.id, "name": group.name, "description": group.description,
             "educator_id": group.educator_id}
            for membership in memberships
            if (group := db.get(ClassGroup, membership.class_id))]


@app.post("/api/learner/assignments/{assignment_id}/submit")
def submit_assignment(assignment_id: int, payload: SubmissionCreate, learner: User = Depends(require_roles("learner")), db: Session = Depends(get_db)):
    item = db.query(LearningAssignment).filter_by(id=assignment_id, learner_id=learner.id).first()
    if not item: raise HTTPException(404, "Assignment not found")
    item.submission = payload.submission; item.status = "submitted"
    creator = db.get(User, item.creator_id)
    if creator:
        add_notification(db, creator.id, "feedback", "Assignment submission received",
                         f"{learner.name} submitted '{item.title}' for review.", f"/assignments/{item.id}")
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
            "fallback": "deterministic", "agents": [{**agent, "configured": provider.ai.available}
                                                       for agent in provider.agent_registry],
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
    persisted_fallacies = list(result["fallacies"])
    for finding in result.get("ai_fallacy_review", []):
        excerpt = finding.get("excerpt", "")
        identity = (finding.get("type", "").casefold(), excerpt.casefold())
        if excerpt and excerpt.casefold() in payload.transcript.casefold() and not any(
            (item["type"].casefold(), item["excerpt"].casefold()) == identity for item in persisted_fallacies
        ):
            persisted_fallacies.append(finding)
    persisted_recommendations = list(result["recommendations"])
    if result.get("ai_insights"):
        for improvement in result["ai_insights"].get("improvements", []):
            if improvement and improvement not in persisted_recommendations:
                persisted_recommendations.append(improvement)
        summary = result["ai_insights"].get("summary")
        if summary and summary not in persisted_recommendations:
            persisted_recommendations.append(summary)
    session.overall_score = result["overall_score"]; db.add(session); db.flush()
    db.add(Analysis(session_id=session.id, clarity=result["clarity"], evidence=result["evidence"], persuasiveness=result["persuasiveness"], delivery=result["delivery"], fallacies=json.dumps(persisted_fallacies), counterarguments=json.dumps(result["counterarguments"]), recommendations=json.dumps(persisted_recommendations), pacing_wpm=result["pacing_wpm"], filler_words=result["filler_words"]))
    if session.scheduled_at:
        add_notification(db, user.id, "reminder", "Debate scheduled",
                         f"'{session.title}' is scheduled for {session.scheduled_at.isoformat()}.",
                         f"/sessions/{session.id}")
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
        persisted_fallacies = detail["fallacies"]
        persisted_recommendations = detail["recommendations"]
        detail.update(analyze_transcript(session.transcript, session.topic, session.position))
        detail["fallacies"] = persisted_fallacies
        detail["recommendations"] = persisted_recommendations
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
            "trend": [{"id": s.id, "date": s.created_at.date().isoformat(), "title": s.title, "score": s.overall_score} for s in ordered[-10:]],
            "recent_sessions": [SessionOut.model_validate(s) for s in ordered[-5:][::-1]]}


@app.get("/api/dashboard/learner")
def learner_dashboard(user: User = Depends(require_roles("learner")), db: Session = Depends(get_db)):
    base = dashboard(user, db)
    memberships = db.query(ClassMember).filter_by(learner_id=user.id).all()
    classes = []
    for membership in memberships:
        group = db.get(ClassGroup, membership.class_id)
        if group:
            classes.append({"id": group.id, "name": group.name, "description": group.description,
                            "educator_id": group.educator_id})
    return {"role": "learner", "debate_history": base["recent_sessions"],
            "performance_scores": {"average": base["average_score"], "best": base["best_score"], "skills": base["skills"]},
            "improvement_trends": base["trend"],
            "classes": classes,
            "assignments": [assignment_view(item) for item in db.query(LearningAssignment)
                            .filter_by(learner_id=user.id).order_by(desc(LearningAssignment.created_at)).limit(10).all()],
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
    owned_classes = db.query(ClassGroup).filter_by(educator_id=user.id).all()
    educator_assignments = db.query(LearningAssignment).filter_by(creator_id=user.id).all()
    return {"role": "educator", "class_analytics": {
                "learners": sum(db.query(ClassMember).filter_by(class_id=item.id).count() for item in owned_classes),
                "classes": len(owned_classes),
                "sessions": db.query(DebateSession).count(),
                "pending_reviews": sum(item.status == "submitted" for item in educator_assignments)},
            "classes": [{"id": item.id, "name": item.name,
                         "learners": db.query(ClassMember).filter_by(class_id=item.id).count()}
                        for item in owned_classes],
            "assignment_reviews": [{"id": item.id, "title": item.title, "status": item.status,
                                    "learner_id": item.learner_id}
                                   for item in educator_assignments],
            "student_rankings": ranking,
            "debate_performance_reports": [{"student_id": item["student_id"], "average_score": item["average_score"]} for item in ranking],
            "presentation_assessment_reports": [{"student_id": learner.id, "presentations": db.query(Presentation).filter_by(user_id=learner.id).count()} for learner in learners]}


@app.get("/api/dashboard/admin")
def administrator_dashboard(admin: User = Depends(require_roles("administrator")), db: Session = Depends(get_db)):
    pending = db.query(User).filter(User.approval_status == "pending").order_by(User.created_at).all()
    return {"role": "administrator", "user_management": {"users": db.query(User).count(), "pending_approvals": len(pending), "roles": {
                role: db.query(User).filter_by(role=role).count() for role in ("learner", "debate_coach", "educator", "administrator")}},
            "pending_approvals": [{"id": item.id, "name": item.name, "email": item.email,
                                  "role": item.role, "created_at": item.created_at}
                                 for item in pending],
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
    generated = provider.run_agent("counterarguments", {"claim": payload.claim, "topic": session.topic,
                                                          "position": session.position})
    items = generated["counterarguments"] if generated else [
        {"type": "evidence_based_rebuttal", "response": f"A strong opponent could challenge '{payload.claim}' by asking for its evidence, scope, and trade-offs."}
    ]
    return {"claim": payload.claim, "counterargument": items[0]["response"],
            "counterarguments": items,
            "coaching_prompt": "Steelman that objection, then answer it with one source and one concrete example."}


@app.post("/api/debate/turn")
def debate_turn(payload: DebateTurnRequest, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Persist a multi-turn simulation; OpenRouter is optional with a local fallback."""
    session = db.get(DebateSession, payload.session_id) if payload.session_id else None
    if session and session.user_id != user.id: raise HTTPException(404, "Simulation not found")
    topic = session.topic if session else payload.topic
    position = session.position if session else payload.position
    existing = db.query(DebateTurn).filter_by(session_id=session.id).count() if session else 0
    turn_number = existing + 1
    prior = "\n".join(t.content for t in session.turns) if session else ""
    state = {"topic": topic, "position": position, "transcript": prior,
             "turn": existing, "messages": []}
    current_turn = f"Learner's current {payload.turn_type}: {payload.content}".strip()
    provider_context = "\n".join(item for item in (prior, current_turn) if item)
    response, engine = provider.debate_response(topic, position, provider_context, payload.turn_type)
    if engine == "deterministic_fallback":
        response = simulate_turn(state)["response"]
    if not session:
        session = DebateSession(user_id=user.id, title=f"Debate: {topic}", topic=topic,
                                position=position, status="active", transcript="")
        db.add(session); db.flush()
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
    if transcript:
        analysis["transcript"] = transcript
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
            "message": "Upload stored; no transcript was available. Install/configure Whisper and FFmpeg, or provide a transcript."
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
    plan = {"focus": focus, "baseline": dict(priorities), "weeks": [{"week": 1, "goal": drills[focus]},
            {"week": 2, "goal": "Repeat a timed practice and compare your trend."},
            {"week": 3, "goal": "Rehearse a counterargument without notes."}]}
    guidance = provider.run_agent("learning_plan", {"focus": focus, "baseline": plan["baseline"],
                                                       "current_plan": plan["weeks"],
                                                       "learning_goals": json.loads(user.learning_goals)})
    if guidance:
        plan["agent_guidance"] = guidance
    return plan


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
    coaching = provider.run_agent("presentation_coaching", {
        "title": payload.title, "audience": payload.audience, "transcript": payload.transcript,
        "duration_seconds": duration, "pacing_wpm": result["pacing_wpm"],
        "filler_words": result["filler_words"], "clarity_score": result["clarity"],
        "confidence_score": result["confidence_score"], "engagement_score": result["engagement_score"],
    })
    if coaching:
        result["agent_feedback"] = coaching
        result["recommendations"] = list(dict.fromkeys(result["recommendations"] + coaching["recommendations"]))
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
    agent_review = provider.run_agent("argument_analysis", {"transcript": payload.transcript,
                                                               "topic": payload.title, "position": "for"})
    return {"arguments": result["arguments"], "score_dimensions": result["score_dimensions"],
            "reasoning_score": result["reasoning_score"], "recommendations": result["recommendations"],
            "agent_review": agent_review}


@app.post("/api/analysis/fallacies")
def fallacy_analysis(payload: PresentationCreate, user: User = Depends(current_user)):
    result = analyze_transcript(payload.transcript, payload.title, "for")
    specialist = provider.run_agent("fallacy_detection", {"transcript": payload.transcript,
                                                             "topic": payload.title, "position": "for"})
    fallacies = result["fallacies"]
    if specialist:
        seen = {(item["type"].casefold(), item["excerpt"].casefold()) for item in fallacies}
        for item in specialist["fallacies"]:
            key = (item["type"].casefold(), item["excerpt"].casefold())
            if item["excerpt"].casefold() in payload.transcript.casefold() and key not in seen:
                fallacies.append(item)
                seen.add(key)
    return {"fallacies": fallacies, "corrections": [item["correction"] for item in fallacies]}


@app.post("/api/analysis/counterarguments")
def counterargument_analysis(payload: CounterargumentRequest, user: User = Depends(current_user)):
    generated = provider.run_agent("counterarguments", {"claim": payload.claim})
    return {"claim": payload.claim, "counterarguments": generated["counterarguments"] if generated else [
        {"type": "logical_rebuttal", "response": f"Test the assumptions behind '{payload.claim}' and identify the missing condition."},
        {"type": "evidence_based_rebuttal", "response": "Request a verifiable source, then compare its scope and quality with the claim."},
        {"type": "alternative_perspective", "response": "Steelman the strongest opposing perspective before defending the claim."},
        {"type": "challenge_question", "response": "What evidence would change your mind about this claim?"},
    ]}


@app.post("/api/analysis/counterargument-feedback")
def counterargument_feedback(payload: CounterargumentCreate, user: User = Depends(current_user)):
    review = provider.run_agent("argument_analysis", {
        "claim": payload.claim,
        "counterargument_type": payload.counter_type,
        "learner_rebuttal": payload.response,
    })
    if review:
        return {"score": None, "summary": review["summary"],
                "strengths": review["strengths"], "improvements": review["improvements"],
                "engine": provider.ai.name}
    response = payload.response.casefold()
    strengths = []
    improvements = []
    if len(payload.response.split()) >= 20:
        strengths.append("Your rebuttal gives enough detail to evaluate.")
    else:
        improvements.append("Develop the rebuttal with a reason and a concrete example.")
    if any(marker in response for marker in ("because", "evidence", "source", "however", "although")):
        strengths.append("You included reasoning or qualification rather than only repeating the claim.")
    else:
        improvements.append("Explain why your response follows; do not rely on assertion alone.")
    return {"score": None, "summary": "Your rebuttal is saved. Strengthen the reasoning before using it in a live debate.",
            "strengths": strengths, "improvements": improvements, "engine": "deterministic_fallback"}


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
frontend_root = frontend_dist if frontend_dist.exists() else Path("frontend")


@app.get("/{full_path:path}")
def frontend_route(full_path: str):
    if full_path == "" or full_path.endswith("/"):
        requested = frontend_root / full_path / "index.html"
    else:
        requested = frontend_root / full_path
    if requested.is_file():
        return FileResponse(requested)
    if full_path == "" or not full_path.startswith("api/"):
        return FileResponse(frontend_root / "index.html")
    raise HTTPException(404, "Not found")
