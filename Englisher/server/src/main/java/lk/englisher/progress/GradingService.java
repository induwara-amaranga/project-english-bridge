package lk.englisher.progress;

import com.fasterxml.jackson.databind.JsonNode;
import lk.englisher.curriculum.dto.CurriculumDtos.CardDto;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.Iterator;
import java.util.Set;

/**
 * {@code gradeCard}, {@code norm} and {@code isAnswered}, ported from
 * {@code app/src/domain/grading.ts}.
 *
 * <p>This is the one place the backend does more than persist what the frontend
 * already computed. Today an answer is graded entirely in the browser, so XP is
 * whatever the client claims it is; once completion goes through
 * {@code POST /api/progress/lessons/{id}/complete}, the server re-grades
 * independently and only a passing grade moves the number.
 *
 * <p>The functions are pure and the frontend's Vitest cases come over as JUnit,
 * so the two graders cannot drift silently — see
 * {@code GradingServiceTest}.
 */
@Service
public class GradingService {

    /**
     * {@code norm} — trim, then lowercase and strip punctuation unless the
     * author explicitly turned those off, then collapse whitespace.
     *
     * <p>Note the {@code != false} tests rather than {@code == true}: a missing
     * rules object means "apply both", which is what the TypeScript's
     * {@code !rules || rules.lowercase !== false} says. Reading it as
     * "apply only when asked" would silently make every free-text answer
     * case-sensitive.
     */
    public String norm(String value, JsonNode rules) {
        String out = (value == null ? "" : value).trim();
        boolean lowercase = rules == null || !rules.path("lowercase").isBoolean() || rules.path("lowercase").asBoolean();
        boolean stripPunctuation = rules == null || !rules.path("stripPunctuation").isBoolean()
                || rules.path("stripPunctuation").asBoolean();
        if (lowercase) {
            out = out.toLowerCase();
        }
        if (stripPunctuation) {
            out = out.replaceAll("[.,!?;:'\"()]", "");
        }
        return out.replaceAll("\\s+", " ");
    }

    /**
     * True when the answer is correct for this card.
     *
     * <p>{@code essay} and {@code rubric} always pass, exactly as the frontend
     * has them: nobody can auto-grade an essay. That is a real limitation, not
     * an oversight — XP on an essay is gated on having answered, not on
     * quality. See {@link #isAnswered} for the gate that does apply, and
     * SPRINGBOOT-MIGRATION.md section 3 for why faking a quality check here
     * would be worse than admitting it.
     */
    public boolean gradeCard(CardDto card, JsonNode answer) {
        String type = card.type();
        JsonNode payload = card.payload();
        if (type == null || "text".equals(type)) {
            return true;
        }
        return switch (type) {
            case "mcq" -> answer != null && answer.isInt()
                    && answer.asInt() == payload.path("correctIndex").asInt(-1);
            case "gap_fill" -> isGapFillCorrect(payload.path("blanks"), answer);
            case "drag_order" -> isIdentityOrder(answer, payload.path("tokens").size());
            case "match" -> isCompleteMatch(answer, payload.path("pairs").size());
            case "free_text" -> anyAccepted(payload.path("accept"), answer, payload.path("normalize"));
            // Always default normalization, unlike free_text — not author-configurable,
            // since the whole point of this type is word-based, whitespace-insensitive matching.
            case "translate_si_en" -> anyAccepted(payload.path("accept"), answer, null);
            case "write_in_front" -> isWriteInFrontCorrect(payload.path("items"), answer);
            case "select_in_front" -> isSelectInFrontCorrect(payload.path("items"), answer);
            case "sentence_build" -> isSentenceBuildCorrect(payload.path("parts"), answer);
            case "multi_select" -> isExactSet(answer, payload.path("correctIndexes"));
            // Self-assessed, never auto-graded.
            case "essay", "rubric" -> true;
            default -> true;
        };
    }

    /**
     * {@code isAnswered} — whether the learner engaged with the card at all.
     *
     * <p>This is the real gate for the two ungradeable types: an essay needs
     * non-empty text, a rubric needs nothing, mirroring the frontend exactly.
     */
    public boolean isAnswered(CardDto card, JsonNode answer) {
        String type = card.type();
        if (type == null) {
            return true;
        }
        return switch (type) {
            case "drag_order" -> answer != null && answer.isArray() && !answer.isEmpty();
            case "match" -> answer != null && answer.path("pairs").size() > 0;
            case "free_text", "essay", "translate_si_en" -> answer != null && !answer.asText("").trim().isEmpty();
            // At least one blank filled is enough to enable Check — same
            // lenient gate as `match`'s "at least one pair" — gradeCard is
            // what actually requires every blank to be correct.
            case "gap_fill" -> isAnyBlankFilled(answer);
            case "mcq" -> answer != null && !answer.isNull();
            case "write_in_front" -> isAnyValueFilled(answer);
            case "select_in_front" -> isAnyChoiceMade(answer);
            case "sentence_build" -> isAnyValueFilled(answer);
            case "multi_select" -> answer != null && answer.isArray() && !answer.isEmpty();
            // A rubric is a self-check, not a gate — it never blocks moving on.
            case "rubric" -> true;
            default -> true;
        };
    }

    /** A text card is not a question; only interactive cards are graded. */
    public boolean isInteractive(CardDto card) {
        return card.type() != null && !"text".equals(card.type());
    }

    private boolean anyAccepted(JsonNode accept, JsonNode answer, JsonNode rules) {
        return anyAcceptedText(accept, answer == null ? "" : answer.asText(""), rules);
    }

