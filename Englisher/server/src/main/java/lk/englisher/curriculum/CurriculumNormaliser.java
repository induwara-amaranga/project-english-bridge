package lk.englisher.curriculum;

import com.fasterxml.jackson.databind.JsonNode;
import lk.englisher.curriculum.dto.CurriculumDtos.BilingualDto;
import lk.englisher.curriculum.dto.CurriculumDtos.CardDto;
import lk.englisher.curriculum.dto.CurriculumDtos.CurriculumDto;
import lk.englisher.curriculum.dto.CurriculumDtos.ExerciseDto;
import lk.englisher.curriculum.dto.CurriculumDtos.FeedbackDto;
import lk.englisher.curriculum.dto.CurriculumDtos.LessonDto;
import lk.englisher.curriculum.dto.CurriculumDtos.StageDto;
import lk.englisher.curriculum.dto.CurriculumDtos.UnlockDto;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * The content invariants, ported line-for-line from
 * {@code app/src/domain/curriculum.ts} — {@code repairUnlocks},
 * {@code ensureCards}, {@code syncExerciseFromCards},
 * {@code syncLessonFromCards} and {@code normaliseCurriculum}.
 *
 * <p>These were already correct and already unit-tested on the frontend
 * ({@code curriculum.test.ts}), so they are translated rather than re-derived,
 * and the Vitest cases come over as JUnit in {@code CurriculumNormaliserTest}
 * (SPRINGBOOT-MIGRATION.md section 7, rule 3). The frontend keeps its copy as
 * the client-side fast path; this one is what makes the rules authoritative.
 *
 * <p>Everything here is pure and works on DTOs, deliberately: it has to run
 * both when seeding and when validating an admin's {@code PUT}, neither of
 * which should need entities or a session.
 */
@Component
public class CurriculumNormaliser {

    /**
     * {@code normaliseCurriculum} — idempotent, as its Vitest test asserts.
     * Order matters: unlocks are repaired first so a stage's reference is valid
     * before anything else reads it.
     */
    public CurriculumDto normalise(CurriculumDto input) {
        List<StageDto> repaired = repairUnlocks(input.stages());
        List<StageDto> stages = repaired.stream()
                .map(stage -> new StageDto(
                        stage.id(),
                        stage.order(),
                        stage.title(),
                        stage.theme(),
                        stage.unlock(),
                        stage.lessons() == null ? List.of()
                                : stage.lessons().stream().map(this::normaliseLesson).collect(Collectors.toList()),
                        stage.placeholder()))
                .collect(Collectors.toList());
        return new CurriculumDto(input.version(), stages);
    }

    /**
     * {@code repairUnlocks} — an {@code afterStage} unlock must point at a stage
     * that comes strictly earlier in the list. Anything else (a forward
     * reference, a self-reference, a dangling id) is rewritten to the previous
     * stage, or to {@code always} for the first one.
     */
    public List<StageDto> repairUnlocks(List<StageDto> stages) {
        List<StageDto> out = new ArrayList<>(stages == null ? List.of() : stages);
        for (int i = 0; i < out.size(); i++) {
            StageDto stage = out.get(i);
            UnlockDto unlock = stage.unlock();
            if (unlock == null || !unlock.isAfterStage()) {
                continue;
            }
            int refIdx = indexOfStage(out, unlock.stageId());
            if (refIdx >= 0 && refIdx < i) {
                continue;
            }
            UnlockDto fixed = i == 0 ? UnlockDto.always() : UnlockDto.afterStage(out.get(i - 1).id());
            out.set(i, withUnlock(stage, fixed));
        }
        return out;
    }

    /**
     * {@code ensureCards} then {@code syncLessonFromCards}, in that order — the
     * first materialises cards for legacy content that only had an
     * {@code explanation}, the second derives {@code explanation} back from the
     * text cards. Running them in this order is what makes the pair idempotent.
     */
    private LessonDto normaliseLesson(LessonDto lesson) {
        List<CardDto> lessonCards = ensureLessonCards(lesson);
        List<ExerciseDto> exercises = (lesson.exercises() == null ? List.<ExerciseDto>of() : lesson.exercises())
                .stream()
                .map(this::syncExerciseFromCards)
                .collect(Collectors.toList());
        return new LessonDto(
                lesson.id(),
                lesson.order(),
                lesson.kind(),
                lesson.title(),
                explanationFromCards(lesson, lessonCards),
                exercises,
                lessonCards);
    }

