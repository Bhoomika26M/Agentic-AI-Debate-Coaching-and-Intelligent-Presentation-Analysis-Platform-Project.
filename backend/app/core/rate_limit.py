import time
from collections import defaultdict
from fastapi import HTTPException, status

class LoginRateLimiter:
    """Simple in-memory sliding-window rate limiter for brute-force protection."""
    def __init__(self, max_attempts: int = 5, window_seconds: int = 300):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self.attempts = defaultdict(list)

    def check(self, key: str):
        now = time.time()
        # Clean timestamps older than window
        self.attempts[key] = [t for t in self.attempts[key] if now - t < self.window_seconds]
        if len(self.attempts[key]) >= self.max_attempts:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many failed login attempts. Please wait 5 minutes before trying again."
            )

    def record_failure(self, key: str):
        self.attempts[key].append(time.time())

    def reset(self, key: str):
        if key in self.attempts:
            del self.attempts[key]

login_limiter = LoginRateLimiter()
