# DebateIQ: Installation & Setup Guide

## 1. Prerequisites
- **Python**: 3.11 or higher (Python 3.13 supported)
- **Node.js**: v18+ (Node v22+ supported) with `npm`
- **Docker & Docker Compose** (optional for containerized deployment)

---

## 2. Quick Local Setup (Development Mode)

### Step 1: Clone or Navigate to Directory
```bash
cd debateiq
```

### Step 2: Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default `.env` settings:
- `USE_SQLITE=true` (zero-setup local database)
- `LLM_PROVIDER=mock` (runs 100% offline without requiring any API keys)
- If you have a Gemini API key: set `GEMINI_API_KEY=your_key` and `LLM_PROVIDER=gemini`

### Step 3: Run the Backend (FastAPI)
```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
python -m app.utils.seed  # Seeds demo users, topics, debates
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
- Interactive Swagger API: `http://127.0.0.1:8000/docs`
- Redoc Documentation: `http://127.0.0.1:8000/redoc`

### Step 4: Run the Frontend (React + Vite)
In a separate terminal:
```bash
cd debateiq/frontend
npm install
npm run dev
```
- Open application: `http://localhost:5173`

---

## 3. Containerized Setup (Docker Compose)

Run the full stack with PostgreSQL, FastAPI, and Nginx-served React frontend:
```bash
cd debateiq
docker-compose up --build
```
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- PostgreSQL: `localhost:5432`

---

## 4. Running Automated Tests

### Backend Tests (pytest)
```bash
cd debateiq/backend
pytest tests/ -v
```

### Frontend Tests (Vitest)
```bash
cd debateiq/frontend
npm test
```