    private boolean anyAcceptedText(JsonNode accept, String given, JsonNode rules) {
        if (accept == null || !accept.isArray()) {
            return false;
        }
        String normGiven = norm(given, rules);
        for (JsonNode candidate : accept) {
            if (norm(candidate.asText(""), rules).equals(normGiven)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Every blank (the payload's {@code blanks} array) must have its own
     * accepted answer, matched with the same default normalization
     * {@code gap_fill} has always used — not per-blank configurable.
     */
    private boolean isGapFillCorrect(JsonNode blanksSpec, JsonNode answer) {
        if (!blanksSpec.isArray() || blanksSpec.isEmpty()) {
            return false;
        }
        JsonNode blanksAnswer = answer == null ? null : answer.path("blanks");
        for (int i = 0; i < blanksSpec.size(); i++) {
            String given = blanksAnswer == null ? "" : blanksAnswer.path(String.valueOf(i)).asText("");
            if (!anyAcceptedText(blanksSpec.get(i).path("accept"), given, null)) {
                return false;
            }
        }
        return true;
    }

    /** Every item must have its own accepted answer typed in, default normalization. */
    private boolean isWriteInFrontCorrect(JsonNode items, JsonNode answer) {
        if (!items.isArray() || items.isEmpty()) {
            return false;
        }
        JsonNode values = answer == null ? null : answer.path("values");
        for (int i = 0; i < items.size(); i++) {
            String given = values == null ? "" : values.path(i).asText("");
            if (!anyAcceptedText(items.get(i).path("accept"), given, null)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Each of the four parts (subject, verb, object, rest) must match one of its
     * accepted answers; a part with no accepted answers must be left blank.
     */
    private boolean isSentenceBuildCorrect(JsonNode parts, JsonNode answer) {
        if (!parts.isArray() || parts.isEmpty()) {
            return false;
        }
        JsonNode values = answer == null ? null : answer.path("values");
        for (int i = 0; i < parts.size(); i++) {
            String given = values == null ? "" : values.path(i).asText("");
            boolean hasAccepted = false;
            for (JsonNode candidate : parts.get(i).path("accept")) {
                if (!norm(candidate.asText(""), null).isEmpty()) {
                    hasAccepted = true;
                    break;
                }
            }
            boolean ok = hasAccepted
                    ? anyAcceptedText(parts.get(i).path("accept"), given, null)
                    : norm(given, null).isEmpty();
            if (!ok) {
                return false;
            }
        }
        return true;
    }

    /** Every item must have its own correct option picked; an unpicked item (-1 / missing) is wrong. */
    private boolean isSelectInFrontCorrect(JsonNode items, JsonNode answer) {
        if (!items.isArray() || items.isEmpty()) {
            return false;
        }
        JsonNode choices = answer == null ? null : answer.path("choices");
        for (int i = 0; i < items.size(); i++) {
            int correct = items.get(i).path("correctIndex").asInt(-1);
            int given = choices == null ? -1 : choices.path(i).asInt(-1);
            if (correct < 0 || given != correct) {
                return false;
            }
        }
        return true;
    }

    private boolean isAnyChoiceMade(JsonNode answer) {
        if (answer == null) {
            return false;
        }
        for (JsonNode c : answer.path("choices")) {
            if (c.isInt() && c.asInt() >= 0) {
                return true;
            }
        }
        return false;
    }

    private boolean isAnyValueFilled(JsonNode answer) {
        if (answer == null) {
            return false;
        }
        for (JsonNode v : answer.path("values")) {
            if (!v.asText("").trim().isEmpty()) {
                return true;
            }
        }
        return false;
    }

    private boolean isAnyBlankFilled(JsonNode answer) {
        if (answer == null) {
            return false;
        }
        JsonNode blanks = answer.path("blanks");
        Iterator<String> names = blanks.fieldNames();
        while (names.hasNext()) {
            if (!blanks.path(names.next()).asText("").trim().isEmpty()) {
                return true;
            }
        }
        return false;
    }

    /**
     * Drag-to-order is graded as "the tokens are back in their authored
     * order" — the answer is a permutation of indices, and it is correct when
     * it is the identity permutation of the right length.
     */
    private boolean isIdentityOrder(JsonNode answer, int tokenCount) {
        if (answer == null || !answer.isArray() || answer.size() != tokenCount) {
            return false;
        }
        for (int i = 0; i < answer.size(); i++) {
            if (!answer.get(i).isInt() || answer.get(i).asInt() != i) {
                return false;
            }
        }
        return true;
    }

    /** Every left item paired with the right item at the same index. */
    private boolean isCompleteMatch(JsonNode answer, int pairCount) {
        if (pairCount == 0 || answer == null) {
            return false;
        }
        JsonNode pairs = answer.path("pairs");
        for (int i = 0; i < pairCount; i++) {
            if (pairs.path(String.valueOf(i)).asInt(-1) != i) {
                return false;
            }
        }
        return true;
    }

    /** Multi-select is an exact set match — no partial credit, same as the client. */
    private boolean isExactSet(JsonNode answer, JsonNode correctIndexes) {
        Set<Integer> want = new HashSet<>();
        if (correctIndexes != null && correctIndexes.isArray()) {
            correctIndexes.forEach(node -> want.add(node.asInt()));
        }
        Set<Integer> got = new HashSet<>();
        if (answer != null && answer.isArray()) {
            answer.forEach(node -> got.add(node.asInt()));
        }
        // Sizes are compared on the raw arrays as well as the sets so a
        // duplicated index cannot pad an otherwise-short answer.
        int answerSize = answer != null && answer.isArray() ? answer.size() : 0;
        return answerSize == want.size() && got.equals(want);
    }
}
