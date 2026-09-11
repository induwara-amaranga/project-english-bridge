package lk.englisher.progress;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

/**
 * One row per learner — the single source of XP, streak and stage completion
 * that {@code domain/progress.ts} introduced to replace four pages' worth of
 * disagreeing demo constants.
 */
@Entity
@Table(name = "progress")
public class ProgressEntity {

    @Id
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "xp", nullable = false)
    private int xp;

    @Column(name = "streak_days", nullable = false)
    private int streakDays;

    @Column(name = "last_active", nullable = false)
    private Instant lastActive = Instant.now();

    /** {@code { "<stageSlug>": ["<lessonSlug>", ...] }}. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "completed_lesson_ids", nullable = false)
    private JsonNode completedLessonIds;

    @Column(name = "current_stage_slug", nullable = false)
    private String currentStageSlug;

    @Column(name = "current_stage_pct", nullable = false)
    private int currentStagePct;

    /** Spendable currency — separate from {@code xp}, which never decreases. See ProgressService. */
    @Column(name = "coins", nullable = false)
    private int coins;

    /** Unspent streak-freeze tokens, bought with coins; consumed by ProgressService.applyStreak. */
    @Column(name = "streak_freezes", nullable = false)
    private int streakFreezes;

    /**
     * The streak length lost the last time a gap exceeded the learner's unspent
     * freezes — 0 when there is nothing to repair. Cleared by
     * {@code ProgressService.repairStreak} (pays it back) or
     * {@code dismissBrokenStreak} (waves it off); otherwise it survives until
     * one of those happens, so the repair prompt does not depend on catching
     * the learner on the exact day it happened.
     */
    @Column(name = "last_broken_streak", nullable = false)
    private int lastBrokenStreak;

    /** When {@link #lastBrokenStreak} was set; null once it is cleared. */
    @Column(name = "streak_broken_at")
    private Instant streakBrokenAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected ProgressEntity() {
    }

    public ProgressEntity(UUID userId, int xp, int streakDays, JsonNode completedLessonIds,
                          String currentStageSlug, int currentStagePct) {
        this(userId, xp, streakDays, completedLessonIds, currentStageSlug, currentStagePct, 0, 0);
    }

    public ProgressEntity(UUID userId, int xp, int streakDays, JsonNode completedLessonIds,
                          String currentStageSlug, int currentStagePct, int coins, int streakFreezes) {
        this.userId = userId;
        this.xp = xp;
        this.streakDays = streakDays;
        this.completedLessonIds = completedLessonIds;
        this.currentStageSlug = currentStageSlug;
        this.currentStagePct = currentStagePct;
        this.coins = coins;
        this.streakFreezes = streakFreezes;
    }

    public UUID getUserId() {
        return userId;
    }

    public int getXp() {
        return xp;
    }

    public void setXp(int xp) {
        this.xp = xp;
    }

    public int getStreakDays() {
        return streakDays;
    }

    public void setStreakDays(int streakDays) {
        this.streakDays = streakDays;
    }

    public Instant getLastActive() {
        return lastActive;
    }

    public void setLastActive(Instant lastActive) {
        this.lastActive = lastActive;
    }

    public JsonNode getCompletedLessonIds() {
        return completedLessonIds;
    }

    public void setCompletedLessonIds(JsonNode completedLessonIds) {
        this.completedLessonIds = completedLessonIds;
    }

    public String getCurrentStageSlug() {
        return currentStageSlug;
    }

    public void setCurrentStageSlug(String currentStageSlug) {
        this.currentStageSlug = currentStageSlug;
    }

    public int getCurrentStagePct() {
        return currentStagePct;
    }

    public void setCurrentStagePct(int currentStagePct) {
        this.currentStagePct = currentStagePct;
    }

    public int getCoins() {
        return coins;
    }

    public void setCoins(int coins) {
        this.coins = coins;
    }

    public int getStreakFreezes() {
        return streakFreezes;
    }

    public void setStreakFreezes(int streakFreezes) {
        this.streakFreezes = streakFreezes;
    }

    public int getLastBrokenStreak() {
        return lastBrokenStreak;
    }

    public void setLastBrokenStreak(int lastBrokenStreak) {
        this.lastBrokenStreak = lastBrokenStreak;
    }

    public Instant getStreakBrokenAt() {
        return streakBrokenAt;
    }

    public void setStreakBrokenAt(Instant streakBrokenAt) {
        this.streakBrokenAt = streakBrokenAt;
    }

    public void touch() {
        this.updatedAt = Instant.now();
    }
}
