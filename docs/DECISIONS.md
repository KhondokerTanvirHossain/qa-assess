# Decision Records

DR-001 through DR-019. Chronological. Later records supersede earlier ones
where noted.

---

## DR-001: Port the prescription TSX, don't rebuild it

**Date:** 2026-08-29 · **Status:** Accepted

**Context**
B9.1 asked how coupled the supplied TSX is to a backend. Reviewed all 16,522
lines. There is no coupling: no fetch, no axios, no query client, no storage
API, no env reads. Only external deps are lucide-react, two local SVG icons,
and one `useNavigate` call site (line 15369).

**Decision**
Port the file as-is into the Next.js app. Swap `useNavigate` for `useRouter`,
copy the two SVGs, add `"use client"`. Preserve the existing design system and
component structure verbatim — the SUT must be visually indistinguishable from
production.

**Rejected**
Rebuilding a clean generic prescription form. Faster to instrument, but the
assessment's realism depends on candidates believing they are testing real
software.

**Consequences**
B9.1 is closed and is NOT the schedule risk. The real risk is that the file is
presentation-only: Save and Preview & Complete have no handlers, vitals are
uncontrolled inputs, new patients never enter the searchable pool. B10 step 2
is a build, not a fork, and must be re-estimated as the largest step.

---

## DR-002: SUT scope — cut templates and master-data management

**Date:** 2026-08-29 · **Status:** SUPERSEDED by DR-003

Cut ~8,000 lines of template and master-data UI on the grounds that no planted
bug lived there and every extra room weakens coverage spread and time-on-task.
Reversed by the product owner: full production surface is required.

Retained finding: removing these would have left the Advice and Diagnosis
`SectionMenu`s empty, which must never be allowed to open blank.

---

## DR-003: Keep templates and master-data, make them functional on local state

**Date:** 2026-08-29 · **Status:** Accepted — supersedes DR-002

**Context**
DR-002 cut ~8,000 lines of template and master-data UI. Reversed: the UI
already exists and the product owner wants full production surface. Audit
found these modals are non-functional — Save and Insert both fire success
toasts describing writes that never happen; Manage modals mutate nothing.

**Decision**
Keep all of it, wired to component state. Template save appends to a local
template array; insert merges into the prescription; Manage add/edit/delete
mutates local library state. Libraries move from module consts into state.

**Rejected**
Keeping them as-is and adopting the false toasts as planted bugs. Cheap, but
it plants ten instances of one pattern, flooding the report set with
near-duplicates and inflating detection for a single insight.

**Consequences**
Roughly doubles SUT build step 2. Adds ~10 modules of reachable surface with no
planted bugs in them yet — the bug key must cover this area or coverage spread
and detection both degrade. Bug count rises from 16 to ~22.

---

## DR-004: No separate service; Supabase plus server actions is the backend

**Date:** 2026-08-29 · **Status:** Accepted

**Context**
Whether candidate submissions need a Node service, given the SUT itself is
local-state-only.

**Decision**
Supabase for candidates, reports, analyses, overrides. Next.js server actions
for all writes. No separate API service, no separate deploy.

SUT prescription state, template libraries, and master-data edits live in
component state mirrored to localStorage — never in Postgres. Bug key stays in
code.

**Rejected**
A Node service. It adds a second deploy target, a second set of env vars, and
a network hop between two things that ship from the same repo. Server actions
already give typed server-side writes with no client-side keys.

**Consequences**
One repo, one Vercel deploy. Two persistence layers with a hard boundary:
localStorage is candidate-scoped and disposable, Postgres is
assessment-scoped and permanent. A report write must never depend on
localStorage having survived, and SUT state must never round-trip through
Supabase.

---

## DR-005: SUT runs entirely client-side, persisted to localStorage

**Date:** 2026-08-29 · **Status:** Accepted

**Context**
Whether the buggy prescription clone should write to a database like
production, or run on local state only.

**Decision**
No backend, no API, no shared store. All SUT state — prescription, patient
pool, drug/test/diagnosis/advice libraries, templates, master-data edits —
lives in React state mirrored to localStorage under a key namespaced by the
candidate's token. Every candidate boots from an identical seed fixture.

**Rejected**
A shared Postgres backing the SUT. Realistic, and it would enable server-side
bug classes we now cannot plant. Rejected because twelve candidates sharing
one store see each other's data, and the fixture drifts as they write to it —
which makes detection scores non-comparable across candidates. Comparability
is the product.

