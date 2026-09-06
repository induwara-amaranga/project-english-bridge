package lk.englisher.submission;

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
 * A learner's written answer to an essay or rubric card.
 *
 * <p>The card is referenced by slug triple rather than by a foreign key into
 * {@code cards}: an admin's whole-document save deletes and recreates every
 * content row, and a cascade from that must never take a learner's writing with
 * it.
 */
@Entity
@Table(name = "submissions")
public class SubmissionEntity {

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

    @Column(name = "card_slug", nullable = false)
    private String cardSlug;

    @Column(name = "body", nullable = false)
    private String body = "";

    /** Rubric ticks keyed "<sectionIndex>-<itemIndex>", as grading.ts has them. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "rubric_ticks", nullable = false)
    private JsonNode rubricTicks;

    /** {@code draft} while autosaving, {@code submitted} once handed in. */
    @Column(name = "status", nullable = false)
    private String status = "draft";

    @Column(name = "submitted_at")
    private Instant submittedAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected SubmissionEntity() {
    }

    public SubmissionEntity(UUID userId, String stageSlug, String lessonSlug, String cardSlug,
                            String body, JsonNode rubricTicks, String status) {
        this.userId = userId;
        this.stageSlug = stageSlug;
        this.lessonSlug = lessonSlug;
        this.cardSlug = cardSlug;
        this.body = body;
        this.rubricTicks = rubricTicks;
        this.status = status;
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

    public String getCardSlug() {
        return cardSlug;
    }

    public String getBody() {
        return body;
    }

    public void setBody(String body) {
        this.body = body;
    }

    public JsonNode getRubricTicks() {
        return rubricTicks;
    }

    public void setRubricTicks(JsonNode rubricTicks) {
        this.rubricTicks = rubricTicks;
    }

    public String getStatus() {
        return status;
    }

    public Instant getSubmittedAt() {
        return submittedAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    /** Submitting is one-way and stamps the time only on the first transition. */
    public void markStatus(String status) {
        this.status = status;
        if ("submitted".equals(status) && submittedAt == null) {
            this.submittedAt = Instant.now();
        }
        this.updatedAt = Instant.now();
    }
}
