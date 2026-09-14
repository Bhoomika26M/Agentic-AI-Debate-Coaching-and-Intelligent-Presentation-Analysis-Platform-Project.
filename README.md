# Agentic AI Debate Coach & Presentation Analysis Platform

## About

This is my internship project for building a platform for debate practice and presentation skills. This README currently covers Milestone 1, which includes the basic application and the main user and debate features.

## Milestone 1

Milestone 1 covers the basic project setup, user authentication, profiles, skills, and debate sessions. It also includes the first database migration and the frontend pages for using these features.

## Features

- User registration, login, logout, and current-user authentication
- Password hashing and JWT-based authentication
- Protected routes and navigation
- View and update user profiles
- Add, view, update, and delete skills
- Track skill and proficiency information
- Create, view, update, and cancel debate sessions
- List debate sessions and view individual debate details
- Manage debate participants and session status
- Login, registration, dashboard, profile, skills, and debate pages
- Initial database migration with Alembic

## Tech Stack

- React and Vite for the frontend
- Python and FastAPI for the backend
- PostgreSQL for the database
- SQLAlchemy and Pydantic
- Alembic for database migrations
- Docker Compose for running PostgreSQL locally

## Project Structure

```text
debate-coach-platform/
├── frontend/          # React/Vite application
├── backend/           # FastAPI application and migrations
├── docs/              # Project documentation
├── docker-compose.yml # PostgreSQL container setup
└── README.md
```

## How to Run

The project can be run locally with PostgreSQL in Docker, the FastAPI backend, and the React frontend.

From the project root, start PostgreSQL:

```powershell
docker compose up -d postgres
```

In a new terminal, set up and start the backend:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
alembic upgrade head
uvicorn app.main:app --reload
```

The backend runs at `http://localhost:8000`.

In another terminal, set up and start the frontend:

```powershell
cd frontend
npm install
copy .env.example .env
npm run dev
```

The frontend runs at `http://localhost:5173`.

## Status

Milestone 1 is completed. The implemented application, authentication, profile management, skill tracking, and debate-session management are working locally.
