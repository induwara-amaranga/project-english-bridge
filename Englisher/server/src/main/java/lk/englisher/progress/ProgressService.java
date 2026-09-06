package lk.englisher.progress;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lk.englisher.common.ApiException;
import lk.englisher.curriculum.CurriculumService;
import lk.englisher.curriculum.dto.CurriculumDtos.CardDto;
import lk.englisher.curriculum.dto.CurriculumDtos.CurriculumDto;
import lk.englisher.curriculum.dto.CurriculumDtos.ExerciseDto;
import lk.englisher.curriculum.dto.CurriculumDtos.LessonDto;
import lk.englisher.curriculum.dto.CurriculumDtos.StageDto;
import lk.englisher.progress.ProgressDtos.CompleteLessonRequest;
import lk.englisher.progress.ProgressDtos.CompleteLessonResponse;
import lk.englisher.progress.ProgressDtos.GradedCard;
import lk.englisher.progress.ProgressDtos.ProgressDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Reads and advances learner progress.
 *
 * <p>Completion is the security-relevant endpoint: the client sends the answers
 * it collected, the server re-grades them with {@link GradingService}, and only
 * a pass writes XP. That is why {@code markLessonComplete} could not simply be
 * ported as a "persist what the client computed" call — doing so would leave XP
 * forgeable from devtools.
 */
@Service
public class ProgressService {

    /** Matches PROGRESS_DEFAULT's award in domain/progress.ts. */
    private static final int XP_PER_LESSON = 10;

    private final ProgressRepository repository;
    private final CurriculumService curriculum;
    private final GradingService grading;
    private final ObjectMapper json;

    public ProgressService(ProgressRepository repository, CurriculumService curriculum,
                           GradingService grading, ObjectMapper json) {
        this.repository = repository;
        this.curriculum = curriculum;
        this.grading = grading;
        this.json = json;
    }

    /**
     * A new learner starts at the first stage with nothing completed.
     *
     * <p>Deliberately not seeded from {@code PROGRESS_DEFAULT}'s 240 XP and
     * 7-day streak: those exist so the prototype's screenshots look populated,
     * and handing a real account a fabricated streak would make every number on
     * the parent dashboard a lie.
     */
    @Transactional
    public ProgressEntity createInitial(UUID userId) {
        String firstStage = curriculum.load().stages().stream()
                .findFirst()
                .map(StageDto::id)
                .orElse("tenses");
        return repository.save(new ProgressEntity(
                userId, 0, 0, json.createObjectNode(), firstStage, 0));
    }

    @Transactional
    public ProgressEntity require(UUID userId) {
        return repository.findById(userId).orElseGet(() -> createInitial(userId));
    }

    @Transactional(readOnly = true)
    public Optional<ProgressEntity> find(UUID userId) {
        return repository.findById(userId);
    }

    /** The {@code Progress} shape from domain/progress.ts, field for field. */
    @Transactional
    public ProgressDto load(UUID userId) {
        return toDto(require(userId));
    }

    public ProgressDto toDto(ProgressEntity entity) {
        return new ProgressDto(
                entity.getXp(),
                entity.getStreakDays(),
                entity.getLastActive().toString(),
                entity.getCompletedLessonIds(),
                entity.getCurrentStageSlug(),
                entity.getCurrentStagePct());
    }

    // ------------------------------------------------------------------
    // Completion
    // ------------------------------------------------------------------

    /**
     * Grades a lesson's interactive cards and, if they all pass, marks it
     * complete.
     *
     * <p>Every interactive card in the lesson's exercises must be both answered
     * and correct. That is stricter than the client's per-card flow, which lets
     * a learner retry until each card passes — the net effect is the same, since
     * the client only calls this once everything is green, but the server does
     * not have to trust that.
     */
    @Transactional
    public CompleteLessonResponse completeLesson(UUID userId, String lessonId, CompleteLessonRequest request) {
        CurriculumDto document = curriculum.load();
        Located located = locate(document, lessonId, request == null ? null : request.stageId());

        JsonNode answers = request == null || request.answers() == null
                ? json.createObjectNode()
                : request.answers();

        List<GradedCard> graded = new ArrayList<>();
        boolean allPassed = true;
        for (ExerciseDto exercise : orEmpty(located.lesson().exercises())) {
            for (CardDto card : orEmpty(exercise.cards())) {
                if (!grading.isInteractive(card)) {
                    continue;
                }
                JsonNode answer = answers.path(card.id());
                boolean answered = grading.isAnswered(card, answer.isMissingNode() ? null : answer);
                boolean correct = answered && grading.gradeCard(card, answer.isMissingNode() ? null : answer);
                graded.add(new GradedCard(card.id(), card.type(), answered, correct));
                if (!correct) {
                    allPassed = false;
                }
            }
        }

        ProgressEntity progress = require(userId);
        boolean alreadyComplete = isLessonComplete(progress, located.stage().id(), lessonId);
        if (allPassed && !alreadyComplete) {
            award(progress, located.stage().id(), lessonId);
        }
        if (allPassed) {
            progress.setCurrentStagePct(percentThrough(located.stage(), progress));
        }
        progress.touch();
        repository.save(progress);

        return new CompleteLessonResponse(allPassed, allPassed && !alreadyComplete ? XP_PER_LESSON : 0,
                graded, toDto(progress));
    }

