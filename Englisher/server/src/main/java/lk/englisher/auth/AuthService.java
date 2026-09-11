package lk.englisher.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lk.englisher.auth.AuthDtos.AuthResponse;
import lk.englisher.auth.AuthDtos.AuthUserDto;
import lk.englisher.auth.AuthDtos.SignInRequest;
import lk.englisher.auth.AuthDtos.SignUpRequest;
import lk.englisher.common.ApiException;
import lk.englisher.config.AuthProperties;
import lk.englisher.progress.ProgressService;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

/**
 * Signup, signin, refresh and signout.
 *
 * <p>The one behavioural change from the prototype's fake auth: role is chosen
 * at signup and thereafter read from the account, never from the sign-in form.
 * {@code useAuth.signIn(email, role)} let the client pick — which against a
 * real backend would mean anyone could sign in as an admin by passing a
 * different string.
 */
@Service
public class AuthService {

    private final UserRepository users;
    private final RefreshTokenRepository refreshTokens;
    private final PasswordEncoder passwords;
    private final JwtService jwt;
    private final AuthProperties properties;
    private final ProgressService progress;
    private final ObjectMapper json;

    public AuthService(UserRepository users, RefreshTokenRepository refreshTokens,
                       PasswordEncoder passwords, JwtService jwt, AuthProperties properties,
                       ProgressService progress, ObjectMapper json) {
        this.users = users;
        this.refreshTokens = refreshTokens;
        this.passwords = passwords;
        this.jwt = jwt;
        this.properties = properties;
        this.progress = progress;
        this.json = json;
    }

    /** Signup plus the raw refresh token the controller turns into a cookie. */
    public record Session(AuthResponse response, String refreshToken) {
    }

    @Transactional
    public Session signUp(SignUpRequest request) {
        Role role;
        try {
            role = Role.from(request.role());
        } catch (IllegalArgumentException ex) {
            throw ApiException.badRequest("auth.badRole", "Role must be student, parent or admin.");
        }
        if (role == Role.ADMIN) {
            // There is no path to becoming an admin through the UI — the
            // prototype had none either, and an open admin signup would make
            // every @PreAuthorize('ADMIN') check decorative.
            throw ApiException.forbidden("auth.adminSignupClosed",
                    "Admin accounts are provisioned by the operator, not through signup.");
        }
        String email = request.email().trim();
        if (users.existsByEmailIgnoringCase(email)) {
            throw ApiException.conflict("auth.emailTaken", "That email already has an account.");
        }

        UserEntity user = users.save(new UserEntity(
                email,
                passwords.encode(request.password()),
                request.name().trim(),
                role,
                request.preferences() == null ? json.createObjectNode() : request.preferences()));

        // A learner needs a progress row from the moment the account exists, or
        // every screen that reads XP has to cope with its absence.
        if (role == Role.STUDENT) {
            progress.createInitial(user.getId());
        }
        return newSession(user);
    }

    /**
     * The only path to a new admin account: an existing admin creates it
     * directly, out of band from the public signup form (see the {@code
     * role == Role.ADMIN} check in {@link #signUp}). Returns the account, not
     * a session — the caller stays signed in as themselves; the person the
     * account is for signs in separately with the password they were given.
     */
    @Transactional
    public AuthUserDto createAdmin(AuthDtos.CreateAdminRequest request) {
        String email = request.email().trim();
        if (users.existsByEmailIgnoringCase(email)) {
            throw ApiException.conflict("auth.emailTaken", "That email already has an account.");
        }
        UserEntity user = users.save(new UserEntity(
                email,
                passwords.encode(request.password()),
                request.name().trim(),
                Role.ADMIN,
                json.createObjectNode()));
        return AuthUserDto.of(user);
    }

    @Transactional
    public Session signIn(SignInRequest request) {
        UserEntity user = users.findByEmailIgnoringCase(request.email().trim())
                .orElse(null);
        // One message for "no such account" and "wrong password", so the
        // endpoint cannot be used to enumerate which emails are registered.
        // The encode() on the miss path keeps the timing comparable, too.
        if (user == null) {
            passwords.encode(request.password());
            throw invalidCredentials();
        }
        if (!passwords.matches(request.password(), user.getPasswordHash())) {
            throw invalidCredentials();
        }
        return newSession(user);
    }

    /**
     * Exchanges a refresh token for a new access token, rotating the refresh
     * token in the process — a stolen one is then usable at most until the
     * legitimate holder next refreshes.
     */
    @Transactional
    public Session refresh(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "auth.noRefreshToken", "Sign in to continue.");
        }
        RefreshTokenEntity stored = refreshTokens.findByTokenHash(jwt.hash(rawRefreshToken))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "auth.badRefreshToken",
                        "Sign in to continue."));
        if (!stored.isUsable(Instant.now())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "auth.expiredRefreshToken",
                    "Your session has expired. Please sign in again.");
        }
        UserEntity user = users.findById(stored.getUserId())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "auth.unknownUser",
                        "Sign in to continue."));
        stored.revoke();
        refreshTokens.save(stored);
        return newSession(user);
    }

    @Transactional
    public void signOut(UUID userId) {
        refreshTokens.revokeAllForUser(userId, Instant.now());
    }

    /**
     * Signs out from the refresh cookie alone, for the common case where the
     * access token has already expired by the time the user clicks "log out".
     * An unrecognised token is silently ignored: sign-out is idempotent, and
     * failing it would strand a client holding a stale cookie.
     */
    @Transactional
    public void signOutByRefreshToken(String rawRefreshToken) {
        refreshTokens.findByTokenHash(jwt.hash(rawRefreshToken))
                .ifPresent(token -> refreshTokens.revokeAllForUser(token.getUserId(), Instant.now()));
    }

    @Transactional(readOnly = true)
    public AuthUserDto currentUser(UUID userId) {
        return AuthUserDto.of(require(userId));
    }

    @Transactional(readOnly = true)
    public UserEntity require(UUID userId) {
        return users.findById(userId)
                .orElseThrow(() -> ApiException.notFound("auth.unknownUser", "That account no longer exists."));
    }

    @Transactional
    public AuthUserDto updatePreferences(UUID userId, JsonNode preferences) {
        UserEntity user = require(userId);
        user.setPreferences(preferences == null ? json.createObjectNode() : preferences);
        return AuthUserDto.of(users.save(user));
    }

    private Session newSession(UserEntity user) {
        String raw = jwt.newRefreshToken();
        refreshTokens.save(new RefreshTokenEntity(
                user.getId(),
                jwt.hash(raw),
                Instant.now().plus(properties.getRefreshTokenTtl())));
        AuthResponse response = new AuthResponse(
                jwt.issueAccessToken(user),
                properties.getAccessTokenTtl().toSeconds(),
                AuthUserDto.of(user),
                user.getRole().home());
        return new Session(response, raw);
    }

    private static ApiException invalidCredentials() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "auth.invalidCredentials",
                "That email and password do not match an account.");
    }
}
