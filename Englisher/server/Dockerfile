# Multi-stage: build with the full JDK, ship on a JRE.
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build

# Dependencies first, so a source-only change does not re-download the world.
COPY pom.xml .
RUN mvn -B -q dependency:go-offline

COPY src ./src
# Integration tests need to start a PostgreSQL, which is a job for CI rather
# than for the image build.
RUN mvn -B -q package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Never run as root.
RUN addgroup -S englisher && adduser -S englisher -G englisher
COPY --from=build /build/target/englisher-server-*.jar app.jar
USER englisher

EXPOSE 8080

# The container is healthy only once Flyway has run and the datasource is up.
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:8080/actuator/health/readiness || exit 1

ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "app.jar"]
