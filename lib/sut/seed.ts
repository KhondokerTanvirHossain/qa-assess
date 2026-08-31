// Seed fixture for a fresh candidate token.
//
// DR-007: populated reference data, zero saved prescriptions. Libraries and
// the patient pool come from the module constants that already ship with the
// ported design file, so the seeded state matches what the prototype showed.

import {
  PATIENT_POOL,
  MOCK_DRUGS,
  MOCK_TESTS,
  MOCK_DIAGNOSES,
  MOCK_ADVICES,
  DEFAULT_EMPTY_SCHEMA,
} from "@/components/sut/PrescriptionApp";
import type { Medication, SutState, TemplatePayload, V2FieldType } from "./types";

// Seed ids are literals so a fresh fixture is byte-identical every boot.
// Rows created at runtime get generated ids instead.
let seedSeq = 0;
const sid = (p: string) => `seed-${p}-${seedSeq++}`;

const EMPTY_VITALS = {
  pulse: "", bp: "", temperature: "", respRate: "", spo2: "", weight: "", height: "",
};

/** A payload with every section empty — spread over it to fill only what a
 *  template actually carries. */
const emptyPayload = (): TemplatePayload => ({
  complaints: [], history: [], drugHistory: [], vitals: { ...EMPTY_VITALS },
  diagnoses: [], medications: [], tests: [], advice: [],
  followUp: { mode: "After", amount: "7", unit: "Days", date: "" },
  referTo: "",
});

const med = (
  medicine: string, generic: string, form: Medication["form"],
  phases: Medication["phases"], typeText: string,
): Medication => ({
  id: sid("med"), medicine, generic, form,
  schema: ["DOSAGE_UNIT", "FREQUENCY", "MEAL_TIMING", "DURATION", "NOTE"],
  phases, typeText,
});

