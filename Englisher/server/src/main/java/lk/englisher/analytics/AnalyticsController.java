package lk.englisher.analytics;

import lk.englisher.curriculum.CurriculumService;
import lk.englisher.curriculum.dto.CurriculumDtos.StageDto;
import lk.englisher.progress.ProgressEntity;
import lk.englisher.progress.ProgressRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Real aggregates in place of the hardcoded {@code ANALYTICS} object.
 *
 * <p>The response shape is deliberately identical to
 * {@code domain/curriculum.ts}'s {@code ANALYTICS}, so
 * {@code CourseDashboard.tsx} needs no changes at all — same keys, same nesting,
 * same {@code byStage} map keyed by stage id.
 *
 * <p>Analytics is a separate endpoint from content on purpose, as
 * curriculum.js's own header comment put it: content is edited, analytics are
 * observed.
 */
@RestController
@RequestMapping("/api/admin/analytics")
@PreAuthorize("hasRole('ADMIN')")
public class AnalyticsController {

    private final ProgressRepository progress;
    private final CurriculumService curriculum;

    public AnalyticsController(ProgressRepository progress, CurriculumService curriculum) {
        this.progress = progress;
        this.curriculum = curriculum;
    }

    public record StageAnalyticsDto(long learners, int completionPct, int avgAccuracyPct) {
    }

    public record AnalyticsDto(long activeLearners, long weeklyActive, int avgSessionMin,
                               Map<String, StageAnalyticsDto> byStage) {
    }

    @GetMapping
    public AnalyticsDto get() {
        List<ProgressEntity> rows = progress.findAll();
        Instant weekAgo = Instant.now().minus(7, ChronoUnit.DAYS);

        Map<String, StageAnalyticsDto> byStage = new LinkedHashMap<>();
        for (StageDto stage : curriculum.load().stages()) {
            List<ProgressEntity> here = rows.stream()
                    .filter(row -> stage.id().equals(row.getCurrentStageSlug()))
                    .toList();
            if (here.isEmpty()) {
                continue;
            }
            int lessonCount = stage.lessons() == null ? 0 : stage.lessons().size();
            int completionPct = (int) Math.round(here.stream()
                    .mapToInt(row -> completionFor(row, stage.id(), lessonCount))
                    .average()
                    .orElse(0));
            // avgAccuracyPct has no source yet: nothing records per-answer
            // outcomes, only pass/fail at lesson granularity. Reporting the
            // completion figure twice would be a lie dressed as data, so it is
            // reported as 0 until an attempts table exists.
            byStage.put(stage.id(), new StageAnalyticsDto(here.size(), completionPct, 0));
        }

        return new AnalyticsDto(
                rows.size(),
                progress.countByLastActiveAfter(weekAgo),
                // Session length needs event tracking the app does not do.
                0,
                byStage);
    }

    private static int completionFor(ProgressEntity row, String stageId, int lessonCount) {
        if (lessonCount == 0) {
            return 0;
        }
        int done = row.getCompletedLessonIds().path(stageId).size();
        return Math.min(100, (int) Math.round((done * 100.0) / lessonCount));
    }
}
