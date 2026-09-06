# Figma ↔ code link

**File:** English Bridge — https://www.figma.com/design/rKyXwnpOEf0k442mEOY8of/English--bridge
**File key:** `rKyXwnpOEf0k442mEOY8of`
**Design page:** `0:1` (Page 1) — all screens, components and copy decks live on this one page.

To pull a screen: `get_design_context` with the file key + the node ID below.

## Screens

| Figma frame | Node ID | Code file |
|---|---|---|
| Homepage | `26:18` | [Duolingo Style Homepage.dc.html](Duolingo%20Style%20Homepage.dc.html) |
| Sign Up | `32:20` | [Sign Up.dc.html](Sign%20Up.dc.html) |
| Sign In | `69:50` | [Sign In.dc.html](Sign%20In.dc.html) |
| Onboarding Goal | `171:191` | [Onboarding Goal.dc.html](Onboarding%20Goal.dc.html) |
| Onboarding Language | `171:273` | [Onboarding Language.dc.html](Onboarding%20Language.dc.html) |
| Onboarding Reminders | `171:223` | [Onboarding Reminders.dc.html](Onboarding%20Reminders.dc.html) |
| Onboarding Walkthrough | `171:245` | [Onboarding Walkthrough.dc.html](Onboarding%20Walkthrough.dc.html) |
| Placement Test | `43:33` | [Placement Test.dc.html](Placement%20Test.dc.html) |
| Course Roadmap | `46:36` | [Course Roadmap.dc.html](Course%20Roadmap.dc.html) |
| Course Map | `53:63` | — (longer variant of Course Roadmap; no code file) |
| Stage Lessons | `44:33` | [Stage Lessons.dc.html](Stage%20Lessons.dc.html) |
| Lesson | `34:31` | [Lesson.dc.html](Lesson.dc.html) |
| Exercise | `36:30` | [Exercise.dc.html](Exercise.dc.html) |
| Guided Essay | `38:30` | [Guided Essay.dc.html](Guided%20Essay.dc.html) |
| Solo Essay | `39:31` | [Solo Essay.dc.html](Solo%20Essay.dc.html) |
| Formal Letter | `41:32` | [Formal Letter.dc.html](Formal%20Letter.dc.html) |
| Progress | `42:33` | [Progress.dc.html](Progress.dc.html) |
| Profile | `72:66` | [Profile.dc.html](Profile.dc.html) |
| Parent Dashboard | `37:30` | [Parent Dashboard.dc.html](Parent%20Dashboard.dc.html) |
| Course Dashboard (admin) | `85:71` | [Course Dashboard.dc.html](Course%20Dashboard.dc.html) |
| Course Editor (admin) | `85:72` | [Course Editor.dc.html](Course%20Editor.dc.html) |
| Parent Access — Invite | `127:117` | [Parent Access.dc.html](Parent%20Access.dc.html) (`status: none`) |
| Parent Access — Pending | `130:140` | [Parent Access.dc.html](Parent%20Access.dc.html) (`status: invited`) |
| Parent Access — Connected | `130:196` | [Parent Access.dc.html](Parent%20Access.dc.html) (`status: accepted`) |

Parent Access is one code file with three states, so it is three frames in Figma —
stacked vertically at x 11920, below Parent Dashboard.

## Components

| Component | Node ID | Notes |
|---|---|---|
| Button | `24:19` | variants: primary/secondary × lg/md |
| StepCard | `28:4` | "How it works" cards on the homepage |
| TextField | `30:22` | |
| Social button | `65:42` | uses `icon/google` `65:38`, `icon/facebook` `65:41` |
| Settings row | `73:66` | Profile screen |
| Admin/StatTile | `87:72` | |
| Admin/CheckRow | `88:89` | |
| Parent/StepRow | `125:145` | variants: done / current / todo |
| Parent/VisibilityRow | `125:152` | variants: allowed / blocked |
| Parent/ScreenHeader | `125:153` | purple bar; `Subtitle` text property per state |

The three `Parent/*` components live in the "Parent access components" group at
x 11920, y -3500.

Uploaded source art sits in `46:147` (mascot_elephant, mascot_spacesuit, book_lesson,
celebration_confetti, chat_bubble, envelope_letter, lock_unlocked, rocket_ship,
stage_bg_alien) and is mirrored in [assets/](assets/).

## Copy decks

