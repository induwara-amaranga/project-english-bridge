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
import lk.englisher.progress.ProgressDtos.RetryQuestionRequest;
import lk.englisher.progress.ProgressDtos.RetryQuestionResponse;
import lk.englisher.progress.ProgressDtos.StageOutcome;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Reads and advances learner progress.
 *
 * <p>Completion is the security-relevant endpoint: the client sends the answers
 * it collected, the server re-grades them with {@link GradingService}, and only
 * server-computed numbers ever move XP, coins or a stage forward. That is why
 * {@code markLessonComplete} could not simply be ported as a "persist what the
 * client computed" call — doing so would leave the whole economy forgeable
 * from devtools.
 *
 * <p>A lesson completes the moment this endpoint is called for it — correctness
 * is no longer a gate on completion (it used to be: any wrong card meant the
 * lesson never recorded as done, matching nothing in the UI, which always shows
 * a score dial and "X of Y correct" whether or not that was 100%). Correctness
 * is instead what earns the "flawless" bonus and what the stage-advance gate
 * checks — see {@link #completeLesson} and {@link #evaluateStageCompletion}.
 */
@Service
public class ProgressService {

    // ------------------------------------------------------------------
    // Tunable constants — one place for every reward/cost in the economy.
    // ------------------------------------------------------------------

    private static final int BASE_XP_TEACH = 8;
    private static final int BASE_XP_PRACTICE = 14;
    /** Capped so a long streak nudges every lesson's XP without dominating it. */
    private static final int STREAK_XP_CAP = 10;
    /** Every question in the lesson correct — replaces the doc's +5 "first try" bonus. */
    private static final int LESSON_PERFECT_BONUS_XP = 10;
    private static final int LESSON_PERFECT_BONUS_COINS = 5;
    private static final int COINS_PER_LESSON = 3;
    private static final int COINS_PER_CORRECT_EXERCISE = 1;
    private static final int COINS_PER_STREAK_DAY = 2;
    /** Every question in the whole stage correct, at the moment the stage clears. */
    private static final int STAGE_PERFECT_BONUS_XP = 30;
    private static final int STAGE_PERFECT_BONUS_COINS = 15;
    /** A stage needs every lesson done *and* this much stage-wide accuracy to advance. */
    private static final int STAGE_ADVANCE_MIN_ACCURACY_PCT = 75;
    static final int STREAK_FREEZE_COST_COINS = 50;
    static final int RETRY_QUESTION_COST_COINS = 5;
    /** Restores a lost streak to what it was right before it broke. */
    static final int STREAK_REPAIR_COST_COINS = 50;
    /** A streak has to be at least this long before losing it is worth offering a repair for. */
    private static final int STREAK_REPAIR_MIN_STREAK = 2;

    /** streakDays -> {bonus xp, bonus coins}, a one-time bump the day the streak reaches it. */
    private static final Map<Integer, int[]> STREAK_MILESTONES = Map.of(
            7, new int[]{30, 15},
            30, new int[]{100, 40},
            100, new int[]{300, 100});

    private final ProgressRepository repository;
    private final QuestionResultRepository questionResults;
    private final CurriculumService curriculum;
    private final GradingService grading;
    private final ObjectMapper json;

    public ProgressService(ProgressRepository repository, QuestionResultRepository questionResults,
                           CurriculumService curriculum, GradingService grading, ObjectMapper json) {
        this.repository = repository;
        this.questionResults = questionResults;
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
        LevelInfo level = levelInfo(entity.getXp());
        Instant streakExpiresAt = entity.getStreakDays() > 0
                ? entity.getLastActive().truncatedTo(ChronoUnit.DAYS).plus(2, ChronoUnit.DAYS)
                : null;
        return new ProgressDto(
                entity.getXp(),
                entity.getStreakDays(),
                entity.getLastActive().toString(),
                entity.getCompletedLessonIds(),
                entity.getCurrentStageSlug(),
                entity.getCurrentStagePct(),
                entity.getCoins(),
                entity.getStreakFreezes(),
                level.level(),
                level.xpIntoLevel(),
                level.xpForNextLevel(),
                entity.getLastBrokenStreak(),
                entity.getStreakBrokenAt() == null ? null : entity.getStreakBrokenAt().toString(),
                streakExpiresAt == null ? null : streakExpiresAt.toString());
    }

    // ------------------------------------------------------------------
    // Completion
    // ------------------------------------------------------------------

    /**
     * Grades a lesson's interactive cards and marks it complete — the first
     * time this is called for a given lesson, regardless of score. Every
     * interactive card answered correctly earns the "flawless lesson" bonus;
     * it no longer decides whether the lesson counts at all.
     */
    @Transactional
    public CompleteLessonResponse completeLesson(UUID userId, String lessonId, CompleteLessonRequest request) {
        CurriculumDto document = curriculum.load();
        Located located = locate(document, lessonId, request == null ? null : request.stageId());

        JsonNode answers = request == null || request.answers() == null
                ? json.createObjectNode()
                : request.answers();

        List<GradedCard> graded = new ArrayList<>();
        boolean allCorrect = true;
        int correctExercises = 0;
        int totalExercises = 0;
        for (ExerciseDto exercise : orEmpty(located.lesson().exercises())) {
            boolean exerciseCorrect = true;
            for (CardDto card : orEmpty(exercise.cards())) {
                if (!grading.isInteractive(card)) {
                    continue;
                }
                JsonNode answer = answers.path(card.id());
                boolean answered = grading.isAnswered(card, answer.isMissingNode() ? null : answer);
                boolean correct = answered && grading.gradeCard(card, answer.isMissingNode() ? null : answer);
                graded.add(new GradedCard(card.id(), card.type(), answered, correct));
                if (!correct) {
                    allCorrect = false;
                    exerciseCorrect = false;
                }
            }
            totalExercises++;
            if (exerciseCorrect) {
                correctExercises++;
            }
        }

        ProgressEntity progress = require(userId);
        boolean alreadyComplete = isLessonComplete(progress, located.stage().id(), lessonId);
        int pctBefore = percentThrough(located.stage(), progress);

        AwardResult awardResult = AwardResult.NONE;
        if (!alreadyComplete) {
            awardResult = award(progress, located.stage().id(), lessonId, located.lesson().kind(),
                    allCorrect, correctExercises);
        }
        progress.setCurrentStagePct(percentThrough(located.stage(), progress));

        StageOutcome stageOutcome = null;
        if (pctBefore < 100 && progress.getCurrentStagePct() == 100
                && located.stage().id().equals(progress.getCurrentStageSlug())) {
            stageOutcome = evaluateStageCompletion(progress, document, located.stage(), lessonId,
                    correctExercises, totalExercises);
        }

        progress.touch();
        repository.save(progress);

        return new CompleteLessonResponse(allCorrect, awardResult.xp(), awardResult.coins(),
                awardResult.bonusXp(), awardResult.bonusCoins(), awardResult.streakMilestoneDays(),
                awardResult.streakMilestoneBonusXp(), awardResult.streakMilestoneBonusCoins(),
                graded, toDto(progress), stageOutcome);
    }

    /** What one lesson completion paid out — split so the client can show a breakdown. */
    private record AwardResult(int xp, int coins, int bonusXp, int bonusCoins,
                               int streakMilestoneDays, int streakMilestoneBonusXp, int streakMilestoneBonusCoins) {
        static final AwardResult NONE = new AwardResult(0, 0, 0, 0, 0, 0, 0);
    }

    /**
     * {@code markLessonComplete} from domain/progress.ts, extended with the
     * streak the prototype never actually computed, and now with coins and
     * bonuses on top. Guarded by the caller's {@code !alreadyComplete} check —
     * still the only anti-farming boundary: a retake never re-enters here.
     */
    private AwardResult award(ProgressEntity progress, String stageId, String lessonId, String lessonKind,
                              boolean allCorrect, int correctExercises) {
        ObjectNode completed = progress.getCompletedLessonIds() instanceof ObjectNode node
                ? node.deepCopy()
                : json.createObjectNode();
        ArrayNode list = completed.withArray(stageId);
        list.add(lessonId);
        completed.set(stageId, list);
        progress.setCompletedLessonIds(completed);

        int previousStreak = progress.getStreakDays();
        Instant now = Instant.now();
        int newStreak = applyStreak(progress, now);
        boolean streakGrew = newStreak > previousStreak;
        progress.setStreakDays(newStreak);
        progress.setLastActive(now);

        int xp = "practice".equals(lessonKind) ? BASE_XP_PRACTICE : BASE_XP_TEACH;
        xp += Math.min(newStreak, STREAK_XP_CAP);
        int coins = COINS_PER_LESSON + correctExercises * COINS_PER_CORRECT_EXERCISE;
        if (streakGrew) {
            coins += COINS_PER_STREAK_DAY;
        }

        int bonusXp = 0;
        int bonusCoins = 0;
        if (allCorrect) {
            bonusXp += LESSON_PERFECT_BONUS_XP;
            bonusCoins += LESSON_PERFECT_BONUS_COINS;
        }
        int streakMilestoneDays = 0;
        int streakMilestoneBonusXp = 0;
        int streakMilestoneBonusCoins = 0;
        int[] milestone = streakGrew ? STREAK_MILESTONES.get(newStreak) : null;
        if (milestone != null) {
            streakMilestoneDays = newStreak;
            streakMilestoneBonusXp = milestone[0];
            streakMilestoneBonusCoins = milestone[1];
        }

        progress.setXp(progress.getXp() + xp + bonusXp + streakMilestoneBonusXp);
        progress.setCoins(progress.getCoins() + coins + bonusCoins + streakMilestoneBonusCoins);
        return new AwardResult(xp, coins, bonusXp, bonusCoins,
                streakMilestoneDays, streakMilestoneBonusXp, streakMilestoneBonusCoins);
    }

    /**
     * The streak plus however many freezes are left after applying it.
     * {@code brokenStreakValue} is non-zero only the moment a gap outruns the
     * learner's freezes and resets a streak worth mourning — see
     * {@code STREAK_REPAIR_MIN_STREAK} — so the caller knows to record it as
     * repairable rather than silently dropping it.
     */
    record StreakResult(int streak, int streakFreezes, int brokenStreakValue) {
    }

    /**
     * Same-day/one-day/reset rule from {@link #nextStreak}, unchanged — except
     * a gap longer than a day is forgiven one unspent streak freeze per missed
     * day (bought with coins; see {@code buyStreakFreeze}) instead of
     * resetting outright — miss 1 day, spend 1 freeze; miss 5, spend 5. A pure
     * function of its inputs, like {@code nextStreak}, so the freeze branch is
     * unit-testable without a {@link ProgressEntity}.
     */
    static StreakResult applyStreak(int currentStreak, int streakFreezes, Instant lastActive, Instant now) {
        long days = Duration.between(lastActive.truncatedTo(ChronoUnit.DAYS),
                now.truncatedTo(ChronoUnit.DAYS)).toDays();
        if (days > 1) {
            long missedDays = days - 1;
            if (streakFreezes >= missedDays) {
                return new StreakResult(currentStreak + 1, (int) (streakFreezes - missedDays), 0);
            }
            int brokenStreakValue = currentStreak >= STREAK_REPAIR_MIN_STREAK ? currentStreak : 0;
            return new StreakResult(1, streakFreezes, brokenStreakValue);
        }
        return new StreakResult(nextStreak(currentStreak, lastActive, now), streakFreezes, 0);
    }

    private int applyStreak(ProgressEntity progress, Instant now) {
        StreakResult result = applyStreak(progress.getStreakDays(), progress.getStreakFreezes(),
                progress.getLastActive(), now);
        progress.setStreakFreezes(result.streakFreezes());
        if (result.brokenStreakValue() > 0) {
            progress.setLastBrokenStreak(result.brokenStreakValue());
            progress.setStreakBrokenAt(now);
        }
        return result.streak();
    }

    /**
     * {@code Instant.truncatedTo(DAYS)} truncates on the epoch, i.e. UTC
     * midnight — kept deliberately rather than switched to the learner's local
     * calendar date, per the user's explicit call. A learner far from UTC can
     * see a streak day roll over at a time that doesn't feel like "tomorrow"
     * to them; that's a known, accepted trade-off, not an oversight.
     */
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
    // Level curve — always derived from xp, never persisted.
    // ------------------------------------------------------------------

    record LevelInfo(int level, int xpIntoLevel, int xpForNextLevel) {
    }

    /**
     * Cost, in xp, to go from {@code level} to {@code level + 1}. Flat at 50
     * through level 3 (so levels 1-4 come after 50/100/150 xp — fast, roughly
     * the first stage or two of play), then growing by 25 per level after
     * that. Stage length is admin-editable, so the curve can't key off "stage
     * 4" directly; this flat-then-growing shape is the closest fixed
     * approximation of "fast early, slows down later."
     */
    static int levelCost(int level) {
        return level <= 3 ? 50 : 50 + (level - 3) * 25;
    }

    static LevelInfo levelInfo(int xp) {
        int level = 1;
        int remaining = xp;
        int cost = levelCost(level);
        while (remaining >= cost) {
            remaining -= cost;
            level++;
            cost = levelCost(level);
        }
        return new LevelInfo(level, remaining, cost);
    }

    // ------------------------------------------------------------------
    // Stage advance — 100% of lessons done and >= 75% of the stage's
    // questions correct.
    // ------------------------------------------------------------------

    /**
     * Called exactly once, the moment a stage's lessons all show complete.
     * Aggregates every question answered anywhere in the stage from the
     * persisted {@code question_results} rows, except the lesson that just
     * finished — its {@code PUT /api/progress/results/{id}} save happens in a
     * separate, unawaited request from the frontend and may not have landed
     * yet, so the just-computed in-memory counts for it are used instead.
     */
    private StageOutcome evaluateStageCompletion(ProgressEntity progress, CurriculumDto document, StageDto stage,
                                                 String excludeLessonId, int extraCorrect, int extraTotal) {
        List<QuestionResultEntity> rows = questionResults.findAllByUserIdAndStageSlug(progress.getUserId(), stage.id());
        int correct = extraCorrect;
        int total = extraTotal;
        for (QuestionResultEntity row : rows) {
            if (excludeLessonId != null && excludeLessonId.equals(row.getLessonSlug())) {
                continue;
            }
            total++;
            if (row.isCorrect()) {
                correct++;
            }
        }
        int accuracyPct = total == 0 ? 100 : (int) Math.round((correct * 100.0) / total);
        boolean cleared = accuracyPct >= STAGE_ADVANCE_MIN_ACCURACY_PCT;
        boolean perfect = accuracyPct == 100;
        int bonusXp = 0;
        int bonusCoins = 0;
        if (cleared) {
            advanceStage(progress, document, stage);
            if (perfect) {
                bonusXp = STAGE_PERFECT_BONUS_XP;
                bonusCoins = STAGE_PERFECT_BONUS_COINS;
                progress.setXp(progress.getXp() + bonusXp);
                progress.setCoins(progress.getCoins() + bonusCoins);
            }
        }
        return new StageOutcome(accuracyPct, cleared, perfect, !cleared, bonusXp, bonusCoins);
    }

    /** Moves to the next stage in curriculum order; a final stage just stays put at 100%. */
    private void advanceStage(ProgressEntity progress, CurriculumDto document, StageDto stage) {
        List<StageDto> stages = document.stages();
        for (int i = 0; i < stages.size(); i++) {
            if (stages.get(i).id().equals(stage.id())) {
                if (i + 1 < stages.size()) {
                    progress.setCurrentStageSlug(stages.get(i + 1).id());
                    progress.setCurrentStagePct(0);
                }
                return;
            }
        }
    }

    // ------------------------------------------------------------------
    // Retry — spend coins to fix one wrong question at the end of a stage.
    // ------------------------------------------------------------------

    /**
     * Re-grades a single previously-answered question and, if this pushes the
     * stage's accuracy over the advance threshold, clears it right here. Coins
     * are spent on the attempt, not the outcome — same framing as the doc's
     * hint token — so this can't be farmed by retrying until correct for free.
     */
    @Transactional
    public RetryQuestionResponse retryQuestion(UUID userId, RetryQuestionRequest request) {
        ProgressEntity progress = require(userId);
        if (progress.getCoins() < RETRY_QUESTION_COST_COINS) {
            throw ApiException.badRequest("progress.insufficientCoins",
                    "Not enough coins to retry this question.");
        }

        CurriculumDto document = curriculum.load();
        StageDto stage = document.stages().stream()
                .filter(s -> s.id().equals(request.stageId()))
                .findFirst()
                .orElseThrow(() -> ApiException.notFound("progress.unknownStage",
                        "No stage '" + request.stageId() + "'."));
        LessonDto lesson = orEmpty(stage.lessons()).stream()
                .filter(l -> l.id().equals(request.lessonId()))
                .findFirst()
                .orElseThrow(() -> ApiException.notFound("progress.unknownLesson",
                        "No lesson '" + request.lessonId() + "' in stage '" + request.stageId() + "'."));
        ExerciseDto exercise = findExercise(lesson, request.exerciseId(), request.index());
        if (exercise == null) {
            throw ApiException.notFound("progress.unknownExercise",
                    "No exercise '" + request.exerciseId() + "' in lesson '" + request.lessonId() + "'.");
        }

        JsonNode answers = request.answers() == null ? json.createObjectNode() : request.answers();
        boolean correct = isExerciseCorrect(exercise, answers);

        progress.setCoins(progress.getCoins() - RETRY_QUESTION_COST_COINS);

        QuestionResultEntity row = questionResults
                .findByUserIdAndStageSlugAndLessonSlugAndExerciseSlug(userId, stage.id(), lesson.id(), exercise.id())
                .orElseGet(() -> new QuestionResultEntity(userId, stage.id(), lesson.id(), exercise.id(),
                        request.index(), correct, false, answers, Instant.now()));
        row.setCorrect(correct);
        row.setSkipped(false);
        row.setAnswers(answers);
        row.setAnsweredAt(Instant.now());
        questionResults.saveAndFlush(row);

        StageOutcome outcome = evaluateStageCompletion(progress, document, stage, null, 0, 0);
        progress.touch();
        repository.save(progress);

        return new RetryQuestionResponse(correct, outcome, toDto(progress));
    }

    /** Same rule {@code completeLesson} applies per card and the review screen applies per question. */
    private boolean isExerciseCorrect(ExerciseDto exercise, JsonNode answers) {
        for (CardDto card : orEmpty(exercise.cards())) {
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

    /** Id first, position second — an admin can rename an exercise between the attempt and the retry. */
    private ExerciseDto findExercise(LessonDto lesson, String exerciseId, int index) {
        List<ExerciseDto> exercises = orEmpty(lesson.exercises());
        for (ExerciseDto exercise : exercises) {
            if (exercise.id().equals(exerciseId)) {
                return exercise;
            }
        }
        return index >= 0 && index < exercises.size() ? exercises.get(index) : null;
    }

    // ------------------------------------------------------------------
    // Streak freeze purchase
    // ------------------------------------------------------------------

    @Transactional
    public ProgressDto buyStreakFreeze(UUID userId) {
        ProgressEntity progress = require(userId);
        if (progress.getCoins() < STREAK_FREEZE_COST_COINS) {
            throw ApiException.badRequest("progress.insufficientCoins",
                    "Not enough coins for a streak freeze.");
        }
        progress.setCoins(progress.getCoins() - STREAK_FREEZE_COST_COINS);
        progress.setStreakFreezes(progress.getStreakFreezes() + 1);
        progress.touch();
        return toDto(repository.save(progress));
    }

    // ------------------------------------------------------------------
    // Streak repair — pay coins to undo the most recent unfrozen gap.
    // ------------------------------------------------------------------

    /**
     * Restores {@code streakDays} to whatever it was right before it last
     * broke, and resets the clock as if the learner had just been active — a
     * paid do-over, not a refund of the gap itself (freezes for that stay
     * spent). Only ever available once per break: {@code lastBrokenStreak}
     * clears the moment this succeeds, same as {@link #dismissBrokenStreak}.
     */
    @Transactional
    public ProgressDto repairStreak(UUID userId) {
        ProgressEntity progress = require(userId);
        if (progress.getLastBrokenStreak() <= 0) {
            throw ApiException.badRequest("progress.noBrokenStreak", "No broken streak to repair.");
        }
        if (progress.getCoins() < STREAK_REPAIR_COST_COINS) {
            throw ApiException.badRequest("progress.insufficientCoins",
                    "Not enough coins to repair your streak.");
        }
        progress.setCoins(progress.getCoins() - STREAK_REPAIR_COST_COINS);
        progress.setStreakDays(progress.getLastBrokenStreak());
        progress.setLastActive(Instant.now());
        progress.setLastBrokenStreak(0);
        progress.setStreakBrokenAt(null);
        progress.touch();
        return toDto(repository.save(progress));
    }

    /** Waves off the repair offer without paying for it — it will not resurface until the next break. */
    @Transactional
    public ProgressDto dismissBrokenStreak(UUID userId) {
        ProgressEntity progress = require(userId);
        progress.setLastBrokenStreak(0);
        progress.setStreakBrokenAt(null);
        progress.touch();
        return toDto(repository.save(progress));
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
