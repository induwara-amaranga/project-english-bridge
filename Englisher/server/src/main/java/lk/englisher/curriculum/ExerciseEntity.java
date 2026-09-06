package lk.englisher.curriculum;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.UUID;

/**
 * An exercise within a lesson.
 *
 * <p>Its {@code type}, {@code prompt}, {@code payload} and {@code feedback} are
 * legacy fields derived from its primary non-text card by
 * {@code syncExerciseFromCards} — the card list is the authored truth. They are
 * persisted so the document round-trips unchanged and so the exercise player,
 * which still reads them, keeps working.
 */
@Entity
@Table(name = "exercises")
public class ExerciseEntity {

    @Id
    @GeneratedValue
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "lesson_id", nullable = false)
    private UUID lessonId;

    @Column(name = "slug", nullable = false)
    private String slug;

    @Column(name = "ord", nullable = false)
    private int ord;

    @Column(name = "type", nullable = false)
    private String type;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "prompt", nullable = false)
    private JsonNode prompt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload", nullable = false)
    private JsonNode payload;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "feedback", nullable = false)
    private JsonNode feedback;

    protected ExerciseEntity() {
    }

    public ExerciseEntity(UUID lessonId, String slug, int ord, String type,
                          JsonNode prompt, JsonNode payload, JsonNode feedback) {
        this.lessonId = lessonId;
        this.slug = slug;
        this.ord = ord;
        this.type = type;
        this.prompt = prompt;
        this.payload = payload;
        this.feedback = feedback;
    }

    public UUID getId() {
        return id;
    }

    public UUID getLessonId() {
        return lessonId;
    }

    public String getSlug() {
        return slug;
    }

    public int getOrd() {
        return ord;
    }

    public String getType() {
        return type;
    }

    public JsonNode getPrompt() {
        return prompt;
    }

    public JsonNode getPayload() {
        return payload;
    }

    public JsonNode getFeedback() {
        return feedback;
    }
}
