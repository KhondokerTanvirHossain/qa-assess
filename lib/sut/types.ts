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
  complaints: { text: string; remark: string }[];
  history: { text: string; remark: string }[];
  drugHistory: string[];
  diagnoses: string[];
  medications: unknown[]; // typed in the medications brief
  tests: string[];
  advice: SavedAdvice[];
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
