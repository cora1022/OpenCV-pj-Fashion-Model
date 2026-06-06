from contextlib import asynccontextmanager
from io import BytesIO
import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import FastAPI, File, HTTPException, Query, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.exc import SQLAlchemyError

from backend.app.api.auth import router as auth_router
from backend.app.api.saved_fashions import router as saved_fashions_router
from backend.app.core.config import settings
from backend.app.db.base import Base
from backend.app.db.session import SessionLocal, engine
from backend.app.models import AdminUser, SavedFashion
from backend.app.schemas.search_schema import ImageSearchResponse, ImageUrlSearchRequest
from backend.app.services.admin_seed_service import seed_admin_users
from backend.app.services.fashionclip_service import (
    FashionClipService,
    InvalidImageError,
)
from backend.app.services.gemini_feature_service import GeminiFeatureService
from backend.app.services.opencv_crop_service import OpenCvCropService
from backend.app.services.qdrant_service import (
    CollectionNotFoundError,
    QdrantSearchError,
    QdrantSearchService,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        Base.metadata.create_all(bind=engine)
        with SessionLocal() as db:
            seed_admin_users(db, settings.admin_users)
        app.state.database_ready = True
    except SQLAlchemyError as exc:
        app.state.database_ready = False
        print(f"Database initialization skipped: {exc}")

    fashionclip_service = FashionClipService(settings.fashionclip_model_name)
    fashionclip_service.load()

    opencv_crop_service = OpenCvCropService(
        enabled=settings.opencv_crop_enabled,
        cascade_path=settings.opencv_cascade_path,
        yolo_model_path=settings.yolo_clothing_model_path,
        yolo_confidence=settings.yolo_confidence,
    )
    opencv_crop_service.load()

    qdrant_service = QdrantSearchService(
        host=settings.qdrant_host,
        port=settings.qdrant_port,
        collection_name=settings.qdrant_collection_name,
        url=settings.qdrant_url,
    )
    gemini_feature_service = GeminiFeatureService(
        api_key=settings.gemini_api_key,
        model_name=settings.gemini_model_name,
        timeout_seconds=settings.gemini_timeout_seconds,
    )

    app.state.fashionclip_service = fashionclip_service
    app.state.opencv_crop_service = opencv_crop_service
    app.state.qdrant_service = qdrant_service
    app.state.gemini_feature_service = gemini_feature_service
    yield


app = FastAPI(
    title="Fashion Image Similarity Search API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=[
        "X-Crop-Applied",
        "X-Crop-Box",
        "X-Original-Size",
        "X-Crop-Size",
        "X-Crop-Detector",
    ],
)

app.include_router(auth_router)
app.include_router(saved_fashions_router)


MAX_REMOTE_IMAGE_BYTES = 12 * 1024 * 1024


@app.get("/health")
def health():
    return {
        "status": "ok",
        "qdrant_collection": settings.qdrant_collection_name,
        "fashionclip_model": settings.fashionclip_model_name,
        "opencv_crop_enabled": settings.opencv_crop_enabled,
        "yolo_clothing_model": settings.yolo_clothing_model_path,
        "gemini_feature_enabled": bool(settings.gemini_api_key),
        "gemini_model": settings.gemini_model_name,
        "database_ready": getattr(app.state, "database_ready", False),
    }


@app.post("/api/search/image", response_model=ImageSearchResponse)
async def search_image(
    file: UploadFile = File(...),
    top_k: int = Query(default=2, ge=1, le=20),
    crop: bool = Query(default=True),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must be an image.",
        )

    image_bytes = await file.read()

    try:
        if crop:
            image = app.state.opencv_crop_service.crop_image_bytes(image_bytes)
            vector = app.state.fashionclip_service.embed_image(image)
        else:
            vector = app.state.fashionclip_service.embed_image_bytes(image_bytes)

        results = app.state.qdrant_service.search_similar(vector, top_k=top_k)
        image_features = app.state.gemini_feature_service.analyze_image(
            image_bytes=image_bytes,
            mime_type=file.content_type or "image/jpeg",
        )
    except InvalidImageError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except CollectionNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except QdrantSearchError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Image search failed: {exc}",
        ) from exc

    return ImageSearchResponse(results=results, image_features=image_features)


@app.post("/api/search/image-url", response_model=ImageSearchResponse)
async def search_image_url(
    payload: ImageUrlSearchRequest,
    top_k: int = Query(default=2, ge=1, le=20),
):
    image_bytes, content_type = _download_remote_image(payload.image_url)

    try:
        vector = app.state.fashionclip_service.embed_image_bytes(image_bytes)
        results = app.state.qdrant_service.search_similar(vector, top_k=top_k)
        image_features = app.state.gemini_feature_service.analyze_image(
            image_bytes=image_bytes,
            mime_type=content_type,
        )
    except InvalidImageError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except CollectionNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except QdrantSearchError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Image URL search failed: {exc}",
        ) from exc

    return ImageSearchResponse(results=results, image_features=image_features)


def _download_remote_image(image_url: str) -> tuple[bytes, str]:
    if not image_url.startswith(("http://", "https://")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="image_url must start with http:// or https://.",
        )

    request = Request(
        image_url,
        headers={
            "User-Agent": "Mozilla/5.0 FashionSimilaritySearch/1.0",
            "Accept": "image/*,*/*;q=0.8",
        },
    )

    try:
        with urlopen(request, timeout=12) as response:
            content_type = response.headers.get_content_type() or "image/jpeg"
            if not content_type.startswith("image/"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="image_url does not point to an image.",
                )

            image_bytes = response.read(MAX_REMOTE_IMAGE_BYTES + 1)
    except HTTPException:
        raise
    except (HTTPError, URLError, TimeoutError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not download image_url: {exc}",
        ) from exc

    if len(image_bytes) > MAX_REMOTE_IMAGE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Remote image is too large.",
        )

    return image_bytes, content_type


@app.post("/api/crop/image")
async def crop_image(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must be an image.",
        )

    image_bytes = await file.read()

    try:
        cropped_image, metadata = (
            app.state.opencv_crop_service.crop_image_bytes_with_metadata(image_bytes)
        )
    except InvalidImageError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Image crop failed: {exc}",
        ) from exc

    buffer = BytesIO()
    cropped_image.save(buffer, format="JPEG", quality=94)
    buffer.seek(0)

    crop_box = metadata["crop_box"]
    return StreamingResponse(
        buffer,
        media_type="image/jpeg",
        headers={
            "X-Crop-Applied": str(metadata["crop_applied"]).lower(),
            "X-Crop-Box": json.dumps(crop_box),
            "X-Original-Size": f"{metadata['original_width']}x{metadata['original_height']}",
            "X-Crop-Size": f"{crop_box['width']}x{crop_box['height']}",
            "X-Crop-Detector": metadata.get("detector", "none"),
        },
    )
