package lk.englisher.progress;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface QuestionResultRepository extends JpaRepository<QuestionResultEntity, UUID> {

    /** Oldest first, so the review screen lists lessons in the order they were finished. */
    List<QuestionResultEntity> findAllByUserIdOrderByAnsweredAtAsc(UUID userId);

    List<QuestionResultEntity> findAllByUserIdAndStageSlugAndLessonSlugOrderByExerciseIndexAsc(
            UUID userId, String stageSlug, String lessonSlug);

    /** Every question answered anywhere in a stage — the stage-accuracy gate reads this. */
    List<QuestionResultEntity> findAllByUserIdAndStageSlug(UUID userId, String stageSlug);

    /** The one row a retry updates. */
    Optional<QuestionResultEntity> findByUserIdAndStageSlugAndLessonSlugAndExerciseSlug(
            UUID userId, String stageSlug, String lessonSlug, String exerciseSlug);

    /** A retake replaces the previous attempt rather than adding to it. */
    void deleteByUserIdAndStageSlugAndLessonSlug(UUID userId, String stageSlug, String lessonSlug);
}
