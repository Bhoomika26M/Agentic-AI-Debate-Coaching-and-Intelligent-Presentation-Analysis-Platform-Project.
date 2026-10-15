"""Simple in-memory rate limiter for expensive AI endpoints."""
from time import time
from collections import defaultdict
from fastapi import Request, HTTPException

_buckets: dict[str, list[float]] = defaultdict(list)

def rate_limit(key: str, limit: int = 20, window: int = 60):
    now = time()
    bucket = _buckets[key]
    _buckets[key] = [t for t in bucket if now - t < window]
    if len(_buckets[key]) >= limit:
        raise HTTPException(status_code=429, detail="Too many requests. Try again shortly.")
    _buckets[key].append(now)