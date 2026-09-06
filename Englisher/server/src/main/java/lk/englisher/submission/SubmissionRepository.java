package lk.englisher.submission;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SubmissionRepository extends JpaRepository<SubmissionEntity, UUID> {

    List<SubmissionEntity> findAllByUserIdOrderByUpdatedAtDesc(UUID userId);

    /** The natural key: one submission per learner per card. */
    Optional<SubmissionEntity> findByUserIdAndStageSlugAndLessonSlugAndCardSlug(
            UUID userId, String stageSlug, String lessonSlug, String cardSlug);
}
