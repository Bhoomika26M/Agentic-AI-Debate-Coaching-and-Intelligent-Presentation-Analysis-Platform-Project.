import asyncio
import os

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient
from jwt.exceptions import InvalidTokenError, PyJWKClientConnectionError, PyJWKClientError

SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
JWKS_URL = os.getenv("SUPABASE_JWKS_URL", "").strip() or (
    f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json" if SUPABASE_URL else ""
)
JWT_ISSUER = os.getenv("SUPABASE_JWT_ISSUER", "").strip() or (
    f"{SUPABASE_URL}/auth/v1" if SUPABASE_URL else ""
)
REQUIRE_AUTH = os.getenv("REQUIRE_AUTH", "false").strip().lower() == "true"
bearer = HTTPBearer(auto_error=False)
jwks_client = PyJWKClient(JWKS_URL, cache_jwk_set=True, lifespan=3600) if JWKS_URL else None

if REQUIRE_AUTH and (not JWKS_URL or not JWT_ISSUER):
    raise ValueError(
        "SUPABASE_URL or explicit JWKS and issuer URLs are required when REQUIRE_AUTH=true."
    )


async def authenticate_request(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> None:
    if credentials is None:
        if REQUIRE_AUTH:
            raise HTTPException(status_code=401, detail="Sign in to use the debate service.")
        return

    if jwks_client is None or not JWT_ISSUER:
        raise HTTPException(status_code=503, detail="Account token verification is not configured.")

    try:
        signing_key = await asyncio.to_thread(
            jwks_client.get_signing_key_from_jwt,
            credentials.credentials,
        )
        jwt.decode(
            credentials.credentials,
            signing_key.key,
            algorithms=["ES256", "RS256", "EdDSA"],
            audience="authenticated",
            issuer=JWT_ISSUER,
            options={"require": ["sub", "exp", "iss", "aud"]},
        )
    except PyJWKClientConnectionError as error:
        raise HTTPException(
            status_code=503,
            detail="Account token verification is temporarily unavailable.",
        ) from error
    except (InvalidTokenError, PyJWKClientError) as error:
        raise HTTPException(
            status_code=401,
            detail="Your sign-in has expired. Sign in again.",
        ) from error
