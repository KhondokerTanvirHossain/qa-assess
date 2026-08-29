# SUT Build Plan — Buggy Prescription Clone

**Status:** Decided through the state model and preview. Bug key deferred.
**Scope:** The System Under Test only. The assessment tool (candidate reporter,
console, leaderboard, analyzer) is a separate track and is not covered here.

---

## 1. What this is

A visually faithful clone of the production prescription screen, running
entirely in the browser, seeded identically for every candidate, with
deliberate defects planted in it.

It is fixture data. It is not a product. Every decision below optimises for
one property: **two candidates must be testing the same application.**

---

## 2. Decisions in force

| DR | Decision |
|---|---|
| 001 | Port the supplied TSX as-is. Do not rebuild. Design fidelity is a hard constraint. |
| 003 | Keep every module including templates and master-data. Make them functional on local state. |
| 004 | No separate service. (Applies to the assessment tool; the SUT has no backend at all.) |
| 005 | SUT is entirely client-side. No API, no shared store. |
| 006 | Preview is an HTML A4 page in a modal. No PDF generation. |
| 007 | Seed populated reference data, zero saved prescriptions. |
| 008 | localStorage only. No SQLite WASM, no IndexedDB. |
| 009 | Prescriptions persist per patient. Complete locks and increments the visit count. |

Bug toggles were dropped. One bug = one reversible commit tagged with its ID.

---

## 3. Starting point

`prescription-creation-dev-v2.tsx` — 16,522 lines, one default export,
~258 `useState` calls, ~40 modals.

**Coupling to strip:** `useNavigate` (one call site, line 15369), two SVG
imports via `../../../../../icons/`. Nothing else. No fetch, no axios, no
query client, no storage API, no env reads.

**What already works:** the section add/remove loops backing
`savedComplaints`, `savedMedications`, `savedTests`, `savedAdvice`,
`savedDiagnoses`, `savedDrugHistory`. All the modal UI. The full design system.

**What does not exist and must be built:**

- `Save` and `Preview & Complete` have no `onClick` (lines 15503, 15507)
- No preview, print layout, or completed-prescription view of any kind
- Vitals are 7 uncontrolled `defaultValue` inputs — no state, never read
- `PATIENT_POOL` is a module const; registered patients never enter it
- Drug, test, diagnosis, and advice libraries are module consts
- Templates have no storage; Save fires a toast and writes nothing
- Insert-template fires a toast naming a specific item count and inserts nothing
- Master-data Manage modals mutate nothing

The template and master-data toasts are the sharpest trap here. They report
writes that never happen, which is a genuine high-severity defect a competent
candidate finds in under a minute. Wiring them is not polish — it is removing
unplanted bugs from the fixture.

---

## 4. State model

One context provider holding the prescription and the libraries. Sections read
and write through it. Prop-threading is rejected: sections nest five to six
components deep, so props would mean touching ~40 components and would spread
each planted bug across a chain instead of isolating it in one reducer case.

```ts
type SutState = {
  patients: Patient[];              // seeded, plus any the candidate registers
  prescriptions: Record<PatientId, {
    draft: Prescription | null;
    completed: Prescription[];
  }>;
  libraries: {
    drugs: Drug[];
    tests: Test[];
    diagnoses: Diagnosis[];
    advice: AdviceEntry[];
  };
  templates: {
    overall: OverallTemplate[];
    treatment: TreatmentTemplate[];
    test: TestTemplate[];
    advice: AdviceTemplate[];
  };
};

type Prescription = {
  id: string;
  patientId: string;
  visitType: "New Visit" | "Follow up" | "Report";
  visitNumber: number;
  date: string;
  fee: string;
  vitals: {
    pulse: string; bp: string; temperature: string;
    respRate: string; spo2: string; weight: string; height: string;
  };
  complaints: { text: string; remark: string }[];
  history: { text: string; remark: string }[];
  diagnoses: string[];
  medications: Medication[];
  tests: string[];
  advice: { bn: string; en?: string; showEn: boolean }[];
  followUp: { mode: "After" | "On"; amount: string; unit: string; date: string };
  referTo: string;
  status: "draft" | "completed";
  completedAt: string | null;
};
```

**Persistence.** The whole `SutState` serialised to a single localStorage key
namespaced by candidate token, debounced on write.

