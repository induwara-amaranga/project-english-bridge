package lk.englisher.parent;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.NotBlank;
import lk.englisher.progress.ProgressDtos.ProgressDto;

import java.util.List;

/**
 * Parent-side wire shapes.
 *
 * <p>{@link ParentLinkDto} is {@code ParentLink} from domain/parentLink.ts,
 * field for field — including {@code invitedAt}/{@code acceptedAt} as epoch
 * millis or null, which is what {@code number | null} means in that file, and
 * the {@code none} status that stands for "no invitation yet".
 */
public final class ParentDtos {

    private ParentDtos() {
    }

    public record InviteRequest(@NotBlank String contact) {
    }

    public record ParentLinkDto(String status, String contact, String channel,
                                Long invitedAt, Long acceptedAt) {

        /** PARENT_LINK_DEFAULT — the empty state, with '' rather than null. */
        public static ParentLinkDto none() {
            return new ParentLinkDto("none", "", "", null, null);
        }

        public static ParentLinkDto of(ParentLinkEntity link) {
            if ("revoked".equals(link.getStatus())) {
                return none();
            }
            return new ParentLinkDto(
                    link.getStatus(),
                    link.getContact(),
                    link.getChannel(),
                    link.getInvitedAt() == null ? null : link.getInvitedAt().toEpochMilli(),
                    link.getAcceptedAt() == null ? null : link.getAcceptedAt().toEpochMilli());
        }
    }

    /**
     * The answer to clicking an invitation link.
     *
     * @param accepted     the link is now bound to the calling parent account
     * @param signupNeeded the token is good but nobody is signed in — the page
     *                     should prompt for a parent account and retry
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record AcceptResultDto(boolean accepted, boolean signupNeeded, String childName,
                                  String contact, ParentLinkDto link) {
    }

    /** One row of the child's recent writing, for the dashboard. */
    public record ChildSubmissionDto(String stageId, String lessonId, String cardId,
                                     String excerpt, String status, String updatedAt) {
    }

    /**
     * Everything ParentDashboard.tsx needs in one call.
     *
     * <p>The React app currently resolves this itself from two separate pieces
     * of local state; collapsing it server-side is the point of the endpoint.
     * {@code stageName} is derived from the curriculum so the dashboard never
     * has to hold its own copy of the stage list — the drift
     * ARCHITECTURE.md called Weakness 1.
     */
    public record ParentDashboardDto(String childName, String stageName, String stageId,
                                     ProgressDto progress, int completedStages, int totalStages,
                                     int overallPercent, List<ChildSubmissionDto> recentWriting) {
    }
}
