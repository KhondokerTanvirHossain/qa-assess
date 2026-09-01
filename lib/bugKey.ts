// The answer key and rubric. Single source of truth for the bug set (DR-015):
// one set, reused across rounds, with git history as the record of what was
// planted when.
//
// This file declares bugs; it does not plant them. Each plant brief works from
// the entry below it, one bug per commit tagged with its id (CLAUDE.md §6).
//
// `description` is written for whoever verifies the plant. `repro` is written
// for the matcher — it is compared against candidate report text, so it reads
// like the symptom a candidate would describe, never like an internal note.
//
// Tier weights are 1 / 3 / 8 (CLAUDE.md), with BUG-15 raised to 12: completing
// a prescription with no diagnosis at all is the single most severe defect in
// the set. Honeypots carry weight 0 and never touch the composite.

import type { Module } from "./sut/modules";

export type Tier = 1 | 2 | 3;

export type PlantedBug = {
  id: string;
  module: Module;
  /** Internal label. Never shown to candidates. */
  title: string;
  /** What is wrong, and how to verify the plant landed. */
  description: string;
  /** Observable symptom in candidate vocabulary — matcher input. */
  repro: string;
  tier: Tier;
  weight: number;
  matchHints: string[];
  /** Excluded from the detection denominator; scored in its own column. */
  isHoneypot?: boolean;
};

