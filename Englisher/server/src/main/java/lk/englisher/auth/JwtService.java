package lk.englisher.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lk.englisher.config.AuthProperties;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.UUID;

/**
 * Issues and verifies the short-lived access token, and mints the opaque
 * refresh token.
 *
 * <p>The access token is a JWT carrying the account id as subject and the role
 * as a claim, so {@code JwtAuthFilter} can build an {@code Authentication}
 * without a database round-trip. The refresh token is deliberately *not* a JWT:
 * it must be revocable, and a self-contained token cannot be revoked without a
 * server-side list anyway — so it is 32 random bytes, stored hashed.
 */
@Service
public class JwtService {

    private static final String ROLE_CLAIM = "role";
    private static final String NAME_CLAIM = "name";

    private final SecretKey key;
    private final AuthProperties properties;
    private final SecureRandom random = new SecureRandom();

    public JwtService(AuthProperties properties) {
        this.properties = properties;
        this.key = Keys.hmacShaKeyFor(properties.getJwtSecret().getBytes(StandardCharsets.UTF_8));
    }

    public String issueAccessToken(UserEntity user) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(user.getId().toString())
                .claim(ROLE_CLAIM, user.getRole().name())
                .claim(NAME_CLAIM, user.getName())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(properties.getAccessTokenTtl())))
                .signWith(key)
                .compact();
    }

    /**
     * Verifies signature and expiry and returns the principal, or throws. A
     * malformed or expired token is not distinguished in the response — both
     * are simply "not authenticated".
     */
    public AccessTokenPrincipal parseAccessToken(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            return new AccessTokenPrincipal(
                    UUID.fromString(claims.getSubject()),
                    Role.valueOf(claims.get(ROLE_CLAIM, String.class)),
                    claims.get(NAME_CLAIM, String.class));
        } catch (JwtException | IllegalArgumentException ex) {
            return null;
        }
    }

    /** A fresh opaque refresh token. Returned raw; only its hash is stored. */
    public String newRefreshToken() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    /**
     * SHA-256, not BCrypt: this value is high-entropy random rather than a
     * user-chosen password, so there is nothing for a slow hash to defend
     * against, and lookups happen on every refresh.
     */
    public String hash(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] out = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(out);
        } catch (Exception ex) {
            throw new IllegalStateException("SHA-256 unavailable", ex);
        }
    }

    /** What a valid access token proves about the caller. */
    public record AccessTokenPrincipal(UUID userId, Role role, String name) {
    }
}
