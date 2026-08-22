# ADR 0001: Service boundaries

FastAPI owns image validation, preprocessing, embedding and vector search. Spring Boot
owns members, tokens and the user-activity API baseline in MySQL. The services do not
share a database. Spring Boot stores activity snapshots and never reads Qdrant points.

Spring Boot signs access tokens with an RSA private key, while FastAPI validates protected image
operations with the corresponding public key. The services share token contract configuration but
do not share application data or a database.
