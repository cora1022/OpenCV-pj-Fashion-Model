"""Import a local legacy Naver Shopping FashionCLIP catalog.

This tool never downloads remote product images. ``prepare`` copies only locally
available crop files and writes an ignored local manifest. ``index-vectors`` then
converts the existing Qdrant vectors and payloads to the neutral catalog contract.
"""

import argparse
import json
import shutil
from collections.abc import Iterator
from pathlib import Path, PureWindowsPath

from qdrant_client import QdrantClient, models

from backend.app.services.qdrant_service import catalog_point_id

MODEL_NAME = "patrickjohncyh/fashion-clip"
MODEL_REVISION = "main"
MODEL_VERSION = f"{MODEL_NAME}@{MODEL_REVISION}"
VECTOR_SIZE = 512


def iter_legacy_points(client: QdrantClient, collection: str, *, with_vectors: bool):
    offset = None
    while True:
        points, offset = client.scroll(
            collection_name=collection,
            limit=128,
            offset=offset,
            with_payload=True,
            with_vectors=with_vectors,
        )
        yield from points
        if offset is None:
            break


def saved_filename(payload: dict) -> str | None:
    raw_path = str(payload.get("saved_image_path") or "").strip()
    if not raw_path:
        return None
    return PureWindowsPath(raw_path).name


def catalog_item_id(point) -> str:
    payload = point.payload or {}
    stable_value = str(payload.get("product_id") or point.id)
    safe_value = "".join(char if char.isalnum() or char in "._-" else "-" for char in stable_value)
    return f"naver-{safe_value}"


def prepare_manifest(
    source_client: QdrantClient,
    source_collection: str,
    source_images: Path,
    target_images: Path,
    manifest_path: Path,
) -> int:
    target_images.mkdir(parents=True, exist_ok=True)
    items = []
    seen_ids: set[str] = set()
    for point in iter_legacy_points(source_client, source_collection, with_vectors=False):
        payload = point.payload or {}
        filename = saved_filename(payload)
        if filename is None:
            continue
        source_path = source_images / filename
        if not source_path.is_file():
            continue
        item_id = catalog_item_id(point)
        if item_id in seen_ids:
            continue
        seen_ids.add(item_id)
        shutil.copy2(source_path, target_images / filename)
        category = str(
            payload.get("category3")
            or payload.get("category2")
            or payload.get("query")
            or "fashion"
        )
        query = str(payload.get("query") or "").strip()
        link = str(payload.get("link") or "").strip() or None
        items.append(
            {
                "id": item_id,
                "title": str(payload.get("title") or item_id),
                "imagePath": filename,
                "sourceUrl": link,
                "metadata": {
                    "category": category,
                    "colors": [],
                    "styleTags": [query] if query else [],
                },
                "rights": {
                    "owner": "External merchant (metadata from Naver Shopping API)",
                    "license": "not-cleared-for-redistribution; local-demo-only",
                    "sourceUrl": link,
                },
            }
        )
    manifest = {
        "catalogVersion": "legacy-naver-local-v1",
        "modelName": MODEL_NAME,
        "modelRevision": MODEL_REVISION,
        "items": items,
    }
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    return len(items)


def manifest_items_by_filename(manifest_path: Path) -> dict[str, dict]:
    data = json.loads(manifest_path.read_text(encoding="utf-8"))
    return {str(item["imagePath"]): item for item in data["items"]}


def converted_points(
    source_client: QdrantClient, source_collection: str, manifest_path: Path
) -> Iterator[models.PointStruct]:
    manifest_items = manifest_items_by_filename(manifest_path)
    for point in iter_legacy_points(source_client, source_collection, with_vectors=True):
        payload = point.payload or {}
        filename = saved_filename(payload)
        item = manifest_items.get(filename or "")
        if item is None or not isinstance(point.vector, list):
            continue
        yield models.PointStruct(
            id=catalog_point_id(item["id"]),
            vector=point.vector,
            payload={
                "catalogItemId": item["id"],
                "title": item["title"],
                "sourceUrl": item.get("sourceUrl"),
                "metadata": item["metadata"],
                "rights": item["rights"],
                "catalogVersion": "legacy-naver-local-v1",
                "modelName": MODEL_NAME,
                "modelRevision": MODEL_REVISION,
                "modelVersion": MODEL_VERSION,
                "vectorSize": VECTOR_SIZE,
            },
        )


def index_vectors(
    source_client: QdrantClient,
    source_collection: str,
    target_client: QdrantClient,
    target_collection: str,
    manifest_path: Path,
    *,
    recreate: bool,
) -> int:
    exists = target_client.collection_exists(target_collection)
    if recreate and exists:
        target_client.delete_collection(target_collection)
        exists = False
    if not exists:
        target_client.create_collection(
            target_collection,
            vectors_config=models.VectorParams(size=VECTOR_SIZE, distance=models.Distance.COSINE),
        )
    count = 0
    batch = []
    for point in converted_points(source_client, source_collection, manifest_path):
        batch.append(point)
        if len(batch) == 64:
            target_client.upsert(target_collection, points=batch, wait=True)
            count += len(batch)
            batch = []
    if batch:
        target_client.upsert(target_collection, points=batch, wait=True)
        count += len(batch)
    return count


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--source-url", required=True)
    common.add_argument("--source-collection", default="naver_fashion_images_fashionclip")
    prepare = subparsers.add_parser("prepare", parents=[common])
    prepare.add_argument("--source-images", type=Path, required=True)
    prepare.add_argument("--target-images", type=Path, required=True)
    prepare.add_argument("--manifest", type=Path, required=True)
    index = subparsers.add_parser("index-vectors", parents=[common])
    index.add_argument("--target-url", required=True)
    index.add_argument("--target-collection", default="fashion_catalog_v1")
    index.add_argument("--manifest", type=Path, required=True)
    index.add_argument("--recreate", action="store_true")
    return parser


def main() -> None:
    args = build_parser().parse_args()
    source_client = QdrantClient(url=args.source_url)
    if args.command == "prepare":
        count = prepare_manifest(
            source_client,
            args.source_collection,
            args.source_images,
            args.target_images,
            args.manifest,
        )
        print(f"Prepared {count} local legacy catalog items")
        return
    target_client = QdrantClient(url=args.target_url)
    count = index_vectors(
        source_client,
        args.source_collection,
        target_client,
        args.target_collection,
        args.manifest,
        recreate=args.recreate,
    )
    print(f"Indexed {count} converted legacy vectors")


if __name__ == "__main__":
    main()
