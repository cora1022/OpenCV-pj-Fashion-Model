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

## Member API baseline

Member JSON fields also use camelCase and are routed to Spring Boot.

| Endpoint | Authentication | Current purpose |
|---|---|---|
| `POST /api/members/signup` | Public | Create a member with a BCrypt password hash |
| `POST /api/members/login` | Public | Return access and refresh tokens |
| `POST /api/members/token/refresh` | Public token endpoint | Rotate a refresh token |
| `POST /api/members/logout` | Bearer access token | Revoke the supplied refresh token |
| `GET /api/members/me` | Bearer access token | Return the current member |
| `GET/POST/DELETE /api/members/search-histories` | Bearer access token | Activity API baseline |
| `GET/POST/DELETE /api/members/saved-results` | Bearer access token | Saved-result API baseline |

The current token response includes both tokens in JSON. HttpOnly refresh cookies, browser session
restoration, final activity DTOs and consistent Spring Security JSON 401/403 responses are planned
security work, not completed behavior.

The React login gate does not yet authorize FastAPI endpoints. Search and preprocess endpoints will
require the Spring-issued access token after cross-service token verification is implemented.
