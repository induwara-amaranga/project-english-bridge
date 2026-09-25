package lk.englisher.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lk.englisher.auth.Role;
import lk.englisher.auth.UserEntity;
import lk.englisher.auth.UserRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;

/**
 * Admin sign-in 2FA end to end, against the real {@code /api/auth/signin} and
 * {@code /api/auth/verify-otp} endpoints — {@link AuthOAuthIT} pins down that
 * the OAuth entry points cannot bypass this; this class is the password entry
 * point plus the challenge itself (expiry, wrong-code lockout, one-time use).
 */
class AuthOtpIT extends AbstractPostgresIT {

    private static final String PASSWORD = "supersecret1";

    @Autowired
    private UserRepository users;

    @Autowired
    private PasswordEncoder passwords;

    @Autowired
    private ObjectMapper json;

    @Test
    void studentSignInNeedsNoOtp() {
        signUpStudent("plain@test.lk");

        JsonNode response = post("/api/auth/signin", signInBody("plain@test.lk"));

        assertThat(response.get("otpRequired").asBoolean()).isFalse();
        assertThat(response.get("session").get("accessToken").asText()).isNotBlank();
    }

    @Test
    void adminSignInReturnsAChallengeNotASessionAndEmailsACode() {
        seedAdmin("otp-admin@test.lk");

        JsonNode response = post("/api/auth/signin", signInBody("otp-admin@test.lk"));

        assertThat(response.get("otpRequired").asBoolean()).isTrue();
        assertThat(response.get("session").isNull()).isTrue();
        assertThat(response.get("challengeId").asText()).isNotBlank();
        assertThat(lastOtpCode()).matches("\\d{6}");
    }

    @Test
    void adminOtpEmailGoesToTheDeliveryAddressNotTheLoginEmailWhenTheyDiffer() {
        UserEntity admin = seedAdmin("login-only@test.lk");
        admin.setOtpEmail("real-inbox@test.lk");
        users.save(admin);

        post("/api/auth/signin", signInBody("login-only@test.lk"));

        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender, atLeastOnce()).send(captor.capture());
        assertThat(captor.getValue().getTo()).contains("real-inbox@test.lk");
    }

    @Test
    void correctCodeCompletesSignIn() {
        seedAdmin("verify-me@test.lk");
        String challengeId = post("/api/auth/signin", signInBody("verify-me@test.lk")).get("challengeId").asText();

        ResponseEntity<JsonNode> response = exchange("/api/auth/verify-otp", otpBody(challengeId, lastOtpCode()));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().get("accessToken").asText()).isNotBlank();
        assertThat(response.getBody().get("user").get("role").asText()).isEqualTo("admin");
        String cookie = response.getHeaders().getFirst(HttpHeaders.SET_COOKIE);
        assertThat(cookie).contains("englisher_refresh=").contains("HttpOnly");
    }

    @Test
    void aCodeCannotBeReusedOnceItHasCompletedSignIn() {
        seedAdmin("onetime@test.lk");
        String challengeId = post("/api/auth/signin", signInBody("onetime@test.lk")).get("challengeId").asText();
        String code = lastOtpCode();
        assertThat(exchange("/api/auth/verify-otp", otpBody(challengeId, code)).getStatusCode()).isEqualTo(HttpStatus.OK);

        ResponseEntity<JsonNode> replay = exchange("/api/auth/verify-otp", otpBody(challengeId, code));

        assertThat(replay.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void wrongCodeIsRejectedAndCountsAsAnAttempt() {
        seedAdmin("wrongcode@test.lk");
        String challengeId = post("/api/auth/signin", signInBody("wrongcode@test.lk")).get("challengeId").asText();

        ResponseEntity<JsonNode> response = exchange("/api/auth/verify-otp", otpBody(challengeId, "000000"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void fiveWrongAttemptsLockTheChallengeOutEvenWithTheRightCodeAfterward() {
        seedAdmin("locked@test.lk");
        String challengeId = post("/api/auth/signin", signInBody("locked@test.lk")).get("challengeId").asText();
        String code = lastOtpCode();

        for (int i = 0; i < 5; i++) {
            exchange("/api/auth/verify-otp", otpBody(challengeId, "000000"));
        }
        ResponseEntity<JsonNode> response = exchange("/api/auth/verify-otp", otpBody(challengeId, code));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void anUnknownChallengeIdIsRejected() {
        ResponseEntity<JsonNode> response = exchange("/api/auth/verify-otp", otpBody(UUID.randomUUID().toString(), "123456"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void signingInAgainIssuesAFreshCodeAndInvalidatesTheOldChallenge() {
        seedAdmin("resend@test.lk");
        String firstChallenge = post("/api/auth/signin", signInBody("resend@test.lk")).get("challengeId").asText();
        String firstCode = lastOtpCode();

        String secondChallenge = post("/api/auth/signin", signInBody("resend@test.lk")).get("challengeId").asText();

        assertThat(secondChallenge).isNotEqualTo(firstChallenge);
        ResponseEntity<JsonNode> usingOldChallenge = exchange("/api/auth/verify-otp", otpBody(firstChallenge, firstCode));
        assertThat(usingOldChallenge.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private UserEntity seedAdmin(String email) {
        return users.save(new UserEntity(email, passwords.encode(PASSWORD), "Admin", Role.ADMIN, json.createObjectNode()));
    }

    private void signUpStudent(String email) {
        var body = json.createObjectNode();
        body.put("name", "Student");
        body.put("email", email);
        body.put("password", PASSWORD);
        body.put("role", "student");
        ResponseEntity<JsonNode> response = exchange("/api/auth/signup", body);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    private JsonNode signInBody(String email) {
        var body = json.createObjectNode();
        body.put("email", email);
        body.put("password", PASSWORD);
        return body;
    }

    private JsonNode otpBody(String challengeId, String code) {
        var body = json.createObjectNode();
        body.put("challengeId", challengeId);
        body.put("code", code);
        return body;
    }

    private JsonNode post(String path, Object body) {
        ResponseEntity<JsonNode> response = exchange(path, body);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody();
    }

    private ResponseEntity<JsonNode> exchange(String path, Object body) {
        var headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        return rest.exchange(path, HttpMethod.POST, new HttpEntity<>(body, headers), JsonNode.class);
    }
}
