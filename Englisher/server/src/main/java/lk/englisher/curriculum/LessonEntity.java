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
 * A lesson within a stage. Carries a surrogate uuid because its cards and
 * exercises need something narrow to point at; the identity the frontend uses
 * is still {@link #getSlug()}, unique within the stage.
 */
@Entity
@Table(name = "lessons")
public class LessonEntity {

    @Id
    @GeneratedValue
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "stage_slug", nullable = false)
    private String stageSlug;

    @Column(name = "slug", nullable = false)
    private String slug;

    @Column(name = "ord", nullable = false)
    private int ord;

    /** {@code 'teach' | 'practice'}. */
    @Column(name = "kind", nullable = false)
    private String kind;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "title", nullable = false)
    private JsonNode title;

    /**
     * Derived from the lesson's text cards by {@code syncLessonFromCards} —
     * never authored directly. Stored anyway so the document round-trips
     * byte-for-byte.
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "explanation", nullable = false)
    private JsonNode explanation;

    protected LessonEntity() {
    }

    public LessonEntity(String stageSlug, String slug, int ord, String kind, JsonNode title, JsonNode explanation) {
        this.stageSlug = stageSlug;
        this.slug = slug;
        this.ord = ord;
        this.kind = kind;
        this.title = title;
        this.explanation = explanation;
    }

    public UUID getId() {
        return id;
    }

    public String getStageSlug() {
        return stageSlug;
    }

    public String getSlug() {
        return slug;
    }

    public int getOrd() {
        return ord;
    }

    public String getKind() {
        return kind;
    }

    public JsonNode getTitle() {
        return title;
    }

    public JsonNode getExplanation() {
        return explanation;
    }
}
