-- ---------------------------------------------------------------------------
-- Per-question results — what the review screens read
--
-- `progress` records a lesson as complete; it says nothing about which question
-- the learner got wrong, which is why the admin analytics still report
-- avgAccuracyPct 0. This is that missing row: one per question attempted, so
-- "review my answers" survives a new device and a cleared browser.
--
-- Content is referenced by slug, never by a foreign key into stages/lessons/
-- exercises, for the same reason `submissions` and `progress` are: an admin's
-- whole-document save deletes and recreates every content row, and a cascade
-- from that would erase the learner's history on every Save.
-- ---------------------------------------------------------------------------
create table question_results (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references users (id) on delete cascade,
  stage_slug     text        not null,
  lesson_slug    text        not null,
  exercise_slug  text        not null,
  -- Position within the lesson at the time of the attempt: how a row is still
  -- placed in order after an admin renames or reorders the exercise it came from.
  exercise_index int         not null,
  -- Graded server-side from `answers` on write, never taken from the client.
  correct        boolean     not null,
  skipped        boolean     not null default false,
  -- The learner's answer per card id — the shape grading.ts's Answer union has,
  -- replayed into the card views on the review screen.
  answers        jsonb       not null default '{}'::jsonb,
  answered_at    timestamptz not null default now(),
  -- One row per question per learner: a retake replaces the earlier attempt
  -- rather than accumulating a history nothing reads.
  unique (user_id, stage_slug, lesson_slug, exercise_slug)
);

create index question_results_user_idx on question_results (user_id, answered_at desc);
create index question_results_lesson_idx on question_results (user_id, stage_slug, lesson_slug);