export function createSeedState(): SutState {
  return {
    patients: [...PATIENT_POOL],
    prescriptions: {},
    // Full catalogue records (DR-028). `schema` is derived from the first
    // dose's schemaValues keys — that dose is the authority on which form
    // fields the drug renders. Drugs with no dose detail fall back to the
    // default schema, matching a free-text entry.
    libraries: {
      drugs: MOCK_DRUGS.map((d) => {
        const keys = Object.keys(d.doses[0]?.schemaValues ?? {}) as V2FieldType[];
        return {
          ...d,
          schema: keys.length > 0 ? keys : [...DEFAULT_EMPTY_SCHEMA],
          defaults: d.doses[0]?.schemaValues,
        };
      }),
      tests: MOCK_TESTS.map((t) => ({ ...t })),
      diagnoses: MOCK_DIAGNOSES.map((d) => ({ ...d })),
      advice: MOCK_ADVICES.map((a) => ({ ...a })),
    },
    templates: {
      overall: [
        {
          id: sid("ovr"),
          title: "Hypertension — first visit",
          payload: {
            ...emptyPayload(),
            complaints: [
              { id: sid("c"), text: "Headache", remark: "Occipital, early morning" },
              { id: sid("c"), text: "Dizziness", remark: "On standing" },
            ],
            history: [{ id: sid("h"), text: "Hypertension in family", remark: "Father" }],
            drugHistory: [{ id: sid("dh"), text: "No antihypertensive so far" }],
            vitals: { ...EMPTY_VITALS, bp: "150/95", pulse: "88" },
            diagnoses: [{ id: sid("dx"), text: "Essential hypertension" }],
            medications: [
              med("Tab. Amdocal 5 mg (Amlodipine)", "Amlodipine", "tablet",
                [{ DOSAGE_UNIT: "১ ট্যাব", FREQUENCY: "১+০+০", MEAL_TIMING: "খাবারের পরে", DURATION: "৩০ দিন" }],
                "১টা করে সকালে খাবারের পরে - ৩০ দিন"),
              med("Tab. Losartil 50 mg (Losartan)", "Losartan", "tablet",
                [{ DOSAGE_UNIT: "১ ট্যাব", FREQUENCY: "০+০+১", MEAL_TIMING: "খাবারের পরে", DURATION: "৩০ দিন" }],
                "১টা করে রাতে খাবারের পরে - ৩০ দিন"),
            ],
            tests: [
              { id: sid("t"), text: "ECG" },
              { id: sid("t"), text: "Lipid profile" },
              { id: sid("t"), text: "Serum creatinine" },
            ],
            advice: [
              { id: sid("a"), bn: "লবণ কম খাবেন", en: "Reduce salt intake", showEn: false },
              { id: sid("a"), bn: "প্রতিদিন কমপক্ষে ৩০ মিনিট হাঁটাচলা করুন", en: "Walk at least 30 minutes every day", showEn: false },
            ],
            followUp: { mode: "After", amount: "30", unit: "Days", date: "" },
          },
        },
        {
          id: sid("ovr"),
          title: "Type 2 diabetes — initial",
          payload: {
            ...emptyPayload(),
            complaints: [
              { id: sid("c"), text: "Excessive thirst", remark: "Several weeks" },
              { id: sid("c"), text: "Frequent urination", remark: "Nocturia ×3" },
            ],
            vitals: { ...EMPTY_VITALS, weight: "82" },
            diagnoses: [{ id: sid("dx"), text: "Type 2 Diabetes Mellitus" }],
            medications: [
              med("Tab. Metfo 500 mg (Metformin)", "Metformin", "tablet",
                [{ DOSAGE_UNIT: "১ ট্যাব", FREQUENCY: "১+০+১", MEAL_TIMING: "খাবারের পরে", DURATION: "৩০ দিন" }],
                "১টা করে সকালে ও রাতে খাবারের পরে - ৩০ দিন"),
            ],
            tests: [
              { id: sid("t"), text: "Fasting blood sugar (FBS)" },
              { id: sid("t"), text: "HbA1c" },
              { id: sid("t"), text: "Serum creatinine" },
            ],
            advice: [
              { id: sid("a"), bn: "মিষ্টি ও শর্করা জাতীয় খাবার এড়িয়ে চলুন", en: "Avoid sweets and starchy foods", showEn: false },
              { id: sid("a"), bn: "নিয়মিত রক্তে চিনির মাত্রা পরীক্ষা করুন", en: "Check blood sugar regularly", showEn: false },
            ],
            followUp: { mode: "After", amount: "14", unit: "Days", date: "" },
          },
        },
        {
          id: sid("ovr"),
          title: "URTI / common cold",
          payload: {
            ...emptyPayload(),
            complaints: [
              { id: sid("c"), text: "Sore throat", remark: "3 days" },
              { id: sid("c"), text: "Runny nose", remark: "" },
            ],
            vitals: { ...EMPTY_VITALS, temperature: "100.4" },
            diagnoses: [{ id: sid("dx"), text: "Acute pharyngitis" }],
            medications: [
              med("Tab. Napa 500 mg (Paracetamol)", "Paracetamol", "tablet",
                [{ DOSAGE_UNIT: "১ ট্যাব", FREQUENCY: "১+০+১", MEAL_TIMING: "খাবারের পরে", DURATION: "৫ দিন" }],
                "১টা করে সকালে ও রাতে খাবারের পরে - ৫ দিন"),
            ],
            tests: [{ id: sid("t"), text: "Complete Blood Count (CBC)" }],
            advice: [
              { id: sid("a"), bn: "প্রচুর পানি পান করুন (২.৫–৩ লিটার)", en: "Drink plenty of water (2.5–3 litres daily)", showEn: false },
              { id: sid("a"), bn: "পর্যাপ্ত বিশ্রাম ও ঘুম নিন (৭–৮ ঘণ্টা)", en: "Get adequate rest and sleep (7–8 hours)", showEn: false },
            ],
            followUp: { mode: "After", amount: "7", unit: "Days", date: "" },
          },
        },
      ],
      treatment: [
        {
          id: sid("trt"),
          title: "Hypertension starter",
          medications: [
            med("Tab. Amdocal 5 mg (Amlodipine)", "Amlodipine", "tablet",
              [{ DOSAGE_UNIT: "১ ট্যাব", FREQUENCY: "১+০+০", MEAL_TIMING: "খাবারের পরে", DURATION: "৩০ দিন" }],
              "১টা করে সকালে খাবারের পরে - ৩০ দিন"),
            med("Tab. Losartil 50 mg (Losartan)", "Losartan", "tablet",
              [{ DOSAGE_UNIT: "১ ট্যাব", FREQUENCY: "০+০+১", MEAL_TIMING: "খাবারের পরে", DURATION: "৩০ দিন" }],
              "১টা করে রাতে খাবারের পরে - ৩০ দিন"),
          ],
        },
        {
          id: sid("trt"),
          title: "Acute gastritis",
          medications: [
            med("Cap. Seclo 20 mg (Omeprazole)", "Omeprazole", "capsule",
              [{ DOSAGE_UNIT: "১ ক্যাপ", FREQUENCY: "১+০+১", MEAL_TIMING: "খাবারের আগে", DURATION: "১৪ দিন" }],
              "১টা করে সকালে ও রাতে খাবারের আগে - ১৪ দিন"),
            med("Tab. Domin 10 mg (Domperidone)", "Domperidone", "tablet",
              [{ DOSAGE_UNIT: "১ ট্যাব", FREQUENCY: "১+১+১", MEAL_TIMING: "খাবারের আগে", DURATION: "৫ দিন" }],
              "১টা করে দিনে তিনবার খাবারের আগে - ৫ দিন"),
          ],
        },
        {
          id: sid("trt"),
          title: "Prednisolone taper",
          medications: [
            med("Tab. Deltasone 5 mg (Prednisolone)", "Prednisolone", "tablet",
              [
                { DOSAGE_UNIT: "৪ ট্যাব", FREQUENCY: "১+০+০", MEAL_TIMING: "খাবারের পরে", DURATION: "৭ দিন" },
                { DOSAGE_UNIT: "২ ট্যাব", FREQUENCY: "১+০+০", MEAL_TIMING: "খাবারের পরে", DURATION: "৭ দিন" },
                { DOSAGE_UNIT: "১ ট্যাব", FREQUENCY: "১+০+০", MEAL_TIMING: "খাবারের পরে", DURATION: "৭ দিন" },
              ],
              "৪টা ৭ দিন, তারপর ২টা ৭ দিন, তারপর ১টা ৭ দিন - সকালে খাবারের পরে"),
          ],
        },
      ],
      test: [
        {
          id: sid("tst"),
          title: "Diabetes panel",
          tests: [
            { id: sid("t"), text: "Fasting blood sugar (FBS)" },
            { id: sid("t"), text: "HbA1c" },
            { id: sid("t"), text: "Serum creatinine" },
          ],
        },
        {
          id: sid("tst"),
          title: "Cardiac screen",
          tests: [
            { id: sid("t"), text: "ECG" },
            { id: sid("t"), text: "Lipid profile" },
            { id: sid("t"), text: "Echocardiography" },
          ],
        },
        {
          id: sid("tst"),
          title: "Routine baseline",
          tests: [
            { id: sid("t"), text: "Complete Blood Count (CBC)" },
            { id: sid("t"), text: "Urine Routine Examination" },
            { id: sid("t"), text: "Liver function test (LFT)" },
          ],
        },
      ],
      advice: [
        {
          id: sid("adv"),
          title: "Hypertension post-visit",
          advice: [
            { id: sid("a"), bn: "লবণ কম খাবেন", en: "Reduce salt intake", showEn: false },
            { id: sid("a"), bn: "নিয়মিত রক্তচাপ পরিমাপ করুন", en: "Measure blood pressure regularly", showEn: false },
            { id: sid("a"), bn: "প্রতিদিন কমপক্ষে ৩০ মিনিট হাঁটাচলা করুন", en: "Walk at least 30 minutes every day", showEn: false },
          ],
        },
        {
          id: sid("adv"),
          title: "Diabetes lifestyle",
          advice: [
            { id: sid("a"), bn: "মিষ্টি ও শর্করা জাতীয় খাবার এড়িয়ে চলুন", en: "Avoid sweets and starchy foods", showEn: false },
            { id: sid("a"), bn: "নিয়মিত রক্তে চিনির মাত্রা পরীক্ষা করুন", en: "Check blood sugar regularly", showEn: false },
            { id: sid("a"), bn: "পর্যাপ্ত বিশ্রাম ও ঘুম নিন (৭–৮ ঘণ্টা)", en: "Get adequate rest and sleep (7–8 hours)", showEn: false },
          ],
        },
        {
          id: sid("adv"),
          title: "General wellness",
          advice: [
            { id: sid("a"), bn: "স্বাভাবিক সব খাবার খাবেন", en: "Maintain a normal diet", showEn: false },
            { id: sid("a"), bn: "প্রচুর পানি পান করুন (২.৫–৩ লিটার)", en: "Drink plenty of water (2.5–3 litres daily)", showEn: false },
            { id: sid("a"), bn: "মানসিক চাপ কমান", en: "Reduce mental stress", showEn: false },
          ],
        },
      ],
    },
  };
}
