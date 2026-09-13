from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import auth, debates, profiles, skills, users

app = FastAPI(title="Debate Coach API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(profiles.router)
app.include_router(skills.router)
app.include_router(debates.router)


@app.get("/")
def root():
    return {"message": "Debate Coach API is running"}


@app.get("/health")
def health():
    return {"status": "healthy"}
