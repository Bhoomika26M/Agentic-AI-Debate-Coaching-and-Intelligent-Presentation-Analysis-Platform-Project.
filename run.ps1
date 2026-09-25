param([switch]$Install)
if ($Install) { python -m pip install -r requirements.txt }
python -m uvicorn app.main:app --reload