**Consequences**
Cannot plant race conditions, stale reads, or partial-save bugs. Reset is
trivial. A candidate clearing site data loses everything, which needs a
warning on the landing page.

---

## DR-006: Preview renders an HTML A4 page in a modal, not a generated PDF

**Date:** 2026-08-29 · **Status:** Accepted

**Context**
Production opens a server-generated PDF inside an embedded viewer in a
"Prescription Preview" modal. Question was whether the clone must generate a
real PDF.

**Decision**
Reproduce the modal shell (header, close X, Close and Download buttons) and
the A4 content layout as styled HTML at 210×297mm. No PDF generation.
Download calls `window.print()`.

**Rejected**
Client-side PDF via jsPDF, pdf-lib, or react-pdf. None do Indic script
shaping — Bangla conjuncts and matras render as broken glyph sequences. The
prescription is roughly half Bangla, so this fails on the most visible part
of the page. Rasterising via html2canvas fixes shaping but produces a
non-selectable image and adds a dependency for no gain.

**Consequences**
The viewer toolbar is not reproduced. It is browser chrome, not product UI —
it looks entirely different in Chrome than in Firefox, so there is no single
correct appearance to match and candidates have no reference to compare
against. Layout fidelity is what matters and is fully preserved.

---

## DR-007: Seed fixture — populated reference data, zero saved prescriptions

**Date:** 2026-08-29 · **Status:** Accepted

**Context**
What state the SUT boots into for every candidate.

**Decision**
Seed 3–4 patients with full demographics, populated drug/test/diagnosis/advice
libraries, and 2–3 saved templates. No saved prescriptions. Candidates always
compose the prescription themselves.

**Rejected**
Seeding completed prescriptions. Faster route to the populated-data bugs, but
the form-to-preview path is where most Tier-2 and Tier-3 bugs live, and that
path must be exercised by the candidate's own input.

**Consequences**
Seed content must be authored clean in both English and Bangla. The sample
production output contains real defects — a leaked `ক_when` placeholder, a
truncated `Amenorrhoea due to`, a stray `(cwe)` suffix, a duration missing its
unit — none of which may survive into the fixture, or every candidate reports
them correctly as bugs that aren't in the key.

---

## DR-008: localStorage only — no SQLite WASM, no IndexedDB

**Date:** 2026-08-29 · **Status:** Accepted

**Context**
Whether the SUT needs an embedded database (sql.js / wa-sqlite) or IndexedDB
to hold prescriptions, patients, libraries, and templates.

**Decision**
A single JSON blob in localStorage, keyed by candidate token, debounced on
write. Reads are plain array operations.

**Rejected**
SQLite compiled to WASM. Adds a ~1MB payload, async initialisation, a schema,
and a migration path — for a dataset of a few dozen records that is never
queried with anything more than a filter. IndexedDB rejected for the same
reason: async API and versioning overhead with no benefit at this size.

**Consequences**
Bugs get planted in state logic only, never in a data layer, which keeps each
one a single reversible commit. Patient profile photos must be downscaled
before persisting or they will approach the ~5MB origin quota. Writes must be
debounced — persisting on every keystroke will produce input lag that reads as
a defect and isn't in the key.

---

## DR-009: Prescriptions persist per patient; Complete locks and increments

**Date:** 2026-08-29 · **Status:** Accepted — production behaviour confirmed

**Context**
Whether a prescription is a single throwaway draft per session or a persisted
record per patient.

**Decision**
Prescriptions are keyed by patient. One draft per patient at a time, plus a
list of completed ones. Save persists the draft silently. Preview & Complete
opens the A4 modal; Complete stamps `completed_at`, locks the prescription
read-only **permanently**, and increments the patient's visit count
**regardless of visit type** — New Visit, Follow up, and Report all increment.
The toolbar then offers New Visit, which opens a fresh draft.

**Rejected**
One throwaway prescription per session. Simpler state, but it makes four
planned bugs unreachable — the visit counter, Back-discards-unsaved, and both
bugs that need a saved record to contrast against.

**Consequences**
The visit dropdown in the design file is a hardcoded three-option list
(`Visit 3/3`, `Visit 2/3`, `Visit 1/3`). It must become derived from the
patient's completed count — a change to how the control behaves, not just its
data. Switching patients mid-draft must preserve the draft, not discard it.

---

## DR-010: Two independent budgets, checked at login only

**Date:** 2026-08-29 · **Status:** Accepted

