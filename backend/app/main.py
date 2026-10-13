
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone

from app.api.arguments import router as arguments_router
from app.api.rebuttals import router as rebuttals_router
from app.api.presentations import router as presentations_router

app = FastAPI(
    title="Agentic AI Debate Coach",
    description=(
        "An AI platform for debate analysis, "
        "argument evaluation, and presentation coaching."
    ),
    version="0.1.0",
)

# Allow the React frontend to communicate with the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(arguments_router)
app.include_router(rebuttals_router)
app.include_router(presentations_router)


@app.get("/")
def home():
    return {
        "message": "Welcome to the Agentic AI Debate Coach API!",
        "status": "running",
        "version": "0.1.0",
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/api/v1/features")
def get_features():
    return {
        "features": [
            "Argument analysis",
            "Logical fallacy detection",
            "Rebuttal generation",
            "Debate simulation",
            "Presentation analysis",
            "Performance scoring",
            "Personalized coaching",
        ],
        "status": "initial_setup",
    }
