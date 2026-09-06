package lk.englisher.curriculum;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lk.englisher.common.ApiException;
import lk.englisher.curriculum.dto.CurriculumDtos.BilingualDto;
import lk.englisher.curriculum.dto.CurriculumDtos.CardDto;
import lk.englisher.curriculum.dto.CurriculumDtos.CurriculumDto;
import lk.englisher.curriculum.dto.CurriculumDtos.ExerciseDto;
import lk.englisher.curriculum.dto.CurriculumDtos.FeedbackDto;
import lk.englisher.curriculum.dto.CurriculumDtos.LessonDto;
import lk.englisher.curriculum.dto.CurriculumDtos.StageDto;
import lk.englisher.curriculum.dto.CurriculumDtos.ThemeDto;
import lk.englisher.curriculum.dto.CurriculumDtos.UnlockDto;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Reads and replaces the curriculum document.
 *
 * <p>{@code PUT} is a whole-document replace rather than per-node REST
 * resources, matching the Course Editor's existing draft/Save-draft UX exactly
 * — see SPRINGBOOT-MIGRATION.md section 3, first design call. That makes the
 * write a delete-all-then-insert inside one transaction, which is safe here
 * only because nothing outside the four content tables holds a foreign key into
 * them: progress and submissions reference content by slug.
 */
@Service
public class CurriculumService {

    private final StageRepository stages;
    private final LessonRepository lessons;
    private final ExerciseRepository exercises;
    private final CardRepository cards;
    private final CurriculumMetaRepository meta;
    private final CurriculumNormaliser normaliser;
    private final ObjectMapper json;

    public CurriculumService(StageRepository stages, LessonRepository lessons,
                             ExerciseRepository exercises, CardRepository cards,
                             CurriculumMetaRepository meta, CurriculumNormaliser normaliser,
                             ObjectMapper json) {
        this.stages = stages;
        this.lessons = lessons;
        this.exercises = exercises;
        this.cards = cards;
        this.meta = meta;
        this.normaliser = normaliser;
        this.json = json;
    }

    // ------------------------------------------------------------------
    // Read
    // ------------------------------------------------------------------

    /**
     * Assembles the whole document from four flat selects. At this size (a few
     * hundred rows) that is cheaper and far simpler than a four-level join
     * fetch, and it makes the ordering explicit rather than relying on the
     * database's row order.
     */
    @Transactional(readOnly = true)
    public CurriculumDto load() {
        List<StageEntity> stageRows = stages.findAllByOrderByOrdAsc();
        Map<String, List<LessonEntity>> lessonsByStage = lessons.findAllByOrderByOrdAsc().stream()
                .collect(Collectors.groupingBy(LessonEntity::getStageSlug));
        Map<UUID, List<ExerciseEntity>> exercisesByLesson = exercises.findAllByOrderByOrdAsc().stream()
                .collect(Collectors.groupingBy(ExerciseEntity::getLessonId));
        Map<UUID, List<CardEntity>> cardsByHolder = cards.findAllByOrderByOrdAsc().stream()
                .collect(Collectors.groupingBy(CardEntity::getHolderId));

        List<StageDto> stageDtos = stageRows.stream()
                .map(stage -> toStageDto(stage, lessonsByStage, exercisesByLesson, cardsByHolder))
                .collect(Collectors.toList());

        int version = meta.findById(CurriculumMetaEntity.SINGLETON_ID)
                .map(CurriculumMetaEntity::getVersion)
                .orElse(1);
        return new CurriculumDto(version, stageDtos);
    }

    private StageDto toStageDto(StageEntity stage,
                                Map<String, List<LessonEntity>> lessonsByStage,
                                Map<UUID, List<ExerciseEntity>> exercisesByLesson,
                                Map<UUID, List<CardEntity>> cardsByHolder) {
        List<LessonDto> lessonDtos = lessonsByStage.getOrDefault(stage.getSlug(), List.of()).stream()
                .sorted(Comparator.comparingInt(LessonEntity::getOrd))
                .map(lesson -> new LessonDto(
                        lesson.getSlug(),
                        lesson.getOrd(),
                        lesson.getKind(),
                        read(lesson.getTitle(), BilingualDto.class),
                        read(lesson.getExplanation(), BilingualDto.class),
                        exercisesByLesson.getOrDefault(lesson.getId(), List.of()).stream()
                                .sorted(Comparator.comparingInt(ExerciseEntity::getOrd))
                                .map(exercise -> new ExerciseDto(
                                        exercise.getSlug(),
                                        exercise.getType(),
                                        read(exercise.getPrompt(), BilingualDto.class),
                                        exercise.getPayload(),
                                        read(exercise.getFeedback(), FeedbackDto.class),
                                        cardDtos(cardsByHolder, exercise.getId())))
                                .collect(Collectors.toList()),
                        cardDtos(cardsByHolder, lesson.getId())))
                .collect(Collectors.toList());

        return new StageDto(
                stage.getSlug(),
                stage.getOrd(),
                read(stage.getTitle(), BilingualDto.class),
                read(stage.getTheme(), ThemeDto.class),
                read(stage.getUnlock(), UnlockDto.class),
                lessonDtos,
                // `placeholder?: boolean` — omitted, not false, when unset.
                stage.isPlaceholder() ? Boolean.TRUE : null);
    }

