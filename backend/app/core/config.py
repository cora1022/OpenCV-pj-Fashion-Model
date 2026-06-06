import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


ROOT_DIR = Path(__file__).resolve().parents[3]
load_dotenv(ROOT_DIR / ".env")


def _get_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None or value == "":
        return default
    return int(value)


def _get_list(name: str, default: list[str]) -> list[str]:
    value = os.getenv(name)
    if not value:
        return default
    return [item.strip() for item in value.split(",") if item.strip()]


def _get_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None or value == "":
        return default
    return value.lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    qdrant_url: str | None = os.getenv("QDRANT_URL") or None
    qdrant_host: str = os.getenv("QDRANT_HOST", "localhost")
    qdrant_port: int = _get_int("QDRANT_PORT", 6333)
    qdrant_collection_name: str = (
        os.getenv("QDRANT_COLLECTION_NAME")
        or os.getenv("QDRANT_COLLECTION")
        or "naver_fashion_images_fashionclip"
    )
    fashionclip_model_name: str = os.getenv(
        "FASHIONCLIP_MODEL_NAME",
        "patrickjohncyh/fashion-clip",
    )
    opencv_crop_enabled: bool = _get_bool("OPENCV_CROP_ENABLED", True)
    opencv_cascade_path: str | None = os.getenv("OPENCV_CASCADE_PATH") or None
    yolo_clothing_model_path: str = os.getenv(
        "YOLO_CLOTHING_MODEL_PATH",
        str(ROOT_DIR / "backend" / "models" / "yolov8n-clothing-detection-best.pt"),
    )
    yolo_confidence: float = float(os.getenv("YOLO_CONFIDENCE", "0.25"))
    gemini_api_key: str | None = os.getenv("GEMINI_API_KEY") or None
    gemini_model_name: str = os.getenv("GEMINI_MODEL_NAME", "gemini-2.5-flash")
    gemini_timeout_seconds: int = _get_int("GEMINI_TIMEOUT_SECONDS", 20)
    database_url: str = os.getenv(
        "DATABASE_URL",
        "mysql+pymysql://fashion_user:fashion_password@localhost:3306/fashion_app",
    )
    jwt_secret_key: str = os.getenv(
        "JWT_SECRET_KEY",
        "change-me-in-env-at-least-32-bytes",
    )
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    jwt_expire_minutes: int = _get_int("JWT_EXPIRE_MINUTES", 60)
    admin_users: str = os.getenv("ADMIN_USERS", "")
    storage_backend: str = os.getenv("STORAGE_BACKEND", "local")
    s3_bucket_name: str | None = os.getenv("S3_BUCKET_NAME") or None
    s3_region: str | None = os.getenv("S3_REGION") or None
    cors_origins: list[str] = None

    def __post_init__(self):
        if self.cors_origins is None:
            object.__setattr__(
                self,
                "cors_origins",
                _get_list(
                    "CORS_ORIGINS",
                    [
                        "http://localhost:3000",
                        "http://localhost:5173",
                        "http://127.0.0.1:3000",
                        "http://127.0.0.1:5173",
                    ],
                ),
            )


settings = Settings()
