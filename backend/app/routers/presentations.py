import csv
import io

from fastapi import APIRouter, Depends, File, Header, HTTPException, Query, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.timezone import format_ist
from app.models.presentation import PresentationAnalysis
from app.models.user import User
from app.schemas.presentation import PresentationAnalysisResponse, PresentationDashboardResponse
from app.services.auth_service import get_current_user
from app.services.presentation_service import create_presentation_submission, retry_presentation_submission


router = APIRouter(prefix="/presentations", tags=["presentations"])


@router.post("", response_model=PresentationAnalysisResponse, status_code=status.HTTP_201_CREATED)
async def submit_presentation(
    file: UploadFile = File(...),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key", max_length=64),
    current_user: User = Depends(get_current_user),
    database: Session = Depends(get_db),
):
    filename = file.filename or ""
    if not filename or len(filename) > 255:
        raise HTTPException(status_code=422, detail="Provide a valid presentation filename.")
    content = await file.read(settings.presentation_max_upload_bytes + 1)
    if not content:
        raise HTTPException(status_code=422, detail="The uploaded file is empty.")
    if len(content) > settings.presentation_max_upload_bytes:
        raise HTTPException(status_code=413, detail="The uploaded file exceeds the configured size limit.")
    try:
        return create_presentation_submission(
            database,
            user_id=current_user.id,
            filename=filename,
            mime_type=file.content_type or "application/octet-stream",
            content=content,
            idempotency_key=idempotency_key,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.get("/dashboard", response_model=PresentationDashboardResponse)
def get_presentation_dashboard(
    current_user: User = Depends(get_current_user),
    database: Session = Depends(get_db),
):
    records = (
        database.query(PresentationAnalysis)
        .filter(PresentationAnalysis.user_id == current_user.id)
        .order_by(PresentationAnalysis.created_at.desc())
        .all()
    )
    scores = [
        record.analysis_result.get("overall_score")
        for record in records
        if record.status == "completed"
        and isinstance(record.analysis_result, dict)
        and isinstance(record.analysis_result.get("overall_score"), (int, float))
        and 0 <= record.analysis_result["overall_score"] <= 100
    ]
    return {
        "total_submissions": len(records),
        "completed_submissions": sum(record.status == "completed" for record in records),
        "average_score": round(sum(scores) / len(scores), 2) if scores else None,
        "recent_submissions": records[:5],
    }


@router.get("", response_model=list[PresentationAnalysisResponse])
def list_presentations(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    database: Session = Depends(get_db),
):
    return (
        database.query(PresentationAnalysis)
        .filter(PresentationAnalysis.user_id == current_user.id)
        .order_by(PresentationAnalysis.created_at.desc(), PresentationAnalysis.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/reports.json")
def export_json_report(current_user: User = Depends(get_current_user), database: Session = Depends(get_db)):
    records = (
        database.query(PresentationAnalysis)
        .filter(PresentationAnalysis.user_id == current_user.id)
        .order_by(PresentationAnalysis.created_at.asc(), PresentationAnalysis.id.asc())
        .all()
    )
    return [
        PresentationAnalysisResponse.model_validate(record).model_dump(mode="json")
        for record in records
    ]


@router.get("/reports.csv")
def export_csv_report(current_user: User = Depends(get_current_user), database: Session = Depends(get_db)):
    records = (
        database.query(PresentationAnalysis)
        .filter(PresentationAnalysis.user_id == current_user.id)
        .order_by(PresentationAnalysis.created_at.asc(), PresentationAnalysis.id.asc())
        .all()
    )
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "filename", "status", "submitted_at", "word_count", "filler_word_count", "duration_seconds", "speaking_rate_wpm", "overall_score", "strengths", "improvement_areas", "recommendations"])
    for record in records:
        analysis = record.analysis_result or {}
        values = [
            record.id,
            record.display_filename,
            record.status,
            format_ist(record.created_at, "%Y-%m-%d %I:%M:%S %p") if record.created_at else "",
            record.word_count,
            record.filler_word_count,
            record.duration_seconds,
            record.speaking_rate_wpm,
            analysis.get("overall_score"),
            "; ".join(analysis.get("strengths", [])),
            "; ".join(analysis.get("improvement_areas", [])),
            "; ".join(analysis.get("recommendations", [])),
        ]
        writer.writerow([_csv_safe(value) for value in values])
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="presentation-report.csv"'},
    )


@router.get("/{presentation_id}", response_model=PresentationAnalysisResponse)
def get_presentation(
    presentation_id: int,
    current_user: User = Depends(get_current_user),
    database: Session = Depends(get_db),
):
    record = database.get(PresentationAnalysis, presentation_id)
    if record is None or record.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Presentation analysis not found.")
    return record


@router.post("/{presentation_id}/retry", response_model=PresentationAnalysisResponse)
def retry_presentation(
    presentation_id: int,
    current_user: User = Depends(get_current_user),
    database: Session = Depends(get_db),
):
    try:
        return retry_presentation_submission(
            database,
            presentation_id=presentation_id,
            user_id=current_user.id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


def _csv_safe(value):
    if value is None:
        return ""
    text = str(value)
    if text.startswith(("=", "+", "-", "@", "\t", "\r")):
        return "'" + text
    return text
