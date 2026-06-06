from datetime import datetime

from pydantic import BaseModel


class SavedFashionCreate(BaseModel):
    image_url: str | None = None
    title: str | None = None
    mall_name: str | None = None
    price: str | None = None
    lprice: str | None = None
    hprice: str | None = None
    link: str | None = None
    product_id: str | None = None
    score: float | None = None
    query: str | None = None
    crop_used: bool | None = None
    saved_image_path: str | None = None
    embedding_model: str | None = None


class SavedByAdmin(BaseModel):
    id: int
    username: str
    display_name: str

    model_config = {"from_attributes": True}


class SavedFashionResponse(SavedFashionCreate):
    id: int
    saved_by_admin_id: int
    saved_by: SavedByAdmin
    created_at: datetime

    model_config = {"from_attributes": True}
