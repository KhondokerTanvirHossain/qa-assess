// Shared SUT state types.
//
// Types that already exist in components/sut/PrescriptionApp.tsx are imported
// from there rather than redefined, so the two never drift. Types that only
// the state layer needs are declared here.

import type {
  PatientPick,
  V2MedicineItem,
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
  medications: unknown[]; // typed in the medications brief
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
