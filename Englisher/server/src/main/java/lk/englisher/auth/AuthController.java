package lk.englisher.auth;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.Valid;
import lk.englisher.auth.AuthDtos.AuthResponse;
import lk.englisher.auth.AuthDtos.AuthUserDto;
import lk.englisher.auth.AuthDtos.SignInRequest;
import lk.englisher.auth.AuthDtos.SignUpRequest;
import lk.englisher.config.AuthProperties;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Signup / signin / refresh / signout, plus the preferences pair.
 *
 * <p>Mirrors {@code useAuth()}'s three functions. The refresh token is set as
 * an httpOnly cookie and never appears in a response body: the prototype kept
 * its fake session in {@code localStorage} because there was nothing to steal,
 * but a real refresh token is exactly what XSS goes looking for
 * (SPRINGBOOT-MIGRATION.md section 4).
 */
@RestController
@RequestMapping("/api")
public class AuthController {

    static final String REFRESH_COOKIE = "englisher_refresh";

    private final AuthService auth;
    private final AuthProperties properties;

    public AuthController(AuthService auth, AuthProperties properties) {
        this.auth = auth;
        this.properties = properties;
    }

    @PostMapping("/auth/signup")
    public ResponseEntity<AuthResponse> signUp(@Valid @RequestBody SignUpRequest request) {
        return withRefreshCookie(auth.signUp(request));
    }

    @PostMapping("/auth/signin")
    public ResponseEntity<AuthResponse> signIn(@Valid @RequestBody SignInRequest request) {
        return withRefreshCookie(auth.signIn(request));
    }

    @PostMapping("/auth/refresh")
    public ResponseEntity<AuthResponse> refresh(
            @CookieValue(value = REFRESH_COOKIE, required = false) String refreshToken) {
        return withRefreshCookie(auth.refresh(refreshToken));
    }

    /**
     * Revokes every refresh token for the account and clears the cookie.
     *
     * <p>Permitted without a valid access token on purpose: a client whose
     * access token has already expired still needs to be able to sign out, and
     * the refresh cookie is what actually identifies the session being ended.
     */
    @PostMapping("/auth/signout")
    public ResponseEntity<Void> signOut(
            @CookieValue(value = REFRESH_COOKIE, required = false) String refreshToken) {
        CurrentUser.find().ifPresent(principal -> auth.signOut(principal.userId()));
        if (refreshToken != null && !refreshToken.isBlank()) {
            auth.signOutByRefreshToken(refreshToken);
        }
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, clearedCookie().toString())
                .build();
    }

    @GetMapping("/auth/me")
    public AuthUserDto me() {
        return auth.currentUser(CurrentUser.requireId());
    }

    /** Onboarding's answers, which the flow currently discards. */
    @GetMapping("/me/preferences")
    public JsonNode preferences() {
        return auth.currentUser(CurrentUser.requireId()).preferences();
    }

    @PutMapping("/me/preferences")
    public JsonNode updatePreferences(@RequestBody JsonNode preferences) {
        return auth.updatePreferences(CurrentUser.requireId(), preferences).preferences();
    }

    private ResponseEntity<AuthResponse> withRefreshCookie(AuthService.Session session) {
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookie(session.refreshToken()).toString())
                .body(session.response());
    }

    private ResponseCookie refreshCookie(String value) {
        return ResponseCookie.from(REFRESH_COOKIE, value)
                .httpOnly(true)
                .secure(properties.isCookieSecure())
                .sameSite(properties.getCookieSameSite())
                .path("/api/auth")
                .maxAge(properties.getRefreshTokenTtl())
                .build();
    }

    private ResponseCookie clearedCookie() {
        return ResponseCookie.from(REFRESH_COOKIE, "")
                .httpOnly(true)
                .secure(properties.isCookieSecure())
                .sameSite(properties.getCookieSameSite())
                .path("/api/auth")
                .maxAge(0)
                .build();
    }
}
