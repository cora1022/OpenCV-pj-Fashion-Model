# Migration roadmap

## Completed baseline

- Arbitrary URL search and Gemini analysis removed.
- File validation, request IDs, safe error contract and bounded inference added.
- Local rights-aware manifest/indexer structure added.
- Catalog DTO, catalog-ID re-search, liveness/readiness and CI added.
- Caddy direct API routing and non-root containers added.

## Still required before Spring Boot

- Add user-owned or redistributable images and complete `catalog/manifest.json`.
- Run the indexer from an empty Qdrant volume and verify upload plus catalog-ID search.
- Record cold start, warm search, preprocessing, embedding and Qdrant timings.
- Keep FastAPI/React tests and CI green.

Only after those checks should `member-service/` be created for Spring Security,
MySQL/Flyway, user profiles, history and saved results.
