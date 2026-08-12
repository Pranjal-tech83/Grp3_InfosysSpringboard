from typing import Set

class SessionGuard:
    def __init__(self):
        # In memory store for invalidated tokens (logout).
        # In production, use Redis with TTL matching token expiration.
        self._blacklisted_tokens: Set[str] = set()

    def invalidate_token(self, token: str):
        self._blacklisted_tokens.add(token)

    def is_token_valid(self, token: str) -> bool:
        return token not in self._blacklisted_tokens

session_guard = SessionGuard()
