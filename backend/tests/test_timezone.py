from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from app.core.timezone import IST, UTC, ensure_utc, format_ist, format_ist_date, format_ist_time, to_ist, to_utc_iso
from app.schemas.debate import DebateResponse, DebateArgumentResponse


def test_timezone_conversion():
    # Concrete test case specified by requirement: 2026-10-30T12:00:00Z must be 5:30 PM in IST
    utc_dt = datetime(2026, 10, 30, 12, 0, 0, tzinfo=timezone.utc)
    ist_dt = to_ist(utc_dt)

    assert ist_dt.hour == 17
    assert ist_dt.minute == 30
    assert ist_dt.tzinfo == IST

    formatted = format_ist(utc_dt, "%d %B %Y, %I:%M %p")
    assert formatted == "30 October 2026, 05:30 PM"


def test_naive_datetime_handling():
    # SQLite naive datetime assumed UTC
    naive_dt = datetime(2026, 10, 30, 12, 0, 0)
    ist_dt = to_ist(naive_dt)

    assert ist_dt.hour == 17
    assert ist_dt.minute == 30

    iso_utc = to_utc_iso(naive_dt)
    assert iso_utc == "2026-10-30T12:00:00Z"


def test_schema_serialization_utc_z():
    utc_dt = datetime(2026, 10, 30, 12, 0, 0) # naive from sqlite
    resp = DebateArgumentResponse(
        id=1,
        debate_id=1,
        user_id=1,
        turn_order=1,
        role="learner",
        position="for",
        content="Test content that is long enough.",
        is_ai=False,
        author_name="User",
        created_at=utc_dt,
    )
    json_data = resp.model_dump_json()
    assert '"created_at":"2026-10-30T12:00:00Z"' in json_data
