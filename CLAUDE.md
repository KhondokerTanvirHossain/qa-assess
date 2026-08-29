# CLAUDE.md

Read this before every task. Full reasoning lives in `docs/PROJECT-CONTEXT.md`,
`docs/SUT-PLAN.md`, and `docs/DECISIONS.md`. This file is the operating rules.

---

## What this project is

An internal tool that runs a QA take-home assessment end to end and produces a
defensible ranked shortlist. Two halves, one codebase:

- **SUT** — a visually faithful clone of a production prescription screen with
  deliberate bugs planted in it. Fixture data, not a product.
- **Assessment tool** — candidate portal, embedded bug reporter, recruiter
  console with AI analysis and a leaderboard.

Scale: one recruiter, ~12 candidates per round, two rounds a year. There is no
maintenance capacity. **Optimise every decision for fewest moving parts, never
for elegance or scale.**

---

## Stack

Next.js App Router (TypeScript) · Tailwind · Supabase (Postgres + storage) ·
Anthropic API · Vercel.

One repo, one deploy, no separate services. **Server actions, not API routes.**
Analyzer uses `claude-sonnet-4-6`, temperature 0, JSON-only system prompt,
retry-once on parse failure.

Do not add a dependency that is not already in `package.json`. If a task seems
to need one, stop and say so instead.

---

## Directory layout

```
app/
  t/[token]/            candidate surfaces
    page.tsx            landing — rules, budget, TC/AC template, device warning
    app/                the SUT + docked reporter widget
    reports/            candidate's own reports — review, edit, soft delete
    done/               access ended
  console/              recruiter surfaces, behind middleware
    page.tsx            candidate list, bulk Analyze
    leaderboard/
    c/[id]/             detail, overrides, coverage matrix, narrative
    setup/              paste emails, set window + budget, generate tokens
components/
  sut/                  the ported prescription component. Design is the spec.
lib/
  bugKey.ts             answer key + rubric. Single source of truth.
  scoring.ts            Stage 2. Pure functions only.
  sut/                  SUT state: types, context, reducer, persistence, seed
  supabase/             client + typed queries
docs/                   context, plan, decision records
```

---

## The rules that matter

### 1. Two-stage scoring is non-negotiable

- **Stage 1 (AI)** — one report in, one JSON object out. Never sees other
  reports, other candidates, or running totals. Never ranks anything.
- **Stage 2 (code)** — pure functions over Stage 1 output. Same inputs, same
  score, every time.
- **Stage 3 (AI, non-scoring)** — one narrative call per candidate. Never
  enters the composite.

**No LLM in the math.** If a scoring function calls a model, it is wrong.

### 2. Never break the happy path

Planted bugs are wrong behaviour, never dead ends. A candidate must always be
able to complete a prescription. No crashes, no blank screens, no buttons that
do nothing.

A menu left with no items is a dead end — remove the trigger, don't let it open
empty.

### 3. The persistence boundary

Two layers, and they never mix:

- **localStorage** — candidate-scoped, disposable, per-device. All SUT state:
  prescriptions, patients, libraries, templates. Keyed by candidate token.
- **Postgres** — assessment-scoped, permanent. Reports, analyses, overrides,
  sessions, submissions.

A report write must never depend on localStorage having survived. SUT state
must never round-trip through Postgres. The SUT has **no backend, no API, no
fetch calls.**

### 4. Design fidelity is a hard constraint

The SUT must look identical to the production app it clones. The supplied TSX
is the spec. Do not restyle, do not "improve" spacing, do not swap components
for cleaner equivalents, do not modernise patterns.

If a change alters how the app looks, stop and say so before making it.

### 5. The fixture must be clean

Every defect in the SUT is one that was planted deliberately. An accidental
bug costs the recruiter twelve manual adjudications. Test the happy path before
declaring a task done.

### 6. One bug = one commit

Planted bugs go in as ordinary code, one commit per bug, tagged with its ID
(`BUG-07`). No feature flags, no toggle objects. `git revert` is the mechanism.

---

## Conventions

- Types over interfaces. No `any`.
- Server actions for all writes. No client-side Supabase keys.
- SUT state flows through one context provider, not props. Sections nest 5–6
  deep; prop-threading would touch ~40 components and spread a planted bug
  across a chain instead of isolating it.
- localStorage writes are **debounced**. Persisting on every keystroke produces
  input lag that reads as a defect and is not in the bug key.
- `data-module` attributes on every section wrapper and modal root. The
  vocabulary must match the `Module` type in `lib/bugKey.ts` exactly, or the
  coverage matrix compares two lists that do not line up.
- Screenshot and attachment uploads are async and never block a write.

---

## Do NOT

- Refactor anything outside the files a brief lists.
- Change the schema unless the brief says to.
- Add a dependency not already in `package.json`.
- Restyle or "clean up" the SUT.
- Put an LLM call inside `lib/scoring.ts`.
- Add fetch, API routes, or Supabase calls to the SUT.
- Write tests anywhere except `lib/scoring.ts`.
- Add auth, roles, or a user system. Candidate = token in URL. Console = one
  env-var password behind middleware.
- Build any of: automation-code grading, video proctoring, ATS integration,
  email sending, multi-recruiter accounts, candidate passwords, multi-tenancy,
  mobile-responsive candidate view, payment, analytics beyond the leaderboard.

---

## Scoring reference

Tier weights **1 / 3 / 8**, hand-tunable per bug in `bugKey.ts`.

```
detection = Σ weight of unique matched planted bugs
          / Σ weight of all non-honeypot bugs × 100
quality   = mean of three sub-scores across valid reports / 3 × 100
precision = valid reports / (valid + false positives) × 100

composite = 0.60 × detection + 0.25 × quality + 0.15 × precision
          + bonus (confirmed UNKNOWN_BUG × 3, cap 10)
```

Dedupe by `matched_bug_id` before summing. Soft-deleted reports are excluded
from the precision denominator. When a candidate has no valid reports, quality
and precision are **0, not NaN**.

**Honeypots never touch the composite.** They are a separate column, split into
reported-as-defect versus raised-as-question.

TC and AC scores are separate columns and are **never composited** into the
ranking.

---

## Definition of done

Before a real candidate is invited: run the whole thing twice, once as a strong
QA and once as a weak one.

- Strong run outranks weak run on composite
- Recruiter agrees with 80%+ of per-report classifications
- One candidate's submission yields a defensible written verdict in under
  5 minutes
