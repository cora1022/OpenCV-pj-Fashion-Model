from io import BytesIO

import pytest
from fastapi import UploadFile

from backend.app.core.errors import AppError
from backend.app.services.image_validation import validate_upload


@pytest.mark.parametrize(
    "mime,fixture_name", [("image/jpeg", "jpeg_bytes"), ("image/png", "png_bytes")]
)
async def test_accepts_supported_images(request, mime, fixture_name):
    content = request.getfixturevalue(fixture_name)
    result = await validate_upload(
        UploadFile(BytesIO(content), filename="image", headers={"content-type": mime}),
        max_bytes=10_000,
        max_pixels=1_000,
    )
    assert result.mime_type == mime
    assert result.width == 32


async def test_rejects_mime_spoof(jpeg_bytes):
    upload = UploadFile(
        BytesIO(jpeg_bytes), filename="fake.png", headers={"content-type": "image/png"}
    )
    with pytest.raises(AppError, match="UNSUPPORTED_IMAGE_TYPE"):
        await validate_upload(upload, max_bytes=10_000, max_pixels=1_000)


async def test_rejects_corrupt_image():
    upload = UploadFile(
        BytesIO(b"not-an-image"), filename="bad.jpg", headers={"content-type": "image/jpeg"}
    )
    with pytest.raises(AppError, match="INVALID_IMAGE"):
        await validate_upload(upload, max_bytes=10_000, max_pixels=1_000)


async def test_rejects_oversized_file(jpeg_bytes):
    upload = UploadFile(
        BytesIO(jpeg_bytes), filename="large.jpg", headers={"content-type": "image/jpeg"}
    )
    with pytest.raises(AppError, match="IMAGE_TOO_LARGE"):
        await validate_upload(upload, max_bytes=10, max_pixels=1_000)


async def test_rejects_excessive_dimensions(jpeg_bytes):
    upload = UploadFile(
        BytesIO(jpeg_bytes), filename="wide.jpg", headers={"content-type": "image/jpeg"}
    )
    with pytest.raises(AppError, match="IMAGE_DIMENSIONS_EXCEEDED"):
        await validate_upload(upload, max_bytes=10_000, max_pixels=100)