**Context**
Candidates work across multiple sessions within a recruiter-set window. Two
limits apply: a calendar window (start and end date) and a total accumulated
hours budget. Question was whether to enforce the hours budget continuously or
at session boundaries.

**Decision**
Check both budgets at login. A candidate with any time remaining gets a full
session and may overrun; the overrun is recorded and shown on the leaderboard.
A banner warns once the budget is spent. Elapsed time accumulates from
heartbeats posted every 30s while the tab is visible, summed server-side from
arrival timestamps. The console can grant additional time.

**Rejected**
Continuous enforcement with mid-session lockout. Exact to the minute, but it
locks a candidate out mid-report — either discarding what they were typing or
requiring an in-flight exemption path. A tool that destroys a candidate's
evidence fails at its only job. Heartbeat misfires would then cost a locked-out
candidate rather than a slightly wrong number.

**Consequences**
Time is approximate by design; the product owner accepted this. The clock runs
on tab visibility, not interaction — must be stated plainly on the landing
page. Client-reported durations are never trusted. Needs `sessions` table:
candidate_id, started_at, last_heartbeat_at.

---

## DR-011: No candidate submit; reports stay editable until access ends

**Date:** 2026-08-29 · **Status:** Accepted

**Context**
No explicit submit action. Candidates can review and edit their own reports for
as long as they have access. Raises when it is safe to run analysis.

**Decision**
Reports post individually on write and remain editable. `submitted` becomes an
automatic transition, not a candidate action — set when the calendar window
closes or the hours budget is exhausted, whichever comes first. Analysis is
gated on that status; the console's Analyze control stays disabled until then.

Edits overwrite in place. `auto_context` and `screenshot_url` are frozen at
creation and never re-captured, since they describe the moment the bug was
observed. Add `edited_at`. Delete is soft — `deleted_at`, excluded from
scoring, retained as evidence.

**Rejected**
Analyze-on-demand with staleness invalidation. Lets you spot-check mid-window,
but needs edit-detection, re-analysis triggers, and a stale-row state in the
console. Gating on status removes the failure mode instead of handling it.

**Consequences**
Nothing is analysable until a candidate is done, so all analysis happens in one
bulk pass per round. A ghosted candidate still auto-transitions when the window
closes. Soft-deleted reports must be excluded from the precision denominator.

---

## DR-012: One app; reporter embedded in the SUT, report list on its own route

**Date:** 2026-08-29 · **Status:** Accepted

**Context**
Whether the SUT and the bug reporter are separate deployments, and where a
candidate reviews and edits reports they have already filed.

**Decision**
One Next.js app, one deploy. Routes: `/t/[token]` landing,
`/t/[token]/app` (SUT with the reporter docked bottom-right),
`/t/[token]/reports`, `/t/[token]/done`, `/console/*`.

The reporter is a docked panel inside the SUT page — a form and a submit,
nothing more. Review, edit, and delete live at `/t/[token]/reports`, styled
deliberately unlike the SUT.

**Rejected**
A separate reporting portal. It cannot capture route, form state, console
errors, or a screenshot of the app under test, which is the whole basis of
auto-capture and of route-derived module attribution.

Also rejected: a list/edit tab inside the widget. Every pixel of tooling
rendered inside the SUT is something a bug-hunting candidate files a report
against, and those reports are not in the bug key.

**Consequences**
The widget must render above the SUT's modals — highest observed z-index in
the design file is 10000, so the widget sits above that and the SUT's own
`createPortal` usage must not be disturbed. Candidates leave the SUT to check
reports; localStorage persistence makes that safe.

---

## DR-013: Widget capture payload — auto-captured module, screenshot optional

**Date:** 2026-08-29 · **Status:** Accepted

**Context**
B4 assumes route yields module attribution. It does not: the entire SUT is one
route with ~40 modals and a dozen sections on a single page. Also resolves
B9.4 (screenshot mandatory or optional).

**Decision**
Candidate writes five fields: Title, Steps, Expected, Actual, Severity.

Auto-captured into `auto_context`: module (via `data-module` attributes and a
`focusin` listener), timestamp, session id, browser/OS/viewport,
time_since_session_start, last N console errors, form_state_snapshot.

Module is shown read-only in the widget ("Reporting from: Treatment"), which
stops candidates writing location context into Steps.

Screenshot is optional and opt-out. Captured with html2canvas when the widget
opens — not on submit — so the page is frozen before the candidate starts
typing. The widget node is excluded from capture.

