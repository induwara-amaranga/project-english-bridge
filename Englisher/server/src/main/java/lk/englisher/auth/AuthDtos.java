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

    /** Onboarding's three answers. All optional; unset means never asked. */
    public record PreferencesDto(String goal, String languageMode, Integer streakGoalDays) {
    }
}
