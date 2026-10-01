package lk.englisher.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * @param enabled           off only in the integration-test profile
 * @param trustedProxyHops  proxies in front of the app that append to
 *                          X-Forwarded-For; the client IP is that many entries
 *                          from the right. 0 means use the TCP peer address.
 */
@ConfigurationProperties(prefix = "englisher.rate-limit")
public record RateLimitProperties(
        @DefaultValue("true") boolean enabled,
        @DefaultValue("0") int trustedProxyHops) {
}
