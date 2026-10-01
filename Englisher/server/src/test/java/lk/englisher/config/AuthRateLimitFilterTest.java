package lk.englisher.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

class AuthRateLimitFilterTest {

    private final MutableClock clock = new MutableClock(Instant.parse("2026-10-01T00:00:00Z"));
    private final ObjectMapper json = new ObjectMapper().findAndRegisterModules();

    private AuthRateLimitFilter filter(boolean enabled, int hops) {
        return new AuthRateLimitFilter(new RateLimitProperties(enabled, hops), json, clock);
    }

    private static MockHttpServletRequest post(String path, String remoteAddr, String forwardedFor) {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", path);
        request.setServletPath(path);
        request.setRemoteAddr(remoteAddr);
        if (forwardedFor != null) {
            request.addHeader("X-Forwarded-For", forwardedFor);
        }
        return request;
    }

    private static MockHttpServletResponse send(AuthRateLimitFilter filter, MockHttpServletRequest request) throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, new MockFilterChain());
        return response;
    }

    @Test
    void signinAllowsTenPerMinuteThenRejectsWithApiError() throws Exception {
        AuthRateLimitFilter filter = filter(true, 0);
        for (int i = 0; i < 10; i++) {
            assertThat(send(filter, post("/api/auth/signin", "203.0.113.5", null)).getStatus()).isEqualTo(200);
        }
        MockHttpServletResponse rejected = send(filter, post("/api/auth/signin", "203.0.113.5", null));

        assertThat(rejected.getStatus()).isEqualTo(429);
        assertThat(rejected.getHeader("Retry-After")).isEqualTo("60");
        assertThat(rejected.getContentAsString()).contains("\"code\":\"auth.rateLimited\"").contains("1 minute");
    }

    @Test
    void loginEndpointsShareOneBudget() throws Exception {
        AuthRateLimitFilter filter = filter(true, 0);
        for (int i = 0; i < 5; i++) {
            send(filter, post("/api/auth/signin", "203.0.113.5", null));
            send(filter, post("/api/auth/verify-otp", "203.0.113.5", null));
        }
        assertThat(send(filter, post("/api/auth/google", "203.0.113.5", null)).getStatus()).isEqualTo(429);
    }

    @Test
    void windowResetsAfterItExpires() throws Exception {
        AuthRateLimitFilter filter = filter(true, 0);
        for (int i = 0; i < 11; i++) {
            send(filter, post("/api/auth/signin", "203.0.113.5", null));
        }
        clock.advance(Duration.ofMinutes(1));
        assertThat(send(filter, post("/api/auth/signin", "203.0.113.5", null)).getStatus()).isEqualTo(200);
    }

    @Test
    void signupAllowsFivePerHour() throws Exception {
        AuthRateLimitFilter filter = filter(true, 0);
        for (int i = 0; i < 5; i++) {
            assertThat(send(filter, post("/api/auth/signup", "203.0.113.5", null)).getStatus()).isEqualTo(200);
        }
        MockHttpServletResponse rejected = send(filter, post("/api/auth/signup", "203.0.113.5", null));
        assertThat(rejected.getStatus()).isEqualTo(429);
        assertThat(rejected.getHeader("Retry-After")).isEqualTo("3600");
    }

    @Test
    void differentClientsHaveSeparateBudgets() throws Exception {
        AuthRateLimitFilter filter = filter(true, 0);
        for (int i = 0; i < 11; i++) {
            send(filter, post("/api/auth/signin", "203.0.113.5", null));
        }
        assertThat(send(filter, post("/api/auth/signin", "198.51.100.7", null)).getStatus()).isEqualTo(200);
    }

    @Test
    void behindOneProxyTheForgeableLeftOfForwardedForIsIgnored() throws Exception {
        AuthRateLimitFilter filter = filter(true, 1);
        // Each request claims a different client IP on the left; the router
        // appended the real one (192.0.2.9) on the right, so all 11 are one client.
        for (int i = 0; i < 10; i++) {
            send(filter, post("/api/auth/signin", "10.1.2.3", "1.1.1." + i + ", 192.0.2.9"));
        }
        assertThat(send(filter, post("/api/auth/signin", "10.1.2.3", "8.8.8.8, 192.0.2.9")).getStatus()).isEqualTo(429);
        assertThat(send(filter, post("/api/auth/signin", "10.1.2.3", "192.0.2.10")).getStatus()).isEqualTo(200);
    }

    @Test
    void clientIpCountsHopsFromTheRight() {
        MockHttpServletRequest request = post("/api/auth/signin", "10.0.0.1", "6.6.6.6, 203.0.113.5, 172.68.1.1");
        assertThat(AuthRateLimitFilter.clientIp(request, 0)).isEqualTo("10.0.0.1");
        assertThat(AuthRateLimitFilter.clientIp(request, 1)).isEqualTo("172.68.1.1");
        assertThat(AuthRateLimitFilter.clientIp(request, 2)).isEqualTo("203.0.113.5");
        assertThat(AuthRateLimitFilter.clientIp(request, 5)).isEqualTo("10.0.0.1");
    }

    @Test
    void preflightsOtherPathsAndDisabledFilterAreNeverLimited() throws Exception {
        AuthRateLimitFilter filter = filter(true, 0);
        for (int i = 0; i < 20; i++) {
            MockHttpServletRequest preflight = post("/api/auth/signin", "203.0.113.5", null);
            preflight.setMethod("OPTIONS");
            assertThat(send(filter, preflight).getStatus()).isEqualTo(200);
            assertThat(send(filter, post("/api/auth/refresh", "203.0.113.5", null)).getStatus()).isEqualTo(200);
        }
        AuthRateLimitFilter disabled = filter(false, 0);
        for (int i = 0; i < 20; i++) {
            assertThat(send(disabled, post("/api/auth/signin", "203.0.113.5", null)).getStatus()).isEqualTo(200);
        }
    }

    private static final class MutableClock extends Clock {
        private Instant now;

        MutableClock(Instant start) {
            this.now = start;
        }

        void advance(Duration duration) {
            now = now.plus(duration);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }
}
