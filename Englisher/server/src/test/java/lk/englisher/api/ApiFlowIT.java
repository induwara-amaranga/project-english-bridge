package lk.englisher.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lk.englisher.auth.Role;
import lk.englisher.auth.UserEntity;
import lk.englisher.auth.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * End-to-end coverage of the whole API against a real PostgreSQL.
 *
 * <p>What this is really checking is the two claims the migration plan rests
 * on: that {@code GET /api/curriculum} serves exactly the JSON
 * {@code domain/types.ts} describes, and that XP cannot be forged by a client
 * that lies about its answers.
 */
class ApiFlowIT extends AbstractPostgresIT {

    @Autowired
    private ObjectMapper json;

    @Autowired
    private UserRepository users;

    @Autowired
    private PasswordEncoder passwords;

    // ------------------------------------------------------------------
    // Curriculum
    // ------------------------------------------------------------------

    /**
     * The shape contract. Every field the TypeScript declares must be present,
     * and the two optional ones ({@code placeholder}, {@code border}) must be
     * *absent* rather than null when unset — a null there would fail
     * {@code placeholder?: boolean} consumers that test truthiness.
     */
    @Test
    void curriculumIsServedInTheExactShapeTheReactAppExpects() {
        String token = signUpStudent("shape@test.lk").accessToken();
        JsonNode curriculum = get("/api/curriculum", token);

        assertThat(curriculum.get("version").asInt()).isEqualTo(7);
        assertThat(curriculum.get("stages")).hasSize(8);

        JsonNode tenses = curriculum.get("stages").get(0);
        assertThat(tenses.get("id").asText()).isEqualTo("tenses");
        assertThat(tenses.get("order").asInt()).isEqualTo(1);
        assertThat(tenses.get("title").get("en").asText()).isEqualTo("Tenses");
        assertThat(tenses.get("title").has("si")).isTrue();
        assertThat(tenses.get("theme").get("from").asText()).isEqualTo("#6EE7A8");
        assertThat(tenses.get("unlock").get("kind").asText()).isEqualTo("always");
        // `unlock` is a union: an 'always' rule carries no stageId at all.
        assertThat(tenses.get("unlock").has("stageId")).isFalse();
        // `placeholder?: boolean` — omitted, not null, on an authored stage.
        assertThat(tenses.has("placeholder")).isFalse();

        JsonNode placeholder = curriculum.get("stages").get(2);
        assertThat(placeholder.get("id").asText()).isEqualTo("adjectives-adverbs-prepositions");
        assertThat(placeholder.get("placeholder").asBoolean()).isTrue();
        assertThat(placeholder.get("lessons")).isEmpty();
        assertThat(placeholder.get("unlock").get("stageId").asText()).isEqualTo("complex-sentences");

        JsonNode lesson = tenses.get("lessons").get(0);
        assertThat(lesson.get("id").asText()).isEqualTo("word-order");
        assertThat(lesson.get("kind").asText()).isEqualTo("teach");
        assertThat(lesson.get("explanation").get("en").asText()).contains("Subject → Verb → Object");

        JsonNode exercise = lesson.get("exercises").get(0);
        assertThat(exercise.get("id").asText()).isEqualTo("wo-1");
        assertThat(exercise.get("type").asText()).isEqualTo("mcq");
        assertThat(exercise.get("payload").get("correctIndex").asInt()).isEqualTo(1);
        assertThat(exercise.get("payload").get("options")).hasSize(3);

        JsonNode card = exercise.get("cards").get(0);
        assertThat(card.get("id").asText()).isEqualTo("wo-1-c1");
        assertThat(card.get("type").asText()).isEqualTo("mcq");
        assertThat(card.get("column").asText()).isEqualTo("full");
        assertThat(card.get("feedback").get("correct").has("en")).isTrue();
    }

    /** The seed must survive a database round-trip unchanged. */
    @Test
    void theServedDocumentMatchesTheSeedByteForByte() throws Exception {
        String token = signUpStudent("roundtrip@test.lk").accessToken();
        JsonNode served = get("/api/curriculum", token);
        JsonNode seed = json.readTree(getClass().getClassLoader()
                .getResourceAsStream("seed/curriculum-default.json"));
        assertThat(served).isEqualTo(seed);
    }

