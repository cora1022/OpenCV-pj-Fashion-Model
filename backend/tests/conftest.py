from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from io import BytesIO

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from PIL import Image

from backend.app.core.config import Settings


@dataclass(frozen=True)
class JwtTestContext:
    settings: Settings
    private_key: object
    issuer: str
    audience: str

    def token(
        self,
        *,
        token_type: str = "access",
        issuer: str | None = None,
        audience: str | None = None,
        expires_delta: timedelta = timedelta(minutes=5),
        private_key=None,
    ) -> str:
        now = datetime.now(UTC)
        return jwt.encode(
            {
                "sub": "1",
                "type": token_type,
                "role": "USER",
                "iss": issuer or self.issuer,
                "aud": audience or self.audience,
                "iat": now,
                "exp": now + expires_delta,
            },
            private_key or self.private_key,
            algorithm="RS256",
        )

    def authorization(self, **kwargs) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.token(**kwargs)}"}


@pytest.fixture
def jwt_context(tmp_path) -> JwtTestContext:
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public_path = tmp_path / "jwt-public.pem"
    public_path.write_bytes(
        private_key.public_key().public_bytes(
            serialization.Encoding.PEM,
            serialization.PublicFormat.SubjectPublicKeyInfo,
        )
    )
    issuer = "test-member-service"
    audience = "test-style-finder-api"
    return JwtTestContext(
        settings=Settings(
            jwt_public_key_path=public_path,
            jwt_issuer=issuer,
            jwt_audience=audience,
        ),
        private_key=private_key,
        issuer=issuer,
        audience=audience,
    )


@pytest.fixture
def jpeg_bytes() -> bytes:
    output = BytesIO()
    Image.new("RGB", (32, 24), "blue").save(output, "JPEG")
    return output.getvalue()


@pytest.fixture
def png_bytes() -> bytes:
    output = BytesIO()
    Image.new("RGB", (32, 24), "red").save(output, "PNG")
    return output.getvalue()
