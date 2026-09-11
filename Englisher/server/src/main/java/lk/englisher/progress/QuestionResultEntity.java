package lk.englisher.progress;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

/**
 * One question a learner attempted, with the answer they gave and whether it
 * was right.
 *
 * <p>{@code correct} is always graded here from {@code answers} — see
 * {@link QuestionResultController} — so the column records what the server
 * decided, not what the client claimed. The exercise is referenced by slug for
 * the same reason {@code submissions} references cards that way: an admin's
 * whole-document curriculum save recreates every content row.
 */
@Entity
@Table(name = "question_results")
public class QuestionResultEntity {

    @Id
    @GeneratedValue
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "stage_slug", nullable = false)
    private String stageSlug;

    @Column(name = "lesson_slug", nullable = false)
    private String lessonSlug;

    @Column(name = "exercise_slug", nullable = false)
    private String exerciseSlug;

    /** Position in the lesson when it was answered — the ordering the review screen shows. */
    @Column(name = "exercise_index", nullable = false)
    private int exerciseIndex;

    @Column(name = "correct", nullable = false)
    private boolean correct;

    @Column(name = "skipped", nullable = false)
    private boolean skipped;

    /** Answer per card id, as grading.ts's Answer union has them. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "answers", nullable = false)
    private JsonNode answers;

    @Column(name = "answered_at", nullable = false)
    private Instant answeredAt = Instant.now();

    protected QuestionResultEntity() {
    }

    public QuestionResultEntity(UUID userId, String stageSlug, String lessonSlug, String exerciseSlug,
                                int exerciseIndex, boolean correct, boolean skipped, JsonNode answers,
                                Instant answeredAt) {
        this.userId = userId;
        this.stageSlug = stageSlug;
        this.lessonSlug = lessonSlug;
        this.exerciseSlug = exerciseSlug;
        this.exerciseIndex = exerciseIndex;
        this.correct = correct;
        this.skipped = skipped;
        this.answers = answers;
        this.answeredAt = answeredAt;
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getStageSlug() {
        return stageSlug;
    }

    public String getLessonSlug() {
        return lessonSlug;
    }

    public String getExerciseSlug() {
        return exerciseSlug;
    }

    public int getExerciseIndex() {
        return exerciseIndex;
    }

    public boolean isCorrect() {
        return correct;
    }

    public void setCorrect(boolean correct) {
        this.correct = correct;
    }

    public boolean isSkipped() {
        return skipped;
    }

    public void setSkipped(boolean skipped) {
        this.skipped = skipped;
    }

    public JsonNode getAnswers() {
        return answers;
    }

    public void setAnswers(JsonNode answers) {
        this.answers = answers;
    }

    public Instant getAnsweredAt() {
        return answeredAt;
    }

    public void setAnsweredAt(Instant answeredAt) {
        this.answeredAt = answeredAt;
    }
}
