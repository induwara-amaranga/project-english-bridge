package lk.englisher.parent;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface ParentLinkRepository extends JpaRepository<ParentLinkEntity, UUID> {

    Optional<ParentLinkEntity> findByInviteToken(String inviteToken);

    /**
     * The child's one live invitation. Revoked rows are excluded, matching the
     * partial unique index that guarantees there is at most one.
     */
    @Query("select l from ParentLinkEntity l where l.childUserId = ?1 and l.status <> 'revoked'")
    Optional<ParentLinkEntity> findLiveByChild(UUID childUserId);

    @Query("select l from ParentLinkEntity l where l.parentUserId = ?1 and l.status = 'accepted'")
    Optional<ParentLinkEntity> findAcceptedByParent(UUID parentUserId);
}