    /**
     * {@code markLessonComplete} from domain/progress.ts, plus the streak the
     * prototype never actually computed — it only ever stamped
     * {@code lastActiveISO}. A day's gap continues the streak, a longer gap
     * restarts it, and a second lesson on the same day leaves it alone.
     */
    private void award(ProgressEntity progress, String stageId, String lessonId) {
        ObjectNode completed = progress.getCompletedLessonIds() instanceof ObjectNode node
                ? node.deepCopy()
                : json.createObjectNode();
        ArrayNode list = completed.withArray(stageId);
        list.add(lessonId);
        completed.set(stageId, list);

        progress.setCompletedLessonIds(completed);
        progress.setXp(progress.getXp() + XP_PER_LESSON);
        progress.setStreakDays(nextStreak(progress.getStreakDays(), progress.getLastActive(), Instant.now()));
        progress.setLastActive(Instant.now());
    }

    static int nextStreak(int current, Instant lastActive, Instant now) {
        long days = Duration.between(lastActive.truncatedTo(ChronoUnit.DAYS),
                now.truncatedTo(ChronoUnit.DAYS)).toDays();
        if (days == 0) {
            // Already counted today; a second lesson does not extend a streak.
            return Math.max(current, 1);
        }
        if (days == 1) {
            return current + 1;
        }
        return 1;
    }

    private boolean isLessonComplete(ProgressEntity progress, String stageId, String lessonId) {
        JsonNode list = progress.getCompletedLessonIds().path(stageId);
        if (!list.isArray()) {
            return false;
        }
        for (JsonNode node : list) {
            if (lessonId.equals(node.asText())) {
                return true;
            }
        }
        return false;
    }

    /** Percent of the stage's lessons completed, as the roadmap ring shows it. */
    private int percentThrough(StageDto stage, ProgressEntity progress) {
        List<LessonDto> lessons = orEmpty(stage.lessons());
        if (lessons.isEmpty()) {
            return 0;
        }
        long done = lessons.stream()
                .filter(lesson -> isLessonComplete(progress, stage.id(), lesson.id()))
                .count();
        return (int) Math.round((done * 100.0) / lessons.size());
    }

    // ------------------------------------------------------------------
    // Placement
    // ------------------------------------------------------------------

    /** {@code setCurrentStage} — the placement test's result. */
    @Transactional
    public ProgressDto setCurrentStage(UUID userId, String stageId) {
        boolean known = curriculum.load().stages().stream().anyMatch(stage -> stage.id().equals(stageId));
        if (!known) {
            throw ApiException.badRequest("progress.unknownStage",
                    "No stage with id '" + stageId + "'.");
        }
        ProgressEntity progress = require(userId);
        progress.setCurrentStageSlug(stageId);
        progress.setCurrentStagePct(0);
        progress.setLastActive(Instant.now());
        progress.touch();
        return toDto(repository.save(progress));
    }

    // ------------------------------------------------------------------
    // Lookup
    // ------------------------------------------------------------------

    private record Located(StageDto stage, LessonDto lesson) {
    }

    /**
     * Finds a lesson by id, optionally narrowed by stage.
     *
     * <p>The stage hint matters: lesson ids are only unique within a stage (the
     * editor's {@code uniqueId} call scopes them to the stage's lesson list), so
     * without it two stages could each own a lesson called {@code intro} and the
     * first match would win.
     */
    private Located locate(CurriculumDto document, String lessonId, String stageIdHint) {
        for (StageDto stage : document.stages()) {
            if (stageIdHint != null && !stageIdHint.isBlank() && !stage.id().equals(stageIdHint)) {
                continue;
            }
            for (LessonDto lesson : orEmpty(stage.lessons())) {
                if (lesson.id().equals(lessonId)) {
                    return new Located(stage, lesson);
                }
            }
        }
        throw ApiException.notFound("progress.unknownLesson",
                "No lesson '" + lessonId + "'"
                        + (stageIdHint == null || stageIdHint.isBlank() ? "." : " in stage '" + stageIdHint + "'."));
    }

    private static <T> List<T> orEmpty(List<T> list) {
        return list == null ? List.of() : list;
    }
}
