from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, users, debates, analysis, simulation, presentation, reports
from app.core.database import engine, Base

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Agentic AI Debate Coach API",
    description="Backend API for Debate Simulation, Coaching, and Analytics",
    version="1.0.0"
)

# CORS setup for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(debates.router, prefix="/api/v1")
app.include_router(analysis.router, prefix="/api/v1")
app.include_router(simulation.router, prefix="/api/v1")
app.include_router(presentation.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {"message": "Welcome to the Agentic AI Debate Coach API"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
