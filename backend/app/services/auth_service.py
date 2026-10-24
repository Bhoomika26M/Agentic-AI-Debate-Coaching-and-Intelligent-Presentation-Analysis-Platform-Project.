
import os
import re
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path

import jwt
from fastapi import HTTPException, status
from pwdlib import PasswordHash


PROJECT_ROOT = Path(__file__).resolve().parents[3]
DATABASE_PATH = PROJECT_ROOT / "users.db"

SECRET_KEY = os.getenv("AUTH_SECRET_KEY")
if not SECRET_KEY:
    SECRET_KEY = "dev-only-change-this-secret-before-deployment"

ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = 30

password_hash = PasswordHash.recommended()


def get_connection():
    """Open a connection to the local SQLite user database."""
    connection = sqlite3.connect(DATABASE_PATH, timeout=10)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database():
    """Create the users table if it does not already exist."""
    try:
        with get_connection() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
                    password_hash TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
                """
            )
    except sqlite3.Error as error:
        raise RuntimeError(
            "Could not initialize the user database."
        ) from error


def validate_email(email: str):
    """Normalize an email address and check its basic format."""
    email = email.strip().lower()

    if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Enter a valid email address.",
        )

    return email


def create_user(email: str, password: str):
    """Create a password-protected account."""
    email = validate_email(email)

    if len(password) < 8 or len(password) > 128:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain between 8 and 128 characters.",
        )

    hashed_password = password_hash.hash(password)

    try:
        with get_connection() as connection:
            cursor = connection.execute(
                """
                INSERT INTO users (email, password_hash, created_at)
                VALUES (?, ?, ?)
                """,
                (
                    email,
                    hashed_password,
                    datetime.now(timezone.utc).isoformat(),
                ),
            )
            user_id = cursor.lastrowid

    except sqlite3.IntegrityError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        ) from error

    except sqlite3.Error as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not create the account.",
        ) from error

    return {"id": user_id, "email": email}


def create_demo_user(email: str):
    """Find or create a user for local email-only demo sign-in."""
    email = validate_email(email)

    try:
        with get_connection() as connection:
            user = connection.execute(
                """
                SELECT id, email
                FROM users
                WHERE email = ?
                """,
                (email,),
            ).fetchone()

            if user:
                return {
                    "id": user["id"],
                    "email": user["email"],
                }

            cursor = connection.execute(
                """
                INSERT INTO users (email, password_hash, created_at)
                VALUES (?, ?, ?)
                """,
                (
                    email,
                    password_hash.hash(os.urandom(32).hex()),
                    datetime.now(timezone.utc).isoformat(),
                ),
            )

            return {
                "id": cursor.lastrowid,
                "email": email,
            }

    except sqlite3.IntegrityError:
        # Handle a concurrent sign-in for the same email.
        with get_connection() as connection:
            user = connection.execute(
                """
                SELECT id, email
                FROM users
                WHERE email = ?
                """,
                (email,),
            ).fetchone()

            if user:
                return {
                    "id": user["id"],
                    "email": user["email"],
                }

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not create the demo account.",
        )

    except sqlite3.Error as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not access the demo user database.",
        ) from error


def authenticate_user(email: str, password: str):
    """Verify credentials for password-based sign-in."""
    email = email.strip().lower()

    try:
        with get_connection() as connection:
            user = connection.execute(
                """
                SELECT id, email, password_hash
                FROM users
                WHERE email = ?
                """,
                (email,),
            ).fetchone()

    except sqlite3.Error as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not access the user database.",
        ) from error

    if not user or not password_hash.verify(
        password, user["password_hash"]
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return {"id": user["id"], "email": user["email"]}


def create_access_token(user_id: int, email: str):
    """Create a signed JWT with a 30-minute expiration."""
    now = datetime.now(timezone.utc)

    payload = {
        "sub": str(user_id),
        "email": email,
        "iat": now,
        "exp": now + timedelta(minutes=ACCESS_TOKEN_MINUTES),
    }

    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_user_from_token(token: str):
    """Validate a JWT and retrieve its user from SQLite."""
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        subject = payload.get("sub")
        email = payload.get("email")

        if not subject or not isinstance(email, str) or not email:
            raise ValueError("Required token claims are missing.")

        user_id = int(subject)

    except (
        jwt.InvalidTokenError,
        KeyError,
        TypeError,
        ValueError,
    ) as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from error

    try:
        with get_connection() as connection:
            user = connection.execute(
                """
                SELECT id, email
                FROM users
                WHERE id = ?
                """,
                (user_id,),
            ).fetchone()

    except sqlite3.Error as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not verify the user account.",
        ) from error

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer exists.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return {"id": user["id"], "email": user["email"]}


initialize_database()