    private List<CardDto> cardDtos(Map<UUID, List<CardEntity>> cardsByHolder, UUID holderId) {
        return cardsByHolder.getOrDefault(holderId, List.of()).stream()
                .sorted(Comparator.comparingInt(CardEntity::getOrd))
                .map(card -> new CardDto(
                        card.getSlug(),
                        card.getCardType(),
                        card.getCol(),
                        card.getBorder(),
                        read(card.getBody(), BilingualDto.class),
                        read(card.getPrompt(), BilingualDto.class),
                        card.getPayload(),
                        read(card.getFeedback(), FeedbackDto.class)))
                .collect(Collectors.toList());
    }

    // ------------------------------------------------------------------
    // Write
    // ------------------------------------------------------------------

    /**
     * Validates, normalises and stores the whole document, returning what was
     * actually persisted — which may differ from what was sent, because
     * {@code repairUnlocks} and the card/explanation sync run server-side too.
     * The editor then shows the repaired document rather than its own draft,
     * which is the point of making these rules authoritative.
     */
    @Transactional
    public CurriculumDto replace(CurriculumDto incoming, UUID actorId) {
        validate(incoming);
        CurriculumDto document = normaliser.normalise(incoming);

        // Order matters: children first, because cards and exercises have no
        // cascade back up to stages.
        cards.deleteAllInBatch();
        exercises.deleteAllInBatch();
        lessons.deleteAllInBatch();
        stages.deleteAllInBatch();
        // The four deletes above are queued as JPQL bulk operations; flush them
        // before re-inserting so a re-used slug does not trip its unique index.
        stages.flush();

        int stageOrd = 1;
        for (StageDto stage : document.stages()) {
            stages.save(new StageEntity(
                    stage.id(),
                    stage.order() > 0 ? stage.order() : stageOrd,
                    write(stage.title()),
                    write(stage.theme()),
                    write(stage.unlock()),
                    Boolean.TRUE.equals(stage.placeholder())));
            stageOrd++;

            int lessonOrd = 1;
            for (LessonDto lesson : orEmpty(stage.lessons())) {
                LessonEntity lessonRow = lessons.save(new LessonEntity(
                        stage.id(),
                        lesson.id(),
                        lesson.order() > 0 ? lesson.order() : lessonOrd,
                        lesson.kind() == null ? "teach" : lesson.kind(),
                        write(lesson.title()),
                        write(lesson.explanation() == null ? BilingualDto.empty() : lesson.explanation())));
                lessonOrd++;
                saveCards(CardEntity.HolderType.LESSON, lessonRow.getId(), lesson.cards());

                int exerciseOrd = 1;
                for (ExerciseDto exercise : orEmpty(lesson.exercises())) {
                    ExerciseEntity exerciseRow = exercises.save(new ExerciseEntity(
                            lessonRow.getId(),
                            exercise.id(),
                            exerciseOrd,
                            exercise.type(),
                            write(exercise.prompt() == null ? BilingualDto.empty() : exercise.prompt()),
                            exercise.payload() == null ? json.createObjectNode() : exercise.payload(),
                            write(exercise.feedback() == null ? FeedbackDto.empty() : exercise.feedback())));
                    exerciseOrd++;
                    saveCards(CardEntity.HolderType.EXERCISE, exerciseRow.getId(), exercise.cards());
                }
            }
        }

        CurriculumMetaEntity metaRow = meta.findById(CurriculumMetaEntity.SINGLETON_ID)
                .orElseGet(() -> new CurriculumMetaEntity(document.version(), actorId));
        metaRow.update(document.version(), actorId);
        meta.save(metaRow);

        return document;
    }

