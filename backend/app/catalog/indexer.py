import argparse
from pathlib import Path

from PIL import Image
from qdrant_client import QdrantClient, models

from backend.app.catalog.manifest import CatalogManifest, load_manifest, resolve_image_path
from backend.app.core.config import Settings
from backend.app.services.fashionclip_service import FashionClipService
from backend.app.services.image_validation import validate_image_file
from backend.app.services.qdrant_service import catalog_point_id


def validate_catalog(manifest_path: Path, images_root: Path, settings: Settings) -> CatalogManifest:
    manifest = load_manifest(manifest_path)
    if manifest.model_name != settings.fashionclip_model_name:
        raise ValueError("manifest modelName does not match FASHIONCLIP_MODEL_NAME")
    if manifest.model_revision != settings.fashionclip_model_revision:
        raise ValueError("manifest modelRevision does not match FASHIONCLIP_MODEL_REVISION")
    for item in manifest.items:
        image_path = resolve_image_path(item, images_root)
        if not image_path.is_file():
            raise ValueError(f"catalog image not found: {item.image_path}")
        validate_image_file(
            image_path,
            max_bytes=settings.max_upload_bytes,
            max_pixels=settings.max_image_pixels,
        )
    return manifest


def index_catalog(
    manifest_path: Path, images_root: Path, settings: Settings, recreate: bool = False
) -> int:
    manifest = validate_catalog(manifest_path, images_root, settings)
    client = (
        QdrantClient(url=settings.qdrant_url)
        if settings.qdrant_url
        else QdrantClient(host=settings.qdrant_host, port=settings.qdrant_port)
    )
    collection_exists = client.collection_exists(settings.qdrant_collection_name)
    if recreate and collection_exists:
        client.delete_collection(settings.qdrant_collection_name)
        collection_exists = False
    if not collection_exists:
        client.create_collection(
            settings.qdrant_collection_name,
            vectors_config=models.VectorParams(
                size=settings.expected_vector_size, distance=models.Distance.COSINE
            ),
        )
    else:
        info = client.get_collection(settings.qdrant_collection_name)
        if getattr(info.config.params.vectors, "size", None) != settings.expected_vector_size:
            raise RuntimeError("collection vector size mismatch; use --recreate explicitly")
        existing, _ = client.scroll(
            settings.qdrant_collection_name, limit=1, with_payload=True, with_vectors=False
        )
        if existing and existing[0].payload.get("modelVersion") != (
            f"{manifest.model_name}@{manifest.model_revision}"
        ):
            raise RuntimeError("collection model revision mismatch; use --recreate explicitly")

    model = FashionClipService(manifest.model_name, manifest.model_revision)
    model.load()
    points = []
    for item in manifest.items:
        path = resolve_image_path(item, images_root)
        with Image.open(path) as image:
            vector = model.embed_image(image.convert("RGB"))
        if len(vector) != settings.expected_vector_size:
            raise RuntimeError("model output vector size does not match configuration")
        points.append(
            models.PointStruct(
                id=catalog_point_id(item.id),
                vector=vector,
                payload={
                    "catalogItemId": item.id,
                    "title": item.title,
                    "sourceUrl": str(item.source_url) if item.source_url else None,
                    "metadata": item.metadata.model_dump(by_alias=True),
                    "rights": item.rights.model_dump(mode="json", by_alias=True),
                    "catalogVersion": manifest.catalog_version,
                    "modelName": manifest.model_name,
                    "modelRevision": manifest.model_revision,
                    "modelVersion": model.model_version,
                    "vectorSize": settings.expected_vector_size,
                },
            )
        )
    if points:
        client.upsert(settings.qdrant_collection_name, points=points, wait=True)
    return len(points)


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate or index a local fashion catalog")
    subparsers = parser.add_subparsers(dest="command", required=True)
    for name in ("validate", "index"):
        sub = subparsers.add_parser(name)
        sub.add_argument("--manifest", type=Path, required=True)
        if name == "index":
            sub.add_argument("--recreate", action="store_true")
    args = parser.parse_args()
    settings = Settings()
    images_root = settings.catalog_images_dir
    if args.command == "validate":
        manifest = validate_catalog(args.manifest, images_root, settings)
        print(f"Valid catalog: {len(manifest.items)} items")
    else:
        count = index_catalog(args.manifest, images_root, settings, args.recreate)
        print(f"Indexed {count} catalog items")


if __name__ == "__main__":
    main()
