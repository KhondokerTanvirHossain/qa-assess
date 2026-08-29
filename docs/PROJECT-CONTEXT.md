# QA Assess — Project Context

Consolidated record of every question raised and answered. Supersedes the
original brief wherever the two conflict. Companion to `SUT-PLAN.md` and the
individual decision records DR-001 through DR-019.

**Status as of 2026-08-29:** all open questions closed except the bug key,
which is deferred until the SUT is running.

---

## 1. What this is

Two things built as one codebase.

**The SUT** — a visually faithful clone of the production prescription screen,
running entirely in the browser, seeded identically for every candidate, with
deliberate defects planted in it. It is fixture data, not a product.

**The assessment tool** — candidate portal, an embedded bug reporter, and a
recruiter console with AI analysis and a leaderboard.

The product is the measurement. Judge every decision by whether it makes
scoring faster, more consistent, or more defensible.

---

## 2. Scale and constraints

One recruiter. ~12 candidates per round, two rounds a year. No ongoing
maintenance capacity. Config files over admin UIs. Optimise for fewest moving
parts, never for elegance or scale.

**Non-goals, refuse these:** automation-code grading, video proctoring, ATS
integration, email sending, multi-recruiter accounts, roles and permissions,
candidate passwords, multi-tenancy, mobile-responsive candidate view, payment,
analytics beyond the leaderboard, randomised per-candidate bug variants.

---

## 3. Questions asked and answered

### Q1 — How coupled is the prescription TSX to its backend?

Not at all. 16,522 lines, zero fetch/axios/query-client/storage/env usage.
Only external coupling: `useNavigate` (one call site, line 15369), two SVG
imports, lucide-react.

**The real finding is the inverse.** The file is a design prototype, not an
application. Save and Preview & Complete have no handlers. Vitals are
uncontrolled inputs never read. New patients never enter the searchable pool.
Libraries are module consts. Template Save fires a toast and writes nothing;
template Insert fires a toast naming a specific item count and inserts nothing.

B10 step 2 is therefore a build, not a fork, and is the largest step in the
project. → **DR-001**

### Q2 — Time limit: hard cutoff or soft?

Neither, as originally framed. Three days calendar window plus a total hours
budget, both set by the recruiter, both hard limits. Candidates work across
multiple sessions by choice.

Budgets are checked **at login only**. A candidate with time remaining gets a
full session and may overrun; overrun is recorded and visible. No mid-session
lockout — that would either discard an in-flight report or require an
exemption path, and a tool that destroys a candidate's evidence fails at its
only job.

Clock runs on tab visibility, not interaction. Heartbeats every 30s, summed
server-side from arrival timestamps. Client-reported durations are never
trusted. Console can grant additional time. Accuracy is explicitly not
critical. → **DR-010**

### Q3 — Can candidates edit or delete reports before submit?

There is no submit. Reports post individually on write and stay editable for
as long as the candidate has access. `submitted` is an automatic transition,
set when the calendar window closes or the hours budget is exhausted.

**Analysis is gated on that status.** Nothing is analysable until access has
ended, so a late edit can never invalidate an AI call. All analysis happens in
one bulk pass per round. Delete is soft. → **DR-011**

### Q4 — Screenshots mandatory or optional?

Auto-capture is optional and opt-out, taken when the widget opens rather than
on submit so the page is frozen before typing begins. A failed capture never
blocks a report.

Candidates may additionally upload up to 3 images per report, stored in a
separate column. The auto-capture is unstaged evidence of the page state; an
upload is whatever the candidate chose to show. Those are different things and
are never merged. No video. → **DR-013, DR-014**

### Q5 — Same bug set across rounds, or regenerated?

Reused. No DB versioning; `lib/bugKey.ts` git history is the record. Accepts
leak risk — two rounds a year means the set will eventually be discussed
publicly. If a candidate scores anomalously high with suspiciously precise
reports, treat prior exposure as a live hypothesis. → **DR-015**

### Q6 — Practice bug?

Open. Not blocking.

### Q7 — Should the SUT have a backend?

No. Twelve candidates sharing one store see each other's data, and the fixture
drifts as they write to it, which makes detection non-comparable across
candidates. Comparability is the product.

Cost: server-side bug classes — races, stale reads, partial saves — cannot be
planted. Accepted knowingly. → **DR-005**

### Q8 — Embedded database (SQLite WASM / IndexedDB)?

No. A single JSON blob in localStorage keyed by candidate token, debounced on
write. A few dozen records never queried with more than a filter. Every layer
added is a layer a planted bug can accidentally land in. → **DR-008**

