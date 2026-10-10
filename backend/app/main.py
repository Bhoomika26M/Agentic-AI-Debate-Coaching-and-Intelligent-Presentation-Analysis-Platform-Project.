from fastapi import FastAPI
from datetime import datetime, timezone
from app.api.arguments import router as arguments_router

app = FastAPI(
    title="Agentic AI Debate Coach",
    description=(
        "An AI platform for debate analysis, "
        "argument evaluation, and presentation coaching."
    ),
    version="0.1.0",
)
app.include_router(arguments_router)


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