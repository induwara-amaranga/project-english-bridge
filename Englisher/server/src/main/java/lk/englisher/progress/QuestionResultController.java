package lk.englisher.progress;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lk.englisher.auth.CurrentUser;
import lk.englisher.common.ApiException;
import lk.englisher.curriculum.CurriculumService;
import lk.englisher.curriculum.dto.CurriculumDtos.CardDto;
import lk.englisher.curriculum.dto.CurriculumDtos.ExerciseDto;
import lk.englisher.curriculum.dto.CurriculumDtos.LessonDto;
import lk.englisher.curriculum.dto.CurriculumDtos.StageDto;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Per-question results — the detail {@code /api/progress} does not carry.
 *
 * <p>{@code POST /api/progress/lessons/{id}/complete} decides whether a lesson
 * passed and awards the XP for it; it deliberately keeps nothing about the
 * individual questions. The review screens need exactly that, so the exercise
 * player sends it here once the lesson ends.
 *
 * <p>Correctness is re-graded from the submitted answers, the same way
 * {@code completeLesson} does it, rather than stored as the client reported it.
 * These rows award nothing, so a forged one would only flatter the learner's
 * own review screen — but there is a working grader on this side of the wire
 * and no reason to prefer the client's word to it.
 */
@RestController
@RequestMapping("/api/progress/results")
@PreAuthorize("hasRole('STUDENT')")
public class QuestionResultController {

    private final QuestionResultRepository repository;
    private final CurriculumService curriculum;
    private final GradingService grading;
    private final ObjectMapper json;

    public QuestionResultController(QuestionResultRepository repository, CurriculumService curriculum,
                                    GradingService grading, ObjectMapper json) {
        this.repository = repository;
        this.curriculum = curriculum;
        this.grading = grading;
        this.json = json;
    }

    /** One attempted question. {@code correct} is the server's verdict, so it is absent from the request. */
    public record OutcomeDto(String exerciseId, int index, boolean correct, boolean skipped, JsonNode answers) {
    }

    public record OutcomeRequest(@NotBlank String exerciseId, int index, boolean skipped, JsonNode answers) {
    }

    public record LessonResultDto(String stageId, String lessonId, String finishedISO, List<OutcomeDto> outcomes) {
    }

    public record SaveResultsRequest(@NotBlank String stageId, List<OutcomeRequest> outcomes) {
    }

    /** Every question this learner has attempted, grouped into the lessons they belong to. */
    @GetMapping
    public List<LessonResultDto> mine() {
        return group(repository.findAllByUserIdOrderByAnsweredAtAsc(CurrentUser.requireId()));
    }

    /**
     * Replaces this lesson's results with the attempt just finished.
     *
     * <p>Delete-then-insert rather than upsert-per-row: a lesson whose exercises
     * an admin has since removed would otherwise keep rows for questions that no
     * longer exist, and the review screen would show a lesson the learner cannot
     * recognise.
     */
    @PutMapping("/{lessonId}")
    @Transactional
    public LessonResultDto save(@PathVariable String lessonId,
                                @Valid @RequestBody SaveResultsRequest request) {
        UUID userId = CurrentUser.requireId();
        Located located = locate(request.stageId(), lessonId);
        Instant now = Instant.now();

        repository.deleteByUserIdAndStageSlugAndLessonSlug(userId, located.stage.id(), located.lesson.id());
        // Hibernate is free to order the inserts before that delete, and the
        // unique key would then reject the second attempt at a lesson. Flushing
        // makes the delete land first.
        repository.flush();

        List<QuestionResultEntity> rows = new ArrayList<>();
        for (OutcomeRequest outcome : request.outcomes() == null ? List.<OutcomeRequest>of() : request.outcomes()) {
            ExerciseDto exercise = findExercise(located.lesson, outcome.exerciseId(), outcome.index());
            if (exercise == null) {
                // A question the curriculum no longer has: nothing on the review
                // screen could render it, so there is no point storing it.
                continue;
            }
            JsonNode answers = outcome.answers() == null ? json.createObjectNode() : outcome.answers();
            boolean correct = !outcome.skipped() && isExerciseCorrect(exercise, answers);
            rows.add(new QuestionResultEntity(userId, located.stage.id(), located.lesson.id(), exercise.id(),
                    outcome.index(), correct, outcome.skipped(), answers, now));
        }
        repository.saveAll(rows);

        List<LessonResultDto> saved = group(rows);
        return saved.isEmpty()
                ? new LessonResultDto(located.stage.id(), located.lesson.id(), now.toString(), List.of())
                : saved.get(0);
    }

