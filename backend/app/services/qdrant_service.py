from qdrant_client import QdrantClient

from backend.app.schemas.search_schema import ImageSearchResult


class CollectionNotFoundError(RuntimeError):
    pass


class QdrantSearchError(RuntimeError):
    pass


class QdrantSearchService:
    PAYLOAD_FIELDS = (
        "title",
        "link",
        "image_url",
        "mall_name",
        "lprice",
        "hprice",
        "product_id",
        "query",
        "crop_used",
        "saved_image_path",
        "embedding_model",
    )

    def __init__(
        self,
        host: str,
        port: int,
        collection_name: str,
        url: str | None = None,
    ):
        self.collection_name = collection_name
        self.client = QdrantClient(url=url) if url else QdrantClient(host=host, port=port)

    def ensure_collection_exists(self) -> None:
        try:
            collections = self.client.get_collections().collections
        except Exception as exc:
            raise QdrantSearchError(f"Could not connect to Qdrant: {exc}") from exc

        collection_names = {collection.name for collection in collections}

        if self.collection_name not in collection_names:
            raise CollectionNotFoundError(
                f"Qdrant collection '{self.collection_name}' does not exist. "
                "Please run the FashionCLIP indexing script first."
            )

    def search_similar(self, vector: list[float], top_k: int = 2) -> list[ImageSearchResult]:
        self.ensure_collection_exists()
        limit = max(1, int(top_k))

        try:
            if hasattr(self.client, "search"):
                points = self.client.search(
                    collection_name=self.collection_name,
                    query_vector=vector,
                    limit=limit,
                    with_payload=True,
                    with_vectors=False,
                )
            else:
                response = self.client.query_points(
                    collection_name=self.collection_name,
                    query=vector,
                    limit=limit,
                    with_payload=True,
                    with_vectors=False,
                )
                points = getattr(response, "points", response)
        except Exception as exc:
            raise QdrantSearchError(f"Qdrant search failed: {exc}") from exc

        return [self._point_to_result(point) for point in points]

    def _point_to_result(self, point) -> ImageSearchResult:
        payload = getattr(point, "payload", None) or {}
        score = getattr(point, "score", 0.0)
        data = {field: payload.get(field) for field in self.PAYLOAD_FIELDS}
        return ImageSearchResult(score=float(score), **data)
