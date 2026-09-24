package lk.englisher.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Google / Facebook app credentials, all optional. Unlike {@link AuthProperties#getJwtSecret()}
 * these have no startup check — social sign-in is an add-on, not something the
 * app needs to boot, so a blank value simply makes the corresponding endpoint
 * answer {@code auth.oauthNotConfigured} instead of refusing to start.
 */
@Component
@ConfigurationProperties(prefix = "englisher.oauth")
public class OAuthProperties {

    /** The OAuth client id Google Identity Services on the frontend was initialised with. */
    private String googleClientId = "";

    private String facebookAppId = "";

    private String facebookAppSecret = "";

    public String getGoogleClientId() {
        return googleClientId;
    }

    public void setGoogleClientId(String googleClientId) {
        this.googleClientId = googleClientId;
    }

    public String getFacebookAppId() {
        return facebookAppId;
    }

    public void setFacebookAppId(String facebookAppId) {
        this.facebookAppId = facebookAppId;
    }

    public String getFacebookAppSecret() {
        return facebookAppSecret;
    }

    public void setFacebookAppSecret(String facebookAppSecret) {
        this.facebookAppSecret = facebookAppSecret;
    }
}
