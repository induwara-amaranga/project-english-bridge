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

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected ProgressEntity() {
    }

    public ProgressEntity(UUID userId, int xp, int streakDays, JsonNode completedLessonIds,
                          String currentStageSlug, int currentStagePct) {
        this.userId = userId;
        this.xp = xp;
        this.streakDays = streakDays;
        this.completedLessonIds = completedLessonIds;
        this.currentStageSlug = currentStageSlug;
        this.currentStagePct = currentStagePct;
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

    public void touch() {
        this.updatedAt = Instant.now();
    }
}
