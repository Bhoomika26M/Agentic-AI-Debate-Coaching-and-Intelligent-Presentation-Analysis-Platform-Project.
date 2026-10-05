from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models
from .database import engine
from .routers import auth, users, debates, dashboard

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Agentic AI Debate Coach & Presentation Analysis Platform (API)",
    description=(
        "Internship build. Implements: auth & roles, user profile/skill "
        "management, debate session management, argument analysis engine, "
        "logical fallacy detection engine, counterargument generation "
        "engine, performance scoring engine, and dashboard/analytics -- "
        "all using free, local, rule-based NLP (no paid LLM API)."
    ),
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(debates.router)
app.include_router(dashboard.router)


@app.get("/")
def root():
    return {"status": "ok", "service": "debate-coach-api"}