    /**
     * {@code ensureCards}, lesson half: a lesson with no cards but a non-empty
     * English explanation gets one text card carrying it, keyed
     * {@code <lessonId>-c1}.
     */
    private List<CardDto> ensureLessonCards(LessonDto lesson) {
        List<CardDto> cards = lesson.cards() == null ? new ArrayList<>() : new ArrayList<>(lesson.cards());
        BilingualDto explanation = lesson.explanation();
        boolean hasExplanation = explanation != null && explanation.en() != null && !explanation.en().isEmpty();
        if (cards.isEmpty() && hasExplanation) {
            cards.add(new CardDto(
                    lesson.id() + "-c1",
                    "text",
                    "full",
                    null,
                    new BilingualDto(explanation.en(), explanation.si() == null ? "" : explanation.si()),
                    null,
                    null,
                    null));
        }
        return cards;
    }

    /**
     * {@code ensureCards}, exercise half, followed by
     * {@code syncExerciseFromCards}: an exercise with no cards gets one built
     * from its legacy fields, and then those legacy fields are re-derived from
     * the first non-text card, which is the authored truth.
     */
    private ExerciseDto syncExerciseFromCards(ExerciseDto exercise) {
        List<CardDto> cards = exercise.cards() == null ? new ArrayList<>() : new ArrayList<>(exercise.cards());
        String type = exercise.type() == null ? "mcq" : exercise.type();
        if (cards.isEmpty()) {
            cards.add(new CardDto(
                    exercise.id() + "-c1",
                    type,
                    "full",
                    null,
                    null,
                    exercise.prompt() == null ? BilingualDto.empty() : exercise.prompt(),
                    exercise.payload(),
                    exercise.feedback() == null ? FeedbackDto.empty() : exercise.feedback()));
        }
        CardDto primary = cards.stream().filter(card -> !card.isText()).findFirst().orElse(null);
        if (primary == null) {
            return new ExerciseDto(exercise.id(), type, exercise.prompt(), exercise.payload(),
                    exercise.feedback(), cards);
        }
        return new ExerciseDto(
                exercise.id(),
                primary.type(),
                primary.prompt(),
                primary.payload(),
                primary.feedback(),
                cards);
    }

    /**
     * {@code syncLessonFromCards}: the English explanation is every text card's
     * body joined by a blank line, empties dropped. The Sinhala side is left
     * alone, exactly as the TypeScript leaves it — it only ever assigns
     * {@code explanation.en}.
     */
    private BilingualDto explanationFromCards(LessonDto lesson, List<CardDto> cards) {
        String joined = cards.stream()
                .filter(CardDto::isText)
                .map(card -> card.body() == null || card.body().en() == null ? "" : card.body().en())
                .filter(text -> !text.isEmpty())
                .collect(Collectors.joining("\n\n"));
        BilingualDto existing = lesson.explanation() == null ? BilingualDto.empty() : lesson.explanation();
        return new BilingualDto(joined, existing.si() == null ? "" : existing.si());
    }

    private static int indexOfStage(List<StageDto> stages, String id) {
        for (int i = 0; i < stages.size(); i++) {
            if (stages.get(i).id().equals(id)) {
                return i;
            }
        }
        return -1;
    }

    private static StageDto withUnlock(StageDto stage, UnlockDto unlock) {
        return new StageDto(stage.id(), stage.order(), stage.title(), stage.theme(),
                unlock, stage.lessons(), stage.placeholder());
    }

    /** Exposed for the payload validator — the eight interactive types plus text. */
    public static boolean isKnownCardType(String type) {
        return switch (type == null ? "" : type) {
            case "text", "mcq", "gap_fill", "drag_order", "match",
                 "free_text", "multi_select", "essay", "rubric" -> true;
            default -> false;
        };
    }

    /** True when a payload node is absent or JSON null — treated as an empty object. */
    public static boolean isBlank(JsonNode node) {
        return node == null || node.isNull() || node.isMissingNode();
    }
}
