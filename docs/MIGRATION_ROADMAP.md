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

## Required before portfolio release

1. Enforce Spring access tokens on FastAPI search and preprocess APIs.
2. Move refresh tokens to HttpOnly cookies and restore sessions after reload.
3. Return consistent JSON 401/403 responses from Spring Security.
4. Complete activity DTOs, ownership queries, JSON metadata and React My Page.
5. Add Spring unit/integration tests and a member-service CI job.
6. Make member readiness depend on MySQL and apply a real search execution timeout.
7. Pin a verifiable model revision for new public catalog vectors.
8. Add a small rights-cleared public demo catalog and measured performance results.
9. Update screenshots and architecture evidence after the security baseline is complete.

The ignored legacy Naver catalog is for local verification only and is not a release artifact.