### Q9 — What do Save and Preview & Complete do?

Production opens a server-generated PDF in an embedded viewer inside a
"Prescription Preview" modal. The clone reproduces the modal shell and the A4
layout as HTML at 210×297mm. Download calls `window.print()`.

No PDF generation: no client-side library does Indic script shaping, and the
prescription is roughly half Bangla. → **DR-006**

### Q10 — What does the seed fixture contain?

3–4 patients with full demographics, populated drug/test/diagnosis/advice
libraries, 2–3 saved templates, **zero saved prescriptions**. The candidate
always composes the prescription themselves, because that path carries most
Tier-2 and Tier-3 bugs. → **DR-007**

### Q11 — Do prescriptions persist per patient?

Yes, keyed by patient. One draft plus a list of completed. Save persists
silently. Complete stamps `completed_at`, **locks the prescription
permanently**, and **increments the visit counter regardless of visit type**.
Both confirmed against production. → **DR-009**

### Q12 — Are the SUT and the reporter separate portals?

One Next.js app, one deploy. The reporter must be embedded inside the SUT —
a separate portal cannot capture route, form state, console errors, or a
screenshot of the app under test, which is the entire basis of auto-capture.

Review and edit live on their own route, styled deliberately unlike the SUT.
Every pixel of tooling rendered inside the SUT is something a bug-hunting
candidate will file a report against, and those reports are not in the bug
key. → **DR-012**

### Q13 — Module attribution: auto-captured or a dropdown?

Auto-captured. Route gives nothing here — the whole SUT is one route with ~40
modals on a single page. Mechanism: `data-module` attributes on section
wrappers and modal roots, plus a document-level `focusin` listener holding the
last matched ancestor.

Shown read-only in the widget ("Reporting from: Treatment"), which stops
candidates writing location context into Steps.

Module is the least reliable field to self-report and the one that drives both
coverage spread and the matcher's prior. → **DR-013**

### Q14 — The scoring formula

The original was Claude-generated and unexamined. Four faults, all fixed:
noise as a ratio punished thorough candidates; honeypots penalised correct
behaviour; quality carried 30% while being the least stable input; and 1/2/3
tier weights let ten Tier-1s outscore three Tier-3s.

Detection was always weight-based, never count-based. The lever was the weight
spread. → **DR-016**

### Q15 — Reporting strategy and developer-actionability

"Could a developer act on this?" is not a fourth sub-score — it is what
reproducibility and clarity are *for*. Same three sub-scores, rewritten
developer-facing.

Strategy cannot live in Stage 1, which sees one report with no siblings by
design. It comes from two places: deterministic Stage 2 metrics, and a
**Stage 3 narrative** — one non-scoring LLM call over the whole submission
producing four or five sentences on approach, clustering of misses, and
developer-usability. It never touches the composite, so it cannot destabilise
the ranking, and it is what makes the five-minute review target achievable.

### Q16 — Test cases and acceptance criteria

A separate assessment with no answer key. Kept permanently separate from the
detection composite, scoped to the Treatment section only, delivered as a
fixed-header .xlsx template with worked example rows. Mandatory, capped at 15
TC and 8 AC. One LLM call per sheet grading the whole set.
→ **DR-017, DR-019**

### Q17 — Leaderboard: bands or ranks?

Ranks and points. Banding was argued twice on the grounds that rank order
between adjacent candidates will not survive re-running the analyzer at n=12.
Overruled — it is a display choice, reversible without touching data.

When defending a decision to a candidate, cite the uncomposited columns, not
the rank gap. → **DR-018**

### Q18 — Zero-report candidates?

Quality and precision evaluate to 0, not NaN. Row renders a "no submission"
marker so a genuine zero is distinguishable from someone who never logged in.
→ **DR-018**

---

## 4. Measurement model

### Two-stage scoring — non-negotiable

**Stage 1, AI, per report.** One report in, one JSON object out. Never sees
other candidates, other reports, or running totals. Never ranks anyone.

**Stage 2, code, deterministic.** Pure functions over Stage 1 output. Same
inputs, same score, every time. No LLM in the math.

**Stage 3, AI, narrative, non-scoring.** One call per candidate over the whole
submission. Read by the recruiter; never enters the composite.

LLM ranking is unstable across runs and impossible to defend to a candidate.
Per-report classification is auditable.

### Stage 1 output contract

