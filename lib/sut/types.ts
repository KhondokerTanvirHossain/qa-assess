// Shared SUT state types.
//
// Types that already exist in components/sut/PrescriptionApp.tsx are imported
// from there rather than redefined, so the two never drift. Types that only
// the state layer needs are declared here.

import type {
  PatientPick,
  V2MedicineItem,
  DrugItem,
  TestItem,
  DiagnosisItem,
  AdviceItem,
  V2MedicineForm,
  V2FieldType,
  AdviceLibEntry,
  SavedAdvice,
} from "@/components/sut/PrescriptionApp";

export type {
  PatientPick,
  V2MedicineItem,
  DrugItem,
  TestItem,
  DiagnosisItem,
  AdviceItem,
  V2MedicineForm,
  V2FieldType,
  AdviceLibEntry,
  SavedAdvice,
};

/** A list row that owns a stable id. Ids are generated on add, live for the
 *  row's lifetime, and are never derived from content or index (DR-025). */
export type ListRow = { id: string; text: string };

/** One medication row. `phases` models a tapering regimen — each entry is a
 *  dose chain sharing the medicine's schema (DR-026). */
export type Medication = {
  id: string;
  /** References the library DrugItem this row came from. Absent for free-text
   *  entries. May dangle if the library entry is later deleted (DR-028). */
  drugId?: string;
  medicine: string;
  generic: string;
  form?: V2MedicineForm;
  schema: V2FieldType[];
  phases: Array<Partial<Record<V2FieldType, string>>>;
  typeText: string;
};

export type Prescription = {
  id: string;
  patientId: string;
  visitType: string;
  visitNumber: number;
  date: string;
  fee: string;
  vitals: {
    pulse: string;
    bp: string;
    temperature: string;
    respRate: string;
    spo2: string;
    weight: string;
    height: string;
  };
  physicalFindingsNote: string;
  complaints: { id: string; text: string; remark: string }[];
  history: { id: string; text: string; remark: string }[];
  drugHistory: ListRow[];
  diagnoses: ListRow[];
  medications: Medication[];
  tests: ListRow[];
  advice: (SavedAdvice & { id: string })[];
  followUp: { mode: "After" | "On"; amount: string; unit: string; date: string };
  referTo: string;
  status: "draft" | "completed";
  completedAt: string | null;
};

/** Everything a template carries. Fee, date, visit type and the patient are
 *  deliberately excluded — they are visit-specific, not reusable (DR-027). */
export type TemplatePayload = {
  complaints: Prescription["complaints"];
  history: Prescription["history"];
  drugHistory: Prescription["drugHistory"];
  vitals: Prescription["vitals"];
  diagnoses: Prescription["diagnoses"];
  medications: Medication[];
  tests: Prescription["tests"];
  advice: Prescription["advice"];
  followUp: Prescription["followUp"];
  referTo: string;
};

export type OverallTemplate = { id: string; title: string; payload: TemplatePayload };
export type TreatmentTemplate = { id: string; title: string; medications: Medication[] };
export type TestTemplate = { id: string; title: string; tests: Prescription["tests"] };
export type AdviceTemplate = { id: string; title: string; advice: Prescription["advice"] };

export type SutState = {
  patients: PatientPick[];
  prescriptions: Record<
    string,
    {
      draft: Prescription | null;
      completed: Prescription[];
    }
  >;
  // Full catalogue records — the Manage modals' own shapes. Consumers derive
  // their display strings at read time (DR-028).
  libraries: {
    drugs: DrugItem[];
    tests: TestItem[];
    diagnoses: DiagnosisItem[];
    advice: AdviceItem[];
  };
  templates: {
    overall: OverallTemplate[];
    treatment: TreatmentTemplate[];
    test: TestTemplate[];
    advice: AdviceTemplate[];
  };
};
