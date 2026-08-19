# API contract

All JSON fields use camelCase. Errors never expose internal exception text.

| Endpoint | Purpose |
|---|---|
| `POST /api/preprocess/crop` | JPEG/PNG file → JPEG crop with `X-Crop-*` headers |
| `POST /api/search/image?topK=2` | Search an already selected/cropped image |
| `POST /api/search/catalog/{catalogItemId}?topK=2` | Search from an indexed catalog vector, excluding itself |
| `GET /api/catalog/items/{catalogItemId}/image` | Serve only a manifest-registered local image |
| `GET /health/live` | Process liveness |
| `GET /health/ready` | Model, manifest, Qdrant collection/version readiness |

`/api/search/image-url` was intentionally removed; the server never downloads arbitrary URLs.

Search results contain `catalogItemId`, `title`, `imageUrl`, `sourceUrl`,
`similarityScore`, `metadata` (`category`, `colors`, `styleTags`) and `modelVersion`.

Errors use `{ "error": { "code", "message", "requestId" } }`. Codes are:
`INVALID_IMAGE`, `UNSUPPORTED_IMAGE_TYPE`, `IMAGE_TOO_LARGE`,
`IMAGE_DIMENSIONS_EXCEEDED`, `CATALOG_NOT_READY`, `CATALOG_ITEM_NOT_FOUND`,
`SEARCH_BUSY`, `SEARCH_UNAVAILABLE`, and `INTERNAL_ERROR`.
