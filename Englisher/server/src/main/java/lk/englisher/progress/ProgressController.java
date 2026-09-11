package lk.englisher.progress;

import jakarta.validation.Valid;
import lk.englisher.auth.CurrentUser;
import lk.englisher.progress.ProgressDtos.CompleteLessonRequest;
import lk.englisher.progress.ProgressDtos.CompleteLessonResponse;
import lk.englisher.progress.ProgressDtos.PlacementResultRequest;
import lk.englisher.progress.ProgressDtos.ProgressDto;
import lk.englisher.progress.ProgressDtos.RetryQuestionRequest;
import lk.englisher.progress.ProgressDtos.RetryQuestionResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * {@code getProgress()} and the two writes that replace direct
 * {@code setProgress()} calls.
 *
 * <p>Every method is scoped to the caller's own account — there is no
 * {@code userId} parameter to tamper with. A parent reads their child's
 * progress through {@code /api/parent/dashboard}, which resolves the link
 * server-side.
 */
@RestController
@RequestMapping("/api/progress")
@PreAuthorize("hasRole('STUDENT')")
public class ProgressController {

    private final ProgressService service;

    public ProgressController(ProgressService service) {
        this.service = service;
    }

    @GetMapping
    public ProgressDto get() {
        return service.load(CurrentUser.requireId());
    }

    /**
     * Grades the lesson's cards server-side and awards XP only on a pass.
     *
     * <p>{@code stageId} in the body is a disambiguator, not a trust boundary:
     * lesson ids are unique only within a stage.
     */
    @PostMapping("/lessons/{lessonId}/complete")
    public CompleteLessonResponse complete(@PathVariable String lessonId,
                                           @RequestBody(required = false) CompleteLessonRequest request) {
        return service.completeLesson(CurrentUser.requireId(), lessonId, request);
    }

    /** {@code setCurrentStage} — where the placement test drops the learner. */
    @PostMapping("/placement")
    public ProgressDto placement(@Valid @RequestBody PlacementResultRequest request) {
        return service.setCurrentStage(CurrentUser.requireId(), request.stageId());
    }

    /** Spends coins to re-grade one previously wrong question at the end of a stage. */
    @PostMapping("/retry")
    public RetryQuestionResponse retry(@Valid @RequestBody RetryQuestionRequest request) {
        return service.retryQuestion(CurrentUser.requireId(), request);
    }

    /** Spends coins for one streak-freeze token — see ProgressService.applyStreak. */
    @PostMapping("/streak-freeze/buy")
    public ProgressDto buyStreakFreeze() {
        return service.buyStreakFreeze(CurrentUser.requireId());
    }

    /** Spends coins to restore the streak lost to the most recent unfrozen gap. */
    @PostMapping("/streak/repair")
    public ProgressDto repairStreak() {
        return service.repairStreak(CurrentUser.requireId());
    }

    /** Waves off the repair offer for the most recent broken streak without paying for it. */
    @PostMapping("/streak/dismiss-broken")
    public ProgressDto dismissBrokenStreak() {
        return service.dismissBrokenStreak(CurrentUser.requireId());
    }
}
