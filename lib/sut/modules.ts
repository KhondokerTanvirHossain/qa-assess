// Module vocabulary (DR-023).
//
// One source of truth for `data-module` attribution and the coverage matrix.
// The SUT stamps these onto section wrappers and modal roots; bugKey.ts types
// its Module field against the same union. Divergent lists would make the
// coverage matrix compare two different things.

export const MODULES = [
  "patient", "patient-registration", "vitals", "complaints", "history",
  "drug-history", "diagnosis", "treatment", "investigation", "advice",
  "follow-up", "test-results", "templates",
  "master-data", "preview", "toolbar",
] as const;

export type Module = (typeof MODULES)[number];
