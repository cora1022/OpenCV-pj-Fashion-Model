FROM gradle:8.14.3-jdk21-alpine AS build
WORKDIR /workspace
COPY member-service/ ./
RUN gradle bootJar --no-daemon

FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=build /workspace/build/libs/*.jar app.jar
USER app
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
