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
| React | Landing, signup/login UI, authenticated upload, crop and search flow | Access token in memory only |
| Spring Boot | Members, Spring Security, RS256 token issuer, activity API baseline | MySQL and private signing key volume |
| FastAPI | Access-token verification, image validation, crop, embedding and vector search | Qdrant, local catalog and public verification key volume |
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

Signup, login, member lookup and token persistence exist in Spring Boot. Spring signs access tokens
with RS256; FastAPI verifies the signature, issuer, audience, expiry and access-token type before
search, crop or catalog re-search. The private key is mounted only into the member service, while
FastAPI receives the public key. HttpOnly refresh cookies and browser session restoration remain the
next security baseline.

## User activity status

MySQL tables and initial Spring endpoints exist for search history and saved results. Their final
DTOs, ownership queries, JSON metadata handling, React integration and automated tests remain to be
implemented. Spring Boot does not read Qdrant; it stores only user-owned activity snapshots.
