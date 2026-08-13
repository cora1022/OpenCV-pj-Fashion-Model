import warnings
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path

from fastapi import UploadFile
from PIL import Image, UnidentifiedImageError

from backend.app.core.errors import AppError

ALLOWED_MIME_TYPES = {"image/jpeg": "JPEG", "image/png": "PNG"}


@dataclass(frozen=True)
class ValidatedImage:
    content: bytes
    mime_type: str
    format: str
    width: int
    height: int


async def validate_upload(
    upload: UploadFile,
    *,
    max_bytes: int,
    max_pixels: int,
) -> ValidatedImage:
    if upload.content_type not in ALLOWED_MIME_TYPES:
        raise AppError(
            "UNSUPPORTED_IMAGE_TYPE", "JPEG 또는 PNG 이미지만 선택해주세요.", 415
        )

    chunks: list[bytes] = []
    total = 0
    while chunk := await upload.read(64 * 1024):
        total += len(chunk)
        if total > max_bytes:
            raise AppError("IMAGE_TOO_LARGE", "10MB 이하의 이미지를 선택해주세요.", 413)
        chunks.append(chunk)

    return validate_image_bytes(
        b"".join(chunks),
        declared_mime=upload.content_type,
        max_bytes=max_bytes,
        max_pixels=max_pixels,
    )


def validate_image_file(path: Path, *, max_bytes: int, max_pixels: int) -> ValidatedImage:
    if path.stat().st_size > max_bytes:
        raise AppError("IMAGE_TOO_LARGE", "10MB 이하의 이미지를 선택해주세요.", 413)
    suffix_to_mime = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png"}
    declared_mime = suffix_to_mime.get(path.suffix.lower())
    if declared_mime is None:
        raise AppError("UNSUPPORTED_IMAGE_TYPE", "JPEG 또는 PNG 이미지만 선택해주세요.", 415)
    return validate_image_bytes(
        path.read_bytes(),
        declared_mime=declared_mime,
        max_bytes=max_bytes,
        max_pixels=max_pixels,
    )


def validate_image_bytes(
    content: bytes,
    *,
    declared_mime: str,
    max_bytes: int,
    max_pixels: int,
) -> ValidatedImage:
    if not content:
        raise AppError("INVALID_IMAGE", "올바른 이미지 파일을 선택해주세요.", 400)
    if len(content) > max_bytes:
        raise AppError("IMAGE_TOO_LARGE", "10MB 이하의 이미지를 선택해주세요.", 413)

    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(content)) as image:
                actual_format = image.format
                width, height = image.size
                if width <= 0 or height <= 0:
                    raise ValueError("empty dimensions")
                if width * height > max_pixels:
                    raise AppError(
                        "IMAGE_DIMENSIONS_EXCEEDED",
                        "이미지 해상도는 1,600만 픽셀 이하여야 합니다.",
                        413,
                    )
                image.verify()
    except AppError:
        raise
    except (Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise AppError(
            "IMAGE_DIMENSIONS_EXCEEDED", "이미지 해상도는 1,600만 픽셀 이하여야 합니다.", 413
        ) from None
    except (UnidentifiedImageError, OSError, ValueError):
        raise AppError("INVALID_IMAGE", "올바른 이미지 파일을 선택해주세요.", 400) from None

    expected_format = ALLOWED_MIME_TYPES.get(declared_mime)
    if actual_format not in {"JPEG", "PNG"} or actual_format != expected_format:
        raise AppError(
            "UNSUPPORTED_IMAGE_TYPE", "파일 형식과 이미지 내용이 일치하지 않습니다.", 415
        )

    return ValidatedImage(content, declared_mime, actual_format, width, height)
