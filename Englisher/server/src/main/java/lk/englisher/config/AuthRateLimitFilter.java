package lk.englisher.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletRequestWrapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lk.englisher.common.GlobalExceptionHandler.ApiError;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Enumeration;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Per-IP throttling of the endpoints that invite brute force: password and
 * social sign-in, the admin OTP check, and signup (fake-account spam).
 * Password sign-in has no per-account lockout of its own, so this is its only
 * guard against password guessing.
 *
 * <p>Counters live in memory, which is correct for a single dyno. With more
 * than one, each dyno counts separately.
 *
 * <p>Registered without an explicit order, so it runs after Spring Security's
 * chain: CORS preflights are answered before reaching it, and a 429 still
 * carries the CORS headers the browser needs to read it.
 */
@Component
public class AuthRateLimitFilter extends OncePerRequestFilter {

    record Zone(String name, Set<String> paths, int limit, Duration window) {
    }

    static final List<Zone> ZONES = List.of(
            new Zone("login",
                    Set.of("/api/auth/signin", "/api/auth/verify-otp", "/api/auth/google", "/api/auth/facebook"),
                    10, Duration.ofMinutes(1)),
            new Zone("signup", Set.of("/api/auth/signup"), 5, Duration.ofHours(1)));

    private static final int SWEEP_THRESHOLD = 10_000;

    private record Window(Instant resetsAt, int count) {
        boolean expired(Instant now) {
            return !now.isBefore(resetsAt);
        }
    }

    private final RateLimitProperties properties;
    private final ObjectMapper json;
    private final Clock clock;
    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    @Autowired
    public AuthRateLimitFilter(RateLimitProperties properties, ObjectMapper json) {
        this(properties, json, Clock.systemUTC());
    }

    AuthRateLimitFilter(RateLimitProperties properties, ObjectMapper json, Clock clock) {
        this.properties = properties;
        this.json = json;
        this.clock = clock;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !properties.enabled()
                || "OPTIONS".equalsIgnoreCase(request.getMethod())
                || zoneFor(request) == null;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Zone zone = zoneFor(request);
        Instant now = clock.instant();
        String key = zone.name() + '|' + clientIp(request, properties.trustedProxyHops());

        Window window = windows.compute(key, (k, current) -> current == null || current.expired(now)
                ? new Window(now.plus(zone.window()), 1)
                : new Window(current.resetsAt(), current.count() + 1));

        if (windows.size() > SWEEP_THRESHOLD) {
            windows.values().removeIf(w -> w.expired(now));
        }

        if (window.count() > zone.limit()) {
            reject(request, response, now, window.resetsAt());
            return;
        }
        chain.doFilter(request, response);
    }

    /**
     * The client is {@code hops} entries from the right of X-Forwarded-For:
     * each trusted proxy appends the address it received the request from, so
     * anything further left was written by the client and can be forged.
     * Read from the unwrapped request because Spring's ForwardedHeaderFilter
     * hides X-Forwarded-* from the requests it wraps.
     */
    static String clientIp(HttpServletRequest request, int hops) {
        if (hops <= 0) {
            return request.getRemoteAddr();
        }
        HttpServletRequest raw = unwrap(request);
        List<String> chain = new ArrayList<>();
        Enumeration<String> headers = raw.getHeaders("X-Forwarded-For");
        while (headers != null && headers.hasMoreElements()) {
            for (String part : headers.nextElement().split(",")) {
                String ip = part.trim();
                if (!ip.isEmpty()) {
                    chain.add(ip);
                }
            }
        }
        return chain.size() >= hops ? chain.get(chain.size() - hops) : raw.getRemoteAddr();
    }

    private static HttpServletRequest unwrap(HttpServletRequest request) {
        ServletRequest current = request;
        while (current instanceof ServletRequestWrapper wrapper) {
            current = wrapper.getRequest();
        }
        return current instanceof HttpServletRequest http ? http : request;
    }

    private static Zone zoneFor(HttpServletRequest request) {
        // Servlet path is decoded and normalised, unlike getRequestURI(), so
        // /api/auth/%73ignin cannot slip past as a different path.
        String path = request.getServletPath() + (request.getPathInfo() == null ? "" : request.getPathInfo());
        for (Zone zone : ZONES) {
            if (zone.paths().contains(path)) {
                return zone;
            }
        }
        return null;
    }

    private void reject(HttpServletRequest request, HttpServletResponse response, Instant now, Instant resetsAt)
            throws IOException {
        long seconds = Math.max(1, (Duration.between(now, resetsAt).toMillis() + 999) / 1000);
        long minutes = (seconds + 59) / 60;
        String message = "Too many attempts. Please wait " + minutes + (minutes == 1 ? " minute" : " minutes")
                + " and try again.";
        int status = HttpStatus.TOO_MANY_REQUESTS.value();
        response.setStatus(status);
        response.setHeader(HttpHeaders.RETRY_AFTER, String.valueOf(seconds));
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        json.writeValue(response.getOutputStream(),
                new ApiError(now, status, "auth.rateLimited", message, request.getRequestURI()));
    }
}
