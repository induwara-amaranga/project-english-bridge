# Englisher — Spring Boot backend

The API described by [SPRINGBOOT-MIGRATION.md](../SPRINGBOOT-MIGRATION.md),
built. Java 21, Spring Boot 3.3, PostgreSQL, Flyway, Spring Security + JWT.

**The React app under `../app` is untouched.** This server stands alone and
serves exactly the JSON shapes `app/src/domain/types.ts` already declares, so
pointing the frontend at it later is the storage-layer rewrite that document's
Phase 4 describes — not a redesign.

---

## Run it

You need a PostgreSQL database and one environment variable.

```bash
# 1. Database. Either use the compose file:
docker compose up -d db

#    ...or create it in a PostgreSQL you already run:
#    createdb englisher
#    psql -c "create user englisher with password 'englisher'; \
#             grant all privileges on database englisher to englisher;"

# 2. Run. The dev profile supplies a throwaway signing key and a default admin.
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

The API comes up on <http://localhost:8080>, Swagger UI on
<http://localhost:8080/swagger-ui.html>.

On first boot it seeds the 8-stage curriculum and, under the `dev` profile, an
admin account (`admin@englisher.test` / `admin12345`).

### Pointing at a different database

Every connection setting is an environment variable, so nothing is hardcoded:

| Variable | Default |
|---|---|
| `ENGLISHER_DB_URL` | `jdbc:postgresql://localhost:5432/englisher` |
| `ENGLISHER_DB_USER` | `englisher` |
| `ENGLISHER_DB_PASSWORD` | `englisher` |
| `ENGLISHER_PORT` | `8080` |
| `ENGLISHER_JWT_SECRET` | *(none — required outside `dev`)* |
| `ENGLISHER_ADMIN_PASSWORD` | *(none — no admin is seeded without it)* |
| `ENGLISHER_ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:4173` |

Two of those have no default on purpose. `ENGLISHER_JWT_SECRET` is the token
signing key: a shipped default would let anyone holding the source mint an admin
token, so the app refuses to start without one (32 bytes minimum). And no admin
account is seeded unless you set a password, because a well-known admin login on
a reachable server is worse than having no admin account at all.

## Test it

```bash
./mvnw test      # 26 unit tests, no database needed
./mvnw verify    # + 25 integration tests against a real PostgreSQL
```

