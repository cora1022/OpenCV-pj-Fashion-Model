from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from backend.app.api.deps import get_current_admin
from backend.app.db.session import get_db
from backend.app.models.admin_user import AdminUser
from backend.app.models.saved_fashion import SavedFashion
from backend.app.schemas.saved_fashion_schema import (
    SavedFashionCreate,
    SavedFashionResponse,
)


router = APIRouter(prefix="/api/saved-fashions", tags=["saved-fashions"])


@router.get("", response_model=list[SavedFashionResponse])
def list_saved_fashions(db: Session = Depends(get_db)):
    return (
        db.query(SavedFashion)
        .options(joinedload(SavedFashion.saved_by))
        .order_by(SavedFashion.created_at.desc(), SavedFashion.id.desc())
        .all()
    )


@router.post("", response_model=SavedFashionResponse, status_code=status.HTTP_201_CREATED)
def save_fashion(
    payload: SavedFashionCreate,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    existing = _find_existing_saved_fashion(db, payload, current_admin.id)
    if existing is not None:
        return existing

    saved = SavedFashion(
        image_url=payload.image_url,
        title=payload.title,
        mall_name=payload.mall_name,
        price=payload.price,
        lprice=payload.lprice,
        hprice=payload.hprice,
        link=payload.link,
        product_id=payload.product_id,
        score=payload.score,
        query=payload.query,
        crop_used=payload.crop_used,
        saved_image_path=payload.saved_image_path,
        embedding_model=payload.embedding_model,
        saved_by_admin_id=current_admin.id,
    )
    db.add(saved)
    db.commit()
    db.refresh(saved)
    return saved


@router.delete("/{saved_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_saved_fashion(
    saved_id: int,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    saved = db.query(SavedFashion).filter(SavedFashion.id == saved_id).one_or_none()
    if saved is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Saved fashion item not found.",
        )

    db.delete(saved)
    db.commit()
    return None


def _find_existing_saved_fashion(
    db: Session,
    payload: SavedFashionCreate,
    admin_id: int,
) -> SavedFashion | None:
    duplicate_filters = []
    if payload.product_id:
        duplicate_filters.append(SavedFashion.product_id == payload.product_id)
    if payload.link:
        duplicate_filters.append(SavedFashion.link == payload.link)

    if not duplicate_filters:
        return None

    return (
        db.query(SavedFashion)
        .options(joinedload(SavedFashion.saved_by))
        .filter(
            SavedFashion.saved_by_admin_id == admin_id,
            or_(*duplicate_filters),
        )
        .one_or_none()
    )
