// Seed fixture for a fresh candidate token.
//
// DR-007: populated reference data, zero saved prescriptions. Libraries and
// the patient pool come from the module constants that already ship with the
// ported design file, so the seeded state matches what the prototype showed.

import {
  PATIENT_POOL,
  MEDICINE_LIBRARY_V2,
  TEST_LIBRARY,
  DIAGNOSIS_LIBRARY,
  ADVICE_LIBRARY,
} from "@/components/sut/PrescriptionApp";
import type { SutState } from "./types";

export function createSeedState(): SutState {
  return {
    patients: [...PATIENT_POOL],
    prescriptions: {},
    libraries: {
      medicines: [...MEDICINE_LIBRARY_V2],
      tests: [...TEST_LIBRARY],
      diagnoses: [...DIAGNOSIS_LIBRARY],
      advice: [...ADVICE_LIBRARY],
    },
    templates: {
      overall: [
        {
          id: "ovr-seed-1",
          title: "Hypertension — first visit",
          chief: ["Headache", "Dizziness", "Palpitations"],
          treatment: ["Tab. Amlodipine 5 mg", "Tab. Losartan 50 mg"],
          tests: ["ECG", "Lipid profile", "Serum creatinine"],
          advice: ["Reduce salt intake", "Walk at least 30 minutes every day"],
        },
        {
          id: "ovr-seed-2",
          title: "Type 2 diabetes — initial",
          chief: ["Excessive thirst", "Frequent urination", "Fatigue"],
          treatment: ["Tab. Metformin 500 mg"],
          tests: ["Fasting blood sugar (FBS)", "HbA1c", "Serum creatinine"],
          advice: [
            "Avoid sweets and starchy foods",
            "Check blood sugar regularly",
          ],
        },
        {
          id: "ovr-seed-3",
          title: "URTI / common cold",
          chief: ["Sore throat", "Runny nose", "Mild fever"],
          treatment: ["Tab. Paracetamol 500 mg"],
          tests: ["Complete Blood Count (CBC)"],
          advice: ["Drink plenty of water (2.5–3 litres daily)"],
        },
      ],
      treatment: [
        {
          id: "trt-seed-1",
          title: "Hypertension starter",
          medicines: [
            { name: "Amdocal", dose: "1+0+0 — after meal — 30 days" },
            { name: "Losartil", dose: "0+0+1 — after meal — 30 days" },
          ],
        },
        {
          id: "trt-seed-2",
          title: "Diabetes starter",
          medicines: [
            { name: "Metfo", dose: "1+0+1 — after meal — 30 days" },
          ],
        },
        {
          id: "trt-seed-3",
          title: "Acute gastritis",
          medicines: [
            { name: "Seclo", dose: "1+0+1 — before meal — 14 days" },
            { name: "Domin", dose: "1+1+1 — before meal — 5 days" },
          ],
        },
      ],
      test: [
        {
          id: "tst-seed-1",
          title: "Diabetes panel",
          tests: ["Fasting blood sugar (FBS)", "HbA1c", "Serum creatinine"],
        },
        {
          id: "tst-seed-2",
          title: "Cardiac screen",
          tests: ["ECG", "Lipid profile", "Echocardiography"],
        },
        {
          id: "tst-seed-3",
          title: "Routine baseline",
          tests: [
            "Complete Blood Count (CBC)",
            "Urine Routine Examination",
            "Liver function test (LFT)",
          ],
        },
      ],
      advice: [
        {
          id: "adv-seed-1",
          title: "Hypertension post-visit",
          advices: [
            "Reduce salt intake",
            "Measure blood pressure regularly",
            "Walk at least 30 minutes every day",
          ],
        },
        {
          id: "adv-seed-2",
          title: "Diabetes lifestyle",
          advices: [
            "Avoid sweets and starchy foods",
            "Check blood sugar regularly",
            "Get adequate rest and sleep (7–8 hours)",
          ],
        },
        {
          id: "adv-seed-3",
          title: "General wellness",
          advices: [
            "Maintain a normal diet",
            "Drink plenty of water (2.5–3 litres daily)",
            "Reduce mental stress",
          ],
        },
      ],
    },
  };
}
