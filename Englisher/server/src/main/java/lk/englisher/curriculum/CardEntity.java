package lk.englisher.curriculum;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.UUID;

/**
 * A card, belonging either to a lesson or to an exercise — one table
 * discriminated by {@link HolderType}, rather than two nullable foreign keys.
 *
 * <p>A text card populates {@code body}; an exercise card populates
 * {@code prompt}, {@code payload} and {@code feedback}. The unused columns stay
 * null and the DTO omits them, which is what makes the round-trip match the
 * TypeScript union exactly.
 */
@Entity
@Table(name = "cards")
public class CardEntity {

    public enum HolderType {
        LESSON, EXERCISE
    }

    @Id
    @GeneratedValue
    @Column(name = "id", nullable = false)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(name = "holder_type", nullable = false)
    private HolderType holderType;

    @Column(name = "holder_id", nullable = false)
    private UUID holderId;

    @Column(name = "slug", nullable = false)
    private String slug;

    @Column(name = "ord", nullable = false)
    private int ord;

    @Column(name = "card_type", nullable = false)
    private String cardType;

    /** {@code Card.column}. Renamed because COLUMN is reserved in SQL. */
    @Column(name = "col", nullable = false)
    private String col;

    /**
     * Nullable on purpose: {@code border?: boolean} is optional in the
     * TypeScript, and absent means true for content authored before the field
     * existed. Null here serializes to an omitted key, not to {@code false}.
     */
    @Column(name = "border")
    private Boolean border;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "body")
    private JsonNode body;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "prompt")
    private JsonNode prompt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload")
    private JsonNode payload;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "feedback")
    private JsonNode feedback;

    protected CardEntity() {
    }

    public CardEntity(HolderType holderType, UUID holderId, String slug, int ord, String cardType,
                      String col, Boolean border, JsonNode body, JsonNode prompt,
                      JsonNode payload, JsonNode feedback) {
        this.holderType = holderType;
        this.holderId = holderId;
        this.slug = slug;
        this.ord = ord;
        this.cardType = cardType;
        this.col = col;
        this.border = border;
        this.body = body;
        this.prompt = prompt;
        this.payload = payload;
        this.feedback = feedback;
    }

    public UUID getId() {
        return id;
    }

    public HolderType getHolderType() {
        return holderType;
    }

    public UUID getHolderId() {
        return holderId;
    }

    public String getSlug() {
        return slug;
    }

    public int getOrd() {
        return ord;
    }

    public String getCardType() {
        return cardType;
    }

    public String getCol() {
        return col;
    }

    public Boolean getBorder() {
        return border;
    }

    public JsonNode getBody() {
        return body;
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