export const BUG_KEY: PlantedBug[] = [
  // ── Tier 1 ──────────────────────────────────────────────
  {
    id: "BUG-01",
    module: "patient-registration",
    title: "Patient name accepts digits and symbols",
    description:
      "The name validator in NewPatientModal is loosened so it no longer rejects digits or punctuation. Verify by registering a patient named \"John99 #Smith\" — it saves and appears in the demographic bar unchanged.",
    repro:
      "I can register a new patient with numbers and symbols in the name field, like \"John99 #Smith\", and it saves without any error.",
    tier: 1,
    weight: 1,
    matchHints: [
      "numbers in patient name",
      "name accepts digits",
      "special characters in name field",
      "no validation on patient name",
      "symbols allowed in name",
    ],
  },
  {
    id: "BUG-02",
    module: "patient-registration",
    title: "Mobile number accepts fewer than 11 digits",
    description:
      "The mobile validator no longer enforces the 11-digit length, though it still requires the 01 prefix. Verify by registering with 0171234 — save is enabled and the patient is created.",
    repro:
      "The mobile number field accepts a short number like 0171234 and lets me save the patient. A Bangladeshi mobile should be 11 digits.",
    tier: 1,
    weight: 1,
    matchHints: [
      "mobile number too short",
      "phone accepts 7 digits",
      "no length check on mobile",
      "incomplete phone number saves",
      "mobile validation missing",
    ],
  },
  {
    id: "BUG-03",
    module: "vitals",
    title: "SpO₂ accepts impossible values while other vitals still validate",
    description:
      "The SpO₂ range check is removed from the vitals validator; pulse, BP, temperature and the rest still validate. Verify by entering 150 in SpO₂ — no inline message appears, while pulse 900 still shows one.",
    repro:
      "I can enter SpO2 of 150% and there is no error, but if I put 900 in pulse it does warn me. Oxygen saturation cannot be above 100%.",
    tier: 1,
    weight: 1,
    matchHints: [
      "SpO2 accepts 150",
      "oxygen saturation over 100",
      "SpO2 no range validation",
      "spo2 out of range accepted",
      "other vitals validate but not SpO2",
    ],
  },
  {
    id: "BUG-04",
    module: "toolbar",
    title: "Fee accepts a negative number",
    description:
      "The digit-only filter on the fee input is loosened to allow a leading minus, and validateFee is bypassed. Verify by typing -500 into FEE — it is accepted and persists on save.",
    repro:
      "The consultation fee field lets me enter a negative amount like -500 and saves it. A fee should never be below zero.",
    tier: 1,
    weight: 1,
    matchHints: [
      "negative fee accepted",
      "fee minus value",
      "fee below zero",
      "can enter -500 in fee",
      "no validation on fee amount",
    ],
  },
  {
    id: "BUG-05",
    module: "patient-registration",
    title: "Add button stays disabled until a field is re-focused",
    description:
      "The canAdd recomputation is made stale — it reads values captured before the last change. Verify by filling every required field: the Add button stays greyed out until you click into and out of any field again.",
    repro:
      "After filling in every required field the \"Add new patient\" button is still greyed out. It only becomes clickable if I click into another field and back out again.",
    tier: 1,
    weight: 1,
    matchHints: [
      "add button stays disabled",
      "save button not enabling",
      "button greyed out after filling form",
      "have to click another field to enable",
      "add patient button unresponsive",
    ],
  },
  {
    id: "BUG-06",
    module: "master-data",
    title: "Manage Diagnosis saves a record with a blank name",
    description:
      "The addIsValid guard in ManageDiagnosisModal drops its name check. Verify by opening Manage Diagnosis, adding a record with only a code, and saving — a nameless row appears in the list.",
    repro:
      "In Manage Diagnosis I can save a new diagnosis without typing a name at all. It appears in the list as a blank row.",
    tier: 1,
    weight: 1,
    matchHints: [
      "blank diagnosis saved",
      "empty name accepted in manage diagnosis",
      "diagnosis without name",
      "nameless record in master data",
      "no required field check",
    ],
  },

  // ── Tier 2 ──────────────────────────────────────────────
  {
    id: "BUG-07",
    module: "investigation",
    title: "Deleting a test removes the following row",
    description:
      "The delete handler in the Investigation list is switched from id matching to an index-based filter that is off by one. Verify with three tests: deleting the second removes the third instead.",
    repro:
      "In Investigation I added three tests and clicked the X on the second one. It deleted the third test instead — the one I wanted to remove is still there.",
    tier: 2,
    weight: 3,
    matchHints: [
      "deletes wrong row",
      "delete removes the next item",
      "off by one when deleting test",
      "clicking X deletes different test",
      "wrong investigation removed",
    ],
  },
  {
    id: "BUG-08",
    module: "treatment",
    title: "Same drug can be added twice with no duplicate warning",
    description:
      "The duplicate detection in TreatmentAddRows is disabled so the inline warning never renders. Verify by picking the same medicine twice — both rows appear with no amber notice.",
    repro:
      "I added the same medicine twice in Treatment and nothing warned me. The prescription now lists the identical drug on two rows.",
    tier: 2,
    weight: 3,
    matchHints: [
      "duplicate medicine no warning",
      "same drug added twice",
      "no duplicate check in treatment",
      "repeated medication accepted",
      "prescribed the same drug two times",
    ],
  },
  {
    id: "BUG-09",
    module: "patient",
    title: "Patient search matches only the exact full mobile string",
    description:
      "The demographic search filter drops its substring and name matching, comparing the query to the full phone number with strict equality. Verify by typing a partial number or a patient name — no results until the entire mobile is typed.",
    repro:
      "Searching for a patient by name returns nothing, and a partial mobile number returns nothing either. Only typing the complete 11-digit number finds anyone.",
    tier: 2,
    weight: 3,
    matchHints: [
      "cannot search patient by name",
      "partial mobile returns nothing",
      "search needs exact full number",
      "patient search not matching",
      "no results unless full phone typed",
    ],
  },
  {
    id: "BUG-10",
    module: "patient-registration",
    title: "Age and DOB stop reconciling and a mismatch saves silently",
    description:
      "The auto-sync between the age and DOB fields is severed and the agreement validator is bypassed. Verify by entering a DOB of 1990 and an age of 12 — both persist and the patient saves with contradictory data.",
    repro:
      "I set the date of birth to 1990 and then typed age 12. Neither field corrected the other and the patient saved with an age that does not match the date of birth.",
    tier: 2,
    weight: 3,
    matchHints: [
      "age does not match date of birth",
      "DOB and age inconsistent",
      "age not auto-calculated from DOB",
      "contradictory age saved",
      "birth date does not update age",
    ],
  },
  {
    id: "BUG-11",
    module: "toolbar",
    title: "New Visit does not increment the counter until reload",
    description:
      "startNewVisit stops deriving visitNumber from the completed count, leaving the toolbar label stale. Verify by completing a prescription and starting a new visit — the counter still shows the old number until the page is reloaded.",
    repro:
      "After completing a prescription I started a new visit, but the visit number in the toolbar did not change. It only shows the correct number after I refresh the page.",
    tier: 2,
    weight: 3,
    matchHints: [
      "visit number not incrementing",
      "visit counter stale",
      "visit count only updates after refresh",
      "new visit shows old number",
      "visit 1/1 after second visit",
    ],
  },
  {
    id: "BUG-12",
    module: "toolbar",
    title: "Back discards unsaved data with no confirmation",
    description:
      "The isDirty guard on the Back button is removed so it navigates immediately. Verify by entering data without saving and clicking Back — the prescription is lost with no prompt.",
    repro:
      "I typed a lot into the prescription, clicked Back by accident, and everything was gone. It never asked me whether I wanted to leave without saving.",
    tier: 2,
    weight: 3,
    matchHints: [
      "no confirmation on back",
      "lost unsaved work",
      "back button discards data",
      "no warning when leaving page",
      "unsaved changes lost silently",
    ],
  },
  {
    id: "BUG-13",
    module: "master-data",
    title: "Panel-member test cannot be deleted from the panel view",
    description:
      "Discovered during the build, not authored. A collapsed panel's detail view offers Edit but no per-test Delete, so a member test cannot be removed without first making it standalone. Verify by opening Manage Test, selecting a multi-member panel, and looking for a delete control on any member.",
    repro:
      "In Manage Test I opened a panel like Complete Blood Count and there is no way to delete one of the tests inside it. I can edit them but not remove them.",
    tier: 2,
    weight: 3,
    matchHints: [
      "cannot delete test in panel",
      "no delete option for panel member",
      "panel test not removable",
      "missing delete button in panel view",
      "have to delete whole panel",
    ],
  },
  {
    id: "BUG-14",
    module: "templates",
    title: "\"Needs Details\" pill and counter gate nothing",
    description:
      "Discovered during the build, not authored. A free-text row in the Save-as-Template modals shows a \"Needs Details\" pill and is counted in the footer, but the Save button ignores both. Verify by saving a template containing an incomplete free-text medication — it saves regardless.",
    repro:
      "The template modal shows a \"Needs Details\" tag on a medicine and says some items need details, but the Save button works anyway and saves the incomplete item.",
    tier: 2,
    weight: 3,
    matchHints: [
      "needs details warning does nothing",
      "can save despite needs details",
      "incomplete item still saves",
      "warning is not enforced",
      "counter says needs details but saves",
    ],
  },

  // ── Tier 3 ──────────────────────────────────────────────
  {
    id: "BUG-15",
    module: "diagnosis",
    title: "Completes with the diagnosis section entirely empty",
    description:
      "The diagnosis requirement is removed from the Preview & Complete gate. Verify by completing a prescription with no diagnosis at all — the A4 preview opens and the record is locked with an empty diagnosis section. The most severe defect in the set; weighted 12.",
    repro:
      "I completed and printed a prescription without entering any diagnosis. Nothing stopped me and the printout has no diagnosis on it at all.",
    tier: 3,
    weight: 12,
    matchHints: [
      "completed without diagnosis",
      "no diagnosis required",
      "prescription printed with empty diagnosis",
      "can finalise with no diagnosis",
      "missing diagnosis not blocked",
    ],
  },
  {
    id: "BUG-16",
    module: "preview",
    title: "Preview renders a different medication duration than the form holds",
    description:
      "The preview's dose line is composed from a stale or wrong phase, so the printed duration diverges from the Treatment row. Verify by setting a 30-day duration and opening the preview — the printout shows a different figure.",
    repro:
      "I prescribed a medicine for 30 days but the preview printout shows a different duration. The dose line on the printed page does not match what I entered in Treatment.",
    tier: 3,
    weight: 8,
    matchHints: [
      "preview shows wrong duration",
      "printout does not match form",
      "dose differs on printed prescription",
      "duration changed in preview",
      "medicine days incorrect on printout",
    ],
  },
  {
    id: "BUG-17",
    module: "toolbar",
    title: "Prescription date accepts a future date",
    description:
      "validateRxDate is bypassed on the toolbar date picker. Verify by setting the prescription date to a date next year — it is accepted, saved and printed with no warning.",
    repro:
      "I can set the prescription date to a date in the future, like next year, and it saves and prints that way with no warning.",
    tier: 3,
    weight: 8,
    matchHints: [
      "future prescription date allowed",
      "date in the future accepted",
      "can backdate or postdate prescription",
      "no check on prescription date",
      "next year date saves",
    ],
  },
  {
    id: "BUG-18",
    module: "toolbar",
    title: "New Visit opens pre-filled with the previous visit's prescription",
    description:
      "completeDraft moves the record into completed[] and locks it but no longer clears the draft slot, so startNewVisit finds the previous visit still there. Verify by completing a prescription, then starting a new visit — complaints, diagnoses, medications, tests and advice are all carried over instead of the form being empty.",
    repro:
      "I finished one patient's prescription, then started a new visit for them and the whole previous prescription was already filled in — same diagnosis, same medicines, same tests. I have to clear it all by hand before I can write the new one.",
    tier: 3,
    weight: 8,
    matchHints: [
      "new visit shows previous prescription",
      "form not cleared for new visit",
      "old medicines carried over",
      "previous visit data still there",
      "new visit not starting blank",
    ],
  },
  {
    id: "BUG-19",
    module: "vitals",
    title: "Vitals remain editable after Complete",
    description:
      "The completion lock stops covering the vitals block, so its inputs stay live while the rest of the prescription is read-only. Verify by completing a prescription and typing into pulse — the value changes.",
    repro:
      "After I completed the prescription everything else is locked, but I can still type new numbers into the vitals fields. A completed prescription should not be editable.",
    tier: 3,
    weight: 8,
    matchHints: [
      "vitals editable after complete",
      "completed prescription still editable",
      "lock does not cover vitals",
      "can change pulse after completing",
      "read-only not applied everywhere",
    ],
  },
  {
    id: "BUG-20",
    module: "templates",
    title: "Inserting an Overall template appends instead of replacing",
    description:
      "The Overall insert handler concatenates the template's rows onto the existing sections rather than replacing them. Verify by entering a complaint, diagnosis, medicine, test and advice, then inserting an Overall template — every section ends up holding both sets. Distinct from HP-01, which is that vitals are overwritten at all; this is that insert stops replacing.",
    repro:
      "I had already written part of a prescription, then inserted an overall template and everything doubled up. The diagnosis I typed is still there and the template's is underneath it, same with the medicines and the tests.",
    tier: 3,
    weight: 8,
    matchHints: [
      "template duplicates existing entries",
      "insert adds instead of replacing",
      "everything doubled after template",
      "old and new rows both present",
      "template does not clear the section",
    ],
  },

  // ── Honeypots ───────────────────────────────────────────
  // Correct behaviour that looks like a defect. Never scored in the
  // composite; tracked in their own column, split by whether the candidate
  // reported it as a defect or raised it as a question.
  {
    id: "HP-01",
    module: "templates",
    title: "Inserting an Overall template overwrites vitals",
    description:
      "Correct behaviour per DR-027 — an Overall template carries all nine sections including vitals, and inserting it replaces them. Accepted on the product owner's instruction. A candidate reporting this as data loss has misread intended behaviour.",
    repro:
      "I inserted an overall template and it wiped the vitals I had already entered, replacing them with the template's values.",
    tier: 1,
    weight: 0,
    isHoneypot: true,
    matchHints: [
      "template overwrites vitals",
      "inserting template erased my data",
      "vitals replaced by template",
      "lost vitals after inserting template",
      "template should not touch vitals",
    ],
  },
  {
    id: "HP-02",
    module: "templates",
    title: "Free-text medication shows blank brand, class and manufacturer",
    description:
      "Correct behaviour per DR-028 — a free-text medication carries no drugId, so there is no catalogue entry to resolve those fields from. Blank is the specified rendering; the fields are shown rather than hidden so the doctor can see what is missing.",
    repro:
      "In the template modal a medicine I typed by hand shows empty brand name, drug class and manufacturer. The fields are there but nothing is filled in.",
    tier: 1,
    weight: 0,
    isHoneypot: true,
    matchHints: [
      "blank brand and manufacturer",
      "empty drug class in template",
      "medicine details missing",
      "fields not populated for typed medicine",
      "catalogue fields blank",
    ],
  },
  {
    id: "HP-03",
    module: "preview",
    title: "Top third of the printout is blank",
    description:
      "Correct behaviour per the production output — the top third of the A4 page is deliberately left blank for pre-printed letterhead. A candidate reporting it as a layout defect has misread intended behaviour.",
    repro:
      "The printed prescription has a large empty space at the top of the page before any content starts. It looks like the layout is broken or the header failed to render.",
    tier: 1,
    weight: 0,
    isHoneypot: true,
    matchHints: [
      "blank space at top of printout",
      "empty header on printed page",
      "large gap before content",
      "preview layout broken at top",
      "missing header in preview",
    ],
  },
];
