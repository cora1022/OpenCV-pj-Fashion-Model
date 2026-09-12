# Migration roadmap

## Completed search baseline

- Removed arbitrary URL search and Gemini analysis.
- Added upload size, MIME, format, pixel and decompression-bomb validation.
- Added request IDs, safe errors, thread offload and bounded inference concurrency.
- Added neutral catalog DTOs, catalog-ID re-search and local-only image serving.
- Added manifest validation, idempotent indexing and legacy local vector migration.
- Added FastAPI liveness/readiness, Caddy routing and non-root application containers.
- Added FastAPI and React tests plus baseline CI.

## Completed member-service baseline

- Added Java 21 and Spring Boot 3 member service.
- Added Spring Security, BCrypt, JWT access/refresh token baseline.
- Added MySQL, Flyway and separate member-service storage ownership.
- Added signup, login, refresh, logout and member lookup endpoints.
- Added initial search-history and saved-result tables and endpoints.
- Added React signup/login gate and unified Docker Compose routing.
- Added RS256 access tokens with private/public key separation between Spring Boot and FastAPI.
- Enforced access tokens on image search, crop and catalog-ID re-search APIs.
- Added safe JSON 401/403 responses and member-service integration tests.
- Moved refresh tokens to rotating HttpOnly cookies and added browser session restoration.
- Completed paginated activity DTOs, user-ID ownership queries, JSON metadata and React My Page.
- Added member MySQL/Flyway readiness, inference execution timeout and refresh-token cleanup.
- Added Java 21 member-service CI and MySQL Testcontainers migration verification.
- Pinned new public catalog vectors to a FashionCLIP commit hash.

## Required before portfolio release

1. Add a small rights-cleared public demo catalog and measured performance results.
2. Update deployment screenshots after the rights-cleared catalog is available.
3. Add production observability and independent deployment only if the portfolio is operated beyond
   the current single-Compose scope.

The ignored legacy Naver catalog is for local verification only and is not a release artifact.
