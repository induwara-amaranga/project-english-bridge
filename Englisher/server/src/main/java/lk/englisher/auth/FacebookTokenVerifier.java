package lk.englisher.auth;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lk.englisher.common.ApiException;
import lk.englisher.config.OAuthProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;

/**
 * Verifies a Facebook user access token the frontend obtained from the
 * Facebook JS SDK's {@code FB.login}, and turns it into a profile.
 *
 * <p>{@code debug_token} confirms the token's {@code app_id} is *this app's*
 * Facebook app id — the same reasoning as {@link GoogleTokenVerifier}'s
 * {@code tokeninfo} call, and for the same reason: Graph API's {@code /me}
 * alone does not say which app the token was issued to.
 */
@Component
public class FacebookTokenVerifier {

    private static final Logger log = LoggerFactory.getLogger(FacebookTokenVerifier.class);
    private static final String GRAPH_VERSION = "v19.0";

    private final OAuthProperties properties;
    private final RestClient client = RestClient.builder()
            .messageConverters(converters -> converters.add(0, jsonConverter()))
            .build();

    public FacebookTokenVerifier(OAuthProperties properties) {
        this.properties = properties;
    }

    /**
     * Graph API answers {@code debug_token}/{@code me} with
     * {@code Content-Type: text/javascript} rather than {@code application/json}
     * (a JSONP-era holdover) — valid JSON that Spring's default converters
     * refuse to parse on content type alone. Trusting that one extra media type
     * fixes it without weakening what any other call accepts.
     */
    private static MappingJackson2HttpMessageConverter jsonConverter() {
        MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter();
        converter.setSupportedMediaTypes(List.of(MediaType.APPLICATION_JSON, MediaType.valueOf("text/javascript")));
        return converter;
    }

    public record FacebookProfile(String id, String email, String name) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record DebugTokenResponse(@JsonProperty("data") DebugTokenData data) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record DebugTokenData(@JsonProperty("app_id") String appId,
                                   @JsonProperty("is_valid") Boolean isValid,
                                   @JsonProperty("user_id") String userId) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record MeResponse(String id, String email, String name) {
    }

    public FacebookProfile verify(String accessToken) {
        if (properties.getFacebookAppId().isBlank() || properties.getFacebookAppSecret().isBlank()) {
            throw ApiException.serviceUnavailable("auth.oauthNotConfigured",
                    "Facebook sign-in is not configured on this server.");
        }

        String appAccessToken = properties.getFacebookAppId() + "|" + properties.getFacebookAppSecret();
        DebugTokenResponse debug;
        try {
            debug = client.get()
                    .uri("https://graph.facebook.com/{v}/debug_token?input_token={token}&access_token={app}",
                            GRAPH_VERSION, accessToken, appAccessToken)
                    .retrieve()
                    .body(DebugTokenResponse.class);
        } catch (RestClientException ex) {
            log.warn("Facebook debug_token call failed", ex);
            throw ApiException.unauthorized("auth.oauthInvalidToken", "That Facebook sign-in could not be verified.");
        }
        DebugTokenData data = debug == null ? null : debug.data();
        if (data == null || !Boolean.TRUE.equals(data.isValid())
                || !properties.getFacebookAppId().equals(data.appId())
                || data.userId() == null) {
            log.warn("Facebook debug_token rejected: data={}", data);
            throw ApiException.unauthorized("auth.oauthInvalidToken", "That Facebook sign-in could not be verified.");
        }

        MeResponse me;
        try {
            me = client.get()
                    .uri("https://graph.facebook.com/{v}/me?fields=id,name,email&access_token={token}&appsecret_proof={proof}",
                            GRAPH_VERSION, accessToken, appsecretProof(accessToken))
                    .retrieve()
                    .body(MeResponse.class);
        } catch (RestClientException ex) {
            log.warn("Facebook /me call failed", ex);
            throw ApiException.unauthorized("auth.oauthInvalidToken", "That Facebook sign-in could not be verified.");
        }
        if (me == null || me.id() == null || !me.id().equals(data.userId())) {
            log.warn("Facebook /me mismatch: me={} expectedUserId={}", me, data.userId());
            throw ApiException.unauthorized("auth.oauthInvalidToken", "That Facebook sign-in could not be verified.");
        }
        if (me.email() == null) {
            // Facebook only ever returns a confirmed email on this field, but
            // omits it entirely if the account has none (e.g. phone-only
            // signup) — there is no separate "unverified" case to reject.
            throw ApiException.badRequest("auth.oauthNoEmail",
                    "That Facebook account has no email address to sign up with.");
        }
        return new FacebookProfile(me.id(), me.email(), me.name());
    }

    /** Recommended whenever the app secret is available server-side: proves the call came from us, not a replayed token alone. */
    private String appsecretProof(String accessToken) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(
                    properties.getFacebookAppSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(accessToken.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException | InvalidKeyException ex) {
            throw new IllegalStateException("HmacSHA256 unavailable", ex);
        }
    }
}