**Rejected**
A module dropdown. Adds a sixth field, and self-reported module is the least
reliable source for the one value that drives both coverage spread and the
matcher's prior.

Mandatory screenshots. html2canvas on this DOM takes 1–3s and silently drops
some CSS; a failed capture must never block a report from being filed.

**Consequences**
Every section wrapper and modal root needs a `data-module` attribute — a
mechanical pass over the SUT, but it touches many files. Module values must
match the modules named in the bug key, or coverage comparison breaks.
Screenshot upload is async and must not gate the write.

---

## DR-014: Candidate attachments — up to 3 images, stored separately

**Date:** 2026-08-29 · **Status:** Accepted

**Context**
Whether candidates can attach their own screenshots in addition to the
auto-captured one.

**Decision**
Up to 3 candidate-uploaded images per report, PNG/JPG/WebP, 5MB each, to
Supabase storage. Stored in a separate `attachments` column from
`screenshot_url`, which remains reserved for the auto-capture.

Uploads are async and never block the write — a report saves with attachments
still uploading, and a failed upload does not lose the report.

**Rejected**
Merging uploads into `screenshot_url`. The auto-capture is unstaged evidence
of the page at widget-open; an upload is whatever the candidate chose to show.
Collapsing them destroys that distinction.

Video and unlimited attachments. Review budget is ~5 min per candidate across
potentially 40 reports; neither survives contact with that.

**Consequences**
Console report view and the export sheet must render auto-capture and uploads
distinctly, not as one gallery. Storage bucket needs a size cap and a
retention policy — roughly 15GB per round.

---

## DR-015: Reuse the same bug set across rounds

**Date:** 2026-08-29 · **Status:** Accepted

**Context**
B9.5 — whether the planted bug set is regenerated per hiring round.

**Decision**
One bug set, reused. No versioning in the DB; `lib/bugKey.ts` is the single
source and its git history is the record.

**Rejected**
Per-round regeneration. Defends against leakage between rounds, but doubles
the authoring work and makes scores non-comparable across rounds.

**Consequences**
Accepts leak risk — two rounds a year means the set will eventually be
discussed publicly. If a candidate scores anomalously high with suspiciously
precise reports, treat prior exposure as a live hypothesis. If the set is ever
changed, `analyses` rows scored under the old key become non-comparable, and
that must be handled at the moment of change rather than assumed away.

---

## DR-016: Scoring formula — weight-driven detection, additive precision

**Date:** 2026-08-29 · **Status:** Accepted — banding clause superseded by DR-018

**Context**
The original formula was Claude-generated and unexamined. Four faults: noise as
a ratio punished thorough candidates, honeypots penalised correct behaviour,
quality carried 30% while being the least stable input, and 1/2/3 tier weights
let ten Tier-1s outscore three Tier-3s.

**Decision**
Tier weights 1 / 3 / 8. Against a 5/7/4 split, Tier-3 is ~55% of available
weight. Per-bug hand-tuning retained — empty diagnosis weighted 12.

```
detection = Σ weight of unique matched planted bugs
          / Σ weight of all non-honeypot bugs × 100
quality   = mean of three sub-scores across valid reports / 3 × 100
precision = valid reports / (valid + false positives) × 100

composite = 0.60 × detection + 0.25 × quality + 0.15 × precision
          + bonus (confirmed UNKNOWN_BUG × 3, cap 10)
```

Honeypots leave the composite entirely — uncomposited column, split into
reported-as-defect vs raised-as-question.

Stage 1 sub-score rubrics rewritten developer-facing. `duplicate_of_own_report`
cut from the flags list — impossible in Stage 1 by design, redundant with
Stage 2 dedupe.

**Rejected**
Subtractive noise. `(fp + honeypots) / total_reports` made a candidate with 36
valid and 4 false score worse than one with 6 valid and 2 false. Precision
carries the same information without scaling against volume.

**Consequences**
Tier-3 dominance is a deliberate tilt; weights are tunable in `bugKey.ts`.
Soft-deleted reports excluded from the precision denominator.

---

## DR-017: TC and AC graded separately, never composited

**Date:** 2026-08-29 · **Status:** Accepted

**Context**
Candidates also submit test cases and acceptance criteria for the Treatment
section as a spreadsheet.

**Decision**
One downloadable .xlsx template, two sheets, fixed headers, one worked example
row each. Mandatory. Capped at 15 test cases and 8 acceptance criteria,
Treatment section only.

TC: `TC_ID · Title · Preconditions · Steps · Test Data · Expected Result · Type`
AC: `AC_ID · User Story · Given · When · Then · Priority`