```json
{
  "matched_bug_id": "BUG-07 | FALSE_POSITIVE | UNKNOWN_BUG",
  "match_confidence": 0.0,
  "match_reasoning": "one sentence",
  "quality": {
    "reproducibility": 0,
    "expected_actual_clarity": 0,
    "severity_judgment": 0
  },
  "quality_reasoning": "one sentence",
  "flags": ["vague_steps", "no_expected_result"]
}
```

Sub-scores 0–3, all rubrics developer-facing:

- **reproducibility** — could a developer follow these steps and see it,
  without guessing?
- **expected_actual_clarity** — is the defect unambiguous, or must the
  developer infer what is wrong?
- **severity_judgment** — does the stated severity match real user impact?

`duplicate_of_own_report` was **cut** — impossible in Stage 1 by design, and
redundant with Stage 2 dedupe by `matched_bug_id`.

`UNKNOWN_BUG` is a real bug that was not planted — a **positive** signal.
Surfaced separately for confirmation, then appended to the bug key with bonus.
Confidence under 0.6 flags for review.

### Stage 2 formula

Tier weights **1 / 3 / 8**. Against a 5/7/4 split, total available weight is
58 and Tier-3 alone is ~55% of it. Per-bug hand-tuning retained — empty
diagnosis weighted 12.

```
detection = Σ weight of unique matched planted bugs
          / Σ weight of all non-honeypot bugs × 100

quality   = mean of three sub-scores across valid reports / 3 × 100

precision = valid reports / (valid + false positives) × 100

composite = 0.60 × detection + 0.25 × quality + 0.15 × precision
          + bonus (confirmed UNKNOWN_BUG × 3, cap 10)
```

Dedupe by `matched_bug_id` before summing. Soft-deleted reports excluded from
the precision denominator.

**Precision is additive, not subtractive.** The old `noise` term scaled
against report volume, so 36 valid + 4 false scored worse than 6 valid + 2
false. Precision carries the same information without that inversion, and
cannot drive a composite negative.

**Honeypots are outside the composite entirely.** They appear as an
uncomposited column split two ways: reported as a defect versus raised as a
question. The first is a pattern-matcher, the second is careful. Penalising
both destroys the distinction that made honeypots worth planting.

### Uncomposited leaderboard columns

Shown always. They change decisions in ways one number hides.

- **Tier-3 hits** — strongest single predictor
- **Honeypot behaviour** — split defect vs question
- **Coverage spread** — distinct modules touched
- **Hours used** — covers spreadsheet work too, so read as total effort
- **Report count** — context
- **TC score · AC score** — separate, never composited

### Override

Every AI call editable in the console. Overrides stored separately, never
overwriting AI output, recompute immediately, visibly marked. No review queue,
no confirmation gate, no low-confidence block.

Spot-check one strong and one weak candidate per round — without it you have
no measure of matcher accuracy, and the first disputed rejection is a number
you never checked.

---

## 5. Data model

Supabase/Postgres. Bug key stays in code.

```
candidates   id, full_name, email, access_token (unique), status,
             window_start, window_end, hours_budget, hours_used,
             created_at

sessions     id, candidate_id, started_at, last_heartbeat_at

reports      id, candidate_id, title, steps, expected, actual,
             severity, module, screenshot_url, attachments (text[]),
             auto_context (jsonb), created_at, edited_at, deleted_at

analyses     id, report_id (unique), matched_bug_id, match_confidence,
             match_reasoning, q_reproducibility, q_clarity, q_severity,
             quality_reasoning, flags (text[]), model_version, analyzed_at

overrides    id, report_id (unique), matched_bug_id, q_reproducibility,
             q_clarity, q_severity, is_false_positive, note, created_at

submissions  id, candidate_id, file_url, tc_score, ac_score,
             tc_reasoning, ac_reasoning, analyzed_at

narratives   id, candidate_id (unique), body, model_version, created_at

sut_events   id, candidate_id, event_type, route, payload (jsonb),
             created_at   -- optional, ship last
```

`status`: `invited → in_progress → submitted → analyzed → reviewed`

**Auth.** Candidate magic token in URL, no password. Console is one hardcoded
password in an env var behind middleware. No user system.

### The persistence boundary

Two layers, hard boundary:

- **localStorage** — candidate-scoped, disposable, per-device. All SUT state.
- **Postgres** — assessment-scoped, permanent. Everything graded.

A report write must never depend on localStorage having survived. SUT state
must never round-trip through Postgres.

A candidate switching devices finds a factory-fresh SUT while their reports
remain intact. Accepted — reports are the graded artifact; what is lost is an
in-progress draft. The landing page must say: **use the same browser and
device throughout.**

---

## 6. Routes

