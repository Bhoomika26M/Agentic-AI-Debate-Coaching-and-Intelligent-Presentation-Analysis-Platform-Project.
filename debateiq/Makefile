.PHONY: setup test dev backend frontend docker-up docker-down seed clean

setup:
	@echo "Setting up DebateIQ..."
	cd backend && python -m venv venv && venv/bin/pip install -r requirements.txt
	cd frontend && npm install

seed:
	@echo "Seeding database with demo data..."
	cd backend && python -m app.utils.seed

backend:
	@echo "Starting FastAPI backend server..."
	cd backend && uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

frontend:
	@echo "Starting Vite frontend dev server..."
	cd frontend && npm run dev

test:
	@echo "Running tests..."
	cd backend && pytest tests/ -v
	cd frontend && npm test

docker-up:
	docker compose up --build -d

docker-down:
	docker compose down -v

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	rm -rf backend/debateiq.db