One LLM call per sheet scoring the whole set on four dimensions — functional
coverage, correctness of expected results, negative/edge case quality,
structural discipline. Treatment's testable surface is enumerated in the
prompt as a partial answer key.

Two standalone leaderboard scores. Never merged into the detection composite.

**Rejected**
Compositing TC/AC into the ranking. These have no answer key and are pure LLM
judgment; merging would let an unstable score move a rank that auditable
detection earned.

Per-row grading. 40 calls per candidate producing a length measurement.

**Consequences**
Uploads need schema validation with a clear error, not a silent parse failure.
The cap makes submissions comparable and bounds review time. A candidate who
skips the spreadsheet scores zero on two of five columns — decide the policy
before the first round.

---

## DR-018: Leaderboard shows rank and points; zero-report rows score 0

**Date:** 2026-08-29 · **Status:** Accepted — supersedes the banding clause in DR-016

**Context**
DR-016 specified three bands rather than ranks. Reversed. Also resolves the
undefined-score case.

**Decision**
Leaderboard sorts by composite and shows numeric rank and points, plus the
uncomposited columns: Tier-3 hits, honeypot behaviour, coverage spread, hours
used, report count, TC score, AC score.

When a candidate has no valid reports, quality and precision evaluate to 0
rather than NaN. Detection is 0. The row renders with a "no submission" marker
so a genuine zero is distinguishable from a candidate who never logged in.

**Rejected**
Banding. Argued twice on the grounds that rank order between adjacent
candidates will not survive re-running the analyzer at n=12. Product owner
prefers explicit ranks. Accepted — it is a display choice, reversible without
touching the data model.

**Consequences**
Adjacent ranks carry less information than their presentation implies. When
defending a decision to a candidate, cite the uncomposited columns rather than
the rank gap.

---

## DR-019: TC/AC template delivered at the start, inside the clock

**Date:** 2026-08-29 · **Status:** Accepted

**Context**
Whether the spreadsheet template is given before the candidate starts or on
the done screen.

**Decision**
Downloadable from the landing page, before Start. Candidates write test cases
while exploring the app, as in a real QA workflow. Spreadsheet work counts
against the hours budget.

**Rejected**
Delivering it at the end. Turns test design into a memory exercise and
separates it from the exploration that should inform it.

**Consequences**
Landing page gains a download link and an explanation of the two sheets, their
caps, and the Treatment-only scope. Hours-used now covers both bug hunting and
spreadsheet authoring, so it is no longer a clean measure of time in the SUT —
read it as total effort.

---

## DR-020: exceljs replaces xlsx; transitive uuid advisory accepted

**Date:** 2026-08-29 · **Status:** Accepted

**Context**
`xlsx` (SheetJS 0.18.5 on npm) carries an unfixable high-severity advisory —
prototype pollution and ReDoS, no patched version on the registry. It would
parse spreadsheets uploaded by candidates, who are by construction people paid
to probe software.

**Decision**
Replace with `exceljs` for both TC/AC template generation and parsing. Accept
its two moderate advisories, both from transitive `uuid <11.1.1`.

**Rejected**
`npm audit fix --force`. Downgrades exceljs to 3.4.0 — a breaking change to a
much older library — to avoid an unreachable path.

Pinning uuid via npm overrides. uuid 11 is ESM-first and exceljs is not tested
against it; risking a runtime break to close an unreachable advisory is a bad
trade at this scale.

**Consequences**
`npm audit` reports 2 moderate findings permanently. Do not treat a clean audit
as a gate. The vulnerable path — uuid v3/v5/v6 with a buffer argument — is not
reachable from exceljs, which uses v4. Re-evaluate if exceljs ships a release
that bumps uuid.

---

## DR-021: Substitute icon-maximize.svg; drop icon-report.svg

**Date:** 2026-08-29 · **Status:** Accepted

**Context**
The design file imports two SVGs from a path five directories up
(`../../../../../icons/`). Neither came with the file and the source repo is
not available. `iconMaximize` renders at line 1378; `iconReport` has zero
references.

**Decision**
Drop the `iconReport` import entirely. Substitute `icon-maximize.svg` with
lucide's `Maximize2` glyph, dark stroke, no `currentColor`.

**Rejected**
Blocking the port until the real asset is sourced. Also rejected: replacing
the `<img>` with a lucide component, which would require rewriting
`MaximizeButton`'s hover filter.

