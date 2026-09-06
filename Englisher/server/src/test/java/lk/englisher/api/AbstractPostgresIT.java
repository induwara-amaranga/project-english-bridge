package lk.englisher.api;

import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.io.IOException;

/**
 * Boots the app against a real PostgreSQL.
 *
 * <p>Embedded Postgres rather than Testcontainers: it runs an actual
 * {@code postgres} binary in a temp directory with no Docker daemon, so the
 * suite exercises JSONB, partial unique indexes and Flyway for real even where
 * Docker is not running. Swapping in Testcontainers later changes only this
 * class.
 *
 * <p>One server is started per JVM and shared by every subclass — starting
 * Postgres costs seconds, and Flyway rebuilds the schema per context anyway.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
public abstract class AbstractPostgresIT {

    private static final EmbeddedPostgres POSTGRES = start();

    @Autowired
    protected TestRestTemplate rest;

    private static EmbeddedPostgres start() {
        try {
            return EmbeddedPostgres.builder().start();
        } catch (IOException ex) {
            throw new IllegalStateException("Could not start embedded PostgreSQL", ex);
        }
    }

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> POSTGRES.getJdbcUrl("postgres", "postgres"));
        registry.add("spring.datasource.username", () -> "postgres");
        registry.add("spring.datasource.password", () -> "postgres");
    }
}
