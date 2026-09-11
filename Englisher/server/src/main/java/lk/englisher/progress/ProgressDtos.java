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
            int currentStagePct,
            int coins,
            int streakFreezes,
            int level,
            int xpIntoLevel,
            int xpForNextLevel,
            /** The streak length lost to an unfrozen gap; 0 when there is nothing to repair. */
            int lastBrokenStreak,
            String streakBrokenAtISO,
            /**
             * The instant a gap starts costing a freeze — the moment the client
             * should start warning that the streak is at risk. Null while there is
             * no active streak to protect.
             */
            String streakExpiresAtISO) {
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

    /**
     * Present only when this completion finished the stage (every lesson now
     * done). {@code cleared} means the ≥75%-accuracy gate was met and the
     * learner moved on to the next stage; when it is false, {@code needsReview}
     * tells the client to point at the stage's review-wrong screen.
     * {@code bonusXp}/{@code bonusCoins} are non-zero only when {@code perfect}
     * is true — the stage-perfect bonus, already folded into {@code progress}
     * but broken out here so the client can show it as its own line rather
     * than a silent bump to the totals.
     */
    public record StageOutcome(int accuracyPct, boolean cleared, boolean perfect, boolean needsReview,
                               int bonusXp, int bonusCoins) {
    }

    public record CompleteLessonResponse(
            boolean passed,
            int xpAwarded,
            int coinsAwarded,
            int bonusXp,
            int bonusCoins,
            /**
             * Non-zero only the day the streak reaches a milestone (see
             * ProgressService.STREAK_MILESTONES) — broken out from bonusXp/bonusCoins
             * so the client can show it as its own "🔥 N-day streak!" callout instead
             * of folding it into the flawless-lesson bonus.
             */
            int streakMilestoneDays,
            int streakMilestoneBonusXp,
            int streakMilestoneBonusCoins,
            List<GradedCard> cards,
            ProgressDto progress,
            StageOutcome stageOutcome) {
    }

    public record PlacementResultRequest(@NotBlank String stageId) {
    }

    /** One wrong (or skipped) question, retried at the cost of {@code RETRY_QUESTION_COST_COINS}. */
    public record RetryQuestionRequest(@NotBlank String stageId, @NotBlank String lessonId,
                                       @NotBlank String exerciseId, int index, JsonNode answers) {
    }

    public record RetryQuestionResponse(boolean correct, StageOutcome stageOutcome, ProgressDto progress) {
    }
}
