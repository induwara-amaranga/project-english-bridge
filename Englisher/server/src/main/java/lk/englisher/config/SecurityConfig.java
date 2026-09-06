package lk.englisher.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import lk.englisher.auth.JwtAuthFilter;
import lk.englisher.common.GlobalExceptionHandler.ApiError;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.io.IOException;
import java.time.Instant;
import java.util.List;

/**
 * Stateless JWT security.
 *
 * <p>Route-level rules here are coarse — "is this endpoint public" — and the
 * fine-grained role checks live as {@code @PreAuthorize} on the controllers,
 * next to the thing they protect. The React app's {@code RequireRole} keeps
 * doing its client-side redirect for UX, but it stops being the security
 * boundary; these annotations are (SPRINGBOOT-MIGRATION.md section 4).
 */
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private final AuthProperties properties;
    private final ObjectMapper json;

    public SecurityConfig(AuthProperties properties, ObjectMapper json) {
        this.properties = properties;
        this.json = json;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, JwtAuthFilter jwtAuthFilter) throws Exception {
        http
                // CSRF protection is what SameSite plus a bearer token already
                // provide here: state-changing calls authenticate off the
                // Authorization header, which a cross-site form cannot set. The
                // refresh cookie is the one exception, and /api/auth/refresh
                // does nothing but mint a short-lived token for its owner.
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(
                                "/api/auth/signup",
                                "/api/auth/signin",
                                "/api/auth/refresh",
                                "/api/auth/signout",
                                // The placement test runs before there is an
                                // account — see SPRINGBOOT-MIGRATION.md Phase 3,
                                // step 5.
                                "/api/placement",
                                // Accepting an invite may be a parent's first
                                // ever visit; the endpoint tells them whether
                                // they need to sign up.
                                "/api/parent-links/accept",
                                "/actuator/health/**",
                                "/v3/api-docs/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html").permitAll()
                        .anyRequest().authenticated())
                // Distinguishing these two matters to the client: 401 means
                // "your access token is missing or expired, refresh and retry",
                // 403 means "this account may not do that, retrying is
                // pointless". Spring's default answers 403 to both, which would
                // make an expired token look like a permissions error and stop
                // apiClient.ts ever calling /api/auth/refresh.
                .exceptionHandling(handling -> handling
                        .authenticationEntryPoint((request, response, ex) ->
                                writeError(response, HttpServletResponse.SC_UNAUTHORIZED,
                                        "auth.unauthenticated", "Sign in to continue.", request.getRequestURI()))
                        .accessDeniedHandler((request, response, ex) ->
                                writeError(response, HttpServletResponse.SC_FORBIDDEN,
                                        "auth.forbidden", "Your account does not have access to this resource.",
                                        request.getRequestURI())))
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    /**
     * Credentials are allowed because the refresh token is a cookie, which is
     * exactly why the origin list must be explicit — the CORS spec forbids
     * pairing {@code Allow-Credentials: true} with a wildcard origin, and a
     * wildcard here would let any site spend a logged-in learner's session.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(properties.getAllowedOrigins());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }

    /** Same ApiError body the controllers return, so clients parse one shape. */
    private void writeError(HttpServletResponse response, int status, String code,
                            String message, String path) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        json.writeValue(response.getOutputStream(),
                new ApiError(Instant.now(), status, code, message, path));
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