Debouncing is not optional — persisting on every keystroke produces input lag
that reads as a defect and will be reported as one. Patient profile photos
must be downscaled before persisting or they approach the ~5MB origin quota.

---

## 5. Preview

Reproduce the production modal: header reading "Prescription Preview", close
X, `Close` and `Download` buttons. Content is an A4 HTML page at 210×297mm.
`Download` calls `window.print()`.

Layout, from the production sample:

- Top third blank (letterhead space)
- Two columns split by a vertical rule
- **Left:** patient photo, name, age · `C/C` with indented durations · `H/O` ·
  `Diagnosis` · `Tests`, numbered
- **Right:** barcode + patient code, `Visit: NEW`, `Date: 06 Aug, 2026` · `Rx`
  with numbered medications, each with an optional Bangla dose line beneath ·
  `Advice` as Bangla lines

**Vitals do not appear on the printout.** The form-to-preview divergence bug
must therefore live in the medication block, which is the only region with
enough structure to diverge.

The PDF viewer toolbar is not reproduced. It is browser chrome, renders
differently in Chrome than Firefox, and candidates have no reference to compare
it against.

---

## 6. Seed fixture

3–4 patients with full demographics. Populated drug, test, diagnosis, and
advice libraries. 2–3 saved templates. **Zero saved prescriptions** — the
candidate always composes the prescription themselves, because that is the path
most Tier-2 and Tier-3 bugs live on.

The fixture must be authored clean in both languages. The production sample
output contains real defects that must not be reproduced:

- `ক_when কাজ করবেন...` — leaked placeholder key in Advice
- `Amenorrhoea due to` — truncated mid-phrase
- `CBC with ESR (cwe)` — stray suffix
- Medication 1 shows duration `১০` with no unit; medication 4 shows `৭ দিন`
- Medication 2 carries no dose line

Any of these surviving into the fixture will be found and correctly reported by
every competent candidate, as `UNKNOWN_BUG`, twelve times.

---

## 7. Build order

Each step ships working before the next starts.

**1 · Port the shell.** New Next.js route, `useRouter` for `useNavigate`, copy
the two SVGs, add `"use client"`, remove `MicButton` and its trigger. Nothing
else changes. Verify visual parity against the design file.

**2 · State foundation.** Define the types above. Build the context provider.
Move `PATIENT_POOL` and all four libraries from module consts into state. Wire
localStorage persistence keyed by token. Author and load the seed fixture.

**3 · Wire the sections.** Vitals become controlled. Registered patients enter
the pool. Master-data add/edit/delete mutates library state. Template save
appends; template insert actually merges into the prescription. Every existing
section reads and writes the `Prescription` object.

**4 · Save and Preview & Complete.** Save persists the draft. Preview opens the
A4 modal. Complete stamps `completedAt`, locks the prescription, increments the
visit count. New Visit opens a fresh draft.

**5 · Bug key and planting.** Deferred — see §9.

Steps 1–4 produce a working, bug-free app. That is the gate: **the happy path
must complete end to end before a single bug is planted.**

---

## 8. Standing constraints

- Never break the happy path. Bugs are wrong behaviour, never dead ends.
- No empty menus. If cuts leave a `SectionMenu` with no items, remove the
  hamburger entirely rather than let it open blank.
- No new dependencies beyond what the design file already imports.
- Design fidelity is not negotiable against convenience. If a change alters how
  the app looks, it needs a reason recorded.
- All state is React state and pure functions. No data layer, so every planted
  bug stays isolated to one commit.

---

## 9. Still open

**Bug key** — count, tiers, placement, and the honeypot set. Parked at the
product owner's request.

Three inputs already gathered that will shape it:

- Bug count likely rises from 16 to ~22 now that templates and master-data are
  in scope and functional.
- The Tier-3 "height ft→cm changes label not value" is orphaned. Height is
  hardcoded `cm`; there is no unit toggle in the file, and adding one violates
  design fidelity. Needs a replacement.
- The blank top third of the printout is a strong honeypot candidate: intended
  behaviour that reads as a defect, with no cultural knowledge required to
  judge it. Better than the °F/kg unit mix.

**Deferred to the assessment-tool track** — the scoring formula, the noise term
at high report volumes, the honeypot penalty, and the leaderboard's rank-versus-
band presentation.

**To confirm against production** — whether a completed prescription stays
editable. If it does, only the lock in DR-009 changes, not the state shape.
