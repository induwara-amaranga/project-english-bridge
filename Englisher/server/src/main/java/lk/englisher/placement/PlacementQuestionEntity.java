package lk.englisher.placement;

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
 * One placement-test question, ported out of PlacementTest.tsx's QUESTIONS
 * constant so the test is content rather than code.
 *
 * <p>Two shapes share the table: a 'choice' question fills options/correct, a
 * 'translate' question fills sinhala. The unused columns stay null and the DTO
 * omits them, matching the TypeScript union.
 */
@Entity
@Table(name = "placement_questions")
public class PlacementQuestionEntity {

    @Id
    @GeneratedValue
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "ord", nullable = false)
    private int ord;

    /** Which curriculum stage answering correctly demonstrates readiness for. */
    @Column(name = "stage", nullable = false)
    private int stage;

    @Column(name = "type", nullable = false)
    private String type;

    @Column(name = "prompt", nullable = false)
    private String prompt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "options")
    private JsonNode options;

    @Column(name = "correct")
    private String correct;

    @Column(name = "sinhala")
    private String sinhala;

    protected PlacementQuestionEntity() {
    }

    public int getOrd() {
        return ord;
    }

    public int getStage() {
        return stage;
    }

    public String getType() {
        return type;
    }

    public String getPrompt() {
        return prompt;
    }

    public JsonNode getOptions() {
        return options;
    }

    public String getCorrect() {
        return correct;
    }

    public String getSinhala() {
        return sinhala;
    }
}
