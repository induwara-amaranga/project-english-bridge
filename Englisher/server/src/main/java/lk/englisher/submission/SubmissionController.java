package lk.englisher.submission;

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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Where a learner's writing goes.
 *
 * <p>The three {@code /write/*} pages currently hold their text in
 * {@code useState} and their Submit button is a {@code <Link>}, so nothing is
 * kept. This is the endpoint that fixes that; the React app is unchanged, so
 * nothing calls it yet, but the storage exists and the parent dashboard already
 * reads from it.
 */
@RestController
@RequestMapping("/api/submissions")
@PreAuthorize("hasRole('STUDENT')")
public class SubmissionController {

    private final SubmissionRepository repository;
    private final CurriculumService curriculum;
    private final ObjectMapper json;

    public SubmissionController(SubmissionRepository repository, CurriculumService curriculum,
                                ObjectMapper json) {
        this.repository = repository;
        this.curriculum = curriculum;
        this.json = json;
    }

    public record SaveSubmissionRequest(
            @NotBlank String stageId,
            @NotBlank String lessonId,
            String body,
            JsonNode rubricTicks,
            String status) {
    }

    public record SubmissionDto(String stageId, String lessonId, String cardId, String body,
                                JsonNode rubricTicks, String status, Instant submittedAt,
                                Instant updatedAt) {
        static SubmissionDto of(SubmissionEntity entity) {
            return new SubmissionDto(entity.getStageSlug(), entity.getLessonSlug(), entity.getCardSlug(),
                    entity.getBody(), entity.getRubricTicks(), entity.getStatus(),
                    entity.getSubmittedAt(), entity.getUpdatedAt());
        }
    }

    @GetMapping
    public List<SubmissionDto> mine() {
        return repository.findAllByUserIdOrderByUpdatedAtDesc(CurrentUser.requireId()).stream()
                .map(SubmissionDto::of)
                .collect(Collectors.toList());
    }

    /**
     * Creates or updates the learner's answer to one card. Idempotent by
     * (learner, card), so the client can call it on every autosave tick without
     * accumulating rows.
     */
    @PutMapping("/{cardId}")
    public SubmissionDto save(@PathVariable String cardId,
                              @Valid @RequestBody SaveSubmissionRequest request) {
        requireWritableCard(request.stageId(), request.lessonId(), cardId);
        UUID userId = CurrentUser.requireId();
        String status = "submitted".equals(request.status()) ? "submitted" : "draft";

        SubmissionEntity entity = repository
                .findByUserIdAndStageSlugAndLessonSlugAndCardSlug(userId, request.stageId(), request.lessonId(), cardId)
                .orElseGet(() -> new SubmissionEntity(userId, request.stageId(), request.lessonId(), cardId,
                        "", json.createObjectNode(), "draft"));

        entity.setBody(request.body() == null ? "" : request.body());
        entity.setRubricTicks(request.rubricTicks() == null ? json.createObjectNode() : request.rubricTicks());
        entity.markStatus(status);
        return SubmissionDto.of(repository.save(entity));
    }

    /**
     * Rejects a write against a card that does not exist, or that is not one of
     * the two written types.
     *
     * <p>Without this the table would happily accept a submission keyed to any
     * string, which is how orphaned rows and typo'd card ids accumulate.
     */
    private void requireWritableCard(String stageId, String lessonId, String cardId) {
        CardDto card = findCard(stageId, lessonId, cardId);
        if (card == null) {
            throw ApiException.notFound("submission.unknownCard",
                    "No card '" + cardId + "' in lesson '" + lessonId + "' of stage '" + stageId + "'.");
        }
        if (!"essay".equals(card.type()) && !"rubric".equals(card.type())) {
            throw ApiException.badRequest("submission.notWritable",
                    "Card '" + cardId + "' is a " + card.type() + " card; only essay and rubric cards take submissions.");
        }
    }

    private CardDto findCard(String stageId, String lessonId, String cardId) {
        for (StageDto stage : curriculum.load().stages()) {
            if (!stage.id().equals(stageId)) {
                continue;
            }
            for (LessonDto lesson : stage.lessons() == null ? List.<LessonDto>of() : stage.lessons()) {
                if (!lesson.id().equals(lessonId)) {
                    continue;
                }
                CardDto direct = firstMatch(lesson.cards(), cardId);
                if (direct != null) {
                    return direct;
                }
                for (ExerciseDto exercise : lesson.exercises() == null ? List.<ExerciseDto>of() : lesson.exercises()) {
                    CardDto match = firstMatch(exercise.cards(), cardId);
                    if (match != null) {
                        return match;
                    }
                }
            }
        }
        return null;
    }

    private static CardDto firstMatch(List<CardDto> cards, String cardId) {
        if (cards == null) {
            return null;
        }
        return cards.stream().filter(card -> card.id().equals(cardId)).findFirst().orElse(null);
    }
}
