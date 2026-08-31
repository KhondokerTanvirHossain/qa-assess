// Shared SUT state types.
//
// Types that already exist in components/sut/PrescriptionApp.tsx are imported
// from there rather than redefined, so the two never drift. Types that only
// the state layer needs are declared here.

import type {
  PatientPick,
  V2MedicineItem,
  V2MedicineForm,
  V2FieldType,
  AdviceLibEntry,
  SavedAdvice,
  OverallTemplate,
  TreatmentTemplate,
  TestTemplate,
  AdviceTemplate,
} from "@/components/sut/PrescriptionApp";
import { TEST_LIBRARY, DIAGNOSIS_LIBRARY } from "@/components/sut/PrescriptionApp";

export type {
  PatientPick,
  V2MedicineItem,
  V2MedicineForm,
  V2FieldType,
  AdviceLibEntry,
  SavedAdvice,
  OverallTemplate,
  TreatmentTemplate,
  TestTemplate,
  AdviceTemplate,
};

/** A list row that owns a stable id. Ids are generated on add, live for the
 *  row's lifetime, and are never derived from content or index (DR-025). */
export type ListRow = { id: string; text: string };

/** One medication row. `phases` models a tapering regimen — each entry is a
 *  dose chain sharing the medicine's schema (DR-026). */
export type Medication = {
  id: string;
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

export type SutState = {
  patients: PatientPick[];
  prescriptions: Record<
    string,
    {
      draft: Prescription | null;
      completed: Prescription[];
    }
  >;
  libraries: {
    medicines: V2MedicineItem[];
    tests: typeof TEST_LIBRARY;
    diagnoses: typeof DIAGNOSIS_LIBRARY;
    advice: AdviceLibEntry[];
  };
  templates: {
    overall: OverallTemplate[];
    treatment: TreatmentTemplate[];
    test: TestTemplate[];
    advice: AdviceTemplate[];
  };
};
