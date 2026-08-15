from uuid import NAMESPACE_URL, uuid5

from qdrant_client import QdrantClient, models

from backend.app.core.errors import AppError
from backend.app.schemas.search_schema import CatalogMetadata, ImageSearchResult


def catalog_point_id(catalog_item_id: str) -> str:
    return str(uuid5(NAMESPACE_URL, f"style-finder/catalog/{catalog_item_id}"))


class QdrantSearchService:
    def __init__(self, host: str, port: int, collection_name: str, url: str | None = None):
        self.collection_name = collection_name
        self.client = QdrantClient(url=url) if url else QdrantClient(host=host, port=port)

    def collection_status(self, expected_vector_size: int, expected_model_version: str) -> dict:
        try:
            info = self.client.get_collection(self.collection_name)
            vector_config = info.config.params.vectors
            vector_size = getattr(vector_config, "size", None)
            if vector_size != expected_vector_size:
                return {"ready": False, "reason": "vector_size_mismatch"}
            points, _ = self.client.scroll(
                self.collection_name, limit=1, with_payload=True, with_vectors=False
            )
            if not points:
                return {"ready": False, "reason": "empty_collection"}
            if points[0].payload.get("modelVersion") != expected_model_version:
                return {"ready": False, "reason": "model_version_mismatch"}
            return {"ready": True, "reason": "ready"}
        except Exception:
            return {"ready": False, "reason": "qdrant_unavailable"}

    def search_similar(
        self, vector: list[float], top_k: int = 2, exclude_point_id: str | None = None
    ) -> list[ImageSearchResult]:
        query_filter = None
        if exclude_point_id:
            query_filter = models.Filter(
                must_not=[models.HasIdCondition(has_id=[exclude_point_id])]
            )
        try:
            response = self.client.query_points(
                collection_name=self.collection_name,
                query=vector,
                query_filter=query_filter,
                limit=max(1, top_k),
                with_payload=True,
                with_vectors=False,
            )
            return [self._point_to_result(point) for point in response.points]
        except Exception as exc:
            raise AppError("SEARCH_UNAVAILABLE", "검색 서비스를 사용할 수 없습니다.", 503) from exc

    def search_by_catalog_id(self, catalog_item_id: str, top_k: int) -> list[ImageSearchResult]:
        point_id = catalog_point_id(catalog_item_id)
        try:
            points = self.client.retrieve(
                self.collection_name, ids=[point_id], with_payload=True, with_vectors=True
            )
        except Exception as exc:
            raise AppError("SEARCH_UNAVAILABLE", "검색 서비스를 사용할 수 없습니다.", 503) from exc
        if not points:
            raise AppError("CATALOG_ITEM_NOT_FOUND", "카탈로그 항목을 찾을 수 없습니다.", 404)
        vector = points[0].vector
        if not isinstance(vector, list):
            raise AppError("SEARCH_UNAVAILABLE", "검색 서비스를 사용할 수 없습니다.", 503)
        return self.search_similar(vector, top_k, exclude_point_id=point_id)

    @staticmethod
    def _point_to_result(point) -> ImageSearchResult:
        payload = point.payload or {}
        metadata = payload.get("metadata") or {}
        item_id = str(payload.get("catalogItemId", ""))
        return ImageSearchResult(
            catalog_item_id=item_id,
            title=str(payload.get("title", item_id)),
            image_url=f"/api/catalog/items/{item_id}/image",
            source_url=payload.get("sourceUrl"),
            similarity_score=float(point.score),
            metadata=CatalogMetadata(
                category=str(metadata.get("category", "unknown")),
                colors=list(metadata.get("colors") or []),
                style_tags=list(metadata.get("styleTags") or []),
            ),
            model_version=str(payload.get("modelVersion", "unknown")),
        )
