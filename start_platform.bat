@echo off
echo Starting AI Debate Coach Platform...

start "DebateIQ Backend (Django)" cmd /k "cd backend && ..\venv\Scripts\python.exe manage.py runserver 0.0.0.0:8000"
start "DebateIQ Frontend (Vite)" cmd /k "cd frontend && npm run dev"

timeout /t 3 /nobreak >nul
start http://localhost:5173

echo Both servers started!
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:8000
