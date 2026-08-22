from dataclasses import dataclass
from pathlib import Path
from typing import Annotated

import jwt
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from backend.app.core.errors import AppError

bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class AuthenticatedUser:
    user_id: int
    role: str


class JwtAccessVerifier:
    def __init__(self, public_key_path: Path, issuer: str, audience: str) -> None:
        self.public_key_path = public_key_path
        self.issuer = issuer
        self.audience = audience
        self._public_key: bytes | None = None

    def _key(self) -> bytes:
        if self._public_key is None:
            self._public_key = self.public_key_path.read_bytes()
        return self._public_key

    def verify(self, token: str) -> AuthenticatedUser:
        try:
            claims = jwt.decode(
                token,
                self._key(),
                algorithms=["RS256"],
                issuer=self.issuer,
                audience=self.audience,
                options={"require": ["exp", "iat", "iss", "aud", "sub", "type"]},
            )
        except jwt.ExpiredSignatureError:
            raise AppError(
                "ACCESS_TOKEN_EXPIRED", "로그인이 만료되었습니다. 다시 로그인해주세요.", 401
            ) from None
        except (jwt.InvalidTokenError, OSError, ValueError):
            raise AppError("ACCESS_TOKEN_INVALID", "유효하지 않은 인증 정보입니다.", 401) from None

        if claims.get("type") != "access":
            raise AppError("ACCESS_TOKEN_INVALID", "유효하지 않은 인증 정보입니다.", 401)
        try:
            user_id = int(claims["sub"])
        except (KeyError, TypeError, ValueError):
            raise AppError("ACCESS_TOKEN_INVALID", "유효하지 않은 인증 정보입니다.", 401) from None
        role = str(claims.get("role") or "USER")
        return AuthenticatedUser(user_id=user_id, role=role)


def require_access_token(
    request: Request,
    credentials: Annotated[
        HTTPAuthorizationCredentials | None, Depends(bearer_scheme)
    ] = None,
) -> AuthenticatedUser:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise AppError("AUTHENTICATION_REQUIRED", "로그인이 필요합니다.", 401)
    verifier: JwtAccessVerifier = request.app.state.jwt_verifier
    return verifier.verify(credentials.credentials)
