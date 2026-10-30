from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from typing import Annotated, Optional
from pydantic import PlainSerializer

IST = ZoneInfo("Asia/Kolkata")
UTC = timezone.utc


def ensure_utc(dt: datetime | None) -> datetime | None:
    """Ensure datetime is timezone-aware UTC. Naive datetimes are assumed UTC."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC)


def to_ist(dt: datetime | None) -> datetime | None:
    """Convert any datetime (naive assumed UTC) to Indian Standard Time (Asia/Kolkata)."""
    if dt is None:
        return None
    return ensure_utc(dt).astimezone(IST)


def format_ist(dt: datetime | None, fmt: str = "%d %B %Y, %I:%M %p") -> str:
    """Format datetime directly in IST (Asia/Kolkata)."""
    if dt is None:
        return "N/A"
    return to_ist(dt).strftime(fmt)


def format_ist_date(dt: datetime | None, fmt: str = "%B %d, %Y") -> str:
    """Format date portion in IST."""
    if dt is None:
        return "N/A"
    return to_ist(dt).strftime(fmt)


def format_ist_time(dt: datetime | None, fmt: str = "%I:%M %p") -> str:
    """Format time portion in IST."""
    if dt is None:
        return "N/A"
    return to_ist(dt).strftime(fmt)


def to_utc_iso(dt: datetime | None) -> str | None:
    """Serialize datetime to ISO-8601 with explicit Z UTC indicator."""
    if dt is None:
        return None
    utc_dt = ensure_utc(dt)
    return utc_dt.isoformat().replace("+00:00", "Z")


# Annotated Pydantic types for schemas to guarantee UTC 'Z' serialization in JSON
UTCDateTime = Annotated[datetime, PlainSerializer(to_utc_iso, return_type=str, when_used="json")]
OptUTCDateTime = Annotated[Optional[datetime], PlainSerializer(to_utc_iso, return_type=Optional[str], when_used="json")]
