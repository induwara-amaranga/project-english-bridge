package lk.englisher.config;

import jakarta.annotation.PostConstruct;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.List;

/**
 * Auth and CORS knobs, all overridable per environment.
 *
 * <p>{@link #jwtSecret} has no usable default on purpose: a shipped default
 * signing key means anyone with the source can mint an admin token. The
 * {@code dev} profile sets a throwaway one; production must supply
 * {@code ENGLISHER_JWT_SECRET} or the context fails to start, loudly, at boot
 * rather than quietly serving forgeable tokens.
 */
@Component
@ConfigurationProperties(prefix = "englisher.auth")
public class AuthProperties {

    /** HMAC signing key for access tokens. At least 32 bytes. */
    private String jwtSecret = "";

    /** Short, because it cannot be revoked before it expires. */
    private Duration accessTokenTtl = Duration.ofMinutes(15);

    /** Long, because it is revocable and lives in an httpOnly cookie. */
    private Duration refreshTokenTtl = Duration.ofDays(30);

    /** How long a parent invitation stays acceptable. */
    private Duration inviteTtl = Duration.ofDays(14);

    /** Explicit allow-list — never "*", because the refresh cookie is credentialed. */
    private List<String> allowedOrigins = List.of("http://localhost:5173", "http://localhost:4173");

    /** Set false only when serving the API over plain HTTP in local dev. */
    private boolean cookieSecure = true;

    private String cookieSameSite = "Lax";

    /** Seeded on first boot so there is a way in; there is no admin signup route. */
    private String adminEmail = "admin@englisher.test";

    private String adminPassword = "";

    private String adminName = "Course Admin";

    @PostConstruct
    void validate() {
        if (jwtSecret == null || jwtSecret.getBytes().length < 32) {
            throw new IllegalStateException(
                    "englisher.auth.jwt-secret must be set to at least 32 bytes. "
                            + "Set the ENGLISHER_JWT_SECRET environment variable.");
        }
    }

    public String getJwtSecret() {
        return jwtSecret;
    }

    public void setJwtSecret(String jwtSecret) {
        this.jwtSecret = jwtSecret;
    }

    public Duration getAccessTokenTtl() {
        return accessTokenTtl;
    }

    public void setAccessTokenTtl(Duration accessTokenTtl) {
        this.accessTokenTtl = accessTokenTtl;
    }

    public Duration getRefreshTokenTtl() {
        return refreshTokenTtl;
    }

    public void setRefreshTokenTtl(Duration refreshTokenTtl) {
        this.refreshTokenTtl = refreshTokenTtl;
    }

    public Duration getInviteTtl() {
        return inviteTtl;
    }

    public void setInviteTtl(Duration inviteTtl) {
        this.inviteTtl = inviteTtl;
    }

    public List<String> getAllowedOrigins() {
        return allowedOrigins;
    }

    public void setAllowedOrigins(List<String> allowedOrigins) {
        this.allowedOrigins = allowedOrigins;
    }

    public boolean isCookieSecure() {
        return cookieSecure;
    }

    public void setCookieSecure(boolean cookieSecure) {
        this.cookieSecure = cookieSecure;
    }

    public String getCookieSameSite() {
        return cookieSameSite;
    }

    public void setCookieSameSite(String cookieSameSite) {
        this.cookieSameSite = cookieSameSite;
    }

    public String getAdminEmail() {
        return adminEmail;
    }

    public void setAdminEmail(String adminEmail) {
        this.adminEmail = adminEmail;
    }

    public String getAdminPassword() {
        return adminPassword;
    }

    public void setAdminPassword(String adminPassword) {
        this.adminPassword = adminPassword;
    }

    public String getAdminName() {
        return adminName;
    }

    public void setAdminName(String adminName) {
        this.adminName = adminName;
    }
}
