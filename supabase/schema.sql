-- QA Assess — schema
-- Run once in the Supabase SQL editor. Keep this file checked in as the record.
-- RLS is intentionally off: single-user internal tool, console behind an
-- env-var password, service-role key used only in server actions, no client
-- ever queries Supabase directly.

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- candidates
-- ─────────────────────────────────────────────────────────────

create type candidate_status as enum (
  'invited', 'in_progress', 'submitted', 'analyzed', 'reviewed'
);

create table candidates (
  id              uuid primary key default gen_random_uuid(),
  full_name       text not null,
  email           text not null,
  access_token    text not null unique,
  status          candidate_status not null default 'invited',

  -- Recruiter-set limits. Both are hard (DR-010).
  window_start    timestamptz not null,
  window_end      timestamptz not null,
  hours_budget    numeric(5,2) not null default 8,

  -- Manual grant when a heartbeat misfires. An input, not a cached result.
  bonus_minutes   integer not null default 0,

  created_at      timestamptz not null default now(),

  constraint window_order check (window_end > window_start)
);

create index on candidates (access_token);

-- ─────────────────────────────────────────────────────────────
-- sessions
-- Elapsed time is the sum over these rows. Never stored on candidates —
-- a cached total drifts from the rows it derives from.
-- ─────────────────────────────────────────────────────────────

create table sessions (
  id                 uuid primary key default gen_random_uuid(),
  candidate_id       uuid not null references candidates(id) on delete cascade,
  started_at         timestamptz not null default now(),
  last_heartbeat_at  timestamptz not null default now()
);

create index on sessions (candidate_id);

-- ─────────────────────────────────────────────────────────────
-- reports
-- Five candidate-written fields. Everything else auto-captured (DR-013).
-- Delete is soft; rows are retained as evidence but excluded from scoring.
-- ─────────────────────────────────────────────────────────────

create table reports (
  id              uuid primary key default gen_random_uuid(),
  candidate_id    uuid not null references candidates(id) on delete cascade,

  title           text not null,
  steps           text not null,
  expected        text not null,
  actual          text not null,
  severity        text not null check (severity in ('Critical','High','Medium','Low')),

  -- Auto-captured. Module comes from data-module attributes, never a dropdown.
  module          text,
  screenshot_url  text,          -- auto-capture only. Frozen at creation.
  attachments     text[] not null default '{}',   -- candidate uploads, max 3
  auto_context    jsonb not null default '{}',

  created_at      timestamptz not null default now(),
  edited_at       timestamptz,
  deleted_at      timestamptz
);

create index on reports (candidate_id);
create index on reports (candidate_id) where deleted_at is null;

-- ─────────────────────────────────────────────────────────────
-- analyses — Stage 1 output, one row per report
-- ─────────────────────────────────────────────────────────────

create table analyses (
  id                 uuid primary key default gen_random_uuid(),
  report_id          uuid not null unique references reports(id) on delete cascade,

  matched_bug_id     text not null,   -- 'BUG-07' | 'FALSE_POSITIVE' | 'UNKNOWN_BUG'
  match_confidence   numeric(3,2) not null check (match_confidence between 0 and 1),
  match_reasoning    text not null,

  q_reproducibility  smallint not null check (q_reproducibility between 0 and 3),
  q_clarity          smallint not null check (q_clarity between 0 and 3),
  q_severity         smallint not null check (q_severity between 0 and 3),
  quality_reasoning  text not null,

  flags              text[] not null default '{}',
  model_version      text not null,
  analyzed_at        timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- overrides — recruiter corrections. Never mutate analyses in place;
-- the AI's original call is how matcher accuracy gets measured.
-- ─────────────────────────────────────────────────────────────

create table overrides (
  id                 uuid primary key default gen_random_uuid(),
  report_id          uuid not null unique references reports(id) on delete cascade,

  matched_bug_id     text,
  q_reproducibility  smallint check (q_reproducibility between 0 and 3),
  q_clarity          smallint check (q_clarity between 0 and 3),
  q_severity         smallint check (q_severity between 0 and 3),
  is_false_positive  boolean,
  note               text,

  created_at         timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- submissions — TC/AC spreadsheet. Scored separately, never composited.
-- ─────────────────────────────────────────────────────────────

create table submissions (
  id             uuid primary key default gen_random_uuid(),
  candidate_id   uuid not null unique references candidates(id) on delete cascade,

  file_url       text not null,
  tc_score       numeric(5,2),
  ac_score       numeric(5,2),
  tc_reasoning   text,
  ac_reasoning   text,
  analyzed_at    timestamptz,

  created_at     timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- narratives — Stage 3. Read by the recruiter, never enters the composite.
-- ─────────────────────────────────────────────────────────────

create table narratives (
  id             uuid primary key default gen_random_uuid(),
  candidate_id   uuid not null unique references candidates(id) on delete cascade,
  body           text not null,
  model_version  text not null,
  created_at     timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- sut_events — optional, ship last. Route-level telemetry.
-- ─────────────────────────────────────────────────────────────

create table sut_events (
  id             uuid primary key default gen_random_uuid(),
  candidate_id   uuid not null references candidates(id) on delete cascade,
  event_type     text not null,
  route          text,
  payload        jsonb not null default '{}',
  created_at     timestamptz not null default now()
);

create index on sut_events (candidate_id);
