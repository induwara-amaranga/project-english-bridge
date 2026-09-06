package lk.englisher.curriculum;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * A curriculum stage. The primary key is the slug the frontend knows
 * ({@code tenses}, {@code complex-sentences}), not a surrogate uuid — stage ids
 * are stable and never reused, and every other table that refers to a stage
 * refers to it by that string.
 */
@Entity
@Table(name = "stages")
public class StageEntity {

    @Id
    @Column(name = "slug", nullable = false)
    private String slug;

    /** {@code Stage.order}. Renamed because ORDER is reserved in SQL. */
    @Column(name = "ord", nullable = false)
    private int ord;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "title", nullable = false)
    private JsonNode title;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "theme", nullable = false)
    private JsonNode theme;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "unlock", nullable = false)
    private JsonNode unlock;

    @Column(name = "placeholder", nullable = false)
    private boolean placeholder;

    protected StageEntity() {
    }

    public StageEntity(String slug, int ord, JsonNode title, JsonNode theme, JsonNode unlock, boolean placeholder) {
        this.slug = slug;
        this.ord = ord;
        this.title = title;
        this.theme = theme;
        this.unlock = unlock;
        this.placeholder = placeholder;
    }

    public String getSlug() {
        return slug;
    }

    public int getOrd() {
        return ord;
    }

    public JsonNode getTitle() {
        return title;
    }

    public JsonNode getTheme() {
        return theme;
    }

    public JsonNode getUnlock() {
        return unlock;
    }

    public boolean isPlaceholder() {
        return placeholder;
    }
}