    private void saveCards(CardEntity.HolderType holderType, UUID holderId, List<CardDto> cardDtos) {
        int ord = 1;
        for (CardDto card : orEmpty(cardDtos)) {
            cards.save(new CardEntity(
                    holderType,
                    holderId,
                    card.id(),
                    ord++,
                    card.type(),
                    card.column() == null ? "full" : card.column(),
                    card.border(),
                    card.isText() ? write(card.body() == null ? BilingualDto.empty() : card.body()) : null,
                    card.isText() ? null : write(card.prompt() == null ? BilingualDto.empty() : card.prompt()),
                    card.isText() ? null : (card.payload() == null ? json.createObjectNode() : card.payload()),
                    card.isText() ? null : write(card.feedback() == null ? FeedbackDto.empty() : card.feedback())));
        }
    }

    // ------------------------------------------------------------------
    // Validation
    // ------------------------------------------------------------------

    /**
     * The structural rules the editor enforces client-side, enforced here too.
     *
     * <p>Duplicate ids are rejected rather than silently de-duplicated: lesson
     * slugs are what {@code Progress.completedLessonIds} stores and card slugs
     * are what a {@code Submission} points at, so a collision would quietly
     * attach a learner's work to the wrong node.
     */
    void validate(CurriculumDto document) {
        if (document == null || document.stages() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "curriculum.missing", "A curriculum with a stages array is required.");
        }
        Set<String> stageIds = new HashSet<>();
        Set<String> exerciseIds = new HashSet<>();
        for (StageDto stage : document.stages()) {
            requireSlug(stage.id(), "stage");
            if (!stageIds.add(stage.id())) {
                throw duplicate("stage", stage.id());
            }
            Set<String> lessonIds = new HashSet<>();
            for (LessonDto lesson : orEmpty(stage.lessons())) {
                requireSlug(lesson.id(), "lesson");
                if (!lessonIds.add(lesson.id())) {
                    throw duplicate("lesson", stage.id() + "/" + lesson.id());
                }
                if (lesson.kind() != null && !lesson.kind().equals("teach") && !lesson.kind().equals("practice")) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "curriculum.badLessonKind",
                            "Lesson " + lesson.id() + " has kind '" + lesson.kind() + "'; expected teach or practice.");
                }
                validateCards(lesson.cards(), "lesson " + lesson.id());
                for (ExerciseDto exercise : orEmpty(lesson.exercises())) {
                    requireSlug(exercise.id(), "exercise");
                    // Exercise ids are unique across the whole document, not just
                    // within a lesson — the editor's uniqueId() call already
                    // assumes that, and exercise-scoped card ids inherit it.
                    if (!exerciseIds.add(exercise.id())) {
                        throw duplicate("exercise", exercise.id());
                    }
                    if (!CurriculumNormaliser.isKnownCardType(exercise.type()) || "text".equals(exercise.type())) {
                        throw new ApiException(HttpStatus.BAD_REQUEST, "curriculum.badExerciseType",
                                "Exercise " + exercise.id() + " has unknown type '" + exercise.type() + "'.");
                    }
                    validateCards(exercise.cards(), "exercise " + exercise.id());
                }
            }
        }
    }

    private void validateCards(List<CardDto> cardDtos, String where) {
        Set<String> ids = new HashSet<>();
        for (CardDto card : orEmpty(cardDtos)) {
            requireSlug(card.id(), "card");
            if (!ids.add(card.id())) {
                throw duplicate("card", where + "/" + card.id());
            }
            if (!CurriculumNormaliser.isKnownCardType(card.type())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "curriculum.badCardType",
                        "Card " + card.id() + " in " + where + " has unknown type '" + card.type() + "'.");
            }
            if (card.column() != null && !List.of("left", "right", "full").contains(card.column())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "curriculum.badColumn",
                        "Card " + card.id() + " has column '" + card.column() + "'; expected left, right or full.");
            }
        }
    }

    private static void requireSlug(String id, String what) {
        if (id == null || id.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "curriculum.missingId",
                    "Every " + what + " needs a non-empty id.");
        }
    }

    private static ApiException duplicate(String what, String id) {
        return new ApiException(HttpStatus.CONFLICT, "curriculum.duplicateId",
                "Duplicate " + what + " id '" + id + "'. Ids are stable slugs and must be unique.");
    }

    // ------------------------------------------------------------------
    // JSON helpers
    // ------------------------------------------------------------------

    private <T> T read(JsonNode node, Class<T> type) {
        if (CurriculumNormaliser.isBlank(node)) {
            return null;
        }
        return json.convertValue(node, type);
    }

    private JsonNode write(Object value) {
        return json.valueToTree(value);
    }

    private static <T> List<T> orEmpty(List<T> list) {
        return list == null ? new ArrayList<>() : list;
    }
}
