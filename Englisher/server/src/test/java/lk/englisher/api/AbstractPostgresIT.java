package lk.englisher.api;

import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.io.IOException;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;

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
    private static final Pattern OTP_PATTERN = Pattern.compile("\\b(\\d{6})\\b");

    @Autowired
    protected TestRestTemplate rest;

    /**
     * Replaces the real mail sender everywhere: no test ever opens an SMTP
     * connection, and the admin-OTP tests read the code straight back out of
     * whatever {@link OtpMailService} sent instead of guessing it.
     */
    @MockBean
    protected JavaMailSender mailSender;

    /** The 6-digit code from the most recently sent email — see {@code OtpMailService.sendOtp}'s message format. */
    protected String lastOtpCode() {
        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender, atLeastOnce()).send(captor.capture());
        String text = captor.getValue().getText();
        Matcher matcher = OTP_PATTERN.matcher(text == null ? "" : text);
        if (!matcher.find()) {
            throw new IllegalStateException("No 6-digit OTP found in email body: " + text);
        }
        return matcher.group(1);
    }

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
