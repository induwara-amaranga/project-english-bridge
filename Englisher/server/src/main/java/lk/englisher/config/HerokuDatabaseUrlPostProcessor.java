package lk.englisher.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import org.springframework.util.StringUtils;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

/**
 * Maps Heroku Postgres's {@code DATABASE_URL} ({@code postgres://user:pass@host:port/db})
 * onto {@code spring.datasource.*}.
 *
 * <p>Read on every boot rather than copied into config vars once, because
 * Heroku rotates these credentials during database maintenance and only
 * updates {@code DATABASE_URL}. An explicit {@code ENGLISHER_DB_URL} wins, so
 * local development and the integration tests are unaffected.
 */
public class HerokuDatabaseUrlPostProcessor implements EnvironmentPostProcessor {

    static final String SOURCE_NAME = "herokuDatabaseUrl";

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        String databaseUrl = environment.getProperty("DATABASE_URL");
        if (!StringUtils.hasText(databaseUrl) || StringUtils.hasText(environment.getProperty("ENGLISHER_DB_URL"))) {
            return;
        }
        environment.getPropertySources().addFirst(new MapPropertySource(SOURCE_NAME, toDatasourceProperties(databaseUrl)));
    }

    static Map<String, Object> toDatasourceProperties(String databaseUrl) {
        URI uri = URI.create(databaseUrl.trim());
        String scheme = uri.getScheme();
        if (!"postgres".equals(scheme) && !"postgresql".equals(scheme)) {
            throw new IllegalStateException("DATABASE_URL must be a postgres:// URL, got scheme: " + scheme);
        }
        String userInfo = uri.getRawUserInfo();
        if (userInfo == null || !userInfo.contains(":")) {
            throw new IllegalStateException("DATABASE_URL has no user:password section");
        }
        String[] credentials = userInfo.split(":", 2);
        String port = uri.getPort() > 0 ? ":" + uri.getPort() : "";
        // Heroku Postgres refuses unencrypted connections; its certificates are
        // not publicly verifiable, so `require` (encrypt, don't verify) is what
        // Heroku itself documents for JDBC.
        String jdbcUrl = "jdbc:postgresql://" + uri.getHost() + port + uri.getRawPath() + "?sslmode=require";
        return Map.of(
                "spring.datasource.url", jdbcUrl,
                "spring.datasource.username", decode(credentials[0]),
                "spring.datasource.password", decode(credentials[1]));
    }

    private static String decode(String value) {
        return URLDecoder.decode(value, StandardCharsets.UTF_8);
    }
}
