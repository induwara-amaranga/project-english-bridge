package lk.englisher.progress;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lk.englisher.curriculum.dto.CurriculumDtos.BilingualDto;
import lk.englisher.curriculum.dto.CurriculumDtos.CardDto;
import lk.englisher.curriculum.dto.CurriculumDtos.FeedbackDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The cases from {@code app/src/domain/grading.test.ts}, carried over verbatim.
 *
 * <p>Same inputs, same expected outputs. If the server's grader ever disagrees
 * with the browser's, one of these fails — which is the whole reason for
 * porting the cases rather than writing fresh ones.
 */
class GradingServiceTest {

    private final ObjectMapper json = new ObjectMapper();
    private final GradingService grading = new GradingService();

    private JsonNode parse(String raw) {
        try {
            return json.readTree(raw);
        } catch (Exception ex) {
            throw new IllegalArgumentException(raw, ex);
        }
    }

    private CardDto card(String type, String payloadJson) {
        return new CardDto("c", type, "full", null, BilingualDto.empty(),
                BilingualDto.empty(), parse(payloadJson), FeedbackDto.empty());
    }

    @Nested
    @DisplayName("norm")
    class Norm {

        @Test
        void lowercasesAndStripsPunctuationByDefault() {
            assertThat(grading.norm("I go to school.", null)).isEqualTo("i go to school");
        }

        @Test
        void respectsNormalizeRules() {
            JsonNode rules = parse("{\"lowercase\":false,\"stripPunctuation\":false}");
            assertThat(grading.norm("Hello!", rules)).isEqualTo("Hello!");
        }

        @Test
        void collapsesWhitespace() {
            assertThat(grading.norm("a   b\n c", null)).isEqualTo("a b c");
        }
    }

    @Nested
    @DisplayName("gradeCard")
    class GradeCard {

        @Test
        void gradesMcqByCorrectIndex() {
            CardDto c = card("mcq", "{\"correctIndex\":1}");
            assertThat(grading.gradeCard(c, parse("1"))).isTrue();
            assertThat(grading.gradeCard(c, parse("0"))).isFalse();
        }

        @Test
        void gradesGapFillAgainstAnyAcceptedAnswerNormalised() {
            CardDto c = card("gap_fill", "{\"accept\":[\"watch\"],\"choices\":[]}");
            assertThat(grading.gradeCard(c, parse("\"Watch\""))).isTrue();
            assertThat(grading.gradeCard(c, parse("\"watches\""))).isFalse();
        }

        @Test
        void gradesDragOrderOnlyWhenEveryTokenIsInItsOriginalPosition() {
            CardDto c = card("drag_order", "{\"tokens\":[{\"en\":\"a\"},{\"en\":\"b\"},{\"en\":\"c\"}]}");
            assertThat(grading.gradeCard(c, parse("[0,1,2]"))).isTrue();
            assertThat(grading.gradeCard(c, parse("[1,0,2]"))).isFalse();
            assertThat(grading.gradeCard(c, parse("[0,1]"))).isFalse();
        }

        @Test
        void gradesMatchOnlyWhenEveryPairIndexMatches() {
            CardDto c = card("match", "{\"pairs\":[{\"left\":\"x\",\"right\":\"y\"},{\"left\":\"p\",\"right\":\"q\"}]}");
            assertThat(grading.gradeCard(c, parse("{\"pending\":null,\"pairs\":{\"0\":0,\"1\":1}}"))).isTrue();
            assertThat(grading.gradeCard(c, parse("{\"pending\":null,\"pairs\":{\"0\":1,\"1\":0}}"))).isFalse();
        }

        @Test
        void alwaysPassesATextCard() {
            assertThat(grading.gradeCard(card("text", "{}"), null)).isTrue();
        }

        @Test
        void gradesMultiSelectAsAnExactSetMatchOrderIndependent() {
            CardDto c = card("multi_select", "{\"correctIndexes\":[0,2]}");
            assertThat(grading.gradeCard(c, parse("[0,2]"))).isTrue();
            assertThat(grading.gradeCard(c, parse("[2,0]"))).isTrue();
            assertThat(grading.gradeCard(c, parse("[0]"))).isFalse();
            assertThat(grading.gradeCard(c, parse("[0,1,2]"))).isFalse();
            assertThat(grading.gradeCard(c, parse("[]"))).isFalse();
        }

        @Test
        void essayAndRubricAreNeverAutoGraded() {
            assertThat(grading.gradeCard(card("essay", "{}"), parse("\"anything at all\""))).isTrue();
            assertThat(grading.gradeCard(card("rubric", "{}"), parse("{}"))).isTrue();
        }

        /**
         * Not in the Vitest suite: JavaScript would happily compare a duplicated
         * index set as equal by size, and this pins that the port does not.
         */
        @Test
        void multiSelectRejectsADuplicatedIndexPaddingAShortAnswer() {
            CardDto c = card("multi_select", "{\"correctIndexes\":[0,2]}");
            assertThat(grading.gradeCard(c, parse("[0,0]"))).isFalse();
        }
    }

    @Nested
    @DisplayName("isAnswered")
    class IsAnswered {

        @Test
        void dragOrderNeedsAtLeastOneTokenPlaced() {
            CardDto c = card("drag_order", "{\"tokens\":[]}");
            assertThat(grading.isAnswered(c, parse("[]"))).isFalse();
            assertThat(grading.isAnswered(c, parse("[0]"))).isTrue();
        }

        @Test
        void matchNeedsAtLeastOnePair() {
            CardDto c = card("match", "{\"pairs\":[]}");
            assertThat(grading.isAnswered(c, parse("{\"pending\":null,\"pairs\":{}}"))).isFalse();
            assertThat(grading.isAnswered(c, parse("{\"pending\":null,\"pairs\":{\"0\":0}}"))).isTrue();
        }

        @Test
        void freeTextNeedsNonWhitespaceContent() {
            CardDto c = card("free_text", "{\"accept\":[]}");
            assertThat(grading.isAnswered(c, parse("\"   \""))).isFalse();
            assertThat(grading.isAnswered(c, parse("\"hi\""))).isTrue();
        }

        @Test
        void essayNeedsNonWhitespaceContentSameAsFreeText() {
            CardDto c = card("essay", "{}");
            assertThat(grading.isAnswered(c, parse("\"   \""))).isFalse();
            assertThat(grading.isAnswered(c, parse("\"My essay...\""))).isTrue();
        }

        @Test
        void multiSelectNeedsAtLeastOneOptionPicked() {
            CardDto c = card("multi_select", "{\"correctIndexes\":[]}");
            assertThat(grading.isAnswered(c, parse("[]"))).isFalse();
            assertThat(grading.isAnswered(c, parse("[0]"))).isTrue();
        }

        @Test
        void rubricIsASelfCheckNeverAGate() {
            assertThat(grading.isAnswered(card("rubric", "{}"), parse("{}"))).isTrue();
        }
    }
}
