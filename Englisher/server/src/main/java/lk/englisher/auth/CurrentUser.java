package lk.englisher.auth;

import lk.englisher.common.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;
import java.util.UUID;

/**
 * Reads the authenticated principal out of the security context.
 *
 * <p>A tiny helper rather than a {@code @AuthenticationPrincipal} argument on
 * every method, so that "who is calling" is one call with one failure mode, and
 * services can ask for it without taking a web-layer dependency.
 */
public final class CurrentUser {

    private CurrentUser() {
    }

    public static Optional<JwtService.AccessTokenPrincipal> find() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof JwtService.AccessTokenPrincipal p)) {
            return Optional.empty();
        }
        return Optional.of(p);
    }

    public static JwtService.AccessTokenPrincipal require() {
        return find().orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED,
                "auth.unauthenticated", "Sign in to continue."));
    }

    public static UUID requireId() {
        return require().userId();
    }
}
