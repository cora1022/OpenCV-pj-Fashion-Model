from io import BytesIO

import pytest
from PIL import Image


@pytest.fixture
def jpeg_bytes() -> bytes:
    output = BytesIO()
    Image.new("RGB", (32, 24), "blue").save(output, "JPEG")
    return output.getvalue()


@pytest.fixture
def png_bytes() -> bytes:
    output = BytesIO()
    Image.new("RGB", (32, 24), "red").save(output, "PNG")
    return output.getvalue()
