from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.db.base import Base


class SavedFashion(Base):
    __tablename__ = "saved_fashions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    image_url: Mapped[str | None] = mapped_column(Text)
    title: Mapped[str | None] = mapped_column(Text)
    mall_name: Mapped[str | None] = mapped_column(String(255))
    price: Mapped[str | None] = mapped_column(String(80))
    lprice: Mapped[str | None] = mapped_column(String(80))
    hprice: Mapped[str | None] = mapped_column(String(80))
    link: Mapped[str | None] = mapped_column(Text)
    product_id: Mapped[str | None] = mapped_column(String(120), index=True)
    score: Mapped[float | None] = mapped_column(Float)
    query: Mapped[str | None] = mapped_column(String(255))
    crop_used: Mapped[bool | None] = mapped_column(Boolean)
    saved_image_path: Mapped[str | None] = mapped_column(Text)
    embedding_model: Mapped[str | None] = mapped_column(String(255))
    saved_by_admin_id: Mapped[int] = mapped_column(ForeignKey("admin_users.id"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    saved_by = relationship("AdminUser", back_populates="saved_fashions")
