package lk.englisher.progress;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotBlank;

import java.util.List;

/**
 * Progress wire shapes.
 *
 * <p>{@link ProgressDto} is {@code Progress} from domain/progress.ts field for
 * field, including {@code lastActiveISO} as a string rather than a timestamp —
 * the React app does {@code new Date(p.lastActiveISO)} and an epoch number
 * would break it.
 */
public final class ProgressDtos {

    private ProgressDtos() {
    }

    public record ProgressDto(
            int xp,
            int streakDays,
            String lastActiveISO,
            JsonNode completedLessonIds,
            String currentStageId,
            int currentStagePct) {
    }

    /**
     * The learner's answers, keyed by card id — the same map the exercise
     * player already holds client-side.
     */
    public record CompleteLessonRequest(String stageId, JsonNode answers) {
    }

    /** Per-card grading result, so the client can show which card failed. */
    public record GradedCard(String cardId, String type, boolean answered, boolean correct) {
    }

    public record CompleteLessonResponse(
            boolean passed,
            int xpAwarded,
            List<GradedCard> cards,
            ProgressDto progress) {
    }

    public record PlacementResultRequest(@NotBlank String stageId) {
    }
}
