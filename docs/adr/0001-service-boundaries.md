# ADR 0001: Service boundaries

FastAPI owns image validation, preprocessing, embedding and vector search. Spring Boot
owns members, tokens and the user-activity API baseline in MySQL. The services do not
share a database. Spring Boot stores activity snapshots and never reads Qdrant points.

The service boundary is implemented, while server-side authorization between the
Spring-issued access token and FastAPI remains planned work.
