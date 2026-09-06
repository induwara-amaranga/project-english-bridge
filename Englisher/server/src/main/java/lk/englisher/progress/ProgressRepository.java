package lk.englisher.progress;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface ProgressRepository extends JpaRepository<ProgressEntity, UUID> {

    /** Distinct learners active since a cutoff — the analytics weeklyActive figure. */
    long countByLastActiveAfter(Instant cutoff);

    List<ProgressEntity> findAllByCurrentStageSlug(String currentStageSlug);
}
