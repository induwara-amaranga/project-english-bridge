package lk.englisher.auth;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lk.englisher.common.ApiException;
import lk.englisher.config.OAuthProperties;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Verifies an OAuth2 access token the frontend obtained from Google Identity
 * Services' {@code initTokenClient} and turns it into a profile.
 *
 * <p>Two calls, not one, and both matter:
 * <ol>
 *   <li>{@code tokeninfo} confirms the token's {@code aud} is *this app's*
 *   Google client id — without it, a token minted for some unrelated Google
 *   app (which the user may have granted only "email" scope, expecting
 *   nothing more than a profile lookup) could be replayed here and silently
 *   log the attacker in as that user, since Google's userinfo endpoint alone
 *   does not say which client requested the token.</li>
 *   <li>{@code userinfo} then supplies the profile — {@code tokeninfo} does
 *   not reliably return the name.</li>
 * </ol>
 */
@Component
public class GoogleTokenVerifier {

    private static final String TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo?access_token=";
    private static final String USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

    private final OAuthProperties properties;
    private final RestClient client = RestClient.create();

    public GoogleTokenVerifier(OAuthProperties properties) {
        this.properties = properties;
    }

    public record GoogleProfile(String subject, String email, String name) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record TokenInfo(String aud, String azp, String scope) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record UserInfo(String sub, String email, @JsonProperty("email_verified") Boolean emailVerified, String name) {
    }

    public GoogleProfile verify(String accessToken) {
        if (properties.getGoogleClientId().isBlank()) {
            throw ApiException.serviceUnavailable("auth.oauthNotConfigured",
                    "Google sign-in is not configured on this server.");
        }
        TokenInfo info;
        try {
            info = client.get().uri(TOKENINFO_URL + accessToken).retrieve().body(TokenInfo.class);
        } catch (RestClientException ex) {
            throw ApiException.unauthorized("auth.oauthInvalidToken", "That Google sign-in could not be verified.");
        }
        String audience = info == null ? null : (info.aud() != null ? info.aud() : info.azp());
        if (audience == null || !audience.equals(properties.getGoogleClientId())) {
            throw ApiException.unauthorized("auth.oauthInvalidToken", "That Google sign-in could not be verified.");
        }

        UserInfo user;
        try {
            user = client.get().uri(USERINFO_URL)
                    .header("Authorization", "Bearer " + accessToken)
                    .retrieve()
                    .body(UserInfo.class);
        } catch (RestClientException ex) {
            throw ApiException.unauthorized("auth.oauthInvalidToken", "That Google sign-in could not be verified.");
        }
        if (user == null || user.sub() == null) {
            throw ApiException.unauthorized("auth.oauthInvalidToken", "That Google sign-in could not be verified.");
        }
        if (user.email() == null || !Boolean.TRUE.equals(user.emailVerified())) {
            throw ApiException.badRequest("auth.oauthUnverifiedEmail",
                    "That Google account's email address is not verified.");
        }
        return new GoogleProfile(user.sub(), user.email(), user.name());
    }
}
