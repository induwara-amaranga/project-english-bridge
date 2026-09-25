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
import org.springframework.mail.MailException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
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

    /** 6-digit codes, 10-minute window, 5 guesses before the challenge is dead — the same shape as any other SMS/email OTP. */
    private static final Duration OTP_TTL = Duration.ofMinutes(10);
    private static final int OTP_MAX_ATTEMPTS = 5;

    private final UserRepository users;
    private final RefreshTokenRepository refreshTokens;
    private final PasswordEncoder passwords;
    private final JwtService jwt;
    private final AuthProperties properties;
    private final ProgressService progress;
    private final ObjectMapper json;
    private final GoogleTokenVerifier googleVerifier;
    private final FacebookTokenVerifier facebookVerifier;
    private final OtpMailService otpMail;
    private final SecureRandom random = new SecureRandom();

    public AuthService(UserRepository users, RefreshTokenRepository refreshTokens,
                       PasswordEncoder passwords, JwtService jwt, AuthProperties properties,
                       ProgressService progress, ObjectMapper json,
                       GoogleTokenVerifier googleVerifier, FacebookTokenVerifier facebookVerifier,
                       OtpMailService otpMail) {
        this.users = users;
        this.refreshTokens = refreshTokens;
        this.passwords = passwords;
        this.jwt = jwt;
        this.properties = properties;
        this.progress = progress;
        this.json = json;
        this.googleVerifier = googleVerifier;
        this.facebookVerifier = facebookVerifier;
        this.otpMail = otpMail;
    }

    /** Signup plus the raw refresh token the controller turns into a cookie. */
    public record Session(AuthResponse response, String refreshToken) {
    }

    /**
     * What a sign-in attempt resolves to — a completed {@link Session}, or a
     * pending admin 2FA challenge that {@link #verifyOtp} must resolve before
     * one exists. Every path that can end in a session (password, Google,
     * Facebook) returns this instead of {@code Session} directly, so 2FA has
     * no provider it can be bypassed through — see {@link #finishSignIn}.
     */
    public sealed interface SignInOutcome permits OtpRequired, Signed {
    }

    public record OtpRequired(String challengeId) implements SignInOutcome {
    }

    public record Signed(Session session) implements SignInOutcome {
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
    public SignInOutcome signIn(SignInRequest request) {
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
        return finishSignIn(user);
    }

    @Transactional
    public SignInOutcome signInWithGoogle(String accessToken, String roleHint) {
        GoogleTokenVerifier.GoogleProfile profile = googleVerifier.verify(accessToken);
        return oauthSession(true, profile.subject(), profile.email(), profile.name(), roleHint);
    }

    @Transactional
    public SignInOutcome signInWithFacebook(String accessToken, String roleHint) {
        FacebookTokenVerifier.FacebookProfile profile = facebookVerifier.verify(accessToken);
        return oauthSession(false, profile.id(), profile.email(), profile.name(), roleHint);
    }

    /**
     * Find-or-link-or-create, shared by both providers once each has turned
     * its token into a (providerId, email, name) triple.
     *
     * <p>Three cases, in order: the provider id is already linked to an
     * account (repeat sign-in); the email matches an existing account made
     * some other way, in which case this provider is linked onto it (so
     * "sign up with a password, later use Google" works); or neither matches,
     * in which case a new account is created with {@code roleHint} (defaulting
     * to {@code student} — the sign-in page's buttons have no role toggle).
     * Both providers only ever hand back a verified email (see
     * GoogleTokenVerifier/FacebookTokenVerifier), so linking on email match is
     * as trustworthy as the password-signup email itself.
     */
    private SignInOutcome oauthSession(boolean isGoogle, String providerId, String email, String name, String roleHint) {
        UserEntity user = (isGoogle ? users.findByGoogleId(providerId) : users.findByFacebookId(providerId))
                .orElse(null);
        if (user == null) {
            user = users.findByEmailIgnoringCase(email).orElse(null);
            if (user != null) {
                linkProvider(user, isGoogle, providerId);
                user = users.save(user);
            }
        }
        if (user == null) {
            Role role;
            try {
                role = roleHint == null || roleHint.isBlank() ? Role.STUDENT : Role.from(roleHint);
            } catch (IllegalArgumentException ex) {
                throw ApiException.badRequest("auth.badRole", "Role must be student or parent.");
            }
            if (role == Role.ADMIN) {
                throw ApiException.forbidden("auth.adminSignupClosed",
                        "Admin accounts are provisioned by the operator, not through signup.");
            }
            UserEntity created = new UserEntity(
                    email, null, name == null || name.isBlank() ? email : name, role, json.createObjectNode());
            linkProvider(created, isGoogle, providerId);
            user = users.save(created);
            if (role == Role.STUDENT) {
                progress.createInitial(user.getId());
            }
        }
        return finishSignIn(user);
    }

    private static void linkProvider(UserEntity user, boolean isGoogle, String providerId) {
        if (isGoogle) {
            user.setGoogleId(providerId);
        } else {
            user.setFacebookId(providerId);
        }
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

    /**
     * Every path that can end in a session — password, Google, Facebook —
     * funnels through here, so an admin account gets 2FA no matter which
     * provider it signs in with. Only {@code Role.ADMIN} is gated; students
     * and parents go straight through, same as before this existed.
     */
    private SignInOutcome finishSignIn(UserEntity user) {
        if (user.getRole() != Role.ADMIN) {
            return new Signed(newSession(user));
        }
        return new OtpRequired(issueOtpChallenge(user));
    }

    /**
     * Generates a fresh 6-digit code, overwriting any challenge already
     * pending for this account (so only the most recent "resend" — a second
     * signin attempt — is ever valid), and emails it before committing. A
     * failed send throws and the transaction rolls the challenge back with
     * it, rather than leaving the admin on a code-entry screen no email is
     * coming for.
     */
    private String issueOtpChallenge(UserEntity user) {
        String code = String.format("%06d", random.nextInt(1_000_000));
        String challengeId = UUID.randomUUID().toString();
        user.setOtpCodeHash(passwords.encode(code));
        user.setOtpChallengeId(challengeId);
        user.setOtpExpiresAt(Instant.now().plus(OTP_TTL));
        user.setOtpAttempts(0);
        users.save(user);
        try {
            otpMail.sendOtp(user.getOtpDeliveryEmail(), code);
        } catch (MailException ex) {
            throw ApiException.serviceUnavailable("auth.otpSendFailed",
                    "Could not send the verification email. Please try again shortly.");
        }
        return challengeId;
    }

    /**
     * Resolves an {@link OtpRequired} challenge into a real session. Wrong
     * codes count against {@link #OTP_MAX_ATTEMPTS} before the challenge is
     * killed outright — brute-forcing a 6-digit code needs more than five
     * guesses, and the 10-minute expiry bounds it further either way.
     *
     * <p>{@code noRollbackFor}: every failure path here saves a mutation (the
     * incremented attempt count, or the cleared challenge) and then throws —
     * Spring's default is to roll back the whole transaction on any unchecked
     * exception, which would silently undo that save and make the lockout,
     * the expiry-clear and the one-time-use guarantee all no-ops.
     */
    @Transactional(noRollbackFor = ApiException.class)
    public Session verifyOtp(String challengeId, String code) {
        UserEntity user = challengeId == null || challengeId.isBlank()
                ? null
                : users.findByOtpChallengeId(challengeId).orElse(null);
        if (user == null) {
            throw invalidOtp();
        }
        if (user.getOtpExpiresAt() == null || user.getOtpExpiresAt().isBefore(Instant.now())) {
            clearOtp(user);
            throw ApiException.unauthorized("auth.otpExpired",
                    "That code has expired. Sign in again to get a new one.");
        }
        if (user.getOtpAttempts() >= OTP_MAX_ATTEMPTS) {
            clearOtp(user);
            throw ApiException.unauthorized("auth.otpLocked",
                    "Too many attempts. Sign in again to get a new code.");
        }
        if (user.getOtpCodeHash() == null || !passwords.matches(code == null ? "" : code.trim(), user.getOtpCodeHash())) {
            user.setOtpAttempts(user.getOtpAttempts() + 1);
            users.save(user);
            throw invalidOtp();
        }
        clearOtp(user);
        return newSession(user);
    }

    private void clearOtp(UserEntity user) {
        user.setOtpCodeHash(null);
        user.setOtpChallengeId(null);
        user.setOtpExpiresAt(null);
        user.setOtpAttempts(0);
        users.save(user);
    }

    private static ApiException invalidCredentials() {
        return ApiException.unauthorized("auth.invalidCredentials",
                "That email and password do not match an account.");
    }

    private static ApiException invalidOtp() {
        return ApiException.unauthorized("auth.invalidOtp",
                "That code is incorrect or has expired.");
    }
}