    @Test
    void writingTheCurriculumIsAdminOnly() {
        String studentToken = signUpStudent("nope@test.lk").accessToken();
        JsonNode curriculum = get("/api/curriculum", studentToken);

        ResponseEntity<String> asStudent = exchange(HttpMethod.PUT, "/api/admin/curriculum",
                studentToken, curriculum, String.class);
        assertThat(asStudent.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        ResponseEntity<String> anonymous = exchange(HttpMethod.PUT, "/api/admin/curriculum",
                null, curriculum, String.class);
        assertThat(anonymous.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    /**
     * An admin save round-trips, and the server re-runs repairUnlocks — so a
     * document with a forward-pointing unlock comes back repaired rather than
     * stored broken.
     */
    @Test
    void adminSaveRoundTripsAndRepairsUnlocksServerSide() throws Exception {
        String adminToken = signInAsSeededAdmin("admin-save@test.lk");
        JsonNode curriculum = get("/api/curriculum", adminToken);

        var mutable = curriculum.deepCopy();
        // Point the first stage forward at the third — invalid.
        var brokenUnlock = json.createObjectNode();
        brokenUnlock.put("kind", "afterStage");
        brokenUnlock.put("stageId", curriculum.get("stages").get(2).get("id").asText());
        ((com.fasterxml.jackson.databind.node.ObjectNode) mutable.get("stages").get(0))
                .set("unlock", brokenUnlock);

        ResponseEntity<JsonNode> saved = exchange(HttpMethod.PUT, "/api/admin/curriculum",
                adminToken, mutable, JsonNode.class);
        assertThat(saved.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(saved.getBody().get("stages").get(0).get("unlock").get("kind").asText())
                .isEqualTo("always");

        // And it was persisted repaired, not just returned repaired.
        JsonNode reread = get("/api/curriculum", adminToken);
        assertThat(reread.get("stages").get(0).get("unlock").get("kind").asText()).isEqualTo("always");
        assertThat(reread.get("stages")).hasSize(8);
    }

    @Test
    void aDuplicateLessonIdIsRejected() throws Exception {
        String adminToken = signInAsSeededAdmin("dup@test.lk");
        JsonNode curriculum = get("/api/curriculum", adminToken);

        var mutable = curriculum.deepCopy();
        var lessons = (com.fasterxml.jackson.databind.node.ArrayNode)
                mutable.get("stages").get(0).get("lessons");
        lessons.add(lessons.get(0).deepCopy());

        ResponseEntity<JsonNode> response = exchange(HttpMethod.PUT, "/api/admin/curriculum",
                adminToken, mutable, JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody().get("code").asText()).isEqualTo("curriculum.duplicateId");
    }

    // ------------------------------------------------------------------
    // Auth
    // ------------------------------------------------------------------

    @Test
    void signupIssuesATokenAndSetsAnHttpOnlyRefreshCookie() {
        var headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        var body = """
                {"name":"Amaya","email":"cookie@test.lk","password":"supersecret1","role":"student"}
                """;
        ResponseEntity<JsonNode> response = rest.exchange("/api/auth/signup", HttpMethod.POST,
                new HttpEntity<>(body, headers), JsonNode.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().get("accessToken").asText()).isNotBlank();
        assertThat(response.getBody().get("user").get("role").asText()).isEqualTo("student");
        assertThat(response.getBody().get("home").asText()).isEqualTo("/learn");
        // No password field anywhere in the response.
        assertThat(response.getBody().toString()).doesNotContain("password");

        String cookie = response.getHeaders().getFirst(HttpHeaders.SET_COOKIE);
        assertThat(cookie).contains("englisher_refresh=").contains("HttpOnly");
    }

    @Test
    void signingUpAsAdminIsRefused() {
        var headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        var body = """
                {"name":"Sneaky","email":"sneaky@test.lk","password":"supersecret1","role":"admin"}
                """;
        ResponseEntity<JsonNode> response = rest.exchange("/api/auth/signup", HttpMethod.POST,
                new HttpEntity<>(body, headers), JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody().get("code").asText()).isEqualTo("auth.adminSignupClosed");
    }

    @Test
    void aWrongPasswordAndAnUnknownEmailAreIndistinguishable() {
        signUpStudent("real@test.lk");
        JsonNode wrongPassword = signInExpectingFailure("real@test.lk", "wrongpassword1");
        JsonNode noSuchUser = signInExpectingFailure("ghost@test.lk", "wrongpassword1");
        assertThat(wrongPassword.get("code").asText()).isEqualTo(noSuchUser.get("code").asText());
        assertThat(wrongPassword.get("message").asText()).isEqualTo(noSuchUser.get("message").asText());
    }

    /** Onboarding's answers survive signup, which is the whole point of storing them. */
    @Test
    void onboardingPreferencesArePersistedAndReadBack() {
        var headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        var body = """
                {"name":"Nimal","email":"prefs@test.lk","password":"supersecret1","role":"student",
                 "preferences":{"goal":"exam","languageMode":"both","streakGoalDays":30}}
                """;
        ResponseEntity<JsonNode> signup = rest.exchange("/api/auth/signup", HttpMethod.POST,
                new HttpEntity<>(body, headers), JsonNode.class);
        String token = signup.getBody().get("accessToken").asText();

        JsonNode prefs = get("/api/me/preferences", token);
        assertThat(prefs.get("languageMode").asText()).isEqualTo("both");
        assertThat(prefs.get("streakGoalDays").asInt()).isEqualTo(30);

        exchange(HttpMethod.PUT, "/api/me/preferences", token,
                json.createObjectNode().put("languageMode", "si"), JsonNode.class);
        assertThat(get("/api/me/preferences", token).get("languageMode").asText()).isEqualTo("si");
    }

    // ------------------------------------------------------------------
    // Progress and grading
    // ------------------------------------------------------------------

    @Test
    void aNewLearnerStartsAtZeroNotAtThePrototypesDemoFigures() {
        String token = signUpStudent("fresh@test.lk").accessToken();
        JsonNode progress = get("/api/progress", token);

        assertThat(progress.get("xp").asInt()).isZero();
        assertThat(progress.get("streakDays").asInt()).isZero();
        assertThat(progress.get("currentStageId").asText()).isEqualTo("tenses");
        assertThat(progress.get("currentStagePct").asInt()).isZero();
        assertThat(progress.get("lastActiveISO").asText()).isNotBlank();
    }

    /**
     * The reason grading moved server-side. A client that submits wrong answers
     * gets no XP no matter what it claims, because the server re-grades.
     */
    @Test
    void wrongAnswersEarnNoXpEvenThoughTheClientAskedToCompleteTheLesson() {
        String token = signUpStudent("cheat@test.lk").accessToken();

        var answers = json.createObjectNode();
        answers.put("wo-1-c1", 0);                       // correct index is 1
        answers.set("wo-2-c1", json.createArrayNode().add(1).add(0).add(2));

        var request = json.createObjectNode();
        request.put("stageId", "tenses");
        request.set("answers", answers);

        ResponseEntity<JsonNode> response = exchange(HttpMethod.POST,
                "/api/progress/lessons/word-order/complete", token, request, JsonNode.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().get("passed").asBoolean()).isFalse();
        assertThat(response.getBody().get("xpAwarded").asInt()).isZero();
        assertThat(get("/api/progress", token).get("xp").asInt()).isZero();
    }

    @Test
    void correctAnswersAwardXpExactlyOnce() {
        String token = signUpStudent("honest@test.lk").accessToken();

        var answers = json.createObjectNode();
        answers.put("wo-1-c1", 1);
        answers.set("wo-2-c1", json.createArrayNode().add(0).add(1).add(2));

        var request = json.createObjectNode();
        request.put("stageId", "tenses");
        request.set("answers", answers);

        ResponseEntity<JsonNode> first = exchange(HttpMethod.POST,
                "/api/progress/lessons/word-order/complete", token, request, JsonNode.class);
        assertThat(first.getBody().get("passed").asBoolean()).isTrue();
        assertThat(first.getBody().get("xpAwarded").asInt()).isEqualTo(10);
        assertThat(first.getBody().get("progress").get("xp").asInt()).isEqualTo(10);
        assertThat(first.getBody().get("progress").get("streakDays").asInt()).isEqualTo(1);

        // Replaying the same completion must not farm XP.
        ResponseEntity<JsonNode> second = exchange(HttpMethod.POST,
                "/api/progress/lessons/word-order/complete", token, request, JsonNode.class);
        assertThat(second.getBody().get("xpAwarded").asInt()).isZero();
        assertThat(get("/api/progress", token).get("xp").asInt()).isEqualTo(10);

        JsonNode completed = get("/api/progress", token).get("completedLessonIds");
        assertThat(completed.get("tenses")).hasSize(1);
        assertThat(completed.get("tenses").get(0).asText()).isEqualTo("word-order");
    }

    @Test
    void placementSetsTheStartingStage() {
        String token = signUpStudent("placed@test.lk").accessToken();
        exchange(HttpMethod.POST, "/api/progress/placement", token,
                json.createObjectNode().put("stageId", "translation"), JsonNode.class);
        assertThat(get("/api/progress", token).get("currentStageId").asText()).isEqualTo("translation");
    }

    @Test
    void placementRejectsAStageThatDoesNotExist() {
        String token = signUpStudent("badstage@test.lk").accessToken();
        ResponseEntity<JsonNode> response = exchange(HttpMethod.POST, "/api/progress/placement", token,
                json.createObjectNode().put("stageId", "not-a-stage"), JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().get("code").asText()).isEqualTo("progress.unknownStage");
    }

    @Test
    void aParentCannotReadTheProgressEndpoint() {
        String parentToken = signUpParent("nosy@test.lk").accessToken();
        ResponseEntity<String> response = exchange(HttpMethod.GET, "/api/progress", parentToken, null, String.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    // ------------------------------------------------------------------
    // Placement content
    // ------------------------------------------------------------------

    @Test
    void placementQuestionsAreServedAndMapOntoRealStageIds() {
        JsonNode placement = get("/api/placement", null);
        assertThat(placement.get("questions")).hasSize(6);
        assertThat(placement.get("questions").get(0).get("options")).hasSize(2);
        assertThat(placement.get("questions").get(5).get("type").asText()).isEqualTo("translate");
        assertThat(placement.get("questions").get(5).get("sinhala").asText()).isEqualTo("මම පාසැලට යනවා");
        // A translate question has no options/correct at all.
        assertThat(placement.get("questions").get(5).has("options")).isFalse();

        assertThat(placement.get("stages").get(0).get("stageId").asText()).isEqualTo("tenses");
        assertThat(placement.get("stages").get(4).get("stageId").asText()).isEqualTo("translation");
    }

    // ------------------------------------------------------------------
    // Parent link
    // ------------------------------------------------------------------

    /**
     * The flow the prototype could never actually test, because it was one
     * shared localStorage: a child invites, a *separate* parent account
     * accepts, and only then does the dashboard resolve.
     */
    @Test
    void aChildInvitesAParentWhoAcceptsAndSeesTheDashboard() {
        var child = signUpStudent("child@test.lk");
        var parent = signUpParent("parent@test.lk");

        // Before any invitation.
        assertThat(get("/api/parent-links", child.accessToken()).get("status").asText()).isEqualTo("none");

        // Dashboard is empty until a link exists.
        ResponseEntity<JsonNode> tooEarly = exchange(HttpMethod.GET, "/api/parent/dashboard",
                parent.accessToken(), null, JsonNode.class);
        assertThat(tooEarly.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);

        JsonNode invited = post("/api/parent-links/invite", child.accessToken(),
                json.createObjectNode().put("contact", "parent@test.lk"));
        assertThat(invited.get("status").asText()).isEqualTo("invited");
        assertThat(invited.get("channel").asText()).isEqualTo("email");
        assertThat(invited.get("invitedAt").asLong()).isPositive();

        String token = inviteTokenFor(child.userId());

        // Unauthenticated: the token is described, not consumed.
        JsonNode anonymous = post("/api/parent-links/accept?token=" + token, null, null);
        assertThat(anonymous.get("accepted").asBoolean()).isFalse();
        assertThat(anonymous.get("signupNeeded").asBoolean()).isTrue();
        assertThat(anonymous.get("childName").asText()).isEqualTo("Amaya");

        JsonNode accepted = post("/api/parent-links/accept?token=" + token, parent.accessToken(), null);
        assertThat(accepted.get("accepted").asBoolean()).isTrue();

        assertThat(get("/api/parent-links", child.accessToken()).get("status").asText()).isEqualTo("accepted");

        JsonNode dashboard = get("/api/parent/dashboard", parent.accessToken());
        assertThat(dashboard.get("childName").asText()).isEqualTo("Amaya");
        assertThat(dashboard.get("stageId").asText()).isEqualTo("tenses");
        assertThat(dashboard.get("stageName").asText()).isEqualTo("Tenses");
        assertThat(dashboard.get("totalStages").asInt()).isEqualTo(8);
        assertThat(dashboard.get("progress").get("xp").asInt()).isZero();
    }

    @Test
    void aStudentAccountCannotAcceptAnInvitation() {
        var child = signUpStudent("child2@test.lk");
        var otherStudent = signUpStudent("student2@test.lk");
        post("/api/parent-links/invite", child.accessToken(),
                json.createObjectNode().put("contact", "someone@test.lk"));

        ResponseEntity<JsonNode> response = exchange(HttpMethod.POST,
                "/api/parent-links/accept?token=" + inviteTokenFor(child.userId()),
                otherStudent.accessToken(), null, JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody().get("code").asText()).isEqualTo("parentLink.notAParent");
    }

    @Test
    void anInvalidContactIsRejected() {
        var child = signUpStudent("child3@test.lk");
        ResponseEntity<JsonNode> response = exchange(HttpMethod.POST, "/api/parent-links/invite",
                child.accessToken(), json.createObjectNode().put("contact", "not-a-contact"),
                JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().get("code").asText()).isEqualTo("parentLink.badContact");
    }

    /** Re-inviting reuses the single live row rather than accumulating rows. */
    @Test
    void reInvitingReplacesTheLiveInvitation() {
        var child = signUpStudent("child4@test.lk");
        post("/api/parent-links/invite", child.accessToken(),
                json.createObjectNode().put("contact", "first@test.lk"));
        String firstToken = inviteTokenFor(child.userId());

        post("/api/parent-links/invite", child.accessToken(),
                json.createObjectNode().put("contact", "0771234567"));
        String secondToken = inviteTokenFor(child.userId());

        assertThat(secondToken).isNotEqualTo(firstToken);
        JsonNode link = get("/api/parent-links", child.accessToken());
        assertThat(link.get("channel").asText()).isEqualTo("phone");

        // The superseded token is dead.
        ResponseEntity<JsonNode> stale = exchange(HttpMethod.POST,
                "/api/parent-links/accept?token=" + firstToken, null, null, JsonNode.class);
        assertThat(stale.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void revokingClearsTheLink() {
        var child = signUpStudent("child5@test.lk");
        post("/api/parent-links/invite", child.accessToken(),
                json.createObjectNode().put("contact", "gone@test.lk"));
        exchange(HttpMethod.DELETE, "/api/parent-links", child.accessToken(), null, JsonNode.class);
        assertThat(get("/api/parent-links", child.accessToken()).get("status").asText()).isEqualTo("none");
    }

    // ------------------------------------------------------------------
    // Submissions
    // ------------------------------------------------------------------

    @Test
    void aSubmissionAgainstANonWritableCardIsRejected() {
        String token = signUpStudent("writer@test.lk").accessToken();
        var body = json.createObjectNode();
        body.put("stageId", "tenses");
        body.put("lessonId", "word-order");
        body.put("body", "an essay");

        ResponseEntity<JsonNode> response = exchange(HttpMethod.PUT, "/api/submissions/wo-1-c1",
                token, body, JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().get("code").asText()).isEqualTo("submission.notWritable");
    }

    @Test
    void aSubmissionAgainstAnUnknownCardIsRejected() {
        String token = signUpStudent("writer2@test.lk").accessToken();
        var body = json.createObjectNode();
        body.put("stageId", "tenses");
        body.put("lessonId", "word-order");
        body.put("body", "an essay");

        ResponseEntity<JsonNode> response = exchange(HttpMethod.PUT, "/api/submissions/no-such-card",
                token, body, JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    // ------------------------------------------------------------------
    // Analytics
    // ------------------------------------------------------------------

    @Test
    void analyticsAggregatesRealLearnersAndIsAdminOnly() {
        String studentToken = signUpStudent("counted@test.lk").accessToken();
        ResponseEntity<String> asStudent = exchange(HttpMethod.GET, "/api/admin/analytics",
                studentToken, null, String.class);
        assertThat(asStudent.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        String adminToken = signInAsSeededAdmin("analytics-admin@test.lk");
        JsonNode analytics = get("/api/admin/analytics", adminToken);
        assertThat(analytics.get("activeLearners").asInt()).isPositive();
        assertThat(analytics.has("byStage")).isTrue();
    }

    /**
     * DataSeeder must not invent an admin password. A well-known default on a
     * deployed server would be worse than having no admin account.
     */
    @Test
    void noAdminIsSeededWhenNoPasswordIsConfigured() {
        assertThat(users.findByEmailIgnoringCase("admin@englisher.test")).isEmpty();
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private record Account(String accessToken, UUID userId) {
    }

    private Account signUpStudent(String email) {
        return signUp("Amaya", email, "student");
    }

    private Account signUpParent(String email) {
        return signUp("Parent", email, "parent");
    }

    private Account signUp(String name, String email, String role) {
        var headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        var body = json.createObjectNode();
        body.put("name", name);
        body.put("email", email);
        body.put("password", "supersecret1");
        body.put("role", role);

        ResponseEntity<JsonNode> response = rest.exchange("/api/auth/signup", HttpMethod.POST,
                new HttpEntity<>(body, headers), JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return new Account(response.getBody().get("accessToken").asText(),
                UUID.fromString(response.getBody().get("user").get("id").asText()));
    }

    private JsonNode signInExpectingFailure(String email, String password) {
        var headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        var body = json.createObjectNode();
        body.put("email", email);
        body.put("password", password);
        ResponseEntity<JsonNode> response = rest.exchange("/api/auth/signin", HttpMethod.POST,
                new HttpEntity<>(body, headers), JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        return response.getBody();
    }

    /**
     * Creates an admin directly, then signs in.
     *
     * <p>Deliberately not done through the API: there is no admin signup route,
     * which is the property {@link #signingUpAsAdminIsRefused} pins down.
     */
    private String signInAsSeededAdmin(String email) {
        users.save(new UserEntity(email, passwords.encode("supersecret1"), "Admin",
                Role.ADMIN, json.createObjectNode()));

        var headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        var body = json.createObjectNode();
        body.put("email", email);
        body.put("password", "supersecret1");
        ResponseEntity<JsonNode> response = rest.exchange("/api/auth/signin", HttpMethod.POST,
                new HttpEntity<>(body, headers), JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody().get("accessToken").asText();
    }

    /**
     * Reads the invite token straight from the database.
     *
     * <p>The API never returns it — it goes out by email in production and to
     * the log in dev — so a test that wants to act as the parent has to look it
     * up, exactly as a real parent reads it out of their inbox.
     */
    private String inviteTokenFor(UUID childUserId) {
        return parentLinks.findLiveByChild(childUserId).orElseThrow().getInviteToken();
    }

    @Autowired
    private lk.englisher.parent.ParentLinkRepository parentLinks;

    private JsonNode get(String path, String token) {
        ResponseEntity<JsonNode> response = exchange(HttpMethod.GET, path, token, null, JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody();
    }

    private JsonNode post(String path, String token, Object body) {
        ResponseEntity<JsonNode> response = exchange(HttpMethod.POST, path, token, body, JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody();
    }

    private <T> ResponseEntity<T> exchange(HttpMethod method, String path, String token,
                                           Object body, Class<T> type) {
        var headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (token != null) {
            headers.setBearerAuth(token);
        }
        return rest.exchange(path, method, new HttpEntity<>(body, headers), type);
    }
}
