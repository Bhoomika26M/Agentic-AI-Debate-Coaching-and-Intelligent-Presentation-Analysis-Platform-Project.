
from schemas import (
    UserRegister,
    UserLogin,
    UserResponse,
    TokenResponse,
    ProfileUpdate,
    ProfileResponse,
    RoleUpdate,
    StaffRegister,
    DebateSessionCreate,
    DebateSessionResponse,
    SkillAssessmentCreate,
    SkillAssessmentResponse,
    PresentationCreate,
    PresentationResponse,
    ArgumentAnalysisRequest,

)
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
import jwt
import logging

logger = logging.getLogger(__name__)
import models
from database import get_db
from schemas import UserRegister, UserLogin, UserResponse, TokenResponse
from security import hash_password, verify_password, create_access_token
from security import SECRET_KEY, ALGORITHM

from mongodb import check_mongodb_connection

from services.argument_analyzer import analyze_argument


from mongodb import analysis_collection
from datetime import datetime, timezone

app = FastAPI(
    title="AI Debate Coach API",
    description="Backend API for the Debate Coach and Presentation Analysis Platform",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

bearer_scheme = HTTPBearer()


@app.get("/")
def home():
    return {
        "message": "Welcome to the AI Debate Coach API!",
        "status": "running",
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.post(
    "/auth/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_user(
    user_data: UserRegister,
    db: Session = Depends(get_db),
):
    email = user_data.email.lower()

    existing_user = (
        db.query(models.User)
        .filter(models.User.email == email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    # Public registration is restricted to the Learner role.
    new_user = models.User(
        name=user_data.name.strip(),
        email=email,
        password=hash_password(user_data.password),
        role="Learner",
    )

    db.add(new_user)

    try:
        db.commit()
        db.refresh(new_user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    return new_user


@app.post("/auth/login", response_model=TokenResponse)
def login_user(
    login_data: UserLogin,
    db: Session = Depends(get_db),
):
    email = login_data.email.lower()

    user = (
        db.query(models.User)
        .filter(models.User.email == email)
        .first()
    )

    if not user or not verify_password(
        login_data.password, user.password
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(user.id, user.role)

    return {
        "access_token": token,
        "token_type": "bearer",
    }


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    try:
        payload = jwt.decode(
            credentials.credentials,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        subject = payload.get("sub")
        if not subject:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token.",
            )

        user_id = int(subject)

    except (jwt.InvalidTokenError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(models.User).filter(
        models.User.id == user_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found.",
        )

    return user


@app.get("/auth/me", response_model=UserResponse)
def read_current_user(
    current_user: models.User = Depends(get_current_user),
):
    return current_user


@app.get("/profile", response_model=ProfileResponse)
def get_user_profile(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    profile = (
        db.query(models.Profile)
        .filter(models.Profile.user_id == current_user.id)
        .first()
    )

    if profile is None:
        profile = models.Profile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)

    return profile



@app.put("/profile", response_model=ProfileResponse)
def update_user_profile(
    profile_data: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    profile = (
        db.query(models.Profile)
        .filter(models.Profile.user_id == current_user.id)
        .first()
    )

    if profile is None:
        profile = models.Profile(user_id=current_user.id)
        db.add(profile)

    for field, value in profile_data.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)

    db.commit()
    db.refresh(profile)

    return profile


def require_roles(*allowed_roles):
    def role_checker(
        current_user: models.User = Depends(get_current_user),
    ):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action.",
            )

        return current_user

    return role_checker


@app.post("/admin/register-admin", response_model=UserResponse, status_code=201)
def register_admin(
    user_data: UserRegister,
    current_user: models.User = Depends(
        require_roles("Administrator")
    ),
    db: Session = Depends(get_db),
):
    existing_user = db.scalar(
        select(models.User).where(
            models.User.email == user_data.email
        )
    )

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists.",
        )

    new_admin = models.User(
        name=user_data.name,
        email=user_data.email,
        password=hash_password(user_data.password),
        role="Administrator",
    )

    db.add(new_admin)

    try:
        db.commit()
        db.refresh(new_admin)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Could not create the account.",
        )

    return new_admin


@app.get("/admin/users", response_model=list[UserResponse])
def list_users(
    current_user: models.User = Depends(
        require_roles("Administrator")
    ),
    db: Session = Depends(get_db),
):
    return db.scalars(
        select(models.User).order_by(models.User.id)
    ).all()


@app.patch("/admin/users/{user_id}/role", response_model=UserResponse)
def update_user_role(
    user_id: int,
    role_data: RoleUpdate,
    current_user: models.User = Depends(
        require_roles("Administrator")
    ),
    db: Session = Depends(get_db),
):
    target_user = db.get(models.User, user_id)

    if target_user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found.",
        )

    if target_user.id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot change your own role.",
        )

    if (
        target_user.role == "Administrator"
        and role_data.role != "Administrator"
    ):
        admin_count = db.query(models.User).filter(
            models.User.role == "Administrator"
        ).count()

        if admin_count <= 1:
            raise HTTPException(
                status_code=400,
                detail="At least one Administrator must remain.",
            )

    target_user.role = role_data.role
    db.commit()
    db.refresh(target_user)

    return target_user


@app.get("/admin/test")
def admin_test(
    current_user: models.User = Depends(require_roles("Administrator")),
):
    return {
        "message": "Administrator access granted!",
        "user": current_user.name,
        "role": current_user.role,
    }


@app.get("/coach/dashboard")
def coach_dashboard(
    current_user: models.User = Depends(
        require_roles("Debate Coach")
    ),
):
    return {
        "message": "Debate Coach dashboard access granted.",
        "user": current_user.name,
        "role": current_user.role,
        "features": [
            "Review assigned learners",
            "Review debate performance",
            "Provide coaching feedback",
            "Track learner skill development",
        ],
    }


@app.get("/educator/dashboard")
def educator_dashboard(
    current_user: models.User = Depends(
        require_roles("Educator")
    ),
):
    return {
        "message": "Educator dashboard access granted.",
        "user": current_user.name,
        "role": current_user.role,
        "features": [
            "View class progress",
            "Review learner performance",
            "Access educational analytics",
        ],
    }


@app.post(
    "/auth/register-staff",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_staff(
    user_data: StaffRegister,
    db: Session = Depends(get_db),
      current_user: models.User = Depends(
        require_roles("Administrator")
    ),
):
    existing_user = db.scalar(
        select(models.User).where(
            models.User.email == user_data.email
        )
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    new_user = models.User(
        name=user_data.name,
        email=user_data.email,
        password=hash_password(user_data.password),
        role=user_data.role,
    )

    db.add(new_user)

    try:
        db.commit()
        db.refresh(new_user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Could not create the account.",
        )

    return new_user



@app.post(
    "/debates",
    response_model=DebateSessionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_debate_session(
    session_data: DebateSessionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    new_session = models.DebateSession(
        user_id=current_user.id,
        topic=session_data.topic.strip(),
        debate_format=session_data.debate_format.strip(),
        position=session_data.position.strip(),
        status="In Progress",
    )

    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    return new_session


@app.get(
    "/debates",
    response_model=list[DebateSessionResponse],
)
def list_debate_sessions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.DebateSession)
        .filter(models.DebateSession.user_id == current_user.id)
        .order_by(models.DebateSession.id.desc())
        .all()
    )



@app.post(
    "/skills/assessments",
    response_model=SkillAssessmentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_skill_assessment(
    assessment_data: SkillAssessmentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if assessment_data.debate_id is not None:
        debate = (
            db.query(models.DebateSession)
            .filter(
                models.DebateSession.id == assessment_data.debate_id,
                models.DebateSession.user_id == current_user.id,
            )
            .first()
        )

        if not debate:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Debate session not found.",
            )

    assessment = models.Argument(
        user_id=current_user.id,
        debate_id=assessment_data.debate_id,
        text=assessment_data.text.strip(),
        claim=assessment_data.claim,
        evidence=assessment_data.evidence,
        reasoning_quality=assessment_data.reasoning_quality,
        evidence_strength=assessment_data.evidence_strength,
        logical_consistency=assessment_data.logical_consistency,
        persuasiveness=assessment_data.persuasiveness,
        argument_score=assessment_data.argument_score,
        fallacies=assessment_data.fallacies,
        feedback=assessment_data.feedback,
    )

    try:
        db.add(assessment)
        db.commit()
        db.refresh(assessment)
        return assessment
    except Exception:
        db.rollback()
        raise



@app.post("/arguments/analyze")
def analyze_argument_endpoint(
    request: ArgumentAnalysisRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    try:
        result = analyze_argument(request.text)

        # Save the structured assessment in PostgreSQL.
        assessment = models.Argument(
            user_id=current_user.id,
            debate_id=None,
            text=request.text.strip(),
            claim=result.get("claim"),
            evidence="\n".join(result.get("evidence", [])),
            reasoning_quality=float(result.get("argument_score", 0)),
            evidence_strength=(
                100.0 if result.get("evidence") else 0.0
            ),
            logical_consistency=(
                0.0 if result.get("possible_fallacies") else 100.0
            ),
            persuasiveness=float(result.get("argument_score", 0)),
            argument_score=float(result.get("argument_score", 0)),
            fallacies=", ".join(result.get("possible_fallacies", [])),
            feedback="\n".join(result.get("feedback", [])),
            created_at=datetime.now(timezone.utc).replace(tzinfo=None),
        )

        db.add(assessment)
        db.commit()
        db.refresh(assessment)

        # Save the detailed analysis in MongoDB.
        mongo_result = analysis_collection.insert_one({
            "user_id": current_user.id,
            "postgres_argument_id": assessment.id,
            "analysis_type": result.get("analysis_type"),
            "claim": result.get("claim"),
            "evidence": result.get("evidence", []),
            "possible_fallacies": result.get("possible_fallacies", []),
            "argument_score": result.get("argument_score"),
            "feedback": result.get("feedback", []),
            "word_count": result.get("word_count"),
            "sentence_count": result.get("sentence_count"),
        })

        return {
            **result,
            "argument_id": assessment.id,
            "mongo_analysis_id": str(mongo_result.inserted_id),
            "message": "Analysis completed and saved successfully.",
        }

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    
    except Exception as exc:
        db.rollback()
        logger.exception("Argument analysis endpoint failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to save the analysis. Please check the backend logs.",
        ) from exc


@app.get("/mongodb/health")
def mongodb_health():
    if check_mongodb_connection():
        return {"status": "connected", "database": "debate_coach_ai"}

    raise HTTPException(
        status_code=503,
        detail="MongoDB connection failed."
    )



from datetime import datetime, timezone


@app.post(
    "/presentations",
    response_model=PresentationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_presentation(
    presentation_data: PresentationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    presentation = models.Presentation(
        user_id=current_user.id,
        title=presentation_data.title.strip(),
        presentation_domain=presentation_data.presentation_domain,
        duration_seconds=presentation_data.duration_seconds,
        transcript=presentation_data.transcript,
        status="Uploaded",
        created_at=datetime.now(timezone.utc).replace(tzinfo=None),
    )

    db.add(presentation)
    try:
        db.commit()
        db.refresh(presentation)
        return presentation
    except Exception:
        db.rollback()
        raise


@app.get(
    "/presentations",
    response_model=list[PresentationResponse],
)
def list_presentations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.Presentation)
        .filter(models.Presentation.user_id == current_user.id)
        .order_by(models.Presentation.id.desc())
        .all()
    )
