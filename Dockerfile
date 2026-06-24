FROM eclipse-temurin:17-jdk-alpine AS build
WORKDIR /app

COPY gradlew gradlew
COPY gradle gradle
COPY build.gradle.kts settings.gradle.kts ./
RUN ./gradlew dependencies --no-daemon || true

COPY src src
RUN ./gradlew bootJar --no-daemon -x test

FROM eclipse-temurin:17-jre-alpine
RUN addgroup -S calendary && adduser -S calendary -G calendary
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
USER calendary
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
