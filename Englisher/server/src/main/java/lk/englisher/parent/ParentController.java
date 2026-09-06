package lk.englisher.parent;

import jakarta.validation.Valid;
import lk.englisher.auth.CurrentUser;
import lk.englisher.auth.UserEntity;
import lk.englisher.auth.UserRepository;
import lk.englisher.common.ApiException;
import lk.englisher.curriculum.CurriculumService;
import lk.englisher.curriculum.dto.CurriculumDtos.BilingualDto;
import lk.englisher.curriculum.dto.CurriculumDtos.CurriculumDto;
import lk.englisher.curriculum.dto.CurriculumDtos.StageDto;
import lk.englisher.parent.ParentDtos.AcceptResultDto;
import lk.englisher.parent.ParentDtos.ChildSubmissionDto;
import lk.englisher.parent.ParentDtos.InviteRequest;
import lk.englisher.parent.ParentDtos.ParentDashboardDto;
import lk.englisher.parent.ParentDtos.ParentLinkDto;
import lk.englisher.progress.ProgressDtos.ProgressDto;
import lk.englisher.progress.ProgressEntity;
import lk.englisher.progress.ProgressService;
import lk.englisher.submission.SubmissionEntity;
import lk.englisher.submission.SubmissionRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * The two halves of parent access.
 *
 * <p>Note the role split, which mirrors the comment in useAuth.tsx: the *child*
 * manages the invitation, so {@code /api/parent-links/*} is student-gated, and
 * only the resulting dashboard is parent-gated. Getting this backwards would
 * let a parent invite themselves.
 */
@RestController
@RequestMapping("/api")
public class ParentController {

    private static final int EXCERPT_LENGTH = 240;

    private final ParentLinkService links;
    private final ProgressService progress;
    private final CurriculumService curriculum;
    private final UserRepository users;
    private final SubmissionRepository submissions;

    public ParentController(ParentLinkService links, ProgressService progress,
                            CurriculumService curriculum, UserRepository users,
                            SubmissionRepository submissions) {
        this.links = links;
        this.progress = progress;
        this.curriculum = curriculum;
        this.users = users;
        this.submissions = submissions;
    }

    // ------------------------------------------------------------------
    // Child side — ParentAccess.tsx
    // ------------------------------------------------------------------

    @GetMapping("/parent-links")
    @PreAuthorize("hasRole('STUDENT')")
    public ParentLinkDto current() {
        return links.forChild(CurrentUser.requireId());
    }

    @PostMapping("/parent-links/invite")
    @PreAuthorize("hasRole('STUDENT')")
    public ParentLinkDto invite(@Valid @RequestBody InviteRequest request) {
        return links.invite(CurrentUser.requireId(), request.contact());
    }

    @PostMapping("/parent-links/resend")
    @PreAuthorize("hasRole('STUDENT')")
    public ParentLinkDto resend() {
        return links.resend(CurrentUser.requireId());
    }

    @DeleteMapping("/parent-links")
    @PreAuthorize("hasRole('STUDENT')")
    public ParentLinkDto revoke() {
        return links.revoke(CurrentUser.requireId());
    }

    // ------------------------------------------------------------------
    // Parent side
    // ------------------------------------------------------------------

    /**
     * Accepts an invitation. Public: this may be the parent's first ever visit,
     * and the response says whether they still need an account.
     */
    @PostMapping("/parent-links/accept")
    public AcceptResultDto accept(@RequestParam("token") String token) {
        UUID parentId = CurrentUser.find().map(p -> p.userId()).orElse(null);
        return links.accept(token, parentId);
    }

    /**
     * Resolves the accepted link and returns the child's progress plus
     * curriculum-derived stage names in one call.
     */
    @GetMapping("/parent/dashboard")
    @PreAuthorize("hasRole('PARENT')")
    public ParentDashboardDto dashboard() {
        UUID parentId = CurrentUser.requireId();
        ParentLinkEntity link = links.acceptedLinkForParent(parentId)
                .orElseThrow(() -> ApiException.notFound("parentLink.notLinked",
                        "No child has linked this account yet."));

        UserEntity child = users.findById(link.getChildUserId())
                .orElseThrow(() -> ApiException.notFound("parentLink.noChild",
                        "That learner's account no longer exists."));

        ProgressEntity childProgress = progress.require(child.getId());
        ProgressDto progressDto = progress.toDto(childProgress);
        CurriculumDto document = curriculum.load();

        int stageIndex = indexOfStage(document, childProgress.getCurrentStageSlug());
        String stageName = stageIndex < 0 ? "" : englishTitle(document.stages().get(stageIndex));
        int totalStages = document.stages().size();
        int completedStages = Math.max(stageIndex, 0);
        int overall = totalStages == 0 ? 0
                : (int) Math.round(((completedStages + childProgress.getCurrentStagePct() / 100.0) / totalStages) * 100);

        return new ParentDashboardDto(
                child.getName(),
                stageName,
                childProgress.getCurrentStageSlug(),
                progressDto,
                completedStages,
                totalStages,
                overall,
                recentWriting(child.getId()));
    }

    /**
     * The child's recent writing, truncated to an excerpt.
     *
     * <p>Excerpted rather than served whole on purpose: the dashboard shows
     * that the child is writing and roughly what about. A parent who wants the
     * full text should have to open it deliberately, not have every private
     * draft rendered on a summary screen.
     */
    private List<ChildSubmissionDto> recentWriting(UUID childId) {
        return submissions.findAllByUserIdOrderByUpdatedAtDesc(childId).stream()
                .limit(5)
                .map(ParentController::toExcerpt)
                .collect(Collectors.toList());
    }

    private static ChildSubmissionDto toExcerpt(SubmissionEntity submission) {
        String body = submission.getBody() == null ? "" : submission.getBody();
        String excerpt = body.length() <= EXCERPT_LENGTH ? body : body.substring(0, EXCERPT_LENGTH) + "…";
        return new ChildSubmissionDto(
                submission.getStageSlug(),
                submission.getLessonSlug(),
                submission.getCardSlug(),
                excerpt,
                submission.getStatus(),
                submission.getUpdatedAt().toString());
    }

    private static int indexOfStage(CurriculumDto document, String stageId) {
        List<StageDto> stages = document.stages();
        for (int i = 0; i < stages.size(); i++) {
            if (stages.get(i).id().equals(stageId)) {
                return i;
            }
        }
        return -1;
    }

    private static String englishTitle(StageDto stage) {
        BilingualDto title = stage.title();
        return title == null || title.en() == null ? "" : title.en();
    }
}
