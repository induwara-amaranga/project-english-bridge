package lk.englisher.auth;

/**
 * The three account types, one-for-one with {@code Role} in
 * {@code app/src/hooks/useAuth.tsx} — uppercased here because Spring Security's
 * {@code hasRole} prepends {@code ROLE_} and expects that convention.
 *
 * <p>{@link #wire()} converts back to the lowercase form the React app's
 * {@code AuthUser.role} and {@code RequireRole} expect, so the JSON on the wire
 * stays exactly what the unchanged frontend already parses.
 */
public enum Role {
    STUDENT,
    PARENT,
    ADMIN;

    /** The lowercase form the frontend uses: {@code student | parent | admin}. */
    public String wire() {
        return name().toLowerCase();
    }

    public String authority() {
        return "ROLE_" + name();
    }

    /** Parses either form, so {@code "student"} and {@code "STUDENT"} both work. */
    public static Role from(String raw) {
        if (raw == null) {
            throw new IllegalArgumentException("role is required");
        }
        return Role.valueOf(raw.trim().toUpperCase());
    }

    /** The landing route per role — mirrors {@code roleHome()} in useAuth.tsx. */
    public String home() {
        return switch (this) {
            case ADMIN -> "/admin";
            case PARENT -> "/parent";
            case STUDENT -> "/learn";
        };
    }
}
