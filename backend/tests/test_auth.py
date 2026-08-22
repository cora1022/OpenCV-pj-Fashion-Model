from datetime import timedelta

from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient

from backend.app.main import create_app


def post_search(client: TestClient, jpeg_bytes: bytes, headers: dict[str, str] | None = None):
    return client.post(
        "/api/search/image",
        files={"file": ("shirt.jpg", jpeg_bytes, "image/jpeg")},
        headers=headers or {},
    )


def test_search_requires_access_token(jpeg_bytes, jwt_context):
    app = create_app(config=jwt_context.settings, load_services=False)
    with TestClient(app) as client:
        response = post_search(client, jpeg_bytes)
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "AUTHENTICATION_REQUIRED"


def test_expired_access_token_is_rejected(jpeg_bytes, jwt_context):
    app = create_app(config=jwt_context.settings, load_services=False)
    headers = jwt_context.authorization(expires_delta=timedelta(seconds=-1))
    with TestClient(app) as client:
        response = post_search(client, jpeg_bytes, headers)
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "ACCESS_TOKEN_EXPIRED"


def test_wrong_signature_is_rejected(jpeg_bytes, jwt_context):
    app = create_app(config=jwt_context.settings, load_services=False)
    other_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    headers = jwt_context.authorization(private_key=other_key)
    with TestClient(app) as client:
        response = post_search(client, jpeg_bytes, headers)
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "ACCESS_TOKEN_INVALID"


def test_wrong_issuer_is_rejected(jpeg_bytes, jwt_context):
    app = create_app(config=jwt_context.settings, load_services=False)
    with TestClient(app) as client:
        response = post_search(
            client, jpeg_bytes, jwt_context.authorization(issuer="another-issuer")
        )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "ACCESS_TOKEN_INVALID"


def test_wrong_audience_is_rejected(jpeg_bytes, jwt_context):
    app = create_app(config=jwt_context.settings, load_services=False)
    with TestClient(app) as client:
        response = post_search(
            client, jpeg_bytes, jwt_context.authorization(audience="another-api")
        )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "ACCESS_TOKEN_INVALID"


def test_refresh_token_cannot_call_search(jpeg_bytes, jwt_context):
    app = create_app(config=jwt_context.settings, load_services=False)
    with TestClient(app) as client:
        response = post_search(
            client, jpeg_bytes, jwt_context.authorization(token_type="refresh")
        )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "ACCESS_TOKEN_INVALID"
