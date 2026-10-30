import math
import re
from pathlib import Path, PurePath
from uuid import uuid4

from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.presentation import PresentationAnalysis
from app.schemas.presentation import PresentationEvaluation
from app.services.llm_service import LLMAnalysisError, llm_service


TEXT_TYPES = {".txt": "text/plain", ".md": "text/markdown"}
AUDIO_TYPES = {
    ".mp3": {"audio/mpeg", "audio/mp3", "application/octet-stream"},
    ".wav": {"audio/wav", "audio/x-wav", "audio/wave", "application/octet-stream"},
    ".m4a": {"audio/mp4", "audio/x-m4a", "application/octet-stream"},
    ".webm": {"audio/webm", "application/octet-stream"},
    ".ogg": {"audio/ogg", "application/ogg", "application/octet-stream"},
    ".flac": {"audio/flac", "audio/x-flac", "application/octet-stream"},
}
WORD_PATTERN = re.compile(r"\b[\w'-]+\b", re.UNICODE)
FILLER_PATTERN = re.compile(r"\b(?:um|uh|erm|er|like|basically|actually)\b", re.IGNORECASE)


def validate_submission(filename: str, mime_type: str, content: bytes) -> str:
    extension = Path(filename).suffix.lower()
    normalized_mime = mime_type.split(";", 1)[0].strip().lower()
    if extension in TEXT_TYPES:
        if normalized_mime not in {TEXT_TYPES[extension], "application/octet-stream"}:
            raise ValueError("The selected file type does not match its transcript extension.")
        try:
            transcript = content.decode("utf-8-sig").strip()
        except UnicodeDecodeError as exc:
            raise ValueError("Transcript files must use UTF-8 text encoding.") from exc
        if not transcript:
            raise ValueError("The transcript file is empty.")
        return "transcript"

    allowed_mimes = AUDIO_TYPES.get(extension)
    if not allowed_mimes or normalized_mime not in allowed_mimes:
        raise ValueError("Upload an MP3, WAV, M4A, MP4 audio, WebM, OGG, FLAC, TXT, or Markdown file.")
    if not _has_audio_signature(extension, content):
        raise ValueError("The uploaded audio file does not match its declared format.")
    return "audio"


def _has_audio_signature(extension: str, content: bytes) -> bool:
    if extension == ".wav":
        return content.startswith(b"RIFF") and content[8:12] == b"WAVE"
    if extension == ".ogg":
        return content.startswith(b"OggS")
    if extension == ".flac":
        return content.startswith(b"fLaC")
    if extension == ".m4a":
        return len(content) >= 12 and content[4:8] == b"ftyp"
    if extension == ".webm":
        return content.startswith(b"\x1a\x45\xdf\xa3")
    if extension == ".mp3":
        return content.startswith(b"ID3") or (
            len(content) > 1 and content[0] == 0xFF and content[1] & 0xE0 == 0xE0
        )
    return False


