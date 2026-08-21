# Architecture

## Current runtime

```text
Browser
  → Caddy
    → /                         React static files (Nginx)
    → /api/members/*            Spring Boot → MySQL
    → /api/search/*             FastAPI → FashionCLIP → Qdrant
    → /api/preprocess/*         FastAPI → OpenCV/YOLO
    → /api/catalog/*            FastAPI → local manifest images
```

Caddy is the only public entry point. Nginx serves static files and SPA fallback only.
The applications do not share a database.

| Component | Current responsibility | Storage |
|---|---|---|
| React | Landing, signup/login UI, upload, crop and search flow | Access token in memory only |
| Spring Boot | Members, Spring Security, token baseline, activity API baseline | MySQL |
| FastAPI | Image validation, crop, embedding and vector search | Qdrant and local catalog |
| Catalog indexer | Manifest validation and idempotent vector indexing | Local files → Qdrant |
| Caddy | Same-origin routing and request-size boundary | None |

FastAPI never downloads arbitrary result URLs. Catalog-ID re-search uses a vector already stored in
Qdrant. HOG is a person upper-body fallback, not a clothing detector.

## Health semantics

FastAPI `/health/live` checks process liveness. `/health/ready` additionally requires the model, a
loaded local manifest, Qdrant connectivity, a non-empty compatible collection and the expected
model version.

The member service currently exposes live/ready endpoints, but its readiness check does not yet
verify MySQL. Caddy's public `/health/*` route currently targets FastAPI.

## Authentication status

Signup, login, member lookup and token persistence exist in Spring Boot. React currently gates the
search screen after login, but FastAPI search endpoints do not yet validate the Spring access token.
Server-side search authorization, HttpOnly refresh cookies and browser session restoration are the
next security baseline. Until then, the UI gate must not be described as API authorization.

## User activity status

MySQL tables and initial Spring endpoints exist for search history and saved results. Their final
DTOs, ownership queries, JSON metadata handling, React integration and automated tests remain to be
implemented. Spring Boot does not read Qdrant; it stores only user-owned activity snapshots.
