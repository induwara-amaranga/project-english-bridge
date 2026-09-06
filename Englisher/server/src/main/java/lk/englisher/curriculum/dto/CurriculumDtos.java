package lk.englisher.curriculum.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

/**
 * The wire shapes, one record per interface in app/src/domain/types.ts.
 *
 * <p>These are deliberately dumb carriers: field names, nesting and optionality
 * match the TypeScript exactly, because the React app is not being changed and
 * its {@code JSON.parse} result must satisfy those interfaces as-is. In
 * particular {@code placeholder} and {@code border} are optional in the
 * TypeScript ({@code placeholder?: boolean}), so they are omitted rather than
 * serialized as null — hence {@link JsonInclude.Include#NON_NULL}.
 *
 * <p>{@code payload} is a raw {@link JsonNode}: it is a discriminated union of
 * eight shapes keyed on the card type, and the server has no reason to reify
 * it except when grading, where {@code GradingService} reads the fields it
 * needs. See SPRINGBOOT-MIGRATION.md section 2.
 */
public final class CurriculumDtos {

    private CurriculumDtos() {
    }

    /** {@code Bilingual} — every human-readable string in the content model. */
    public record BilingualDto(String en, String si) {
        public static BilingualDto empty() {
            return new BilingualDto("", "");
        }
    }

    /** {@code Stage.theme} — the roadmap's per-stage gradient. */
    public record ThemeDto(String from, String to) {
    }

    /**
     * {@code Unlock} — {@code {kind:'always'}} or
     * {@code {kind:'afterStage', stageId}}. Serialized with the same optional
     * {@code stageId} the union has.
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record UnlockDto(@NotBlank String kind, String stageId) {
        public static UnlockDto always() {
            return new UnlockDto("always", null);
        }

        public static UnlockDto afterStage(String stageId) {
            return new UnlockDto("afterStage", stageId);
        }

        /**
         * Convenience predicate, not a field. Without {@code @JsonIgnore}
         * Jackson treats the {@code isX()} accessor as a property and emits an
         * {@code "afterStage"} key the TypeScript union does not have.
         */
        @JsonIgnore
        public boolean isAfterStage() {
            return "afterStage".equals(kind);
        }
    }

    /** {@code Feedback} — shown after an answer is graded. */
    public record FeedbackDto(BilingualDto correct, BilingualDto incorrect) {
        public static FeedbackDto empty() {
            return new FeedbackDto(BilingualDto.empty(), BilingualDto.empty());
        }
    }

    /**
     * {@code Card} — the union of {@code TextCard} and {@code ExerciseCard}.
     *
     * <p>The TypeScript models these as two interfaces discriminated on
     * {@code type}; a text card has {@code body} and no
     * {@code prompt}/{@code payload}/{@code feedback}, and an exercise card the
     * reverse. One record with NON_NULL inclusion produces exactly that JSON in
     * both cases, and avoids a Jackson polymorphic hierarchy for what is really
     * one table row.
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record CardDto(
            @NotBlank String id,
            @NotBlank String type,
            @NotBlank String column,
            Boolean border,
            BilingualDto body,
            BilingualDto prompt,
            JsonNode payload,
            FeedbackDto feedback) {

        /** Derived, not serialized — see the note on {@code isAfterStage()}. */
        @JsonIgnore
        public boolean isText() {
            return "text".equals(type);
        }
    }

    /** {@code Exercise}. */
    public record ExerciseDto(
            @NotBlank String id,
            @NotBlank String type,
            BilingualDto prompt,
            JsonNode payload,
            FeedbackDto feedback,
            @Valid List<CardDto> cards) {
    }

    /** {@code Lesson}. */
    public record LessonDto(
            @NotBlank String id,
            int order,
            @NotBlank String kind,
            BilingualDto title,
            BilingualDto explanation,
            @Valid List<ExerciseDto> exercises,
            @Valid List<CardDto> cards) {
    }

    /** {@code Stage}. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record StageDto(
            @NotBlank String id,
            int order,
            BilingualDto title,
            ThemeDto theme,
            @NotNull UnlockDto unlock,
            @Valid List<LessonDto> lessons,
            Boolean placeholder) {
    }

    /** {@code Curriculum} — the whole document, as GET/PUT exchange it. */
    public record CurriculumDto(int version, @Valid List<StageDto> stages) {
    }
}
