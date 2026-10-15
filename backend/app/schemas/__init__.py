from app.schemas.auth import UserRegister, UserLogin, TokenResponse, UserOut, ProfileUpdate
from app.schemas.debate import DebateCreate, DebateOut, DebateMessageOut, DebateTurnRequest
from app.schemas.analysis import (
    ArgumentAnalysisRequest, ArgumentAnalysisOut,
    FallacyRequest, FallacyOut,
    CounterArgumentRequest, CounterArgumentOut,
    PresentationTextRequest, PresentationAudioResponse, PresentationAnalysisOut,
)
from app.schemas.dashboard import LearnerDashboard, AdminDashboard
from app.schemas.coaching import CoachingOut