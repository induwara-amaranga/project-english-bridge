-- Englisher schema. Mirrors app/src/domain/types.ts — see SPRINGBOOT-MIGRATION.md §2.
--
-- Two naming departures from the TypeScript, forced by SQL reserved words:
--   Stage.order  -> ord
--   Card.column  -> col
-- The DTO layer maps them back, so the JSON on the wire is unchanged.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Accounts
-- ---------------------------------------------------------------------------
create table users (
  id            uuid primary key default gen_random_uuid(),
  email         text        not null,
  password_hash text        not null,
  name          text        not null,
  role          text        not null check (role in ('STUDENT', 'PARENT', 'ADMIN')),
  -- Onboarding's three answers (goal, languageMode, streakGoalDays). Read as a
  -- blob, never queried on — see SPRINGBOOT-MIGRATION.md section 2.
  preferences   jsonb       not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
-- Email is the login identity; compared case-insensitively.
create unique index users_email_key on users (lower(email));

create table refresh_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid        not null references users (id) on delete cascade,
  token_hash text        not null unique,
  issued_at  timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);
create index refresh_tokens_user_idx on refresh_tokens (user_id);

-- ---------------------------------------------------------------------------
-- Curriculum content
--
-- Slugs are the ids the frontend knows (tenses, word-order, wo-1) and are
-- stable / never reused. Rows carry surrogate uuids only so the child tables
-- have something narrow to reference; nothing outside this block joins on
-- them, because PUT /api/admin/curriculum replaces the whole document.
-- ---------------------------------------------------------------------------
create table curriculum_meta (
  id         int primary key default 1 check (id = 1),
  version    int         not null,
  updated_at timestamptz not null default now(),
  updated_by uuid        references users (id)
);

create table stages (
  slug        text primary key,
  ord         int     not null,
  title       jsonb   not null,
  theme       jsonb   not null,
  unlock      jsonb   not null,
  placeholder boolean not null default false
);
create index stages_ord_idx on stages (ord);

create table lessons (
  id          uuid primary key default gen_random_uuid(),
  stage_slug  text  not null references stages (slug) on delete cascade,
  slug        text  not null,
  ord         int   not null,
  kind        text  not null check (kind in ('teach', 'practice')),
  title       jsonb not null,
  explanation jsonb not null default '{"en":"","si":""}'::jsonb,
  unique (stage_slug, slug)
);
create index lessons_stage_idx on lessons (stage_slug, ord);

create table exercises (
  id        uuid primary key default gen_random_uuid(),
  lesson_id uuid  not null references lessons (id) on delete cascade,
  slug      text  not null,
  ord       int   not null,
  type      text  not null,
  prompt    jsonb not null,
  payload   jsonb not null default '{}'::jsonb,
  feedback  jsonb not null,
  unique (lesson_id, slug)
);
create index exercises_lesson_idx on exercises (lesson_id, ord);

-- One table for both lesson cards and exercise cards, discriminated by
-- holder_type — simpler than two nullable FKs (SPRINGBOOT-MIGRATION.md
-- section 5, Phase 2). payload stays JSONB rather than eight payload tables.
create table cards (
  id          uuid primary key default gen_random_uuid(),
  holder_type text    not null check (holder_type in ('LESSON', 'EXERCISE')),
  holder_id   uuid    not null,
  slug        text    not null,
  ord         int     not null,
  card_type   text    not null check (card_type in
                ('text', 'mcq', 'gap_fill', 'drag_order', 'match',
                 'free_text', 'multi_select', 'essay', 'rubric')),
  col         text    not null check (col in ('left', 'right', 'full')),
  -- Absent in JSON means "true" for legacy content, so the column is nullable
  -- and the DTO omits it when null.
  border      boolean,
  body        jsonb,
  prompt      jsonb,
  payload     jsonb,
  feedback    jsonb,
  unique (holder_type, holder_id, slug)
);
create index cards_holder_idx on cards (holder_type, holder_id, ord);

-- ---------------------------------------------------------------------------
-- Learner state
--
-- Everything below references content by *slug*, never by FK into the tables
-- above: an admin save rebuilds the whole content document, and a cascade from
-- that must never delete a learner's progress or writing.
-- ---------------------------------------------------------------------------
create table progress (
  user_id              uuid primary key references users (id) on delete cascade,
  xp                   int         not null default 0,
  streak_days          int         not null default 0,
  last_active          timestamptz not null default now(),
  -- { "<stageSlug>": ["<lessonSlug>", ...] } — matches Progress.completedLessonIds
  completed_lesson_ids jsonb       not null default '{}'::jsonb,
  current_stage_slug   text        not null,
  current_stage_pct    int         not null default 0 check (current_stage_pct between 0 and 100),
  updated_at           timestamptz not null default now()
);

create table parent_links (
  id             uuid primary key default gen_random_uuid(),
  child_user_id  uuid        not null references users (id) on delete cascade,
  parent_user_id uuid        references users (id) on delete set null,
  contact        text        not null,
  channel        text        not null check (channel in ('email', 'phone')),
  status         text        not null check (status in ('invited', 'accepted', 'revoked')),
  invite_token   text        not null unique,
  invited_at     timestamptz not null default now(),
  accepted_at    timestamptz,
  expires_at     timestamptz not null
);
-- A child has at most one live invitation at a time (ParentLink is a single
-- object in the frontend, not a list).
create unique index parent_links_one_live_per_child
  on parent_links (child_user_id) where status <> 'revoked';
create index parent_links_parent_idx on parent_links (parent_user_id);

create table submissions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid        not null references users (id) on delete cascade,
  stage_slug   text        not null,
  lesson_slug  text        not null,
  card_slug    text        not null,
  body         text        not null default '',
  -- Rubric checklist state, keyed "<sectionIndex>-<itemIndex>" — the same shape
  -- grading.ts's RubricAnswer uses.
  rubric_ticks jsonb       not null default '{}'::jsonb,
  status       text        not null check (status in ('draft', 'submitted')),
  submitted_at timestamptz,
  updated_at   timestamptz not null default now(),
  unique (user_id, stage_slug, lesson_slug, card_slug)
);
create index submissions_user_idx on submissions (user_id, updated_at desc);

-- ---------------------------------------------------------------------------
-- Placement test — served rather than hardcoded in PlacementTest.tsx
-- ---------------------------------------------------------------------------
create table placement_questions (
  id      uuid primary key default gen_random_uuid(),
  ord     int   not null unique,
  stage   int   not null,
  type    text  not null check (type in ('choice', 'translate')),
  prompt  text  not null,
  options jsonb,
  correct text,
  sinhala text
);

create table placement_stage_copy (
  stage   int  primary key,
  name    text not null,
  message text not null
);