```
/t/[token]           landing — rules, budget, worked example,
                     TC/AC template download, device warning
/t/[token]/app       SUT with reporter docked bottom-right
/t/[token]/reports   candidate's own reports — review, edit, soft delete
/t/[token]/done      access ended

/console             candidate list, bulk Analyze (gated on status)
/console/leaderboard ranked table with the uncomposited columns
/console/c/[id]      reports + AI calls + overrides + coverage matrix
                     + Stage 3 narrative
/console/c/[id]/export   one-page evidence sheet
/console/setup       paste emails, set window and budget, generate tokens
```

The coverage matrix is what makes a rejection defensible: found 9 of 16,
missed all four Tier-3s, raised one honeypot as a question.

---

## 7. Stack

Next.js App Router (TS) · Tailwind · Supabase (Postgres + storage) ·
Anthropic API · Vercel. One repo, one deploy, no separate services. Server
actions over API routes. `claude-sonnet-4-6`, temperature 0, JSON-only system
prompt, retry-once on parse failure.

No separate Node service. Server actions already give typed server-side writes
with no client-side keys; a service would add a second deploy target, a second
set of env vars, and a network hop between two things shipping from the same
repo. → **DR-004**

---

## 8. Standing constraints

- **Never break the happy path.** Bugs are wrong behaviour, never dead ends.
- **One bug = one reversible commit** tagged with its ID. Toggles were dropped;
  `git revert` is what the toggle was pretending to be.
- **No empty menus.** If cuts leave a `SectionMenu` with no items, remove the
  hamburger rather than let it open blank.
- **Design fidelity is not negotiable against convenience.** Any change to how
  the app looks needs a recorded reason.
- **No LLM in the math.** Stage 2 is pure functions.
- **The fixture must be clean.** Every defect in the SUT is one you put there.
  The production sample contains real defects — a leaked `ক_when` placeholder,
  a truncated `Amenorrhoea due to`, a stray `(cwe)` suffix, a duration missing
  its unit — none of which may survive into the seed.
- **No new dependencies** beyond what the design file already imports.

---

## 9. Build order

**SUT track** (see `SUT-PLAN.md` for detail)

1. Port the shell — route, `useRouter`, SVGs, `"use client"`, remove mic
2. State foundation — types, context provider, localStorage, seed fixture
3. Wire the sections — vitals, patient pool, master-data CRUD, templates
4. Save and Preview & Complete — A4 modal, lock, visit increment

Steps 1–4 produce a working, bug-free app. **The happy path must complete end
to end before a single bug is planted.**

5. Bug key and planting — deferred

**Tool track**

6. Schema, seed, token generation, window and budget config
7. Reporter widget, auto-capture, `data-module` pass, report writes
8. Report review route
9. Stage 1 analyzer + Stage 2 scoring — **unit-test the math against
   fixtures.** The only place tests are required.
10. Console: list, detail, overrides
11. Leaderboard + coverage matrix
12. TC/AC upload, parse, grade
13. Stage 3 narrative
14. *(optional)* Export sheet, cross-candidate duplicate detection,
    `sut_events`

---

## 10. Definition of done

Before a single real candidate is invited, run the whole thing twice — once as
a strong QA, once as a weak one.

- Strong run outranks weak run on composite
- You agree with 80%+ of the AI's per-report classifications
- **Reviewing one candidate's full submission produces a defensible written
  verdict in under 5 minutes**

The third criterion was rewritten. The original — "reviewing takes under 5
minutes" — was not achievable and not the point. The tool does not save you
reading; it saves you ranking, comparing, and justifying, which is the part
that currently cannot be done consistently across 120 reports. The Stage 3
narrative is what makes the rewritten version achievable.

---

## 11. Still open

**The bug key.** Roughly 22 bugs now, up from 16, since templates and
master-data are in scope and functional. Three inputs already gathered:

- The Tier-3 "height ft→cm changes label not value" is **orphaned** — height
  is hardcoded `cm`, there is no unit toggle in the file, and adding one
  violates design fidelity. Needs a replacement.
- The blank top third of the printout is a strong honeypot candidate:
  intended behaviour that reads as a defect, requiring no cultural knowledge
  to judge. Better than the °F/kg unit mix, which penalises a candidate for
  noticing a real inconsistency.
- The `data-module` vocabulary and the `Module` type in `bugKey.ts` must be
  the same enum, or the coverage matrix compares two lists that do not line
  up. Define it before either is written.

**The practice bug** (Q6). Not blocking.

**TC/AC skip policy.** A candidate who does excellent bug hunting and skips
the spreadsheet scores zero on two of five columns. Decide what that means
before the first round, not during it.