    /**
     * A question counts as right only when every interactive card in it was
     * answered and graded right — the same rule the exercise player applies
     * client-side, and the same one {@code completeLesson} applies per card.
     *
     * <p>A question made only of text cards has nothing to get wrong, so it
     * falls through the loop and counts as right.
     */
    private boolean isExerciseCorrect(ExerciseDto exercise, JsonNode answers) {
        for (CardDto card : exercise.cards() == null ? List.<CardDto>of() : exercise.cards()) {
            if (!grading.isInteractive(card)) {
                continue;
            }
            JsonNode answer = answers.path(card.id());
            JsonNode value = answer.isMissingNode() ? null : answer;
            if (!grading.isAnswered(card, value) || !grading.gradeCard(card, value)) {
                return false;
            }
        }
        return true;
    }

    private List<LessonResultDto> group(List<QuestionResultEntity> rows) {
        Map<String, List<QuestionResultEntity>> byLesson = new LinkedHashMap<>();
        for (QuestionResultEntity row : rows) {
            byLesson.computeIfAbsent(row.getStageSlug() + "/" + row.getLessonSlug(), key -> new ArrayList<>()).add(row);
        }

        List<LessonResultDto> results = new ArrayList<>();
        for (List<QuestionResultEntity> lessonRows : byLesson.values()) {
            List<OutcomeDto> outcomes = lessonRows.stream()
                    .sorted((a, b) -> Integer.compare(a.getExerciseIndex(), b.getExerciseIndex()))
                    .map(row -> new OutcomeDto(row.getExerciseSlug(), row.getExerciseIndex(),
                            row.isCorrect(), row.isSkipped(), row.getAnswers()))
                    .toList();
            Instant finished = lessonRows.stream()
                    .map(QuestionResultEntity::getAnsweredAt)
                    .max(Instant::compareTo)
                    .orElse(Instant.now());
            QuestionResultEntity first = lessonRows.get(0);
            results.add(new LessonResultDto(first.getStageSlug(), first.getLessonSlug(), finished.toString(), outcomes));
        }
        return results;
    }

    /** Id first, position second — an admin can rename an exercise between the attempt and the save. */
    private ExerciseDto findExercise(LessonDto lesson, String exerciseId, int index) {
        List<ExerciseDto> exercises = lesson.exercises() == null ? List.of() : lesson.exercises();
        for (ExerciseDto exercise : exercises) {
            if (exercise.id().equals(exerciseId)) {
                return exercise;
            }
        }
        return index >= 0 && index < exercises.size() ? exercises.get(index) : null;
    }

    private record Located(StageDto stage, LessonDto lesson) {
    }

    private Located locate(String stageId, String lessonId) {
        for (StageDto stage : curriculum.load().stages()) {
            if (!stage.id().equals(stageId)) {
                continue;
            }
            for (LessonDto lesson : stage.lessons() == null ? List.<LessonDto>of() : stage.lessons()) {
                if (lesson.id().equals(lessonId)) {
                    return new Located(stage, lesson);
                }
            }
        }
        throw ApiException.notFound("results.unknownLesson",
                "No lesson '" + lessonId + "' in stage '" + stageId + "'.");
    }
}
