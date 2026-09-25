package lk.englisher.auth;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

/**
 * An account.
 *
 * <p>{@code passwordHash} is deliberately package-private to read and never
 * exposed on any DTO — {@code UserEntity} and the auth response records are
 * separate types on purpose (SPRINGBOOT-MIGRATION.md section 4).
 */
@Entity
@Table(name = "users")
public class UserEntity {

    @Id
    @GeneratedValue
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "email", nullable = false)
    private String email;

    /** Null for an account that has only ever signed in with Google/Facebook. */
    @Column(name = "password_hash")
    private String passwordHash;

    @Column(name = "name", nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    private Role role;

    /** Onboarding's answers. Free-form by design — see the schema comment. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "preferences", nullable = false)
    private JsonNode preferences;

    /** The Google account's {@code sub} claim, once linked. */
    @Column(name = "google_id")
    private String googleId;

    /** The Facebook account's numeric id, once linked. */
    @Column(name = "facebook_id")
    private String facebookId;

    /**
     * Where this account's sign-in OTP is delivered — null means "use {@link
     * #email}". Only ever set for {@code Role.ADMIN}; see
     * {@code AuthService.finishSignIn}.
     */
    @Column(name = "otp_email")
    private String otpEmail;

    /** Bcrypt hash of the current OTP, cleared once it is used or expires. */
    @Column(name = "otp_code_hash")
    private String otpCodeHash;

    /** Opaque id verify-otp looks the pending challenge up by; null when none is pending. */
    @Column(name = "otp_challenge_id")
    private String otpChallengeId;

    @Column(name = "otp_expires_at")
    private Instant otpExpiresAt;

    /** Failed verify-otp attempts against the current challenge — locks it out past a threshold. */
    @Column(name = "otp_attempts", nullable = false)
    private int otpAttempts;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected UserEntity() {
    }

    public UserEntity(String email, String passwordHash, String name, Role role, JsonNode preferences) {
        this.email = email;
        this.passwordHash = passwordHash;
        this.name = name;
        this.role = role;
        this.preferences = preferences;
    }

    @PreUpdate
    void touch() {
        this.updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Role getRole() {
        return role;
    }

    public JsonNode getPreferences() {
        return preferences;
    }

    public void setPreferences(JsonNode preferences) {
        this.preferences = preferences;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public String getGoogleId() {
        return googleId;
    }

    public void setGoogleId(String googleId) {
        this.googleId = googleId;
    }

    public String getFacebookId() {
        return facebookId;
    }

    public void setFacebookId(String facebookId) {
        this.facebookId = facebookId;
    }

    public String getOtpEmail() {
        return otpEmail;
    }

    public void setOtpEmail(String otpEmail) {
        this.otpEmail = otpEmail;
    }

    /** Never null — the address an OTP actually gets sent to. */
    public String getOtpDeliveryEmail() {
        return otpEmail == null || otpEmail.isBlank() ? email : otpEmail;
    }

    public String getOtpCodeHash() {
        return otpCodeHash;
    }

    public void setOtpCodeHash(String otpCodeHash) {
        this.otpCodeHash = otpCodeHash;
    }

    public String getOtpChallengeId() {
        return otpChallengeId;
    }

    public void setOtpChallengeId(String otpChallengeId) {
        this.otpChallengeId = otpChallengeId;
    }

    public Instant getOtpExpiresAt() {
        return otpExpiresAt;
    }

    public void setOtpExpiresAt(Instant otpExpiresAt) {
        this.otpExpiresAt = otpExpiresAt;
    }

    public int getOtpAttempts() {
        return otpAttempts;
    }

    public void setOtpAttempts(int otpAttempts) {
        this.otpAttempts = otpAttempts;
    }
}