**Consequences**
A deliberate, recorded deviation from design fidelity (CLAUDE.md §4). Low risk:
renders at 14×14 in a hover button labelled "Expand," and lucide supplies every
other icon in the file. The real asset can replace
`public/icons/icon-maximize.svg` later with no code change.

---

## DR-022: Pre-existing hydration error is fixed, not planted

**Date:** 2026-08-29 · **Status:** Accepted

**Context**
The ported design file throws a hydration mismatch on every page load. Five
`useState` initializers read `window` during render, including
`isCompactDisplay` at line 15204 — the site React actually reported. Server and
client render different branches.

**Decision**
Fixed as pre-planting cleanup, before bug planting begins. All five sites
initialize to a server-safe default and set the real value in `useEffect`.

**Rejected**
Adding it to the bug key. It fires before any interaction, so it has no module
attribution and no meaningful tier, and every candidate hits it — a bug
everyone finds adds nothing to detection while inflating all scores equally.

Leaving it unplanted. It is a legitimate high-severity finding, so a strong
candidate reports it correctly and takes a false positive for being right.

**Consequences**
A deliberate behavioural change to ported code, permitted under CLAUDE.md §5:
every defect in the SUT must be one that was planted. Establishes the standing
rule — inherited defects that fire without candidate interaction get fixed;
defects requiring candidate interaction are candidates for the bug key.

---

## DR-023: Module vocabulary

**Date:** 2026-08-30 · **Status:** Accepted

**Context**
`data-module` attributes drive auto-captured module attribution (DR-013) and
the `Module` type in `bugKey.ts` drives the coverage matrix. Divergent lists
would make coverage compare two different things.

**Decision**
One exported `Module` union, seventeen values: `patient`,
`patient-registration`, `vitals`, `complaints`, `history`, `drug-history`,
`diagnosis`, `treatment`, `investigation`, `advice`, `follow-up`,
`clinical-signs`, `test-results`, `templates`, `master-data`, `preview`,
`toolbar`.

Defined in `lib/sut/modules.ts`, imported by both the SUT and `bugKey.ts`.
`templates` covers all eight template modals — four Save, four Insert.

**Rejected**
Free-string `data-module` values. Typos would silently create phantom modules
in the coverage matrix with no type error.

**Consequences**
Adding a module means editing one file, and the bug key will not compile until
its bugs are reassigned. Attribution falls back to the nearest ancestor, then
the topmost open modal, then `unknown`. `preview` has no DOM presence until the
preview modal is built.

---

## DR-024: Inherited defects that would collide with a planted bug get fixed

**Date:** 2026-08-30 · **Status:** Accepted — extends DR-022

**Context**
DR-022 established that inherited defects firing without candidate interaction
get fixed rather than planted. Brief 6 surfaced a case outside that rule: list
rows using `defaultValue` with `key={i}` leave stale text after a middle-row
delete. It requires interaction, so DR-022 would leave it key-eligible.

**Decision**
Fix it. Extend the rule: an inherited defect is also fixed when it would be
hard to distinguish from a planted bug in the same module.

The deliberate off-by-one delete planned for Advice and Investigation lives in
exactly these lists. Two similar-looking defects in one section make matcher
classification unreliable and give the recruiter no defensible answer when a
candidate disputes a call.

**Rejected**
Adopting it into the bug key. Its "correct" behaviour is ambiguous — state is
already right and only the DOM is stale — so the repro is fragile and the
expected-result field has no clean answer.

**Consequences**
Ambiguity in the answer key is worse than a missing bug. The standing rule is
now: fires without interaction, or collides with a planted bug in the same
module → fix. Otherwise → key-eligible.

---

## DR-025: Draft list rows carry stable ids

**Date:** 2026-08-30 · **Status:** Accepted

**Context**
Draft-backed lists stored bare strings and keyed inputs by index, then by
content after DR-024. Neither survives adding `onChange` — index keys leave
stale text, content keys remount on every keystroke and drop focus.

**Decision**
List rows become `{ id, text }` with ids generated on add. Inputs key on id;
edit and delete both address rows by id, never by index.

**Rejected**
Keeping bare strings and addressing by index. Simpler shape, but index-based
edits break under concurrent add/delete and would make the planned off-by-one
delete bug indistinguishable from a real one.

**Consequences**
A localStorage payload written before this change is unreadable and is
discarded on load rather than migrated. Acceptable — the SUT is disposable
per-candidate state (DR-005), and no candidate has used it yet.
