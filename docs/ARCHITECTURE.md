# Architecture

Current runtime responsibilities are deliberately small:

```text
Browser → Caddy → React static files (Nginx)
               → FastAPI → OpenCV/YOLO → FashionCLIP → Qdrant
```

Caddy is the only public entry point. Nginx has no API proxy configuration.
FastAPI validates JPEG/PNG input, performs crop/embedding, and owns only catalog
vector data. It never downloads arbitrary image URLs and has no members, tokens or
relational database.

`/health/live` means the process is running. `/health/ready` additionally requires a
loaded model, a local manifest and a compatible non-empty Qdrant collection. HOG is a
person upper-body fallback, not a clothing detector.

## Planned, not implemented

```text
/api/members/* → Spring Boot → MySQL
```

Spring Boot will own registration, login, Spring Security, access/refresh tokens,
profiles, roles, search history and saved results. It will not share FastAPI's Qdrant
storage. Start it only after the catalog is reproducible and the search DTO/error
contract is stable.
