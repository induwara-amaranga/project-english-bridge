package lk.englisher;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

/**
 * The Englisher API.
 *
 * <p>Serves exactly the shapes app/src/domain/types.ts already describes, so
 * the React app can be pointed at it without changing its domain model — see
 * SPRINGBOOT-MIGRATION.md.
 */
@SpringBootApplication
@ConfigurationPropertiesScan
public class EnglisherApplication {

    public static void main(String[] args) {
        SpringApplication.run(EnglisherApplication.class, args);
    }
}
