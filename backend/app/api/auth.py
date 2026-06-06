from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_admin
from backend.app.core.security import create_access_token, verify_password
from backend.app.db.session import get_db
from backend.app.models.admin_user import AdminUser
from backend.app.schemas.auth_schema import (
    AdminUserResponse,
    LoginRequest,
    LoginResponse,
)


router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    admin = (
        db.query(AdminUser)
        .filter(AdminUser.username == payload.username)
        .one_or_none()
    )

    if admin is None or not verify_password(payload.password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
        )

    token = create_access_token(subject=admin.username, extra_claims={"admin_id": admin.id})
    return LoginResponse(access_token=token, admin=admin)


@router.get("/me", response_model=AdminUserResponse)
def me(current_admin: AdminUser = Depends(get_current_admin)):
    return current_admin
