package lk.englisher.placement;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.JsonNode;
import lk.englisher.curriculum.CurriculumService;
import lk.englisher.curriculum.dto.CurriculumDtos.StageDto;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

/**
 * Serves the placement test.
 *
 * <p>Public, because the test runs before there is an account — the React app
 * offers it straight off the home screen. Note that {@code correct} is included
 * in the response: the current test grades itself in the browser and shows
 * per-question feedback, so withholding the answer key would break it. That is
 * only acceptable because nothing is at stake — the result picks a starting
 * stage, and a learner who cheats it merely lands somewhere too hard. XP, by
 * contrast, is graded server-side and never trusts the client.
 */
@RestController
@RequestMapping("/api/placement")
public class PlacementController {

    private final PlacementQuestionRepository questions;
    private final PlacementStageCopyRepository stageCopy;
    private final CurriculumService curriculum;

    public PlacementController(PlacementQuestionRepository questions,
                               PlacementStageCopyRepository stageCopy,
                               CurriculumService curriculum) {
        this.questions = questions;
        this.stageCopy = stageCopy;
        this.curriculum = curriculum;
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record QuestionDto(int stage, String type, String prompt, JsonNode options,
                              String correct, String sinhala) {
    }

    /**
     * @param stageId the curriculum stage this result maps to — resolved here
     *                rather than left to the client, so the placement's
     *                1-based stage numbers stay tied to the real stage list
     *                even when stages are reordered.
     */
    public record StageCopyDto(int stage, String name, String message, String stageId) {
    }

    public record PlacementDto(List<QuestionDto> questions, List<StageCopyDto> stages) {
    }

    @GetMapping
    public PlacementDto get() {
        List<StageDto> stages = curriculum.load().stages();
        List<QuestionDto> questionDtos = questions.findAllByOrderByOrdAsc().stream()
                .map(q -> new QuestionDto(q.getStage(), q.getType(), q.getPrompt(),
                        q.getOptions(), q.getCorrect(), q.getSinhala()))
                .collect(Collectors.toList());
        List<StageCopyDto> copyDtos = stageCopy.findAllByOrderByStageAsc().stream()
                .map(c -> new StageCopyDto(c.getStage(), c.getName(), c.getMessage(),
                        stageIdFor(stages, c.getStage())))
                .collect(Collectors.toList());
        return new PlacementDto(questionDtos, copyDtos);
    }

    /** Placement stages are 1-based positions into the curriculum's stage list. */
    private static String stageIdFor(List<StageDto> stages, int oneBasedStage) {
        return IntStream.range(0, stages.size())
                .filter(i -> i == oneBasedStage - 1)
                .mapToObj(i -> stages.get(i).id())
                .findFirst()
                .orElse(null);
    }
}
