package lk.englisher.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface RefreshTokenRepository extends JpaRepository<RefreshTokenEntity, UUID> {

    Optional<RefreshTokenEntity> findByTokenHash(String tokenHash);

    /** Sign-out revokes every live token for the account, not just the one presented. */
    @Modifying
    @Query("update RefreshTokenEntity t set t.revokedAt = ?2 where t.userId = ?1 and t.revokedAt is null")
    int revokeAllForUser(UUID userId, Instant at);
}
