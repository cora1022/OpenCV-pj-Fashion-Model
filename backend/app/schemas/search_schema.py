from typing import Any

from pydantic import BaseModel


class ImageSearchResult(BaseModel):
    score: float
    title: Any = None
    link: Any = None
    image_url: Any = None
    mall_name: Any = None
    lprice: Any = None
    hprice: Any = None
    product_id: Any = None
    query: Any = None
    crop_used: Any = None
    saved_image_path: Any = None
    embedding_model: Any = None


class ImageFeatureAnalysis(BaseModel):
    available: bool = False
    summary: str | None = None
    item_type: str | None = None
    colors: list[str] = []
    materials: list[str] = []
    patterns: list[str] = []
    style_keywords: list[str] = []
    search_keywords: list[str] = []
    error: str | None = None


class ImageSearchResponse(BaseModel):
    results: list[ImageSearchResult]
    image_features: ImageFeatureAnalysis | None = None


class ImageUrlSearchRequest(BaseModel):
    image_url: str