def _estimate_audio_duration(extension: str, content: bytes) -> float | None:
    try:
        if extension == ".wav" and len(content) > 44:
            channels = int.from_bytes(content[22:24], "little")
            sample_rate = int.from_bytes(content[24:28], "little")
            bits_per_sample = int.from_bytes(content[34:36], "little")
            if channels > 0 and sample_rate > 0 and bits_per_sample > 0:
                bytes_per_sec = sample_rate * channels * (bits_per_sample // 8)
                return round((len(content) - 44) / bytes_per_sec, 2)
        elif extension in {".mp3", ".m4a", ".ogg", ".webm", ".flac"}:
            kbps = 64.0 if len(content) < 1_000_000 else 128.0
            dur = (len(content) * 8.0) / (kbps * 1000.0)
            return round(dur, 1) if dur > 0 else None
    except Exception:
        pass
    return None


def _word_metrics(transcript: str, duration_seconds: float | None) -> tuple[int, int, float | None]:
    words = WORD_PATTERN.findall(transcript)
    filler_count = len(FILLER_PATTERN.findall(transcript))
    speaking_rate = None
    if duration_seconds is not None and math.isfinite(duration_seconds) and duration_seconds > 0:
        speaking_rate = round(len(words) * 60 / duration_seconds, 2)
    return len(words), filler_count, speaking_rate


def _private_storage_path(user_id: int, file_id: str, extension: str) -> Path:
    root = Path(settings.presentation_upload_directory).resolve()
    target = (root / "users" / str(user_id) / f"{file_id}{extension}").resolve()
    if root not in target.parents:
        raise ValueError("Invalid presentation storage path.")
    return target


def create_presentation_submission(
    database: Session,
    *,
    user_id: int,
    filename: str,
    mime_type: str,
    content: bytes,
    idempotency_key: str | None,
) -> PresentationAnalysis:
    submission_type = validate_submission(filename, mime_type, content)
    if idempotency_key:
        existing = (
            database.query(PresentationAnalysis)
            .filter_by(user_id=user_id, idempotency_key=idempotency_key)
            .first()
        )
        if existing is not None:
            return existing

    extension = Path(filename).suffix.lower()
    safe_name = PurePath(filename.replace("\\", "/")).name
    safe_name = "".join(char for char in safe_name if char.isprintable() and char not in '<>:"/\\|?*')[:255]
    safe_name = safe_name or f"presentation{extension}"
    file_id = uuid4().hex
    path = _private_storage_path(user_id, file_id, extension)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)

    record = PresentationAnalysis(
        user_id=user_id,
        display_filename=safe_name,
        storage_key=f"users/{user_id}/{file_id}{extension}",
        submission_type=submission_type,
        mime_type=mime_type.split(";", 1)[0].strip().lower(),
        file_size_bytes=len(content),
        idempotency_key=idempotency_key,
        status="processing",
    )
    database.add(record)
    try:
        database.commit()
    except IntegrityError:
        database.rollback()
        path.unlink(missing_ok=True)
        if idempotency_key:
            duplicate = (
                database.query(PresentationAnalysis)
                .filter_by(user_id=user_id, idempotency_key=idempotency_key)
                .first()
            )
            if duplicate is not None:
                return duplicate
        raise
    except SQLAlchemyError:
        database.rollback()
        path.unlink(missing_ok=True)
        raise
    database.refresh(record)

    try:
        if submission_type == "audio":
            transcription = llm_service.transcribe_presentation_audio(content, safe_name, record.mime_type)
            transcript = transcription["transcript"]
            duration_seconds = transcription.get("duration_seconds") or _estimate_audio_duration(extension, content)
        else:
            transcript = content.decode("utf-8-sig").strip()
            duration_seconds = None
        record.transcript = transcript
        record.duration_seconds = duration_seconds
        database.flush()
        raw_result = llm_service.analyze_presentation(transcript)
        try:
            result = PresentationEvaluation.model_validate(raw_result).model_dump(mode="json")
        except ValidationError as exc:
            raise LLMAnalysisError("The AI provider returned an invalid presentation analysis.") from exc
        word_count, filler_count, speaking_rate = _word_metrics(transcript, duration_seconds)
        record.word_count = word_count
        record.filler_word_count = filler_count
        record.speaking_rate_wpm = speaking_rate
        record.analysis_result = result
        record.status = "completed"
        record.error_message = None
    except Exception as exc:
        record.status = "failed"
        safe_msg = str(exc)
        if "key=" in safe_msg or "400 Bad Request" in safe_msg or "JSON mode is not enabled" in safe_msg:
            safe_msg = "Audio transcription failed. Please try again. If the issue persists, contact support."
        record.error_message = safe_msg[:300]
    database.commit()
    database.refresh(record)

    if record.status == "completed":
        try:
            from app.services.skill_service import sync_user_skills
            sync_user_skills(database, user_id)
        except Exception:
            pass

    return record


def retry_presentation_submission(
    database: Session,
    *,
    presentation_id: int,
    user_id: int,
) -> PresentationAnalysis:
    record = database.query(PresentationAnalysis).filter_by(id=presentation_id, user_id=user_id).first()
    if record is None:
        raise ValueError("Presentation record not found.")

    storage_root = Path(settings.presentation_upload_directory).resolve()
    file_path = (storage_root / record.storage_key).resolve()
    if not file_path.exists():
        raise ValueError("The uploaded presentation file was not found on the server.")

    content = file_path.read_bytes()
    record.status = "processing"
    record.error_message = None
    database.commit()
    database.refresh(record)

    try:
        if record.submission_type == "audio":
            transcription = llm_service.transcribe_presentation_audio(content, record.display_filename, record.mime_type)
            transcript = transcription["transcript"]
            ext = Path(record.display_filename).suffix.lower()
            duration_seconds = transcription.get("duration_seconds") or _estimate_audio_duration(ext, content)
        else:
            transcript = content.decode("utf-8-sig").strip()
            duration_seconds = None

        record.transcript = transcript
        record.duration_seconds = duration_seconds
        database.flush()

        raw_result = llm_service.analyze_presentation(transcript)
        try:
            result = PresentationEvaluation.model_validate(raw_result).model_dump(mode="json")
        except ValidationError as exc:
            raise LLMAnalysisError("The AI provider returned an invalid presentation analysis.") from exc

        word_count, filler_count, speaking_rate = _word_metrics(transcript, duration_seconds)
        record.word_count = word_count
        record.filler_word_count = filler_count
        record.speaking_rate_wpm = speaking_rate
        record.analysis_result = result
        record.status = "completed"
        record.error_message = None
    except Exception as exc:
        record.status = "failed"
        safe_msg = str(exc)
        if "key=" in safe_msg or "400 Bad Request" in safe_msg or "JSON mode is not enabled" in safe_msg:
            safe_msg = "Audio transcription failed. Please try again. If the issue persists, contact support."
        record.error_message = safe_msg[:300]

    database.commit()
    database.refresh(record)

    if record.status == "completed":
        try:
            from app.services.skill_service import sync_user_skills
            sync_user_skills(database, user_id)
        except Exception:
            pass

    return record
