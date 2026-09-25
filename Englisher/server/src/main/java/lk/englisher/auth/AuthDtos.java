package lk.englisher.auth;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Auth request and response shapes.
 *
 * <p>{@link AuthUserDto} is the server's answer to {@code AuthUser} in
 * useAuth.tsx — {@code name}, {@code email}, {@code role} — with the role
 * lowercased to the exact {@code student | parent | admin} union the React app
 * already switches on. Nothing password-shaped appears on any response type.
 */
public final class AuthDtos {

    private AuthDtos() {
    }

    /**
     * Signup carries the onboarding answers so the three questions the flow
     * asks are not thrown away. {@code preferences} is optional — the API is
     * usable without ever having walked the onboarding pages.
     */
    public record SignUpRequest(
            @NotBlank @Size(max = 120) String name,
            @NotBlank @Email @Size(max = 255) String email,
            @NotBlank @Size(min = 8, max = 200) String password,
            @NotBlank String role,
            JsonNode preferences) {
    }

    public record SignInRequest(
            @NotBlank @Email String email,
            @NotBlank String password) {
    }

    /** {@code /auth/verify-otp} — resolves the challenge id a {@link SignInResponse#otpRequired} answer handed back. */
    public record VerifyOtpRequest(
            @NotBlank String challengeId,
            @NotBlank @Size(min = 6, max = 6) String code) {
    }

    /**
     * Google's {@code token} is the OAuth2 access token from
     * {@code initTokenClient}; Facebook's is the user access token from
     * {@code FB.login}. {@code role} is only consulted the first time this
     * provider id (or its email) is seen — see {@code AuthService.oauthSession}
     * — and defaults to {@code student} when omitted, matching the sign-in
     * page's buttons, which have no role toggle.
     */
    public record OAuthSignInRequest(
            @NotBlank String token,
            String role) {
    }

    /**
     * An existing admin provisioning a new one — see
     * {@code AuthService.createAdmin}. No {@code role} field: the caller
     * cannot choose it, unlike {@link SignUpRequest}.
     */
    public record CreateAdminRequest(
            @NotBlank @Size(max = 120) String name,
            @NotBlank @Email @Size(max = 255) String email,
            @NotBlank @Size(min = 8, max = 200) String password) {
    }

    /** {@code AuthUser} in useAuth.tsx, plus the id the API needs. */
    public record AuthUserDto(String id, String name, String email, String role, JsonNode preferences) {
        public static AuthUserDto of(UserEntity user) {
            return new AuthUserDto(
                    user.getId().toString(),
                    user.getName(),
                    user.getEmail(),
                    user.getRole().wire(),
                    user.getPreferences());
        }
    }

    /**
     * What signin/signup/refresh return. The refresh token is absent by design
     * — it goes back as an httpOnly cookie the JavaScript cannot read, which is
     * the entire reason it is not in this record.
     */
    public record AuthResponse(String accessToken, long expiresInSeconds, AuthUserDto user, String home) {
    }

    /**
     * What signin/google/facebook return — either a completed session, or a
     * pending admin 2FA challenge to resolve via {@code POST
     * /auth/verify-otp}. Always the same envelope so the frontend has one
     * response shape to branch on rather than a status-code convention.
     */
    public record SignInResponse(boolean otpRequired, String challengeId, AuthResponse session) {
        public static SignInResponse otpRequired(String challengeId) {
            return new SignInResponse(true, challengeId, null);
        }

        public static SignInResponse signed(AuthResponse session) {
            return new SignInResponse(false, null, session);
        }
    }

    /** Onboarding's three answers. All optional; unset means never asked. */
    public record PreferencesDto(String goal, String languageMode, Integer streakGoalDays) {
    }
}
