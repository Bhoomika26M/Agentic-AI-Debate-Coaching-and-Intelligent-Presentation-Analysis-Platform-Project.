from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from io import BytesIO
import csv
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from app.db.session import get_db
from app.models.user import User
from app.models.analysis import ArgumentAnalysis, PerformanceEvaluation
from app.core.deps import get_current_user

router = APIRouter(prefix="/api/reports", tags=["reports"])

def _auth_arg(arg_id: str, user: User, db: Session) -> ArgumentAnalysis:
    a = db.query(ArgumentAnalysis).filter_by(id=arg_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Report not found")
    if a.user_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    return a

@router.get("/argument/{arg_id}/pdf")
def argument_pdf(arg_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    a = _auth_arg(arg_id, user, db)
    buf = BytesIO()
    p = canvas.Canvas(buf, pagesize=A4)
    y = 800
    p.setFont("Helvetica-Bold", 16); p.drawString(50, y, "Argument Analysis Report"); y -= 30
    p.setFont("Helvetica", 10)
    p.drawString(50, y, f"Generated: {a.created_at.isoformat()}"); y -= 20
    p.drawString(50, y, f"Overall Score: {a.overall_score}"); y -= 30
    p.setFont("Helvetica-Bold", 12); p.drawString(50, y, "Main Claim"); y -= 18
    p.setFont("Helvetica", 10)
    for line in _wrap(a.analysis_json.get("main_claim", ""), 90):
        p.drawString(50, y, line); y -= 14
    y -= 10
    p.setFont("Helvetica-Bold", 12); p.drawString(50, y, "Improvements"); y -= 18
    p.setFont("Helvetica", 10)
    for s in a.analysis_json.get("improvement_suggestions", []):
        for line in _wrap(f"- {s}", 90):
            p.drawString(50, y, line); y -= 14
            if y < 60:
                p.showPage(); y = 800
    p.save(); buf.seek(0)
    return StreamingResponse(buf, media_type="application/pdf",
                             headers={"Content-Disposition": f"attachment; filename=argument_{arg_id}.pdf"})

@router.get("/scores/csv")
def scores_csv(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(PerformanceEvaluation)
    if user.role != "admin":
        q = q.filter_by(user_id=user.id)
    rows = q.all()
    buf = BytesIO()
    text = buf
    writer = csv.writer(text)
    writer.writerow(["id", "overall", "argument_quality", "evidence_usage",
                     "logical_consistency", "rebuttal_effectiveness",
                     "communication_skills", "created_at"])
    for r in rows:
        writer.writerow([r.id, r.overall_score, r.argument_quality, r.evidence_usage,
                         r.logical_consistency, r.rebuttal_effectiveness,
                         r.communication_skills, r.created_at.isoformat()])
    buf.seek(0)
    return StreamingResponse(buf, media_type="text/csv",
                             headers={"Content-Disposition": "attachment; filename=scores.csv"})

def _wrap(text: str, width: int):
    words = text.split()
    lines, line = [], ""
    for w in words:
        if len(line) + len(w) + 1 > width:
            lines.append(line); line = w
        else:
            line = f"{line} {w}".strip()
    if line: lines.append(line)
    return lines or [""]