`13:55` is a board of per-screen content specs (bilingual EN/SI value statements, CTA
labels, question banks, rubrics, microcopy) — one sticky per screen, `13:57`–`13:68`.
This is the source of truth for wording; the SI lines are marked as still needing
native-speaker review.

## Prototype flows

The page has three starting points, so each audience can be presented on its own:

| Flow | Starts at |
|---|---|
| Learner — onboarding to first exercise | Homepage `26:18` |
| Parent — invite and connect | Profile `72:66` |
| Admin — author a course | Course Dashboard `85:71` |

78 connections, mirroring the real `href`s in the code. Connections hang off the
actual buttons and rows rather than whole frames, so clicking empty space does
nothing — as in the app.

Two places where the prototype deliberately differs from the code:

- **Roadmap stages 6–8 open the writing screens directly.** In code they open Stage
  Lessons for that stage and the essay is reached from its checkpoint, but the file
  only has a stage-1 Stage Lessons frame, which would leave Guided/Solo/Formal Essay
  unreachable.
- **Parent Access — Connected has no inbound link.** The real transition happens when
  the parent accepts the invitation out of band, so there is no in-product button to
  attach. Reach it by selecting the frame directly when presenting.

## Fonts

The product uses **Baloo 2** for display and **Inter** for body, both available in Figma.

Sinhala is the exception: the code uses **Noto Sans Sinhala**, which Figma does not
have. Sinhala set in Inter renders as blank space rather than falling back, so SI text
in this file uses **Abhaya Libre** instead. It is a stand-in for layout only — the
shipped pages still load Noto Sans Sinhala.

## Known drift

- Course Map (`53:63`) has no code file.
- The Parent Access frames omit the "PROTOTYPE ONLY — simulate the parent accepting"
  block from the code; it is a prototype affordance, not a product surface.
- The Parent Access frames use design-system tokens where the code uses one-off hexes
  (`#FFF9EC`→`accent/soft`, `#F1FCF5`→`success/soft`, `#A8E6C0`→`success/light`,
  `#1B6B3A`→`success/deep`). Small colour shifts; the tokens are the intended source.
- Lesson (`34:31`) and Exercise (`36:30`) show representative card sets, not the
  literal contents of `CURRICULUM_DEFAULT` — the Exercise frame pairs a context text
  card with the MCQ card to show a multi-card exercise, which the seeded data does not
  yet contain.
- Figma has no CSS-grid equivalent, so the two-column grid is built as a vertical
  auto-layout of full-width rows, with side-by-side cards nested in a horizontal row.
  It matches visually; the responsive collapse below 760px exists only in code.
- The four Onboarding frames sit in a new row below the main flow (x `7480`–`11920`,
  y `2880`, under the Sign Up/Lesson/Exercise/Parent Dashboard columns) since they
  weren't part of the file when the original row was laid out. Unlike most of the file,
  they're bound to `Englisher/Color`/`Englisher/Layout` variables and the `Button`
  component (`24:19`) rather than one-off hex/pixel values — worth matching this
  pattern when new frames are added elsewhere.
- The onboarding frames deliberately have **no site nav / brand header**, because the
  `.dc.html` pages don't either — onboarding is a focused flow that starts straight at
  the 4-segment progress bar. Don't "fix" this to match the other screens.
- **The onboarding language toggle diverges from the rest of the file.** All four
  onboarding frames use a single pill showing the language you'd switch *to* (`සිං` /
  `EN`), and the four `.dc.html` pages mirror that. Every other screen (e.g. Placement
  Test `43:33`) instead uses a segmented `Toggle` of `Seg EN` / `Seg SI` at 42×30.
  Worth reconciling in one direction or the other.
- **"Onboarding Reminders" no longer sets a reminder.** The frame and
  `Onboarding Reminders.dc.html` are now a *streak-goal picker* (7 / 14 / 30 / 60 days);
  the notification toggle and 🔔 that the name refers to were removed. The frame name,
  file name and the `/onboarding/reminders` route in the proposed React flow all still
  say "reminders" — rename together if renaming at all.
- The Sinhala copy on the streak-goal options and on Reminders' heading/subheading was
  written to fill the SI half of the bilingual copy deck and has **not** had
  native-speaker review — same caveat the copy deck (`13:55`) already carries. Figma
  holds only the EN side of this screen.
- **Onboarding has no code-side route yet.** The four `.dc.html` prototypes exist and
  now have matching Figma frames, but nothing in `app/src/features/learner` wires them
  into the React app — see the "suggest an onboarding flow" thread for the proposed
  `/onboarding/*` routes.
