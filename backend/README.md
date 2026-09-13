# Debate Coach Backend

Run from this directory after activating a virtual environment:

```powershell
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload
```

Configure PostgreSQL in `.env`. Migrations:

```powershell
alembic upgrade head
alembic revision --autogenerate -m "initial migration"
```
