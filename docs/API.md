# API contract

All JSON fields use camelCase. Errors never expose internal exception text.

| Endpoint | Purpose |
|---|---|
| `POST /api/preprocess/crop` | Bearer access token; JPEG/PNG file → JPEG crop with `X-Crop-*` headers |
| `POST /api/search/image?topK=2` | Bearer access token; search an already selected/cropped image |
| `POST /api/search/catalog/{catalogItemId}?topK=2` | Bearer access token; search from an indexed catalog vector, excluding itself |
| `GET /api/catalog/items/{catalogItemId}/image` | Serve only a manifest-registered local image |
| `GET /health/live` | Process liveness |
| `GET /health/ready` | Model, manifest, Qdrant collection/version readiness |

`/api/search/image-url` was intentionally removed; the server never downloads arbitrary URLs.

Search results contain `catalogItemId`, `title`, `imageUrl`, `sourceUrl`,
`similarityScore`, `metadata` (`category`, `colors`, `styleTags`) and `modelVersion`.

Errors use `{ "error": { "code", "message", "requestId" } }`. Codes are:
`INVALID_IMAGE`, `UNSUPPORTED_IMAGE_TYPE`, `IMAGE_TOO_LARGE`,
`IMAGE_DIMENSIONS_EXCEEDED`, `CATALOG_NOT_READY`, `CATALOG_ITEM_NOT_FOUND`,
`SEARCH_BUSY`, `SEARCH_UNAVAILABLE`, `AUTHENTICATION_REQUIRED`,
`ACCESS_TOKEN_EXPIRED`, `ACCESS_TOKEN_INVALID`, and `INTERNAL_ERROR`.

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

The current token response includes both tokens in JSON. Access tokens are RS256 JWTs with issuer,
audience, subject, role, type, issued-at and expiry claims. Spring Boot owns the private key and
FastAPI verifies protected search routes with the public key. Both services return the common JSON
error envelope for authentication failures.

HttpOnly refresh cookies, browser session restoration and final activity DTOs remain planned work.
