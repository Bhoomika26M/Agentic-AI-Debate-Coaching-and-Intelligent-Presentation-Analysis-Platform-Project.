from datetime import UTC, datetime, timedelta

from jose import JWTError, jwt
from pwdlib import PasswordHash

from app.core.config import settings

password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
	return password_hash.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
	return password_hash.verify(password, hashed_password)


def create_access_token(subject: str) -> str:
	expires_at = datetime.now(UTC) + timedelta(minutes=settings.access_token_expire_minutes)
	return jwt.encode({"sub": subject, "exp": expires_at}, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> str:
	try:
		payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
		subject = payload.get("sub")
		if not subject:
			raise ValueError("Token subject is missing")
		return str(subject)
	except (JWTError, ValueError) as error:
		raise ValueError("Invalid or expired token") from error
