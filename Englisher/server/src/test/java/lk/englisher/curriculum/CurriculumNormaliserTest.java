package lk.englisher.curriculum;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lk.englisher.curriculum.dto.CurriculumDtos.BilingualDto;
import lk.englisher.curriculum.dto.CurriculumDtos.CardDto;
import lk.englisher.curriculum.dto.CurriculumDtos.CurriculumDto;
import lk.englisher.curriculum.dto.CurriculumDtos.LessonDto;
import lk.englisher.curriculum.dto.CurriculumDtos.StageDto;
import lk.englisher.curriculum.dto.CurriculumDtos.ThemeDto;
import lk.englisher.curriculum.dto.CurriculumDtos.UnlockDto;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The cases from {@code app/src/domain/curriculum.test.ts}.
 *
 * <p>The idempotence tests run against the real seed document rather than a
 * toy fixture, exactly as the Vitest suite runs them against
 * {@code CURRICULUM_DEFAULT} — the seed JSON is that same object, generated
 * from it.
 */
class CurriculumNormaliserTest {

    private final ObjectMapper json = new ObjectMapper();
    private final CurriculumNormaliser normaliser = new CurriculumNormaliser();

    private CurriculumDto seed() throws Exception {
        try (InputStream in = new ClassPathResource("seed/curriculum-default.json").getInputStream()) {
            return json.readValue(in, CurriculumDto.class);
        }
    }

    // ------------------------------------------------------------------
    // ensureCards / syncLessonFromCards
    // ------------------------------------------------------------------

    @Test
    void migratesAPreCardsLessonIntoASingleFullWidthTextCard() {
        LessonDto lesson = new LessonDto("l1", 1, "teach", BilingualDto.empty(),
                new BilingualDto("Hello world", ""), List.of(), List.of());
        CurriculumDto out = normaliser.normalise(one(lesson));

        List<CardDto> cards = out.stages().get(0).lessons().get(0).cards();
        assertThat(cards).hasSize(1);
        assertThat(cards.get(0).type()).isEqualTo("text");
        assertThat(cards.get(0).column()).isEqualTo("full");
        assertThat(cards.get(0).body().en()).isEqualTo("Hello world");
    }

    @Test
    void isIdempotentRunningTwiceDoesNotDuplicateCards() throws Exception {
        CurriculumDto once = normaliser.normalise(seed());
        CurriculumDto twice = normaliser.normalise(once);

        int cardsOnce = countCards(once);
        assertThat(cardsOnce).isGreaterThan(0);
        assertThat(countCards(twice)).isEqualTo(cardsOnce);
    }

    @Test
    void reDerivesLessonExplanationFromTextCards() {
        CardDto c1 = textCard("c1", "First");
        CardDto c2 = textCard("c2", "Second");
        LessonDto lesson = new LessonDto("l1", 1, "teach", BilingualDto.empty(),
                BilingualDto.empty(), List.of(), List.of(c1, c2));

        CurriculumDto out = normaliser.normalise(one(lesson));
        assertThat(out.stages().get(0).lessons().get(0).explanation().en())
                .isEqualTo("First\n\nSecond");
    }

    // ------------------------------------------------------------------
    // normaliseCurriculum
    // ------------------------------------------------------------------

    @Test
    void normaliseIsIdempotentAcrossTheSeedContent() throws Exception {
        CurriculumDto once = normaliser.normalise(seed());
        CurriculumDto twice = normaliser.normalise(once);
        // Compared as JSON so the assertion is about the document, not about
        // record identity.
        JsonNode before = json.valueToTree(once);
        JsonNode after = json.valueToTree(twice);
        assertThat(after).isEqualTo(before);
    }

    /**
     * The seed is already normalised (it was generated that way), so
     * normalising it must be a no-op. This is what would catch the port
     * disagreeing with the TypeScript that produced the file.
     */
    @Test
    void theSeedDocumentIsAlreadyNormalised() throws Exception {
        CurriculumDto seed = seed();
        JsonNode before = json.valueToTree(seed);
        JsonNode after = json.valueToTree(normaliser.normalise(seed));
        assertThat(after).isEqualTo(before);
    }

    // ------------------------------------------------------------------
    // repairUnlocks
    // ------------------------------------------------------------------

    @Test
    void rePointsAnAfterStageRuleThatNowPointsForwardAtTheImmediatelyPrecedingStage() throws Exception {
        CurriculumDto seed = seed();
        List<StageDto> stages = new ArrayList<>(seed.stages());
        // Simulate a reorder that leaves stage 0's rule pointing at a later stage.
        stages.set(0, withUnlock(stages.get(0), UnlockDto.afterStage(stages.get(2).id())));

        List<StageDto> repaired = normaliser.repairUnlocks(stages);
        assertThat(repaired.get(0).unlock()).isEqualTo(UnlockDto.always());
    }

    @Test
    void leavesAlwaysStagesAlone() throws Exception {
        List<StageDto> repaired = normaliser.repairUnlocks(seed().stages());
        assertThat(repaired.get(0).unlock()).isEqualTo(UnlockDto.always());
    }

    @Test
    void rePointsAStageWhoseUnlockReferencesAStageThatNoLongerExists() {
        StageDto first = stage("a", 1, UnlockDto.always());
        StageDto second = stage("b", 2, UnlockDto.afterStage("deleted-stage"));
        List<StageDto> repaired = normaliser.repairUnlocks(List.of(first, second));
        assertThat(repaired.get(1).unlock()).isEqualTo(UnlockDto.afterStage("a"));
    }

    @Test
    void rePointsASelfReferencingUnlock() {
        StageDto first = stage("a", 1, UnlockDto.always());
        StageDto second = stage("b", 2, UnlockDto.afterStage("b"));
        List<StageDto> repaired = normaliser.repairUnlocks(List.of(first, second));
        assertThat(repaired.get(1).unlock()).isEqualTo(UnlockDto.afterStage("a"));
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private static CardDto textCard(String id, String body) {
        return new CardDto(id, "text", "full", true, new BilingualDto(body, ""), null, null, null);
    }

    private static StageDto stage(String id, int order, UnlockDto unlock) {
        return new StageDto(id, order, BilingualDto.empty(), new ThemeDto("#000", "#fff"),
                unlock, List.of(), null);
    }

    private static StageDto withUnlock(StageDto stage, UnlockDto unlock) {
        return new StageDto(stage.id(), stage.order(), stage.title(), stage.theme(), unlock,
                stage.lessons(), stage.placeholder());
    }

    private static CurriculumDto one(LessonDto lesson) {
        StageDto stage = new StageDto("s1", 1, BilingualDto.empty(), new ThemeDto("#000", "#fff"),
                UnlockDto.always(), List.of(lesson), null);
        return new CurriculumDto(1, List.of(stage));
    }

    private static int countCards(CurriculumDto document) {
        int total = 0;
        for (StageDto stage : document.stages()) {
            for (LessonDto lesson : stage.lessons()) {
                total += lesson.cards().size();
                total += lesson.exercises().stream().mapToInt(ex -> ex.cards().size()).sum();
            }
        }
        return total;
    }
}
