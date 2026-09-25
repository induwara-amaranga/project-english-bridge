package lk.englisher.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lk.englisher.auth.FacebookTokenVerifier;
import lk.englisher.auth.FacebookTokenVerifier.FacebookProfile;
import lk.englisher.auth.GoogleTokenVerifier;
import lk.englisher.auth.GoogleTokenVerifier.GoogleProfile;
import lk.englisher.auth.UserEntity;
import lk.englisher.auth.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * {@code AuthService.oauthSession} — find-or-link-or-create — exercised
 * through the real {@code /api/auth/google} and {@code /api/auth/facebook}
 * endpoints against a real PostgreSQL. {@link GoogleTokenVerifier} and
 * {@link FacebookTokenVerifier} are the only things mocked: they are thin
 * wrappers around Google's/Facebook's own servers, so what is worth pinning
 * down here is what {@code AuthService} does with the profile they hand back,
 * not the HTTP calls themselves.
 */
class AuthOAuthIT extends AbstractPostgresIT {

    @MockBean
    private GoogleTokenVerifier googleVerifier;

    @MockBean
    private FacebookTokenVerifier facebookVerifier;

    @Autowired
    private UserRepository users;

    @Autowired
    private PasswordEncoder passwords;

    @Autowired
    private ObjectMapper json;

    @Test
    void firstGoogleSignInWithNoRoleCreatesAStudent() {
        when(googleVerifier.verify(any())).thenReturn(new GoogleProfile("g-1", "new@test.lk", "New Learner"));

        JsonNode response = post("/api/auth/google", oauthBody("any-token", null));

        assertThat(response.get("otpRequired").asBoolean()).isFalse();
        assertThat(response.get("session").get("user").get("role").asText()).isEqualTo("student");
        assertThat(response.get("session").get("user").get("email").asText()).isEqualTo("new@test.lk");
        assertThat(response.get("session").get("home").asText()).isEqualTo("/learn");
        assertThat(users.findByGoogleId("g-1")).isPresent();
    }

    @Test
    void firstGoogleSignInCanChooseParent() {
        when(googleVerifier.verify(any())).thenReturn(new GoogleProfile("g-2", "parent@test.lk", "A Parent"));

        JsonNode response = post("/api/auth/google", oauthBody("any-token", "parent"));

        assertThat(response.get("session").get("user").get("role").asText()).isEqualTo("parent");
        assertThat(response.get("session").get("home").asText()).isEqualTo("/parent");
    }

    @Test
    void repeatGoogleSignInReusesTheSameAccount() {
        when(googleVerifier.verify(any())).thenReturn(new GoogleProfile("g-3", "again@test.lk", "Again"));

        String firstId = post("/api/auth/google", oauthBody("token-1", null)).get("session").get("user").get("id").asText();
        String secondId = post("/api/auth/google", oauthBody("token-2", null)).get("session").get("user").get("id").asText();

        assertThat(secondId).isEqualTo(firstId);
    }

    @Test
    void googleSignInLinksOntoAnExistingPasswordAccountWithTheSameEmail() {
        UserEntity existing = users.save(new UserEntity(
                "shared@test.lk", passwords.encode("supersecret1"), "Existing Parent",
                lk.englisher.auth.Role.PARENT, json.createObjectNode()));

        when(googleVerifier.verify(any())).thenReturn(new GoogleProfile("g-4", "shared@test.lk", "Ignored Name"));

        // role hint is ignored: the account already exists as PARENT.
        JsonNode response = post("/api/auth/google", oauthBody("any-token", "student"));

        assertThat(response.get("session").get("user").get("id").asText()).isEqualTo(existing.getId().toString());
        assertThat(response.get("session").get("user").get("role").asText()).isEqualTo("parent");
        assertThat(users.findByGoogleId("g-4")).map(UserEntity::getId).contains(existing.getId());
    }

    @Test
    void googleSignInRefusesAnAdminRoleHintForANewAccount() {
        when(googleVerifier.verify(any())).thenReturn(new GoogleProfile("g-5", "wannabe-admin@test.lk", "Nope"));

        ResponseEntity<JsonNode> response = exchange("/api/auth/google", oauthBody("any-token", "admin"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(users.findByGoogleId("g-5")).isEmpty();
    }

    /**
     * The gap {@link AuthService#finishSignIn} exists to close: without it, an
     * admin account whose email got linked to Google could sign in with no
     * password and no OTP at all, since {@code oauthSession}'s
     * find-by-email-then-link path does not care what role it finds.
     */
    @Test
    void googleSignInToAnExistingAdminAccountStillRequiresAnOtpNotASession() {
        users.save(new UserEntity("admin-oauth@test.lk", passwords.encode("supersecret1"), "Admin",
                lk.englisher.auth.Role.ADMIN, json.createObjectNode()));
        when(googleVerifier.verify(any())).thenReturn(new GoogleProfile("g-6", "admin-oauth@test.lk", "Ignored Name"));

        JsonNode response = post("/api/auth/google", oauthBody("any-token", null));

        assertThat(response.get("otpRequired").asBoolean()).isTrue();
        assertThat(response.get("session").isNull()).isTrue();
        assertThat(response.get("challengeId").asText()).isNotBlank();
    }

    @Test
    void firstFacebookSignInWithNoRoleCreatesAStudent() {
        when(facebookVerifier.verify(any())).thenReturn(new FacebookProfile("fb-1", "fbnew@test.lk", "FB Learner"));

        JsonNode response = post("/api/auth/facebook", oauthBody("any-token", null));

        assertThat(response.get("session").get("user").get("role").asText()).isEqualTo("student");
        assertThat(users.findByFacebookId("fb-1")).isPresent();
    }

    @Test
    void repeatFacebookSignInReusesTheSameAccount() {
        when(facebookVerifier.verify(any())).thenReturn(new FacebookProfile("fb-2", "fbagain@test.lk", "Again"));

        String firstId = post("/api/auth/facebook", oauthBody("token-1", null)).get("session").get("user").get("id").asText();
        String secondId = post("/api/auth/facebook", oauthBody("token-2", null)).get("session").get("user").get("id").asText();

        assertThat(secondId).isEqualTo(firstId);
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private JsonNode oauthBody(String token, String role) {
        var body = json.createObjectNode();
        body.put("token", token);
        if (role != null) {
            body.put("role", role);
        }
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
