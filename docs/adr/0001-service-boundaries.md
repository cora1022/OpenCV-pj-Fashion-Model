# ADR 0001: Service boundaries

FastAPI owns image validation, preprocessing, embedding and vector search. A future
Spring Boot service owns members, tokens, profiles, search history and saved items in
MySQL. The services do not share a database.