`verify` starts a real `postgres` binary in a temp directory
([zonky embedded-postgres](https://github.com/zonkyio/embedded-postgres)) rather
than using Testcontainers, so it needs no Docker daemon. Swapping to
Testcontainers later touches one file, `AbstractPostgresIT`.

The unit tests are not new tests — they are the frontend's own Vitest cases
(`domain/grading.test.ts`, `domain/curriculum.test.ts`) carried over with the
same inputs and expected outputs, so the two implementations of `gradeCard` and
`repairUnlocks` cannot drift apart silently.

---

## What it serves

| Method & path | Role | Frontend counterpart |
|---|---|---|
| `POST /api/auth/signup` | public | `useAuth().signUp` — plus onboarding's answers |
| `POST /api/auth/signin` | public | `useAuth().signIn` |
| `POST /api/auth/refresh` | refresh cookie | new |
| `POST /api/auth/signout` | any | `useAuth().signOut` |
| `GET /api/auth/me` | authenticated | `AuthUser` |
| `GET`/`PUT /api/me/preferences` | authenticated | onboarding Goal/Language/Streak, Profile's toggle |
| `GET /api/curriculum` | authenticated | `getCurriculum()` |
| `PUT /api/admin/curriculum` | admin | `setCurriculum()` |
| `GET /api/admin/analytics` | admin | `ANALYTICS` |
| `GET /api/progress` | student | `getProgress()` |
| `POST /api/progress/lessons/{id}/complete` | student | `markLessonComplete()`, re-graded server-side |
| `POST /api/progress/placement` | student | `setCurrentStage()` |
| `GET /api/placement` | public | `PlacementTest.tsx`'s hardcoded `QUESTIONS` |
| `GET /api/parent-links` | student | `useParentLink()` |
| `POST /api/parent-links/invite` | student | `ParentAccess`'s `onInvite` |
| `POST /api/parent-links/resend` | student | `onResend` |
| `DELETE /api/parent-links` | student | `onCancel` / `onRevoke` |
| `POST /api/parent-links/accept?token=` | public | replaces "Simulate the parent accepting" |
| `GET /api/parent/dashboard` | parent | `ParentDashboard` |
| `GET`/`PUT /api/submissions/{cardId}` | student | new — the `/write/*` pages' text |

Note the role split on parent access, which mirrors the comment in `useAuth.tsx`:
the **child** manages the invitation, so `/api/parent-links/*` is student-gated;
only the dashboard is parent-gated.

---

## Things worth knowing before you change it

**The seed curriculum is generated, not typed.**
`src/main/resources/seed/curriculum-default.json` was produced by compiling
`app/src/domain/curriculum.ts` and serialising `CURRICULUM_DEFAULT` through
`repairUnlocks` and `normaliseCurriculum`. That is why
`CurriculumNormaliserTest.theSeedDocumentIsAlreadyNormalised` exists: it fails
the moment the Java port disagrees with the TypeScript that generated the file.
Regenerate it the same way rather than hand-editing.

**Learner data references content by slug, never by foreign key.**
`PUT /api/admin/curriculum` is a whole-document replace, so every stage, lesson,
exercise and card row is deleted and recreated on each admin save. `progress`,
`submissions` and `parent_links` therefore store slugs — an `ON DELETE CASCADE`
into the content tables would wipe a learner's history every time an admin
pressed Save.

**Grading is the one place the server does more than persist.**
`GradingService` is a port of `domain/grading.ts`, and
`POST /api/progress/lessons/{id}/complete` re-grades the submitted answers
before awarding XP. Two of the eight card types (`essay`, `rubric`) always pass,
exactly as the frontend has them — nobody can auto-grade an essay. The honest
rule is "essay requires non-empty text, rubric requires nothing"; real
assessment belongs in a teacher-review queue, not in `gradeCard`.

**Roles are uppercase here, lowercase on the wire.**
Spring Security's `hasRole` wants `STUDENT`; `useAuth.tsx` wants `student`.
`Role.wire()` is the one conversion point, so the JSON matches the TypeScript
union the unchanged frontend switches on.

**Role is no longer client-chosen.** `useAuth.signIn(email, role)` let the
browser pick; against a real backend that would mean signing in as an admin by
passing a different string. Role now comes from the account, and
`POST /api/auth/signup` refuses `admin` outright.

## Deliberate gaps

These are not oversights — each is called out where it matters in the code:

- **Invitations are logged, not sent.** `ParentLinkService.deliver()` writes the
  token to the log. Wiring SES/Twilio replaces that one method; the compose file
  already includes Mailpit for the intermediate step.
- **`avgAccuracyPct` and `avgSessionMin` report 0.** Nothing records per-answer
  outcomes or session length yet — only pass/fail at lesson granularity.
  Reporting the completion figure twice would be a lie dressed as data.
- **The `/write/*` pages have storage but no caller.** `PUT /api/submissions/{cardId}`
  works and the parent dashboard reads it, but the React app still holds that
  text in `useState` and its Submit button is a `<Link>`. Connecting it is a
  frontend change, and the frontend was explicitly out of scope here.
- **Placement questions are served but still hardcoded client-side.**
  `GET /api/placement` exists; `PlacementTest.tsx` has not been repointed at it.
  The seeded stage names carry that file's existing drift from the curriculum
  (`Adjectives & Prepositions` vs `Adjectives, Adverbs & Prepositions`) on
  purpose — see the comment in `V2__seed_placement.sql`.
