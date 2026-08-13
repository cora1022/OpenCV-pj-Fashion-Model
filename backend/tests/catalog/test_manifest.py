import json

import pytest

from backend.app.catalog.manifest import load_manifest, resolve_image_path


def valid_manifest(image_path="shirt.jpg"):
    return {
        "catalogVersion": "v1",
        "modelName": "patrickjohncyh/fashion-clip",
        "modelRevision": "main",
        "items": [
            {
                "id": "shirt-001",
                "title": "Blue shirt",
                "imagePath": image_path,
                "metadata": {"category": "shirt", "colors": ["blue"], "styleTags": []},
                "rights": {"owner": "Portfolio author", "license": "All rights reserved"},
            }
        ],
    }


def test_manifest_requires_rights(tmp_path):
    body = valid_manifest()
    del body["items"][0]["rights"]
    path = tmp_path / "manifest.json"
    path.write_text(json.dumps(body), encoding="utf-8")
    with pytest.raises(ValueError, match="rights"):
        load_manifest(path)


def test_manifest_rejects_path_traversal(tmp_path):
    path = tmp_path / "manifest.json"
    path.write_text(json.dumps(valid_manifest("../secret.jpg")), encoding="utf-8")
    with pytest.raises(ValueError, match="imagePath"):
        load_manifest(path)


def test_resolved_image_stays_under_root(tmp_path):
    path = tmp_path / "manifest.json"
    path.write_text(json.dumps(valid_manifest()), encoding="utf-8")
    item = load_manifest(path).items[0]
    expected = (tmp_path / "images/shirt.jpg").resolve()
    assert resolve_image_path(item, tmp_path / "images") == expected
