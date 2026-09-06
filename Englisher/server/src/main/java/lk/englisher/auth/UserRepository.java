package lk.englisher.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<UserEntity, UUID> {

    /** Email is the login identity and is matched case-insensitively, like the unique index. */
    @Query("select u from UserEntity u where lower(u.email) = lower(?1)")
    Optional<UserEntity> findByEmailIgnoringCase(String email);

    @Query("select count(u) > 0 from UserEntity u where lower(u.email) = lower(?1)")
    boolean existsByEmailIgnoringCase(String email);
}
