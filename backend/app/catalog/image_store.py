from pathlib import Path

from backend.app.catalog.manifest import (
    CatalogItem,
    CatalogManifest,
    load_manifest,
    resolve_image_path,
)
from backend.app.core.errors import AppError


class CatalogImageStore:
    def __init__(self, manifest_path: Path, images_root: Path) -> None:
        self.manifest_path = manifest_path
        self.images_root = images_root
        self.manifest: CatalogManifest | None = None
        self._items: dict[str, CatalogItem] = {}

    def load(self) -> None:
        if not self.manifest_path.exists():
            return
        self.manifest = load_manifest(self.manifest_path)
        self._items = {item.id: item for item in self.manifest.items}

    @property
    def ready(self) -> bool:
        return self.manifest is not None

    def get_image(self, item_id: str) -> Path:
        if self.manifest is None:
            raise AppError("CATALOG_NOT_READY", "카탈로그가 아직 준비되지 않았습니다.", 503)
        item = self._items.get(item_id)
        if item is None:
            raise AppError("CATALOG_ITEM_NOT_FOUND", "카탈로그 이미지를 찾을 수 없습니다.", 404)
        path = resolve_image_path(item, self.images_root)
        if not path.is_file():
            raise AppError("CATALOG_ITEM_NOT_FOUND", "카탈로그 이미지를 찾을 수 없습니다.", 404)
        return path
