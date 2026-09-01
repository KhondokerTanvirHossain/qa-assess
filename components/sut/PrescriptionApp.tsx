"use client";
import { useState, useEffect, useMemo, useRef, Fragment } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useSut } from "@/lib/sut/SutProvider";
import type {
  ListRow as SutListRow,
  Medication,
  Prescription,
  TemplatePayload,
  OverallTemplate,
  TreatmentTemplate,
  TestTemplate,
  AdviceTemplate,
} from "@/lib/sut/types";

// The six lifted medication data fields, without the row id. The trailing
// blank add-row holds one of these locally until it is promoted.
type MedicationData = Omit<Medication, "id">;

export const DEFAULT_EMPTY_SCHEMA: V2FieldType[] = ["DOSAGE_UNIT", "FREQUENCY", "MEAL_TIMING", "DURATION", "NOTE"];
const EMPTY_MED_SCHEMA = DEFAULT_EMPTY_SCHEMA;
const blankMedication = (): MedicationData => ({
  medicine: "",
  generic: "",
  form: undefined,
  schema: EMPTY_MED_SCHEMA,
  phases: [{}],
  typeText: "",
});
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Save,
  Eye,
  X,
  Search,
  BookmarkPlus,
  FileDown,
  RefreshCw,
  Settings,
  Eraser,
  FlaskConical,
  Calendar,
  Trash2,
  ArrowUp,
  ArrowDown,
  MessageSquareText,
  Pencil,
  Plus,
  Check,
  Stethoscope,
  AlertCircle,
  ClipboardList,
  Languages,
  LayoutList,
  Type,
  UserCircle,
  Phone,
  MapPin,
  Heart,
  Briefcase,
  Sparkles,
  UserPlus,
  User,
  Camera,
  Upload,
  Info,
  Menu,
} from "lucide-react";
const iconMaximize = "/icons/icon-maximize.svg";

// ── Mock Data ──────────────────────────────────────────────
// Patient-selection variant — page starts with no patient. Fields populate
// once the doctor searches/selects/creates a patient in the demographic bar.
// Held in component state below so picking a row in the search panel can
// flip the page into the "patient selected" state.
type PatientRecord = {
  initials: string;
  name: string;
  id: string;
  age: string;
  sex: string;
  phone: string;
};
const EMPTY_PATIENT: PatientRecord = {
  initials: "",
  name: "",
  id: "",
  age: "",
  sex: "",
  phone: "",
};

const complaints: { text: string; remark: string }[] = [];

// Mock patient pool used by the demographic search panel. Each row mirrors
// the design handoff (avatar, name, #PT-code, phone). Matched by mobile,
// code, or name (case-insensitive substring). Age + sex are used when the
// row is picked — they populate the full v2-style demographic bar.
export type PatientPick = {
  initials: string;
  name: string;
  code: string;
  phone: string;
  age: string;
  sex: string;
};
export const PATIENT_POOL: PatientPick[] = [
  { initials: "AI", name: "Aminul Islam",     code: "PT-20260506-4315", phone: "01913711808", age: "32 yrs", sex: "Male" },
  { initials: "AH", name: "Ashraf Hossain",   code: "PT-20260507-3154", phone: "01756860265", age: "45 yrs", sex: "Male" },
  { initials: "HE", name: "Heronmoy Emon",    code: "PT-20260504-8364", phone: "01521204762", age: "28 yrs", sex: "Male" },
  { initials: "HH", name: "Hridoy Hossain",   code: "PT-20260503-3327", phone: "01911273358", age: "39 yrs", sex: "Male" },
  { initials: "MR", name: "Mushfiqur Rahman", code: "PT-20260502-9912", phone: "01710445566", age: "41 yrs", sex: "Male" },
  { initials: "TA", name: "Tasnim Akter",     code: "PT-20260501-7321", phone: "01825336699", age: "34 yrs", sex: "Female" },
  { initials: "SA", name: "Sabbir Ahmed",     code: "PT-20260430-2208", phone: "01615998877", age: "26 yrs", sex: "Male" },
];

// Library of common medicines used by the Treatment "Add medication" typeahead.
// Dose-builder dropdown options. `bn` is the token used when composing the
// final Bengali dose string; `label` is what the dropdown shows.
type DoseOption = { value: string; label: string; bn: string };

const SCHEDULE_OPTIONS: DoseOption[] = [
  { value: "1+0+0",   label: "1+0+0",     bn: "১+০+০" },
  { value: "0+0+1",   label: "0+0+1",     bn: "০+০+১" },
  { value: "1+0+1",   label: "1+0+1",     bn: "১+০+১" },
  { value: "1+1+1",   label: "1+1+1",     bn: "১+১+১" },
  { value: "1+1+1+1", label: "1+1+1+1",   bn: "১+১+১+১" },
  { value: "half",    label: "½",         bn: "আধা টা করে" },
  { value: "asneeded",label: "As needed", bn: "প্রয়োজনে" },
];

const WHEN_OPTIONS: DoseOption[] = [
  { value: "after",  label: "After meal",   bn: "আহারের পর" },
  { value: "before", label: "Before meal",  bn: "আহারের আগে" },
  { value: "with",   label: "With meal",    bn: "আহারের সাথে" },
  { value: "empty",  label: "Empty stomach",bn: "খালি পেটে" },
  { value: "bed",    label: "At bedtime",   bn: "ঘুমানোর আগে" },
];

const DURATION_OPTIONS: DoseOption[] = [
  { value: "3d",   label: "3 Days",   bn: "৩ দিন" },
  { value: "5d",   label: "5 Days",   bn: "৫ দিন" },
  { value: "7d",   label: "7 Days",   bn: "৭ দিন" },
  { value: "10d",  label: "10 Days",  bn: "১০ দিন" },
  { value: "14d",  label: "14 Days",  bn: "১৪ দিন" },
  { value: "3w",   label: "3 Weeks",  bn: "৩ সপ্তাহ" },
  { value: "1m",   label: "1 Month",  bn: "১ মাস" },
  { value: "2m",   label: "2 Months", bn: "২ মাস" },
  { value: "3m",   label: "3 Months", bn: "৩ মাস" },
  { value: "cont", label: "Continue", bn: "চলবে" },
];

type TreatmentLibItem = {
  name: string;
  generic: string;
  schedule: string;
  when: string;
  duration: string;
  indication: string;
};

const TREATMENT_LIBRARY: TreatmentLibItem[] = [
  { name: "Tab. Napa 500 mg",        generic: "Paracetamol",                    schedule: "1+1+1",   when: "after",  duration: "10d", indication: "ব্যথা/ জ্বর হলে" },
  { name: "Tab. Seclo 20 mg",        generic: "Omeprazole",                     schedule: "1+0+1",   when: "before", duration: "14d", indication: "" },
  { name: "Syp. Ambrotex",           generic: "Ambroxol",                       schedule: "1+1+1",   when: "after",  duration: "5d",  indication: "" },
  { name: "Tab. Amlodipine 5 mg",    generic: "Amlodipine",                     schedule: "1+0+0",   when: "after",  duration: "1m",  indication: "" },
  { name: "Tab. Losartan 50 mg",     generic: "Losartan",                       schedule: "1+0+0",   when: "after",  duration: "1m",  indication: "" },
  { name: "Tab. Metformin 500 mg",   generic: "Metformin",                      schedule: "1+0+1",   when: "after",  duration: "1m",  indication: "" },
  { name: "Cap. Amoxiclav 625 mg",   generic: "Amoxicillin + Clavulanic acid",  schedule: "1+1+1",   when: "after",  duration: "7d",  indication: "" },
  { name: "Tab. Cetirizine 10 mg",   generic: "Cetirizine",                     schedule: "0+0+1",   when: "bed",    duration: "7d",  indication: "" },
  { name: "Tab. Atorvastatin 20 mg", generic: "Atorvastatin",                   schedule: "0+0+1",   when: "after",  duration: "1m",  indication: "" },
  { name: "Cap. Omeprazole 20 mg",   generic: "Omeprazole",                     schedule: "1+0+0",   when: "before", duration: "14d", indication: "" },
  { name: "Tab. Domperidone 10 mg",  generic: "Domperidone",                    schedule: "1+1+1",   when: "before", duration: "5d",  indication: "" },
  { name: "Tab. Glimepiride 1 mg",   generic: "Glimepiride",                    schedule: "1+0+0",   when: "before", duration: "1m",  indication: "" },
  { name: "Syp. Dextromethorphan",   generic: "Dextromethorphan",               schedule: "1+1+1",   when: "after",  duration: "5d",  indication: "কাশি হলে" },
  { name: "Tab. Naproxen 250 mg",    generic: "Naproxen",                       schedule: "1+0+1",   when: "after",  duration: "5d",  indication: "ব্যথা হলে" },
  { name: "Tab. Sumatriptan 50 mg",  generic: "Sumatriptan",                    schedule: "asneeded",when: "after",  duration: "3d",  indication: "মাইগ্রেন শুরু হলে" },
  { name: "ORS packet",              generic: "Oral Rehydration Salt",          schedule: "asneeded",when: "after",  duration: "3d",  indication: "প্রতি পাতলা পায়খানার পর" },
  { name: "Tab. Zinc 20 mg",         generic: "Zinc",                           schedule: "1+0+0",   when: "after",  duration: "10d", indication: "" },
  { name: "Cap. Probiotic",          generic: "Probiotic",                      schedule: "1+0+1",   when: "after",  duration: "5d",  indication: "" },
];

// Compose the four parts into a Bengali dose string. Skips empty parts.
const composeDose = (schedule: string, when: string, duration: string, indication: string) => {
  const parts: string[] = [];
  const s = SCHEDULE_OPTIONS.find((o) => o.value === schedule);
  if (s) parts.push(s.bn);
  const w = WHEN_OPTIONS.find((o) => o.value === when);
  if (w) parts.push(`(${w.bn})`);
  const d = DURATION_OPTIONS.find((o) => o.value === duration);
  if (d) parts.push(`(${d.bn})`);
  const i = indication.trim();
  if (i) parts.push(`(${i})`);
  return parts.join(" - ");
};

// ── Treatment V2: schema-driven medicine library ──────────────────────────
// Different routes / forms (oral tablet, IV drip, supp, drop, inhaler, …)
// surface different prescription fields. Each entry in MEDICINE_LIBRARY_V2
// declares its own `schema` — an ordered list of field types — and the
// row UI only renders those fields. Optional `defaults` pre-fills the
// row when the doctor picks the medicine from the typeahead.
//
// Source: Google Sheet "Copy of Copy of B · Per-Form Sectioned" (rows 1-18
// for samples, rows 21-38 for the per-medicine schemas).

export type V2FieldType =
  | "DOSAGE"
  | "DOSAGE_UNIT"
  | "UNIT"
  | "ROUTE"
  | "VOLUME"
  | "DROP_RATE"
  | "FREQUENCY"
  | "MEAL_TIMING"
  | "SITE"
  | "LATERALITY"
  | "DURATION"
  | "INSTRUCTION"
  | "NOTE";

// `form` drives which option set the form-specific dropdowns show. E.g. a
// tablet medicine's DOSAGE_UNIT dropdown lists `1 tab / 2 tab / ½ tab`,
// while a syrup shows `5 ml / 10 ml / 15 ml`.
export type V2MedicineForm =
  | "tablet" | "capsule" | "syrup" | "suppository" | "pessary"
  | "ampoule" | "vial" | "patch" | "lozenge" | "sachet" | "spray"
  | "enema" | "inhaler" | "drops" | "cream" | "mouthwash"
  | "iv-fluid" | "insulin";

export type V2MedicineItem = {
  id: string;
  name: string;
  generic?: string;
  form: V2MedicineForm;
  schema: V2FieldType[];
  defaults?: Partial<Record<V2FieldType, string>>;
  // Optional override for the type-mode "Dose & instruction" string. When
  // present, replaces the value composed from `defaults`. Use this when the
  // doctor wants the type-mode line to read more naturally than the dropdown
  // composition would.
  typeText?: string;
};

// ── Bengali option lists used by the V2 row ───────────────────────────────
// Vocabulary sourced from the doctor's "Niramoy Form Field Vocabulary" sheet
// (FC-01 … FC-18 — 18 form classes, all values in Bangla). Routes keep the
// short Latin code (PR / PV / IM …) inside the Bangla phrase so the doctor
// can spot the standard prescription abbreviation at a glance.
//
// `value` and `label` are both the Bangla string — the combobox stores
// whatever's selected/typed, so keeping them identical means the saved row
// looks exactly like the dropdown option.
type V2OptionItem = { value: string; label: string };
const opt = (v: string): V2OptionItem => ({ value: v, label: v });

// Generic fallbacks (used when no form-specific list is defined). Forms
// override these via the *_BY_FORM maps below.
const V2_ROUTE_OPTIONS: V2OptionItem[] = [
  opt("PO (মুখে)"),
  opt("PR (মলদ্বারে)"),
  opt("PV (যোনিপথে)"),
  opt("IM (মাংসপেশীতে)"),
  opt("IV (শিরায় - ধীরে)"),
  opt("SC (চামড়ার নিচে)"),
];

const V2_FREQUENCY_OPTIONS: V2OptionItem[] = [
  opt("১+০+০"),
  opt("০+০+১"),
  opt("১+০+১"),
  opt("১+১+১"),
  opt("১+১+১+১"),
  opt("দিনে একবার"),
  opt("দিনে দুইবার"),
  opt("দিনে তিনবার"),
  opt("দিনে চারবার"),
  opt("প্রয়োজনে"),
  opt("প্রয়োজনমতো"),
  opt("এখনই"),
];

const V2_DOSAGE_OPTIONS: V2OptionItem[] = [
  opt("পাতলা স্তর"),
  opt("মটরদানা পরিমাণ"),
  opt("পুরু স্তর"),
  opt("অল্প পরিমাণ"),
];

const V2_DOSAGE_UNIT_OPTIONS: V2OptionItem[] = [
  opt("১ ট্যাব"), opt("২ ট্যাব"), opt("৫ মিলি"), opt("১০ মিলি"),
];

const V2_VOLUME_OPTIONS: V2OptionItem[] = [
  opt("১০০ মিলি"),
  opt("২৫০ মিলি"),
  opt("৫০০ মিলি"),
  opt("১০০০ মিলি"),
];

const V2_DROP_RATE_OPTIONS: V2OptionItem[] = [
  opt("১৫ ফোঁটা/মিনিট"),
  opt("৩০ ফোঁটা/মিনিট"),
  opt("৬০ ফোঁটা/মিনিট"),
  opt("১২০ ফোঁটা/মিনিট"),
];

const V2_SITE_OPTIONS: V2OptionItem[] = [
  opt("আক্রান্ত স্থান"),
  opt("মুখ"),
  opt("হাত"),
  opt("পা"),
  opt("শরীর"),
];

const V2_INSTRUCTION_OPTIONS: V2OptionItem[] = [
  opt("দাগ পর্যন্ত পানি দিয়ে গুলান"),
  opt("৩০ মিলি পানি দিয়ে গুলান"),
  opt("১০০ মিলি পানিতে গুলে নিন"),
];

const V2_MEAL_TIMING_OPTIONS: V2OptionItem[] = [
  opt("খাবারের আগে"),
  opt("খাবারের পরে"),
  opt("খাবারের সাথে"),
  opt("খালি পেটে"),
  opt("যেকোনো সময়"),
];

const V2_DURATION_OPTIONS: V2OptionItem[] = [
  opt("৩ দিন"),
  opt("৫ দিন"),
  opt("৭ দিন"),
  opt("১০ দিন"),
  opt("১৪ দিন"),
  opt("১ মাস"),
  opt("চলবে"),
];

const V2_LATERALITY_OPTIONS: V2OptionItem[] = [
  opt("ডান"),
  opt("বাঁ"),
  opt("উভয়"),
];

const V2_UNIT_OPTIONS: V2OptionItem[] = [
  opt("ট্যাব"), opt("ক্যাপ"), opt("মিলি"), opt("ফোঁটা"),
  opt("ইউনিট"), opt("পাফ"), opt("সাপোজিটরি"), opt("পেসারি"),
  opt("ভায়াল"), opt("প্যাচ"), opt("লজেঞ্জ"), opt("স্যাচেট"),
  opt("স্প্রে"), opt("এনিমা"),
];

// 18 medicines mapped from the source sheet. Each one defines its own
// per-form field schema + sensible default values. The display `name`
// follows the standard Bangladeshi prescription convention:
//   <form-prefix> <brand name> <strength>
// e.g. "Tab. Napa 500 mg", "Syp. Klaricid DS 250 mg/5ml".
export const MEDICINE_LIBRARY_V2: V2MedicineItem[] = [
  { id: "v2-1",  name: "Tab. Napa 500 mg",                     generic: "Paracetamol",                    form: "tablet",
    schema: ["DOSAGE_UNIT", "FREQUENCY", "MEAL_TIMING", "DURATION", "NOTE"],
    defaults: { DOSAGE_UNIT: "১ ট্যাব", FREQUENCY: "১+০+১", MEAL_TIMING: "খাবারের পরে", DURATION: "৫ দিন",  NOTE: "খাবারের পরে" },
    typeText: "১টা করে সকালে ও রাতে খাবারের পরে - ৫ দিন" },
  { id: "v2-2",  name: "Syp. Klaricid DS 250 mg/5 ml",         generic: "Clarithromycin",                 form: "syrup",
    schema: ["DOSAGE_UNIT", "FREQUENCY", "MEAL_TIMING", "DURATION", "NOTE"],
    defaults: { DOSAGE_UNIT: "৫ মিলি", FREQUENCY: "১+০+১", MEAL_TIMING: "খাবারের পরে", DURATION: "৭ দিন",  NOTE: "ব্যবহারের আগে ঝাঁকান" },
    typeText: "৫ মিলি করে সকালে ও রাতে খাবারের পরে - ৭ দিন" },
  { id: "v2-3",  name: "Supp. Voltalin 50 mg",                 generic: "Diclofenac",                     form: "suppository",
    schema: ["DOSAGE_UNIT", "ROUTE", "FREQUENCY", "DURATION", "NOTE"],
    defaults: { DOSAGE_UNIT: "১ সাপোজিটরি", ROUTE: "PR (মলদ্বারে)", FREQUENCY: "দিনে দুইবার", DURATION: "৫ দিন", NOTE: "মলত্যাগের পরে" } },
  { id: "v2-4",  name: "Pess. Gynozole 100 mg",                generic: "Clotrimazole",                   form: "pessary",
    schema: ["DOSAGE_UNIT", "ROUTE", "FREQUENCY", "DURATION", "NOTE"],
    defaults: { DOSAGE_UNIT: "১ পেসারি", ROUTE: "PV (যোনিপথে)", FREQUENCY: "ঘুমানোর আগে", DURATION: "৭ রাত", NOTE: "কোর্স চলাকালীন সহবাস এড়িয়ে চলুন" } },
  { id: "v2-5",  name: "Inj. Tycin 0.5 ml",                    generic: "Tetanus toxoid",                 form: "ampoule",
    schema: ["DOSAGE_UNIT", "ROUTE", "FREQUENCY", "DURATION", "NOTE"],
    defaults: { DOSAGE_UNIT: "১ অ্যাম্পুল", ROUTE: "IM (মাংসপেশীতে)", FREQUENCY: "দিনে তিনবার", DURATION: "৩ দিন" } },
  { id: "v2-6",  name: "Inj. Lantus 100 IU/ml",                generic: "Insulin Glargine",               form: "insulin",
    schema: ["DOSAGE_UNIT", "FREQUENCY", "MEAL_TIMING", "DURATION", "NOTE"],
    defaults: { DOSAGE_UNIT: "ইউনিট (SC)", FREQUENCY: "০ — ০ — ০ — ১৮", MEAL_TIMING: "ঘুমানোর আগে", DURATION: "চলবে", NOTE: "প্রতিদিন একই সময়ে" } },
  { id: "v2-7",  name: "IV DNS 1000 ml",                       generic: "Dextrose Normal Saline",         form: "iv-fluid",
    schema: ["ROUTE", "VOLUME", "DROP_RATE", "FREQUENCY", "DURATION", "NOTE"],
    defaults: { ROUTE: "IV-drip (শিরায় ড্রিপ)", VOLUME: "১০০০ মিলি", DROP_RATE: "৬০ ফোঁটা/মিনিট", FREQUENCY: "৩ বোতল/দিন", DURATION: "৩ দিন", NOTE: "রক্তে চিনির মাত্রা পর্যবেক্ষণ করুন" } },
  { id: "v2-8",  name: "Inj. Magnex 1.5 g vial",               generic: "Cefoperazone + Sulbactam",       form: "vial",
    schema: ["DOSAGE_UNIT", "ROUTE", "VOLUME", "DROP_RATE", "FREQUENCY", "DURATION", "NOTE"],
    defaults: { DOSAGE_UNIT: "১ ভায়াল", ROUTE: "IV infusion (শিরায় ইনফিউশন)", VOLUME: "১০০ মিলি NS", DROP_RATE: "৩০ মিনিটে", FREQUENCY: "দিনে দুইবার", DURATION: "৭ দিন", NOTE: "ফিল্টার লাগবে" } },
  { id: "v2-9",  name: "Inh. Ticamet HFA 25/250 mcg",          generic: "Salmeterol + Fluticasone",       form: "inhaler",
    schema: ["DOSAGE_UNIT", "ROUTE", "FREQUENCY", "DURATION", "NOTE"],
    defaults: { DOSAGE_UNIT: "২ পাফ", ROUTE: "নিঃশ্বাসের সাথে", FREQUENCY: "১+০+১ (সকাল-রাত)", DURATION: "চলবে", NOTE: "মুখ ধুয়ে ফেলুন; ১০ সেকেন্ড শ্বাস ধরে রাখুন" } },
  { id: "v2-10", name: "Drops Otosporin",                      generic: "Polymyxin B + Hydrocortisone",   form: "drops",
    schema: ["DOSAGE_UNIT", "SITE", "FREQUENCY", "DURATION", "NOTE"],
    defaults: { DOSAGE_UNIT: "৩ ফোঁটা", SITE: "ডান কান", FREQUENCY: "দিনে তিনবার", DURATION: "৭ দিন", NOTE: "ব্যবহারের আগে হাতে গরম করে নিন" } },
  { id: "v2-11", name: "Cream Fucidin 2 %",                    generic: "Fusidic acid",                   form: "cream",
    schema: ["DOSAGE", "SITE", "FREQUENCY", "DURATION", "NOTE"],
    defaults: { DOSAGE: "মটরদানা পরিমাণ", SITE: "আক্রান্ত স্থান", FREQUENCY: "দিনে তিনবার", DURATION: "৭ দিন", NOTE: "চোখ ও মিউকাস ঝিল্লির সংস্পর্শ এড়ান" } },
  { id: "v2-12", name: "Loz. Mybacin",                         generic: "Tyrothricin",                    form: "lozenge",
    schema: ["DOSAGE_UNIT", "FREQUENCY", "DURATION", "NOTE"],
    defaults: { DOSAGE_UNIT: "১ লজেঞ্জ", FREQUENCY: "দিনে চারবার", DURATION: "৫ দিন", NOTE: "ব্যবহারের পর গরম পানীয় এড়িয়ে চলুন" } },
  { id: "v2-13", name: "Patch Fentapatch 25 mcg/h",            generic: "Fentanyl",                       form: "patch",
    schema: ["DOSAGE_UNIT", "SITE", "FREQUENCY", "DURATION", "NOTE"],
    defaults: { DOSAGE_UNIT: "১ প্যাচ", SITE: "বাহুর উপরে", FREQUENCY: "৭২ ঘণ্টায় একবার", DURATION: "৪ সপ্তাহ", NOTE: "পরিষ্কার, লোমহীন ত্বকে লাগান" } },
  { id: "v2-14", name: "Mouthwash Listerine",                  generic: "Mouthwash",                      form: "mouthwash",
    schema: ["DOSAGE_UNIT", "FREQUENCY", "DURATION", "NOTE"],
    defaults: { DOSAGE_UNIT: "২০ মিলি", FREQUENCY: "দিনে দুইবার", DURATION: "১৪ দিন", NOTE: "ব্যবহারের পর ৩০ মিনিট কিছু খাবেন না" } },
  { id: "v2-15", name: "SL Spray Angised 0.4 mg",              generic: "Glyceryl trinitrate",            form: "spray",
    schema: ["DOSAGE_UNIT", "SITE", "FREQUENCY", "DURATION", "NOTE"],
    defaults: { DOSAGE_UNIT: "১ স্প্রে", SITE: "জিভের নিচে", FREQUENCY: "প্রয়োজনে", DURATION: "প্রয়োজনমতো", NOTE: "ব্যবহারের আগে বসুন; ১৫ মিনিটে সর্বোচ্চ ৩ বার" } },
  { id: "v2-16", name: "Enema Phosphate 130 ml",               generic: "Sodium phosphate",               form: "enema",
    schema: ["DOSAGE_UNIT", "ROUTE", "FREQUENCY", "DURATION", "NOTE"],
    defaults: { DOSAGE_UNIT: "১ এনিমা", ROUTE: "PR (মলদ্বারে)", FREQUENCY: "এখনই", DURATION: "একবার", NOTE: "সম্ভব হলে ৫ মিনিট ধরে রাখুন" } },
  { id: "v2-17", name: "Susp. Cef-3 100 mg/5 ml",              generic: "Cefixime",                       form: "syrup",
    schema: ["DOSAGE_UNIT", "INSTRUCTION", "FREQUENCY", "MEAL_TIMING", "DURATION", "NOTE"],
    defaults: { DOSAGE_UNIT: "৫ মিলি", INSTRUCTION: "৩০ মিলি পানি দিয়ে গুলান", FREQUENCY: "১+০+১", MEAL_TIMING: "খাবারের পরে", DURATION: "৭ দিন", NOTE: "গুলানোর ১৪ দিন পর ফেলে দিন" },
    typeText: "৫ মিলি করে সকালে ও রাতে খাবারের পরে - ৭ দিন" },
  { id: "v2-18", name: "Sachet Eno 5 g",                       generic: "Sodium bicarbonate",             form: "sachet",
    schema: ["DOSAGE_UNIT", "INSTRUCTION", "FREQUENCY", "DURATION", "NOTE"],
    defaults: { DOSAGE_UNIT: "১ স্যাচেট", INSTRUCTION: "১০০ মিলি পানিতে গুলে নিন", FREQUENCY: "প্রয়োজনমতো", DURATION: "প্রয়োজনমতো", NOTE: "বুদবুদ থাকা অবস্থায় পান করুন" } },
];

// Default schema for each V2 medicine form — used when adding a brand-new
// drug in the Manage Drugs modal. The schemas mirror the per-medicine
// schemas above; the dose-form dropdown drives which fields appear in the
// Add-new form.
const V2_SCHEMA_BY_FORM: Record<V2MedicineForm, V2FieldType[]> = {
  tablet:       ["DOSAGE_UNIT", "FREQUENCY", "MEAL_TIMING", "DURATION", "NOTE"],
  capsule:      ["DOSAGE_UNIT", "FREQUENCY", "MEAL_TIMING", "DURATION", "NOTE"],
  syrup:        ["DOSAGE_UNIT", "FREQUENCY", "MEAL_TIMING", "DURATION", "NOTE"],
  suppository:  ["DOSAGE_UNIT", "ROUTE", "FREQUENCY", "DURATION", "NOTE"],
  pessary:      ["DOSAGE_UNIT", "ROUTE", "FREQUENCY", "DURATION", "NOTE"],
  ampoule:      ["DOSAGE_UNIT", "ROUTE", "FREQUENCY", "DURATION", "NOTE"],
  vial:         ["DOSAGE_UNIT", "ROUTE", "VOLUME", "DROP_RATE", "FREQUENCY", "DURATION", "NOTE"],
  patch:        ["DOSAGE_UNIT", "SITE", "FREQUENCY", "DURATION", "NOTE"],
  lozenge:      ["DOSAGE_UNIT", "FREQUENCY", "DURATION", "NOTE"],
  sachet:       ["DOSAGE_UNIT", "INSTRUCTION", "FREQUENCY", "DURATION", "NOTE"],
  spray:        ["DOSAGE_UNIT", "SITE", "FREQUENCY", "DURATION", "NOTE"],
  enema:        ["DOSAGE_UNIT", "ROUTE", "FREQUENCY", "DURATION", "NOTE"],
  inhaler:      ["DOSAGE_UNIT", "ROUTE", "FREQUENCY", "DURATION", "NOTE"],
  drops:        ["DOSAGE_UNIT", "SITE", "FREQUENCY", "DURATION", "NOTE"],
  cream:        ["DOSAGE", "SITE", "FREQUENCY", "DURATION", "NOTE"],
  mouthwash:    ["DOSAGE_UNIT", "FREQUENCY", "DURATION", "NOTE"],
  "iv-fluid":   ["ROUTE", "VOLUME", "DROP_RATE", "FREQUENCY", "DURATION", "NOTE"],
  insulin:      ["DOSAGE_UNIT", "FREQUENCY", "MEAL_TIMING", "DURATION", "NOTE"],
};

// Display label for each V2 medicine form. Two-way mapping helpers below
// translate between the user-facing label and the underlying form key.
const V2_FORM_LABELS: Record<V2MedicineForm, string> = {
  tablet:       "Tablet",
  capsule:      "Capsule",
  syrup:        "Syrup",
  suppository:  "Suppository",
  pessary:      "Pessary",
  ampoule:      "Injection (Ampoule)",
  vial:         "Injection (Vial)",
  patch:        "Patch",
  lozenge:      "Lozenge",
  sachet:       "Sachet",
  spray:        "Spray",
  enema:        "Enema",
  inhaler:      "Inhaler",
  drops:        "Drops",
  cream:        "Cream",
  mouthwash:    "Mouthwash",
  "iv-fluid":   "IV Fluid",
  insulin:      "Insulin",
};
const V2_FORM_OPTION_LIST: string[] =
  (Object.keys(V2_FORM_LABELS) as V2MedicineForm[]).map((k) => V2_FORM_LABELS[k]);
function v2FormFromLabel(label: string | undefined): V2MedicineForm | undefined {
  if (!label) return undefined;
  const entry = (Object.entries(V2_FORM_LABELS) as [V2MedicineForm, string][])
    .find(([, v]) => v === label);
  return entry?.[0];
}

// ── Per-form Bengali option lists ─────────────────────────────────────────
// One per FC-XX from the sheet. Every field that the form actually offers
// has a matching `*_BY_FORM` entry; missing entries fall back to the
// generic list defined above. Free typing in the combobox always wins —
// these are convenience picklists, not strict whitelists.

const V2_DOSAGE_UNIT_BY_FORM: Partial<Record<V2MedicineForm, V2OptionItem[]>> = {
  // FC-01 Solid (tablet / capsule / caplet)
  tablet: [opt("১ ট্যাব"), opt("২ ট্যাব"), opt("½ ট্যাব"), opt("¼ ট্যাব"), opt("১ ক্যাপ"), opt("২ ক্যাপ")],
  capsule: [opt("১ ক্যাপ"), opt("২ ক্যাপ"), opt("৩ ক্যাপ")],
  // FC-02 Liquid (syrup / suspension)
  syrup: [opt("২.৫ মিলি"), opt("৫ মিলি"), opt("১০ মিলি"), opt("১৫ মিলি"),
          opt("½ চা-চামচ"), opt("১ চা-চামচ"), opt("২ চা-চামচ"), opt("১ টেবিল চামচ")],
  // FC-03 Suppository
  suppository: [opt("১ সাপোজিটরি"), opt("২ সাপোজিটরি")],
  // FC-04 Pessary
  pessary: [opt("১ পেসারি"), opt("২ পেসারি")],
  // FC-05 Injection (ampoule / vial)
  ampoule: [opt("১ ভায়াল"), opt("½ ভায়াল"), opt("২ ভায়াল"), opt("১ অ্যাম্পুল"), opt("২ অ্যাম্পুল")],
  // FC-06 Insulin — unit + route in one cell
  insulin: [opt("ইউনিট (SC)"), opt("ইউনিট (IM)"), opt("ইউনিট (IV)")],
  // FC-08 IV Infusion (vial)
  vial: [opt("১ ভায়াল"), opt("২ ভায়াল"), opt("½ ভায়াল")],
  // FC-09 Inhaler / Nebuliser
  inhaler: [opt("১ পাফ"), opt("২ পাফ"), opt("৪ পাফ"),
            opt("১ ইনহেলেশন"), opt("২ ইনহেলেশন"),
            opt("১ নেব"), opt("১ রোটাক্যাপ")],
  // FC-10 Spray
  spray: [opt("১ স্প্রে"), opt("২ স্প্রে"), opt("৩ স্প্রে"), opt("১ পাফ")],
  // FC-12 Patch
  patch: [opt("১ প্যাচ"), opt("২ প্যাচ")],
  // FC-13 Drops
  drops: [opt("১ ফোঁটা"), opt("২ ফোঁটা"), opt("৩ ফোঁটা")],
  // FC-14 Mouthwash / gargle
  mouthwash: [opt("৫ মিলি"), opt("১০ মিলি"), opt("১৫ মিলি"), opt("২০ মিলি")],
  // FC-15 Lozenge / sublingual
  lozenge: [opt("১ লজেঞ্জ"), opt("২ লজেঞ্জ")],
  // FC-16 Enema
  enema: [opt("১ এনিমা"), opt("২ এনিমা")],
  // FC-18 Sachet
  sachet: [opt("১ স্যাচেট"), opt("২ স্যাচেট"), opt("১ স্কুপ")],
};

const V2_DOSAGE_BY_FORM: Partial<Record<V2MedicineForm, V2OptionItem[]>> = {
  // FC-11 Topical (cream / ointment / gel) — uses DOSAGE only, no unit
  cream: [opt("পাতলা স্তর"), opt("মটরদানা পরিমাণ"), opt("পুরু স্তর"), opt("অল্প পরিমাণ")],
};

const V2_UNIT_BY_FORM: Partial<Record<V2MedicineForm, V2OptionItem[]>> = {
  insulin: [opt("ইউনিট")],
};

const V2_ROUTE_BY_FORM: Partial<Record<V2MedicineForm, V2OptionItem[]>> = {
  tablet: [opt("মুখে")],
  capsule: [opt("মুখে")],
  syrup: [opt("মুখে")],
  suppository: [opt("PR (মলদ্বারে)")],
  pessary: [opt("PV (যোনিপথে)")],
  // FC-05 Injection — multiple routes
  ampoule: [
    opt("IM (মাংসপেশীতে)"),
    opt("IV (শিরায় - ধীরে)"),
    opt("IV Bolus (শিরায় - এক ধাক্কায়)"),
    opt("IV Push (শিরায় - দ্রুত)"),
    opt("SC (চামড়ার নিচে)"),
  ],
  // FC-08 IV Infusion — route locked
  vial: [opt("IV infusion (শিরায় ইনফিউশন)")],
  patch: [opt("চামড়ার উপরে")],
  lozenge: [opt("মুখে রাখুন (চুষুন)")],
  sachet: [opt("মুখে")],
  // FC-10 Spray
  spray: [opt("জিভের নিচে"), opt("নাকে"), opt("গলায়")],
  enema: [opt("PR (মলদ্বারে)")],
  // FC-09 Inhaler
  inhaler: [opt("নিঃশ্বাসের সাথে"), opt("নেবুলাইজেশন")],
  cream: [opt("চামড়ায়")],
  mouthwash: [opt("মুখে (গার্গল)")],
  // FC-07 IV Fluid
  "iv-fluid": [opt("IV-drip (শিরায় ড্রিপ)")],
  insulin: [opt("SC (চামড়ার নিচে)")],
};

const V2_FREQUENCY_BY_FORM: Partial<Record<V2MedicineForm, V2OptionItem[]>> = {
  // FC-01 Solid
  tablet: [
    opt("১+০+০"), opt("০+০+১"), opt("১+০+১"), opt("১+১+১"), opt("১+১+১+১"), opt("২+২+২"),
    opt("প্রয়োজনে"), opt("এখনই"), opt("একদিন পরপর"), opt("প্রয়োজনমতো"),
  ],
  capsule: [
    opt("১+০+০"), opt("০+০+১"), opt("১+০+১"), opt("১+১+১"), opt("১+১+১+১"),
    opt("প্রয়োজনে"), opt("এখনই"), opt("প্রয়োজনমতো"),
  ],
  // FC-02 Liquid
  syrup: [
    opt("১+০+০"), opt("০+০+১"), opt("১+০+১"), opt("১+১+১"), opt("১+১+১+১"),
    opt("প্রতি ৪ ঘণ্টা পরপর · প্রয়োজনমতো"),
    opt("প্রতি ৬ ঘণ্টা পরপর · প্রয়োজনমতো"),
    opt("প্রয়োজনে"),
    opt("প্রয়োজনে - জ্বর হলে"),
    opt("এখনই"), opt("একদিন পরপর"), opt("প্রয়োজনমতো"),
  ],
  // FC-03 Suppository
  suppository: [
    opt("এখনই"), opt("দিনে একবার"), opt("দিনে দুইবার"), opt("দিনে তিনবার"), opt("দিনে চারবার"),
    opt("প্রতি ৮ ঘণ্টা পরপর"), opt("প্রতি ১২ ঘণ্টা পরপর"),
    opt("প্রয়োজনে"), opt("একদিন পরপর"),
    opt("প্রয়োজনে - জ্বর ১০২°ফা বা তার বেশি হলে"),
  ],
  // FC-04 Pessary
  pessary: [
    opt("ঘুমানোর আগে"), opt("সপ্তাহে একবার"),
    opt("দিনে একবার"), opt("দিনে দুইবার"), opt("দিনে তিনবার"), opt("দিনে চারবার"),
    opt("এখনই"),
  ],
  // FC-05 Injection
  ampoule: [
    opt("এখনই"), opt("দিনে একবার"), opt("দিনে দুইবার"), opt("দিনে তিনবার"), opt("দিনে চারবার"),
    opt("প্রতি ৮ ঘণ্টা পরপর"), opt("প্রতি ১২ ঘণ্টা পরপর"),
    opt("প্রয়োজনে"), opt("একদিন পরপর"),
  ],
  // FC-06 Insulin (SCHEDULE not FREQUENCY — but stays in this map for the row's frequency slot)
  insulin: [
    opt("১৪ — ০ — ১০ — ০"),
    opt("০ — ০ — ০ — ১৮"),
    opt("১০ — ১০ — ১০ — ০"),
  ],
  // FC-07 IV Fluid
  "iv-fluid": [
    opt("চলমান"), opt("১ বোতল/দিন"), opt("২ বোতল/দিন"), opt("৩ বোতল/দিন"),
    opt("প্রতি ৬ ঘণ্টা পরপর"), opt("প্রতি ৮ ঘণ্টা পরপর"), opt("প্রতি ১২ ঘণ্টা পরপর"),
  ],
  // FC-08 IV Infusion
  vial: [
    opt("দিনে একবার"), opt("দিনে দুইবার"), opt("দিনে তিনবার"), opt("দিনে চারবার"),
    opt("প্রতি ৮ ঘণ্টা পরপর"), opt("প্রতি ১২ ঘণ্টা পরপর"),
  ],
  // FC-09 Inhaler
  inhaler: [
    opt("১+০+০ (সকাল)"), opt("০+০+১ (রাত)"),
    opt("১+০+১ (সকাল-রাত)"), opt("১+১+১ (সকাল-দুপুর-রাত)"), opt("১+১+১+১"),
    opt("দিনে একবার"), opt("দিনে দুইবার"), opt("দিনে তিনবার"), opt("দিনে চারবার"),
    opt("প্রয়োজনে"), opt("প্রয়োজনে - হাঁপানি হলে"),
  ],
  // FC-10 Spray
  spray: [
    opt("দিনে দুইবার"), opt("দিনে তিনবার"), opt("দিনে চারবার"),
    opt("প্রতি ৪ ঘণ্টা পরপর"), opt("প্রতি ৬ ঘণ্টা পরপর"),
    opt("প্রয়োজনে"), opt("এখনই"), opt("দিনে একবার"),
  ],
  // FC-11 Topical
  cream: [
    opt("দিনে একবার"), opt("দিনে দুইবার"), opt("দিনে তিনবার"), opt("দিনে চারবার"),
    opt("প্রয়োজনে"), opt("একদিন পরপর"), opt("প্রয়োজনমতো"),
  ],
  // FC-12 Patch
  patch: [
    opt("দৈনিক একবার"), opt("৭২ ঘণ্টায় একবার"),
    opt("সপ্তাহে একবার"), opt("সপ্তাহে দুইবার"),
  ],
  // FC-13 Drops
  drops: [
    opt("প্রতি ঘণ্টায়"), opt("প্রতি ২ ঘণ্টা পরপর"),
    opt("প্রতি ৪ ঘণ্টা পরপর"), opt("প্রতি ৬ ঘণ্টা পরপর"),
    opt("দিনে দুইবার"), opt("দিনে তিনবার"), opt("দিনে চারবার"),
    opt("প্রয়োজনে"),
  ],
  // FC-14 Mouthwash
  mouthwash: [
    opt("দিনে দুইবার"), opt("দিনে তিনবার"), opt("দিনে চারবার"),
    opt("খাবারের পরে"), opt("ঘুমানোর আগে"),
  ],
  // FC-15 Lozenge
  lozenge: [
    opt("প্রতি ২ ঘণ্টা পরপর"),
    opt("প্রতি ৩ ঘণ্টা পরপর · প্রয়োজনমতো"),
    opt("দিনে চারবার"),
    opt("প্রয়োজনে - গলাব্যথা হলে"),
    opt("১+০+০ (সকাল)"), opt("১+১+১ (সকাল-দুপুর-রাত)"),
    opt("প্রয়োজনমতো"),
  ],
  // FC-16 Enema
  enema: [
    opt("এখনই"), opt("দিনে একবার"), opt("দিনে দুইবার"), opt("দিনে তিনবার"), opt("দিনে চারবার"),
    opt("প্রয়োজনে"), opt("প্রয়োজনে - কোষ্ঠ কাঠিন্য হলে"),
  ],
  // FC-18 Sachet
  sachet: [
    opt("প্রতি পাতলা পায়খানার পর"),
    opt("দিনে চারবার"),
    opt("প্রয়োজনমতো"),
    opt("দিনে দুইবার"),
    opt("১+১+১ (সকাল-দুপুর-রাত)"),
  ],
};

const V2_MEAL_TIMING_BY_FORM: Partial<Record<V2MedicineForm, V2OptionItem[]>> = {
  tablet:  [opt("খাবারের আগে"), opt("খাবারের পরে"), opt("খাবারের সাথে"), opt("খালি পেটে"), opt("যেকোনো সময়")],
  capsule: [opt("খাবারের আগে"), opt("খাবারের পরে"), opt("খাবারের সাথে"), opt("খালি পেটে"), opt("যেকোনো সময়")],
  syrup:   [opt("খাবারের আগে"), opt("খাবারের পরে"), opt("যেকোনো সময়")],
  insulin: [opt("খাবারের ৩০ মিনিট আগে"), opt("খাবারের ঠিক আগে"), opt("খাবারের সাথে"), opt("ঘুমানোর আগে")],
};

const V2_DURATION_BY_FORM: Partial<Record<V2MedicineForm, V2OptionItem[]>> = {
  // FC-01 Solid
  tablet:  [opt("৩ দিন"), opt("৫ দিন"), opt("৭ দিন"), opt("১০ দিন"), opt("১৪ দিন"), opt("১ মাস"), opt("চলবে")],
  capsule: [opt("৩ দিন"), opt("৫ দিন"), opt("৭ দিন"), opt("১০ দিন"), opt("১৪ দিন"), opt("১ মাস"), opt("চলবে")],
  // FC-02 Liquid
  syrup:   [opt("৩ দিন"), opt("৫ দিন"), opt("৭ দিন"), opt("১০ দিন"), opt("চলবে")],
  // FC-03 Suppository
  suppository: [opt("৩ দিন"), opt("৫ দিন"), opt("প্রয়োজনমতো")],
  // FC-04 Pessary
  pessary: [opt("৩ রাত"), opt("৬ রাত"), opt("৭ রাত"), opt("একবার")],
  // FC-05 Injection
  ampoule: [opt("৩ দিন"), opt("৫ দিন"), opt("৭ দিন"), opt("১০ দিন"), opt("১৪ দিন")],
  // FC-06 Insulin
  insulin: [opt("চলবে"), opt("১ সপ্তাহ পরে রিভিউ"), opt("২ সপ্তাহ পরে রিভিউ")],
  // FC-07 IV Fluid
  "iv-fluid": [opt("এখনই (একবার)"), opt("১ দিন"), opt("২ দিন"), opt("৩ দিন"), opt("মুখে খেতে শুরু করা পর্যন্ত")],
  // FC-08 IV Infusion
  vial: [opt("৫ দিন"), opt("৭ দিন"), opt("১০ দিন"), opt("১৪ দিন")],
  // FC-09 Inhaler
  inhaler: [opt("৭ দিন"), opt("১৪ দিন"), opt("১ মাস"), opt("চলবে")],
  // FC-10 Spray
  spray: [opt("৩ দিন"), opt("৫ দিন"), opt("৭ দিন"), opt("প্রয়োজনমতো")],
  // FC-11 Topical
  cream: [opt("৫ দিন"), opt("৭ দিন"), opt("১৪ দিন"), opt("২১ দিন"), opt("ক্ষত সারা পর্যন্ত")],
  // FC-12 Patch
  patch: [opt("১৪ দিন"), opt("১ মাস"), opt("৪ সপ্তাহ"), opt("চলবে")],
  // FC-13 Drops
  drops: [opt("৩ দিন"), opt("৫ দিন"), opt("৭ দিন"), opt("১৪ দিন")],
  // FC-14 Mouthwash
  mouthwash: [opt("৫ দিন"), opt("৭ দিন"), opt("১৪ দিন")],
  // FC-15 Lozenge
  lozenge: [opt("৩ দিন"), opt("৫ দিন"), opt("৭ দিন")],
  // FC-16 Enema
  enema: [opt("একবার"), opt("১ দিন"), opt("প্রয়োজনমতো")],
  // FC-18 Sachet
  sachet: [opt("৩ দিন"), opt("৫ দিন"), opt("যতদিন পাতলা পায়খানা চলে"), opt("প্রয়োজনমতো")],
};

const V2_VOLUME_BY_FORM: Partial<Record<V2MedicineForm, V2OptionItem[]>> = {
  // FC-07 IV Fluid
  "iv-fluid": [opt("১০০ মিলি"), opt("২৫০ মিলি"), opt("৫০০ মিলি"), opt("১০০০ মিলি")],
  // FC-08 IV Infusion
  vial: [opt("৫০ মিলি NS"), opt("১০০ মিলি NS"), opt("২৫০ মিলি NS"),
         opt("১০০ মিলি D5W"), opt("২৫০ মিলি D5W")],
};

const V2_DROP_RATE_BY_FORM: Partial<Record<V2MedicineForm, V2OptionItem[]>> = {
  // FC-07 IV Fluid — drop rate per minute
  "iv-fluid": [opt("১৫ ফোঁটা/মিনিট"), opt("৩০ ফোঁটা/মিনিট"), opt("৬০ ফোঁটা/মিনিট"), opt("১২০ ফোঁটা/মিনিট")],
  // FC-08 IV Infusion — infuse over time
  vial: [opt("৩০ মিনিটে"), opt("৬০ মিনিটে"), opt("৯০ মিনিটে"), opt("১২০ মিনিটে")],
};

const V2_SITE_BY_FORM: Partial<Record<V2MedicineForm, V2OptionItem[]>> = {
  // FC-10 Spray — site
  spray: [opt("বাঁ নাক"), opt("ডান নাক"), opt("উভয় নাক"), opt("গলা"), opt("জিভের নিচে")],
  // FC-11 Topical
  cream: [opt("আক্রান্ত স্থান"), opt("মুখ"), opt("হাত"), opt("পা"), opt("শরীর"), opt("মাথার ত্বক"), opt("ক্ষতস্থান")],
  // FC-12 Patch
  patch: [opt("বুকে"), opt("বাহুর উপরে"), opt("পিঠের উপরে"), opt("কোমর")],
  // FC-13 Drops — site + laterality combined
  drops: [
    opt("বাঁ চোখ"), opt("ডান চোখ"), opt("উভয় চোখ"),
    opt("বাঁ কান"), opt("ডান কান"), opt("উভয় কান"),
    opt("বাঁ নাক"), opt("ডান নাক"), opt("উভয় নাক"),
  ],
};

const V2_INSTRUCTION_BY_FORM: Partial<Record<V2MedicineForm, V2OptionItem[]>> = {
  // FC-17 Reconstitution powder is mapped to syrup in our library (Cef-3 Susp)
  syrup: [
    opt("দাগ পর্যন্ত পানি দিয়ে গুলান"),
    opt("৩০ মিলি পানি দিয়ে গুলান"),
    opt("৫০ মিলি ফুটানো ঠান্ডা পানি দিন"),
  ],
  sachet: [
    opt("১০০ মিলি পানিতে গুলে নিন"),
    opt("২০০ মিলি পানিতে গুলে নিন"),
    opt("৫০০ মিলি পানিতে গুলে নিন"),
  ],
  cream: [opt("পাতলা স্তর লাগান"), opt("আলতো মালিশ করুন")],
};

// Helper — returns the form-specific option list for a field if one exists,
// otherwise falls back to the cross-form generic list (defined above).
// Compose a single Bengali "dose & instruction" string from the per-field
// defaults — used to seed the type-mode input when a medicine is picked or
// pre-filled. Reads like a doctor's handwritten line:
//   "১ ট্যাব করে ১+০+১ - খাবারের পরে - ৫ দিন"
function composeTypeText(defaults: Partial<Record<V2FieldType, string>>): string {
  const parts: string[] = [];
  const amount =
    defaults.DOSAGE_UNIT ??
    defaults.DOSAGE ??
    defaults.UNIT ??
    defaults.VOLUME;
  if (amount) parts.push(`${amount} করে`);
  if (defaults.FREQUENCY) parts.push(defaults.FREQUENCY);
  if (defaults.MEAL_TIMING) parts.push(`- ${defaults.MEAL_TIMING}`);
  if (defaults.DURATION) parts.push(`- ${defaults.DURATION}`);
  return parts.join(" ");
}

function getOptionsForField(field: V2FieldType, form: V2MedicineForm | undefined): V2OptionItem[] {
  switch (field) {
    case "DOSAGE_UNIT": return (form && V2_DOSAGE_UNIT_BY_FORM[form]) ?? V2_DOSAGE_UNIT_OPTIONS;
    case "DOSAGE":      return (form && V2_DOSAGE_BY_FORM[form])      ?? V2_DOSAGE_OPTIONS;
    case "UNIT":        return (form && V2_UNIT_BY_FORM[form])        ?? V2_UNIT_OPTIONS;
    case "ROUTE":       return (form && V2_ROUTE_BY_FORM[form])       ?? V2_ROUTE_OPTIONS;
    case "SITE":        return (form && V2_SITE_BY_FORM[form])        ?? V2_SITE_OPTIONS;
    case "INSTRUCTION": return (form && V2_INSTRUCTION_BY_FORM[form]) ?? V2_INSTRUCTION_OPTIONS;
    case "FREQUENCY":   return (form && V2_FREQUENCY_BY_FORM[form])   ?? V2_FREQUENCY_OPTIONS;
    case "MEAL_TIMING": return (form && V2_MEAL_TIMING_BY_FORM[form]) ?? V2_MEAL_TIMING_OPTIONS;
    case "DURATION":    return (form && V2_DURATION_BY_FORM[form])    ?? V2_DURATION_OPTIONS;
    case "VOLUME":      return (form && V2_VOLUME_BY_FORM[form])      ?? V2_VOLUME_OPTIONS;
    case "DROP_RATE":   return (form && V2_DROP_RATE_BY_FORM[form])   ?? V2_DROP_RATE_OPTIONS;
    case "LATERALITY":  return V2_LATERALITY_OPTIONS;
    default:            return [];
  }
}

const V2_FIELD_LABELS: Record<V2FieldType, string> = {
  DOSAGE:       "Dosage",
  DOSAGE_UNIT:  "Dosage + unit",
  UNIT:         "Unit",
  ROUTE:        "Route",
  VOLUME:       "Volume",
  DROP_RATE:    "Drop rate",
  FREQUENCY:    "Frequency",
  MEAL_TIMING:  "Meal timing",
  SITE:         "Site",
  LATERALITY:   "Side",
  DURATION:     "Duration",
  INSTRUCTION:  "Instruction",
  NOTE:         "Note",
};

// Library of common past medical history items used by the typeahead dropdown.
const MEDICAL_HISTORY_LIBRARY = [
  "Hypertension",
  "Diabetes Type 2",
  "Diabetes Type 1",
  "Asthma",
  "COPD",
  "Coronary Artery Disease",
  "Heart failure",
  "Arrhythmia",
  "Stroke / TIA",
  "Tuberculosis",
  "Hepatitis B",
  "Hepatitis C",
  "Hypothyroidism",
  "Hyperthyroidism",
  "Chronic Kidney Disease",
  "Liver disease / Cirrhosis",
  "Peptic ulcer disease",
  "GERD",
  "Migraine",
  "Epilepsy",
  "Depression / Anxiety",
  "Allergy — drug",
  "Allergy — food",
  "Previous surgery — appendectomy",
  "Previous surgery — cholecystectomy",
  "Smoker (current)",
  "Smoker (former)",
  "Family history of diabetes",
  "Family history of heart disease",
  "Family history of cancer",
];

// Library of common chief complaints used by the typeahead dropdown.
const CHIEF_COMPLAINT_LIBRARY = [
  "Headache",
  "Chest pain",
  "Chest discomfort",
  "Palpitations",
  "Dizziness",
  "Cough",
  "Fever",
  "Mild fever",
  "High-grade fever",
  "Sore throat",
  "Runny nose",
  "Shortness of breath",
  "Abdominal pain",
  "Loose motion",
  "Nausea",
  "Vomiting",
  "Frequent urination",
  "Excessive thirst",
  "Fatigue",
  "Joint pain",
  "Back pain",
  "Throbbing headache",
  "Light sensitivity",
  "Difficulty sleeping",
  "Swelling of ankles",
  "Pain of joint of ankle and/or foot",
  "Decreased range of knee movement",
  "Burning sensation while urinating",
  "Loss of appetite",
  "Skin rash",
];

// Default seed for the intake question set. The doctor can edit this list at
// runtime via the "Manage Intake Questions" modal — what's saved there flows
// into the Patient Intake modal that the assistant fills out.
type IntakeQuestion = { id: string; text: string };
const DEFAULT_INTAKE_QUESTIONS: IntakeQuestion[] = [
  { id: "q1",  text: "Is the patient experiencing fever currently?" },
  { id: "q2",  text: "Any complaint of headache or dizziness?" },
  { id: "q3",  text: "Is breathing pattern normal at rest?" },
  { id: "q4",  text: "Any chest pain or tightness reported?" },
  { id: "q5",  text: "Is the appetite normal?" },
  { id: "q6",  text: "Bowel movements regular?" },
  { id: "q7",  text: "Urination frequency and colour normal?" },
  { id: "q8",  text: "Sleep pattern undisturbed?" },
  { id: "q9",  text: "Any swelling in legs / ankles / face?" },
  { id: "q10", text: "Any unintentional weight loss in last 3 months?" },
];

// Intake v2 — Question Sets. Each set has a title and its own list of
// questions. The doctor picks a set from the left panel and the assistant
// fills in answers on the right, which compose into the Summary field.
type IntakeQuestionSet = {
  id: string;
  title: string;
  isMine: boolean;
  questions: IntakeQuestion[];
};

const MOCK_INTAKE_SETS: IntakeQuestionSet[] = [
  {
    id: "set-1",
    title: "General Check-up",
    isMine: false,
    questions: [
      { id: "set1-q1", text: "Is the patient experiencing fever currently?" },
      { id: "set1-q2", text: "Any complaint of headache or dizziness?" },
      { id: "set1-q3", text: "Is breathing pattern normal at rest?" },
      { id: "set1-q4", text: "Is the appetite normal?" },
      { id: "set1-q5", text: "Sleep pattern undisturbed?" },
    ],
  },
  {
    id: "set-2",
    title: "Cardiac Review",
    isMine: false,
    questions: [
      { id: "set2-q1", text: "Any chest pain or tightness reported?" },
      { id: "set2-q2", text: "Palpitations noticed during the day?" },
      { id: "set2-q3", text: "Shortness of breath while walking?" },
      { id: "set2-q4", text: "Swelling in legs / ankles / face?" },
      { id: "set2-q5", text: "Family history of heart disease?" },
    ],
  },
  {
    id: "set-3",
    title: "Diabetes Follow-up",
    isMine: false,
    questions: [
      { id: "set3-q1", text: "Fasting blood sugar checked this week?" },
      { id: "set3-q2", text: "Any episodes of hypoglycaemia?" },
      { id: "set3-q3", text: "Tingling / numbness in hands or feet?" },
      { id: "set3-q4", text: "Vision changes recently?" },
      { id: "set3-q5", text: "Wound healing slower than usual?" },
    ],
  },
  {
    id: "set-4",
    title: "Antenatal Visit",
    isMine: true,
    questions: [
      { id: "set4-q1", text: "Foetal movements felt regularly?" },
      { id: "set4-q2", text: "Any bleeding or unusual discharge?" },
      { id: "set4-q3", text: "Swelling of hands or face?" },
      { id: "set4-q4", text: "Severe headache or blurred vision?" },
      { id: "set4-q5", text: "Last antenatal investigation date?" },
    ],
  },
  {
    id: "set-5",
    title: "Paediatric — Cough & Cold",
    isMine: true,
    questions: [
      { id: "set5-q1", text: "Duration of cough so far?" },
      { id: "set5-q2", text: "Wheezing or noisy breathing?" },
      { id: "set5-q3", text: "Feeding pattern unchanged?" },
      { id: "set5-q4", text: "Fever recorded at home?" },
    ],
  },
];

// History Intake — static checklist from the patient information form
// (Patient Information Form.pdf §3 "পূর্বের রোগ / শারীরিক অবস্থা"). The
// question list is fixed: no add/edit — just tick the conditions present.
// Cancer renders only in the bottom row; the columns split the rest 15 / 15.
type HistoryIntakeItem = { id: string; en: string; bn: string };
const HISTORY_INTAKE_ITEMS: HistoryIntakeItem[] = [
  { id: "h1",  en: "Hypertension",                                  bn: "উচ্চ রক্ত চাপ?" },
  { id: "h2",  en: "Diabetes Mellitus",                             bn: "ডায়াবেটিস (সুগার)?" },
  { id: "h3",  en: "Dyslipidemia",                                  bn: "রক্তের চর্বির সমস্যা?" },
  { id: "h4",  en: "Smoker",                                        bn: "ধূমপায়ী?" },
  { id: "h5",  en: "IHD",                                           bn: "হার্ট এ্যাটাক?" },
  { id: "h6",  en: "S/P-Stent",                                     bn: "হার্টে রিং?" },
  { id: "h7",  en: "CABG",                                          bn: "হার্টের বাইপাস সার্জারী?" },
  { id: "h8",  en: "Valvular Heart Disease",                        bn: "হার্টের ভাল্ভ এর রোগ?" },
  { id: "h9",  en: "Arrhythmia",                                    bn: "হার্ট বিট অনিয়মিত?" },
  { id: "h10", en: "H/O Stroke",                                    bn: "ব্রেইন স্ট্রোক?" },
  { id: "h11", en: "AKI/CKD/Nephrotic Syndrome",                    bn: "কিডনীর রোগ?" },
  { id: "h12", en: "Epilepsy",                                      bn: "খিচুনী রোগ?" },
  { id: "h13", en: "Known Family History of Heart Diseases/Stroke", bn: "পরিবারে হার্টের রোগ/ব্রেইন স্ট্রোক?" },
  { id: "h14", en: "Rheumatic fever",                               bn: "বাত জ্বর?" },
  { id: "h15", en: "Headache-Migraine/TH/Cluster Headache",         bn: "মাথা ব্যাথা?" },
  { id: "h16", en: "Vertigo/Dizzy",                                 bn: "মাথা ঘুরানো?" },
  { id: "h17", en: "Known Psychiatric Disease",                     bn: "মানসিক রোগ?" },
  { id: "h18", en: "Parkinson's disease",                           bn: "কাঁপা রোগ?" },
  { id: "h19", en: "Dementia",                                      bn: "স্মৃতিশক্তি লোপ/ভুলে যাওয়া?" },
  { id: "h20", en: "Spine Operation",                               bn: "স্পাইন অপারেশন?" },
  { id: "h21", en: "Brain Operation",                               bn: "ব্রেন অপারেশন?" },
  { id: "h22", en: "Movement disorder",                             bn: "মুভমেন্ট ডিসঅর্ডার?" },
  { id: "h23", en: "Multiple Sclerosis",                            bn: "মাল্টিপল স্কেলোরোসিস?" },
  { id: "h24", en: "NMO",                                           bn: "এন এম ও?" },
  { id: "h25", en: "H/O GBS",                                       bn: "জি বি এস?" },
  { id: "h26", en: "Rheumatoid Arthritis",                          bn: "রিউমাটয়েড আর্থারাইটিস?" },
  { id: "h27", en: "SLE",                                           bn: "এস এল ই (লুপাস)?" },
  { id: "h28", en: "H/O Tuberculosis",                              bn: "যক্ষা রোগ?" },
  { id: "h29", en: "H/O Cancer",                                    bn: "ক্যান্সার?" },
  { id: "h30", en: "Birth Asphyxia",                                bn: "জন্মের সময় শ্বাস নিতে দেরী?" },
  { id: "h31", en: "Delayed Milestone of Development",              bn: "মানুষিক/শারীরিক বিকাশে-বিলম্ব?" },
];
const CANCER_ITEM_ID = "h29";
const CANCER_TREATMENTS = ["Chemotherapy", "Radiotherapy"];

// Ticks survive closing the modal — the parent keeps the last-saved state
// and seeds the modal with it on every open.
type HistoryIntakeState = {
  checked: Record<string, boolean>;
  cancerSite: string;
  cancerTreatments: Record<string, boolean>;
};
const EMPTY_HISTORY_INTAKE: HistoryIntakeState = {
  checked: {},
  cancerSite: "",
  cancerTreatments: {},
};

const medications = [
  {
    name: "Tab. Napa 500 mg",
    generic: "Paracetamol",
    dosage: "১ টা করে দিনে ৩ বার - প্রয়োজনমত (ব্যাথা হলে/ জ্বর হলে) (১০) - (আহারের পর)",
  },
  {
    name: "Tab. Seclo 20 mg",
    generic: "Omeprazole",
    dosage: "১ টা করে দিনে ২ বার - (আহারের ৩০ মিনিট আগে)",
  },
  {
    name: "Syp. Ambrotex",
    generic: "Ambroxol",
    dosage: "২ চামচ করে দিনে ৩ বার - (আহারের পর)",
  },
];

// Typeahead libraries used by the lower-right + bottom row sections.
// Saved/displayed lists start empty; doctors pick from these libraries or
// type free text and press Enter.
export const TEST_LIBRARY = [
  "Random blood sugar (RBS)",
  "Fasting blood sugar (FBS)",
  "HbA1c",
  "Serum creatinine",
  "Serum electrolytes",
  "Complete Blood Count (CBC)",
  "Lipid profile",
  "Liver function test (LFT)",
  "Thyroid function test (TFT)",
  "Urine Routine Examination",
  "Chest X-ray",
  "ECG",
  "Echocardiography",
  "Ultrasonography of whole abdomen",
  "MRI of brain",
  "CT scan of chest",
  "Stool routine examination",
  "Vitamin D level",
  "Serum calcium",
  "Prothrombin time (PT/INR)",
];

export const DIAGNOSIS_LIBRARY = [
  "Senile immature cataract",
  "Type 2 Diabetes Mellitus",
  "Essential hypertension",
  "Acute pharyngitis",
  "Migraine without aura",
  "Iron deficiency anaemia",
  "Hypothyroidism",
  "Bronchial asthma",
  "Acute gastritis",
  "Urinary tract infection",
  "Osteoarthritis of knee",
  "Lower back pain",
  "Allergic rhinitis",
  "Viral fever",
  "Dyslipidaemia",
  "Peptic ulcer disease",
  "Sinusitis",
  "Vitamin D deficiency",
  "GERD",
  "Anxiety disorder",
];

export type AdviceLibEntry = { en: string; bn: string };
export type SavedAdvice = { bn: string; en?: string; showEn: boolean };
export const ADVICE_LIBRARY: AdviceLibEntry[] = [
  { bn: "স্বাভাবিক সব খাবার খাবেন",                       en: "Maintain a normal diet" },
  { bn: "প্রতিদিন কমপক্ষে ৩০ মিনিট হাঁটাচলা করুন",         en: "Walk at least 30 minutes every day" },
  { bn: "প্রচুর পানি পান করুন (২.৫–৩ লিটার)",             en: "Drink plenty of water (2.5–3 litres daily)" },
  { bn: "মিষ্টি ও শর্করা জাতীয় খাবার এড়িয়ে চলুন",     en: "Avoid sweets and starchy foods" },
  { bn: "লবণ কম খাবেন",                                    en: "Reduce salt intake" },
  { bn: "ধূমপান ও মদ্যপান পরিহার করুন",                    en: "Quit smoking and alcohol" },
  { bn: "নিয়মিত রক্তচাপ পরিমাপ করুন",                     en: "Measure blood pressure regularly" },
  { bn: "নিয়মিত রক্তে চিনির মাত্রা পরীক্ষা করুন",          en: "Check blood sugar regularly" },
  { bn: "পর্যাপ্ত বিশ্রাম ও ঘুম নিন (৭–৮ ঘণ্টা)",          en: "Get adequate rest and sleep (7–8 hours)" },
  { bn: "মানসিক চাপ কমান",                                 en: "Reduce mental stress" },
  { bn: "তেল-মসলা যুক্ত খাবার পরিহার করুন",                en: "Avoid oily and spicy food" },
  { bn: "ফল ও সবুজ শাকসবজি বেশি খান",                      en: "Eat more fruits and green vegetables" },
  { bn: "ব্যথা কমলে ওষুধ বন্ধ করবেন",                      en: "Stop medication once pain subsides" },
  { bn: "জ্বর কমলে অ্যান্টিবায়োটিক কোর্স সম্পূর্ণ করবেন", en: "Complete the antibiotic course even after fever subsides" },
  { bn: "প্রয়োজনে পরবর্তী ১৫ দিনে ফলোআপ করুন",          en: "Follow up after 15 days if needed" },
];

const DRUG_HISTORY_LIBRARY = [
  "Tab. Napa 500 mg",
  "Tab. Seclo 20 mg",
  "Tab. Metformin 500 mg",
  "Tab. Amlodipine 5 mg",
  "Tab. Losartan 50 mg",
  "Tab. Atorvastatin 20 mg",
  "Cap. Omeprazole 20 mg",
  "Tab. Cetirizine 10 mg",
  "Tab. Glimepiride 1 mg",
  "Tab. Domperidone 10 mg",
  "Cap. Amoxiclav 625 mg",
  "Syp. Ambrotex",
  "Tab. Naproxen 250 mg",
  "Tab. Sumatriptan 50 mg",
  "Inhaler Salbutamol",
];

// Stable empty arrays for the draft-backed section accessors. Inline []
// literals would produce a new reference on every render.
const EMPTY_COMPLAINTS: { id: string; text: string; remark: string }[] = [];
const EMPTY_ROWS: SutListRow[] = [];
const EMPTY_ADVICE: (SavedAdvice & { id: string })[] = [];
const EMPTY_MEDICATIONS: Medication[] = [];
const EMPTY_TEST_RESULTS: TestResultRow[] = [];

// Row ids are generated on add and live for the row's lifetime. Never derived
// from content or index (DR-025) — a content-derived key remounts the input on
// every keystroke, and an index key leaves stale text after a delete.
let rowIdSeq = 0;
const newRowId = () => `row-${Date.now().toString(36)}-${(rowIdSeq++).toString(36)}`;

const vitals = {
  weight: "",
  height: "",
  temperature: "",
  pulse: "",
  bp: "",
  rr: "",
  spo2: "",
};

// ── Shared Components ──────────────────────────────────────
// ── Reusable custom tooltip ────────────────────────────────

const TOOLTIP_CSS = `
  .nt-tip-bubble {
    position: fixed;
    padding: 5px 9px;
    background: #1a2332;
    color: #ffffff;
    font-size: 11px;
    font-weight: 500;
    line-height: 1.35;
    letter-spacing: 0.1px;
    border-radius: 5px;
    white-space: nowrap;
    pointer-events: none;
    z-index: 10000;
    font-family: 'DM Sans', sans-serif;
    transform: translate(-50%, calc(-100% - 8px));
    animation: ntTipIn 120ms ease-out;
  }
  .nt-tip-bubble::after {
    content: "";
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 4px solid transparent;
    border-top-color: #1a2332;
  }
  @keyframes ntTipIn { from { opacity: 0; } to { opacity: 1; } }

  .demo-search { transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease; }
  .demo-search:focus-within {
    border-color: #358C11 !important;
    background: #ffffff !important;
    box-shadow: 0 0 0 3px rgba(53, 140, 17, 0.12);
  }
  .demo-search input { background: transparent; border: none; outline: none; padding: 0; width: 100%; font-family: inherit; }

  /* Shared field focus — green border + soft green ring, matching the search
     box. Applied to the section textareas (Note, Summary, Physical Findings). */
  .demo-field { border: 1px solid #e7ebf0; transition: border-color 0.15s ease, box-shadow 0.15s ease; }
  .demo-field:focus { border-color: #358C11; box-shadow: 0 0 0 3px rgba(53, 140, 17, 0.12); outline: none; }

  /* Field-box focus — highlights a whole bordered container when any input
     inside it is focused (e.g. the Physical Findings vitals row). */
  .demo-fieldbox { transition: border-color 0.15s ease, box-shadow 0.15s ease; }
  .demo-fieldbox:focus-within { border-color: #358C11 !important; box-shadow: 0 0 0 3px rgba(53, 140, 17, 0.12); }

  /* Vitals cell focus — each grid cell highlights on its own. Inset rings so the
     effect isn't clipped by the box's overflow-hidden (an outward ring would be). */
  .demo-vcell { transition: box-shadow 0.15s ease, border-radius 0.15s ease; }
  .demo-vcell:focus-within { box-shadow: inset 0 0 0 1.5px #358C11, inset 0 0 0 4px rgba(53, 140, 17, 0.12); border-radius: 6px; }

  /* Editable list row focus — green border + ring when its input is focused
     (Investigation, Advice, Diagnosis, Drug History editable items). */
  .demo-rowfocus { position: relative; transition: box-shadow 0.15s ease, border-radius 0.15s ease; }
  /* z-index lifts the focused row above its siblings so the outward ring isn't
     painted over by the next row's white background. */
  .demo-rowfocus:focus-within { box-shadow: 0 0 0 1px #358C11, 0 0 0 4px rgba(53, 140, 17, 0.12); border-radius: 6px; z-index: 2; }

  /* Demographic search result row — highlighted (keyboard/hover) fills
     solid green with white text/icons; the avatar goes translucent white. */
  .dsearch-row { transition: background 0.12s ease; }
  .dsearch-row--active { background: #358C11 !important; }
  .dsearch-row--active span, .dsearch-row--active svg { color: #ffffff !important; }
  .dsearch-row--active .dsearch-avatar { background: rgba(255,255,255,0.22) !important; }

  /* Treatment "Add phase" — deliberately quiet; only tints green on hover. */
  .np-add-phase { transition: color 0.12s ease; }
  .np-add-phase:hover { color: #358C11 !important; }

  /* Demographic search panel scrollbar — matches the thin 6px style used
     across this page's modals (e.g. adv-scroll, stt-scroll, …). */
  .dsearch-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
  .dsearch-scroll::-webkit-scrollbar-track { background: transparent; }
  .dsearch-scroll::-webkit-scrollbar-thumb { background: rgba(140,145,152,0.25); border-radius: 999px; }
  .dsearch-scroll::-webkit-scrollbar-thumb:hover { background: rgba(140,145,152,0.45); }
  .dsearch-scroll { scrollbar-width: thin; scrollbar-color: rgba(140,145,152,0.25) transparent; }

  /* Page-wide scrollbar style — every scrollable element on the page
     (including portaled dropdown panels that mount on document.body)
     inherits the same thin 6px appearance as the search panel. */
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(140,145,152,0.25); border-radius: 999px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(140,145,152,0.45); }
  * { scrollbar-width: thin; scrollbar-color: rgba(140,145,152,0.25) transparent; }

  /* Global native placeholder style — full ink color, light weight. */
  input::placeholder, textarea::placeholder { color: #0F100F; opacity: 0.75; }
`;

function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const show = () => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setPos({ top: r.top, left: r.left + r.width / 2 });
  };
  const hide = () => setPos(null);

  return (
    <>
      <span
        ref={ref}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        style={{ display: "inline-flex" }}
      >
        {children}
      </span>
      {pos && createPortal(
        <span className="nt-tip-bubble" style={{ top: pos.top, left: pos.left }}>
          {label}
        </span>,
        document.body,
      )}
    </>
  );
}

type SectionMenuItem = {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
};

// The per-section action icons are collapsed into ONE hamburger menu. Clicking
// it opens a dropdown list of those actions (icon · label · chevron). The panel
// is portalled to <body> with fixed coords so the section's overflow-hidden
// never clips it.
function SectionMenu({ items }: { items: SectionMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const [btnHover, setBtnHover] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (r) setPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
    };
    place();
    const onDown = (e: MouseEvent) => {
      if (btnRef.current?.contains(e.target as Node)) return;
      if (menuRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  if (!items || items.length === 0) return null;

  return (
    <>
      <Tooltip label="Actions">
        <button
          ref={btnRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          onMouseEnter={() => setBtnHover(true)}
          onMouseLeave={() => setBtnHover(false)}
          className="flex items-center justify-center cursor-pointer rounded-[7px] transition-colors"
          style={{
            background: open || btnHover ? "#358C11" : "transparent",
            border: "none",
            padding: 4,
            // Cancel the box's extra height so the header doesn't grow — the
            // green box overflows into the header's existing padding instead.
            marginTop: -4,
            marginBottom: -4,
          }}
        >
          <Menu size={14} style={{ color: open || btnHover ? "#ffffff" : "#064232" }} />
        </button>
      </Tooltip>
      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[9999] min-w-[214px] bg-white rounded-[10px] py-[6px] font-[DM_Sans]"
            style={{
              top: pos.top,
              right: pos.right,
              boxShadow: "0 10px 30px rgba(6,66,50,0.16)",
              border: "1px solid #e7ebf0",
            }}
          >
            {items.map((it, i) => {
              const hot = hoverIdx === i;
              return (
                <button
                  key={i}
                  type="button"
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseLeave={() => setHoverIdx((p) => (p === i ? null : p))}
                  onClick={() => {
                    setOpen(false);
                    it.onClick();
                  }}
                  className="w-full flex items-center gap-[10px] px-[14px] py-[8px] text-[14px] cursor-pointer transition-colors"
                  style={{
                    background: hot ? "#358C11" : "transparent",
                    color: hot ? "#ffffff" : "#0F100F",
                    border: "none",
                  }}
                >
                  <span
                    className="shrink-0 flex items-center justify-center w-[16px]"
                    style={{ color: hot ? "#ffffff" : "#064232" }}
                  >
                    {it.icon}
                  </span>
                  <span className="flex-1 text-left whitespace-nowrap">{it.label}</span>
                  <ChevronRight
                    size={14}
                    className="shrink-0"
                    style={{ color: hot ? "#ffffff" : "#8c9198" }}
                  />
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}

// The section "Expand" control — same green-box hover as SectionMenu. The
// maximize glyph is a fixed-color SVG <img>, so it's flipped to white with a
// brightness/invert filter on hover.
function MaximizeButton() {
  const [hover, setHover] = useState(false);
  return (
    <Tooltip label="Expand">
      <button
        type="button"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="flex items-center justify-center cursor-pointer rounded-[7px] transition-colors"
        style={{ background: hover ? "#358C11" : "transparent", border: "none", padding: 4, marginTop: -4, marginBottom: -4 }}
      >
        <img
          src={iconMaximize}
          width={14}
          height={14}
          alt="Expand"
          style={{ filter: hover ? "brightness(0) invert(1)" : "none" }}
        />
      </button>
    </Tooltip>
  );
}

function SectionHeader({
  title,
  actions,
  menuItems,
}: {
  title: string;
  actions?: React.ReactNode;
  menuItems?: SectionMenuItem[];
}) {
  return (
    <div className="flex items-center justify-between pl-[18px] pr-[12px] py-[6px] bg-[#e0ecda] shrink-0 border-0">
      <span className="text-[12px] font-bold uppercase tracking-[0.096px] text-[#064232] font-[DM_Sans]">
        {title}
      </span>
      <div className="flex items-center gap-[14px]">
        {menuItems && menuItems.length > 0 ? <SectionMenu items={menuItems} /> : actions}
      </div>
    </div>
  );
}

function ListRow({
  children,
  isLast = false,
  className = "",
  serial,
}: {
  children: React.ReactNode;
  isLast?: boolean;
  className?: string;
  serial?: number;
}) {
  return (
    <div
      className={`demo-rowfocus flex items-center justify-between gap-[6px] px-[6px] py-[6px] h-[30px] bg-white ${
        !isLast ? "border-b border-[#e7ebf0]" : ""
      } ${className}`}
    >
      {typeof serial === "number" && <SerialBadge num={serial} />}
      {children}
    </div>
  );
}

function SearchRow({ placeholder }: { placeholder: string }) {
  return (
    <div className="flex items-center justify-between px-[16px] py-[10px] h-[40px] bg-white rounded-b-[8px]">
      <span className="text-[14px] text-[#8c9198] font-[DM_Sans]">{placeholder}</span>
      <Search size={18} className="text-[#8c9198]" />
    </div>
  );
}

// Functional add-row with typeahead. Used by Test, Advice, Diagnosis, and
// Drug History sections. Picks (or Enter on free text) call onAdd and clear
// the input. Optionally renders a SerialBadge on the left (for Test).
//
// `library` accepts either plain strings (used by Test/Diagnosis/Drug History)
// or `{ en, bn }` pairs (used by Advice — search hits on either language;
// the dropdown shows both lines; picking commits the bn value because the
// prescription is rendered in Bengali).
type LibEntry = string | { en: string; bn: string };

function SimpleAddRow({
  placeholder,
  library,
  panelId,
  onAdd,
  serialNum,
  font,
  showTranslate = false,
}: {
  placeholder: string;
  library: LibEntry[];
  panelId: string;
  // For bilingual libraries `translation` is the EN counterpart of `value`.
  onAdd: (value: string, translation?: string) => void;
  serialNum?: number;
  font?: string;
  // When true, render an always-visible Languages icon at the right of the
  // input. Toggling shows a fixed default sentence in the opposite language.
  showTranslate?: boolean;
}) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [showTranslated, setShowTranslated] = useState(false);
  const [focused, setFocused] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const queryStr = text.trim();
  const queryLower = queryStr.toLowerCase();
  const matches = library.filter((c) => {
    if (!queryStr) return true;
    if (typeof c === "string") return c.toLowerCase().includes(queryLower);
    // Bilingual: search EN case-insensitively and BN with raw substring
    return c.en.toLowerCase().includes(queryLower) || c.bn.includes(queryStr);
  });

  useEffect(() => { setHighlight(0); }, [text]);

  useEffect(() => {
    if (!open) return;
    const update = () => {
      // Anchor the dropdown to the full add-row (wrapper) so its width matches
      // the visible field, not just the inner input element.
      if (!inputRef.current || !wrapperRef.current) return;
      const inputRect = inputRef.current.getBoundingClientRect();
      const rowRect = wrapperRef.current.getBoundingClientRect();
      setPos({ top: inputRect.bottom + 4, left: rowRect.left, width: rowRect.width });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  useEffect(() => {
    function handle(e: MouseEvent) {
      const t = e.target as Node;
      if (wrapperRef.current && !wrapperRef.current.contains(t)) {
        const panel = document.getElementById(panelId);
        if (panel && panel.contains(t)) return;
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open, panelId]);

  const commitItem = (item: LibEntry) => {
    const value = (typeof item === "string" ? item : item.bn).trim();
    if (!value) return;
    onAdd(value, typeof item === "string" ? undefined : item.en);
    setText("");
    setOpen(false);
  };

  const commitFreeText = (v: string) => {
    const value = v.trim();
    if (!value) return;
    onAdd(value);
    setText("");
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp") && text.length > 0) {
      setOpen(true);
      e.preventDefault();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && matches[highlight]) commitItem(matches[highlight]);
      else if (text.trim()) commitFreeText(text);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const fontCls = font ?? "font-[DM_Sans]";
  const textSizeCls = font === "font-[Kalpurush]" ? "text-[15px]" : "text-[15px]";

  // Translation — look up the FAKE_ADVICE_TRANSLATIONS dictionary first;
  // fall back to a fixed default sentence when there's no match.
  const textIsBn = /[ঀ-৿]/.test(text);
  const DEFAULT_EN = "This is translated";
  const DEFAULT_BN = "এটা ট্রান্সলেটেড হয়েছে";
  const showingTranslation = showTranslate && showTranslated;
  const dictBn = !textIsBn ? fakeTranslateEnToBn(text) : null;
  const dictEn = textIsBn ? fakeTranslateBnToEn(text) : null;
  const displayValue = showingTranslation
    ? (text.trim() === ""
        ? DEFAULT_BN
        : textIsBn
          ? (dictEn ?? DEFAULT_EN)
          : (dictBn ?? DEFAULT_BN))
    : text;
  const showBnFont = showingTranslation
    ? (text.trim() && textIsBn ? false : true)
    : font === "font-[Kalpurush]";

  return (
    <>
      {/* wrapperRef + relative live on the ROW (not an extra wrapper div) so
          the row is the container's direct child and inherits its first/last
          corner rounding — otherwise the empty-state add row has square top
          corners. */}
      <div
        ref={wrapperRef}
        className={`relative flex items-center gap-[6px] px-[6px] h-[30px] bg-white ${focused ? "rounded-[6px]" : "rounded-b-[8px]"}`}
        style={{
          boxShadow: focused ? "0 0 0 1px #358C11, 0 0 0 4px rgba(53,140,17,0.12)" : "none",
          transition: "box-shadow 0.15s ease",
        }}
      >
        {typeof serialNum === "number" && <SerialBadge num={serialNum} muted />}
        <div className="relative flex-1 min-w-0">
          <input
            ref={inputRef}
            type="text"
            value={displayValue}
            onFocus={() => {
              setFocused(true);
              // Clicking into the input means the doctor wants to edit. Commit
              // the translated text as the new value so they can edit it
              // directly, then drop the translation overlay.
              if (showingTranslation) {
                setText(displayValue);
                setShowTranslated(false);
              }
            }}
            onBlur={() => setFocused(false)}
            onChange={(e) => {
              const v = e.target.value;
              setText(v);
              setOpen(v.length > 0);
            }}
            onKeyDown={onKeyDown}
            className={`w-full ${textSizeCls} text-[#0F100F] outline-none bg-transparent ${
              showBnFont ? "font-[Kalpurush]" : fontCls
            }`}
            style={{ border: "none", paddingRight: showTranslate ? 24 : 0 }}
          />
          {text.trim() === "" && !showingTranslation && (
            <span className={`absolute inset-y-0 left-0 flex items-center ${textSizeCls} text-[#0F100F]/75 font-[DM_Sans] pointer-events-none`}>
              {placeholder}
            </span>
          )}
        </div>
      </div>

      {/* Panel only renders when matches exist — used by Test, Advice,
          Diagnosis, Drug History. Empty-state / "Press Enter to add" hint is
          suppressed; the user can still press Enter in the input to commit
          free text. */}
      {open && pos && matches.length > 0 && createPortal(
        <div
          id={panelId}
          className="rounded-[10px] bg-white py-[4px] font-[DM_Sans]"
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            width: pos.width,
            border: "1px solid #eef0f4",
            boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
            maxHeight: 240,
            overflowY: "auto",
            zIndex: 250,
          }}
        >
          {matches.map((m, i) => {
              const isHighlight = i === highlight;
              const isBilingual = typeof m !== "string";
              const key = typeof m === "string" ? m : m.bn;
              return (
                <button
                  key={key}
                  type="button"
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => commitItem(m)}
                  className="w-full text-left px-[14px] py-[8px] cursor-pointer border-none flex flex-col gap-[1px]"
                  style={{
                    background: isHighlight ? "#358C11" : "transparent",
                    transition: "background 0.1s ease",
                  }}
                >
                  {isBilingual ? (
                    <>
                      <span
                        className="text-[15px] font-[Kalpurush] truncate"
                        style={{ color: isHighlight ? "#ffffff" : "#0F100F", fontWeight: isHighlight ? 600 : 500 }}
                      >
                        {(m as { en: string; bn: string }).bn}
                      </span>
                      <span
                        className="text-[12px] truncate"
                        style={{ color: isHighlight ? "rgba(255,255,255,0.85)" : "#8c9198" }}
                      >
                        {(m as { en: string; bn: string }).en}
                      </span>
                    </>
                  ) : (
                    <span
                      className={`${textSizeCls} ${fontCls}`}
                      style={{ color: isHighlight ? "#ffffff" : "#0F100F", fontWeight: isHighlight ? 600 : 400 }}
                    >
                      {m as string}
                    </span>
                  )}
                </button>
              );
            })}
        </div>,
        document.body,
      )}
    </>
  );
}

// Stack of Add-Complaint rows — every time the user picks a complaint in the
// last row, a fresh empty row is appended below so they can immediately
// enter another. Each row keeps its own complaint/history state internally.
function ChiefComplaintAddRows({
  library = CHIEF_COMPLAINT_LIBRARY,
  placeholder = "Add present Complaint",
}: {
  library?: string[];
  placeholder?: string;
}) {
  // Use stable IDs so deleting a row in the middle doesn't unmount sibling
  // rows and lose their state.
  const [rowIds, setRowIds] = useState<string[]>(["row-0"]);
  // Refs to each row's Complaint input (keyed by id) for cross-row focus.
  const complaintInputRefs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>({});

  // Single-row layout always. Below 1920×1080 the Onset / Progression /
  // Duration dropdowns and the Remarks field render at half their large-
  // display size so the whole row still fits comfortably on one line.
  const [isWide, setIsWide] = useState<boolean>(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1920px)");
    const onChange = (e: MediaQueryListEvent) => setIsWide(e.matches);
    setIsWide(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // ╔═══ REVERT MARKER · "present-complaints compact redesign" ═══╗
  // Below 1366×768 we switch to a 2-row layout (complaint + 3 dropdowns
  // on top, Remarks aligned with the dropdowns on a 2nd row). To revert:
  //   1. delete this `isCompact` state + matchMedia block,
  //   2. stop passing `isCompact` to ChiefComplaintInputRow,
  //   3. remove the matching `if (isCompact) { … }` branch in the row's
  //      JSX (search for the same "REVERT MARKER" comment there).
  const [isCompact, setIsCompact] = useState<boolean>(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1399px)");
    const onChange = (e: MediaQueryListEvent) => setIsCompact(e.matches);
    setIsCompact(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  // ╚═══ END REVERT MARKER ═══╝

  return (
    <>
      {rowIds.map((id, i) => (
        <ChiefComplaintInputRow
          key={id}
          index={i}
          library={library}
          placeholder={placeholder}
          isLastRow={i === rowIds.length - 1}
          onPicked={() => {
            // Append a new empty row only when the user picks in the bottom row
            if (i === rowIds.length - 1) {
              setRowIds((prev) => [...prev, `row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`]);
            }
          }}
          registerComplaintRef={(el) => { complaintInputRefs.current[id] = el; }}
          onDelete={() => {
            setRowIds((prev) => {
              const next = prev.filter((x) => x !== id);
              // Always keep at least one row so the user can keep adding
              return next.length > 0 ? next : [`row-${Date.now()}`];
            });
            delete complaintInputRefs.current[id];
          }}
        />
      ))}
    </>
  );
}

// Chief Complaint structured fields — Onset / Progression / Duration.
// Options seeded from Niramoy_CC_StructuredFields_DesignHandoff.docx. All
// three are editable comboboxes: doctor can pick a suggestion or type any
// custom value (free text). Duration uses common shorthand combinations
// instead of the spec's strict value+unit composite — matches the v2
// playground pattern.
const CC_ONSET_OPTIONS = [
  opt("Acute"),
  opt("Sub-acute"),
  opt("Insidious"),
];

// Ordered by clinical frequency — most common first (per spec).
const CC_PROGRESSION_OPTIONS = [
  opt("Gradually progressive"),
  opt("Sudden"),
  opt("Progressive then recovering"),
  opt("Waxing and waning"),
  opt("Waxing and waning with secondary progression"),
];

// CC Duration — a simple editable dropdown of common durations (replaces the
// old composite number + day/month/year control). Editable, so the doctor can
// still type a custom value.
const CC_DURATION_OPTIONS = [
  opt("1 day"),
  opt("3 days"),
  opt("5 days"),
  opt("1 week"),
  opt("2 weeks"),
  opt("1 month"),
];

// Chief-Complaints redesign — Duration is picked as number + unit chips.
const CC_DUR_NUMS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
const CC_DUR_UNITS = ["Days", "Weeks", "Months", "Year"];

// Selectable pill/chip used across the Chief-Complaints detail editor
// (Duration numbers + units, Onset, Progression). Green when selected.
function CCChip({
  label,
  selected,
  onClick,
  italic = false,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  italic?: boolean;
}) {
  const [hover, setHover] = useState(false);
  // Selected OR hovered → green fill (hover previews the selection).
  const active = selected || hover;
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={`h-[30px] px-[11px] rounded-[6px] text-[13px] cursor-pointer transition-colors whitespace-nowrap ${italic ? "italic" : ""}`}
      style={{
        background: active ? "#358C11" : "#ffffff",
        color: active ? "#ffffff" : "#0F100F",
        border: `1px solid ${active ? "#358C11" : "#d9dde3"}`,
      }}
    >
      {label}
    </button>
  );
}

// CC Duration field — composite control (was a flat editable combobox).
// The doctor types a number on the LEFT (cursor blinks there) and picks
// the unit from a small dropdown on the RIGHT: day / month / year.
// Stored as "<n> <unit>" e.g. "7 day", "3 month". Parsed back into the
// two parts via CC_DURATION_UNITS.
const CC_DURATION_UNITS = ["day", "month", "year"] as const;
type CCDurationUnit = (typeof CC_DURATION_UNITS)[number];

function parseCCDuration(value: string): { amount: string; unit: CCDurationUnit | "" } {
  const m = value.trim().match(/^(\d*)\s*(day|days|month|months|year|years)?$/i);
  const amount = m?.[1] ?? "";
  const rawUnit = (m?.[2] ?? "").toLowerCase().replace(/s$/, "");
  const unit = (CC_DURATION_UNITS as readonly string[]).includes(rawUnit)
    ? (rawUnit as CCDurationUnit)
    : "";
  return { amount, unit };
}

function composeCCDuration(amount: string, unit: CCDurationUnit | ""): string {
  const a = amount.replace(/\D/g, "");
  if (!a && !unit) return "";
  if (!a) return unit;
  return `${a} ${unit || "day"}`;
}

function CCDurationInput({
  value,
  onChange,
  width,
}: {
  value: string;
  onChange: (v: string) => void;
  width: number;
}) {
  const { amount, unit } = useMemo(() => parseCCDuration(value), [value]);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; minWidth: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Position the unit-list panel anchored under the unit trigger.
  useEffect(() => {
    if (!open) return;
    const update = () => {
      if (!triggerRef.current) return;
      const r = triggerRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left, minWidth: Math.max(r.width, 70) });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  // Click-outside (also accounts for the portal panel).
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapperRef.current?.contains(t)) return;
      const panel = document.getElementById("cc-duration-panel");
      if (panel?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const displayUnit: CCDurationUnit = unit || "day";

  return (
    <div
      ref={wrapperRef}
      onClick={(e) => {
        // Click anywhere in the field (except the unit trigger) focuses the
        // number input so the cursor lands before the unit.
        if ((e.target as HTMLElement).closest("button")) return;
        inputRef.current?.focus();
      }}
      className="relative shrink-0 flex items-center h-[28px] rounded-[8px] px-[8px] cursor-text"
      style={{
        width,
        background: focused ? "#ffffff" : "#ffffff",
        border: focused ? "1px solid #358C11" : "1px solid #eef0f4",
        boxShadow: focused ? "0 0 0 3px rgba(53,140,17,0.1)" : "none",
        transition: "background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease",
      }}
    >
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={amount}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => onChange(composeCCDuration(e.target.value, unit))}
        placeholder="—"
        className="flex-1 min-w-0 text-[13px] text-[#0F100F] outline-none bg-transparent font-[DM_Sans]"
        style={{ border: "none" }}
      />
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-[2px] text-[12px] text-[#5a6070] cursor-pointer shrink-0 ml-[4px]"
        style={{ background: "transparent", border: "none", padding: 0 }}
      >
        {displayUnit}
        <ChevronDown size={11} className="text-[#8c9198]" />
      </button>
      {open && pos && createPortal(
        <div
          id="cc-duration-panel"
          className="rounded-[8px] bg-white py-[4px] font-[DM_Sans]"
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            minWidth: pos.minWidth,
            border: "1px solid #eef0f4",
            boxShadow: "0 8px 24px rgba(15,23,42,0.10)",
            zIndex: 320,
          }}
        >
          {CC_DURATION_UNITS.map((u) => {
            const isSel = u === unit;
            return (
              <button
                key={u}
                type="button"
                onClick={() => {
                  onChange(composeCCDuration(amount, u));
                  setOpen(false);
                  // Return focus to the number input so the cursor blinks
                  // before the newly-picked unit again.
                  setTimeout(() => inputRef.current?.focus(), 0);
                }}
                className="block w-full text-left px-[12px] py-[5px] cursor-pointer border-none bg-transparent text-[13px]"
                style={{
                  background: isSel ? "#eaf5e3" : "transparent",
                  color: isSel ? "#256b06" : "#0F100F",
                  fontWeight: isSel ? 600 : 400,
                }}
                onMouseEnter={(e) => {
                  if (!isSel) (e.currentTarget as HTMLButtonElement).style.background = "#f5faf3";
                }}
                onMouseLeave={(e) => {
                  if (!isSel) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                }}
              >
                {u}
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </div>
  );
}

// Add-Complaint row — complaint typeahead followed by the three structured
// fields per the CC Structured Fields Design Handoff: Onset (3-option strict
// dropdown), Progression (5-option strict dropdown), Duration (composite:
// integer + unit dropdown). Remarks remains as additional free text.
// Selecting a complaint suggestion appends a fresh empty row below.
function ChiefComplaintInputRow({
  index,
  library,
  placeholder,
  isLastRow,
  onPicked,
  registerComplaintRef,
  onDelete,
}: {
  index: number;
  library: string[];
  placeholder: string;
  isLastRow: boolean;
  onPicked: () => void;
  registerComplaintRef: (el: HTMLInputElement | HTMLTextAreaElement | null) => void;
  onDelete: () => void;
}) {
  const [complaint, setComplaint] = useState("");
  const [onset, setOnset] = useState("");
  const [progression, setProgression] = useState("");
  const [durAmount, setDurAmount] = useState("");
  const [durUnit, setDurUnit] = useState("");
  const [customDur, setCustomDur] = useState(false);
  const [remarks, setRemarks] = useState("");
  // A row is "committed" once a complaint is picked/entered — only then does it
  // switch from the live typeahead input to the static, expandable row. Typing
  // alone must NOT commit, or the input would vanish mid-search.
  const [committed, setCommitted] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [notesHover, setNotesHover] = useState(false);
  const [okHover, setOkHover] = useState(false);
  const [cancelHover, setCancelHover] = useState(false);
  const [remarksFocused, setRemarksFocused] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const complaintInputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  // Snapshot of the detail selections when the modal opens, so Cancel reverts.
  const detailSnapshot = useRef<{ onset: string; progression: string; durAmount: string; durUnit: string; customDur: boolean; remarks: string } | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const openDetails = () => {
    detailSnapshot.current = { onset, progression, durAmount, durUnit, customDur, remarks };
    setShowModal(true);
  };
  const cancelDetails = () => {
    const s = detailSnapshot.current;
    if (s) {
      setOnset(s.onset);
      setProgression(s.progression);
      setDurAmount(s.durAmount);
      setDurUnit(s.durUnit);
      setCustomDur(s.customDur);
      setRemarks(s.remarks);
    }
    setShowModal(false);
  };

  const durationLabel = durAmount && durUnit ? `${durAmount} ${durUnit.toLowerCase()}` : "";
  const summaryChips = [onset, progression, durationLabel].filter(Boolean);

  const matches = library.filter(
    (c) => complaint.trim() === "" || c.toLowerCase().includes(complaint.toLowerCase()),
  );

  // Reset highlight when the search text changes
  useEffect(() => { setHighlight(0); }, [complaint]);

  // Position the portal panel just below the row — width matches the FULL
  // input area (the whole row: badge + input + controls), not just the text
  // input, so the dropdown spans the entire field width.
  useEffect(() => {
    if (!open) return;
    const update = () => {
      if (!wrapperRef.current) return;
      const r = wrapperRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left, width: r.width });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  // Click-outside (also accounting for the portal panel)
  useEffect(() => {
    function handle(e: MouseEvent) {
      const t = e.target as Node;
      if (wrapperRef.current && !wrapperRef.current.contains(t)) {
        const panel = document.getElementById("cc-typeahead-panel");
        if (panel && panel.contains(t)) return;
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const pickItem = (text: string) => {
    setComplaint(text);
    setOpen(false);
    setCommitted(true);
    // Filling this row appends a new empty one below (if it was the last).
    // Details (Duration / Onset / Progression) are added by expanding the row.
    onPicked();
  };

  const onComplaintKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp") && complaint.length > 0) {
      setOpen(true);
      e.preventDefault();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && matches[highlight]) {
        pickItem(matches[highlight]);
      } else if (complaint.trim()) {
        // Free-text fallback: accept what the user typed and commit the row.
        setOpen(false);
        setCommitted(true);
        onPicked();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className={`relative bg-white ${isLastRow && !committed ? "" : "border-b border-[#e7ebf0]"}`} style={{ zIndex: inputFocused ? 2 : undefined }}>
      {/* Header — number badge · complaint · Add Notes · remove.
          A filled complaint is a button that expands the detail editor;
          an empty row is the "Add present Complaint" typeahead. */}
      <div
        className="flex items-start gap-[6px] px-[6px] py-[2px] rounded-[6px]"
        style={{
          boxShadow: inputFocused
            ? "0 0 0 1px #358C11, 0 0 0 4px rgba(53,140,17,0.12)"
            : "none",
          transition: "box-shadow 0.15s ease",
        }}
      >
        <span
          className="shrink-0 mt-[1px] w-[22px] h-[22px] rounded-[6px] flex items-center justify-center text-[12px] font-semibold"
          style={{
            background: committed ? "#eaf5e3" : "#eef0f4",
            color: committed ? "#358C11" : "#8c9198",
          }}
        >
          {index + 1}
        </span>

        {/* Complaint is ALWAYS an editable typeahead input (even after it's
            committed) — clicking the text just focuses it for editing. Only
            the "Add Notes" button opens the details modal. Summary chips (once
            details are set) render below the input. */}
        <div className="flex-1 min-w-0">
          <div className="relative h-[26px] flex items-center">
            <input
              ref={(el) => {
                complaintInputRef.current = el;
                registerComplaintRef(el);
              }}
              type="text"
              value={complaint}
              onChange={(e) => {
                const v = e.target.value;
                setComplaint(v);
                setOpen(v.length > 0);
              }}
              onKeyDown={onComplaintKeyDown}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              className="w-full text-[15px] text-[#0F100F] outline-none bg-transparent font-[DM_Sans]"
              style={{ border: "none" }}
            />
            {complaint.trim() === "" && (
              <span className="absolute inset-y-0 left-0 flex items-center text-[15px] text-[#0F100F]/75 font-[DM_Sans] pointer-events-none whitespace-nowrap">
                {placeholder}
              </span>
            )}
          </div>
          {committed && summaryChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-[6px] mt-[6px]">
              {summaryChips.map((c, i) => (
                <span
                  key={i}
                  className="text-[12px] text-[#0F100F] rounded-full px-[10px] py-[2px]"
                  style={{ background: "#f4f6f9" }}
                >
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Add Notes is always visible; the trailing icon is remove (committed)
            or the search affordance (empty typeahead row). */}
        <div className="flex items-center gap-[6px] shrink-0 self-center">
          <button
            type="button"
            onClick={openDetails}
            disabled={complaint.trim() === ""}
            onMouseEnter={() => setNotesHover(true)}
            onMouseLeave={() => setNotesHover(false)}
            className={`text-[13px] px-[12px] h-[26px] inline-flex items-center rounded-[7px] transition-colors ${
              complaint.trim() === "" ? "cursor-not-allowed" : "cursor-pointer"
            }`}
            style={{
              background: complaint.trim() !== "" && notesHover ? "#358C11" : "#ffffff",
              color:
                complaint.trim() === "" ? "#b6bcc6" : notesHover ? "#ffffff" : "#0F100F",
              border: `1px solid ${
                complaint.trim() === "" ? "#eef0f4" : notesHover ? "#358C11" : "#e0e3e9"
              }`,
            }}
          >
            Add Notes
          </button>
          {committed ? (
            <Tooltip label="Remove">
              <X
                size={13}
                className="text-[#8c9198] hover:text-[#dc2626] transition-colors cursor-pointer"
                onClick={onDelete}
              />
            </Tooltip>
          ) : (
            // Empty/initial row still shows the ✕ close button, but disabled
            // (greyed out, no action) so its footprint matches committed rows.
            <button
              type="button"
              disabled
              aria-label="Remove"
              className="shrink-0 inline-flex items-center justify-center cursor-not-allowed"
              style={{ background: "transparent", border: "none", padding: 0 }}
            >
              <X size={13} style={{ color: "#cdd2da" }} />
            </button>
          )}
        </div>
      </div>

      {/* Detail modal — Duration / Onset / Progression, opened by "Add Notes"
          (or clicking the complaint). Cancel/✕/backdrop revert to the state
          captured when it opened; OK keeps the selections. */}
      {showModal && createPortal(
        <div
          className="fixed inset-0 z-[400] flex items-center justify-center p-[16px]"
          style={{ background: "rgba(15,23,42,0.35)" }}
          onMouseDown={cancelDetails}
        >
          <div
            className="bg-white rounded-[12px] w-[520px] max-w-full max-h-[85vh] overflow-auto shadow-2xl font-[DM_Sans]"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between px-[20px] py-[16px]" style={{ borderBottom: "1px solid #eef0f4" }}>
              <div className="min-w-0">
                <div className="text-[15px] font-semibold text-[#0F100F]">Complaint details</div>
                <div className="text-[15px] text-[#0F100F]/75 font-[DM_Sans] truncate mt-[2px]">{complaint.trim() || "New complaint"}</div>
              </div>
              <X
                size={18}
                className="text-[#8c9198] hover:text-[#0F100F] cursor-pointer shrink-0 mt-[2px]"
                onClick={cancelDetails}
              />
            </div>

            <div className="px-[20px] py-[18px] flex flex-col gap-[18px]">
              <div>
                <div className="text-[13px] text-[#0F100F] mb-[8px]">Duration</div>
                <div className="flex flex-wrap items-center gap-[6px] mb-[8px]">
                  {CC_DUR_NUMS.map((n) => (
                    <CCChip
                      key={n}
                      label={n}
                      selected={!customDur && durAmount === n}
                      onClick={() => { setDurAmount(n); setCustomDur(false); }}
                    />
                  ))}
                  <CCChip
                    label="Custom"
                    italic
                    selected={customDur}
                    onClick={() => { setCustomDur(true); setDurAmount(""); }}
                  />
                  {customDur && (
                    <input
                      type="text"
                      inputMode="numeric"
                      value={durAmount}
                      onChange={(e) => setDurAmount(e.target.value)}
                      placeholder="—"
                      className="w-[56px] text-[13px] text-[#0F100F] outline-none bg-white text-center font-[DM_Sans]"
                      style={{ border: "1px solid #358C11", borderRadius: 6, height: 30 }}
                    />
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-[6px]">
                  {CC_DUR_UNITS.map((u) => (
                    <CCChip key={u} label={u} selected={durUnit === u} onClick={() => setDurUnit(u)} />
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[13px] text-[#0F100F] mb-[8px]">Onset</div>
                <div className="flex flex-wrap items-center gap-[6px]">
                  {CC_ONSET_OPTIONS.map((o) => (
                    <CCChip
                      key={o.value}
                      label={o.label}
                      selected={onset === o.value}
                      onClick={() => setOnset(onset === o.value ? "" : o.value)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[13px] text-[#0F100F] mb-[8px]">Progression</div>
                <div className="flex flex-wrap items-center gap-[6px]">
                  {CC_PROGRESSION_OPTIONS.map((p) => (
                    <CCChip
                      key={p.value}
                      label={p.label}
                      selected={progression === p.value}
                      onClick={() => setProgression(progression === p.value ? "" : p.value)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[13px] text-[#0F100F] mb-[8px]">Remarks</div>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  onFocus={() => setRemarksFocused(true)}
                  onBlur={() => setRemarksFocused(false)}
                  placeholder="Add any remarks…"
                  className="w-full text-[14px] text-[#0F100F] outline-none bg-white resize-none font-[DM_Sans]"
                  style={{
                    border: `1px solid ${remarksFocused ? "#358C11" : "#e0e3e9"}`,
                    boxShadow: remarksFocused ? "0 0 0 3px rgba(53,140,17,0.15)" : "none",
                    borderRadius: 8,
                    padding: "9px 12px",
                    minHeight: 80,
                    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                  }}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-[8px] px-[20px] py-[14px]" style={{ borderTop: "1px solid #eef0f4" }}>
              <button
                type="button"
                onClick={cancelDetails}
                onMouseEnter={() => setCancelHover(true)}
                onMouseLeave={() => setCancelHover(false)}
                className="text-[13px] px-[16px] py-[8px] rounded-[8px] cursor-pointer transition-colors"
                style={{
                  background: cancelHover ? "#358C11" : "#ffffff",
                  border: `1px solid ${cancelHover ? "#358C11" : "#e0e3e9"}`,
                  color: cancelHover ? "#ffffff" : "#0F100F",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                onMouseEnter={() => setOkHover(true)}
                onMouseLeave={() => setOkHover(false)}
                className="text-[13px] px-[18px] py-[8px] rounded-[8px] cursor-pointer transition-colors"
                style={{
                  background: okHover ? "#22680A" : "#358C11",
                  border: `1px solid ${okHover ? "#22680A" : "#358C11"}`,
                  color: "#ffffff",
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* Dropdown panel — portal so it isn't clipped by the section's overflow.
          Only renders when at least one match is found; "no match" / "start
          typing" placeholders are suppressed so the panel disappears instead. */}
      {open && pos && matches.length > 0 && createPortal(
        <div
          id="cc-typeahead-panel"
          className="rounded-[10px] bg-white py-[4px] font-[DM_Sans]"
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            width: pos.width,
            border: "1px solid #eef0f4",
            boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
            maxHeight: 240,
            overflowY: "auto",
            zIndex: 250,
          }}
        >
          {matches.map((m, i) => {
              const isHighlight = i === highlight;
              return (
                <button
                  key={m}
                  type="button"
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => pickItem(m)}
                  className="w-full text-left px-[14px] py-[8px] cursor-pointer border-none"
                  style={{
                    background: isHighlight ? "#358C11" : "transparent",
                    color: isHighlight ? "#ffffff" : "#0F100F",
                    transition: "background 0.1s ease",
                  }}
                >
                  <span className="text-[13px]" style={{ fontWeight: isHighlight ? 600 : 400 }}>{m}</span>
                </button>
              );
            })}
        </div>,
        document.body,
      )}
    </div>
  );
}

// Stack of Add-History rows — same pattern as ChiefComplaintAddRows. Picking
// in the bottom row appends an empty one below; Enter in the right (Remarks)
// field hands focus to the next row's history input.
function MedicalHistoryAddRows() {
  const [rowIds, setRowIds] = useState<string[]>(["mh-0"]);
  const historyInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  return (
    <>
      {rowIds.map((id, i) => (
        <MedicalHistoryInputRow
          key={id}
          isLastRow={i === rowIds.length - 1}
          onPicked={() => {
            if (i === rowIds.length - 1) {
              setRowIds((prev) => [...prev, `mh-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`]);
            }
          }}
          registerHistoryRef={(el) => { historyInputRefs.current[id] = el; }}
          focusNextHistory={() => {
            const nextId = rowIds[i + 1];
            if (nextId) historyInputRefs.current[nextId]?.focus();
          }}
          onDelete={() => {
            setRowIds((prev) => {
              const next = prev.filter((x) => x !== id);
              return next.length > 0 ? next : [`mh-${Date.now()}`];
            });
            delete historyInputRefs.current[id];
          }}
        />
      ))}
    </>
  );
}

function MedicalHistoryInputRow({
  isLastRow,
  onPicked,
  registerHistoryRef,
  focusNextHistory,
  onDelete,
}: {
  isLastRow: boolean;
  onPicked: () => void;
  registerHistoryRef: (el: HTMLInputElement | null) => void;
  focusNextHistory: () => void;
  onDelete: () => void;
}) {
  const [historyItem, setHistoryItem] = useState("");
  const [remarks, setRemarks] = useState("");
  const [remarksFocused, setRemarksFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const historyInputRef = useRef<HTMLInputElement>(null);
  const remarksInputRef = useRef<HTMLInputElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const matches = MEDICAL_HISTORY_LIBRARY.filter(
    (c) => historyItem.trim() === "" || c.toLowerCase().includes(historyItem.toLowerCase()),
  );

  useEffect(() => { setHighlight(0); }, [historyItem]);

  useEffect(() => {
    if (!open) return;
    const update = () => {
      if (!historyInputRef.current) return;
      const r = historyInputRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left, width: r.width });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  useEffect(() => {
    function handle(e: MouseEvent) {
      const t = e.target as Node;
      if (wrapperRef.current && !wrapperRef.current.contains(t)) {
        const panel = document.getElementById("mh-typeahead-panel");
        if (panel && panel.contains(t)) return;
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const pickItem = (text: string) => {
    setHistoryItem(text);
    setOpen(false);
    setTimeout(() => remarksInputRef.current?.focus(), 0);
    onPicked();
  };

  const onHistoryKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp") && historyItem.length > 0) {
      setOpen(true);
      e.preventDefault();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && matches[highlight]) {
        pickItem(matches[highlight]);
      } else if (historyItem.trim()) {
        setOpen(false);
        setTimeout(() => remarksInputRef.current?.focus(), 0);
        onPicked();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div
        className={`flex items-center justify-between px-[16px] h-[40px] bg-white ${
          isLastRow ? "rounded-b-[8px]" : "border-b border-[#e7ebf0]"
        }`}
      >
        {/* Left: history typeahead */}
        <div className="relative flex-1 min-w-0">
          <input
            ref={(el) => {
              historyInputRef.current = el;
              registerHistoryRef(el);
            }}
            type="text"
            value={historyItem}
            onChange={(e) => {
              const v = e.target.value;
              setHistoryItem(v);
              setOpen(v.length > 0);
            }}
            onKeyDown={onHistoryKeyDown}
            className="w-full text-[15px] text-[#0F100F] outline-none bg-transparent font-[DM_Sans]"
            style={{ border: "none" }}
          />
          {historyItem.trim() === "" && (
            <span className="absolute inset-y-0 left-0 flex items-center text-[15px] text-[#0F100F]/75 font-[DM_Sans] pointer-events-none">
              Add patient medical history
            </span>
          )}
        </div>

        {/* Right: remarks pill — visually matches the Present Complaint
            Remarks (V2NoteInput style): tinted bg → white on focus, light
            border → green border + soft green ring on focus. Width wrapper
            (flex-1 min-w-0) preserved so layout is unchanged. */}
        <div className="flex items-center gap-[8px] flex-1 min-w-0">
          <div className="flex-1 min-w-0">
            <div
              className="flex items-center w-full h-[28px] px-[12px] rounded-[8px]"
              style={{
                background: remarksFocused ? "#ffffff" : "#ffffff",
                border: remarksFocused ? "1px solid #358C11" : "1px solid #eef0f4",
                boxShadow: remarksFocused ? "0 0 0 3px rgba(53,140,17,0.1)" : "none",
                transition: "background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease",
              }}
            >
              <input
                ref={remarksInputRef}
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                onFocus={() => setRemarksFocused(true)}
                onBlur={() => setRemarksFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    focusNextHistory();
                  }
                }}
                placeholder="Remarks"
                className={`flex-1 min-w-0 text-[#0F100F] outline-none bg-transparent ${
                  /[ঀ-৿]/.test(remarks)
                    ? "text-[15px] font-[Kalpurush]"
                    : "text-[15px] font-[DM_Sans]"
                }`}
                style={{ border: "none" }}
              />
            </div>
          </div>
          {historyItem.trim() !== "" ? (
            <X
              size={11}
              className="text-[#8c9198] hover:text-[#dc2626] transition-colors cursor-pointer shrink-0"
              onClick={onDelete}
            />
          ) : (
            // Reserve the same 11px width so the row's right edge lines up
            // with rows that show the delete X above.
            <div className="w-[11px] shrink-0" />
          )}
        </div>
      </div>

      {/* Panel only renders when matches exist — "no match" message removed. */}
      {open && pos && matches.length > 0 && createPortal(
        <div
          id="mh-typeahead-panel"
          className="rounded-[10px] bg-white py-[4px] font-[DM_Sans]"
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            width: pos.width,
            border: "1px solid #eef0f4",
            boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
            maxHeight: 240,
            overflowY: "auto",
            zIndex: 250,
          }}
        >
          {matches.map((m, i) => {
            const isHighlight = i === highlight;
            return (
              <button
                key={m}
                type="button"
                onMouseEnter={() => setHighlight(i)}
                onClick={() => pickItem(m)}
                className="w-full text-left px-[14px] py-[8px] cursor-pointer border-none"
                style={{
                  background: isHighlight ? "#358C11" : "transparent",
                  color: isHighlight ? "#ffffff" : "#0F100F",
                  transition: "background 0.1s ease",
                }}
              >
                <span className="text-[13px]" style={{ fontWeight: isHighlight ? 600 : 400 }}>{m}</span>
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Treatment V2 — schema-driven row that adapts to the picked medicine.
// Renders the medicine typeahead + a dynamic set of dose-related controls
// pulled from the medicine's `schema` declaration. See MEDICINE_LIBRARY_V2.
// ─────────────────────────────────────────────────────────────────────────

type TxRow = { id: string; initialMedicine?: V2MedicineItem };

function TreatmentAddRows({
  startingSerial,
  mode,
  demoSeeded = false,
  medications,
  onChangeMedication,
  onAddMedication,
  onDeleteMedication,
  onSeedMedications,
  drugs,
}: {
  startingSerial: number;
  mode: "dropdown" | "type";
  // Toggle from the parent: true → fill with all 18 V2 library medicines
  // (plus a trailing empty add-row); false → reset to one blank add-row.
  demoSeeded?: boolean;
  // Committed rows live on the draft (DR-026); the trailing blank stays local.
  medications: Medication[];
  onChangeMedication: (id: string, patch: Partial<MedicationData>) => void;
  onAddMedication: (data: MedicationData) => void;
  onDeleteMedication: (id: string) => void;
  onSeedMedications: (rows: MedicationData[]) => void;
  drugs: DrugItem[];
}) {
  // Only the trailing blank add-row is local. It is promoted into the draft
  // the moment a medicine is chosen, and a fresh blank takes its place.
  const [blank, setBlank] = useState<MedicationData>(blankMedication);
  const [blankKey, setBlankKey] = useState(() => `blank-${Date.now()}`);
  const medInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [dismissedDupes, setDismissedDupes] = useState<Record<string, true>>({});

  // React to the parent's toggle — seed all 18 when on, clear back to a
  // single empty row when off.
  const seededRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (seededRef.current === demoSeeded) return;
    seededRef.current = demoSeeded;
    if (demoSeeded) {
      onSeedMedications(
        drugs.map((d) => ({
          drugId: d.id,
          medicine: drugToDisplay(d),
          generic: d.genericName ?? "",
          form: (d.doses[0]?.doseForm?.toLowerCase() as V2MedicineForm | undefined),
          schema: d.schema,
          phases: [d.defaults ?? {}],
          typeText: composeTypeText(d.defaults ?? {}),
        })),
      );
    } else {
      onSeedMedications([]);
    }
    setBlank(blankMedication());
    setBlankKey(`blank-${Date.now()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoSeeded]);

  // First row carrying each medicine name — later rows with the same name are
  // flagged. Comparison is trimmed and case-insensitive.
  const firstSeen = new Map<string, string>();
  for (const m of medications) {
    const key = m.medicine.trim().toLowerCase();
    if (key && !firstSeen.has(key)) firstSeen.set(key, m.id);
  }

  const total = medications.length + 1;
  return (
    <>
      {medications.map((m, i) => {
        const key = m.medicine.trim().toLowerCase();
        const owner = key ? firstSeen.get(key) : undefined;
        const isDupe = false;
        return (
          <TreatmentInputRowV2
            key={m.id}
            serial={startingSerial + i}
            isLastRow={false}
            mode={mode}
            drugs={drugs}
            data={m}
            onChange={(patch) => onChangeMedication(m.id, patch)}
            duplicateOf={isDupe ? m.medicine : undefined}
            onDismissDuplicate={() => setDismissedDupes((p) => ({ ...p, [m.id]: true }))}
            onPicked={() => {}}
            registerMedRef={(el) => { medInputRefs.current[m.id] = el; }}
            focusNextMed={() => {
              const nextId = medications[i + 1]?.id ?? blankKey;
              medInputRefs.current[nextId]?.focus();
            }}
            onDelete={() => {
              onDeleteMedication(m.id);
              delete medInputRefs.current[m.id];
            }}
          />
        );
      })}
      <TreatmentInputRowV2
        key={blankKey}
        serial={startingSerial + medications.length}
        isLastRow={total === medications.length + 1}
        mode={mode}
        drugs={drugs}
        data={blank}
        onChange={(patch) => setBlank((prev) => ({ ...prev, ...patch }))}
        onPicked={(picked) => {
          // Promote the blank into the draft and put a fresh blank in its place.
          onAddMedication({ ...blank, ...picked });
          setBlank(blankMedication());
          setBlankKey(`blank-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
        }}
        registerMedRef={(el) => { medInputRefs.current[blankKey] = el; }}
        focusNextMed={() => {}}
        onDelete={() => {
          setBlank(blankMedication());
          setBlankKey(`blank-${Date.now()}`);
        }}
      />
    </>
  );
}

// Combined, editable medicine label for the single field:
// "Name (Generic)" e.g. "Tab. Napa 500 mg (Paracetamol)".
const v2MedDisplay = (m: { name: string; generic?: string }) =>
  m.generic && m.generic.trim() ? `${m.name} (${m.generic})` : m.name;

// A catalogue drug rendered the way the typeahead and rows show it. Strength
// comes from the first dose, matching how MEDICINE_LIBRARY_V2 named entries.
const drugDisplayName = (d: DrugItem) => {
  const strength = d.doses[0]?.strength;
  const form = d.doses[0]?.doseForm;
  const prefix = form ? `${form.slice(0, 3)}. ` : "";
  return `${prefix}${d.brandName}${strength ? ` ${strength}` : ""}`;
};
const drugToDisplay = (d: DrugItem) => v2MedDisplay({ name: drugDisplayName(d), generic: d.genericName });

function TreatmentInputRowV2({
  serial,
  isLastRow,
  onPicked,
  registerMedRef,
  focusNextMed,
  onDelete,
  mode,
  data,
  onChange,
  duplicateOf,
  onDismissDuplicate,
  drugs,
}: {
  serial: number;
  isLastRow: boolean;
  // Fires when a medicine is chosen — by picking from the typeahead or by
  // Enter on free text. Carries the fields the pick resolved so the owner can
  // promote a blank row into the draft in one write.
  onPicked: (picked: Partial<MedicationData>) => void;
  registerMedRef: (el: HTMLInputElement | null) => void;
  focusNextMed: () => void;
  onDelete: () => void;
  mode: "dropdown" | "type";
  // The six lifted data fields. UI state (open, highlight, focus, pos,
  // medColumnWidth) stays local to the row.
  data: MedicationData;
  onChange: (patch: Partial<MedicationData>) => void;
  // Set when an earlier row already carries this medicine.
  duplicateOf?: string;
  onDismissDuplicate?: () => void;
  drugs: DrugItem[];
}) {
  // Default schema shown for the empty "Add medication" row so the doctor
  // sees the dropdown placeholders even before picking a medicine. Replaced
  // by the picked medicine's specific schema once they make a selection.

  // The six data fields now live on the draft (or, for the trailing blank
  // add-row, on its owner's local scratch row). Dose phases: each entry is one
  // dose chain (dosage · frequency · timing · duration · note) sharing the
  // medicine's schema. Multiple phases model a tapering regimen — e.g. 2 tab
  // ×2/day for 7 days, then 1 tab ×2/day for 14 days. Single-phase rows render
  // identically to before. `typeText` is stored independently of the dropdown
  // values so toggling between modes preserves both sets.
  const { medicine, generic, form, schema, phases, typeText } = data;
  const setMedicine = (v: string) => onChange({ medicine: v });
  const setTypeText = (v: string) => onChange({ typeText: v });
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [medFocused, setMedFocused] = useState(false);
  const [doseFocused, setDoseFocused] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const medInputRef = useRef<HTMLInputElement>(null);
  const medColumnRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  // Responsive medicine column: 50% wider on ≥1920px displays (e.g. 1920×1080
  // and larger). Dropdown widths stay fixed (V2_COLUMN_WIDTHS), so the extra
  // space comes from the NOTE field shrinking.
  const [medColumnWidth, setMedColumnWidth] = useState<number>(275);
  useEffect(() => {
    const onResize = () => setMedColumnWidth(window.innerWidth >= 1920 ? 413 : 275);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const matches = drugs.filter((m) => {
    const q = medicine.trim().toLowerCase();
    if (!q) return true;
    return m.brandName.toLowerCase().includes(q) || (m.genericName ?? "").toLowerCase().includes(q);
  });

  useEffect(() => { setHighlight(0); }, [medicine]);

  useEffect(() => {
    if (!open) return;
    const update = () => {
      if (!medInputRef.current || !medColumnRef.current) return;
      const inputRect = medInputRef.current.getBoundingClientRect();
      const colRect = medColumnRef.current.getBoundingClientRect();
      setPos({ top: inputRect.bottom + 4, left: colRect.left, width: colRect.width });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  useEffect(() => {
    function handle(e: MouseEvent) {
      const t = e.target as Node;
      if (wrapperRef.current && !wrapperRef.current.contains(t)) {
        const panel = document.getElementById("tx-typeahead-panel-v2");
        if (panel && panel.contains(t)) return;
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const pickItem = (item: DrugItem) => {
    const picked: Partial<MedicationData> = {
      drugId: item.id,
      medicine: drugToDisplay(item),
      generic: item.genericName ?? "",
      form: (item.doses[0]?.doseForm?.toLowerCase() as V2MedicineForm | undefined),
      schema: item.schema,
      phases: [item.defaults ?? {}],
      typeText: composeTypeText(item.defaults ?? {}),
    };
    onChange(picked);
    setOpen(false);
    onPicked(picked);
  };

  const onMedicineKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp") && medicine.length > 0) {
      setOpen(true);
      e.preventDefault();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && matches[highlight]) pickItem(matches[highlight]);
      else if (medicine.trim()) {
        // Free-text fallback — keep the default schema so doctor can fill anything.
        const picked: Partial<MedicationData> = { schema: DEFAULT_EMPTY_SCHEMA };
        onChange(picked);
        setOpen(false);
        onPicked({ ...picked, medicine });
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const setField = (phaseIdx: number, key: V2FieldType, value: string) =>
    onChange({
      phases: phases.map((p, i) => (i === phaseIdx ? { ...p, [key]: value } : p)),
    });
  // New phase starts as a copy of the previous one — tapers usually keep the
  // same frequency/timing and only change the dose amount and duration.
  const addPhase = () => onChange({ phases: [...phases, { ...phases[phases.length - 1] }] });
  const removePhase = (phaseIdx: number) =>
    onChange({
      phases: phases.length > 1 ? phases.filter((_, i) => i !== phaseIdx) : phases,
    });
  const multi = phases.length > 1;

  return (
    <div
      ref={wrapperRef}
      className={`relative flex flex-col gap-[4px] px-[6px] bg-white ${
        mode === "type" ? "" : "py-[6px]"
      } ${isLastRow ? "rounded-b-[8px]" : "border-b border-[#e7ebf0]"}`}
      style={{ zIndex: medFocused || doseFocused ? 2 : undefined }}
    >
      <div className={`flex gap-[6px] ${mode === "type" ? "items-stretch min-h-[30px]" : "items-start"}`}>
        {/* LEFT CELL — serial badge + medicine input, grouped so the green
            focus border (matches the search box) wraps both when the medicine
            field is focused. */}
        <div
          className={`shrink-0 flex items-center gap-[6px] rounded-[6px] pr-[6px] ${
            mode === "type" ? "self-stretch" : multi ? "self-start mt-[3px]" : "self-center"
          }`}
          style={{
            boxShadow: medFocused ? "0 0 0 1px #358C11, 0 0 0 4px rgba(53,140,17,0.12)" : "none",
            transition: "box-shadow 0.15s ease",
          }}
        >
          <SerialBadge num={serial} muted={medicine.trim() === ""} />
          {/* Single editable medicine field — full label "Name (Generic)",
              e.g. "Tab. Napa 500 mg (Paracetamol)". */}
          <div
            ref={medColumnRef}
            className="flex flex-col justify-center"
            style={{ width: medColumnWidth, transition: "width 0.15s ease" }}
          >
            <div className="relative w-full min-w-0">
              <input
                ref={(el) => {
                  medInputRef.current = el;
                  registerMedRef(el);
                }}
                type="text"
                value={medicine}
                onChange={(e) => {
                  const v = e.target.value;
                  setMedicine(v);
                  setOpen(v.length > 0);
                }}
                onKeyDown={onMedicineKeyDown}
                onFocus={() => setMedFocused(true)}
                onBlur={() => setMedFocused(false)}
                className="w-full text-[15px] text-[#0F100F] outline-none bg-transparent font-[DM_Sans]"
                style={{ border: "none" }}
              />
              {medicine.trim() === "" && (
                <span className="absolute inset-y-0 left-0 flex items-center text-[15px] text-[#0F100F]/75 font-[DM_Sans] pointer-events-none whitespace-nowrap">
                  Add medication
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Divider between medicine and dose. Reserves 1px always (no layout
            shift); goes transparent while either cell is focused so the green
            focus box takes over cleanly. */}
        <div
          className="w-px self-stretch shrink-0"
          style={{
            background: medFocused || doseFocused ? "transparent" : "#e7ebf0",
            transition: "background 0.15s ease",
          }}
        />

        {/* Dose entry. In dropdown mode the schema's dropdown chain can be
            repeated as multiple dose PHASES (tapering) — e.g. 2 tab/7d then
            1 tab/14d — each phase carrying its own duration. A schema that is
            exactly "4 dropdowns + NOTE last" stays on a single line per phase
            (Note's flex-1 absorbs the slack); longer schemas wrap. Type mode
            keeps the single free-text Bengali field. */}
        {/* RIGHT CELL — dose content + row delete ✕ grouped so the green focus
            border wraps the ✕ too. */}
        <div
          className="flex-1 min-w-0 flex items-center gap-[6px] rounded-[6px] px-[8px]"
          style={{
            boxShadow: doseFocused ? "0 0 0 1px #358C11, 0 0 0 4px rgba(53,140,17,0.12)" : "none",
            transition: "box-shadow 0.15s ease",
          }}
        >
          <div className={`flex flex-col gap-[6px] flex-1 min-w-0 ${mode === "type" ? "justify-center" : ""}`}>
          {mode === "dropdown" ? (
            <>
              {phases.map((phaseVals, pIdx) => (
                <div
                  key={pIdx}
                  className={`flex items-center gap-[6px] min-w-0 ${
                    schema.length <= 5 && schema[schema.length - 1] === "NOTE" ? "flex-nowrap" : "flex-wrap gap-y-[6px]"
                  }`}
                >
                  {/* Leading connector slot — only on multi-phase rows so
                      single-phase rows keep the original column alignment. */}
                  {multi && (
                    <span className="w-[30px] shrink-0 text-[12px] text-[#8c9198] font-[DM_Sans]">
                      {pIdx > 0 ? "then" : ""}
                    </span>
                  )}
                  {schema.map((fieldType, idx) => (
                    <V2FieldControl
                      key={fieldType}
                      fieldType={fieldType}
                      form={form}
                      columnIndex={idx}
                      value={phaseVals[fieldType] ?? ""}
                      onChange={(v) => setField(pIdx, fieldType, v)}
                      onEnter={focusNextMed}
                    />
                  ))}
                  {multi && (
                    <div className="shrink-0 flex items-center justify-center" style={{ width: 14, height: 14 }}>
                      <Tooltip label="Remove phase">
                        <X
                          size={12}
                          strokeWidth={2}
                          className="text-[#8c9198] hover:text-[#dc2626] transition-colors cursor-pointer block"
                          onClick={() => removePhase(pIdx)}
                        />
                      </Tooltip>
                    </div>
                  )}
                </div>
              ))}
              {/* Add another dose phase — deliberately quiet; only tints green
                  on hover. Only shown once a medicine is chosen. */}
              {medicine.trim() !== "" && (
                <button
                  type="button"
                  onClick={addPhase}
                  className="np-add-phase self-start flex items-center gap-[4px] px-0 py-[1px] bg-transparent border-none cursor-pointer text-[11.5px] font-normal font-[DM_Sans] text-[#9ca3af]"
                >
                  <Plus size={11} />
                  Add phase
                </button>
              )}
            </>
          ) : (
            <input
              type="text"
              value={typeText}
              onChange={(e) => setTypeText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  focusNextMed();
                }
              }}
              onFocus={() => setDoseFocused(true)}
              onBlur={() => setDoseFocused(false)}
              placeholder="Dose and instruction"
              className={`flex-1 min-w-0 h-[26px] text-[15px] text-[#0F100F] outline-none bg-transparent ${
                /[ঀ-৿]/.test(typeText) ? "font-[Kalpurush]" : "font-[DM_Sans]"
              }`}
              style={{ border: "none" }}
            />
          )}
          </div>

          {medicine.trim() !== "" ? (
            // Row-end delete — inside the dose cell so the focus border wraps ✕.
            <div
              className={`shrink-0 flex items-center justify-center ${multi ? "self-start mt-[5px]" : "self-center"}`}
              style={{ width: 14, height: 14 }}
            >
              <Tooltip label="Remove">
                <X
                  size={13}
                  strokeWidth={2}
                  className="text-[#8c9198] hover:text-[#dc2626] transition-colors cursor-pointer block"
                  onClick={onDelete}
                />
              </Tooltip>
            </div>
          ) : (
            // Reserve the same footprint on the empty add-row so column edges
            // line up exactly with filled rows above.
            <div
              className="shrink-0 self-center"
              style={{ width: 14, height: 14 }}
            />
          )}
        </div>
      </div>

      {/* Panel only renders when matches exist — "no match" message removed. */}
      {open && pos && matches.length > 0 && createPortal(
        <div
          id="tx-typeahead-panel-v2"
          className="rounded-[10px] bg-white py-[4px] font-[DM_Sans]"
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            width: pos.width,
            border: "1px solid #eef0f4",
            boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
            maxHeight: 280,
            overflowY: "auto",
            zIndex: 250,
          }}
        >
          {matches.map((m, i) => {
            const isHighlight = i === highlight;
            return (
              <button
                key={m.id}
                type="button"
                onMouseEnter={() => setHighlight(i)}
                onClick={() => pickItem(m)}
                className="w-full text-left px-[14px] py-[8px] cursor-pointer border-none flex flex-col gap-[1px]"
                style={{
                  background: isHighlight ? "#358C11" : "transparent",
                  transition: "background 0.1s ease",
                }}
              >
                <span className="text-[15px] font-bold" style={{ color: isHighlight ? "#ffffff" : "#0F100F" }}>{drugDisplayName(m)}</span>
                <span className="text-[15px]" style={{ color: isHighlight ? "rgba(255,255,255,0.85)" : "#0F100F" }}>
                  {m.genericName ? `${m.genericName} · ` : ""}{m.schema.map((f) => V2_FIELD_LABELS[f]).join(" · ")}
                </span>
              </button>
            );
          })}
        </div>,
        document.body,
      )}
      {duplicateOf && (
        <div
          className="flex items-center gap-[6px] px-[6px] pb-[4px]"
          style={{ color: "#d97706" }}
        >
          <AlertCircle size={12} className="shrink-0" />
          <span className="text-[12px] flex-1 min-w-0 truncate">
            {duplicateOf} is already in this prescription.
          </span>
          <button
            type="button"
            onClick={onDismissDuplicate}
            className="text-[12px] underline cursor-pointer bg-transparent border-none p-0"
            style={{ color: "#d97706" }}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

// Renders the right input control for a given V2 field type. Uses
// IntakeDropdown for enumerated lists, plain inputs for free text/number.
// Column-positional dropdown widths. NOTE's column varies per medicine so
// it stays flex-1 (handled separately below).
const V2_COLUMN_WIDTHS: number[] = [80, 100, 100, 100];
const V2_DEFAULT_COL_WIDTH = 90;

// Note input — same flex-1 layout, with focus highlighting (green border +
// green ring) AND the always-visible Translate icon. Clicking the icon
// shows a fixed default sentence in the opposite language; clicking back
// into the input commits the translated text as the new editable value
// (same behaviour as the Advice "Add advice" field).
function V2NoteInput({
  value,
  onChange,
  onEnter,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onEnter: () => void;
  placeholder: string;
}) {
  const [focused, setFocused] = useState(false);
  const [showTranslated, setShowTranslated] = useState(false);

  const valueIsBn = /[ঀ-৿]/.test(value);
  const DEFAULT_EN = "This is translated";
  const DEFAULT_BN = "এটা ট্রান্সলেটেড হয়েছে";
  const translated = value.trim() && valueIsBn ? DEFAULT_EN : DEFAULT_BN;
  const showingTranslation = showTranslated;
  const displayValue = showingTranslation ? translated : value;
  const visibleHasBn = /[ঀ-৿]/.test(displayValue);

  return (
    <div
      className="flex items-center flex-1 min-w-[80px] h-[28px] px-[12px] rounded-[8px]"
      style={{
        background: focused ? "#ffffff" : "#ffffff",
        border: focused ? "1px solid #358C11" : "1px solid #eef0f4",
        boxShadow: focused ? "0 0 0 3px rgba(53,140,17,0.1)" : "none",
        transition: "background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease",
      }}
    >
      <input
        type="text"
        value={displayValue}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          setFocused(true);
          // If currently showing the translation overlay, commit it as the
          // new editable value so the doctor can keep typing from there.
          if (showingTranslation) {
            onChange(displayValue);
            setShowTranslated(false);
          }
        }}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
            onEnter();
          }
        }}
        placeholder={placeholder}
        // Bengali uses Kalpurush at 11px (2px smaller than DM_Sans 13px) so
        // every Bangla field in the Treatment row sits at the same size.
        className={`flex-1 min-w-0 text-[#0F100F] outline-none bg-transparent ${
          visibleHasBn ? "text-[15px] font-[Kalpurush]" : "text-[15px] font-[DM_Sans]"
        }`}
        style={{ border: "none" }}
      />
    </div>
  );
}

function V2FieldControl({
  fieldType,
  form,
  columnIndex,
  value,
  onChange,
  onEnter,
}: {
  fieldType: V2FieldType;
  form?: V2MedicineForm;
  columnIndex: number;
  value: string;
  onChange: (v: string) => void;
  onEnter: () => void;
}) {
  const placeholder = V2_FIELD_LABELS[fieldType];
  const baseInputClass = "h-[28px] px-[12px] rounded-[8px] text-[16px] text-[#0F100F] outline-none font-[DM_Sans]";
  const baseInputStyle: React.CSSProperties = { background: "#ffffff", border: "1px solid #eef0f4" };
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onEnter();
    }
  };

  if (fieldType === "NOTE") {
    return <V2NoteInput value={value} onChange={onChange} onEnter={onEnter} placeholder={placeholder} />;
  }

  // Per-column widths so all rows' column 1 line up, all column 2's line up,
  // etc. — regardless of which field the schema places in each position.
  // `editable` lets the doctor pick from the dropdown OR type a custom value.
  const options = getOptionsForField(fieldType, form);
  const width = V2_COLUMN_WIDTHS[columnIndex] ?? V2_DEFAULT_COL_WIDTH;
  return <IntakeDropdown editable value={value} width={width} placeholder={placeholder} onChange={onChange} options={options} />;
}

// ─────────────────────────────────────────────────────────────────────────
// OLD V1 TREATMENT ROW — KEPT FOR REFERENCE (commented out per design ask)
// ─────────────────────────────────────────────────────────────────────────
/*
function TreatmentAddRowsV1({ startingSerial }: { startingSerial: number }) {
  const [rowIds, setRowIds] = useState<string[]>(["med-0"]);
  const medInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  return (
    <>
      {rowIds.map((id, i) => (
        <TreatmentInputRow
          key={id}
          serial={startingSerial + i}
          isLastRow={i === rowIds.length - 1}
          onPicked={() => {
            if (i === rowIds.length - 1) {
              setRowIds((prev) => [...prev, `med-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`]);
            }
          }}
          registerMedRef={(el) => { medInputRefs.current[id] = el; }}
          focusNextMed={() => {
            const nextId = rowIds[i + 1];
            if (nextId) medInputRefs.current[nextId]?.focus();
          }}
          onDelete={() => {
            setRowIds((prev) => {
              const next = prev.filter((x) => x !== id);
              return next.length > 0 ? next : [`med-${Date.now()}`];
            });
            delete medInputRefs.current[id];
          }}
        />
      ))}
    </>
  );
}

function TreatmentInputRow({
  serial,
  isLastRow,
  onPicked,
  registerMedRef,
  focusNextMed,
  onDelete,
}: {
  serial: number;
  isLastRow: boolean;
  onPicked: () => void;
  registerMedRef: (el: HTMLInputElement | null) => void;
  focusNextMed: () => void;
  onDelete: () => void;
}) {
  const [medicine, setMedicine] = useState("");
  const [generic, setGeneric] = useState("");
  const [schedule, setSchedule] = useState("");
  const [whenVal, setWhenVal] = useState("");
  const [duration, setDuration] = useState("");
  const [indication, setIndication] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  // Translate toggle for the Indication field — when on, the input shows a
  // fixed default sentence in the opposite language (mirrors the Advice
  // free-text translate behaviour).
  const [showTranslatedIndication, setShowTranslatedIndication] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const medInputRef = useRef<HTMLInputElement>(null);
  const medColumnRef = useRef<HTMLDivElement>(null);
  const indicationInputRef = useRef<HTMLInputElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  // Responsive dropdown width: 120px on wide displays (≥1536px, e.g. 1920px),
  // 90px on smaller laptops (e.g. 1366px) so the row doesn't get cramped.
  const [doseDropdownWidth, setDoseDropdownWidth] = useState<number>(90);
  useEffect(() => {
    const onResize = () => setDoseDropdownWidth(window.innerWidth >= 1536 ? 120 : 90);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const matches = TREATMENT_LIBRARY.filter((m) => {
    const q = medicine.trim().toLowerCase();
    if (!q) return true;
    return m.name.toLowerCase().includes(q) || m.generic.toLowerCase().includes(q);
  });

  useEffect(() => { setHighlight(0); }, [medicine]);

  useEffect(() => {
    if (!open) return;
    const update = () => {
      // Anchor the dropdown's top to the input, but use the medicine column
      // wrapper's full width so the panel stays the same width even when the
      // input shrinks to its content (after a generic name fills in beside it).
      if (!medInputRef.current || !medColumnRef.current) return;
      const inputRect = medInputRef.current.getBoundingClientRect();
      const colRect = medColumnRef.current.getBoundingClientRect();
      setPos({ top: inputRect.bottom + 4, left: colRect.left, width: colRect.width });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  useEffect(() => {
    function handle(e: MouseEvent) {
      const t = e.target as Node;
      if (wrapperRef.current && !wrapperRef.current.contains(t)) {
        const panel = document.getElementById("tx-typeahead-panel");
        if (panel && panel.contains(t)) return;
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const pickItem = (item: TreatmentLibItem) => {
    setMedicine(item.name);
    setGeneric(item.generic);
    // Pre-fill the dose builder from the library defaults — doctor can tweak.
    setSchedule(item.schedule);
    setWhenVal(item.when);
    setDuration(item.duration);
    setIndication(item.indication);
    setOpen(false);
    // Focus the indication field next so the doctor can tweak it if needed,
    // and let the parent append another empty row below if this is the last.
    setTimeout(() => indicationInputRef.current?.focus(), 0);
    onPicked();
  };

  const onMedicineKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp") && medicine.length > 0) {
      setOpen(true);
      e.preventDefault();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && matches[highlight]) {
        pickItem(matches[highlight]);
      } else if (medicine.trim()) {
        // Free-text fallback — let user fill in the dose dropdowns themselves.
        setOpen(false);
        setTimeout(() => indicationInputRef.current?.focus(), 0);
        onPicked();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div
      ref={wrapperRef}
      className={`relative flex flex-col gap-[4px] px-[12px] py-[6px] bg-white ${
        isLastRow ? "rounded-b-[8px]" : "border-b border-[#e7ebf0]"
      }`}
    >
      <div className="flex items-center gap-[12px]">
        <SerialBadge num={serial} muted />

        <div className="flex items-center gap-[8px] flex-1 min-w-0">
          <div ref={medColumnRef} className="flex-1 min-w-[240px] border-r border-[#e7ebf0] pr-[12px] mr-[4px]">
            <div className="flex items-baseline gap-[8px] min-w-0">
              <div className="relative shrink-0 min-w-0">
                <input
                  ref={(el) => {
                    medInputRef.current = el;
                    registerMedRef(el);
                  }}
                  type="text"
                  value={medicine}
                  onChange={(e) => {
                    const v = e.target.value;
                    setMedicine(v);
                    // User is changing the medicine — drop the previously linked generic
                    if (generic) setGeneric("");
                    setOpen(v.length > 0);
                  }}
                  onKeyDown={onMedicineKeyDown}
                  className="text-[14px] text-[#0F100F] outline-none bg-transparent font-[DM_Sans]"
                  style={{
                    border: "none",
                    width: generic ? undefined : "100%",
                    fieldSizing: generic ? "content" : undefined,
                    minWidth: generic ? "0" : undefined,
                  } as React.CSSProperties}
                />
                {medicine.trim() === "" && (
                  <span className="absolute inset-y-0 left-0 flex items-center text-[14px] text-[#8c9198] font-[DM_Sans] pointer-events-none whitespace-nowrap">
                    Add medication
                  </span>
                )}
              </div>
              {generic && (
                <span className="text-[13px] text-[#9ca3af] flex-1 min-w-0 truncate font-[DM_Sans]">
                  ({generic})
                </span>
              )}
            </div>
          </div>

          <IntakeDropdown
            value={schedule}
            width={doseDropdownWidth}
            placeholder="Schedule"
            onChange={(v) => setSchedule(v)}
            options={SCHEDULE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          />
          <IntakeDropdown
            value={whenVal}
            width={doseDropdownWidth}
            placeholder="When"
            onChange={(v) => setWhenVal(v)}
            options={WHEN_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          />
          <IntakeDropdown
            value={duration}
            width={doseDropdownWidth}
            placeholder="Duration"
            onChange={(v) => setDuration(v)}
            options={DURATION_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          />
          {(() => {
            const hasText = indication.trim() !== "";
            const indicationIsBn = /[ঀ-৿]/.test(indication);
            const DEFAULT_EN = "This is translated";
            const DEFAULT_BN = "এটা ট্রান্সলেটেড হয়েছে";
            // When there's no text, default the "translation direction" to
            // showing Bengali (the prescription's primary script).
            const translated = hasText && !indicationIsBn ? DEFAULT_BN
              : hasText && indicationIsBn ? DEFAULT_EN
              : DEFAULT_BN;
            const showingTranslation = showTranslatedIndication;
            // Font follows the visible content — if what's being shown
            // contains Bengali characters, use Kalpurush; otherwise DM Sans.
            // This avoids the font flipping when toggling translate.
            const visibleText = showingTranslation ? translated : indication;
            const showBnFont = /[ঀ-৿]/.test(visibleText);
            return (
              <div className="relative flex-1 min-w-0">
                <input
                  ref={indicationInputRef}
                  type="text"
                  value={showingTranslation ? translated : indication}
                  onFocus={() => {
                    // Clicking into the input means the doctor wants to edit
                    // the (currently translated) text — commit it as the
                    // working value and drop the translation overlay so the
                    // field is editable from there.
                    if (showingTranslation) {
                      setIndication(translated);
                      setShowTranslatedIndication(false);
                    }
                  }}
                  onChange={(e) => setIndication(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      focusNextMed();
                    }
                  }}
                  placeholder="Indication"
                  className={`w-full h-[28px] pl-[12px] pr-[30px] rounded-[8px] text-[14px] text-[#0F100F] outline-none ${
                    showBnFont ? "font-[Kalpurush]" : "font-[DM_Sans]"
                  }`}
                  style={{ background: "#ffffff", border: "1px solid #eef0f4" }}
                />
              </div>
            );
          })()}
        </div>

        <Tooltip label="Remove">
          <X
            size={11}
            className="text-[#8c9198] cursor-pointer shrink-0 self-center"
            onClick={onDelete}
          />
        </Tooltip>
      </div>


      {open && pos && matches.length > 0 && createPortal(
        <div
          id="tx-typeahead-panel"
          className="rounded-[10px] bg-white py-[4px] font-[DM_Sans]"
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            width: pos.width,
            border: "1px solid #eef0f4",
            boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
            maxHeight: 260,
            overflowY: "auto",
            zIndex: 250,
          }}
        >
          {matches.map((m, i) => {
            const isHighlight = i === highlight;
            return (
              <button
                key={m.name}
                type="button"
                onMouseEnter={() => setHighlight(i)}
                onClick={() => pickItem(m)}
                className="w-full text-left px-[14px] py-[8px] cursor-pointer border-none flex flex-col gap-[1px]"
                style={{
                  background: isHighlight ? "#eaf5e3" : "transparent",
                  transition: "background 0.1s ease",
                }}
              >
                <span className="text-[14px]" style={{ color: isHighlight ? "#256b06" : "#0F100F", fontWeight: isHighlight ? 600 : 500 }}>{m.name}</span>
                <span className="text-[12px]" style={{ color: isHighlight ? "#3fa216" : "#8c9198" }}>{m.generic}</span>
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </div>
  );
}
*/
// ─────────────────────────────────────────────────────────────────────────
// END OLD V1 TREATMENT ROW
// ─────────────────────────────────────────────────────────────────────────

function SerialBadge({ num, muted = false }: { num: number; muted?: boolean }) {
  return (
    <div
      className={`flex items-center justify-center w-[22px] h-[20px] rounded-[5px] text-[11px] font-bold shrink-0 ${
        muted
          ? "bg-[#eef0f4] text-[#8c9198]"
          : "bg-[#eaf5e3] text-[#358C11]"
      }`}
    >
      {num}
    </div>
  );
}

function TemplateActions() {
  return (
    <>
      <BookmarkPlus size={14} className="text-[#064232] cursor-pointer" />
      <FileDown size={14} className="text-[#064232] cursor-pointer" />
    </>
  );
}

// ── Intake Dropdown — mirrors landing-page-dev-v1's FilterDropdown style ──
// Used inside AssistantQuestionsModal where the body scrolls, so the panel
// renders into document.body via portal to avoid clipping.
function IntakeDropdown({
  value,
  options,
  onChange,
  width,
  placeholder = "—",
  editable = false,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (val: string) => void;
  width: number;
  placeholder?: string;
  // When true, the trigger becomes a typeable input — doctor can pick from
  // the dropdown OR type any custom value. Default false keeps the strict
  // button-only behaviour for places like Yes/No questions.
  editable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const selected = options.find((o) => o.value === value);

  // Editable mode: when the value doesn't exactly match a known option, show
  // the options filtered by substring match. When it does match, show all
  // (so the user can browse for an alternative).
  const filteredOptions = editable && value && !selected
    ? options.filter((o) =>
        o.label.toLowerCase().includes(value.toLowerCase()) ||
        o.value.toLowerCase().includes(value.toLowerCase())
      )
    : options;

  useEffect(() => {
    if (!open) return;
    const update = () => {
      const anchor = editable ? inputRef.current?.parentElement : btnRef.current;
      if (!anchor) return;
      const r = anchor.getBoundingClientRect();
      setPos({ top: r.bottom + 6, left: r.left, width: r.width });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, editable]);

  useEffect(() => {
    function handle(e: MouseEvent) {
      const t = e.target as Node;
      if (wrapperRef.current && !wrapperRef.current.contains(t)) {
        const panel = document.getElementById("intake-dropdown-panel");
        if (panel && panel.contains(t)) return;
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative" style={{ width }}>
      {editable ? (
        <div
          className="flex items-center w-full px-[6px] rounded-[8px]"
          style={{
            background: open ? "#fff" : "#ffffff",
            border: open ? "1px solid #358C11" : "1px solid #eef0f4",
            boxShadow: open ? "0 0 0 3px rgba(53,140,17,0.1)" : "none",
            transition: "all 0.15s ease",
            height: 28,
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={value}
            placeholder={placeholder}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              onChange(e.target.value);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                // Value is already captured live via onChange; just commit
                // the field by closing the panel and dropping focus.
                e.preventDefault();
                setOpen(false);
                (e.target as HTMLInputElement).blur();
              } else if (e.key === "Escape") {
                setOpen(false);
                (e.target as HTMLInputElement).blur();
              } else if (e.key === "ArrowDown" && !open) {
                setOpen(true);
              }
            }}
            // Bengali content uses Kalpurush at 11px (2px smaller than DM_Sans
            // 13px) — keeps the row visually compact while staying readable.
            className={`flex-1 min-w-0 text-[#0F100F] outline-none bg-transparent ${
              /[ঀ-৿]/.test(value)
                ? "text-[15px] font-[Kalpurush]"
                : "text-[15px] font-[DM_Sans]"
            }`}
            style={{ border: "none" }}
          />
          <ChevronDown
            size={14}
            onClick={() => {
              // Close: blur the input so onFocus doesn't immediately reopen.
              // Open: focus the input for typing.
              if (open) {
                setOpen(false);
                inputRef.current?.blur();
              } else {
                setOpen(true);
                inputRef.current?.focus();
              }
            }}
            style={{
              color: "#5a6070",
              opacity: 0.5,
              transition: "transform 0.2s ease",
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              flexShrink: 0,
              marginLeft: 4,
              cursor: "pointer",
            }}
          />
        </div>
      ) : (
        <button
          ref={btnRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center justify-between w-full px-[6px] py-[5px] rounded-[8px] text-[16px] font-medium cursor-pointer"
          style={{
            background: open ? "#fff" : "#ffffff",
            border: open ? "1px solid #358C11" : "1px solid #eef0f4",
            color: "#5a6070",
            boxShadow: open ? "0 0 0 3px rgba(53,140,17,0.1)" : "none",
            transition: "all 0.15s ease",
            minHeight: 28,
            height: 28,
          }}
        >
          <span
            className="text-[16px] truncate"
            style={{
              color: selected ? "#0F100F" : "#8c9198",
              fontWeight: 400,
            }}
          >
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown
            size={14}
            style={{
              color: "#5a6070",
              opacity: 0.5,
              transition: "transform 0.2s ease",
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              flexShrink: 0,
              marginLeft: 4,
            }}
          />
        </button>
      )}

      {/* Panel only renders when at least one option matches. Editable mode
          with no substring match hides the panel entirely — the user keeps
          typing freely; the input field itself reflects the custom value. */}
      {open && pos && filteredOptions.length > 0 && createPortal(
        <div
          id="intake-dropdown-panel"
          className="rounded-[12px] bg-white py-[6px]"
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            // Panel hugs the trigger as its floor, then grows to fit the
            // widest option on a single line. Capped so very long phrases
            // don't run off-screen.
            minWidth: pos.width,
            width: "max-content",
            maxWidth: 420,
            border: "1px solid #eef0f4",
            boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
            maxHeight: 260,
            overflowY: "auto",
            zIndex: 260,
          }}
        >
          {filteredOptions.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value || "__empty"}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className="flex items-center w-full px-[14px] py-[8px] text-left cursor-pointer"
                  style={{
                    background: isSelected ? "#f0f7ed" : "transparent",
                    border: "none",
                    transition: "background 0.12s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = "#fafbfc";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span
                    className={
                      /[ঀ-৿]/.test(opt.label)
                        ? "text-[14px] font-[Kalpurush] whitespace-nowrap"
                        : "text-[14px] whitespace-nowrap"
                    }
                    style={{
                      color: isSelected ? "#358C11" : "#0F100F",
                      fontWeight: isSelected ? 600 : 400,
                    }}
                  >
                    {opt.label}
                  </span>
                </button>
              );
            })}
        </div>,
        document.body,
      )}
    </div>
  );
}

// ── Assistant Questions Modal ──────────────────────────────
// A pre-made question set the doctor's assistant fills in to capture the
// patient's intake. Submitting the form composes a readable summary string
// from the answers and pushes it into the Chief Complaints "Summary"
// textarea, where the doctor can still edit freely.
type AnswerYesNo = "" | "Yes" | "No";
type AnswerNormal = "" | "Normal" | "Abnormal";
type AssistantAnswer = { yn: AnswerYesNo; nm: AnswerNormal; note: string };

// Combined Patient Intake modal — both the doctor (curating questions) and
// the assistant (filling in answers) work here. Each row has an editable
// question text, two dropdowns, a note field, and a delete button. A footer
// "+ add question" row appends new questions. Submit composes a summary
// from non-empty answers and pushes it back to the parent.
function AssistantQuestionsModal({
  onClose,
  onSubmit,
  questions,
  setQuestions,
}: {
  onClose: () => void;
  onSubmit: (summary: string) => void;
  questions: IntakeQuestion[];
  setQuestions: (next: IntakeQuestion[]) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, AssistantAnswer>>(() => {
    const init: Record<string, AssistantAnswer> = {};
    questions.forEach((q) => { init[q.id] = { yn: "", nm: "", note: "" }; });
    return init;
  });
  const [draft, setDraft] = useState("");

  const updateAnswer = (id: string, patch: Partial<AssistantAnswer>) =>
    setAnswers((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const updateQuestionText = (id: string, text: string) =>
    setQuestions(questions.map((q) => (q.id === id ? { ...q, text } : q)));

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const addDraft = () => {
    const text = draft.trim();
    if (!text) return;
    const id = `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setQuestions([...questions, { id, text }]);
    setAnswers((prev) => ({ ...prev, [id]: { yn: "", nm: "", note: "" } }));
    setDraft("");
  };

  const buildSummary = () => {
    const items: string[] = [];
    questions.forEach((q, i) => {
      const a = answers[q.id];
      if (!a) return;
      const parts: string[] = [];
      if (a.yn) parts.push(a.yn);
      if (a.nm) parts.push(a.nm);
      if (a.note.trim()) parts.push(a.note.trim());
      if (parts.length === 0) return;
      items.push(`${i + 1}. ${q.text} ${parts.join(", ")}`);
    });
    return items.join(" | ");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center font-[DM_Sans]" style={{ background: "rgba(0,0,0,0.45)" }}>
      <div className="w-[960px] h-[640px] bg-white rounded-[12px] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-[20px] py-[10px] shrink-0" style={{ background: "#358C11" }}>
          <span className="text-[15px] font-semibold text-white">Patient Intake — Question Set</span>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-[28px] h-[28px] rounded-[6px] text-white cursor-pointer"
            style={{ background: "rgba(255,255,255,0.15)", border: "none" }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Body — column header lives inside the scroll container so its width
            tracks the rows' width regardless of scrollbar presence. */}
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
          {/* Sub-header / column labels — sticky so they stay visible as rows
              scroll. Hidden when there are no questions yet (nothing to label). */}
          {questions.length > 0 && (
            <div
              className="sticky top-0 z-10 flex items-center gap-[12px] px-[20px] py-[8px] text-[12px] font-medium text-[#5a6070] uppercase tracking-[0.04em]"
              style={{ background: "#ffffff", borderBottom: "1px solid #e7ebf0" }}
            >
              <div className="flex-1 text-left">Question</div>
              <div className="w-[110px] text-left">Yes / No</div>
              <div className="w-[140px] text-left">Normal / Abnormal</div>
              <div className="w-[230px] text-left">Note</div>
              <div className="w-[28px]"></div>
            </div>
          )}

          <div className="px-[20px] flex flex-col">
          {questions.length === 0 && (
            <div className="text-[13px] text-[#8c9198] italic py-[20px] text-center">
              No questions yet — add the first one below.
            </div>
          )}
          {questions.map((q, i) => {
            const a = answers[q.id] ?? { yn: "" as AnswerYesNo, nm: "" as AnswerNormal, note: "" };
            return (
              <div key={q.id} className="flex items-center gap-[12px] py-[8px]" style={{ borderBottom: "1px solid #f0f2f5" }}>
                <div className="flex-1 min-w-0 flex items-center gap-[8px]">
                  <span className="text-[13px] text-[#8c9198] w-[18px] shrink-0 text-right">{i + 1}.</span>
                  <input
                    type="text"
                    value={q.text}
                    onChange={(e) => updateQuestionText(q.id, e.target.value)}
                    className="flex-1 min-w-0 h-[28px] px-[10px] rounded-[8px] text-[14px] text-[#0F100F] outline-none font-[DM_Sans]"
                    style={{ background: "transparent", border: "1px solid transparent" }}
                    onFocus={(e) => {
                      e.currentTarget.style.background = "#ffffff";
                      e.currentTarget.style.borderColor = "#eef0f4";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.borderColor = "transparent";
                    }}
                  />
                </div>
                <IntakeDropdown
                  value={a.yn}
                  width={110}
                  onChange={(v) => updateAnswer(q.id, { yn: v as AnswerYesNo })}
                  options={[
                    { value: "", label: "—" },
                    { value: "Yes", label: "Yes" },
                    { value: "No", label: "No" },
                  ]}
                />
                <IntakeDropdown
                  value={a.nm}
                  width={140}
                  onChange={(v) => updateAnswer(q.id, { nm: v as AnswerNormal })}
                  options={[
                    { value: "", label: "—" },
                    { value: "Normal", label: "Normal" },
                    { value: "Abnormal", label: "Abnormal" },
                  ]}
                />
                <input
                  type="text"
                  value={a.note}
                  onChange={(e) => updateAnswer(q.id, { note: e.target.value })}
                  placeholder="Optional note"
                  className="w-[230px] h-[28px] px-[12px] rounded-[8px] text-[14px] text-[#0F100F] outline-none font-[DM_Sans]"
                  style={{ background: "#ffffff", border: "1px solid #eef0f4" }}
                />
                <Tooltip label="Remove question">
                  <button
                    type="button"
                    onClick={() => removeQuestion(q.id)}
                    className="flex items-center justify-center w-[28px] h-[28px] rounded-[6px] cursor-pointer shrink-0"
                    style={{ background: "transparent", border: "1px solid #eef0f4" }}
                  >
                    <Trash2 size={13} className="text-[#8c9198]" />
                  </button>
                </Tooltip>
              </div>
            );
          })}

          {/* Add-question row — same column structure as a question row, but
              only the question input is interactive; the answer columns are
              greyed out until the question is committed. */}
          <div className="flex items-center gap-[12px] py-[10px] mt-[6px]" style={{ borderTop: "1px dashed #e7ebf0" }}>
            <div className="flex-1 min-w-0 flex items-center gap-[8px]">
              <span className="text-[13px] text-[#358C11] w-[18px] shrink-0 text-right">{questions.length + 1}.</span>
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addDraft();
                  }
                }}
                placeholder="Type a new question and press Enter"
                className="flex-1 min-w-0 h-[28px] px-[10px] rounded-[8px] text-[14px] text-[#0F100F] outline-none font-[DM_Sans]"
                style={{ background: "#fff", border: "1px solid #cfd5e0" }}
              />
            </div>
            <button
              onClick={addDraft}
              type="button"
              disabled={!draft.trim()}
              className="h-[28px] px-[14px] rounded-[8px] text-[14px] font-semibold text-white shrink-0"
              style={{
                background: draft.trim() ? "#358C11" : "#bcd9b1",
                border: "none",
                cursor: draft.trim() ? "pointer" : "not-allowed",
              }}
            >
              Add
            </button>
          </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-[10px] px-[20px] py-[12px] shrink-0" style={{ background: "#ffffff", borderTop: "1px solid #e7ebf0" }}>
          <button
            onClick={onClose}
            type="button"
            className="h-[34px] px-[16px] rounded-[6px] text-[14px] font-medium text-[#0F100F] cursor-pointer"
            style={{ background: "white", border: "1px solid #cfd5e0" }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSubmit(buildSummary());
              onClose();
            }}
            type="button"
            className="h-[34px] px-[18px] rounded-[6px] text-[14px] font-semibold text-white cursor-pointer"
            style={{ background: "#358C11", border: "none" }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Intake v2 — Question-Set Modal ─────────────────────────
// Mirrors the Manage Advice modal shell: a left panel listing all
// question sets, a right panel that shows the selected set's questions
// with answer fields (same UI as Intake v1), and an "+ Add new question
// set" action that opens an inline editor with Title* and a multi-question
// composer.
function IntakeV2Modal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (summary: string) => void;
}) {
  const [sets, setSets] = useState<IntakeQuestionSet[]>(MOCK_INTAKE_SETS);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(sets[0]?.id ?? null);
  const [mode, setMode] = useState<"view" | "edit" | "add">("view");
  // Answers are scoped per-set so flipping between sets keeps each answer
  // sheet intact while the modal stays open.
  const [answersBySet, setAnswersBySet] = useState<
    Record<string, Record<string, AssistantAnswer>>
  >({});

  // Form state for add / edit modes
  const [formTitle, setFormTitle] = useState("");
  const [formQuestions, setFormQuestions] = useState<IntakeQuestion[]>([]);
  const [draftQuestion, setDraftQuestion] = useState("");

  const filteredSets = sets.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.title.toLowerCase().includes(q);
  });
  const selected = selectedId ? sets.find((s) => s.id === selectedId) ?? null : null;

  const ensureAnswers = (setId: string, questions: IntakeQuestion[]) => {
    if (answersBySet[setId]) return answersBySet[setId];
    const seed: Record<string, AssistantAnswer> = {};
    questions.forEach((q) => { seed[q.id] = { yn: "", nm: "", note: "" }; });
    setAnswersBySet((prev) => ({ ...prev, [setId]: seed }));
    return seed;
  };

  const updateAnswer = (
    setId: string,
    qid: string,
    patch: Partial<AssistantAnswer>,
  ) =>
    setAnswersBySet((prev) => {
      const current = prev[setId] ?? {};
      return {
        ...prev,
        [setId]: {
          ...current,
          [qid]: { ...(current[qid] ?? { yn: "", nm: "", note: "" }), ...patch },
        },
      };
    });

  const startAdd = () => {
    setMode("add");
    setSelectedId(null);
    setFormTitle("");
    setFormQuestions([]);
    setDraftQuestion("");
  };
  const cancelForm = () => {
    setMode("view");
    setFormTitle("");
    setFormQuestions([]);
    setDraftQuestion("");
  };
  const addDraftQuestion = () => {
    const t = draftQuestion.trim();
    if (!t) return;
    setFormQuestions((p) => [
      ...p,
      { id: `nq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, text: t },
    ]);
    setDraftQuestion("");
  };
  const removeDraftQuestion = (id: string) =>
    setFormQuestions((p) => p.filter((q) => q.id !== id));
  const updateDraftQuestionText = (id: string, text: string) =>
    setFormQuestions((p) => p.map((q) => (q.id === id ? { ...q, text } : q)));

  const saveNewSet = () => {
    const title = formTitle.trim();
    if (!title || formQuestions.length === 0) return;
    const newId = `set-${Date.now()}`;
    const newSet: IntakeQuestionSet = {
      id: newId, title, isMine: true, questions: formQuestions,
    };
    setSets((p) => [...p, newSet]);
    setSelectedId(newId);
    ensureAnswers(newId, newSet.questions);
    setMode("view");
  };
  const addValid = formTitle.trim() !== "" && formQuestions.length > 0;

  const buildSummary = () => {
    if (!selected) return "";
    const answers = answersBySet[selected.id] ?? {};
    const items: string[] = [];
    selected.questions.forEach((q, i) => {
      const a = answers[q.id];
      if (!a) return;
      const parts: string[] = [];
      if (a.yn) parts.push(a.yn);
      if (a.nm) parts.push(a.nm);
      if (a.note.trim()) parts.push(a.note.trim());
      if (parts.length === 0) return;
      items.push(`${i + 1}. ${q.text} ${parts.join(", ")}`);
    });
    return items.join(" | ");
  };

  const scrollbarCss = `
    .iv2-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
    .iv2-scroll::-webkit-scrollbar-track { background: transparent; }
    .iv2-scroll::-webkit-scrollbar-thumb { background: rgba(140,145,152,0.25); border-radius: 999px; }
    .iv2-scroll::-webkit-scrollbar-thumb:hover { background: rgba(140,145,152,0.45); }
    .iv2-scroll { scrollbar-width: thin; scrollbar-color: rgba(140,145,152,0.25) transparent; }
    .iv2-add-btn { transition: background 0.15s ease; }
    .iv2-add-btn:hover:not(:disabled) { background: #2a7a0d !important; }
    .iv2-add-btn:disabled { cursor: not-allowed; opacity: 0.6; }
    .iv2-input { transition: border-color 0.15s ease, box-shadow 0.15s ease; }
    .iv2-input:focus { border-color: #358C11 !important; box-shadow: 0 0 0 3px rgba(53,140,17,0.12) !important; }
    .iv2-list-item { transition: background 0.12s ease; }
    .iv2-list-item:hover:not(.iv2-selected) { background: #eaf5e3 !important; }
  `;

  const inputFieldStyle: React.CSSProperties = {
    background: "#ffffff",
    border: "1px solid #e3e6eb",
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 14,
    color: "#0F100F",
    outline: "none",
    width: "100%",
  };

  // Memoise answers for the active set so React re-renders cleanly.
  const activeAnswers = selected ? (answersBySet[selected.id] ?? {}) : {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center font-[DM_Sans]" style={{ background: "rgba(0,0,0,0.45)" }}>
      <style dangerouslySetInnerHTML={{ __html: scrollbarCss }} />
      <div className="w-[1000px] bg-white rounded-[12px] flex flex-col overflow-hidden shadow-2xl relative" style={{ height: 640 }}>
        {/* Header */}
        <div className="flex items-center justify-between px-[20px] py-[10px] shrink-0" style={{ background: "#358C11" }}>
          <span className="text-[15px] font-semibold text-white">Patient Intake — Question Sets</span>
          <button onClick={onClose} className="flex items-center justify-center w-[28px] h-[28px] rounded-[6px] text-white border-none cursor-pointer" style={{ background: "rgba(255,255,255,0.15)" }}>
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0">

          {/* ─── Left panel ─── */}
          <div className="flex flex-col shrink-0" style={{ width: 320, borderRight: "1px solid #eef0f4", background: "#F7F8FA" }}>

            {/* Search */}
            <div className="p-[14px] shrink-0" style={{ borderBottom: "1px solid #eef0f4" }}>
              <div className="relative">
                <Search size={14} className="absolute left-[10px] top-1/2 -translate-y-1/2 text-[#8c9198] pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search question sets…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="iv2-input w-full text-[14px] text-[#0F100F] outline-none font-[DM_Sans]"
                  style={{
                    height: 34,
                    paddingLeft: 30,
                    paddingRight: search ? 30 : 10,
                    background: "#ffffff",
                    border: "1px solid #e3e6eb",
                    borderRadius: 6,
                  }}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                    className="absolute right-[6px] top-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer border-none"
                    style={{ width: 20, height: 20, borderRadius: 999, background: "#eef0f4", color: "#5a6070" }}
                  >
                    <X size={11} strokeWidth={2.5} />
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto iv2-scroll">
              {filteredSets.length === 0 ? (
                <div className="px-[14px] py-[40px] text-center text-[13px] text-[#8c9198]">
                  No question sets found
                </div>
              ) : (
                filteredSets.map((s) => {
                  const isSelected = s.id === selectedId && mode !== "add";
                  return (
                    <button
                      key={s.id}
                      onClick={() => { setSelectedId(s.id); setMode("view"); ensureAnswers(s.id, s.questions); }}
                      className={`iv2-list-item w-full text-left px-[14px] py-[10px] cursor-pointer border-none bg-transparent ${isSelected ? "iv2-selected" : ""}`}
                      style={{
                        background: isSelected ? "#eaf5e3" : "transparent",
                        borderBottom: "1px solid #eef0f4",
                        borderLeft: isSelected ? "3px solid #358C11" : "3px solid transparent",
                      }}
                    >
                      <div className="flex items-start gap-[6px]">
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold text-[#0F100F] leading-[1.4] truncate" title={s.title}>
                            {s.title}
                          </p>
                          <p className="text-[12px] text-[#8c9198] leading-[1.4] truncate mt-[2px]">
                            {s.questions.length} question{s.questions.length === 1 ? "" : "s"}
                          </p>
                        </div>
                        {s.isMine && (
                          <span className="text-[10px] font-bold uppercase px-[5px] rounded-[3px] shrink-0 mt-[2px]" style={{ background: "#358C11", color: "#ffffff", paddingTop: 2, paddingBottom: 1 }}>
                            Own
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Add new */}
            <div className="p-[12px] shrink-0" style={{ borderTop: "1px solid #eef0f4", background: "#ffffff" }}>
              <button
                onClick={startAdd}
                disabled={mode === "add"}
                className="iv2-add-btn w-full flex items-center justify-center gap-[6px] rounded-[8px] text-[14px] font-semibold cursor-pointer border-none font-[DM_Sans]"
                style={{ height: 40, background: "#358C11", color: "#ffffff" }}
              >
                <Plus size={14} strokeWidth={2.5} />
                Add New Question Set
              </button>
            </div>
          </div>

          {/* ─── Right panel ─── */}
          <div className="flex-1 flex flex-col min-w-0">

            {mode === "view" && selected && (
              <>
                <div
                  className="flex items-center justify-between px-[22px] py-[14px] shrink-0"
                  style={{ borderBottom: "1px solid #eef0f4" }}
                >
                  <div className="flex items-center gap-[8px] min-w-0 flex-1">
                    <span className="text-[16px] font-bold text-[#0F100F] truncate" title={selected.title}>
                      {selected.title}
                    </span>
                    <span className="text-[12px] text-[#8c9198] shrink-0">
                      · {selected.questions.length} question{selected.questions.length === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto iv2-scroll flex flex-col">
                  {/* Column header — sticky */}
                  {selected.questions.length > 0 && (
                    <div
                      className="sticky top-0 z-10 flex items-center gap-[12px] px-[22px] py-[8px] text-[12px] font-medium text-[#5a6070] uppercase tracking-[0.04em]"
                      style={{ background: "#ffffff", borderBottom: "1px solid #e7ebf0" }}
                    >
                      <div className="flex-1 text-left">Question</div>
                      <div className="w-[90px] text-left">Yes / No</div>
                      <div className="w-[130px] text-left">Normal / Abnormal</div>
                      <div className="w-[180px] text-left">Note</div>
                    </div>
                  )}

                  <div className="px-[22px] py-[8px] flex flex-col">
                    {selected.questions.map((q, i) => {
                      const a = activeAnswers[q.id] ?? { yn: "" as AnswerYesNo, nm: "" as AnswerNormal, note: "" };
                      return (
                        <div key={q.id} className="flex items-center gap-[12px] py-[8px]" style={{ borderBottom: "1px solid #f0f2f5" }}>
                          <div className="flex-1 min-w-0 flex items-center gap-[8px]">
                            <span className="text-[13px] text-[#8c9198] w-[18px] shrink-0 text-right">{i + 1}.</span>
                            <span className="text-[14px] text-[#0F100F] leading-[1.45]">
                              {q.text}
                            </span>
                          </div>
                          <IntakeDropdown
                            value={a.yn}
                            width={90}
                            onChange={(v) => updateAnswer(selected.id, q.id, { yn: v as AnswerYesNo })}
                            options={[
                              { value: "", label: "—" },
                              { value: "Yes", label: "Yes" },
                              { value: "No", label: "No" },
                            ]}
                          />
                          <IntakeDropdown
                            value={a.nm}
                            width={130}
                            onChange={(v) => updateAnswer(selected.id, q.id, { nm: v as AnswerNormal })}
                            options={[
                              { value: "", label: "—" },
                              { value: "Normal", label: "Normal" },
                              { value: "Abnormal", label: "Abnormal" },
                            ]}
                          />
                          <input
                            type="text"
                            value={a.note}
                            onChange={(e) => updateAnswer(selected.id, q.id, { note: e.target.value })}
                            placeholder="Optional note"
                            className="w-[180px] h-[28px] px-[12px] rounded-[8px] text-[14px] text-[#0F100F] outline-none font-[DM_Sans]"
                            style={{ background: "#ffffff", border: "1px solid #eef0f4" }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer — Save composes summary from the selected set */}
                <div className="flex items-center justify-end gap-[10px] px-[22px] py-[14px] shrink-0" style={{ borderTop: "1px solid #eef0f4", background: "#fafbfc" }}>
                  <button
                    onClick={onClose}
                    className="px-[18px] h-[36px] rounded-[8px] text-[14px] font-semibold cursor-pointer bg-transparent"
                    style={{ color: "#5a6070", border: "1px solid #e3e6eb" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => { onSubmit(buildSummary()); onClose(); }}
                    className="px-[22px] h-[36px] rounded-[8px] text-[14px] font-semibold text-white border-none cursor-pointer"
                    style={{ background: "#358C11" }}
                  >
                    Save to Summary
                  </button>
                </div>
              </>
            )}

            {mode === "add" && (
              <>
                <div className="flex items-center justify-between px-[22px] py-[14px] shrink-0" style={{ borderBottom: "1px solid #eef0f4" }}>
                  <span className="text-[16px] font-bold text-[#0F100F]">Add New Question Set</span>
                </div>

                <div className="flex-1 overflow-y-auto iv2-scroll px-[22px] py-[18px] flex flex-col gap-[16px]">
                  <div className="flex flex-col gap-[6px]">
                    <label className="text-[13px] font-medium text-[#5a6070]">
                      Title<span style={{ color: "#dc2626", marginLeft: 3 }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Hypertension Follow-up"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="iv2-input"
                      style={inputFieldStyle}
                    />
                  </div>

                  <div className="flex flex-col gap-[10px]">
                    <span className="text-[13px] font-bold text-[#5a6070] uppercase tracking-[0.4px]">
                      Questions <span className="text-[#0F100F]">({formQuestions.length})</span>
                    </span>

                    <div className="flex flex-col gap-[6px]">
                      {formQuestions.length === 0 ? (
                        <div className="flex items-center justify-center py-[20px] text-[13px] text-[#8c9198] italic rounded-[8px]" style={{ background: "#fafbfc", border: "1px dashed #e3e6eb" }}>
                          No questions yet — add one below.
                        </div>
                      ) : (
                        formQuestions.map((q, i) => (
                          <div
                            key={q.id}
                            className="flex items-center gap-[8px] px-[12px] py-[8px] rounded-[8px]"
                            style={{ background: "#F7F8FA", border: "1px solid #eef0f4" }}
                          >
                            <span
                              className="text-[11px] font-bold rounded-[4px] shrink-0"
                              style={{ background: "#eef0f4", color: "#5a6070", padding: "2px 6px" }}
                            >
                              {i + 1}
                            </span>
                            <input
                              type="text"
                              value={q.text}
                              onChange={(e) => updateDraftQuestionText(q.id, e.target.value)}
                              className="text-[14px] text-[#0F100F] flex-1 min-w-0 bg-transparent outline-none border-none font-[DM_Sans]"
                              style={{ padding: 0 }}
                            />
                            <button
                              onClick={() => removeDraftQuestion(q.id)}
                              className="flex items-center justify-center cursor-pointer rounded-[6px] border-none bg-transparent shrink-0"
                              style={{ width: 24, height: 24, color: "#dc2626" }}
                              title="Remove"
                            >
                              <Trash2 size={12} strokeWidth={2.5} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add-question row — matches templates-dev-v4 "Add new item" pattern */}
                    <div className="flex items-center gap-[8px] pt-[12px] mt-[2px]" style={{ borderTop: "1px solid #eef0f4" }}>
                      <input
                        type="text"
                        value={draftQuestion}
                        onChange={(e) => setDraftQuestion(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { e.preventDefault(); addDraftQuestion(); }
                        }}
                        placeholder="Type a question and press Enter"
                        className="iv2-input flex-1"
                        style={{ ...inputFieldStyle, height: 36, padding: "0 12px" }}
                      />
                      <button
                        type="button"
                        onClick={addDraftQuestion}
                        disabled={!draftQuestion.trim()}
                        className="flex items-center gap-[5px] cursor-pointer text-[14px] font-semibold whitespace-nowrap border-none"
                        style={{
                          height: 36, paddingLeft: 12, paddingRight: 14, borderRadius: 8,
                          background: draftQuestion.trim() ? "#358C11" : "#c4c9d4",
                          color: "#fff",
                          cursor: draftQuestion.trim() ? "pointer" : "not-allowed",
                          opacity: draftQuestion.trim() ? 1 : 0.7,
                        }}
                      >
                        <Plus size={14} strokeWidth={2.5} />
                        Add
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-[10px] px-[22px] py-[14px] shrink-0" style={{ borderTop: "1px solid #eef0f4", background: "#fafbfc" }}>
                  <button
                    onClick={cancelForm}
                    className="px-[18px] h-[36px] rounded-[8px] text-[14px] font-semibold cursor-pointer bg-transparent"
                    style={{ color: "#5a6070", border: "1px solid #e3e6eb" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveNewSet}
                    disabled={!addValid}
                    className="px-[22px] h-[36px] rounded-[8px] text-[14px] font-semibold text-white border-none"
                    style={{
                      background: addValid ? "#358C11" : "#c4c9d4",
                      opacity: addValid ? 1 : 0.8,
                      cursor: addValid ? "pointer" : "not-allowed",
                    }}
                  >
                    Save Question Set
                  </button>
                </div>
              </>
            )}

            {/* Empty state */}
            {mode === "view" && !selected && (
              <div className="flex-1 flex flex-col items-center justify-center px-[40px] text-center">
                <div
                  className="flex items-center justify-center rounded-full mb-[18px]"
                  style={{ width: 72, height: 72, background: "#eaf5e3" }}
                >
                  <ClipboardList size={32} style={{ color: "#358C11" }} />
                </div>
                <span className="text-[17px] font-bold text-[#0F100F] mb-[6px]">
                  Select a question set to begin
                </span>
                <p className="text-[14px] text-[#8c9198] leading-[1.55] max-w-[320px]">
                  Pick a set from the left to start filling in answers, or add a new set tailored to this visit.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── History Intake — Static Checklist Modal ────────────────
// Past-disease checklist from the patient information form (Intake_Q_V2 §3).
// Unlike the Summary intake there are no question sets and no "add new" —
// the list is fixed. Ticked conditions save into the History list.
function HistoryIntakeModal({
  initial,
  onClose,
  onSubmit,
}: {
  initial: HistoryIntakeState;
  onClose: () => void;
  onSubmit: (items: { text: string; remark: string }[], state: HistoryIntakeState) => void;
}) {
  const [checked, setChecked] = useState<Record<string, boolean>>(initial.checked);
  const [cancerSite, setCancerSite] = useState(initial.cancerSite);
  const [cancerTreatments, setCancerTreatments] = useState<Record<string, boolean>>(initial.cancerTreatments);

  const toggle = (id: string) => setChecked((p) => ({ ...p, [id]: !p[id] }));
  const toggleTreatment = (t: string) =>
    setCancerTreatments((p) => ({ ...p, [t]: !p[t] }));
  const checkedCount = HISTORY_INTAKE_ITEMS.filter((it) => checked[it.id]).length;

  const buildItems = () =>
    HISTORY_INTAKE_ITEMS.filter((it) => checked[it.id]).map((it) => {
      if (it.id === CANCER_ITEM_ID) {
        const parts: string[] = [];
        if (cancerSite.trim()) parts.push(`Place: ${cancerSite.trim()}`);
        const tx = CANCER_TREATMENTS.filter((t) => cancerTreatments[t]);
        if (tx.length > 0) parts.push(tx.join(", "));
        return { text: it.en, remark: parts.join(" · ") };
      }
      return { text: it.en, remark: "" };
    });

  const scrollbarCss = `
    .hi-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
    .hi-scroll::-webkit-scrollbar-track { background: transparent; }
    .hi-scroll::-webkit-scrollbar-thumb { background: rgba(140,145,152,0.25); border-radius: 999px; }
    .hi-scroll::-webkit-scrollbar-thumb:hover { background: rgba(140,145,152,0.45); }
    .hi-scroll { scrollbar-width: thin; scrollbar-color: rgba(140,145,152,0.25) transparent; }
    .hi-item { transition: background 0.12s ease; }
    .hi-item:hover { background: #f4f8f1 !important; }
  `;

  const CheckBoxMark = ({ on }: { on: boolean }) => (
    <span
      className="flex items-center justify-center shrink-0"
      style={{
        width: 16,
        height: 16,
        borderRadius: 4,
        border: on ? "1px solid #358C11" : "1px solid #c9ced6",
        background: on ? "#358C11" : "#ffffff",
      }}
    >
      {on && <Check size={11} strokeWidth={3} color="#ffffff" />}
    </span>
  );

  const renderItem = (it: HistoryIntakeItem) => (
    <button
      key={it.id}
      type="button"
      onClick={() => toggle(it.id)}
      className="hi-item w-full flex items-start gap-[10px] text-left px-[10px] py-[7px] rounded-[8px] cursor-pointer border-none bg-transparent"
    >
      <span className="mt-[2px]"><CheckBoxMark on={!!checked[it.id]} /></span>
      <span className="flex-1 min-w-0">
        <span className="block text-[14px] text-[#0F100F] leading-[1.35]">{it.en}</span>
        <span className="block text-[12px] text-[#8c9198] leading-[1.4] mt-[1px]">{it.bn}</span>
      </span>
    </button>
  );

  // Cancer appears only in the bottom row with its detail fields; the two
  // columns hold the remaining 30 conditions, 15 each.
  const cancerItem = HISTORY_INTAKE_ITEMS.find((it) => it.id === CANCER_ITEM_ID)!;
  const listItems = HISTORY_INTAKE_ITEMS.filter((it) => it.id !== CANCER_ITEM_ID);
  const cancerOn = !!checked[CANCER_ITEM_ID];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center font-[DM_Sans]" style={{ background: "rgba(0,0,0,0.45)" }}>
      <style dangerouslySetInnerHTML={{ __html: scrollbarCss }} />
      <div className="w-[760px] bg-white rounded-[12px] flex flex-col overflow-hidden shadow-2xl relative" style={{ height: 640 }}>
        {/* Header */}
        <div className="flex items-center justify-between px-[20px] py-[10px] shrink-0" style={{ background: "#358C11" }}>
          <span className="text-[15px] font-semibold text-white">Patient Intake — History</span>
          <button onClick={onClose} className="flex items-center justify-center w-[28px] h-[28px] rounded-[6px] text-white border-none cursor-pointer" style={{ background: "rgba(255,255,255,0.15)" }}>
            <X size={15} />
          </button>
        </div>

        {/* Sub-header — instruction from the form + tick counter */}
        <div className="flex items-center justify-between gap-[12px] px-[22px] py-[12px] shrink-0" style={{ borderBottom: "1px solid #eef0f4", background: "#fafbfc" }}>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-[#0F100F]">Past Diseases / Physical Conditions</p>
            <p className="text-[12px] text-[#8c9198] mt-[2px]">Tick only the conditions the patient has.</p>
          </div>
          <span
            className="text-[12px] font-semibold shrink-0 px-[10px] py-[3px] rounded-full"
            style={{ background: "#eaf5e3", color: "#358C11" }}
          >
            {checkedCount} selected
          </span>
        </div>

        {/* Checklist — two columns, same split as the printed form */}
        <div className="flex-1 min-h-0 overflow-y-auto hi-scroll px-[14px] py-[10px]">
          <div className="flex gap-[8px] items-start">
            <div className="flex-1 min-w-0 flex flex-col">
              {listItems.slice(0, 15).map(renderItem)}
            </div>
            <div className="flex-1 min-w-0 flex flex-col">
              {listItems.slice(15).map(renderItem)}
            </div>
          </div>

          {/* Cancer — own row at the bottom, mirrors the form's standalone
              "ক্যান্সার হলে — কোথায় / চিকিৎসা" line. The item reads like the
              rest of the checklist; its detail fields sit right beside it on
              a subtle backdrop, locked until the condition is ticked. */}
          <div className="mt-[4px] mb-[6px] flex items-stretch gap-[8px] rounded-[10px]" style={{ background: "#f7f8fa" }}>
            {/* Left half — cancer item + Where, same width as column 1 */}
            <div className="flex-1 min-w-0 flex items-start">
              <button
                type="button"
                onClick={() => toggle(CANCER_ITEM_ID)}
                className="shrink-0 flex items-start gap-[10px] text-left px-[10px] py-[7px] rounded-[8px] cursor-pointer border-none bg-transparent"
              >
                <span className="mt-[2px]"><CheckBoxMark on={cancerOn} /></span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[14px] text-[#0F100F] leading-[1.35]">{cancerItem.en}</span>
                  <span className="block text-[12px] text-[#8c9198] leading-[1.4] mt-[1px]">{cancerItem.bn}</span>
                </span>
              </button>
              <div
                className="ml-auto shrink-0 flex flex-col gap-[5px] px-[12px] py-[9px] rounded-[8px]"
                style={{ width: "50%", opacity: cancerOn ? 1 : 0.45 }}
              >
                <span className="text-[13px] text-[#5a6070]">Place:</span>
                <input
                  type="text"
                  value={cancerSite}
                  onChange={(e) => setCancerSite(e.target.value)}
                  placeholder="e.g. Breast"
                  disabled={!cancerOn}
                  className="w-full min-w-0 h-[28px] px-[10px] rounded-[6px] text-[13px] text-[#0F100F] outline-none font-[DM_Sans]"
                  style={{
                    background: cancerOn ? "#ffffff" : "#eef0f4",
                    border: "1px solid #e3e6eb",
                    cursor: cancerOn ? "text" : "not-allowed",
                  }}
                />
              </div>
            </div>

            {/* Right half — Treatment, inset 10px so the Operation checkbox
                lines up with the second column's checkboxes */}
            <div
              className="flex-1 min-w-0 flex flex-col gap-[5px] py-[9px] rounded-[8px]"
              style={{ opacity: cancerOn ? 1 : 0.45 }}
            >
              <span className="text-[13px] text-[#5a6070] px-[10px]">Treatment:</span>
              <div className="flex items-center gap-[10px] h-[28px] px-[10px]">
                {CANCER_TREATMENTS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => cancerOn && toggleTreatment(t)}
                    disabled={!cancerOn}
                    className="flex items-center gap-[5px] border-none bg-transparent p-0"
                    style={{ cursor: cancerOn ? "pointer" : "not-allowed" }}
                  >
                    <CheckBoxMark on={!!cancerTreatments[t]} />
                    <span className="text-[13px] text-[#0F100F]">{t}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-[10px] px-[22px] py-[14px] shrink-0" style={{ borderTop: "1px solid #eef0f4", background: "#fafbfc" }}>
          <button
            onClick={onClose}
            className="px-[18px] h-[36px] rounded-[8px] text-[14px] font-semibold cursor-pointer bg-transparent"
            style={{ color: "#5a6070", border: "1px solid #e3e6eb" }}
          >
            Cancel
          </button>
          <button
            onClick={() => { onSubmit(buildItems(), { checked, cancerSite, cancerTreatments }); onClose(); }}
            className="px-[22px] h-[36px] rounded-[8px] text-[14px] font-semibold text-white border-none cursor-pointer"
            style={{ background: "#358C11" }}
          >
            Save to History
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Follow Up & Refer — shared working controls ────────────
// Same control row used by both the compact-mode tab body and the
// wide-mode FOLLOW UP / REFER TO blocks. Mode toggle (After / On),
// numeric amount, unit dropdown (Days / Weeks / Months). Refer-to
// input is its own component below.
type FollowUpUnit = "Days" | "Weeks" | "Months";
function FollowUpControls({
  mode, setMode,
  amount, setAmount,
  unit, setUnit,
  unitOpen, setUnitOpen,
  unitRef,
  date, setDate,
}: {
  mode: "After" | "On";
  setMode: (m: "After" | "On") => void;
  amount: string;
  setAmount: (v: string) => void;
  unit: FollowUpUnit;
  setUnit: (u: FollowUpUnit) => void;
  unitOpen: boolean;
  setUnitOpen: (v: boolean) => void;
  unitRef: React.RefObject<HTMLDivElement | null>;
  date: string;
  setDate: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-[6px]">
      {/* After / On toggle */}
      <div className="flex items-center bg-white rounded-[7px] p-[2px] h-[28px]">
        {(["After", "On"] as const).map((m) => {
          const isActive = mode === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className="flex items-center justify-center px-[8px] h-[24px] rounded-[5px] cursor-pointer border-none"
              style={{
                background: isActive ? "#ffffff" : "transparent",
                boxShadow: isActive ? "0 1px 2px rgba(15,23,42,0.06)" : "none",
                color: isActive ? "#3fa216" : "#64748b",
                fontWeight: isActive ? 700 : 400,
                fontSize: 13,
                transition: "background 0.12s ease, color 0.12s ease",
              }}
            >
              {m}
            </button>
          );
        })}
      </div>

      {mode === "After" ? (
        <>
          {/* Numeric amount */}
          <input
            type="text"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
            className="flex items-center justify-center text-center px-[6px] h-[28px] w-[40px] bg-white border border-[#e2e8f0] rounded-[6px] outline-none text-[15px] text-[#1e293b] font-[DM_Sans]"
          />

          {/* Unit dropdown — portaled so the panel isn't clipped by the
              section's overflow-hidden parent. */}
          <FollowUpUnitTrigger
            unit={unit}
            setUnit={setUnit}
            unitOpen={unitOpen}
            setUnitOpen={setUnitOpen}
            unitRef={unitRef}
          />
        </>
      ) : (
        // Date input — replaces the count + unit pair when "On" is active.
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="flex-1 min-w-[120px] h-[28px] px-[8px] bg-white border border-[#e2e8f0] rounded-[6px] outline-none text-[15px] text-[#1e293b] font-[DM_Sans] cursor-text"
        />
      )}
    </div>
  );
}

function FollowUpUnitTrigger({
  unit, setUnit, unitOpen, setUnitOpen, unitRef,
}: {
  unit: FollowUpUnit;
  setUnit: (u: FollowUpUnit) => void;
  unitOpen: boolean;
  setUnitOpen: (v: boolean) => void;
  unitRef: React.RefObject<HTMLDivElement | null>;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ left: number; bottom: number; width: number } | null>(null);

  // Recompute position whenever the panel opens or layout changes. We anchor
  // by the trigger's TOP edge so the panel grows upward.
  useEffect(() => {
    if (!unitOpen) return;
    const update = () => {
      if (!btnRef.current) return;
      const r = btnRef.current.getBoundingClientRect();
      setPos({
        left: r.left,
        // Distance from viewport bottom to the trigger's TOP edge — the
        // portal panel uses CSS `bottom`, so when this number grows the
        // panel sits higher (i.e. above the trigger).
        bottom: window.innerHeight - r.top + 4,
        width: r.width,
      });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [unitOpen]);

  return (
    <div className="relative" ref={unitRef}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setUnitOpen(!unitOpen)}
        className="flex items-center gap-[2px] px-[6px] h-[28px] bg-white border border-[#e2e8f0] rounded-[6px] cursor-pointer"
      >
        <span className="text-[13px] text-[#1e293b]">{unit}</span>
        <ChevronDown size={11} className="text-[#8c9198]" />
      </button>
      {unitOpen && pos && createPortal(
        <div
          id="follow-up-unit-panel"
          className="rounded-[6px] bg-white py-[3px]"
          style={{
            position: "fixed",
            left: pos.left,
            bottom: pos.bottom,
            minWidth: pos.width,
            border: "1px solid #eef0f4",
            boxShadow: "0 -6px 18px rgba(15,23,42,0.10)",
            zIndex: 320,
          }}
        >
          {(["Days", "Weeks", "Months"] as const).map((u) => {
            const isSel = u === unit;
            return (
              <button
                key={u}
                type="button"
                onClick={() => { setUnit(u); setUnitOpen(false); }}
                className="block w-full text-left px-[10px] py-[4px] cursor-pointer border-none bg-transparent text-[13px]"
                style={{
                  background: isSel ? "#eaf5e3" : "transparent",
                  color: isSel ? "#256b06" : "#0F100F",
                  fontWeight: isSel ? 600 : 400,
                }}
                onMouseEnter={(e) => { if (!isSel) (e.currentTarget as HTMLButtonElement).style.background = "#f5faf3"; }}
                onMouseLeave={(e) => { if (!isSel) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
              >
                {u}
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </div>
  );
}

function ReferToInput({
  value, onChange, focused, setFocused,
}: {
  value: string;
  onChange: (v: string) => void;
  focused: boolean;
  setFocused: (v: boolean) => void;
}) {
  return (
    <div
      className="flex items-center px-[12px] h-[30px] rounded-[7px]"
      style={{
        background: focused ? "#ffffff" : "#ffffff",
        border: focused ? "1px solid #358C11" : "1px solid transparent",
        boxShadow: focused ? "0 0 0 3px rgba(53,140,17,0.1)" : "none",
        transition: "background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease",
      }}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Write doctor name or specialty"
        className={`flex-1 min-w-0 text-[#0F100F] outline-none bg-transparent text-[15px] ${
          /[ঀ-৿]/.test(value) ? "font-[Kalpurush]" : "font-[DM_Sans]"
        }`}
        style={{ border: "none" }}
      />
    </div>
  );
}

// ── Clinical Signs Modal ───────────────────────────────────
const inputCls = "h-[28px] px-[8px] rounded-[6px] text-[13px] text-[#0F100F] outline-none";
const inputStyle = { background: "#fff", border: "1px solid #cfd5e0" };

// ── Add Test Results Modal ──────────────────────────────────

export type SubTest = {
  name: string;
  value: string;
  unit: string;
  range: string;
  abnormal?: boolean;
  abnormalDirection?: "up" | "down";
};

/** One row in Add Test Results. Shape taken from what the modal already
 *  builds; `id` is added so rows are addressed by identity, never index. */
export type TestResultRow = {
  id: string;
  name: string;
  date: string;
  result: string;
  unit: string;
  range: string;
  abnormal: boolean;
  abnormalDirection?: "up" | "down";
  subTests?: SubTest[];
  expanded?: boolean;
  selected: boolean;
};

const TEST_REFERENCE_DATA: Record<string, {
  value?: string;
  unit?: string;
  range?: string;
  abnormal?: boolean;
  abnormalDirection?: "up" | "down";
  subTests?: SubTest[];
}> = {
  "Random blood sugar (RBS)": { value: "15.5", unit: "mmol/L", range: "< 11.1 mmol/L", abnormal: true, abnormalDirection: "up" },
  "Serum creatinine": { value: "1.0", unit: "mg/dL", range: "0.7 - 1.3 mg/dL" },
  "Complete Blood Count (CBC)": {
    subTests: [
      { name: "Hemoglobin (Hb)", value: "11.2", unit: "g/dL", range: "13.5 - 17.5 g/dL", abnormal: true, abnormalDirection: "down" },
      { name: "White Blood Cell (WBC)", value: "13800", unit: "/μL", range: "4500 - 11000 /μL", abnormal: true, abnormalDirection: "up" },
      { name: "Red Blood Cell (RBC)", value: "4.5", unit: "M/μL", range: "4.5 - 5.9 M/μL" },
      { name: "Platelet count", value: "250000", unit: "/μL", range: "150000 - 450000 /μL" },
      { name: "Hematocrit (Hct)", value: "38", unit: "%", range: "41 - 53 %", abnormal: true, abnormalDirection: "down" },
    ],
  },
};

function AddTestResultsModal({
  onClose,
  testList,
  results,
  onChangeResults,
}: {
  onClose: () => void;
  testList: string[];
  results: TestResultRow[];
  onChangeResults: (rows: TestResultRow[]) => void;
}) {
  // Rows live on the draft. Any ordered test with no stored row yet is seeded
  // from the reference data, and a trailing blank row is always offered.
  const rows: TestResultRow[] = useMemo(() => {
    const byName = new Map(results.map((r) => [r.name, r]));
    const seeded = testList.map(
      (name) =>
        byName.get(name) ?? {
          id: `tr-${name}`,
          name,
          date: "23 Mar, 2026",
          result: TEST_REFERENCE_DATA[name]?.value ?? "",
          unit: TEST_REFERENCE_DATA[name]?.unit ?? "",
          range: TEST_REFERENCE_DATA[name]?.range ?? "",
          abnormal: TEST_REFERENCE_DATA[name]?.abnormal ?? false,
          abnormalDirection: TEST_REFERENCE_DATA[name]?.abnormalDirection as ("up" | "down" | undefined),
          subTests: TEST_REFERENCE_DATA[name]?.subTests as (SubTest[] | undefined),
          expanded: TEST_REFERENCE_DATA[name]?.subTests ? false : undefined,
          selected: false,
        },
    );
    // Free-text rows the doctor added that are not in the ordered list.
    const extra = results.filter((r) => !testList.includes(r.name));
    const blank = [...seeded, ...extra].some((r) => r.name.trim() === "")
      ? []
      : [{
          id: `tr-blank-${seeded.length + extra.length}`,
          name: "", date: "23 Mar, 2026", result: "", unit: "", range: "",
          abnormal: false,
          abnormalDirection: undefined as "up" | "down" | undefined,
          subTests: undefined as SubTest[] | undefined,
          expanded: undefined as boolean | undefined,
          selected: false,
        }];
    return [...seeded, ...extra, ...blank];
  }, [results, testList]);

  // Every mutation writes the whole row set back through the draft, addressing
  // rows by id.
  const setRows = (fn: (prev: TestResultRow[]) => TestResultRow[]) =>
    onChangeResults(fn(rows).filter((r) => r.name.trim() !== ""));
  const patchRow = (id: string, patch: Partial<TestResultRow>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const toggleExpanded = (id: string) => patchRow(id, { expanded: !rows.find((r) => r.id === id)?.expanded });
  const [allSelected, setAllSelected] = useState(false);

  const removeRow = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));
  const toggleRow = (id: string) => patchRow(id, { selected: !rows.find((r) => r.id === id)?.selected });
  const toggleAll = () => {
    const next = !allSelected;
    setAllSelected(next);
    setRows((prev) => prev.map((r) => ({ ...r, selected: next })));
  };

  return (
    <div data-module="test-results" className="fixed inset-0 z-[60] flex items-center justify-center font-[DM_Sans]" style={{ background: "rgba(0,0,0,0.45)" }}>
      <div className="w-[1000px] bg-white rounded-[10px] overflow-hidden shadow-2xl flex flex-col" style={{ height: "600px" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-[20px] py-[12px] shrink-0" style={{ background: "#358C11" }}>
          <span className="text-[16px] font-bold text-white">Add Tests Results</span>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-[28px] h-[28px] rounded-[6px] text-white cursor-pointer"
            style={{ background: "rgba(255,255,255,0.15)", border: "none" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto pt-[9px] px-[18px] pb-[18px]">

          {/* Table header */}
          <div
            className="grid items-center px-[14px] py-[4px] rounded-[8px]"
            style={{
              gridTemplateColumns: "28px 30px minmax(0,1fr) 150px 140px minmax(0,180px) 34px",
              gap: 10,
              background: "#ffffff",
              minHeight: 40,
            }}
          >
            <label className="flex items-center cursor-pointer">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} className="hidden" />
              <span
                className="w-[14px] h-[14px] rounded-[3px] flex items-center justify-center"
                style={{
                  background: allSelected ? "#358C11" : "white",
                  border: allSelected ? "none" : "1.5px solid #c4c9d4",
                }}
              >
                {allSelected && (
                  <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                    <path d="M1 3L3.5 5.5L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
            </label>
            <span className="text-[13px] font-semibold text-[#5a6070]">#</span>
            <span className="text-[13px] font-semibold text-[#0F100F]">Test Name</span>
            <span className="text-[13px] font-semibold text-[#0F100F]">Date</span>
            <span className="text-[13px] font-semibold text-[#0F100F]">Result</span>
            <span className="text-[13px] font-semibold text-[#0F100F]">Reference Range</span>
            <span />
          </div>

          {/* Rows */}
          <div className="flex flex-col mt-[4px]">
            {rows.map((row, i) => {
              const hasSubTests = !!(row.subTests && row.subTests.length > 0);
              const isExpanded = hasSubTests && row.expanded;
              return (
                <Fragment key={i}>
                  {/* Parent / single test row */}
                  <div
                    className="grid items-center px-[14px] py-[4px]"
                    style={{
                      gridTemplateColumns: "28px 30px minmax(0,1fr) 150px 140px minmax(0,180px) 34px",
                      gap: 10,
                    }}
                  >
                    {/* Checkbox */}
                    <label className="flex items-center cursor-pointer">
                      <input type="checkbox" checked={row.selected} onChange={() => toggleRow(row.id)} className="hidden" />
                      <span
                        className="w-[14px] h-[14px] rounded-[3px] flex items-center justify-center"
                        style={{
                          background: row.selected ? "#358C11" : "white",
                          border: row.selected ? "none" : "1.5px solid #c4c9d4",
                        }}
                      >
                        {row.selected && (
                          <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                            <path d="M1 3L3.5 5.5L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                    </label>

                    {/* Serial badge */}
                    <span
                      className="flex items-center justify-center text-[12px] font-bold rounded-[5px]"
                      style={{ width: 22, height: 20, background: "#e8f5e9", color: "#2e7d32" }}
                    >
                      {i + 1}
                    </span>

                    {/* When expanded, wrap middle cells (test name + date + merged) in a single bg container spanning cols 3-6 */}
                    {isExpanded ? (
                      <div
                        className="grid items-center rounded-[8px]"
                        style={{
                          gridColumn: "3 / 7",
                          gridTemplateColumns: "minmax(0,1fr) 150px 140px minmax(0,180px)",
                          gap: 10,
                          background: "#e0ecda",
                        }}
                      >
                        {/* Test Name */}
                        <div className="flex items-center gap-[8px] h-[40px] px-[12px] rounded-[6px]">
                          <button
                            onClick={() => toggleExpanded(row.id)}
                            className="flex items-center justify-center cursor-pointer shrink-0"
                            style={{ width: 18, height: 18, background: "transparent", border: "none", padding: 0 }}
                          >
                            <ChevronDown
                              size={14}
                              className="text-[#5a6070]"
                              style={{
                                transition: "transform 0.2s ease",
                                transform: "rotate(180deg)",
                              }}
                            />
                          </button>
                          <input
                            type="text"
                            value={row.name}
                            onChange={(e) => patchRow(row.id, { name: e.target.value })}
                            placeholder="Search and add test"
                            className="flex-1 text-[13px] text-[#0F100F] outline-none bg-transparent border-0 min-w-0"
                            style={{ fontWeight: 600 }}
                          />
                        </div>

                        {/* Date */}
                        <div className="flex items-center gap-[6px] h-[40px] px-[12px] rounded-[6px]">
                          <input
                            type="text"
                            value={row.date}
                            onChange={(e) => patchRow(row.id, { date: e.target.value })}
                            className="flex-1 text-[13px] text-[#0F100F] outline-none bg-transparent border-0 min-w-0"
                          />
                          <Calendar size={13} className="text-[#9198a5] shrink-0" />
                        </div>

                        {/* Merged abnormal preview — spans cols 3-4 of inner grid (matches outer cols 5-6) */}
                        <div
                          className="flex items-center gap-[8px] h-[40px] px-[12px] rounded-[6px]"
                          style={{ gridColumn: "3 / span 2" }}
                        >
                          <div className="flex items-center gap-[6px] flex-1 min-w-0">
                            {(() => {
                              const abnormalSubs = row.subTests!.filter((s) => s.abnormal);
                              if (abnormalSubs.length === 0) {
                                return <span className="text-[12px] italic" style={{ color: "#358C11" }}>All values within normal range</span>;
                              }
                              const visiblePills = abnormalSubs.slice(0, 2);
                              const hiddenCount = abnormalSubs.length - visiblePills.length;
                              return (
                                <>
                                  {visiblePills.map((sub) => (
                                    <div
                                      key={sub.name}
                                      className="flex items-center gap-[3px] shrink-0 px-[8px] py-[3px] rounded-[5px]"
                                      style={{ background: "#fde2e2" }}
                                    >
                                      {sub.abnormalDirection === "up" ? (
                                        <ArrowUp size={11} style={{ color: "#dc2626" }} strokeWidth={2.5} />
                                      ) : (
                                        <ArrowDown size={11} style={{ color: "#dc2626" }} strokeWidth={2.5} />
                                      )}
                                      <span className="text-[12px] font-semibold whitespace-nowrap" style={{ color: "#dc2626" }}>
                                        {sub.name.match(/\(([^)]+)\)/)?.[1] ?? sub.name}: {sub.value} {sub.unit}
                                      </span>
                                    </div>
                                  ))}
                                  {hiddenCount > 0 && (
                                    <div
                                      className="flex items-center shrink-0 px-[8px] py-[3px] rounded-[5px]"
                                      style={{ background: "#fde2e2" }}
                                    >
                                      <span className="text-[12px] font-semibold" style={{ color: "#dc2626" }}>
                                        +{hiddenCount} more
                                      </span>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                    {/* Test Name */}
                    <div
                      className="flex items-center gap-[8px] h-[40px] px-[12px] rounded-[6px]"
                      style={{ background: "#ffffff", border: "none" }}
                    >
                      {hasSubTests && (
                        <button
                          onClick={() => toggleExpanded(row.id)}
                          className="flex items-center justify-center cursor-pointer shrink-0"
                          style={{ width: 18, height: 18, background: "transparent", border: "none", padding: 0 }}
                        >
                          <ChevronDown
                            size={14}
                            className="text-[#5a6070]"
                            style={{
                              transition: "transform 0.2s ease",
                              transform: "rotate(0deg)",
                            }}
                          />
                        </button>
                      )}
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) => patchRow(row.id, { name: e.target.value })}
                        placeholder="Search and add test"
                        className="flex-1 text-[13px] text-[#0F100F] outline-none bg-transparent border-0 min-w-0"
                        style={{ fontWeight: 400 }}
                      />
                      {i === rows.length - 1 && (
                        <Search size={13} className="text-[#9198a5] shrink-0" />
                      )}
                    </div>

                    {/* Date */}
                    <div
                      className="flex items-center gap-[6px] h-[40px] px-[12px] rounded-[6px]"
                      style={{ background: "#ffffff", border: "none" }}
                    >
                      <input
                        type="text"
                        value={row.date}
                        onChange={(e) => patchRow(row.id, { date: e.target.value })}
                        className="flex-1 text-[13px] text-[#0F100F] outline-none bg-transparent border-0 min-w-0"
                      />
                      <Calendar size={13} className="text-[#9198a5] shrink-0" />
                    </div>

                    {hasSubTests ? (
                      /* Parent collapsed: merged cell — abnormal preview at a glance */
                      <div
                        className="flex items-center gap-[8px] h-[40px] px-[12px] rounded-[6px]"
                        style={{ background: "#ffffff", border: "none", gridColumn: "5 / span 2" }}
                      >
                        <div className="flex items-center gap-[6px] flex-1 min-w-0">
                          {(() => {
                            const abnormalSubs = row.subTests!.filter((s) => s.abnormal);
                            if (abnormalSubs.length === 0) {
                              return <span className="text-[12px] italic" style={{ color: "#358C11" }}>All values within normal range</span>;
                            }
                            const visiblePills = abnormalSubs.slice(0, 2);
                            const hiddenCount = abnormalSubs.length - visiblePills.length;
                            return (
                              <>
                                {visiblePills.map((sub) => (
                                  <div
                                    key={sub.name}
                                    className="flex items-center gap-[3px] shrink-0 px-[8px] py-[3px] rounded-[5px]"
                                    style={{ background: "#fde2e2" }}
                                  >
                                    {sub.abnormalDirection === "up" ? (
                                      <ArrowUp size={11} style={{ color: "#dc2626" }} strokeWidth={2.5} />
                                    ) : (
                                      <ArrowDown size={11} style={{ color: "#dc2626" }} strokeWidth={2.5} />
                                    )}
                                    <span className="text-[12px] font-semibold whitespace-nowrap" style={{ color: "#dc2626" }}>
                                      {sub.name.match(/\(([^)]+)\)/)?.[1] ?? sub.name}: {sub.value} {sub.unit}
                                    </span>
                                  </div>
                                ))}
                                {hiddenCount > 0 && (
                                  <div
                                    className="flex items-center shrink-0 px-[8px] py-[3px] rounded-[5px]"
                                    style={{ background: "#fde2e2" }}
                                  >
                                    <span className="text-[12px] font-semibold" style={{ color: "#dc2626" }}>
                                      +{hiddenCount} more
                                    </span>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Result + Unit */}
                        <div
                          className="flex items-center gap-[4px] h-[40px] px-[12px] rounded-[6px]"
                          style={{
                            background: row.abnormal ? "#fde2e2" : "#ffffff",
                            border: "none",
                          }}
                        >
                          {row.abnormal && row.abnormalDirection === "up" && (
                            <ArrowUp size={14} className="shrink-0" style={{ color: "#dc2626" }} strokeWidth={2.5} />
                          )}
                          {row.abnormal && row.abnormalDirection === "down" && (
                            <ArrowDown size={14} className="shrink-0" style={{ color: "#dc2626" }} strokeWidth={2.5} />
                          )}
                          <input
                            type="text"
                            value={row.result}
                            onChange={(e) => patchRow(row.id, { result: e.target.value })}
                            placeholder="Value"
                            className="text-[13px] outline-none bg-transparent border-0 min-w-0"
                            style={{
                              width: 40,
                              color: row.abnormal ? "#dc2626" : "#0F100F",
                              fontWeight: row.abnormal ? 600 : 400,
                            }}
                          />
                          <span
                            className="text-[12px] font-semibold shrink-0 ml-auto"
                            style={{ color: row.abnormal ? "#dc2626" : "#358C11" }}
                          >
                            {row.unit || "Unit"}
                          </span>
                        </div>

                        {/* Reference Range */}
                        <div
                          className="flex items-center h-[40px] px-[12px] rounded-[6px]"
                          style={{ background: "#ffffff", border: "none" }}
                        >
                          <input
                            type="text"
                            value={row.range}
                            onChange={(e) => patchRow(row.id, { range: e.target.value })}
                            placeholder="Value"
                            className="flex-1 text-[13px] text-[#0F100F] outline-none bg-transparent border-0 min-w-0"
                          />
                        </div>
                      </>
                    )}
                      </>
                    )}

                    {/* Delete (hidden on last empty row) */}
                    {i === rows.length - 1 ? (
                      <span />
                    ) : (
                      <button
                        onClick={() => removeRow(row.id)}
                        className="flex items-center justify-center w-[28px] h-[28px] rounded-[6px] cursor-pointer"
                        style={{ background: "transparent", border: "none", color: "#dc2626" }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  {/* Sub-test rows (when expanded) */}
                  {hasSubTests && row.expanded && row.subTests!.map((sub, si) => (
                    <div
                      key={`sub-${i}-${si}`}
                      className="grid items-center px-[14px] py-[3px]"
                      style={{
                        gridTemplateColumns: "28px 30px minmax(0,1fr) 150px 140px minmax(0,180px) 34px",
                        gap: 10,
                      }}
                    >
                      <span />
                      {/* Sub serial */}
                      <span
                        className="flex items-center justify-center text-[11px] font-semibold rounded-[5px]"
                        style={{ width: 22, height: 18, background: "#eaecf0", color: "#5a6070" }}
                      >
                        {String.fromCharCode(97 + si)}
                      </span>

                      {/* Sub Test Name (indented) */}
                      <div
                        className="flex items-center gap-[8px] h-[34px] px-[12px] rounded-[6px]"
                        style={{ background: "#EBEFF4", border: "none", marginLeft: 22 }}
                      >
                        <input
                          type="text"
                          value={sub.name}
                          onChange={(e) =>
                            patchRow(row.id, {
                              subTests: (row.subTests ?? []).map((st) =>
                                st.name === sub.name ? { ...st, name: e.target.value } : st,
                              ),
                            })
                          }
                          className="flex-1 text-[13px] text-[#0F100F] outline-none bg-transparent border-0 min-w-0"
                          style={{ fontWeight: 400 }}
                        />
                      </div>

                      {/* Date (inherit from parent — show muted) */}
                      <div
                        className="flex items-center h-[34px] px-[12px] rounded-[6px]"
                        style={{ background: "#EBEFF4", border: "none" }}
                      >
                        <span className="text-[13px] text-[#9198a5]">{row.date}</span>
                      </div>

                      {/* Result + Unit */}
                      <div
                        className="flex items-center gap-[4px] h-[34px] px-[12px] rounded-[6px]"
                        style={{
                          background: sub.abnormal ? "#fde2e2" : "#EBEFF4",
                          border: "none",
                        }}
                      >
                        {sub.abnormal && sub.abnormalDirection === "up" && (
                          <ArrowUp size={13} className="shrink-0" style={{ color: "#dc2626" }} strokeWidth={2.5} />
                        )}
                        {sub.abnormal && sub.abnormalDirection === "down" && (
                          <ArrowDown size={13} className="shrink-0" style={{ color: "#dc2626" }} strokeWidth={2.5} />
                        )}
                        <input
                          type="text"
                          value={sub.value}
                          onChange={(e) =>
                            patchRow(row.id, {
                              subTests: (row.subTests ?? []).map((st) =>
                                st.name === sub.name ? { ...st, value: e.target.value } : st,
                              ),
                            })
                          }
                          className="text-[13px] outline-none bg-transparent border-0 min-w-0"
                          style={{
                            width: 50,
                            color: sub.abnormal ? "#dc2626" : "#0F100F",
                            fontWeight: sub.abnormal ? 600 : 400,
                          }}
                        />
                        <span
                          className="text-[12px] font-semibold shrink-0 ml-auto"
                          style={{ color: sub.abnormal ? "#dc2626" : "#358C11" }}
                        >
                          {sub.unit}
                        </span>
                      </div>

                      {/* Reference Range */}
                      <div
                        className="flex items-center h-[34px] px-[12px] rounded-[6px]"
                        style={{ background: "#EBEFF4", border: "none", marginRight: 22 }}
                      >
                        <span className="text-[13px] text-[#5a6070] truncate">{sub.range}</span>
                      </div>

                      <span />
                    </div>
                  ))}
                </Fragment>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-[10px] px-[20px] py-[14px] shrink-0"
          style={{ borderTop: "1px solid #eef0f4" }}
        >
          <button
            onClick={onClose}
            className="px-[18px] h-[34px] rounded-[7px] text-[14px] font-medium text-[#5a6070] cursor-pointer"
            style={{ background: "white", border: "1px solid #e7ebf0" }}
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="px-[20px] h-[34px] rounded-[7px] text-[14px] font-semibold text-white cursor-pointer"
            style={{ background: "#358C11", border: "none" }}
          >
            Save Records
          </button>
        </div>

      </div>
    </div>
  );
}


// ── Manage Advice Modal ────────────────────────────────────

export type AdviceItem = {
  id: string;
  title: string;
  descBn: string;
  descEn: string;
  isMine: boolean;
};

export const MOCK_ADVICES: AdviceItem[] = [
  {
    id: "a1",
    title: "Diabetes lifestyle plan",
    descBn: "নিয়মিত রক্তে চিনির মাত্রা পরীক্ষা করুন। মিষ্টি জাতীয় খাবার এড়িয়ে চলুন এবং সুষম খাদ্য গ্রহণ করুন।",
    descEn: "Check blood sugar regularly. Avoid sweets, maintain a balanced diet, and walk 30 minutes daily.",
    isMine: true,
  },
  {
    id: "a2",
    title: "Hypertension care",
    descBn: "লবণ খাওয়া কমান এবং প্রতিদিন নির্ধারিত সময়ে ওষুধ সেবন করুন।",
    descEn: "Reduce salt intake. Take prescribed medication at the same time every day. Monitor BP weekly.",
    isMine: true,
  },
  {
    id: "a3",
    title: "Post-fever recovery",
    descBn: "প্রচুর পানি পান করুন। পর্যাপ্ত বিশ্রাম নিন এবং হালকা খাবার গ্রহণ করুন।",
    descEn: "Drink plenty of fluids. Rest adequately and eat light, easily-digestible meals.",
    isMine: false,
  },
  {
    id: "a4",
    title: "Antibiotic course guidance",
    descBn: "ডাক্তারের পরামর্শ অনুযায়ী সম্পূর্ণ কোর্স শেষ করুন।",
    descEn: "Complete the full antibiotic course even if you feel better. Do not skip doses.",
    isMine: false,
  },
  {
    id: "a5",
    title: "Pregnancy nutrition",
    descBn: "প্রতিদিন আয়রন ও ক্যালসিয়াম সমৃদ্ধ খাবার খান।",
    descEn: "Eat iron- and calcium-rich foods daily. Avoid raw or undercooked foods.",
    isMine: true,
  },
  {
    id: "a6",
    title: "Asthma triggers",
    descBn: "ধুলো, ধোঁয়া এবং পশুর লোম এড়িয়ে চলুন।",
    descEn: "Avoid dust, smoke, and pet dander. Use inhaler as prescribed before exposure.",
    isMine: false,
  },
  {
    id: "a7",
    title: "Cholesterol control",
    descBn: "চর্বি জাতীয় ও ভাজা খাবার কমিয়ে দিন। সপ্তাহে ৫ দিন অন্তত ৩০ মিনিট হাঁটুন।",
    descEn: "Reduce fatty and fried foods. Walk at least 30 minutes, 5 days a week. Re-check lipid profile after 3 months.",
    isMine: true,
  },
  {
    id: "a8",
    title: "Child fever (home care)",
    descBn: "শরীর হালকা কাপড় দিয়ে মুছে দিন। ৪ ঘণ্টা পর পর প্যারাসিটামল দিন এবং পর্যাপ্ত তরল খাওয়ান।",
    descEn: "Sponge with lukewarm water. Give paracetamol every 4 hours as needed and ensure adequate fluid intake.",
    isMine: false,
  },
  {
    id: "a9",
    title: "Acid reflux diet",
    descBn: "খাওয়ার পরপরই শুয়ে পড়বেন না। মসলাদার, টক এবং ক্যাফেইন জাতীয় খাবার এড়িয়ে চলুন।",
    descEn: "Don't lie down right after meals. Avoid spicy, acidic, and caffeine-rich foods. Raise the head of the bed 15 cm.",
    isMine: true,
  },
  {
    id: "a10",
    title: "Migraine management",
    descBn: "অতিরিক্ত আলো, শব্দ ও মানসিক চাপ এড়িয়ে চলুন। নির্ধারিত সময়ে ঘুমান ও পর্যাপ্ত পানি পান করুন।",
    descEn: "Avoid bright lights, loud sounds, and stress. Maintain regular sleep hours and stay well-hydrated. Keep a trigger diary.",
    isMine: false,
  },
  {
    id: "a11",
    title: "Thyroid medication timing",
    descBn: "লেভোথাইরক্সিন সকালে খালি পেটে খান এবং ওষুধ সেবনের ৩০ মিনিটের মধ্যে কিছু খাবেন না।",
    descEn: "Take levothyroxine in the morning on an empty stomach. Wait at least 30 minutes before eating or drinking anything other than water.",
    isMine: false,
  },
  {
    id: "a12",
    title: "Anaemia — iron-rich diet",
    descBn: "কলিজা, পালং শাক, ডাল ও গুড় নিয়মিত খান। আয়রন শোষণ বাড়াতে ভিটামিন সি সমৃদ্ধ ফল খান।",
    descEn: "Include liver, spinach, lentils, and molasses regularly. Eat vitamin-C-rich fruits with meals to boost iron absorption.",
    isMine: false,
  },
  {
    id: "a13",
    title: "UTI prevention",
    descBn: "প্রচুর পানি পান করুন। দীর্ঘ সময় প্রস্রাব চেপে রাখবেন না এবং পরিচ্ছন্নতা বজায় রাখুন।",
    descEn: "Drink plenty of water. Do not hold urine for long periods. Maintain proper hygiene, especially front-to-back after toileting.",
    isMine: false,
  },
  {
    id: "a14",
    title: "Post-operative wound care",
    descBn: "ক্ষতস্থান শুকনা ও পরিষ্কার রাখুন। ব্যান্ডেজ প্রতি ২৪ ঘণ্টায় বদলান এবং ফোলা, লাল বা পুঁজ দেখলে জানান।",
    descEn: "Keep the wound clean and dry. Change the dressing every 24 hours. Report any swelling, redness, or discharge immediately.",
    isMine: false,
  },
  {
    id: "a15",
    title: "Gestational diabetes diet",
    descBn: "দিনে ৫–৬ বার অল্প অল্প খাবার খান। সাদা ভাত ও মিষ্টি কমিয়ে দিন এবং নিয়মিত রক্তে চিনি পরীক্ষা করুন।",
    descEn: "Eat 5–6 small meals a day. Reduce white rice and sweets. Monitor blood sugar before and 1 hour after each meal.",
    isMine: false,
  },
  {
    id: "a16",
    title: "Back pain — lifestyle",
    descBn: "সঠিকভাবে বসুন, ভারী জিনিস বাঁকিয়ে তুলবেন না। প্রতিদিন হালকা স্ট্রেচিং ব্যায়াম করুন।",
    descEn: "Maintain correct posture while sitting. Do not bend to lift heavy objects — use your knees. Perform gentle stretching exercises daily.",
    isMine: false,
  },
  {
    id: "a17",
    title: "Vaccination reminder",
    descBn: "শিশুর টিকার তারিখ মেনে চলুন। টিকার পর হালকা জ্বর বা ব্যথা হলে প্যারাসিটামল দিন।",
    descEn: "Adhere to the child's vaccination schedule. If mild fever or pain occurs post-vaccine, give paracetamol as prescribed.",
    isMine: false,
  },
  {
    id: "a18",
    title: "Smoking cessation support",
    descBn: "ধূমপান বন্ধ করতে ট্রিগার চিহ্নিত করুন ও পরিবর্তন করুন। পর্যাপ্ত পানি পান ও চুইংগাম ব্যবহার করুন।",
    descEn: "Identify and avoid smoking triggers. Replace with water, chewing gum, or short walks. Nicotine-replacement therapy may help — discuss if needed.",
    isMine: false,
  },
  {
    id: "a19",
    title: "Eye strain (screen use)",
    descBn: "২০ মিনিট পরপর ২০ সেকেন্ড দূরের কোন বস্তুর দিকে তাকান। পর্দার আলো কমিয়ে রাখুন।",
    descEn: "Follow the 20-20-20 rule: every 20 minutes, look at something 20 feet away for 20 seconds. Reduce screen brightness in low light.",
    isMine: false,
  },
  {
    id: "a20",
    title: "Skin allergy care",
    descBn: "পরিচিত এলার্জেন এড়িয়ে চলুন। চুলকানিতে ঠান্ডা সেঁক দিন এবং প্রেসক্রাইব করা এন্টিহিস্টামিন ব্যবহার করুন।",
    descEn: "Avoid known allergens. Apply a cold compress to reduce itching. Use prescribed antihistamines; do not scratch affected areas.",
    isMine: false,
  },
  {
    id: "a21",
    title: "Rehydration (ORS) guide",
    descBn: "এক প্যাকেট ORS আধা লিটার পরিষ্কার পানিতে গুলিয়ে প্রতিবার পাতলা পায়খানার পর খাওয়ান।",
    descEn: "Mix one ORS packet in 500 ml of clean water. Give after each loose stool until diarrhoea stops. Seek care if unable to keep fluids down.",
    isMine: false,
  },
  {
    id: "a22",
    title: "Hypothyroid follow-up",
    descBn: "প্রতি ৬–৮ সপ্তাহ অন্তর TSH পরীক্ষা করান। ওষুধের ডোজ চিকিৎসকের পরামর্শ ছাড়া পরিবর্তন করবেন না।",
    descEn: "Check TSH every 6–8 weeks until stable. Do not change the dose without consulting your doctor. Report palpitations or fatigue.",
    isMine: false,
  },
  {
    id: "a23",
    title: "Osteoarthritis — knee care",
    descBn: "হাঁটুতে চাপ কমাতে ওজন নিয়ন্ত্রণে রাখুন। দৃঢ় ও আরামদায়ক জুতা পরুন এবং মৃদু ব্যায়াম করুন।",
    descEn: "Maintain a healthy weight to reduce knee load. Wear supportive footwear. Perform gentle strengthening exercises regularly.",
    isMine: false,
  },
  {
    id: "a24",
    title: "Breastfeeding guidance",
    descBn: "জন্মের প্রথম ঘণ্টায় শিশুকে বুকের দুধ পান করান। প্রথম ৬ মাস শুধু বুকের দুধ চলবে।",
    descEn: "Initiate breastfeeding within the first hour of birth. Exclusively breastfeed for the first 6 months, feeding on demand every 2–3 hours.",
    isMine: false,
  },
];

// Fake translation dictionary used by the Add/Edit Advice form. Typing any
// of these phrases (case-insensitive, trimmed) in one field auto-fills the
// other. Real machine translation isn't needed for the mock — see the
// project's CLAUDE.md "no backend" rule.
const FAKE_ADVICE_TRANSLATIONS: { en: string; bn: string }[] = [
  { en: "Drink plenty of water",                  bn: "প্রচুর পানি পান করুন" },
  { en: "Take complete rest",                     bn: "সম্পূর্ণ বিশ্রাম নিন" },
  { en: "Avoid spicy and oily food",              bn: "মসলাদার ও তেলযুক্ত খাবার এড়িয়ে চলুন" },
  { en: "Avoid sweets and sugar",                 bn: "মিষ্টি ও চিনি জাতীয় খাবার এড়িয়ে চলুন" },
  { en: "Walk 30 minutes every day",              bn: "প্রতিদিন ৩০ মিনিট হাঁটুন" },
  { en: "Walk daily",                             bn: "প্রতিদিন হাঁটুন" },
  { en: "Reduce salt intake",                     bn: "লবণ খাওয়া কমান" },
  { en: "Take medicine on time",                  bn: "নির্ধারিত সময়ে ওষুধ খান" },
  { en: "Eat fruits and vegetables daily",        bn: "প্রতিদিন ফল ও শাকসবজি খান" },
  { en: "Sleep 7 to 8 hours every night",         bn: "প্রতিদিন রাতে ৭–৮ ঘণ্টা ঘুমান" },
  { en: "Quit smoking and alcohol",               bn: "ধূমপান ও মদ্যপান পরিহার করুন" },
  { en: "Maintain personal hygiene",              bn: "ব্যক্তিগত পরিচ্ছন্নতা বজায় রাখুন" },
  { en: "Follow up after 15 days",                bn: "১৫ দিন পরে ফলোআপ করুন" },
];

const fakeTranslateEnToBn = (en: string): string | null => {
  const k = en.trim().toLowerCase();
  if (!k) return null;
  const hit = FAKE_ADVICE_TRANSLATIONS.find((p) => p.en.toLowerCase() === k);
  return hit ? hit.bn : null;
};
const fakeTranslateBnToEn = (bn: string): string | null => {
  const k = bn.trim();
  if (!k) return null;
  const hit = FAKE_ADVICE_TRANSLATIONS.find((p) => p.bn === k);
  return hit ? hit.en : null;
};

function ManageAdviceModal({
  onClose,
  items,
  onAdd,
  onEdit,
  onDelete,
}: {
  onClose: () => void;
  items: AdviceItem[];
  onAdd: (a: AdviceItem) => void;
  onEdit: (id: string, patch: Partial<AdviceItem>) => void;
  onDelete: (id: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"all" | "mine">("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"view" | "edit" | "add">("view");
  const [confirmDeleteFor, setConfirmDeleteFor] = useState<string | null>(null);

  // Form state (controlled inputs for edit/add modes)
  const [formDescEn, setFormDescEn] = useState("");
  const [formDescBn, setFormDescBn] = useState("");

  const filtered = items.filter((a) => {
    if (activeTab === "mine" && !a.isMine) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!a.descEn.toLowerCase().includes(q) && !a.descBn.includes(search)) return false;
    }
    return true;
  });

  const selected = selectedId ? items.find((a) => a.id === selectedId) : null;

  const startAdd = () => {
    setMode("add");
    setSelectedId(null);
    setFormDescEn("");
    setFormDescBn("");
  };
  const startEdit = () => {
    if (selected) {
      setFormDescEn(selected.descEn);
      setFormDescBn(selected.descBn);
    }
    setMode("edit");
  };
  const cancelForm = () => {
    setMode("view");
  };

  // Edit mode: enable Save only if any field differs from original.
  // Add mode: enable Save only if both description fields are non-empty.
  const editHasChanges = !!selected && (
    formDescEn !== selected.descEn ||
    formDescBn !== selected.descBn
  );
  const addIsValid =
    formDescEn.trim() !== "" &&
    formDescBn.trim() !== "";
  const canSave = mode === "edit" ? editHasChanges : addIsValid;

  const inputFieldStyle: React.CSSProperties = {
    background: "#ffffff",
    border: "1px solid #e3e6eb",
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 14,
    color: "#0F100F",
    outline: "none",
    width: "100%",
  };

  const scrollbarCss = `
    .adv-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
    .adv-scroll::-webkit-scrollbar-track { background: transparent; }
    .adv-scroll::-webkit-scrollbar-thumb { background: rgba(140,145,152,0.25); border-radius: 999px; }
    .adv-scroll::-webkit-scrollbar-thumb:hover { background: rgba(140,145,152,0.45); }
    .adv-scroll { scrollbar-width: thin; scrollbar-color: rgba(140,145,152,0.25) transparent; }
    .adv-add-btn { transition: background 0.15s ease; }
    .adv-add-btn:hover:not(:disabled) { background: #2a7a0d !important; }
    .adv-add-btn:disabled { cursor: not-allowed; opacity: 0.6; }
    .adv-input { transition: border-color 0.15s ease, box-shadow 0.15s ease; }
    .adv-input:focus {
      border-color: #358C11 !important;
      box-shadow: 0 0 0 3px rgba(53, 140, 17, 0.12) !important;
    }
    .adv-list-item { transition: background 0.12s ease; }
    .adv-list-item:hover:not(.adv-selected) { background: #eaf5e3 !important; }
  `;

  const confirmTarget = confirmDeleteFor
    ? items.find((a) => a.id === confirmDeleteFor)
    : null;

  return (
    <div data-module="master-data" className="fixed inset-0 z-50 flex items-center justify-center font-[DM_Sans]" style={{ background: "rgba(0,0,0,0.45)" }}>
      <style dangerouslySetInnerHTML={{ __html: scrollbarCss }} />
      <div className="w-[1000px] bg-white rounded-[12px] flex flex-col overflow-hidden shadow-2xl relative" style={{ height: 640 }}>

        {/* Header */}
        <div className="flex items-center justify-between px-[20px] py-[10px] shrink-0" style={{ background: "#358C11" }}>
          <span className="text-[15px] font-semibold text-white">Manage Advice</span>
          <button onClick={onClose} className="flex items-center justify-center w-[28px] h-[28px] rounded-[6px] text-white border-none cursor-pointer" style={{ background: "rgba(255,255,255,0.15)" }}>
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0">

          {/* ─── Left panel ─── */}
          <div className="flex flex-col shrink-0" style={{ width: 374, borderRight: "1px solid #eef0f4", background: "#F7F8FA" }}>

            {/* Search */}
            <div className="p-[14px] shrink-0" style={{ borderBottom: "1px solid #eef0f4" }}>
              <div className="relative">
                <Search size={14} className="absolute left-[10px] top-1/2 -translate-y-1/2 text-[#8c9198] pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search advice…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="adv-input w-full text-[14px] text-[#0F100F] outline-none font-[DM_Sans]"
                  style={{
                    height: 34,
                    paddingLeft: 30,
                    paddingRight: search ? 30 : 10,
                    background: "#ffffff",
                    border: "1px solid #e3e6eb",
                    borderRadius: 6,
                  }}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                    className="absolute right-[6px] top-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer border-none"
                    style={{ width: 20, height: 20, borderRadius: 999, background: "#eef0f4", color: "#5a6070" }}
                  >
                    <X size={11} strokeWidth={2.5} />
                  </button>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex shrink-0" style={{ borderBottom: "1px solid #eef0f4" }}>
              {(["all", "mine"] as const).map((tab) => {
                const active = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className="flex-1 py-[9px] text-[13px] font-semibold cursor-pointer border-none bg-transparent"
                    style={{
                      color: active ? "#064232" : "#8c9198",
                      borderBottom: active ? "2px solid #358C11" : "2px solid transparent",
                      marginBottom: -1,
                    }}
                  >
                    {tab === "all" ? "All" : "Personalized"}
                  </button>
                );
              })}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto adv-scroll">
              {filtered.length === 0 ? (
                <div className="px-[14px] py-[40px] text-center text-[13px] text-[#8c9198]">
                  No advice found
                </div>
              ) : (
                filtered.map((a) => {
                  const isSelected = a.id === selectedId && mode !== "add";
                  return (
                    <button
                      key={a.id}
                      onClick={() => { setSelectedId(a.id); setMode("view"); }}
                      className={`adv-list-item w-full text-left px-[14px] py-[10px] cursor-pointer border-none bg-transparent ${isSelected ? "adv-selected" : ""}`}
                      style={{
                        background: isSelected ? "#eaf5e3" : "transparent",
                        borderBottom: "1px solid #eef0f4",
                        borderLeft: isSelected ? "3px solid #358C11" : "3px solid transparent",
                      }}
                    >
                      <div className="flex items-start gap-[6px]">
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-[14px] text-[#0F100F] leading-[1.4] truncate"
                            style={{ fontFamily: "Kalpurush, sans-serif", fontWeight: 400 }}
                            title={a.descBn}
                          >
                            {a.descBn}
                          </p>
                          <p
                            className="text-[13px] text-[#8c9198] leading-[1.4] truncate mt-[2px]"
                            title={a.descEn}
                          >
                            {a.descEn}
                          </p>
                        </div>
                        {a.isMine && (
                          <span className="text-[10px] font-bold uppercase px-[5px] rounded-[3px] shrink-0 mt-[2px]" style={{ background: "#358C11", color: "#ffffff", paddingTop: 2, paddingBottom: 1 }}>
                            Own
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Add new */}
            <div className="p-[12px] shrink-0" style={{ borderTop: "1px solid #eef0f4", background: "#ffffff" }}>
              <button
                onClick={startAdd}
                disabled={mode === "add"}
                className="adv-add-btn w-full flex items-center justify-center gap-[6px] rounded-[8px] text-[14px] font-semibold cursor-pointer border-none font-[DM_Sans]"
                style={{
                  height: 40,
                  background: "#358C11",
                  color: "#ffffff",
                }}
              >
                <Plus size={14} strokeWidth={2.5} />
                Add New Advice
              </button>
            </div>
          </div>

          {/* ─── Right panel ─── */}
          <div className="flex-1 flex flex-col min-w-0">

            {mode === "view" && selected && (
              <>
                <div
                  className="flex items-center justify-between px-[22px] shrink-0"
                  style={{
                    borderBottom: "1px solid #eef0f4",
                    paddingTop: selected.isMine ? 15 : 17,
                    paddingBottom: selected.isMine ? 15 : 17,
                  }}
                >
                  <div className="flex items-center gap-[8px] min-w-0 flex-1">
                    <span
                      className="text-[15px] font-bold text-[#0F100F] truncate"
                      style={{ fontFamily: "Kalpurush, sans-serif" }}
                      title={selected.descBn}
                    >
                      {selected.descBn}
                    </span>
                  </div>
                  {selected.isMine ? (
                    <div className="flex items-center gap-[8px]">
                      <button
                        onClick={startEdit}
                        className="flex items-center gap-[4px] px-[10px] py-[6px] rounded-[6px] text-[13px] font-semibold cursor-pointer bg-transparent"
                        style={{ color: "#358C11", border: "1px solid #358C11" }}
                      >
                        <Pencil size={12} strokeWidth={2.5} /> Edit
                      </button>
                      <button
                        onClick={() => selectedId && setConfirmDeleteFor(selectedId)}
                        className="flex items-center gap-[4px] px-[10px] py-[6px] rounded-[6px] text-[13px] font-semibold cursor-pointer bg-transparent"
                        style={{ color: "#dc2626", border: "1px solid #fecaca" }}
                      >
                        <Trash2 size={12} strokeWidth={2.5} /> Delete
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center" style={{ height: 28 }}>
                      <span className="text-[12px] text-[#8c9198] italic">Read-only — added by system</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto adv-scroll px-[22px] py-[18px] flex flex-col gap-[16px]">
                  <div className="flex flex-col gap-[6px]">
                    <span className="text-[12px] font-semibold uppercase tracking-[0.4px] text-[#8c9198]">Description (English)</span>
                    <p className="text-[15px] leading-[1.7] text-[#0F100F]">
                      {selected.descEn}
                    </p>
                  </div>
                  <div style={{ height: 1, background: "#eef0f4" }} />
                  <div className="flex flex-col gap-[6px]">
                    <span className="text-[12px] font-semibold uppercase tracking-[0.4px] text-[#8c9198]">Description (Bengali)</span>
                    <p className="text-[15px] leading-[1.7] text-[#0F100F]" style={{ fontFamily: "Kalpurush, sans-serif" }}>
                      {selected.descBn}
                    </p>
                  </div>
                </div>
              </>
            )}

            {(mode === "edit" || mode === "add") && (
              <>
                <div className="flex items-center justify-between px-[22px] py-[14px] shrink-0" style={{ borderBottom: "1px solid #eef0f4" }}>
                  <span className="text-[16px] font-bold text-[#0F100F]">
                    {mode === "add" ? "Add New Advice" : "Edit Advice"}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto adv-scroll px-[22px] py-[18px] flex flex-col gap-[14px]">
                  <div className="flex flex-col gap-[6px]">
                    <label className="text-[13px] font-medium text-[#5a6070]">
                      Description (English)<span style={{ color: "#dc2626", marginLeft: 3 }}>*</span>
                    </label>
                    <textarea
                      placeholder="Write advice in English…"
                      value={formDescEn}
                      onChange={(e) => {
                        const v = e.target.value;
                        setFormDescEn(v);
                        const bn = fakeTranslateEnToBn(v);
                        if (bn) setFormDescBn(bn);
                      }}
                      rows={4}
                      className="adv-input"
                      style={{ ...inputFieldStyle, resize: "vertical", minHeight: 90 }}
                    />
                  </div>

                  <div className="flex flex-col gap-[6px]">
                    <label className="text-[13px] font-medium text-[#5a6070]">
                      Description (Bengali)<span style={{ color: "#dc2626", marginLeft: 3 }}>*</span>
                    </label>
                    <textarea
                      placeholder="বাংলায় পরামর্শ লিখুন…"
                      value={formDescBn}
                      onChange={(e) => {
                        const v = e.target.value;
                        setFormDescBn(v);
                        const en = fakeTranslateBnToEn(v);
                        if (en) setFormDescEn(en);
                      }}
                      rows={4}
                      className="adv-input"
                      style={{ ...inputFieldStyle, fontFamily: "Kalpurush, sans-serif", resize: "vertical", minHeight: 90 }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-[10px] px-[22px] py-[14px] shrink-0" style={{ borderTop: "1px solid #eef0f4", background: "#fafbfc" }}>
                  <button
                    onClick={cancelForm}
                    className="px-[18px] h-[36px] rounded-[8px] text-[14px] font-semibold cursor-pointer bg-transparent"
                    style={{ color: "#5a6070", border: "1px solid #e3e6eb" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (mode === "add") {
                        const id = `adv-${Date.now().toString(36)}`;
                        onAdd({ id, title: formDescEn.slice(0, 60), descEn: formDescEn, descBn: formDescBn, isMine: true });
                        setSelectedId(id);
                      } else if (selected) {
                        onEdit(selected.id, { descEn: formDescEn, descBn: formDescBn });
                      }
                      setMode("view");
                    }}
                    disabled={!canSave}
                    className="px-[22px] h-[36px] rounded-[8px] text-[14px] font-semibold text-white border-none"
                    style={{
                      background: canSave ? "#358C11" : "#c4c9d4",
                      opacity: canSave ? 1 : 0.8,
                      cursor: canSave ? "pointer" : "not-allowed",
                    }}
                  >
                    {mode === "add" ? "Save Advice" : "Save Changes"}
                  </button>
                </div>
              </>
            )}

            {/* Empty state */}
            {mode === "view" && !selected && (
              <div className="flex-1 flex flex-col items-center justify-center px-[40px] text-center">
                <div
                  className="flex items-center justify-center rounded-full mb-[18px]"
                  style={{ width: 72, height: 72, background: "#eaf5e3" }}
                >
                  <MessageSquareText size={32} style={{ color: "#358C11" }} />
                </div>
                <span className="text-[17px] font-bold text-[#0F100F] mb-[6px]">
                  Select an advice to view
                </span>
                <p className="text-[14px] text-[#8c9198] leading-[1.55] max-w-[320px]">
                  Pick an advice from the list on the left to see its full Bengali and English description, or add a new one of your own.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Delete confirmation ── */}
        {confirmTarget && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: "rgba(15,23,42,0.35)", borderRadius: 12 }}
          >
            <div
              className="bg-white rounded-[10px] shadow-xl flex flex-col overflow-hidden"
              style={{ width: 420, border: "1px solid #e3e6eb" }}
            >
              <div className="px-[22px] pt-[22px] pb-[6px] flex items-start gap-[12px]">
                <div
                  className="flex items-center justify-center rounded-full shrink-0"
                  style={{ width: 36, height: 36, background: "#fef2f2" }}
                >
                  <Trash2 size={17} style={{ color: "#dc2626" }} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[16px] font-bold text-[#0F100F]">
                    Delete this advice?
                  </span>
                  <p className="text-[14px] text-[#5a6070] mt-[4px] leading-[1.55]">
                    This advice will be permanently removed from your library. This can't be undone.
                  </p>
                  <p
                    className="text-[13px] text-[#5a6070] mt-[6px] leading-[1.45] truncate"
                    style={{ fontFamily: "Kalpurush, sans-serif" }}
                    title={confirmTarget.descBn}
                  >
                    "{confirmTarget.descBn}"
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-[8px] px-[22px] py-[14px] mt-[10px]" style={{ background: "#fafbfc", borderTop: "1px solid #eef0f4" }}>
                <button
                  onClick={() => setConfirmDeleteFor(null)}
                  className="px-[16px] h-[34px] rounded-[8px] text-[14px] font-semibold cursor-pointer bg-transparent"
                  style={{ color: "#5a6070", border: "1px solid #e3e6eb" }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (confirmDeleteFor) onDelete(confirmDeleteFor);
                    setConfirmDeleteFor(null);
                    setSelectedId(null);
                    setMode("view");
                  }}
                  className="flex items-center gap-[6px] px-[16px] h-[34px] rounded-[8px] text-[14px] font-semibold text-white cursor-pointer border-none"
                  style={{ background: "#dc2626" }}
                >
                  <Trash2 size={13} strokeWidth={2.5} />
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Save-as-Template (Test) Modal ──────────────────────────

type DraftTest =
  | {
      id: string;
      source: "library";
      panelName?: string;
      name: string;
      abbreviation: string;
      specimen?: string;
      method?: string;
      unit: string;
      ranges: TestRange[];
    }
  | { id: string; source: "freetext"; raw: string };


type FtTestFields = {
  panelName?: string;
  name: string;
  abbreviation: string;
  specimen?: string;
  method?: string;
  unit: string;
  ranges: TestRange[];
};

function SaveTestTemplateModal({ onClose, onSave, tests }: { onClose: () => void; onSave: (title: string) => void; tests: DraftTest[] }) {
  const [templateTitle, setTemplateTitle] = useState("");

  // Seed free-text drafts — Test Name starts empty so the doctor enters it
  // explicitly; the raw draft text is shown in the card header for context.
  const [ftFields, setFtFields] = useState<Record<string, FtTestFields>>(() => {
    const init: Record<string, FtTestFields> = {};
    for (const d of tests) {
      if (d.source === "freetext") {
        init[d.id] = {
          name: "",
          abbreviation: "",
          unit: "",
          ranges: [{ id: `ft-${d.id}-r0`, gender: undefined }],
        };
      }
    }
    return init;
  });

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExpanded = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  // Open-state map for per-card dropdowns (panel / specimen / method)
  const [openDrop, setOpenDrop] = useState<string | null>(null); // `{id}-panel` etc.
  const dropKey = (id: string, which: string) => `${id}-${which}`;
  const isOpen = (id: string, which: string) => openDrop === dropKey(id, which);
  const toggleDrop = (id: string, which: string) => {
    const key = dropKey(id, which);
    setOpenDrop((curr) => (curr === key ? null : key));
  };

  const setFt = (id: string, patch: Partial<FtTestFields>) =>
    setFtFields((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const addRangeFor = (id: string) =>
    setFtFields((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        ranges: [...prev[id].ranges, { id: `ft-${id}-r${Date.now()}` }],
      },
    }));
  const updateRangeFor = (id: string, rangeId: string, patch: Partial<TestRange>) =>
    setFtFields((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        ranges: prev[id].ranges.map((r) => (r.id === rangeId ? { ...r, ...patch } : r)),
      },
    }));
  const removeRangeFor = (id: string, rangeId: string) =>
    setFtFields((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        ranges: prev[id].ranges.filter((r) => r.id !== rangeId),
      },
    }));

  // Free-text rows now only require Test Name to be filled in.
  const isReady = (d: DraftTest) => {
    if (d.source === "library") return true;
    const f = ftFields[d.id];
    return !!f?.name.trim();
  };

  const completeCount = tests.filter(isReady).length;
  const canSave = templateTitle.trim() !== "" && tests.length > 0;

  const modalCss = `
    .stt-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
    .stt-scroll::-webkit-scrollbar-track { background: transparent; }
    .stt-scroll::-webkit-scrollbar-thumb { background: rgba(140,145,152,0.25); border-radius: 999px; }
    .stt-scroll::-webkit-scrollbar-thumb:hover { background: rgba(140,145,152,0.45); }
    .stt-scroll { scrollbar-width: thin; scrollbar-color: rgba(140,145,152,0.25) transparent; }
    .stt-input { transition: border-color 0.15s ease, box-shadow 0.15s ease; }
    .stt-input:focus { border-color: #358C11 !important; box-shadow: 0 0 0 3px rgba(53,140,17,0.12) !important; }
  `;

  const baseInput: React.CSSProperties = {
    background: "#ffffff",
    border: "1px solid #e3e6eb",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 14,
    color: "#0F100F",
    outline: "none",
    width: "100%",
  };

  const Pill = ({ label, bg, color }: { label: string; bg: string; color: string }) => (
    <span
      className="text-[10px] font-bold uppercase tracking-[0.4px] rounded-[3px]"
      style={{ background: bg, color, padding: "2px 6px 1px" }}
    >
      {label}
    </span>
  );

  // Inline dropdown (scoped to free-text card fields)
  const LocalDropdown = ({
    value,
    options,
    onChange,
    open,
    setOpenFn,
    placeholder,
  }: {
    value?: string;
    options: string[];
    onChange: (v: string) => void;
    open: boolean;
    setOpenFn: () => void;
    placeholder: string;
  }) => (
    <div className="relative">
      <button
        type="button"
        onClick={setOpenFn}
        className="flex items-center justify-between cursor-pointer stt-input"
        style={{
          ...baseInput,
          border: open ? "1px solid #358C11" : "1px solid #e3e6eb",
          boxShadow: open ? "0 0 0 3px rgba(53,140,17,0.12)" : "none",
        }}
      >
        <span style={{ color: value ? "#0F100F" : "#8c9198" }}>{value ?? placeholder}</span>
        <ChevronDown size={14} className="text-[#8c9198]" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={setOpenFn} />
          <div
            className="absolute left-0 right-0 rounded-[8px] bg-white overflow-hidden"
            style={{
              top: "calc(100% + 4px)",
              border: "1px solid #e3e6eb",
              boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
              zIndex: 20,
              maxHeight: 220,
              overflowY: "auto",
            }}
          >
            {options.map((opt) => {
              const isSel = opt === value;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => { onChange(opt); setOpenFn(); }}
                  className="w-full text-left px-[12px] py-[8px] text-[14px] cursor-pointer border-none flex items-center justify-between"
                  style={{
                    background: isSel ? "#f0f7ed" : "transparent",
                    color: isSel ? "#358C11" : "#0F100F",
                    fontWeight: isSel ? 600 : 400,
                  }}
                >
                  {opt}
                  {isSel && <Check size={13} style={{ color: "#358C11" }} strokeWidth={2.5} />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );

  const renderDraftRange = (r: TestRange, unit: string) => {
    if (!r.rangeMin && !r.rangeMax) return "";
    if (r.rangeMin && r.rangeMax) return `${r.rangeMin}–${r.rangeMax} ${unit}`;
    if (r.rangeMax) return `≤ ${r.rangeMax} ${unit}`;
    if (r.rangeMin) return `≥ ${r.rangeMin} ${unit}`;
    return "";
  };

  return (
    <div data-module="templates" className="fixed inset-0 z-50 flex items-center justify-center font-[DM_Sans]" style={{ background: "rgba(0,0,0,0.45)" }}>
      <style dangerouslySetInnerHTML={{ __html: modalCss }} />
      <div className="w-[820px] bg-white rounded-[12px] flex flex-col overflow-hidden shadow-2xl" style={{ height: 800, maxHeight: "calc(100vh - 32px)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-[20px] py-[10px] shrink-0" style={{ background: "#358C11" }}>
          <span className="text-[15px] font-semibold text-white">Save as Template</span>
          <button onClick={onClose} className="flex items-center justify-center w-[28px] h-[28px] rounded-[6px] text-white border-none cursor-pointer" style={{ background: "rgba(255,255,255,0.15)" }}>
            <X size={15} />
          </button>
        </div>

        {/* Scrollable body — Template Title, list header, and draft cards all scroll together */}
        <div
          className="overflow-y-auto stt-scroll flex flex-col"
          style={{ flex: "1 1 0", minHeight: 0, height: 0 }}
        >
          {/* Template Title */}
          <div className="px-[22px] pt-[14px] pb-[6px] shrink-0">
            <label className="text-[13px] font-medium text-[#5a6070]">
              Template Title<span style={{ color: "#dc2626", marginLeft: 3 }}>*</span>
            </label>
            <input
              type="text"
              value={templateTitle}
              onChange={(e) => setTemplateTitle(e.target.value)}
              placeholder="e.g. CBC + electrolytes admission panel"
              className="stt-input"
              style={{ ...baseInput, marginTop: 6, height: 40, padding: "0 14px" }}
            />
          </div>

          {/* List header */}
          <div className="flex items-center justify-between px-[22px] pt-[4px] pb-[4px] shrink-0">
            <span className="text-[13px] font-bold text-[#5a6070]">Tests</span>
            <span
              className="text-[12px] font-semibold"
              style={{ color: completeCount === tests.length ? "#2a7a0d" : "#dc2626" }}
            >
              {completeCount} / {tests.length} ready
            </span>
          </div>

          {/* List */}
          <div className="px-[22px] pt-[6px] pb-[12px] flex flex-col gap-[10px]">
          {tests.map((d) => {
            const ready = isReady(d);
            const open = expanded.has(d.id);
            return (
              <div
                key={d.id}
                className="rounded-[10px] overflow-hidden relative shrink-0"
                style={{
                  background: "#ffffff",
                  border: ready ? "1px solid #d5ebcb" : "1px solid #fde68a",
                }}
              >
                {/* Library — single-line summary (read-only, not clickable) */}
                {d.source === "library" && (
                  <div className="flex items-center justify-between gap-[10px] px-[14px] py-[12px] cursor-default">
                    <span className="text-[14px] text-[#0F100F] truncate flex-1 min-w-0">
                      <span className="font-semibold">{d.name}</span>
                      <span className="text-[#8c9198] font-normal"> · {d.abbreviation}</span>
                    </span>
                    <Pill label="From Library" bg="#eef0f4" color="#5a6070" />
                  </div>
                )}

                {/* Free-text form body */}
                {d.source === "freetext" && (
                  <>
                    <div className="flex items-center justify-between gap-[10px] px-[14px] py-[10px]" style={{ borderBottom: "1px solid #eef0f4", background: "#fffbeb" }}>
                      <span className="text-[13px] text-[#5a6070] truncate">
                        From your draft: <span className="font-semibold text-[#0F100F]">"{d.raw}"</span>
                      </span>
                      <Pill label="Needs Details" bg="#fef3c7" color="#92400e" />
                    </div>
                  <div className="px-[14px] pt-[12px] pb-[12px] flex flex-col gap-[10px]">
                    {/* Panel Name */}
                    <div className="flex flex-col gap-[4px]">
                      <label className="text-[12px] font-medium text-[#5a6070]">Panel Name</label>
                      <LocalDropdown
                        value={ftFields[d.id]?.panelName}
                        options={TEST_PANEL_OPTIONS}
                        onChange={(v) => setFt(d.id, { panelName: v })}
                        open={isOpen(d.id, "panel")}
                        setOpenFn={() => toggleDrop(d.id, "panel")}
                        placeholder="e.g. Complete Blood Count (CBC)"
                      />
                    </div>

                    {/* Test name + Abbreviation */}
                    <div className="grid grid-cols-2 gap-[10px]">
                      <div className="flex flex-col gap-[4px]">
                        <label className="text-[12px] font-medium text-[#5a6070]">
                          Test name<span style={{ color: "#dc2626", marginLeft: 3 }}>*</span>
                        </label>
                        <input
                          type="text"
                          value={ftFields[d.id]?.name ?? ""}
                          onChange={(e) => setFt(d.id, { name: e.target.value })}
                          placeholder="e.g. Haemoglobin"
                          className="stt-input"
                          style={{ ...baseInput, height: 36 }}
                        />
                      </div>
                      <div className="flex flex-col gap-[4px]">
                        <label className="text-[12px] font-medium text-[#5a6070]">Abbreviation</label>
                        <input
                          type="text"
                          value={ftFields[d.id]?.abbreviation ?? ""}
                          onChange={(e) => setFt(d.id, { abbreviation: e.target.value })}
                          placeholder="e.g. Hb"
                          className="stt-input"
                          style={{ ...baseInput, height: 36 }}
                        />
                      </div>
                    </div>

                    {/* Specimen | Method | Unit */}
                    <div className="grid grid-cols-3 gap-[10px]">
                      <div className="flex flex-col gap-[4px]">
                        <label className="text-[12px] font-medium text-[#5a6070]">Specimen</label>
                        <LocalDropdown
                          value={ftFields[d.id]?.specimen}
                          options={TEST_SPECIMEN_OPTIONS}
                          onChange={(v) => setFt(d.id, { specimen: v })}
                          open={isOpen(d.id, "spec")}
                          setOpenFn={() => toggleDrop(d.id, "spec")}
                          placeholder="Blood"
                        />
                      </div>
                      <div className="flex flex-col gap-[4px]">
                        <label className="text-[12px] font-medium text-[#5a6070]">Method</label>
                        <LocalDropdown
                          value={ftFields[d.id]?.method}
                          options={TEST_METHOD_OPTIONS}
                          onChange={(v) => setFt(d.id, { method: v })}
                          open={isOpen(d.id, "method")}
                          setOpenFn={() => toggleDrop(d.id, "method")}
                          placeholder="Chromogenic"
                        />
                      </div>
                      <div className="flex flex-col gap-[4px]">
                        <label className="text-[12px] font-medium text-[#5a6070]">Unit</label>
                        <input
                          type="text"
                          value={ftFields[d.id]?.unit ?? ""}
                          onChange={(e) => setFt(d.id, { unit: e.target.value })}
                          placeholder="g/dL"
                          className="stt-input"
                          style={{ ...baseInput, height: 36 }}
                        />
                      </div>
                    </div>

                    {/* Reference Ranges */}
                    <div
                      className="flex flex-col gap-[8px] rounded-[10px] px-[12px] py-[10px]"
                      style={{ background: "#F7F8FA", border: "1px solid #eef0f4" }}
                    >
                      <span className="text-[12px] font-semibold text-[#0F100F]">Reference Ranges</span>
                      {(ftFields[d.id]?.ranges ?? []).length > 0 && (
                        <>
                          <div className="grid grid-cols-[1fr_1fr_1fr_1fr_28px] gap-[6px] items-center">
                            <span className="text-[11px] font-semibold uppercase tracking-[0.3px] text-[#8c9198]">Gender</span>
                            <span className="text-[11px] font-semibold uppercase tracking-[0.3px] text-[#8c9198]">Age Group</span>
                            <span className="text-[11px] font-semibold uppercase tracking-[0.3px] text-[#8c9198]">Min</span>
                            <span className="text-[11px] font-semibold uppercase tracking-[0.3px] text-[#8c9198]">Max</span>
                            <span />
                          </div>
                          {(ftFields[d.id]?.ranges ?? []).map((r) => (
                            <div key={r.id} className="grid grid-cols-[1fr_1fr_1fr_1fr_28px] gap-[6px] items-center">
                              <select
                                value={r.gender ?? ""}
                                onChange={(e) => updateRangeFor(d.id, r.id, { gender: (e.target.value || undefined) as TestGender | undefined })}
                                className="stt-input w-full text-[13px] text-[#0F100F] outline-none font-[DM_Sans] appearance-none cursor-pointer"
                                style={{ height: 32, padding: "0 8px", background: "#ffffff", border: "1px solid #e3e6eb", borderRadius: 6, minWidth: 0 }}
                              >
                                <option value="">All</option>
                                {TEST_GENDER_OPTIONS.map((g) => (<option key={g} value={g}>{g}</option>))}
                              </select>
                              <input
                                type="text"
                                placeholder="Adult"
                                value={r.ageGroup ?? ""}
                                onChange={(e) => updateRangeFor(d.id, r.id, { ageGroup: e.target.value })}
                                className="stt-input w-full text-[13px] text-[#0F100F] outline-none font-[DM_Sans]"
                                style={{ height: 32, padding: "0 8px", background: "#ffffff", border: "1px solid #e3e6eb", borderRadius: 6, minWidth: 0 }}
                              />
                              <input
                                type="text"
                                placeholder="12"
                                value={r.rangeMin ?? ""}
                                onChange={(e) => updateRangeFor(d.id, r.id, { rangeMin: e.target.value })}
                                className="stt-input w-full text-[13px] text-[#0F100F] outline-none font-[DM_Sans]"
                                style={{ height: 32, padding: "0 8px", background: "#ffffff", border: "1px solid #e3e6eb", borderRadius: 6, minWidth: 0 }}
                              />
                              <input
                                type="text"
                                placeholder="16"
                                value={r.rangeMax ?? ""}
                                onChange={(e) => updateRangeFor(d.id, r.id, { rangeMax: e.target.value })}
                                className="stt-input w-full text-[13px] text-[#0F100F] outline-none font-[DM_Sans]"
                                style={{ height: 32, padding: "0 8px", background: "#ffffff", border: "1px solid #e3e6eb", borderRadius: 6, minWidth: 0 }}
                              />
                              <button
                                type="button"
                                onClick={() => removeRangeFor(d.id, r.id)}
                                aria-label="Remove range"
                                className="flex items-center justify-center rounded-[6px] cursor-pointer border-none"
                                style={{ width: 28, height: 28, background: "transparent", color: "#dc2626" }}
                              >
                                <Trash2 size={12} strokeWidth={2.5} />
                              </button>
                            </div>
                          ))}
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => addRangeFor(d.id)}
                        className="self-start flex items-center gap-[4px] text-[12px] font-semibold cursor-pointer bg-transparent border-none mt-[2px]"
                        style={{ color: "#358C11" }}
                      >
                        <Plus size={11} strokeWidth={2.5} /> Add another range
                      </button>
                    </div>
                  </div>
                  </>
                )}
              </div>
            );
          })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-[22px] py-[14px] shrink-0 flex items-center justify-between gap-[16px]" style={{ borderTop: "1px solid #eef0f4", background: "#fafbfc" }}>
          <p className="text-[12px] text-[#5a6070] leading-[1.5] flex-1">
            New tests added here will also be added to your <span className="font-semibold text-[#0F100F]">personalized test</span> library.
          </p>
          <div className="flex items-center gap-[8px] shrink-0">
            <button
              onClick={onClose}
              className="px-[16px] h-[34px] rounded-[8px] text-[14px] font-semibold cursor-pointer bg-transparent"
              style={{ color: "#5a6070", border: "1px solid #e3e6eb" }}
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(templateTitle)}
              disabled={!canSave}
              className="px-[18px] h-[34px] rounded-[8px] text-[14px] font-semibold text-white border-none"
              style={{
                background: canSave ? "#358C11" : "#c4c9d4",
                opacity: canSave ? 1 : 0.8,
                cursor: canSave ? "pointer" : "not-allowed",
              }}
            >
              Save Template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Save-as-Template (Advice) Modal ─────────────────────────

// Mock list shown by the Save-as-Template / Save-Overall-Template modals.
// Library entries carry full bilingual descriptions; free-text entries carry
// the doctor's typed string (which may be either language).
type DraftAdvice =
  | { id: string; source: "library"; title: string; descEn: string; descBn: string }
  | { id: string; source: "freetext"; title: string };


// Bengali character range: detect whether a string is primarily Bangla.
const isBengaliText = (s: string) => /[ঀ-৿]/.test(s);

// Per-item form scaffold used by the (still-existing) Save-Overall-Template
// modal's Advice tab.
type FtField = { title: string; descEn: string; descBn: string };

function SaveAdviceTemplateModal({ onClose, onSave, advices }: { onClose: () => void; onSave: (title: string) => void; advices: DraftAdvice[] }) {
  const [templateTitle, setTemplateTitle] = useState("");
  const canSave = templateTitle.trim() !== "" && advices.length > 0;

  const modalCss = `
    .sat-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
    .sat-scroll::-webkit-scrollbar-track { background: transparent; }
    .sat-scroll::-webkit-scrollbar-thumb { background: rgba(140,145,152,0.25); border-radius: 999px; }
    .sat-scroll::-webkit-scrollbar-thumb:hover { background: rgba(140,145,152,0.45); }
    .sat-scroll { scrollbar-width: thin; scrollbar-color: rgba(140,145,152,0.25) transparent; }
    .sat-input { transition: border-color 0.15s ease, box-shadow 0.15s ease; }
    .sat-input:focus {
      border-color: #358C11 !important;
      box-shadow: 0 0 0 3px rgba(53, 140, 17, 0.12) !important;
    }
  `;

  const baseInput: React.CSSProperties = {
    background: "#ffffff",
    border: "1px solid #e3e6eb",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 14,
    color: "#0F100F",
    outline: "none",
    width: "100%",
  };

  const Pill = ({ label, bg, color }: { label: string; bg: string; color: string }) => (
    <span
      className="text-[10px] font-bold uppercase tracking-[0.4px] rounded-[3px]"
      style={{ background: bg, color, padding: "2px 6px 1px" }}
    >
      {label}
    </span>
  );

  return (
    <div data-module="templates" className="fixed inset-0 z-50 flex items-center justify-center font-[DM_Sans]" style={{ background: "rgba(0,0,0,0.45)" }}>
      <style dangerouslySetInnerHTML={{ __html: modalCss }} />
      <div className="w-[640px] bg-white rounded-[12px] flex flex-col overflow-hidden shadow-2xl" style={{ height: 640, maxHeight: "calc(100vh - 32px)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-[20px] py-[10px] shrink-0" style={{ background: "#358C11" }}>
          <span className="text-[15px] font-semibold text-white">Save as Template</span>
          <button onClick={onClose} className="flex items-center justify-center w-[28px] h-[28px] rounded-[6px] text-white border-none cursor-pointer" style={{ background: "rgba(255,255,255,0.15)" }}>
            <X size={15} />
          </button>
        </div>

        {/* Template Title (sticky on top of scrollable list) */}
        <div className="px-[22px] pt-[14px] pb-[12px] shrink-0" style={{ borderBottom: "1px solid #eef0f4" }}>
          <label className="text-[13px] font-medium text-[#5a6070]">
            Template Title<span style={{ color: "#dc2626", marginLeft: 3 }}>*</span>
          </label>
          <input
            type="text"
            value={templateTitle}
            onChange={(e) => setTemplateTitle(e.target.value)}
            placeholder="e.g. Hypertension post-visit advice"
            className="sat-input"
            style={{ ...baseInput, marginTop: 6, height: 40, padding: "0 14px" }}
          />
        </div>

        {/* Advice list (read-only, both BN + EN visible) */}
        <div className="flex-1 min-h-0 overflow-y-auto sat-scroll px-[22px] py-[14px]">
          <div className="flex items-center justify-between mb-[10px]">
            <span className="text-[13px] font-bold text-[#5a6070]">Advices</span>
            <span className="text-[12px] text-[#8c9198]">{advices.length} item{advices.length === 1 ? "" : "s"}</span>
          </div>
          <div className="flex flex-col gap-[10px]">
            {advices.map((a) => {
              // Free-text entries arrive in only one language. Use the
              // page-level default fallback for the other side so each card
              // always shows both BN and EN lines.
              const DEFAULT_EN = "This is translated advice";
              const DEFAULT_BN = "এটা ট্রান্সলেটেড উপদেশ";
              const bn = a.source === "library"
                ? a.descBn
                : (isBengaliText(a.title) ? a.title : DEFAULT_BN);
              const en = a.source === "library"
                ? a.descEn
                : (isBengaliText(a.title) ? DEFAULT_EN : a.title);
              return (
                <div
                  key={a.id}
                  className="rounded-[10px] px-[14px] py-[12px]"
                  style={{ background: "#ffffff", border: "1px solid #e3e6eb" }}
                >
                  <div className="flex items-start justify-between gap-[10px] mb-[6px]">
                    <p
                      className="text-[14px] font-semibold text-[#0F100F] leading-[1.55] flex-1 min-w-0"
                      style={{ fontFamily: "Kalpurush, sans-serif" }}
                    >
                      {bn}
                    </p>
                    <Pill
                      label={a.source === "library" ? "From Library" : "Free Text"}
                      bg={a.source === "library" ? "#eef0f4" : "#fef3c7"}
                      color={a.source === "library" ? "#5a6070" : "#92400e"}
                    />
                  </div>
                  <p className="text-[13px] text-[#5a6070] leading-[1.55]">
                    {en}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-[22px] py-[14px] shrink-0 flex items-center justify-end gap-[8px]" style={{ borderTop: "1px solid #eef0f4", background: "#fafbfc" }}>
          <button
            onClick={onClose}
            className="px-[16px] h-[34px] rounded-[8px] text-[14px] font-semibold cursor-pointer bg-transparent"
            style={{ color: "#5a6070", border: "1px solid #e3e6eb" }}
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(templateTitle)}
            disabled={!canSave}
            className="px-[18px] h-[34px] rounded-[8px] text-[14px] font-semibold text-white border-none"
            style={{
              background: canSave ? "#358C11" : "#c4c9d4",
              opacity: canSave ? 1 : 0.8,
              cursor: canSave ? "pointer" : "not-allowed",
            }}
          >
            Save Template
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Save-as-Template (Treatment) Modal ─────────────────────

type DraftMedicine =
  | {
      id: string;
      source: "library";
      brandName: string;
      genericName: string;
      drugClass: string;
      manufacturer: string;
      doseForm: string;
      strength: string;
      schedule: string;
      doseBn: string;
    }
  | { id: string; source: "freetext"; raw: string };


type FtMedicineFields = {
  brandName: string;
  genericName: string;
  drugClass?: string;
  manufacturer?: string;
  doseForm?: string;
  strength: string;
  schedule: string;
  doseBn: string;
  // When `doseForm` maps onto a V2 medicine form, `schemaValues` is the
  // source of truth for the dose's schema-driven fields (DOSAGE_UNIT,
  // FREQUENCY, MEAL_TIMING, DURATION, NOTE, …).
  schemaValues?: Partial<Record<V2FieldType, string>>;
};

function SaveTreatmentTemplateModal({ onClose, onSave, medicines }: { onClose: () => void; onSave: (title: string) => void; medicines: DraftMedicine[] }) {
  const [templateTitle, setTemplateTitle] = useState("");

  // Seed free-text drafts — all fields start empty so the doctor enters
  // them explicitly; the raw draft text is shown in the card header for context.
  const [ftFields, setFtFields] = useState<Record<string, FtMedicineFields>>(() => {
    const init: Record<string, FtMedicineFields> = {};
    for (const m of medicines) {
      if (m.source === "freetext") {
        init[m.id] = {
          brandName: "",
          genericName: "",
          drugClass: undefined,
          manufacturer: undefined,
          doseForm: undefined,
          strength: "",
          schedule: "",
          doseBn: "",
        };
      }
    }
    return init;
  });

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExpanded = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Per-card dropdown open state (class / dose-form / manufacturer)
  const [openDrop, setOpenDrop] = useState<string | null>(null);
  const dropKey = (id: string, which: string) => `${id}-${which}`;
  const isOpen = (id: string, which: string) => openDrop === dropKey(id, which);
  const toggleDrop = (id: string, which: string) => {
    const key = dropKey(id, which);
    setOpenDrop((curr) => (curr === key ? null : key));
  };

  const setFt = (id: string, patch: Partial<FtMedicineFields>) =>
    setFtFields((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  // Free-text rows now only require Brand Name to be filled in.
  const isReady = (m: DraftMedicine) => {
    if (m.source === "library") return true;
    const f = ftFields[m.id];
    return !!f?.brandName.trim();
  };

  const completeCount = medicines.filter(isReady).length;
  const canSave = templateTitle.trim() !== "" && medicines.length > 0;

  const modalCss = `
    .srx-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
    .srx-scroll::-webkit-scrollbar-track { background: transparent; }
    .srx-scroll::-webkit-scrollbar-thumb { background: rgba(140,145,152,0.25); border-radius: 999px; }
    .srx-scroll::-webkit-scrollbar-thumb:hover { background: rgba(140,145,152,0.45); }
    .srx-scroll { scrollbar-width: thin; scrollbar-color: rgba(140,145,152,0.25) transparent; }
    .srx-input { transition: border-color 0.15s ease, box-shadow 0.15s ease; }
    .srx-input:focus { border-color: #358C11 !important; box-shadow: 0 0 0 3px rgba(53,140,17,0.12) !important; }
  `;

  const baseInput: React.CSSProperties = {
    background: "#ffffff",
    border: "1px solid #e3e6eb",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 14,
    color: "#0F100F",
    outline: "none",
    width: "100%",
  };

  const Pill = ({ label, bg, color }: { label: string; bg: string; color: string }) => (
    <span
      className="text-[10px] font-bold uppercase tracking-[0.4px] rounded-[3px]"
      style={{ background: bg, color, padding: "2px 6px 1px" }}
    >
      {label}
    </span>
  );

  const LocalDropdown = ({
    value,
    options,
    onChange,
    open,
    setOpenFn,
    placeholder,
  }: {
    value?: string;
    options: string[];
    onChange: (v: string) => void;
    open: boolean;
    setOpenFn: () => void;
    placeholder: string;
  }) => {
    const btnRef = useRef<HTMLButtonElement>(null);
    const pos = useFloatingPanelPos(open, btnRef);
    return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={setOpenFn}
        className="flex items-center justify-between cursor-pointer srx-input"
        style={{
          ...baseInput,
          height: 36,
          border: open ? "1px solid #358C11" : "1px solid #e3e6eb",
          boxShadow: open ? "0 0 0 3px rgba(53,140,17,0.12)" : "none",
        }}
      >
        <span style={{ color: value ? "#0F100F" : "#8c9198" }}>{value ?? placeholder}</span>
        <ChevronDown size={14} className="text-[#8c9198]" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </button>
      {open && pos && createPortal(
        <>
          <div className="fixed inset-0" style={{ zIndex: 9999 }} onClick={setOpenFn} />
          <div
            className="rounded-[8px] bg-white overflow-hidden"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: pos.width,
              border: "1px solid #e3e6eb",
              boxShadow: pos.openUp ? "0 -8px 24px rgba(15,23,42,0.10)" : "0 8px 24px rgba(15,23,42,0.10)",
              zIndex: 10000,
              maxHeight: pos.maxHeight,
              overflowY: "auto",
            }}
          >
            {options.map((opt) => {
              const isSel = opt === value;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => { onChange(opt); setOpenFn(); }}
                  className="w-full text-left px-[12px] py-[8px] text-[14px] cursor-pointer border-none flex items-center justify-between"
                  style={{
                    background: isSel ? "#f0f7ed" : "transparent",
                    color: isSel ? "#358C11" : "#0F100F",
                    fontWeight: isSel ? 600 : 400,
                  }}
                >
                  {opt}
                  {isSel && <Check size={13} style={{ color: "#358C11" }} strokeWidth={2.5} />}
                </button>
              );
            })}
          </div>
        </>,
        document.body,
      )}
    </div>
    );
  };

  return (
    <div data-module="templates" className="fixed inset-0 z-50 flex items-center justify-center font-[DM_Sans]" style={{ background: "rgba(0,0,0,0.45)" }}>
      <style dangerouslySetInnerHTML={{ __html: modalCss }} />
      <div className="w-[820px] bg-white rounded-[12px] flex flex-col overflow-hidden shadow-2xl" style={{ height: 800, maxHeight: "calc(100vh - 32px)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-[20px] py-[10px] shrink-0" style={{ background: "#358C11" }}>
          <span className="text-[15px] font-semibold text-white">Save as Template</span>
          <button onClick={onClose} className="flex items-center justify-center w-[28px] h-[28px] rounded-[6px] text-white border-none cursor-pointer" style={{ background: "rgba(255,255,255,0.15)" }}>
            <X size={15} />
          </button>
        </div>

        {/* Scrollable body */}
        <div
          className="overflow-y-auto srx-scroll flex flex-col"
          style={{ flex: "1 1 0", minHeight: 0, height: 0 }}
        >
          {/* Template Title */}
          <div className="px-[22px] pt-[14px] pb-[6px] shrink-0">
            <label className="text-[13px] font-medium text-[#5a6070]">
              Template Title<span style={{ color: "#dc2626", marginLeft: 3 }}>*</span>
            </label>
            <input
              type="text"
              value={templateTitle}
              onChange={(e) => setTemplateTitle(e.target.value)}
              placeholder="e.g. Hypertension — first line"
              className="srx-input"
              style={{ ...baseInput, marginTop: 6, height: 40, padding: "0 14px" }}
            />
          </div>

          {/* List header */}
          <div className="flex items-center justify-between px-[22px] pt-[4px] pb-[4px] shrink-0">
            <span className="text-[13px] font-bold text-[#5a6070]">Medicines</span>
            <span
              className="text-[12px] font-semibold"
              style={{ color: completeCount === medicines.length ? "#2a7a0d" : "#dc2626" }}
            >
              {completeCount} / {medicines.length} ready
            </span>
          </div>

          {/* List */}
          <div className="px-[22px] pt-[6px] pb-[12px] flex flex-col gap-[10px]">
            {medicines.map((m) => {
              const ready = isReady(m);
              const open = expanded.has(m.id);
              return (
                <div
                  key={m.id}
                  className="rounded-[10px] overflow-hidden relative shrink-0"
                  style={{
                    background: "#ffffff",
                    border: ready ? "1px solid #d5ebcb" : "1px solid #fde68a",
                  }}
                >
                  {/* Library accordion header */}
                  {m.source === "library" && (
                    <div
                      onClick={() => toggleExpanded(m.id)}
                      className="flex items-center justify-between gap-[10px] px-[14px] py-[12px] cursor-pointer"
                    >
                      <span className="text-[14px] font-semibold text-[#0F100F] truncate">
                        {m.brandName} <span className="text-[#8c9198] font-normal">· {m.strength}</span>
                        <span className="text-[#8c9198] font-normal"> · {m.genericName}</span>
                      </span>
                      <div className="flex items-center gap-[8px] shrink-0">
                        <Pill label="From Library" bg="#eef0f4" color="#5a6070" />
                        <ChevronDown
                          size={14}
                          className="text-[#8c9198]"
                          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Library body (read-only details) */}
                  {m.source === "library" && open && (
                    <div className="px-[14px] pb-[12px] flex flex-col gap-[10px]" style={{ borderTop: "1px solid #eef0f4", paddingTop: 10 }}>
                      <div className="grid grid-cols-3 gap-x-[12px] gap-y-[10px] px-[2px]">
                        <div className="flex flex-col min-w-0">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.4px] text-[#8c9198]">Generic Name</span>
                          <span className="text-[13px] text-[#0F100F] truncate">{m.genericName}</span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.4px] text-[#8c9198]">Drug Class</span>
                          <span className="text-[13px] text-[#0F100F] truncate">{m.drugClass}</span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.4px] text-[#8c9198]">Manufacturer</span>
                          <span className="text-[13px] text-[#0F100F] truncate">{m.manufacturer}</span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.4px] text-[#8c9198]">Dose Form</span>
                          <span className="text-[13px] text-[#0F100F] truncate">{m.doseForm}</span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.4px] text-[#8c9198]">Strength</span>
                          <span className="text-[13px] text-[#0F100F] truncate">{m.strength}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-[4px] px-[2px]" style={{ borderTop: "1px dashed #eef0f4", paddingTop: 10 }}>
                        <span className="text-[11px] font-semibold uppercase tracking-[0.4px] text-[#8c9198]">Dose</span>
                        <div className="flex items-baseline gap-[8px] flex-wrap">
                          <span
                            className="text-[13px] font-bold text-[#358C11] shrink-0 rounded-[4px]"
                            style={{ background: "#eaf5e3", padding: "2px 8px" }}
                          >
                            {m.schedule}
                          </span>
                          <p className="text-[15px] text-[#0F100F] leading-[1.7]" style={{ fontFamily: "Kalpurush, sans-serif" }}>
                            {m.doseBn}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Free-text card — always open form */}
                  {m.source === "freetext" && (
                    <>
                      <div className="flex items-center justify-between gap-[10px] px-[14px] py-[10px]" style={{ borderBottom: "1px solid #eef0f4", background: "#fffbeb" }}>
                        <span className="text-[13px] text-[#5a6070] truncate">
                          From your draft: <span className="font-semibold text-[#0F100F]">"{m.raw}"</span>
                        </span>
                        <Pill label="Needs Details" bg="#fef3c7" color="#92400e" />
                      </div>

                      <div className="px-[14px] py-[12px] flex flex-col gap-[10px]">
                        {/* Brand Name | Generic Name */}
                        <div className="grid grid-cols-2 gap-[10px]">
                          <div className="flex flex-col gap-[4px]">
                            <label className="text-[12px] font-medium text-[#5a6070]">
                              Brand Name<span style={{ color: "#dc2626", marginLeft: 3 }}>*</span>
                            </label>
                            <input
                              type="text"
                              value={ftFields[m.id]?.brandName ?? ""}
                              onChange={(e) => setFt(m.id, { brandName: e.target.value })}
                              placeholder="e.g. Ambrotex"
                              className="srx-input"
                              style={{ ...baseInput, height: 36 }}
                            />
                          </div>
                          <div className="flex flex-col gap-[4px]">
                            <label className="text-[12px] font-medium text-[#5a6070]">Generic Name</label>
                            <input
                              type="text"
                              value={ftFields[m.id]?.genericName ?? ""}
                              onChange={(e) => setFt(m.id, { genericName: e.target.value })}
                              placeholder="e.g. Ambroxol"
                              className="srx-input"
                              style={{ ...baseInput, height: 36 }}
                            />
                          </div>
                        </div>

                        {/* Drug Class | Manufacturer */}
                        <div className="grid grid-cols-2 gap-[10px]">
                          <div className="flex flex-col gap-[4px]">
                            <label className="text-[12px] font-medium text-[#5a6070]">Drug Class</label>
                            <LocalDropdown
                              value={ftFields[m.id]?.drugClass}
                              options={DRUG_CLASS_OPTIONS}
                              onChange={(v) => setFt(m.id, { drugClass: v })}
                              open={isOpen(m.id, "class")}
                              setOpenFn={() => toggleDrop(m.id, "class")}
                              placeholder="Select class"
                            />
                          </div>
                          <div className="flex flex-col gap-[4px]">
                            <label className="text-[12px] font-medium text-[#5a6070]">Manufacturer</label>
                            <LocalDropdown
                              value={ftFields[m.id]?.manufacturer}
                              options={DRUG_MANUFACTURER_OPTIONS}
                              onChange={(v) => setFt(m.id, { manufacturer: v })}
                              open={isOpen(m.id, "mfg")}
                              setOpenFn={() => toggleDrop(m.id, "mfg")}
                              placeholder="Select manufacturer"
                            />
                          </div>
                        </div>

                        {/* Dose Form | Strength */}
                        <div className="grid grid-cols-2 gap-[10px]">
                          <div className="flex flex-col gap-[4px]">
                            <label className="text-[12px] font-medium text-[#5a6070]">Dose Form</label>
                            <LocalDropdown
                              value={ftFields[m.id]?.doseForm}
                              options={DRUG_DOSE_FORM_OPTIONS}
                              onChange={(v) => setFt(m.id, { doseForm: v })}
                              open={isOpen(m.id, "form")}
                              setOpenFn={() => toggleDrop(m.id, "form")}
                              placeholder="Select dose form"
                            />
                          </div>
                          <div className="flex flex-col gap-[4px]">
                            <label className="text-[12px] font-medium text-[#5a6070]">Strength</label>
                            <input
                              type="text"
                              value={ftFields[m.id]?.strength ?? ""}
                              onChange={(e) => setFt(m.id, { strength: e.target.value })}
                              placeholder="e.g. 500 mg"
                              className="srx-input"
                              style={{ ...baseInput, height: 36 }}
                            />
                          </div>
                        </div>

                        {/* Schema-driven dose fields — render once a Dose Form
                            is picked; otherwise show a hint. Dose Short and
                            Dose (Bengali) removed per design. */}
                        {(() => {
                          const v2Form = v2FormFromLabel(ftFields[m.id]?.doseForm);
                          const schema = v2Form ? V2_SCHEMA_BY_FORM[v2Form] : null;
                          if (!v2Form || !schema) {
                            return (
                              <div className="text-[13px] italic" style={{ color: "#8c9198", padding: "6px 2px" }}>
                                Pick a Dose Form above to add the dose details.
                              </div>
                            );
                          }
                          const setSchemaValue = (field: V2FieldType, v: string) => {
                            setFt(m.id, {
                              schemaValues: { ...(ftFields[m.id]?.schemaValues ?? {}), [field]: v },
                            });
                          };
                          return (
                            <div className="grid grid-cols-2 gap-[8px]">
                              {schema.map((fieldType) => {
                                const value = ftFields[m.id]?.schemaValues?.[fieldType] ?? "";
                                const isNote = fieldType === "NOTE";
                                const cellClass = isNote ? "col-span-2 flex flex-col gap-[4px]" : "flex flex-col gap-[4px]";
                                const label = V2_FIELD_LABELS[fieldType];
                                return (
                                  <div key={fieldType} className={cellClass}>
                                    <label className="text-[12px] font-medium text-[#5a6070]">{label}</label>
                                    {isNote ? (
                                      <SchemaNoteField
                                        value={value}
                                        placeholder={label}
                                        onChange={(v) => setSchemaValue(fieldType, v)}
                                        baseInput={baseInput}
                                      />
                                    ) : (
                                      <SchemaFieldCombobox
                                        value={value}
                                        placeholder={label}
                                        options={getOptionsForField(fieldType, v2Form)}
                                        onChange={(v) => setSchemaValue(fieldType, v)}
                                        baseInput={baseInput}
                                      />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-[22px] py-[14px] shrink-0 flex items-center justify-between gap-[16px]" style={{ borderTop: "1px solid #eef0f4", background: "#fafbfc" }}>
          <p className="text-[12px] text-[#5a6070] leading-[1.5] flex-1">
            New medicines added here will also be added to your <span className="font-semibold text-[#0F100F]">personalized drug</span> library.
          </p>
          <div className="flex items-center gap-[8px] shrink-0">
            <button
              onClick={onClose}
              className="px-[16px] h-[34px] rounded-[8px] text-[14px] font-semibold cursor-pointer bg-transparent"
              style={{ color: "#5a6070", border: "1px solid #e3e6eb" }}
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(templateTitle)}
              disabled={!canSave}
              className="px-[18px] h-[34px] rounded-[8px] text-[14px] font-semibold text-white border-none"
              style={{
                background: canSave ? "#358C11" : "#c4c9d4",
                opacity: canSave ? 1 : 0.8,
                cursor: canSave ? "pointer" : "not-allowed",
              }}
            >
              Save Template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Save-as-Overall-Template Modal ─────────────────────────
// Lets the doctor capture the WHOLE current prescription (Chief Complaints,
// Treatment, Tests, Advice) into one reusable template — with per-section
// include toggles and per-item checkboxes so they can prune what gets saved.

type OvSectionKey =
  | "chief"
  | "treatment"
  | "physical"
  | "tests"
  | "advice"
  | "diagnosis"
  | "drugHistory"
  | "note"
  | "followUp";

// Tab serial: C/C → Findings → Test → Treatment → Diagnosis → Advice →
// Drug Hx → Note → F/U & Refer. Labels are short forms so the strip fits
// without horizontal scroll. Object key order = render order (iterated via
// Object.keys below).
const OV_TAB_LABELS: Record<OvSectionKey, string> = {
  chief: "C/C",
  physical: "Findings",
  tests: "Test",
  treatment: "Treatment",
  diagnosis: "Diagnosis",
  advice: "Advice",
  drugHistory: "Drug Hx",
  note: "Note",
  followUp: "F/U & Refer",
};

// Mock data for the new tabs added in the redesign — kept inline so the
// modal stays self-contained (same pattern as medicines / tests).





// Sub-sections for the C/C tab. Static drafts so the Save-as-Template
// preview always has content regardless of what's in the live prescription.


function SaveOverallTemplateModal({
  onClose,
  onSave,
  medicines,
  tests,
  advices,
  physical,
  diagnoses,
  drugHistory,
  notes,
  followUp,
  chiefComplaints,
  chiefHistory,
  chiefSummary,
}: {
  onClose: () => void;
  onSave: (title: string) => void;
  medicines: DraftMedicine[];
  tests: DraftTest[];
  advices: DraftAdvice[];
  physical: { id: string; label: string; value?: string }[];
  diagnoses: { id: string; text: string }[];
  drugHistory: { id: string; text: string }[];
  notes: { id: string; text: string }[];
  followUp: { id: string; text: string }[];
  chiefComplaints: { id: string; text: string; remark?: string }[];
  chiefHistory: { id: string; text: string; remark?: string }[];
  chiefSummary: string;
}) {
  const [title, setTitle] = useState("");

  // Chief Complaints stay tied to the live Rx — always library, never need
  // extra details. Treatment / Tests / Advice tabs reuse the richer
  // medicines / tests / advices data (mix of library +
  // free-text drafts) so their content matches each section's own
  // Save-as-Template modal exactly.
  // Use the static chiefComplaints draft (not the live `complaints`
  // array, which starts empty in the patient-selection flow) so the modal
  // preview always shows a meaningful Present Complaints row.
  const chiefItems = chiefComplaints.map((c) => ({
    id: c.id,
    text: c.text,
    remark: c.remark,
  }));

  // ─── Section ON/OFF + per-item picked sets ────────────────
  const [sectionOn, setSectionOn] = useState<Record<OvSectionKey, boolean>>({
    chief: true, treatment: true, physical: true, tests: true,
    advice: true, diagnosis: true, drugHistory: true, note: true, followUp: true,
  });
  const [pickedChief, setPickedChief] = useState<Set<string>>(new Set(chiefItems.map((i) => i.id)));
  const [pickedMed, setPickedMed] = useState<Set<string>>(new Set(medicines.map((m) => m.id)));
  const [pickedTest, setPickedTest] = useState<Set<string>>(new Set(tests.map((t) => t.id)));
  const [pickedAdv, setPickedAdv] = useState<Set<string>>(new Set(advices.map((a) => a.id)));
  const [pickedPhysical, setPickedPhysical] = useState<Set<string>>(new Set(physical.map((p) => p.id)));
  const [pickedDx, setPickedDx] = useState<Set<string>>(new Set(diagnoses.map((d) => d.id)));
  const [pickedDrugHistory, setPickedDrugHistory] = useState<Set<string>>(new Set(drugHistory.map((d) => d.id)));
  const [pickedNote, setPickedNote] = useState<Set<string>>(new Set(notes.map((n) => n.id)));
  const [pickedFollowUp, setPickedFollowUp] = useState<Set<string>>(new Set(followUp.map((f) => f.id)));

  // ─── Free-text form data (per section, mirroring section modals) ─
  const [ftMed, setFtMed] = useState<Record<string, FtMedicineFields>>(() => {
    const init: Record<string, FtMedicineFields> = {};
    for (const m of medicines) {
      if (m.source === "freetext") {
        init[m.id] = {
          brandName: "", genericName: "",
          drugClass: undefined, manufacturer: undefined, doseForm: undefined,
          strength: "", schedule: "", doseBn: "",
        };
      }
    }
    return init;
  });
  const [ftTest, setFtTest] = useState<Record<string, FtTestFields>>(() => {
    const init: Record<string, FtTestFields> = {};
    for (const d of tests) {
      if (d.source === "freetext") {
        init[d.id] = {
          name: "",
          abbreviation: "",
          unit: "",
          ranges: [{ id: `ov-${d.id}-r0`, gender: undefined }],
        };
      }
    }
    return init;
  });
  const [ftAdv, setFtAdv] = useState<Record<string, FtField>>(() => {
    const init: Record<string, FtField> = {};
    for (const a of advices) {
      if (a.source === "freetext") {
        const bn = isBengaliText(a.title);
        init[a.id] = {
          title: "",
          descEn: bn ? "" : a.title,
          descBn: bn ? a.title : "",
        };
      }
    }
    return init;
  });

  // Library accordion expansion (per item id, across all sections)
  const [libExpanded, setLibExpanded] = useState<Set<string>>(new Set());
  const toggleLib = (id: string) =>
    setLibExpanded((p) => {
      const next = new Set(p);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Active tab
  const [activeTab, setActiveTab] = useState<OvSectionKey>("chief");

  // ─── Toggle helpers ─────────────────────────────────────────
  const toggleSection = (k: OvSectionKey) => {
    const nextOn = !sectionOn[k];
    setSectionOn({ ...sectionOn, [k]: nextOn });
    if (nextOn) {
      // Re-select everything when section turns back on
      if (k === "chief") setPickedChief(new Set(chiefItems.map((i) => i.id)));
      if (k === "treatment") setPickedMed(new Set(medicines.map((m) => m.id)));
      if (k === "tests") setPickedTest(new Set(tests.map((t) => t.id)));
      if (k === "advice") setPickedAdv(new Set(advices.map((a) => a.id)));
      if (k === "physical") setPickedPhysical(new Set(physical.map((p) => p.id)));
      if (k === "diagnosis") setPickedDx(new Set(diagnoses.map((d) => d.id)));
      if (k === "drugHistory") setPickedDrugHistory(new Set(drugHistory.map((d) => d.id)));
      if (k === "note") setPickedNote(new Set(notes.map((n) => n.id)));
      if (k === "followUp") setPickedFollowUp(new Set(followUp.map((f) => f.id)));
    }
  };
  const togglePicked = (k: OvSectionKey, id: string) => {
    if (k === "chief") setPickedChief((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
    if (k === "treatment") setPickedMed((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
    if (k === "tests") setPickedTest((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
    if (k === "advice") setPickedAdv((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
    if (k === "physical") setPickedPhysical((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
    if (k === "diagnosis") setPickedDx((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
    if (k === "drugHistory") setPickedDrugHistory((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
    if (k === "note") setPickedNote((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
    if (k === "followUp") setPickedFollowUp((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  // ─── Readiness checks (mirror section modals) ──────────────
  // Treatment "Need Details" rows now only require Brand Name to be filled.
  const isMedReady = (id: string) => {
    const f = ftMed[id];
    return !!f?.brandName.trim();
  };
  // Tests "Need Details" rows now only require Test Name to be filled.
  const isTestReady = (id: string) => {
    const f = ftTest[id];
    return !!f?.name.trim();
  };
  const isAdvReady = (id: string) => {
    const f = ftAdv[id];
    return !!(f?.title.trim() && f?.descEn.trim() && f?.descBn.trim());
  };

  // ─── Counts ─────────────────────────────────────────────────
  const sectionPicked = (k: OvSectionKey): Set<string> => {
    if (k === "chief") return pickedChief;
    if (k === "treatment") return pickedMed;
    if (k === "tests") return pickedTest;
    if (k === "advice") return pickedAdv;
    if (k === "physical") return pickedPhysical;
    if (k === "diagnosis") return pickedDx;
    if (k === "drugHistory") return pickedDrugHistory;
    if (k === "note") return pickedNote;
    return pickedFollowUp;
  };
  const sectionTotal = (k: OvSectionKey) => {
    if (k === "chief") return chiefItems.length;
    if (k === "treatment") return medicines.length;
    if (k === "tests") return tests.length;
    if (k === "advice") return advices.length;
    if (k === "physical") return physical.length;
    if (k === "diagnosis") return diagnoses.length;
    if (k === "drugHistory") return drugHistory.length;
    if (k === "note") return notes.length;
    return followUp.length;
  };
  const sectionEffectiveCount = (k: OvSectionKey) =>
    sectionOn[k] ? sectionPicked(k).size : 0;
  const totalItems = (Object.keys(OV_TAB_LABELS) as OvSectionKey[])
    .reduce((sum, k) => sum + sectionEffectiveCount(k), 0);
  const includedSections = (Object.keys(OV_TAB_LABELS) as OvSectionKey[])
    .filter((k) => sectionOn[k] && sectionPicked(k).size > 0).length;

  const pendingForSection = (k: OvSectionKey) => {
    if (!sectionOn[k]) return 0;
    if (k === "treatment") return medicines.filter((m) => m.source === "freetext" && pickedMed.has(m.id) && !isMedReady(m.id)).length;
    if (k === "tests") return tests.filter((d) => d.source === "freetext" && pickedTest.has(d.id) && !isTestReady(d.id)).length;
    // Advice is now read-only bilingual cards — no edit fields, so never pending.
    return 0;
  };
  const pendingFtCount = (Object.keys(OV_TAB_LABELS) as OvSectionKey[])
    .reduce((sum, k) => sum + pendingForSection(k), 0);

  // A title plus at least one item. Free-text rows still surface their
  // "Needs Details" pill, but they no longer block the button — per-row
  // completeness was a check against the removed mock fixture.
  const canSave = title.trim() !== "" && totalItems > 0;

  const modalCss = `
    .sov-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
    .sov-scroll::-webkit-scrollbar-track { background: transparent; }
    .sov-scroll::-webkit-scrollbar-thumb { background: rgba(140,145,152,0.25); border-radius: 999px; }
    .sov-scroll::-webkit-scrollbar-thumb:hover { background: rgba(140,145,152,0.45); }
    .sov-scroll { scrollbar-width: thin; scrollbar-color: rgba(140,145,152,0.25) transparent; }
    .sov-input { transition: border-color 0.15s ease, box-shadow 0.15s ease; }
    .sov-input:focus { border-color: #358C11 !important; box-shadow: 0 0 0 3px rgba(53,140,17,0.12) !important; }
    .sov-card { transition: border-color 0.15s ease, background 0.15s ease; }
    .sov-card-header { transition: background 0.12s ease; }
    .sov-card-header:hover { background: #f4faf0; }
    .sov-row { transition: background 0.12s ease; }
    .sov-row:hover { background: #f4faf0; }
    .sov-quick { transition: color 0.12s ease, background 0.12s ease; }
    .sov-quick:hover { background: #f0f7ed; }
  `;

  const baseInput: React.CSSProperties = {
    background: "#ffffff",
    border: "1px solid #e3e6eb",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 14,
    color: "#0F100F",
    outline: "none",
    width: "100%",
  };

  // Reusable check-box
  const Checkbox = ({ checked, onChange, size = 16 }: { checked: boolean; onChange: () => void; size?: number }) => (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      className="flex items-center justify-center cursor-pointer border-none p-0"
      style={{
        width: size,
        height: size,
        borderRadius: 4,
        background: checked ? "#358C11" : "#ffffff",
        boxShadow: checked ? "none" : "inset 0 0 0 1.5px #c4c9d4",
        transition: "background 0.12s ease, box-shadow 0.12s ease",
      }}
    >
      {checked && <Check size={size - 6} strokeWidth={3} style={{ color: "#ffffff" }} />}
    </button>
  );

  // ─── Reusable bits used by all section render fns ─────────
  const Pill = ({ label, bg, color }: { label: string; bg: string; color: string }) => (
    <span className="text-[10px] font-bold uppercase tracking-[0.4px] rounded-[3px]" style={{ background: bg, color, padding: "2px 6px 1px" }}>
      {label}
    </span>
  );

  // Section header — read-only summary, no toggle.
  const TabHeader = ({ k }: { k: OvSectionKey }) => {
    const total = sectionTotal(k);
    return (
      <div
        className="flex items-center gap-[12px] px-[14px] py-[10px] mb-[12px] rounded-[8px]"
        style={{ background: "#F7F8FA", border: "1px solid #eef0f4" }}
      >
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-bold text-[#0F100F]">{OV_TAB_LABELS[k]}</span>
          <p className="text-[12px] text-[#8c9198] mt-[1px]">{total} item{total === 1 ? "" : "s"} will be saved</p>
        </div>
      </div>
    );
  };

  // ─── Tab: Chief Complaints — three sub-sections ──────────
  const ChiefSubHeader = ({ label }: { label: string }) => (
    <p className="text-[12px] font-semibold uppercase tracking-[0.4px] text-[#8c9198] mt-[14px] mb-[6px] first:mt-0">
      {label}
    </p>
  );
  const renderChiefTab = () => (
    <div>
      {/* Present Complaints */}
      <ChiefSubHeader label="Present Complaints" />
      <div className="rounded-[10px] overflow-hidden" style={{ border: "1px solid #eef0f4", background: "#ffffff" }}>
        {chiefItems.map((it, i) => (
          <div
            key={it.id}
            className="flex items-start gap-[10px] px-[14px] py-[10px]"
            style={{ borderTop: i === 0 ? "none" : "1px solid #f4f6f9" }}
          >
            <div className="flex-1 min-w-0">
              <span className="text-[13px] text-[#0F100F]">{it.text}</span>
              {it.remark && <span className="text-[12px] text-[#8c9198] block mt-[1px] truncate">{it.remark}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* History */}
      <ChiefSubHeader label="History" />
      <div className="rounded-[10px] overflow-hidden" style={{ border: "1px solid #eef0f4", background: "#ffffff" }}>
        {chiefHistory.map((h, i) => (
          <div
            key={h.id}
            className="flex items-start gap-[10px] px-[14px] py-[10px]"
            style={{ borderTop: i === 0 ? "none" : "1px solid #f4f6f9" }}
          >
            <div className="flex-1 min-w-0">
              <span className="text-[13px] text-[#0F100F]">{h.text}</span>
              {h.remark && <span className="text-[12px] text-[#8c9198] block mt-[1px] truncate">{h.remark}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <ChiefSubHeader label="Summary" />
      <div className="rounded-[10px] px-[14px] py-[10px]" style={{ border: "1px solid #eef0f4", background: "#ffffff" }}>
        <p className="text-[13px] text-[#0F100F] leading-[1.55]">
          {chiefSummary}
        </p>
      </div>
    </div>
  );

  // ─── Tab: Treatment (mirror SaveTreatmentTemplateModal cards) ──
  const renderTreatmentTab = () => {
    const isOn = sectionOn.treatment;
    const setMed = (id: string, patch: Partial<FtMedicineFields>) =>
      setFtMed((p) => ({ ...p, [id]: { ...p[id], ...patch } }));
    return (
      <div>
        <div className="flex flex-col gap-[10px]">
          {medicines.map((m) => {
            const isPicked = isOn && pickedMed.has(m.id);
            const ready = m.source === "library" ? true : isMedReady(m.id);
            const open = libExpanded.has(m.id);
            return (
              <div key={m.id} className="rounded-[10px] overflow-hidden relative" style={{ background: "#ffffff", border: ready ? "1px solid #d5ebcb" : "1px solid #fde68a", opacity: isOn ? 1 : 0.55 }}>
                {m.source === "library" ? (
                  <>
                    <div className="flex items-center gap-[10px] px-[14px] py-[12px]">
                      <button type="button" onClick={() => toggleLib(m.id)} className="flex-1 flex items-center justify-between gap-[10px] cursor-pointer bg-transparent border-none text-left p-0">
                        <span className="text-[14px] font-semibold text-[#0F100F] truncate">
                          {m.brandName} <span className="text-[#8c9198] font-normal">· {m.strength}</span>
                          <span className="text-[#8c9198] font-normal"> · {m.genericName}</span>
                        </span>
                        <div className="flex items-center gap-[8px] shrink-0">
                          <Pill label="From Library" bg="#eef0f4" color="#5a6070" />
                          <ChevronDown size={14} className="text-[#8c9198]" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                        </div>
                      </button>
                    </div>
                    {open && (
                      <div className="px-[14px] pb-[12px] flex flex-col gap-[10px]" style={{ borderTop: "1px solid #eef0f4", paddingTop: 10 }}>
                        <div className="grid grid-cols-3 gap-x-[12px] gap-y-[10px] px-[2px]">
                          <div className="flex flex-col min-w-0"><span className="text-[11px] font-semibold uppercase tracking-[0.4px] text-[#8c9198]">Generic Name</span><span className="text-[13px] text-[#0F100F] truncate">{m.genericName}</span></div>
                          <div className="flex flex-col min-w-0"><span className="text-[11px] font-semibold uppercase tracking-[0.4px] text-[#8c9198]">Drug Class</span><span className="text-[13px] text-[#0F100F] truncate">{m.drugClass}</span></div>
                          <div className="flex flex-col min-w-0"><span className="text-[11px] font-semibold uppercase tracking-[0.4px] text-[#8c9198]">Manufacturer</span><span className="text-[13px] text-[#0F100F] truncate">{m.manufacturer}</span></div>
                          <div className="flex flex-col min-w-0"><span className="text-[11px] font-semibold uppercase tracking-[0.4px] text-[#8c9198]">Dose Form</span><span className="text-[13px] text-[#0F100F] truncate">{m.doseForm}</span></div>
                          <div className="flex flex-col min-w-0"><span className="text-[11px] font-semibold uppercase tracking-[0.4px] text-[#8c9198]">Strength</span><span className="text-[13px] text-[#0F100F] truncate">{m.strength}</span></div>
                        </div>
                        <div className="flex flex-col gap-[4px] px-[2px]" style={{ borderTop: "1px dashed #eef0f4", paddingTop: 10 }}>
                          <span className="text-[11px] font-semibold uppercase tracking-[0.4px] text-[#8c9198]">Dose</span>
                          <div className="flex items-baseline gap-[8px] flex-wrap">
                            <span className="text-[13px] font-bold text-[#358C11] shrink-0 rounded-[4px]" style={{ background: "#eaf5e3", padding: "2px 8px" }}>{m.schedule}</span>
                            <p className="text-[15px] text-[#0F100F] leading-[1.7]" style={{ fontFamily: "Kalpurush, sans-serif" }}>{m.doseBn}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-[10px] px-[14px] py-[10px]" style={{ borderBottom: "1px solid #eef0f4", background: "#fffbeb" }}>
                      <span className="text-[13px] text-[#5a6070] truncate flex-1">From your draft: <span className="font-semibold text-[#0F100F]">"{m.raw}"</span></span>
                      <Pill label={ready ? "Ready" : "Needs Details"} bg={ready ? "#eaf5e3" : "#fef3c7"} color={ready ? "#358C11" : "#92400e"} />
                    </div>
                    <div className="px-[14px] py-[12px] flex flex-col gap-[10px]">
                      <div className="grid grid-cols-2 gap-[10px]">
                        <FormField label="Brand Name" required value={ftMed[m.id]?.brandName ?? ""} onChange={(v) => setMed(m.id, { brandName: v })} placeholder="e.g. Ambrotex" />
                        <FormField label="Generic Name" value={ftMed[m.id]?.genericName ?? ""} onChange={(v) => setMed(m.id, { genericName: v })} placeholder="e.g. Ambroxol" />
                      </div>
                      <div className="grid grid-cols-2 gap-[10px]">
                        <FormDropdown instanceKey={m.id} label="Drug Class" value={ftMed[m.id]?.drugClass} options={DRUG_CLASS_OPTIONS} onChange={(v) => setMed(m.id, { drugClass: v })} placeholder="Select class" />
                        <FormDropdown instanceKey={m.id} label="Manufacturer" value={ftMed[m.id]?.manufacturer} options={DRUG_MANUFACTURER_OPTIONS} onChange={(v) => setMed(m.id, { manufacturer: v })} placeholder="Select manufacturer" />
                      </div>
                      <div className="grid grid-cols-2 gap-[10px]">
                        <FormDropdown instanceKey={m.id} label="Dose Form" value={ftMed[m.id]?.doseForm} options={DRUG_DOSE_FORM_OPTIONS} onChange={(v) => setMed(m.id, { doseForm: v })} placeholder="Select dose form" />
                        <FormField label="Strength" value={ftMed[m.id]?.strength ?? ""} onChange={(v) => setMed(m.id, { strength: v })} placeholder="e.g. 500 mg" />
                      </div>
                      {/* Schema-driven dose fields. Dose Short / Dose
                          (Bengali) removed; the schema chosen via Dose Form
                          drives which dropdowns + Note textarea appear. */}
                      {(() => {
                        const v2Form = v2FormFromLabel(ftMed[m.id]?.doseForm);
                        const schema = v2Form ? V2_SCHEMA_BY_FORM[v2Form] : null;
                        if (!v2Form || !schema) {
                          return (
                            <div className="text-[13px] italic" style={{ color: "#8c9198", padding: "6px 2px" }}>
                              Pick a Dose Form above to add the dose details.
                            </div>
                          );
                        }
                        const setSchemaValue = (field: V2FieldType, v: string) => {
                          setMed(m.id, {
                            schemaValues: { ...(ftMed[m.id]?.schemaValues ?? {}), [field]: v },
                          });
                        };
                        return (
                          <div className="grid grid-cols-2 gap-[8px]">
                            {schema.map((fieldType) => {
                              const value = ftMed[m.id]?.schemaValues?.[fieldType] ?? "";
                              const isNote = fieldType === "NOTE";
                              const cellClass = isNote ? "col-span-2 flex flex-col gap-[4px]" : "flex flex-col gap-[4px]";
                              const label = V2_FIELD_LABELS[fieldType];
                              return (
                                <div key={fieldType} className={cellClass}>
                                  <label className="text-[12px] font-medium text-[#5a6070]">{label}</label>
                                  {isNote ? (
                                    <SchemaNoteField
                                      value={value}
                                      placeholder={label}
                                      onChange={(v) => setSchemaValue(fieldType, v)}
                                      baseInput={baseInput}
                                    />
                                  ) : (
                                    <SchemaFieldCombobox
                                      value={value}
                                      placeholder={label}
                                      options={getOptionsForField(fieldType, v2Form)}
                                      onChange={(v) => setSchemaValue(fieldType, v)}
                                      baseInput={baseInput}
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ─── Tab: Tests (mirror SaveTestTemplateModal cards) ──────
  const renderTestsTab = () => {
    const isOn = sectionOn.tests;
    const setT = (id: string, patch: Partial<FtTestFields>) =>
      setFtTest((p) => ({ ...p, [id]: { ...p[id], ...patch } }));
    const addRange = (id: string) =>
      setFtTest((p) => ({
        ...p,
        [id]: { ...p[id], ranges: [...(p[id]?.ranges ?? []), { id: `ov-${id}-r${Date.now()}` }] },
      }));
    const updateRange = (id: string, rangeId: string, patch: Partial<TestRange>) =>
      setFtTest((p) => ({
        ...p,
        [id]: { ...p[id], ranges: (p[id]?.ranges ?? []).map((r) => (r.id === rangeId ? { ...r, ...patch } : r)) },
      }));
    const removeRange = (id: string, rangeId: string) =>
      setFtTest((p) => ({
        ...p,
        [id]: { ...p[id], ranges: (p[id]?.ranges ?? []).filter((r) => r.id !== rangeId) },
      }));
    return (
      <div>
        <div className="flex flex-col gap-[10px]">
          {tests.map((d) => {
            const isPicked = isOn && pickedTest.has(d.id);
            const ready = d.source === "library" ? true : isTestReady(d.id);
            return (
              <div key={d.id} className="rounded-[10px] overflow-hidden relative" style={{ background: "#ffffff", border: ready ? "1px solid #d5ebcb" : "1px solid #fde68a", opacity: isOn ? 1 : 0.55 }}>
                {d.source === "library" ? (
                  <div className="flex items-center gap-[10px] px-[14px] py-[12px] cursor-default">
                    <span className="text-[14px] text-[#0F100F] truncate flex-1 min-w-0">
                      <span className="font-semibold">{d.name}</span>
                      <span className="text-[#8c9198] font-normal"> · {d.abbreviation}</span>
                    </span>
                    <Pill label="From Library" bg="#eef0f4" color="#5a6070" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-[10px] px-[14px] py-[10px]" style={{ borderBottom: "1px solid #eef0f4", background: "#fffbeb" }}>
                        <span className="text-[13px] text-[#5a6070] truncate flex-1">From your draft: <span className="font-semibold text-[#0F100F]">"{d.raw}"</span></span>
                      <Pill label={ready ? "Ready" : "Needs Details"} bg={ready ? "#eaf5e3" : "#fef3c7"} color={ready ? "#358C11" : "#92400e"} />
                    </div>
                    <div className="px-[14px] py-[12px] flex flex-col gap-[10px]">
                      <div className="grid grid-cols-2 gap-[10px]">
                        <FormField label="Test name" required value={ftTest[d.id]?.name ?? ""} onChange={(v) => setT(d.id, { name: v })} placeholder="e.g. Haemoglobin" />
                        <FormField label="Abbreviation" value={ftTest[d.id]?.abbreviation ?? ""} onChange={(v) => setT(d.id, { abbreviation: v })} placeholder="e.g. Hb" />
                      </div>
                      <div className="grid grid-cols-3 gap-[10px]">
                        <FormDropdown instanceKey={d.id} label="Specimen" value={ftTest[d.id]?.specimen} options={TEST_SPECIMEN_OPTIONS} onChange={(v) => setT(d.id, { specimen: v })} placeholder="Blood" />
                        <FormDropdown instanceKey={d.id} label="Method" value={ftTest[d.id]?.method} options={TEST_METHOD_OPTIONS} onChange={(v) => setT(d.id, { method: v })} placeholder="Chromogenic" />
                        <FormField label="Unit" value={ftTest[d.id]?.unit ?? ""} onChange={(v) => setT(d.id, { unit: v })} placeholder="g/dL" />
                      </div>

                      {/* Reference Ranges */}
                      <div className="flex flex-col gap-[8px] rounded-[10px] px-[12px] py-[10px]" style={{ background: "#F7F8FA", border: "1px solid #eef0f4" }}>
                        <span className="text-[12px] font-semibold text-[#0F100F]">Reference Ranges</span>
                        {(ftTest[d.id]?.ranges ?? []).length > 0 && (
                          <>
                            <div className="grid grid-cols-[1fr_1fr_1fr_1fr_28px] gap-[6px] items-center">
                              <span className="text-[11px] font-semibold uppercase tracking-[0.3px] text-[#8c9198]">Gender</span>
                              <span className="text-[11px] font-semibold uppercase tracking-[0.3px] text-[#8c9198]">Age Group</span>
                              <span className="text-[11px] font-semibold uppercase tracking-[0.3px] text-[#8c9198]">Min</span>
                              <span className="text-[11px] font-semibold uppercase tracking-[0.3px] text-[#8c9198]">Max</span>
                              <span />
                            </div>
                            {(ftTest[d.id]?.ranges ?? []).map((r) => (
                              <div key={r.id} className="grid grid-cols-[1fr_1fr_1fr_1fr_28px] gap-[6px] items-center">
                                <select
                                  value={r.gender ?? ""}
                                  onChange={(e) => updateRange(d.id, r.id, { gender: (e.target.value || undefined) as TestGender | undefined })}
                                  className="sov-input w-full text-[13px] text-[#0F100F] outline-none font-[DM_Sans] appearance-none cursor-pointer"
                                  style={{ height: 32, padding: "0 8px", background: "#ffffff", border: "1px solid #e3e6eb", borderRadius: 6, minWidth: 0 }}
                                >
                                  <option value="">All</option>
                                  {TEST_GENDER_OPTIONS.map((g) => (<option key={g} value={g}>{g}</option>))}
                                </select>
                                <input type="text" placeholder="Adult" value={r.ageGroup ?? ""} onChange={(e) => updateRange(d.id, r.id, { ageGroup: e.target.value })} className="sov-input w-full text-[13px] text-[#0F100F] outline-none font-[DM_Sans]" style={{ height: 32, padding: "0 8px", background: "#ffffff", border: "1px solid #e3e6eb", borderRadius: 6, minWidth: 0 }} />
                                <input type="text" placeholder="12" value={r.rangeMin ?? ""} onChange={(e) => updateRange(d.id, r.id, { rangeMin: e.target.value })} className="sov-input w-full text-[13px] text-[#0F100F] outline-none font-[DM_Sans]" style={{ height: 32, padding: "0 8px", background: "#ffffff", border: "1px solid #e3e6eb", borderRadius: 6, minWidth: 0 }} />
                                <input type="text" placeholder="16" value={r.rangeMax ?? ""} onChange={(e) => updateRange(d.id, r.id, { rangeMax: e.target.value })} className="sov-input w-full text-[13px] text-[#0F100F] outline-none font-[DM_Sans]" style={{ height: 32, padding: "0 8px", background: "#ffffff", border: "1px solid #e3e6eb", borderRadius: 6, minWidth: 0 }} />
                                <button type="button" onClick={() => removeRange(d.id, r.id)} aria-label="Remove range" className="flex items-center justify-center rounded-[6px] cursor-pointer border-none" style={{ width: 28, height: 28, background: "transparent", color: "#dc2626" }}>
                                  <Trash2 size={12} strokeWidth={2.5} />
                                </button>
                              </div>
                            ))}
                          </>
                        )}
                        <button type="button" onClick={() => addRange(d.id)} className="self-start flex items-center gap-[4px] text-[12px] font-semibold cursor-pointer bg-transparent border-none mt-[2px]" style={{ color: "#358C11" }}>
                          <Plus size={11} strokeWidth={2.5} /> Add another range
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ─── Tab: Advice (mirror SaveAdviceTemplateModal cards) ──
  // ─── Tab: Advice — mirrors SaveAdviceTemplateModal's read-only bilingual cards ──
  const renderAdviceTab = () => {
    const DEFAULT_EN = "This is translated advice";
    const DEFAULT_BN = "এটা ট্রান্সলেটেড উপদেশ";
    return (
      <div>
        <div className="flex flex-col gap-[10px]">
          {advices.map((a) => {
            // Free-text entries arrive in only one language. Use the
            // page-level default fallback for the other side so each card
            // always shows both BN and EN lines.
            const bn = a.source === "library"
              ? a.descBn
              : (isBengaliText(a.title) ? a.title : DEFAULT_BN);
            const en = a.source === "library"
              ? a.descEn
              : (isBengaliText(a.title) ? DEFAULT_EN : a.title);
            return (
              <div
                key={a.id}
                className="rounded-[10px] px-[14px] py-[12px]"
                style={{ background: "#ffffff", border: "1px solid #e3e6eb" }}
              >
                <div className="flex items-start justify-between gap-[10px] mb-[6px]">
                  <p
                    className="text-[14px] text-[#0F100F] leading-[1.55] flex-1 min-w-0"
                    style={{ fontFamily: "Kalpurush, sans-serif" }}
                  >
                    {bn}
                  </p>
                  <Pill
                    label={a.source === "library" ? "From Library" : "Free Text"}
                    bg={a.source === "library" ? "#eef0f4" : "#fef3c7"}
                    color={a.source === "library" ? "#5a6070" : "#92400e"}
                  />
                </div>
                <p className="text-[13px] text-[#5a6070] leading-[1.55]">
                  {en}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ─── Tab: Physical Findings (vitals + notes summary) ──────
  const renderPhysicalTab = () => (
    <div>
      <div className="rounded-[10px] overflow-hidden" style={{ border: "1px solid #eef0f4", background: "#ffffff" }}>
        {physical.map((p, i) => (
          <div
            key={p.id}
            className="flex items-start gap-[10px] px-[14px] py-[10px]"
            style={{ borderTop: i === 0 ? "none" : "1px solid #f4f6f9" }}
          >
            <div className="flex-1 min-w-0">
              <span className="text-[13px] font-semibold text-[#0F100F]">{p.label}</span>
              {p.value && <span className="text-[12px] text-[#5a6070] block mt-[1px] truncate">{p.value}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ─── Tab: Diagnosis (simple list) ─────────────────────────
  const renderDiagnosisTab = () => (
    <div>
      <div className="rounded-[10px] overflow-hidden" style={{ border: "1px solid #eef0f4", background: "#ffffff" }}>
        {diagnoses.map((d, i) => (
          <div
            key={d.id}
            className="flex items-start gap-[10px] px-[14px] py-[10px]"
            style={{ borderTop: i === 0 ? "none" : "1px solid #f4f6f9" }}
          >
            <div className="flex-1 min-w-0">
              <span className="text-[13px] text-[#0F100F]">{d.text}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ─── Tab: Note (simple list) ──────────────────────────────
  const renderNoteTab = () => (
    <div>
      <div className="rounded-[10px] overflow-hidden" style={{ border: "1px solid #eef0f4", background: "#ffffff" }}>
        {notes.map((n, i) => (
          <div
            key={n.id}
            className="flex items-start gap-[10px] px-[14px] py-[10px]"
            style={{ borderTop: i === 0 ? "none" : "1px solid #f4f6f9" }}
          >
            <div className="flex-1 min-w-0">
              <span className="text-[13px] text-[#0F100F]">{n.text}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ─── Tab: Drug History (simple list) ──────────────────────
  const renderDrugHistoryTab = () => (
    <div>
      <div className="rounded-[10px] overflow-hidden" style={{ border: "1px solid #eef0f4", background: "#ffffff" }}>
        {drugHistory.map((d, i) => (
          <div
            key={d.id}
            className="flex items-start gap-[10px] px-[14px] py-[10px]"
            style={{ borderTop: i === 0 ? "none" : "1px solid #f4f6f9" }}
          >
            <div className="flex-1 min-w-0">
              <span className="text-[13px] text-[#0F100F]">{d.text}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ─── Tab: Follow Up & Refer (simple list) ─────────────────
  const renderFollowUpTab = () => (
    <div>
      <div className="rounded-[10px] overflow-hidden" style={{ border: "1px solid #eef0f4", background: "#ffffff" }}>
        {followUp.map((f, i) => (
          <div
            key={f.id}
            className="flex items-start gap-[10px] px-[14px] py-[10px]"
            style={{ borderTop: i === 0 ? "none" : "1px solid #f4f6f9" }}
          >
            <div className="flex-1 min-w-0">
              <span className="text-[13px] text-[#0F100F]">{f.text}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ─── Small reusable form atoms ───────────────────────────
  function FormField({ label, value, onChange, placeholder, required }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; required?: boolean }) {
    return (
      <div className="flex flex-col gap-[4px]">
        <label className="text-[12px] font-medium text-[#5a6070]">
          {label}{required && <span style={{ color: "#dc2626", marginLeft: 3 }}>*</span>}
        </label>
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="sov-input" style={{ ...baseInput, height: 36 }} />
      </div>
    );
  }
  function FormTextarea({ label, value, onChange, placeholder, required, bengali }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; required?: boolean; bengali?: boolean }) {
    return (
      <div className="flex flex-col gap-[4px]">
        <label className="text-[12px] font-medium text-[#5a6070]">
          {label}{required && <span style={{ color: "#dc2626", marginLeft: 3 }}>*</span>}
        </label>
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={2} className="sov-input resize-none" style={{ ...baseInput, padding: "10px 12px", fontFamily: bengali ? "Kalpurush, sans-serif" : undefined, fontSize: bengali ? 14 : 13, lineHeight: 1.6 }} />
      </div>
    );
  }
  // Inline dropdown — shared per-card open state via a ref-keyed map
  const [openDrop, setOpenDrop] = useState<string | null>(null);
  function FormDropdown({ label, value, options, onChange, placeholder, instanceKey }: { label: string; value?: string; options: string[]; onChange: (v: string) => void; placeholder: string; instanceKey?: string }) {
    // instanceKey lets the caller scope the open-state per card (medicine
    // id, test id, etc.) — without it every card's "Dose Form" / "Drug
    // Class" etc. would share one dropKey and open in unison.
    const dropKey = `dd-${instanceKey ?? "shared"}-${label}-${placeholder}`;
    const open = openDrop === dropKey;
    const btnRef = useRef<HTMLButtonElement>(null);
    const pos = useFloatingPanelPos(open, btnRef);
    return (
      <div className="flex flex-col gap-[4px]">
        <label className="text-[12px] font-medium text-[#5a6070]">{label}</label>
        <div className="relative">
          <button ref={btnRef} type="button" onClick={() => setOpenDrop(open ? null : dropKey)} className="flex items-center justify-between cursor-pointer sov-input" style={{ ...baseInput, height: 36, border: open ? "1px solid #358C11" : "1px solid #e3e6eb", boxShadow: open ? "0 0 0 3px rgba(53,140,17,0.12)" : "none" }}>
            <span style={{ color: value ? "#0F100F" : "#8c9198" }}>{value ?? placeholder}</span>
            <ChevronDown size={14} className="text-[#8c9198]" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
          </button>
          {open && pos && createPortal(
            <>
              <div className="fixed inset-0" style={{ zIndex: 9999 }} onClick={() => setOpenDrop(null)} />
              <div className="rounded-[8px] bg-white overflow-hidden" style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, border: "1px solid #e3e6eb", boxShadow: pos.openUp ? "0 -8px 24px rgba(15,23,42,0.10)" : "0 8px 24px rgba(15,23,42,0.10)", zIndex: 10000, maxHeight: pos.maxHeight, overflowY: "auto" }}>
                {options.map((opt) => {
                  const isSel = opt === value;
                  return (
                    <button key={opt} type="button" onClick={() => { onChange(opt); setOpenDrop(null); }} className="w-full text-left px-[12px] py-[8px] text-[14px] cursor-pointer border-none flex items-center justify-between" style={{ background: isSel ? "#f0f7ed" : "transparent", color: isSel ? "#358C11" : "#0F100F", fontWeight: isSel ? 600 : 400 }}>
                      {opt}
                      {isSel && <Check size={13} style={{ color: "#358C11" }} strokeWidth={2.5} />}
                    </button>
                  );
                })}
              </div>
            </>,
            document.body,
          )}
        </div>
      </div>
    );
  }

  return (
    <div data-module="templates" className="fixed inset-0 z-50 flex items-center justify-center font-[DM_Sans]" style={{ background: "rgba(0,0,0,0.45)" }}>
      <style dangerouslySetInnerHTML={{ __html: modalCss }} />
      <div className="w-[880px] bg-white rounded-[12px] flex flex-col overflow-hidden shadow-2xl" style={{ height: 720, maxHeight: "calc(100vh - 32px)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-[20px] py-[10px] shrink-0" style={{ background: "#358C11" }}>
          <div className="flex items-center gap-[8px]">
            <BookmarkPlus size={15} className="text-white" />
            <span className="text-[15px] font-semibold text-white">Save as Overall Template</span>
          </div>
          <button onClick={onClose} className="flex items-center justify-center w-[28px] h-[28px] rounded-[6px] text-white border-none cursor-pointer" style={{ background: "rgba(255,255,255,0.15)" }}>
            <X size={15} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto sov-scroll flex flex-col" style={{ flex: "1 1 0", minHeight: 0, height: 0 }}>

          {/* Title */}
          <div className="px-[24px] pt-[18px] pb-[12px] flex flex-col gap-[6px] shrink-0">
            <label className="text-[13px] font-medium text-[#5a6070]">
              Template Title<span style={{ color: "#dc2626", marginLeft: 3 }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Hypertension management — first visit"
              className="sov-input"
              style={{ ...baseInput, height: 38, padding: "0 12px" }}
            />
          </div>

          <div className="px-[24px]">
            <div style={{ height: 1, background: "#eef0f4" }} />
          </div>

          {/* Tab strip — tabs flex-fill the row so all 9 fit without scrolling.
              Tabs that have items needing details show an amber alert icon. */}
          <div className="px-[24px] pt-[12px] shrink-0">
            <div className="flex items-stretch" style={{ borderBottom: "1px solid #eef0f4" }}>
              {(Object.keys(OV_TAB_LABELS) as OvSectionKey[]).map((k) => {
                const isActive = activeTab === k;
                const pending = pendingForSection(k);
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setActiveTab(k)}
                    className="flex items-center justify-center gap-[4px] px-[6px] py-[10px] cursor-pointer bg-transparent border-none flex-1 min-w-0"
                    style={{
                      color: isActive ? "#0F100F" : "#5a6070",
                      fontWeight: isActive ? 700 : 500,
                      borderBottom: isActive ? "2px solid #358C11" : "2px solid transparent",
                      marginBottom: -1,
                      fontSize: 13,
                      whiteSpace: "nowrap",
                    }}
                    title={pending > 0
                      ? `${OV_TAB_LABELS[k]} — ${pending} item${pending === 1 ? "" : "s"} need details`
                      : OV_TAB_LABELS[k]}
                  >
                    <span className="truncate">{OV_TAB_LABELS[k]}</span>
                    {pending > 0 && (
                      <AlertCircle size={12} className="shrink-0" style={{ color: "#d97706" }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active tab panel */}
          <div className="px-[24px] pt-[14px] pb-[18px]">
            {activeTab === "chief" && renderChiefTab()}
            {activeTab === "treatment" && renderTreatmentTab()}
            {activeTab === "physical" && renderPhysicalTab()}
            {activeTab === "tests" && renderTestsTab()}
            {activeTab === "advice" && renderAdviceTab()}
            {activeTab === "diagnosis" && renderDiagnosisTab()}
            {activeTab === "drugHistory" && renderDrugHistoryTab()}
            {activeTab === "note" && renderNoteTab()}
            {activeTab === "followUp" && renderFollowUpTab()}
          </div>
        </div>

        {/* Footer */}
        <div className="px-[24px] py-[14px] shrink-0 flex items-center justify-between gap-[16px]" style={{ borderTop: "1px solid #eef0f4", background: "#fafbfc" }}>
          <p className="text-[13px] text-[#5a6070] flex-1">
            {totalItems > 0 ? (
              <>
                Including{" "}
                <span className="font-bold text-[#0F100F]">{totalItems}</span>{" "}
                item{totalItems === 1 ? "" : "s"} across{" "}
                <span className="font-bold text-[#0F100F]">{includedSections}</span>{" "}
                section{includedSections === 1 ? "" : "s"}
                {pendingFtCount > 0 && (
                  <span style={{ color: "#92400e", marginLeft: 8 }}>
                    · <span className="font-bold">{pendingFtCount}</span> need{pendingFtCount === 1 ? "s" : ""} details
                  </span>
                )}
              </>
            ) : (
              <span className="text-[#8c9198] italic">No items selected — pick at least one to save.</span>
            )}
          </p>
          <div className="flex items-center gap-[8px] shrink-0">
            <button
              onClick={onClose}
              className="px-[16px] h-[36px] rounded-[8px] text-[14px] font-semibold cursor-pointer bg-transparent"
              style={{ color: "#5a6070", border: "1px solid #e3e6eb" }}
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(title)}
              disabled={!canSave}
              className="px-[20px] h-[36px] rounded-[8px] text-[14px] font-semibold text-white border-none"
              style={{
                background: canSave ? "#358C11" : "#c4c9d4",
                opacity: canSave ? 1 : 0.8,
                cursor: canSave ? "pointer" : "not-allowed",
              }}
            >
              Save Template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Insert Overall Template Modal ─────────────────────────
// Picks one saved overall template (Chief / Treatment / Tests / Advice
// bundled together) and inserts it into the current Rx.



function InsertOverallTemplateModal({
  onClose,
  onInsert,
  onOpenManage,
  templates,
}: {
  onClose: () => void;
  onInsert: (t: OverallTemplate) => void;
  onOpenManage: () => void;
  templates: OverallTemplate[];
}) {
  const [search, setSearch] = useState("");

  // Preview lists are derived from the payload at render time (DR-027) so the
  // modal cannot drift from what Insert actually produces.
  const ovPreviewStrings = (t: OverallTemplate) => [
    ...t.payload.complaints.map((c) => c.text),
    ...t.payload.medications.map((m) => m.medicine),
    ...t.payload.tests.map((x) => x.text),
    ...t.payload.advice.map((a) => a.bn),
  ];

  const filtered = templates.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    if (t.title.toLowerCase().includes(q)) return true;
    return ovPreviewStrings(t).some((s) => s.toLowerCase().includes(q));
  });

  const sectionPills = (t: OverallTemplate) => {
    const parts: { label: string; count: number }[] = [];
    if (t.payload.complaints.length > 0) parts.push({ label: "Chief Complaint", count: t.payload.complaints.length });
    if (t.payload.medications.length > 0) parts.push({ label: "Treatment", count: t.payload.medications.length });
    if (t.payload.tests.length > 0) parts.push({ label: "Test", count: t.payload.tests.length });
    if (t.payload.advice.length > 0) parts.push({ label: "Advice", count: t.payload.advice.length });
    return parts;
  };

  const scrollbarCss = `
    .iov-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
    .iov-scroll::-webkit-scrollbar-track { background: transparent; }
    .iov-scroll::-webkit-scrollbar-thumb { background: rgba(140,145,152,0.25); border-radius: 999px; }
    .iov-scroll::-webkit-scrollbar-thumb:hover { background: rgba(140,145,152,0.45); }
    .iov-scroll { scrollbar-width: thin; scrollbar-color: rgba(140,145,152,0.25) transparent; }
    .iov-input { transition: border-color 0.15s ease, box-shadow 0.15s ease; }
    .iov-input:focus { border-color: #358C11 !important; box-shadow: 0 0 0 3px rgba(53,140,17,0.12) !important; }
    .iov-card { transition: background 0.12s ease, border-color 0.12s ease; }
    .iov-card:hover { background: #f4faf0 !important; border-color: #d5ebcb !important; }
  `;

  return (
    <div data-module="templates" className="fixed inset-0 z-50 flex items-center justify-center font-[DM_Sans]" style={{ background: "rgba(0,0,0,0.45)" }}>
      <style dangerouslySetInnerHTML={{ __html: scrollbarCss }} />
      <div className="w-[720px] bg-white rounded-[12px] flex flex-col overflow-hidden shadow-2xl" style={{ height: 720, maxHeight: "calc(100vh - 32px)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-[20px] py-[10px] shrink-0" style={{ background: "#358C11" }}>
          <span className="text-[15px] font-semibold text-white">Insert from Template</span>
          <button onClick={onClose} className="flex items-center justify-center w-[28px] h-[28px] rounded-[6px] text-white border-none cursor-pointer" style={{ background: "rgba(255,255,255,0.15)" }}>
            <X size={15} />
          </button>
        </div>

        {/* Search */}
        <div className="px-[18px] pt-[14px] pb-[10px] shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-[10px] top-1/2 -translate-y-1/2 text-[#8c9198] pointer-events-none" />
            <input
              type="text"
              placeholder="Search templates by name or content…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="iov-input w-full text-[14px] text-[#0F100F] outline-none font-[DM_Sans]"
              style={{
                height: 36,
                paddingLeft: 30,
                paddingRight: search ? 30 : 10,
                background: "#ffffff",
                border: "1px solid #e3e6eb",
                borderRadius: 6,
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-[6px] top-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer border-none"
                style={{ width: 20, height: 20, borderRadius: 999, background: "#eef0f4", color: "#5a6070" }}
              >
                <X size={11} strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div
          className="overflow-y-auto iov-scroll px-[18px] pt-[4px] pb-[14px] flex flex-col gap-[10px]"
          style={{ flex: "1 1 0", minHeight: 0, height: 0 }}
        >
          {filtered.length === 0 ? (
            <div className="px-[14px] py-[40px] text-center text-[13px] text-[#8c9198]">
              No templates match "{search}"
            </div>
          ) : (
            filtered.map((t) => (
              <button
                key={t.id}
                onClick={() => onInsert(t)}
                className="iov-card shrink-0 w-full text-left flex items-center gap-[10px] px-[14px] py-[12px] rounded-[10px] cursor-pointer"
                style={{ background: "#ffffff", border: "1px solid #eef0f4" }}
              >
                <span className="text-[15px] font-semibold text-[#0F100F] flex-1 min-w-0 truncate">{t.title}</span>
                <ChevronRight size={14} className="text-[#8c9198] shrink-0" />
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-[18px] py-[12px] shrink-0"
          style={{ borderTop: "1px solid #eef0f4", background: "#fafbfc" }}
        >
          <button
            onClick={onOpenManage}
            className="flex items-center gap-[4px] text-[14px] font-semibold cursor-pointer bg-transparent border-none"
            style={{ color: "#358C11" }}
          >
            <Settings size={13} strokeWidth={2.5} />
            Manage Templates
            <ChevronRight size={13} strokeWidth={2.5} />
          </button>
          <button
            onClick={onClose}
            className="px-[18px] h-[34px] rounded-[8px] text-[14px] font-semibold cursor-pointer bg-transparent"
            style={{ color: "#5a6070", border: "1px solid #e3e6eb" }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Insert Template (Treatment) Modal ─────────────────────

type MedicineEntry = { name: string; dose: string };


function InsertTreatmentTemplateModal({
  onClose,
  onInsert,
  onOpenManage,
  templates,
}: {
  onClose: () => void;
  onInsert: (t: TreatmentTemplate) => void;
  onOpenManage: () => void;
  templates: TreatmentTemplate[];
}) {
  const [search, setSearch] = useState("");

  const filtered = templates.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      t.medications.some((m) => m.medicine.toLowerCase().includes(q))
    );
  });

  const scrollbarCss = `
    .irx-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
    .irx-scroll::-webkit-scrollbar-track { background: transparent; }
    .irx-scroll::-webkit-scrollbar-thumb { background: rgba(140,145,152,0.25); border-radius: 999px; }
    .irx-scroll::-webkit-scrollbar-thumb:hover { background: rgba(140,145,152,0.45); }
    .irx-scroll { scrollbar-width: thin; scrollbar-color: rgba(140,145,152,0.25) transparent; }
    .irx-input { transition: border-color 0.15s ease, box-shadow 0.15s ease; }
    .irx-input:focus { border-color: #358C11 !important; box-shadow: 0 0 0 3px rgba(53,140,17,0.12) !important; }
    .irx-card { transition: background 0.12s ease, border-color 0.12s ease; }
    .irx-card:hover { background: #f4faf0 !important; border-color: #d5ebcb !important; }
  `;

  return (
    <div data-module="templates" className="fixed inset-0 z-50 flex items-center justify-center font-[DM_Sans]" style={{ background: "rgba(0,0,0,0.45)" }}>
      <style dangerouslySetInnerHTML={{ __html: scrollbarCss }} />
      <div className="w-[720px] bg-white rounded-[12px] flex flex-col overflow-hidden shadow-2xl" style={{ height: 720, maxHeight: "calc(100vh - 32px)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-[20px] py-[10px] shrink-0" style={{ background: "#358C11" }}>
          <span className="text-[15px] font-semibold text-white">Insert from Template</span>
          <button onClick={onClose} className="flex items-center justify-center w-[28px] h-[28px] rounded-[6px] text-white border-none cursor-pointer" style={{ background: "rgba(255,255,255,0.15)" }}>
            <X size={15} />
          </button>
        </div>

        {/* Search */}
        <div className="px-[18px] pt-[14px] pb-[10px] shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-[10px] top-1/2 -translate-y-1/2 text-[#8c9198] pointer-events-none" />
            <input
              type="text"
              placeholder="Search templates or medicines…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="irx-input w-full text-[14px] text-[#0F100F] outline-none font-[DM_Sans]"
              style={{
                height: 36,
                paddingLeft: 30,
                paddingRight: search ? 30 : 10,
                background: "#ffffff",
                border: "1px solid #e3e6eb",
                borderRadius: 6,
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-[6px] top-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer border-none"
                style={{ width: 20, height: 20, borderRadius: 999, background: "#eef0f4", color: "#5a6070" }}
              >
                <X size={11} strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div
          className="overflow-y-auto irx-scroll px-[18px] pt-[4px] pb-[14px] flex flex-col gap-[10px]"
          style={{ flex: "1 1 0", minHeight: 0, height: 0 }}
        >
          {filtered.length === 0 ? (
            <div className="px-[14px] py-[40px] text-center text-[13px] text-[#8c9198]">
              No templates match "{search}"
            </div>
          ) : (
            filtered.map((t) => (
              <button
                key={t.id}
                onClick={() => onInsert(t)}
                className="irx-card shrink-0 w-full text-left flex flex-col gap-[6px] px-[14px] py-[12px] rounded-[10px] cursor-pointer"
                style={{ background: "#ffffff", border: "1px solid #eef0f4" }}
              >
                <div className="flex items-center justify-between gap-[10px]">
                  <span className="text-[15px] font-semibold text-[#0F100F]">{t.title}</span>
                  <span
                    className="text-[11px] font-bold uppercase tracking-[0.4px] shrink-0 rounded-[3px]"
                    style={{ background: "#eef0f4", color: "#5a6070", padding: "2px 6px" }}
                  >
                    {t.medications.length} medicines
                  </span>
                </div>
                <p className="text-[14px] leading-[1.6]" style={{ color: "#5a6070" }}>
                  {t.medications.map((m, i) => (
                    <Fragment key={i}>
                      {i > 0 && (
                        <span
                          style={{
                            color: "#358C11",
                            fontSize: 21,
                            lineHeight: 1,
                            margin: "0 8px",
                            verticalAlign: "-2px",
                          }}
                        >
                          •
                        </span>
                      )}
                      {m.medicine}
                    </Fragment>
                  ))}
                </p>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-[18px] py-[12px] shrink-0"
          style={{ borderTop: "1px solid #eef0f4", background: "#fafbfc" }}
        >
          <button
            onClick={onOpenManage}
            className="flex items-center gap-[4px] text-[14px] font-semibold cursor-pointer bg-transparent border-none"
            style={{ color: "#358C11" }}
          >
            <Settings size={13} strokeWidth={2.5} />
            Manage Templates
            <ChevronRight size={13} strokeWidth={2.5} />
          </button>
          <button
            onClick={onClose}
            className="px-[18px] h-[34px] rounded-[8px] text-[14px] font-semibold cursor-pointer bg-transparent"
            style={{ color: "#5a6070", border: "1px solid #e3e6eb" }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Insert Template (Test) Modal ──────────────────────────



function InsertTestTemplateModal({
  onClose,
  onInsert,
  onOpenManage,
  templates,
}: {
  onClose: () => void;
  onInsert: (t: TestTemplate) => void;
  onOpenManage: () => void;
  templates: TestTemplate[];
}) {
  const [search, setSearch] = useState("");

  const filtered = templates.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      t.tests.some((n) => n.text.toLowerCase().includes(q))
    );
  });

  const scrollbarCss = `
    .itt-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
    .itt-scroll::-webkit-scrollbar-track { background: transparent; }
    .itt-scroll::-webkit-scrollbar-thumb { background: rgba(140,145,152,0.25); border-radius: 999px; }
    .itt-scroll::-webkit-scrollbar-thumb:hover { background: rgba(140,145,152,0.45); }
    .itt-scroll { scrollbar-width: thin; scrollbar-color: rgba(140,145,152,0.25) transparent; }
    .itt-input { transition: border-color 0.15s ease, box-shadow 0.15s ease; }
    .itt-input:focus { border-color: #358C11 !important; box-shadow: 0 0 0 3px rgba(53,140,17,0.12) !important; }
    .itt-card { transition: background 0.12s ease, border-color 0.12s ease; }
    .itt-card:hover { background: #f4faf0 !important; border-color: #d5ebcb !important; }
  `;

  return (
    <div data-module="templates" className="fixed inset-0 z-50 flex items-center justify-center font-[DM_Sans]" style={{ background: "rgba(0,0,0,0.45)" }}>
      <style dangerouslySetInnerHTML={{ __html: scrollbarCss }} />
      <div className="w-[720px] bg-white rounded-[12px] flex flex-col overflow-hidden shadow-2xl" style={{ height: 720, maxHeight: "calc(100vh - 32px)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-[20px] py-[10px] shrink-0" style={{ background: "#358C11" }}>
          <span className="text-[15px] font-semibold text-white">Insert from Template</span>
          <button onClick={onClose} className="flex items-center justify-center w-[28px] h-[28px] rounded-[6px] text-white border-none cursor-pointer" style={{ background: "rgba(255,255,255,0.15)" }}>
            <X size={15} />
          </button>
        </div>

        {/* Search */}
        <div className="px-[18px] pt-[14px] pb-[10px] shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-[10px] top-1/2 -translate-y-1/2 text-[#8c9198] pointer-events-none" />
            <input
              type="text"
              placeholder="Search templates or tests…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="itt-input w-full text-[14px] text-[#0F100F] outline-none font-[DM_Sans]"
              style={{
                height: 36,
                paddingLeft: 30,
                paddingRight: search ? 30 : 10,
                background: "#ffffff",
                border: "1px solid #e3e6eb",
                borderRadius: 6,
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-[6px] top-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer border-none"
                style={{ width: 20, height: 20, borderRadius: 999, background: "#eef0f4", color: "#5a6070" }}
              >
                <X size={11} strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div
          className="overflow-y-auto itt-scroll px-[18px] pt-[4px] pb-[14px] flex flex-col gap-[10px]"
          style={{ flex: "1 1 0", minHeight: 0, height: 0 }}
        >
          {filtered.length === 0 ? (
            <div className="px-[14px] py-[40px] text-center text-[13px] text-[#8c9198]">
              No templates match "{search}"
            </div>
          ) : (
            filtered.map((t) => (
              <button
                key={t.id}
                onClick={() => onInsert(t)}
                className="itt-card shrink-0 w-full text-left flex flex-col gap-[6px] px-[14px] py-[12px] rounded-[10px] cursor-pointer"
                style={{ background: "#ffffff", border: "1px solid #eef0f4" }}
              >
                <div className="flex items-center justify-between gap-[10px]">
                  <span className="text-[15px] font-semibold text-[#0F100F]">{t.title}</span>
                  <span
                    className="text-[11px] font-bold uppercase tracking-[0.4px] shrink-0 rounded-[3px]"
                    style={{ background: "#eef0f4", color: "#5a6070", padding: "2px 6px" }}
                  >
                    {t.tests.length} tests
                  </span>
                </div>
                <p className="text-[14px] leading-[1.6]" style={{ color: "#5a6070" }}>
                  {t.tests.map((name, i) => (
                    <Fragment key={i}>
                      {i > 0 && (
                        <span
                          style={{
                            color: "#358C11",
                            fontSize: 21,
                            lineHeight: 1,
                            margin: "0 8px",
                            verticalAlign: "-2px",
                          }}
                        >
                          •
                        </span>
                      )}
                      {name.text}
                    </Fragment>
                  ))}
                </p>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-[18px] py-[12px] shrink-0"
          style={{ borderTop: "1px solid #eef0f4", background: "#fafbfc" }}
        >
          <button
            onClick={onOpenManage}
            className="flex items-center gap-[4px] text-[14px] font-semibold cursor-pointer bg-transparent border-none"
            style={{ color: "#358C11" }}
          >
            <Settings size={13} strokeWidth={2.5} />
            Manage Templates
            <ChevronRight size={13} strokeWidth={2.5} />
          </button>
          <button
            onClick={onClose}
            className="px-[18px] h-[34px] rounded-[8px] text-[14px] font-semibold cursor-pointer bg-transparent"
            style={{ color: "#5a6070", border: "1px solid #e3e6eb" }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Manage Drug Modal ─────────────────────────────────────

export type DrugDose = {
  id: string;
  doseForm?: string;
  strength: string;
  doseBn?: string;
  doseShort?: string;
  schemaValues?: Partial<Record<V2FieldType, string>>;
};

export type DrugItem = {
  id: string;
  brandName: string;
  genericName?: string;
  drugClass?: string;
  manufacturer?: string;
  doses: DrugDose[];
  isMine: boolean;
  // `schema` says which form fields render; `doses` lists available strengths.
  // Different facts, not interconvertible — both are stored (DR-028).
  schema: V2FieldType[];
  defaults?: Partial<Record<V2FieldType, string>>;
};

const DRUG_CLASS_OPTIONS = [
  "Analgesic",
  "Antibiotic",
  "Antihypertensive",
  "Antidiabetic",
  "NSAID",
  "PPI (Proton-pump inhibitor)",
  "Antihistamine",
  "Statin",
  "ARB",
  "Beta blocker",
  "Antiemetic",
  "Diuretic",
  "Bronchodilator",
];
// Pull the dose-form options from the V2 form labels so the Manage Drugs
// modal exposes every form for which we have a schema. Selecting one drives
// the schema-driven fields in the Add-new form.
const DRUG_DOSE_FORM_OPTIONS = V2_FORM_OPTION_LIST;
const DRUG_MANUFACTURER_OPTIONS = ["Square", "Beximco", "Incepta", "Healthcare", "ACI", "Renata", "Eskayef", "Opsonin", "Drug International"];

export const MOCK_DRUGS: Omit<DrugItem, "schema">[] = [
  {
    id: "drg1", brandName: "Napa", genericName: "Paracetamol", drugClass: "Analgesic", manufacturer: "Beximco", isMine: false,
    doses: [
      { id: "drg1-d1", doseForm: "Tablet", strength: "500 mg",
        schemaValues: { DOSAGE_UNIT: "১ ট্যাব", FREQUENCY: "১+০+১", MEAL_TIMING: "খাবারের পরে", DURATION: "৫ দিন", NOTE: "জ্বর হলে" } },
    ],
  },
  {
    id: "drg2", brandName: "Seclo", genericName: "Omeprazole", drugClass: "PPI (Proton-pump inhibitor)", manufacturer: "Square", isMine: false,
    doses: [
      { id: "drg2-d1", doseForm: "Capsule", strength: "20 mg",
        schemaValues: { DOSAGE_UNIT: "১ ক্যাপ", FREQUENCY: "১+০+১", MEAL_TIMING: "খাবারের আগে", DURATION: "১৪ দিন" } },
    ],
  },
  {
    id: "drg3", brandName: "Amdocal", genericName: "Amlodipine", drugClass: "Antihypertensive", manufacturer: "Incepta", isMine: false,
    doses: [
      { id: "drg3-d1", doseForm: "Tablet", strength: "5 mg",
        schemaValues: { DOSAGE_UNIT: "১ ট্যাব", FREQUENCY: "১+০+০", MEAL_TIMING: "খাবারের পরে", DURATION: "চলবে" } },
    ],
  },
  {
    id: "drg4", brandName: "Metfo", genericName: "Metformin", drugClass: "Antidiabetic", manufacturer: "ACI", isMine: false,
    doses: [
      { id: "drg4-d1", doseForm: "Tablet", strength: "500 mg",
        schemaValues: { DOSAGE_UNIT: "১ ট্যাব", FREQUENCY: "১+০+১", MEAL_TIMING: "খাবারের পরে", DURATION: "চলবে" } },
    ],
  },
  {
    id: "drg5", brandName: "Amoxin", genericName: "Amoxicillin", drugClass: "Antibiotic", manufacturer: "Beximco", isMine: false,
    doses: [
      { id: "drg5-d1", doseForm: "Capsule", strength: "500 mg",
        schemaValues: { DOSAGE_UNIT: "১ ক্যাপ", FREQUENCY: "১+১+১", MEAL_TIMING: "খাবারের পরে", DURATION: "৭ দিন", NOTE: "কোর্স পূর্ণ করুন" } },
    ],
  },
  {
    id: "drg6", brandName: "Atova", genericName: "Atorvastatin", drugClass: "Statin", manufacturer: "Square", isMine: false,
    doses: [
      { id: "drg6-d1", doseForm: "Tablet", strength: "10 mg",
        schemaValues: { DOSAGE_UNIT: "১ ট্যাব", FREQUENCY: "০+০+১", MEAL_TIMING: "খাবারের পরে", DURATION: "চলবে" } },
    ],
  },
  {
    id: "drg7", brandName: "Losartil", genericName: "Losartan", drugClass: "ARB", manufacturer: "Healthcare", isMine: false,
    doses: [
      { id: "drg7-d1", doseForm: "Tablet", strength: "50 mg",
        schemaValues: { DOSAGE_UNIT: "১ ট্যাব", FREQUENCY: "১+০+০", MEAL_TIMING: "খাবারের আগে", DURATION: "চলবে" } },
    ],
  },
  {
    id: "drg8", brandName: "Domin", genericName: "Domperidone", drugClass: "Antiemetic", manufacturer: "Incepta", isMine: false,
    doses: [
      { id: "drg8-d1", doseForm: "Tablet", strength: "10 mg",
        schemaValues: { DOSAGE_UNIT: "১ ট্যাব", FREQUENCY: "১+১+১", MEAL_TIMING: "খাবারের আগে", DURATION: "৫ দিন" } },
    ],
  },
  {
    id: "drg9", brandName: "Cardiox", genericName: "Aspirin", drugClass: "Antiplatelet", manufacturer: "Renata", isMine: true,
    doses: [
      { id: "drg9-d1", doseForm: "Tablet", strength: "75 mg",
        schemaValues: { DOSAGE_UNIT: "১ ট্যাব", FREQUENCY: "০+০+১", MEAL_TIMING: "খাবারের পরে", DURATION: "চলবে" } },
    ],
  },
  {
    id: "drg10", brandName: "Local-Sleep", genericName: "Zolpidem", drugClass: "Sedative", manufacturer: "Opsonin", isMine: true,
    doses: [
      { id: "drg10-d1", doseForm: "Tablet", strength: "5 mg",
        schemaValues: { DOSAGE_UNIT: "১ ট্যাব", FREQUENCY: "০+০+১", MEAL_TIMING: "খাবারের পরে", DURATION: "প্রয়োজনে", NOTE: "ঘুমানোর আগে" } },
    ],
  },
];

// Shared "floating panel" positioning hook. Returns a viewport-anchored
// position (computed from the trigger element's bounding rect) plus a
// flip-up flag and a max-height cap so the panel never overflows the
// viewport. Used by every dropdown that renders its panel via portal —
// keeps panels visible regardless of any overflow:hidden parent.
type FloatingPos = {
  top: number;
  left: number;
  width: number;
  openUp: boolean;
  maxHeight: number;
};
function useFloatingPanelPos(
  open: boolean,
  triggerRef: React.RefObject<HTMLElement | null>,
  desiredMax = 220,
): FloatingPos | null {
  const [pos, setPos] = useState<FloatingPos | null>(null);
  useEffect(() => {
    if (!open) return;
    const update = () => {
      if (!triggerRef.current) return;
      const r = triggerRef.current.getBoundingClientRect();
      const margin = 8;
      const spaceBelow = window.innerHeight - r.bottom - margin;
      const spaceAbove = r.top - margin;
      const openUp = spaceBelow < 120 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(80, Math.min(desiredMax, openUp ? spaceAbove : spaceBelow));
      const top = openUp ? Math.max(margin, r.top - maxHeight - 4) : r.bottom + 4;
      setPos({ top, left: r.left, width: r.width, openUp, maxHeight });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, triggerRef, desiredMax]);
  return pos;
}

// Editable combobox used inside the Manage Drug Add-new form for schema-
// driven dose fields. Visually matches the rest of the form (`mdrug-input`
// + `baseInput`): white background, 1px #e3e6eb border, green focus ring.
// Doctor can type freely OR pick from the dropdown panel below.
function SchemaFieldCombobox({
  value,
  placeholder,
  options,
  onChange,
  baseInput,
}: {
  value: string;
  placeholder: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  baseInput: React.CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pos = useFloatingPanelPos(open, inputRef);

  // Close on outside click — but ignore clicks landing inside the portaled
  // panel (which lives outside `wrapperRef`).
  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapperRef.current && wrapperRef.current.contains(t)) return;
      // Walk up from the click target — if any ancestor is our portal panel,
      // it's an in-panel click and we should leave the dropdown open.
      let el: HTMLElement | null = t as HTMLElement;
      while (el) {
        if (el.dataset && el.dataset.schemaPanel === "1") return;
        el = el.parentElement;
      }
      setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  // Filter options live against whatever the user has typed, unless the
  // current value already matches an option exactly (in which case show
  // the full list so they can swap to another suggestion).
  const trimmed = value.trim().toLowerCase();
  const exactHit = options.some((o) => o.label.toLowerCase() === trimmed);
  const filtered = !trimmed || exactHit
    ? options
    : options.filter((o) => o.label.toLowerCase().includes(trimmed));

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="mdrug-input"
          style={{
            ...baseInput,
            paddingRight: 32,
            fontFamily: /[ঀ-৿]/.test(value) ? "Kalpurush, sans-serif" : baseInput.fontFamily,
            border: open ? "1px solid #358C11" : "1px solid #e3e6eb",
            boxShadow: open ? "0 0 0 3px rgba(53,140,17,0.12)" : "none",
            transition: "border-color 0.15s ease, box-shadow 0.15s ease",
          }}
        />
        <ChevronDown
          size={14}
          className="absolute pointer-events-none"
          style={{
            right: 10,
            top: "50%",
            transform: open ? "translateY(-50%) rotate(180deg)" : "translateY(-50%)",
            color: "#8c9198",
            transition: "transform 0.2s ease",
          }}
        />
      </div>
      {open && filtered.length > 0 && pos && createPortal(
        <div
          data-schema-panel="1"
          className="rounded-[8px] bg-white overflow-hidden"
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            width: pos.width,
            border: "1px solid #e3e6eb",
            boxShadow: pos.openUp
              ? "0 -8px 24px rgba(15,23,42,0.10)"
              : "0 8px 24px rgba(15,23,42,0.10)",
            zIndex: 10000,
            maxHeight: pos.maxHeight,
            overflowY: "auto",
          }}
        >
          {filtered.map((opt) => {
            const isSel = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className="w-full text-left px-[12px] py-[8px] text-[14px] cursor-pointer border-none"
                style={{
                  background: isSel ? "#f0f7ed" : "transparent",
                  color: isSel ? "#358C11" : "#0F100F",
                  fontWeight: isSel ? 600 : 400,
                  fontFamily: /[ঀ-৿]/.test(opt.label) ? "Kalpurush, sans-serif" : undefined,
                }}
                onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = "#f8faf6"; }}
                onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = "transparent"; }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </div>
  );
}

// Note textarea for the schema-driven Add-new form. Same `mdrug-input`
// chrome as the other fields, plus a translate icon button (top-right)
// that flips between the typed value and a mock-translated counterpart —
// mirrors the behaviour of `V2NoteInput` used in the Treatment row.
function SchemaNoteField({
  value,
  placeholder,
  onChange,
  baseInput,
}: {
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
  baseInput: React.CSSProperties;
}) {
  const [showTranslated, setShowTranslated] = useState(false);
  const valueIsBn = /[ঀ-৿]/.test(value);
  const DEFAULT_EN = "This is translated";
  const DEFAULT_BN = "এটা ট্রান্সলেটেড হয়েছে";
  const translated = value.trim() && valueIsBn ? DEFAULT_EN : DEFAULT_BN;
  const displayValue = showTranslated ? translated : value;
  const visibleHasBn = /[ঀ-৿]/.test(displayValue);

  return (
    <div className="relative">
      <textarea
        placeholder={placeholder}
        value={displayValue}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          // If the translation overlay is showing, commit it so the doctor
          // can keep typing from there.
          if (showTranslated) {
            onChange(displayValue);
            setShowTranslated(false);
          }
        }}
        rows={2}
        className="mdrug-input"
        style={{
          ...baseInput,
          paddingRight: 38,
          fontFamily: visibleHasBn ? "Kalpurush, sans-serif" : baseInput.fontFamily,
          resize: "vertical",
          minHeight: 60,
        }}
      />
    </div>
  );
}

function ManageDrugModal({
  onClose,
  items,
  onAdd,
  onEdit,
  onDelete,
}: {
  onClose: () => void;
  items: DrugItem[];
  onAdd: (d: DrugItem) => void;
  onEdit: (id: string, patch: Partial<DrugItem>) => void;
  onDelete: (id: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"all" | "mine">("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"view" | "edit" | "add">("view");
  const [confirmDeleteFor, setConfirmDeleteFor] = useState<string | null>(null);
  const [confirmDeleteDoseFor, setConfirmDeleteDoseFor] = useState<string | null>(null);

  // Form state — drug-level fields + array of dose variants
  // `doseForm` holds the user-facing label (e.g. "Tablet"). When it matches
  // a V2 form key, `schemaValues` is the source of truth for that dose's
  // fields; the legacy `doseShort` / `doseBn` columns are kept for older
  // entries whose form doesn't map onto a V2 schema.
  type DoseDraft = {
    id: string;
    doseForm?: string;
    strength: string;
    doseShort: string;
    doseBn: string;
    schemaValues?: Partial<Record<V2FieldType, string>>;
  };
  const emptyDose = (): DoseDraft => ({
    id: `nd-${Date.now()}-${Math.random()}`,
    doseForm: undefined,
    strength: "",
    doseShort: "",
    doseBn: "",
    schemaValues: {},
  });
  const [formGeneric, setFormGeneric] = useState("");
  const [formClass, setFormClass] = useState<string | undefined>(undefined);
  const [formBrand, setFormBrand] = useState("");
  const [formManufacturer, setFormManufacturer] = useState<string | undefined>(undefined);
  const [formDoses, setFormDoses] = useState<DoseDraft[]>([emptyDose()]);
  const [openDoseFormFor, setOpenDoseFormFor] = useState<string | null>(null);

  const [classOpen, setClassOpen] = useState(false);
  const [mfgOpen, setMfgOpen] = useState(false);

  const filtered = items.filter((d) => {
    if (activeTab === "mine" && !d.isMine) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      d.brandName.toLowerCase().includes(q) ||
      (d.genericName ?? "").toLowerCase().includes(q) ||
      (d.drugClass ?? "").toLowerCase().includes(q) ||
      (d.manufacturer ?? "").toLowerCase().includes(q) ||
      d.doses.some((dose) =>
        (dose.strength ?? "").toLowerCase().includes(q) ||
        (dose.doseForm ?? "").toLowerCase().includes(q),
      )
    );
  });

  const selected = selectedId ? items.find((d) => d.id === selectedId) : null;

  const resetForm = () => {
    setFormGeneric("");
    setFormClass(undefined);
    setFormBrand("");
    setFormManufacturer(undefined);
    setFormDoses([emptyDose()]);
  };

  const startAdd = () => {
    setMode("add");
    setSelectedId(null);
    resetForm();
  };
  const startEdit = () => {
    if (selected) {
      setFormGeneric(selected.genericName ?? "");
      setFormClass(selected.drugClass);
      setFormBrand(selected.brandName);
      setFormManufacturer(selected.manufacturer);
      setFormDoses(
        selected.doses.length > 0
          ? selected.doses.map((d) => ({
              id: d.id,
              doseForm: d.doseForm,
              strength: d.strength,
              doseShort: d.doseShort ?? "",
              doseBn: d.doseBn ?? "",
              schemaValues: d.schemaValues,
            }))
          : [emptyDose()],
      );
    }
    setMode("edit");
  };
  const cancelForm = () => setMode("view");

  const updateDose = (id: string, patch: Partial<DoseDraft>) =>
    setFormDoses((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  const addDose = () => setFormDoses((prev) => [...prev, emptyDose()]);
  const removeDose = (id: string) =>
    setFormDoses((prev) => (prev.length <= 1 ? prev : prev.filter((d) => d.id !== id)));

  const dosesEqual = (a: DoseDraft[], b: DrugDose[]) => {
    if (a.length !== b.length) return false;
    return a.every((da, i) => {
      const db = b[i];
      return (
        (da.doseForm ?? "") === (db.doseForm ?? "") &&
        da.strength === db.strength &&
        (da.doseShort ?? "") === (db.doseShort ?? "") &&
        (da.doseBn ?? "") === (db.doseBn ?? "")
      );
    });
  };

  const editHasChanges = !!selected && (
    formGeneric !== (selected.genericName ?? "") ||
    formClass !== selected.drugClass ||
    formBrand !== selected.brandName ||
    formManufacturer !== selected.manufacturer ||
    !dosesEqual(formDoses, selected.doses)
  );
  // Brand name is the only required field for the Add-new drug form;
  // strength (and all dose details) are optional.
  const addIsValid = formBrand.trim() !== "";
  const canSave = mode === "edit" ? editHasChanges : addIsValid;

  const confirmTarget = confirmDeleteFor
    ? items.find((d) => d.id === confirmDeleteFor)
    : null;
  const confirmDoseTarget = confirmDeleteDoseFor && selected
    ? selected.doses.find((d) => d.id === confirmDeleteDoseFor)
    : null;

  const scrollbarCss = `
    .mdrug-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
    .mdrug-scroll::-webkit-scrollbar-track { background: transparent; }
    .mdrug-scroll::-webkit-scrollbar-thumb { background: rgba(140,145,152,0.25); border-radius: 999px; }
    .mdrug-scroll::-webkit-scrollbar-thumb:hover { background: rgba(140,145,152,0.45); }
    .mdrug-scroll { scrollbar-width: thin; scrollbar-color: rgba(140,145,152,0.25) transparent; }
    .mdrug-add-btn { transition: background 0.15s ease; }
    .mdrug-add-btn:hover:not(:disabled) { background: #2a7a0d !important; }
    .mdrug-add-btn:disabled { cursor: not-allowed; opacity: 0.6; }
    .mdrug-input { transition: border-color 0.15s ease, box-shadow 0.15s ease; }
    .mdrug-input:focus { border-color: #358C11 !important; box-shadow: 0 0 0 3px rgba(53, 140, 17, 0.12) !important; }
    .mdrug-list-item { transition: background 0.12s ease; }
    .mdrug-list-item:hover:not(.mdrug-selected) { background: #eaf5e3 !important; }
  `;

  const baseInput: React.CSSProperties = {
    background: "#ffffff",
    border: "1px solid #e3e6eb",
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 14,
    color: "#0F100F",
    outline: "none",
    width: "100%",
  };

  const Dropdown = ({
    value,
    options,
    onChange,
    open,
    setOpen,
    placeholder,
  }: {
    value?: string;
    options: string[];
    onChange: (v: string) => void;
    open: boolean;
    setOpen: (v: boolean) => void;
    placeholder: string;
  }) => {
    const btnRef = useRef<HTMLButtonElement>(null);
    const pos = useFloatingPanelPos(open, btnRef);
    return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between cursor-pointer mdrug-input"
        style={{
          ...baseInput,
          border: open ? "1px solid #358C11" : "1px solid #e3e6eb",
          boxShadow: open ? "0 0 0 3px rgba(53,140,17,0.12)" : "none",
        }}
      >
        <span style={{ color: value ? "#0F100F" : "#8c9198" }}>{value ?? placeholder}</span>
        <ChevronDown size={14} className="text-[#8c9198]" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </button>
      {open && pos && createPortal(
        <>
          <div className="fixed inset-0" style={{ zIndex: 9999 }} onClick={() => setOpen(false)} />
          <div
            className="rounded-[8px] bg-white overflow-hidden"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: pos.width,
              border: "1px solid #e3e6eb",
              boxShadow: pos.openUp ? "0 -8px 24px rgba(15,23,42,0.10)" : "0 8px 24px rgba(15,23,42,0.10)",
              zIndex: 10000,
              maxHeight: pos.maxHeight,
              overflowY: "auto",
            }}
          >
            {options.map((opt) => {
              const isSel = opt === value;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => { onChange(opt); setOpen(false); }}
                  className="w-full text-left px-[12px] py-[8px] text-[14px] cursor-pointer border-none flex items-center justify-between"
                  style={{
                    background: isSel ? "#f0f7ed" : "transparent",
                    color: isSel ? "#358C11" : "#0F100F",
                    fontWeight: isSel ? 600 : 400,
                  }}
                >
                  {opt}
                  {isSel && <Check size={13} style={{ color: "#358C11" }} strokeWidth={2.5} />}
                </button>
              );
            })}
          </div>
        </>,
        document.body,
      )}
    </div>
    );
  };

  const Val = ({ v }: { v?: string }) =>
    v ? <span className="text-[14px] text-[#0F100F] font-semibold">{v}</span> : <span className="text-[14px] text-[#8c9198]">--</span>;

  return (
    <div data-module="master-data" className="fixed inset-0 z-50 flex items-center justify-center font-[DM_Sans]" style={{ background: "rgba(0,0,0,0.45)" }}>
      <style dangerouslySetInnerHTML={{ __html: scrollbarCss }} />
      <div className="w-[1040px] bg-white rounded-[12px] flex flex-col overflow-hidden shadow-2xl relative" style={{ height: 680 }}>

        {/* Header */}
        <div className="flex items-center justify-between px-[20px] py-[10px] shrink-0" style={{ background: "#358C11" }}>
          <span className="text-[15px] font-semibold text-white">Manage Drug</span>
          <button onClick={onClose} className="flex items-center justify-center w-[28px] h-[28px] rounded-[6px] text-white border-none cursor-pointer" style={{ background: "rgba(255,255,255,0.15)" }}>
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0">

          {/* Left panel */}
          <div className="flex flex-col shrink-0" style={{ width: 374, borderRight: "1px solid #eef0f4", background: "#F7F8FA" }}>

            {/* Search */}
            <div className="p-[14px] shrink-0" style={{ borderBottom: "1px solid #eef0f4" }}>
              <div className="relative">
                <Search size={14} className="absolute left-[10px] top-1/2 -translate-y-1/2 text-[#8c9198] pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search drug, generic, manufacturer…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="mdrug-input w-full text-[14px] text-[#0F100F] outline-none font-[DM_Sans]"
                  style={{
                    height: 34,
                    paddingLeft: 30,
                    paddingRight: search ? 30 : 10,
                    background: "#ffffff",
                    border: "1px solid #e3e6eb",
                    borderRadius: 6,
                  }}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-[6px] top-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer border-none"
                    style={{ width: 20, height: 20, borderRadius: 999, background: "#eef0f4", color: "#5a6070" }}
                  >
                    <X size={11} strokeWidth={2.5} />
                  </button>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex shrink-0" style={{ borderBottom: "1px solid #eef0f4" }}>
              {(["all", "mine"] as const).map((tab) => {
                const active = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className="flex-1 py-[9px] text-[13px] font-semibold cursor-pointer border-none bg-transparent"
                    style={{
                      color: active ? "#064232" : "#8c9198",
                      borderBottom: active ? "2px solid #358C11" : "2px solid transparent",
                      marginBottom: -1,
                    }}
                  >
                    {tab === "all" ? "All" : "Personalized"}
                  </button>
                );
              })}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto mdrug-scroll">
              {filtered.length === 0 ? (
                <div className="px-[14px] py-[40px] text-center text-[13px] text-[#8c9198]">
                  No drug found
                </div>
              ) : (
                filtered.map((d) => {
                  const isSelected = d.id === selectedId && mode !== "add";
                  return (
                    <button
                      key={d.id}
                      onClick={() => { setSelectedId(d.id); setMode("view"); }}
                      className={`mdrug-list-item w-full text-left px-[14px] py-[10px] cursor-pointer border-none bg-transparent ${isSelected ? "mdrug-selected" : ""}`}
                      style={{
                        background: isSelected ? "#eaf5e3" : "transparent",
                        borderBottom: "1px solid #eef0f4",
                        borderLeft: isSelected ? "3px solid #358C11" : "3px solid transparent",
                      }}
                    >
                      <div className="flex items-center justify-between gap-[6px]">
                        <span className="text-[14px] font-semibold text-[#0F100F] truncate min-w-0">
                          {d.brandName}
                          {d.manufacturer && (
                            <span className="text-[#8c9198] font-normal"> · {d.manufacturer}</span>
                          )}
                        </span>
                        {d.isMine && (
                          <span className="text-[10px] font-bold uppercase shrink-0 rounded-[3px]" style={{ background: "#358C11", color: "#ffffff", padding: "2px 5px 1px" }}>
                            Own
                          </span>
                        )}
                      </div>
                      {(d.drugClass || d.genericName) && (
                        <p className="text-[12px] text-[#5a6070] leading-[1.45] truncate mt-[3px]">
                          {d.drugClass}
                          {d.drugClass && d.genericName && <span className="text-[#c4c9d4]"> · </span>}
                          {d.genericName && <span className="italic">{d.genericName}</span>}
                        </p>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Add new */}
            <div className="p-[12px] shrink-0" style={{ borderTop: "1px solid #eef0f4", background: "#ffffff" }}>
              <button
                onClick={startAdd}
                disabled={mode === "add"}
                className="mdrug-add-btn w-full flex items-center justify-center gap-[6px] rounded-[8px] text-[14px] font-semibold cursor-pointer border-none font-[DM_Sans]"
                style={{ height: 40, background: "#358C11", color: "#ffffff" }}
              >
                <Plus size={14} strokeWidth={2.5} />
                Add New Drug
              </button>
            </div>
          </div>

          {/* Right panel */}
          <div className="flex-1 flex flex-col min-w-0">

            {mode === "view" && selected && (
              <>
                <div
                  className="flex items-center justify-between px-[22px] shrink-0"
                  style={{
                    borderBottom: "1px solid #eef0f4",
                    paddingTop: selected.isMine ? 15 : 17,
                    paddingBottom: selected.isMine ? 15 : 17,
                  }}
                >
                  <div className="flex items-center gap-[8px] min-w-0">
                    <span className="text-[16px] font-bold text-[#0F100F] truncate">{selected.brandName}</span>
                    {selected.manufacturer && (
                      <span className="text-[13px] text-[#5a6070] truncate">· {selected.manufacturer}</span>
                    )}
                    {selected.isMine && (
                      <span className="text-[11px] font-bold uppercase rounded-[4px] shrink-0" style={{ background: "#358C11", color: "#ffffff", paddingTop: 3, paddingBottom: 2, paddingLeft: 6, paddingRight: 6 }}>
                        Own
                      </span>
                    )}
                  </div>
                  {selected.isMine ? (
                    <div className="flex items-center gap-[8px] shrink-0">
                      <button
                        onClick={startEdit}
                        className="flex items-center gap-[4px] px-[10px] py-[6px] rounded-[6px] text-[13px] font-semibold cursor-pointer bg-transparent"
                        style={{ color: "#358C11", border: "1px solid #358C11" }}
                      >
                        <Pencil size={12} strokeWidth={2.5} /> Edit
                      </button>
                      <button
                        onClick={() => selectedId && setConfirmDeleteFor(selectedId)}
                        className="flex items-center gap-[4px] px-[10px] py-[6px] rounded-[6px] text-[13px] font-semibold cursor-pointer bg-transparent"
                        style={{ color: "#dc2626", border: "1px solid #fecaca" }}
                      >
                        <Trash2 size={12} strokeWidth={2.5} /> Delete
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center" style={{ height: 28 }}>
                      <span className="text-[12px] text-[#8c9198] italic">Read-only — added by system</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto mdrug-scroll px-[22px] py-[18px] flex flex-col gap-[18px]">
                  <div className="grid grid-cols-3 gap-x-[24px] gap-y-[14px]">
                    <div className="flex flex-col gap-[4px]">
                      <span className="text-[12px] font-semibold uppercase tracking-[0.4px] text-[#8c9198]">Generic Name</span>
                      <Val v={selected.genericName} />
                    </div>
                    <div className="flex flex-col gap-[4px]">
                      <span className="text-[12px] font-semibold uppercase tracking-[0.4px] text-[#8c9198]">Drug Class</span>
                      <Val v={selected.drugClass} />
                    </div>
                    <div className="flex flex-col gap-[4px]">
                      <span className="text-[12px] font-semibold uppercase tracking-[0.4px] text-[#8c9198]">Manufacturer</span>
                      <Val v={selected.manufacturer} />
                    </div>
                  </div>

                  {/* Default Dose */}
                  {(() => {
                    const dose = selected.doses[0];
                    if (!dose) return null;
                    const v2Form = v2FormFromLabel(dose.doseForm);
                    const schema = v2Form ? V2_SCHEMA_BY_FORM[v2Form] : null;
                    const hasSchemaValues =
                      !!schema && schema.some((f) => (dose.schemaValues?.[f] ?? "").trim() !== "");
                    return (
                      <div className="flex flex-col gap-[8px]">
                        <span className="text-[12px] font-semibold uppercase tracking-[0.4px] text-[#8c9198]">
                          Default Dose
                        </span>
                        <div
                          className="flex flex-col gap-[8px] rounded-[8px] px-[14px] py-[12px]"
                          style={{ border: "1px solid #eef0f4" }}
                        >
                          {/* Header row — form · strength */}
                          <div className="flex items-baseline gap-[8px] min-w-0">
                            <span className="text-[13.5px] font-semibold text-[#0F100F] truncate">
                              {dose.doseForm ?? <span className="text-[#8c9198] font-normal">—</span>}
                            </span>
                            {dose.strength && (
                              <>
                                <span className="text-[#cfd5e0] shrink-0">·</span>
                                <span className="text-[13.5px] text-[#5a6070] truncate">{dose.strength}</span>
                              </>
                            )}
                          </div>

                          {/* Schema-driven dose sentence: frequency chip +
                              inline Bangla values + optional NOTE after dash.
                              Falls back to legacy doseBn / doseShort when the
                              dose has no schemaValues. */}
                          {schema && hasSchemaValues ? (() => {
                            const freq = (dose.schemaValues?.FREQUENCY ?? "").trim();
                            const note = (dose.schemaValues?.NOTE ?? "").trim();
                            const inlineFields = schema.filter(
                              (f) => f !== "FREQUENCY" && f !== "NOTE",
                            );
                            const inlineValues = inlineFields
                              .map((f) => (dose.schemaValues?.[f] ?? "").trim())
                              .filter((v) => v !== "");
                            return (
                              <div className="flex items-baseline gap-[10px] flex-wrap">
                                {freq && (
                                  <span
                                    className="inline-block text-[12px] font-bold rounded-[4px] shrink-0"
                                    style={{
                                      background: "#eaf5e3",
                                      color: "#358C11",
                                      padding: "2px 7px",
                                      fontFamily: /[ঀ-৿]/.test(freq) ? "Kalpurush, sans-serif" : undefined,
                                    }}
                                  >
                                    {freq}
                                  </span>
                                )}
                                {inlineValues.length > 0 && (
                                  <span
                                    className="text-[14px] leading-[1.55] text-[#0F100F]"
                                    style={{ fontFamily: "Kalpurush, sans-serif" }}
                                  >
                                    {inlineValues.join("  ")}
                                  </span>
                                )}
                                {note && (
                                  <span
                                    className="text-[13.5px] leading-[1.55] text-[#5a6070]"
                                    style={{ fontFamily: /[ঀ-৿]/.test(note) ? "Kalpurush, sans-serif" : undefined }}
                                  >
                                    <span className="text-[#cfd5e0] mr-[6px]">—</span>{note}
                                  </span>
                                )}
                              </div>
                            );
                          })() : (
                            <div className="flex items-baseline gap-[10px] flex-wrap">
                              {dose.doseShort && (
                                <span
                                  className="inline-block text-[12px] font-bold rounded-[4px]"
                                  style={{ background: "#eaf5e3", color: "#358C11", padding: "2px 7px" }}
                                >
                                  {dose.doseShort}
                                </span>
                              )}
                              {dose.doseBn ? (
                                <span
                                  className="text-[14px] leading-[1.55] text-[#0F100F]"
                                  style={{ fontFamily: "Kalpurush, sans-serif" }}
                                >
                                  {dose.doseBn}
                                </span>
                              ) : (
                                !dose.doseShort && <span className="text-[13.5px] text-[#8c9198]">—</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </>
            )}

            {(mode === "edit" || mode === "add") && (
              <>
                <div className="flex items-center justify-between px-[22px] py-[14px] shrink-0" style={{ borderBottom: "1px solid #eef0f4" }}>
                  <span className="text-[16px] font-bold text-[#0F100F]">
                    {mode === "add" ? "Add New Drug" : "Edit Drug"}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto mdrug-scroll px-[22px] py-[18px] flex flex-col gap-[14px]">
                  <div className="grid grid-cols-2 gap-[12px]">
                    <div className="flex flex-col gap-[6px]">
                      <label className="text-[13px] font-medium text-[#5a6070]">Generic Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Paracetamol"
                        value={formGeneric}
                        onChange={(e) => setFormGeneric(e.target.value)}
                        className="mdrug-input"
                        style={baseInput}
                      />
                    </div>
                    <div className="flex flex-col gap-[6px]">
                      <label className="text-[13px] font-medium text-[#5a6070]">Drug Class</label>
                      <Dropdown
                        value={formClass}
                        options={DRUG_CLASS_OPTIONS}
                        onChange={setFormClass}
                        open={classOpen}
                        setOpen={setClassOpen}
                        placeholder="Select class"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-[12px]">
                    <div className="flex flex-col gap-[6px]">
                      <label className="text-[13px] font-medium text-[#5a6070]">
                        Brand Name<span style={{ color: "#dc2626", marginLeft: 3 }}>*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Napa"
                        value={formBrand}
                        onChange={(e) => setFormBrand(e.target.value)}
                        className="mdrug-input"
                        style={baseInput}
                      />
                    </div>
                    <div className="flex flex-col gap-[6px]">
                      <label className="text-[13px] font-medium text-[#5a6070]">Manufacturer</label>
                      <Dropdown
                        value={formManufacturer}
                        options={DRUG_MANUFACTURER_OPTIONS}
                        onChange={setFormManufacturer}
                        open={mfgOpen}
                        setOpen={setMfgOpen}
                        placeholder="Select manufacturer"
                      />
                    </div>
                  </div>

                  {/* Doses (multi-row editor) */}
                  <div className="flex flex-col gap-[10px] rounded-[10px] px-[12px] py-[12px]" style={{ background: "#F7F8FA", border: "1px solid #eef0f4" }}>
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-[#0F100F]">
                        Doses <span className="text-[#8c9198] font-normal">({formDoses.length})</span>
                      </span>
                    </div>
                    {formDoses.map((dose, i) => (
                      <div
                        key={dose.id}
                        className="flex flex-col gap-[8px] rounded-[8px] bg-white px-[10px] py-[10px]"
                        style={{ border: "1px solid #e3e6eb" }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-[0.4px] text-[#8c9198]">
                            Dose #{i + 1}
                          </span>
                          {formDoses.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeDose(dose.id)}
                              className="flex items-center justify-center cursor-pointer border-none bg-transparent"
                              style={{ width: 22, height: 22, color: "#dc2626" }}
                              aria-label="Remove dose"
                            >
                              <Trash2 size={12} strokeWidth={2.5} />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-[8px]">
                          <div className="flex flex-col gap-[4px]">
                            <label className="text-[12px] font-medium text-[#5a6070]">Dose Form</label>
                            <Dropdown
                              value={dose.doseForm}
                              options={DRUG_DOSE_FORM_OPTIONS}
                              onChange={(v) => updateDose(dose.id, { doseForm: v })}
                              open={openDoseFormFor === dose.id}
                              setOpen={(o) => setOpenDoseFormFor(o ? dose.id : null)}
                              placeholder="Select dose form"
                            />
                          </div>
                          <div className="flex flex-col gap-[4px]">
                            <label className="text-[12px] font-medium text-[#5a6070]">Strength</label>
                            <input
                              type="text"
                              placeholder="e.g. 500 mg"
                              value={dose.strength}
                              onChange={(e) => updateDose(dose.id, { strength: e.target.value })}
                              className="mdrug-input"
                              style={{ ...baseInput, height: 36 }}
                            />
                          </div>
                        </div>

                        {(() => {
                          const v2Form = v2FormFromLabel(dose.doseForm);
                          const schema = v2Form ? V2_SCHEMA_BY_FORM[v2Form] : null;

                          // No V2 form selected → wait for the doctor to pick
                          // one. The "Dose Short" / "Dose (Bengali)" fallback
                          // fields have been removed at the user's request.
                          if (!v2Form || !schema) {
                            return (
                              <div
                                className="text-[13px] italic"
                                style={{ color: "#8c9198", padding: "6px 2px" }}
                              >
                                Pick a Dose Form above to add the dose details.
                              </div>
                            );
                          }

                          // V2 form selected → render schema-driven fields.
                          // Each field uses the same `mdrug-input` look as the
                          // rest of the Add-new form (white bg, 1px #e3e6eb
                          // border, 8px radius, green focus). Dropdown fields
                          // are editable comboboxes — pick from suggestions OR
                          // type free text. NOTE spans both columns as a
                          // textarea so the doctor can write a longer note.
                          const setSchemaValue = (field: V2FieldType, v: string) => {
                            updateDose(dose.id, {
                              schemaValues: { ...(dose.schemaValues ?? {}), [field]: v },
                            });
                          };
                          return (
                            <div className="grid grid-cols-2 gap-[8px]">
                              {schema.map((fieldType) => {
                                const value = dose.schemaValues?.[fieldType] ?? "";
                                const isNote = fieldType === "NOTE";
                                const cellClass = isNote ? "col-span-2 flex flex-col gap-[4px]" : "flex flex-col gap-[4px]";
                                const label = V2_FIELD_LABELS[fieldType];
                                return (
                                  <div key={fieldType} className={cellClass}>
                                    <label className="text-[12px] font-medium text-[#5a6070]">{label}</label>
                                    {isNote ? (
                                      <SchemaNoteField
                                        value={value}
                                        placeholder={label}
                                        onChange={(v) => setSchemaValue(fieldType, v)}
                                        baseInput={baseInput}
                                      />
                                    ) : (
                                      <SchemaFieldCombobox
                                        value={value}
                                        placeholder={label}
                                        options={getOptionsForField(fieldType, v2Form)}
                                        onChange={(v) => setSchemaValue(fieldType, v)}
                                        baseInput={baseInput}
                                      />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={addDose}
                      className="self-start flex items-center gap-[4px] text-[13px] font-semibold cursor-pointer bg-transparent border-none mt-[2px]"
                      style={{ color: "#358C11" }}
                    >
                      <Plus size={12} strokeWidth={2.5} /> Add another dose
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-[10px] px-[22px] py-[14px] shrink-0" style={{ borderTop: "1px solid #eef0f4", background: "#fafbfc" }}>
                  <button
                    onClick={cancelForm}
                    className="px-[18px] h-[36px] rounded-[8px] text-[14px] font-semibold cursor-pointer bg-transparent"
                    style={{ color: "#5a6070", border: "1px solid #e3e6eb" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      // Every collected field is stored. A drug added here gets
                      // DEFAULT_EMPTY_SCHEMA, matching the free-text fallback.
                      const doses: DrugDose[] = formDoses.map((d) => ({
                        id: d.id,
                        doseForm: d.doseForm,
                        strength: d.strength,
                        doseShort: d.doseShort,
                        doseBn: d.doseBn,
                        schemaValues: d.schemaValues,
                      }));
                      if (mode === "add") {
                        const id = `drg-${Date.now().toString(36)}`;
                        onAdd({
                          id,
                          brandName: formBrand,
                          genericName: formGeneric,
                          drugClass: formClass,
                          manufacturer: formManufacturer,
                          doses,
                          isMine: true,
                          schema: [...DEFAULT_EMPTY_SCHEMA],
                          defaults: doses[0]?.schemaValues,
                        });
                        setSelectedId(id);
                      } else if (selected) {
                        onEdit(selected.id, {
                          brandName: formBrand,
                          genericName: formGeneric,
                          drugClass: formClass,
                          manufacturer: formManufacturer,
                          doses,
                          defaults: doses[0]?.schemaValues ?? selected.defaults,
                        });
                      }
                      setMode("view");
                    }}
                    disabled={!canSave}
                    className="px-[22px] h-[36px] rounded-[8px] text-[14px] font-semibold text-white border-none"
                    style={{
                      background: canSave ? "#358C11" : "#c4c9d4",
                      opacity: canSave ? 1 : 0.8,
                      cursor: canSave ? "pointer" : "not-allowed",
                    }}
                  >
                    {mode === "add" ? "Save Drug" : "Save Changes"}
                  </button>
                </div>
              </>
            )}

            {mode === "view" && !selected && (
              <div className="flex-1 flex flex-col items-center justify-center px-[40px] text-center">
                <div
                  className="flex items-center justify-center rounded-full mb-[18px]"
                  style={{ width: 72, height: 72, background: "#eaf5e3" }}
                >
                  <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12.5 23V27.5C12.5 30.2614 10.2614 32.5 7.5 32.5C4.73858 32.5 2.5 30.2614 2.5 27.5V23H12.5ZM7.5 12.5C10.2614 12.5 12.5 14.7386 12.5 17.5V22H2.5V17.5C2.5 14.7386 4.73858 12.5 7.5 12.5Z" stroke="#358C11" strokeWidth="1.4" />
                    <rect x="15.5" y="3.5" width="18" height="29" rx="1.5" stroke="#358C11" strokeWidth="1.4" />
                    <path d="M24.5 4V18.5V33M33 23.1934H16M33 13H16" stroke="#358C11" strokeWidth="1.4" />
                    <circle cx="20" cy="18" r="2.5" stroke="#358C11" strokeWidth="1.4" />
                    <circle cx="20" cy="8" r="2.5" stroke="#358C11" strokeWidth="1.4" />
                    <circle cx="20" cy="28" r="2.5" stroke="#358C11" strokeWidth="1.4" />
                    <circle cx="29" cy="18" r="2.5" stroke="#358C11" strokeWidth="1.4" />
                    <circle cx="29" cy="8" r="2.5" stroke="#358C11" strokeWidth="1.4" />
                    <circle cx="29" cy="28" r="2.5" stroke="#358C11" strokeWidth="1.4" />
                  </svg>
                </div>
                <span className="text-[17px] font-bold text-[#0F100F] mb-[6px]">
                  Select a drug to view
                </span>
                <p className="text-[14px] text-[#8c9198] leading-[1.55] max-w-[340px]">
                  Pick a drug from the list to see its generic name, strength, manufacturer, and dosage details — or add a new one of your own.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Delete confirmation */}
        {confirmTarget && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: "rgba(15,23,42,0.35)", borderRadius: 12 }}
          >
            <div
              className="bg-white rounded-[10px] shadow-xl flex flex-col overflow-hidden"
              style={{ width: 420, border: "1px solid #e3e6eb" }}
            >
              <div className="px-[22px] pt-[22px] pb-[6px] flex items-start gap-[12px]">
                <div
                  className="flex items-center justify-center rounded-full shrink-0"
                  style={{ width: 36, height: 36, background: "#fef2f2" }}
                >
                  <Trash2 size={17} style={{ color: "#dc2626" }} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[16px] font-bold text-[#0F100F]">Delete this drug?</span>
                  <p className="text-[14px] text-[#5a6070] mt-[4px] leading-[1.55]">
                    <span className="font-semibold text-[#0F100F]">"{confirmTarget.brandName}"</span> will be permanently removed from your library. This can't be undone.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-[8px] px-[22px] py-[14px] mt-[10px]" style={{ background: "#fafbfc", borderTop: "1px solid #eef0f4" }}>
                <button
                  onClick={() => setConfirmDeleteFor(null)}
                  className="px-[16px] h-[34px] rounded-[8px] text-[14px] font-semibold cursor-pointer bg-transparent"
                  style={{ color: "#5a6070", border: "1px solid #e3e6eb" }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (confirmDeleteFor) onDelete(confirmDeleteFor);
                    setConfirmDeleteFor(null);
                    setSelectedId(null);
                    setMode("view");
                  }}
                  className="flex items-center gap-[6px] px-[16px] h-[34px] rounded-[8px] text-[14px] font-semibold text-white cursor-pointer border-none"
                  style={{ background: "#dc2626" }}
                >
                  <Trash2 size={13} strokeWidth={2.5} />
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dose delete confirmation */}
        {confirmDoseTarget && selected && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: "rgba(15,23,42,0.35)", borderRadius: 12 }}
          >
            <div
              className="bg-white rounded-[10px] shadow-xl flex flex-col overflow-hidden"
              style={{ width: 440, border: "1px solid #e3e6eb" }}
            >
              <div className="px-[22px] pt-[22px] pb-[6px] flex items-start gap-[12px]">
                <div
                  className="flex items-center justify-center rounded-full shrink-0"
                  style={{ width: 36, height: 36, background: "#fef2f2" }}
                >
                  <Trash2 size={17} style={{ color: "#dc2626" }} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[16px] font-bold text-[#0F100F]">Delete this dose?</span>
                  <p className="text-[14px] text-[#5a6070] mt-[4px] leading-[1.55]">
                    The{" "}
                    <span className="font-semibold text-[#0F100F]">
                      {confirmDoseTarget.doseForm ? `${confirmDoseTarget.doseForm} · ` : ""}
                      {confirmDoseTarget.strength}
                    </span>{" "}
                    variant of{" "}
                    <span className="font-semibold text-[#0F100F]">"{selected.brandName}"</span>{" "}
                    will be removed. This can't be undone.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-[8px] px-[22px] py-[14px] mt-[10px]" style={{ background: "#fafbfc", borderTop: "1px solid #eef0f4" }}>
                <button
                  onClick={() => setConfirmDeleteDoseFor(null)}
                  className="px-[16px] h-[34px] rounded-[8px] text-[14px] font-semibold cursor-pointer bg-transparent"
                  style={{ color: "#5a6070", border: "1px solid #e3e6eb" }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => setConfirmDeleteDoseFor(null)}
                  className="flex items-center gap-[6px] px-[16px] h-[34px] rounded-[8px] text-[14px] font-semibold text-white cursor-pointer border-none"
                  style={{ background: "#dc2626" }}
                >
                  <Trash2 size={13} strokeWidth={2.5} />
                  Delete dose
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Manage Test Modal ──────────────────────────────────────

export type TestGender = "All" | "Male" | "Female";

export type TestRange = {
  id: string;
  gender?: TestGender;
  ageGroup?: string;
  rangeMin?: string;
  rangeMax?: string;
};

export type TestItem = {
  id: string;
  panelName?: string;
  name: string;
  abbreviation: string;
  specimen?: string;
  method?: string;
  unit: string;
  ranges: TestRange[];
  isMine: boolean;
};

const TEST_PANEL_OPTIONS = [
  "Complete Blood Count (CBC)",
  "Liver Function Test (LFT)",
  "Renal Function Test (RFT)",
  "Thyroid Function Test (TFT)",
  "Lipid Profile",
  "Electrolytes",
  "Urine Routine Examination",
];
const TEST_SPECIMEN_OPTIONS = ["Blood", "Plasma", "Serum", "Skin", "Stool", "Urine"];
const TEST_METHOD_OPTIONS = ["Chromogenic", "Colt detection", "Colonoscopy", "ECLIA", "Enzymatic"];
const TEST_GENDER_OPTIONS: TestGender[] = ["All", "Male", "Female"];

export const MOCK_TESTS: TestItem[] = [
  {
    id: "t1",
    panelName: "Complete Blood Count (CBC)",
    name: "Haemoglobin",
    abbreviation: "Hb",
    specimen: "Blood",
    method: "Colt detection",
    unit: "g/dL",
    ranges: [
      { id: "t1-r1", gender: "Male", ageGroup: "Adult", rangeMin: "13.5", rangeMax: "17.5" },
      { id: "t1-r2", gender: "Female", ageGroup: "Adult", rangeMin: "12", rangeMax: "16" },
      { id: "t1-r3", gender: "All", ageGroup: "Pediatric", rangeMin: "11", rangeMax: "14" },
    ],
    isMine: false,
  },
  { id: "t2", panelName: "Glycemic Test", name: "Fasting Blood Sugar", abbreviation: "FBS", isMine: true, unit: "mg/dL", ranges: [] },
  {
    id: "t3",
    panelName: "Complete Blood Count (CBC)",
    name: "White Blood Cell Count",
    abbreviation: "WBC",
    specimen: "Blood",
    method: "Chromogenic",
    unit: "/µL",
    ranges: [
      { id: "t3-r1", gender: "All", ageGroup: "Adult", rangeMin: "4000", rangeMax: "11000" },
    ],
    isMine: false,
  },
  { id: "t4", panelName: "Diabetic Marker", name: "HbA1c", abbreviation: "HbA1c", isMine: true, unit: "%", ranges: [] },
  {
    id: "t5",
    panelName: "Renal Function Test (RFT)",
    name: "Serum Creatinine",
    abbreviation: "Cr",
    specimen: "Blood",
    method: "Enzymatic",
    unit: "mg/dL",
    ranges: [
      { id: "t5-r1", gender: "Male", ageGroup: "Adult", rangeMin: "0.7", rangeMax: "1.3" },
      { id: "t5-r2", gender: "Female", ageGroup: "Adult", rangeMin: "0.6", rangeMax: "1.1" },
    ],
    isMine: false,
  },
  {
    id: "t6",
    panelName: "Liver Function Test (LFT)",
    name: "Alanine Aminotransferase",
    abbreviation: "ALT",
    specimen: "Blood",
    method: "Enzymatic",
    unit: "U/L",
    ranges: [
      { id: "t6-r1", gender: "All", ageGroup: "Adult", rangeMin: "7", rangeMax: "56" },
    ],
    isMine: false,
  },
  {
    id: "t7",
    panelName: "Hepatic Profile",
    name: "Aspartate Aminotransferase",
    abbreviation: "AST",
    specimen: "Blood",
    method: "Enzymatic",
    unit: "U/L",
    ranges: [
      { id: "t7-r1", gender: "All", ageGroup: "Adult", rangeMin: "10", rangeMax: "40" },
    ],
    isMine: false,
  },
  {
    id: "t8",
    panelName: "Thyroid Function Test (TFT)",
    name: "Thyroid Stimulating Hormone",
    abbreviation: "TSH",
    specimen: "Blood",
    method: "ECLIA",
    unit: "mIU/L",
    ranges: [
      { id: "t8-r1", gender: "All", ageGroup: "Adult", rangeMin: "0.4", rangeMax: "4.0" },
      { id: "t8-r2", gender: "Female", ageGroup: "Pregnancy", rangeMin: "0.1", rangeMax: "2.5" },
    ],
    isMine: false,
  },
  {
    id: "t9",
    panelName: "Lipid Profile",
    name: "Low-Density Lipoprotein",
    abbreviation: "LDL",
    specimen: "Blood",
    method: "Chromogenic",
    unit: "mg/dL",
    ranges: [
      { id: "t9-r1", gender: "All", ageGroup: "Adult", rangeMax: "100" },
    ],
    isMine: false,
  },
  {
    id: "t10",
    panelName: "Vitamin Test",
    name: "Vitamin D, 25-OH",
    abbreviation: "25-OH-D",
    specimen: "Blood",
    method: "Chromogenic",
    unit: "ng/mL",
    ranges: [
      { id: "t10-r1", gender: "All", ageGroup: "Adult", rangeMin: "30", rangeMax: "100" },
    ],
    isMine: true,
  },
];

function ManageTestModal({
  onClose,
  items,
  onAdd,
  onEdit,
  onDelete,
}: {
  onClose: () => void;
  items: TestItem[];
  onAdd: (t: TestItem) => void;
  onEdit: (id: string, patch: Partial<TestItem>) => void;
  onDelete: (id: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"all" | "mine">("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"view" | "edit" | "add">("view");
  const [confirmDeleteFor, setConfirmDeleteFor] = useState<string | null>(null);

  // Form state
  const [formPanel, setFormPanel] = useState<string | undefined>(undefined);
  const [formName, setFormName] = useState("");
  const [formAbbrev, setFormAbbrev] = useState("");
  const [formSpecimen, setFormSpecimen] = useState<string | undefined>(undefined);
  const [formMethod, setFormMethod] = useState("");
  const [formUnit, setFormUnit] = useState("");
  const [formRanges, setFormRanges] = useState<TestRange[]>([]);

  const [panelOpen, setPanelOpen] = useState(false);
  const [specOpen, setSpecOpen] = useState(false);
  const [methodOpen, setMethodOpen] = useState(false);

  const addRangeRow = () => {
    setFormRanges((prev) => [
      ...prev,
      { id: `new-${Date.now()}-${prev.length}` },
    ]);
  };
  const updateRange = (id: string, patch: Partial<TestRange>) => {
    setFormRanges((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };
  const removeRange = (id: string) => {
    setFormRanges((prev) => prev.filter((r) => r.id !== id));
  };

  const filtered = items.filter((t) => {
    if (activeTab === "mine" && !t.isMine) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.abbreviation.toLowerCase().includes(q) ||
      (t.panelName ?? "").toLowerCase().includes(q) ||
      (t.specimen ?? "").toLowerCase().includes(q)
    );
  });

  // Build the displayed list — tests sharing a panel name with at least one
  // other test collapse into a single panel row; "single-member panels" (a
  // test whose panelName is unique among its peers) and tests with no
  // panelName at all both render as individual test rows. Order follows the
  // first occurrence of each panel / standalone test in the library.
  type ListEntry =
    | { kind: "panel"; name: string; tests: TestItem[] }
    | { kind: "test"; test: TestItem };
  const listEntries: ListEntry[] = (() => {
    // First pass: count how many filtered tests share each panel name.
    const panelCounts = new Map<string, number>();
    for (const t of filtered) {
      if (t.panelName) panelCounts.set(t.panelName, (panelCounts.get(t.panelName) ?? 0) + 1);
    }
    // Second pass: build rows. Multi-member panels collapse to one row.
    const out: ListEntry[] = [];
    const panelIndex = new Map<string, number>();
    for (const t of filtered) {
      const isMultiPanel = t.panelName && (panelCounts.get(t.panelName) ?? 0) > 1;
      if (isMultiPanel && t.panelName) {
        const existing = panelIndex.get(t.panelName);
        if (existing === undefined) {
          panelIndex.set(t.panelName, out.length);
          out.push({ kind: "panel", name: t.panelName, tests: [t] });
        } else {
          (out[existing] as { kind: "panel"; name: string; tests: TestItem[] }).tests.push(t);
        }
      } else {
        out.push({ kind: "test", test: t });
      }
    }
    return out;
  })();

  // selectedId can hold either a test id ("t1", "t2"...) or a panel marker
  // prefixed with "panel:" — the latter pulls all member tests into the
  // right-side detail view.
  const PANEL_PREFIX = "panel:";
  const selectedPanel = selectedId && selectedId.startsWith(PANEL_PREFIX) ? selectedId.slice(PANEL_PREFIX.length) : null;
  const selectedPanelTests = selectedPanel ? items.filter((t) => t.panelName === selectedPanel) : [];
  const selected = selectedId && !selectedPanel ? items.find((t) => t.id === selectedId) : null;

  // When editing, the form acts on a specific test — track it separately so
  // the edit flow doesn't lose the panel context the user came from.
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const editingTest = editingTestId ? items.find((t) => t.id === editingTestId) : null;

  const resetForm = () => {
    setFormPanel(undefined);
    setFormName("");
    setFormAbbrev("");
    setFormSpecimen(undefined);
    setFormMethod("");
    setFormUnit("");
    setFormRanges([]);
  };

  const startAdd = () => {
    setMode("add");
    setSelectedId(null);
    resetForm();
    setFormRanges([{ id: `new-${Date.now()}-0` }]);
  };
  const startEdit = (testId?: string) => {
    const target = testId ? items.find((t) => t.id === testId) : selected;
    if (target) {
      setEditingTestId(target.id);
      setFormPanel(target.panelName);
      setFormName(target.name);
      setFormAbbrev(target.abbreviation);
      setFormSpecimen(target.specimen);
      setFormMethod(target.method ?? "");
      setFormUnit(target.unit);
      const copied = target.ranges.map((r) => ({ ...r }));
      setFormRanges(copied.length > 0 ? copied : [{ id: `new-${Date.now()}-0` }]);
    }
    setMode("edit");
  };
  const cancelForm = () => { setMode("view"); setEditingTestId(null); };

  const rangesEqual = (a: TestRange[], b: TestRange[]) => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (
        a[i].gender !== b[i].gender ||
        (a[i].ageGroup ?? "") !== (b[i].ageGroup ?? "") ||
        (a[i].rangeMin ?? "") !== (b[i].rangeMin ?? "") ||
        (a[i].rangeMax ?? "") !== (b[i].rangeMax ?? "")
      ) return false;
    }
    return true;
  };

  const editTarget = editingTest ?? selected;
  const editHasChanges = !!editTarget && (
    formPanel !== editTarget.panelName ||
    formName !== editTarget.name ||
    formAbbrev !== editTarget.abbreviation ||
    formSpecimen !== editTarget.specimen ||
    formMethod !== (editTarget.method ?? "") ||
    formUnit !== editTarget.unit ||
    !rangesEqual(formRanges, editTarget.ranges)
  );
  const addIsValid = formName.trim() !== "" && formAbbrev.trim() !== "" && formUnit.trim() !== "";
  const canSave = mode === "edit" ? editHasChanges : addIsValid;

  const confirmTarget = confirmDeleteFor
    ? items.find((t) => t.id === confirmDeleteFor)
    : null;

  const scrollbarCss = `
    .mtest-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
    .mtest-scroll::-webkit-scrollbar-track { background: transparent; }
    .mtest-scroll::-webkit-scrollbar-thumb { background: rgba(140,145,152,0.25); border-radius: 999px; }
    .mtest-scroll::-webkit-scrollbar-thumb:hover { background: rgba(140,145,152,0.45); }
    .mtest-scroll { scrollbar-width: thin; scrollbar-color: rgba(140,145,152,0.25) transparent; }
    .mtest-add-btn { transition: background 0.15s ease; }
    .mtest-add-btn:hover:not(:disabled) { background: #2a7a0d !important; }
    .mtest-add-btn:disabled { cursor: not-allowed; opacity: 0.6; }
    .mtest-input { transition: border-color 0.15s ease, box-shadow 0.15s ease; }
    .mtest-input:focus {
      border-color: #358C11 !important;
      box-shadow: 0 0 0 3px rgba(53, 140, 17, 0.12) !important;
    }
    .mtest-list-item { transition: background 0.12s ease; }
    .mtest-list-item:hover:not(.mtest-selected) { background: #eaf5e3 !important; }
  `;

  const baseInput: React.CSSProperties = {
    background: "#ffffff",
    border: "1px solid #e3e6eb",
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 14,
    color: "#0F100F",
    outline: "none",
    width: "100%",
  };

  const renderRange = (r: TestRange, unit: string) => {
    if (!r.rangeMin && !r.rangeMax) return "";
    if (r.rangeMin && r.rangeMax) return `${r.rangeMin}–${r.rangeMax} ${unit}`;
    if (r.rangeMax) return `≤ ${r.rangeMax} ${unit}`;
    if (r.rangeMin) return `≥ ${r.rangeMin} ${unit}`;
    return "";
  };

  const secondaryLineFor = (t: TestItem): string => {
    const parts: string[] = [];
    if (t.panelName) parts.push(t.panelName);
    if (t.ranges.length === 1) {
      const r = renderRange(t.ranges[0], t.unit);
      if (r) parts.push(r);
    } else if (t.ranges.length > 1) {
      parts.push(`${t.ranges.length} reference ranges`);
    }
    return parts.join(" · ");
  };

  const Dropdown = ({
    value,
    options,
    onChange,
    open,
    setOpen,
    placeholder,
  }: {
    value?: string;
    options: string[];
    onChange: (v: string) => void;
    open: boolean;
    setOpen: (v: boolean) => void;
    placeholder: string;
  }) => (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between cursor-pointer mtest-input"
        style={{
          ...baseInput,
          border: open ? "1px solid #358C11" : "1px solid #e3e6eb",
          boxShadow: open ? "0 0 0 3px rgba(53,140,17,0.12)" : "none",
        }}
      >
        <span style={{ color: value ? "#0F100F" : "#8c9198" }}>{value ?? placeholder}</span>
        <ChevronDown size={14} className="text-[#8c9198]" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute left-0 right-0 rounded-[8px] bg-white overflow-hidden"
            style={{
              top: "calc(100% + 4px)",
              border: "1px solid #e3e6eb",
              boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
              zIndex: 20,
              maxHeight: 220,
              overflowY: "auto",
            }}
          >
            {options.map((opt) => {
              const isSel = opt === value;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => { onChange(opt); setOpen(false); }}
                  className="w-full text-left px-[12px] py-[8px] text-[14px] cursor-pointer border-none flex items-center justify-between"
                  style={{
                    background: isSel ? "#f0f7ed" : "transparent",
                    color: isSel ? "#358C11" : "#0F100F",
                    fontWeight: isSel ? 600 : 400,
                  }}
                >
                  {opt}
                  {isSel && <Check size={13} style={{ color: "#358C11" }} strokeWidth={2.5} />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );

  const Val = ({ v }: { v?: string }) =>
    v ? <span className="text-[14px] text-[#0F100F] font-semibold">{v}</span> : <span className="text-[14px] text-[#8c9198]">--</span>;

  return (
    <div data-module="master-data" className="fixed inset-0 z-50 flex items-center justify-center font-[DM_Sans]" style={{ background: "rgba(0,0,0,0.45)" }}>
      <style dangerouslySetInnerHTML={{ __html: scrollbarCss }} />
      <div className="w-[1040px] bg-white rounded-[12px] flex flex-col overflow-hidden shadow-2xl relative" style={{ height: 680 }}>

        {/* Header */}
        <div className="flex items-center justify-between px-[20px] py-[10px] shrink-0" style={{ background: "#358C11" }}>
          <span className="text-[15px] font-semibold text-white">Manage Test</span>
          <button onClick={onClose} className="flex items-center justify-center w-[28px] h-[28px] rounded-[6px] text-white border-none cursor-pointer" style={{ background: "rgba(255,255,255,0.15)" }}>
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0">

          {/* Left panel */}
          <div className="flex flex-col shrink-0" style={{ width: 374, borderRight: "1px solid #eef0f4", background: "#F7F8FA" }}>

            {/* Search */}
            <div className="p-[14px] shrink-0" style={{ borderBottom: "1px solid #eef0f4" }}>
              <div className="relative">
                <Search size={14} className="absolute left-[10px] top-1/2 -translate-y-1/2 text-[#8c9198] pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search test, abbreviation, panel…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="mtest-input w-full text-[14px] text-[#0F100F] outline-none font-[DM_Sans]"
                  style={{
                    height: 34,
                    paddingLeft: 30,
                    paddingRight: search ? 30 : 10,
                    background: "#ffffff",
                    border: "1px solid #e3e6eb",
                    borderRadius: 6,
                  }}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-[6px] top-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer border-none"
                    style={{ width: 20, height: 20, borderRadius: 999, background: "#eef0f4", color: "#5a6070" }}
                  >
                    <X size={11} strokeWidth={2.5} />
                  </button>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex shrink-0" style={{ borderBottom: "1px solid #eef0f4" }}>
              {(["all", "mine"] as const).map((tab) => {
                const active = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className="flex-1 py-[9px] text-[13px] font-semibold cursor-pointer border-none bg-transparent"
                    style={{
                      color: active ? "#064232" : "#8c9198",
                      borderBottom: active ? "2px solid #358C11" : "2px solid transparent",
                      marginBottom: -1,
                    }}
                  >
                    {tab === "all" ? "All" : "Personalized"}
                  </button>
                );
              })}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto mtest-scroll">
              {listEntries.length === 0 ? (
                <div className="px-[14px] py-[40px] text-center text-[13px] text-[#8c9198]">
                  No test found
                </div>
              ) : (
                listEntries.map((entry) => {
                  if (entry.kind === "panel") {
                    const panelKey = `${PANEL_PREFIX}${entry.name}`;
                    const isSelected = panelKey === selectedId && mode !== "add";
                    return (
                      <button
                        key={panelKey}
                        onClick={() => { setSelectedId(panelKey); setMode("view"); }}
                        className={`mtest-list-item w-full text-left px-[14px] py-[10px] cursor-pointer border-none bg-transparent ${isSelected ? "mtest-selected" : ""}`}
                        style={{
                          background: isSelected ? "#eaf5e3" : "transparent",
                          borderBottom: "1px solid #eef0f4",
                          borderLeft: isSelected ? "3px solid #358C11" : "3px solid transparent",
                        }}
                      >
                        <div className="flex items-center justify-between gap-[6px]">
                          <span className="text-[14px] font-semibold text-[#0F100F] truncate">{entry.name}</span>
                          <span className="text-[10px] font-bold uppercase shrink-0 rounded-[3px]" style={{ background: "#eef0f4", color: "#5a6070", padding: "2px 5px 1px" }}>
                            Panel
                          </span>
                        </div>
                        <p className="text-[12px] text-[#5a6070] leading-[1.45] truncate mt-[3px]">
                          {entry.tests.length} test{entry.tests.length === 1 ? "" : "s"} · {entry.tests.map((t) => t.abbreviation).join(", ")}
                        </p>
                      </button>
                    );
                  }
                  const t = entry.test;
                  const isSelected = t.id === selectedId && mode !== "add";
                  const secondary = secondaryLineFor(t);
                  return (
                    <button
                      key={t.id}
                      onClick={() => { setSelectedId(t.id); setMode("view"); }}
                      className={`mtest-list-item w-full text-left px-[14px] py-[10px] cursor-pointer border-none bg-transparent ${isSelected ? "mtest-selected" : ""}`}
                      style={{
                        background: isSelected ? "#eaf5e3" : "transparent",
                        borderBottom: "1px solid #eef0f4",
                        borderLeft: isSelected ? "3px solid #358C11" : "3px solid transparent",
                      }}
                    >
                      <div className="flex items-center justify-between gap-[6px]">
                        <span className="text-[14px] font-semibold text-[#0F100F] truncate">
                          {t.name}
                          <span className="text-[#8c9198] font-normal"> · {t.abbreviation}</span>
                        </span>
                        {t.isMine && (
                          <span className="text-[10px] font-bold uppercase shrink-0 rounded-[3px]" style={{ background: "#358C11", color: "#ffffff", padding: "2px 5px 1px" }}>
                            Own
                          </span>
                        )}
                      </div>
                      {secondary && (
                        <p className="text-[12px] text-[#5a6070] leading-[1.45] truncate mt-[3px]">
                          {secondary}
                        </p>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Add new */}
            <div className="p-[12px] shrink-0" style={{ borderTop: "1px solid #eef0f4", background: "#ffffff" }}>
              <button
                onClick={startAdd}
                disabled={mode === "add"}
                className="mtest-add-btn w-full flex items-center justify-center gap-[6px] rounded-[8px] text-[14px] font-semibold cursor-pointer border-none font-[DM_Sans]"
                style={{ height: 40, background: "#358C11", color: "#ffffff" }}
              >
                <Plus size={14} strokeWidth={2.5} />
                Add New Test
              </button>
            </div>
          </div>

          {/* Right panel */}
          <div className="flex-1 flex flex-col min-w-0">

            {mode === "view" && selected && (
              <>
                <div
                  className="flex items-center justify-between px-[22px] shrink-0"
                  style={{
                    borderBottom: "1px solid #eef0f4",
                    paddingTop: selected.isMine ? 15 : 17,
                    paddingBottom: selected.isMine ? 15 : 17,
                  }}
                >
                  <div className="flex items-center gap-[8px]">
                    <span className="text-[16px] font-bold text-[#0F100F]">{selected.name}</span>
                    <span className="text-[13px] font-mono text-[#5a6070]">({selected.abbreviation})</span>
                    {selected.isMine && (
                      <span className="text-[11px] font-bold uppercase rounded-[4px]" style={{ background: "#358C11", color: "#ffffff", paddingTop: 3, paddingBottom: 2, paddingLeft: 6, paddingRight: 6 }}>
                        Own
                      </span>
                    )}
                  </div>
                  {selected.isMine ? (
                    <div className="flex items-center gap-[8px]">
                      <button
                        onClick={() => startEdit(selected.id)}
                        className="flex items-center gap-[4px] px-[10px] py-[6px] rounded-[6px] text-[13px] font-semibold cursor-pointer bg-transparent"
                        style={{ color: "#358C11", border: "1px solid #358C11" }}
                      >
                        <Pencil size={12} strokeWidth={2.5} /> Edit
                      </button>
                      <button
                        onClick={() => setConfirmDeleteFor(selected.id)}
                        className="flex items-center gap-[4px] px-[10px] py-[6px] rounded-[6px] text-[13px] font-semibold cursor-pointer bg-transparent"
                        style={{ color: "#dc2626", border: "1px solid #fecaca" }}
                      >
                        <Trash2 size={12} strokeWidth={2.5} /> Delete
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center" style={{ height: 28 }}>
                      <span className="text-[12px] text-[#8c9198] italic">Read-only — added by system</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto mtest-scroll px-[22px] py-[18px] flex flex-col gap-[16px]">
                  <div className="grid grid-cols-3 gap-x-[24px] gap-y-[14px]">
                    <div className="flex flex-col gap-[4px] col-span-3">
                      <span className="text-[12px] font-semibold uppercase tracking-[0.4px] text-[#8c9198]">Panel Name</span>
                      <Val v={selected.panelName} />
                    </div>
                    <div className="flex flex-col gap-[4px]">
                      <span className="text-[12px] font-semibold uppercase tracking-[0.4px] text-[#8c9198]">Specimen</span>
                      <Val v={selected.specimen} />
                    </div>
                    <div className="flex flex-col gap-[4px]">
                      <span className="text-[12px] font-semibold uppercase tracking-[0.4px] text-[#8c9198]">Method</span>
                      <Val v={selected.method} />
                    </div>
                    <div className="flex flex-col gap-[4px]">
                      <span className="text-[12px] font-semibold uppercase tracking-[0.4px] text-[#8c9198]">Unit</span>
                      <Val v={selected.unit} />
                    </div>
                  </div>

                  <div style={{ height: 1, background: "#eef0f4" }} />

                  <div className="flex flex-col gap-[8px]">
                    <span className="text-[12px] font-semibold uppercase tracking-[0.4px] text-[#8c9198]">Reference Ranges</span>
                    {selected.ranges.length === 0 ? (
                      <span className="text-[14px] text-[#8c9198]">--</span>
                    ) : (
                      <div className="rounded-[8px] overflow-hidden" style={{ border: "1px solid #eef0f4" }}>
                        <div className="grid grid-cols-[1fr_1.2fr_1.6fr] px-[14px] py-[8px] text-[12px] font-bold uppercase tracking-[0.3px] text-[#8c9198]" style={{ background: "#F7F8FA", borderBottom: "1px solid #eef0f4" }}>
                          <span>Gender</span>
                          <span>Age Group</span>
                          <span>Range</span>
                        </div>
                        {selected.ranges.map((r, i) => (
                          <div
                            key={r.id}
                            className="grid grid-cols-[1fr_1.2fr_1.6fr] px-[14px] py-[10px] text-[14px] text-[#0F100F]"
                            style={{ borderBottom: i < selected.ranges.length - 1 ? "1px solid #eef0f4" : "none" }}
                          >
                            <span>{r.gender ?? <span className="text-[#8c9198]">--</span>}</span>
                            <span>{r.ageGroup || <span className="text-[#8c9198]">--</span>}</span>
                            <span className="font-semibold">{renderRange(r, selected.unit) || <span className="text-[#8c9198] font-normal">--</span>}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {(mode === "edit" || mode === "add") && (
              <>
                <div className="flex items-center justify-between px-[22px] py-[14px] shrink-0" style={{ borderBottom: "1px solid #eef0f4" }}>
                  <span className="text-[16px] font-bold text-[#0F100F]">
                    {mode === "add" ? "Add New Test" : "Edit Test"}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto mtest-scroll px-[22px] py-[18px] flex flex-col gap-[14px]">
                  <div className="flex flex-col gap-[6px]">
                    <label className="text-[13px] font-medium text-[#5a6070]">Panel Name</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="e.g. Complete Blood Count (CBC)"
                        value={formPanel ?? ""}
                        onChange={(e) => { setFormPanel(e.target.value || undefined); setPanelOpen(true); }}
                        onFocus={() => setPanelOpen(true)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const q = (formPanel ?? "").toLowerCase().trim();
                            const matches = TEST_PANEL_OPTIONS.filter((o) => o.toLowerCase().includes(q));
                            // If there's exactly one match and user hasn't typed an exact option, snap to it.
                            if (matches.length === 1 && matches[0] !== formPanel) {
                              setFormPanel(matches[0]);
                            }
                            setPanelOpen(false);
                            (e.target as HTMLInputElement).blur();
                          } else if (e.key === "Escape") {
                            setPanelOpen(false);
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                        className="mtest-input w-full"
                        style={{
                          ...baseInput,
                          paddingRight: 36,
                          border: panelOpen ? "1px solid #358C11" : "1px solid #e3e6eb",
                          boxShadow: panelOpen ? "0 0 0 3px rgba(53,140,17,0.12)" : "none",
                        }}
                      />
                      <ChevronDown
                        size={14}
                        className="absolute right-[12px] top-1/2 -translate-y-1/2 text-[#8c9198] pointer-events-none"
                        style={{ transform: panelOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
                      />
                      {panelOpen && (() => {
                        const q = (formPanel ?? "").toLowerCase().trim();
                        const matches = TEST_PANEL_OPTIONS.filter((o) => o.toLowerCase().includes(q));
                        return (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setPanelOpen(false)} />
                            <div
                              className="absolute left-0 right-0 rounded-[8px] bg-white overflow-hidden"
                              style={{
                                top: "calc(100% + 4px)",
                                border: "1px solid #e3e6eb",
                                boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
                                zIndex: 20,
                                maxHeight: 220,
                                overflowY: "auto",
                              }}
                            >
                              {matches.length === 0 ? (
                                <div className="px-[12px] py-[10px] text-[13px] text-[#8c9198]">
                                  No matches — press Enter to add "<span className="font-semibold text-[#0F100F]">{formPanel}</span>" as a new panel
                                </div>
                              ) : (
                                matches.map((opt) => {
                                  const isSel = opt === formPanel;
                                  return (
                                    <button
                                      key={opt}
                                      type="button"
                                      onClick={() => { setFormPanel(opt); setPanelOpen(false); }}
                                      className="w-full text-left px-[12px] py-[8px] text-[14px] cursor-pointer border-none flex items-center justify-between"
                                      style={{
                                        background: isSel ? "#f0f7ed" : "transparent",
                                        color: isSel ? "#358C11" : "#0F100F",
                                        fontWeight: isSel ? 600 : 400,
                                      }}
                                    >
                                      {opt}
                                      {isSel && <Check size={13} style={{ color: "#358C11" }} strokeWidth={2.5} />}
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-[12px]">
                    <div className="flex flex-col gap-[6px]">
                      <label className="text-[13px] font-medium text-[#5a6070]">
                        Test name<span style={{ color: "#dc2626", marginLeft: 3 }}>*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Haemoglobin"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className="mtest-input"
                        style={baseInput}
                      />
                    </div>
                    <div className="flex flex-col gap-[6px]">
                      <label className="text-[13px] font-medium text-[#5a6070]">
                        Abbreviation<span style={{ color: "#dc2626", marginLeft: 3 }}>*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Hb"
                        value={formAbbrev}
                        onChange={(e) => setFormAbbrev(e.target.value)}
                        className="mtest-input"
                        style={baseInput}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-[12px]">
                    <div className="flex flex-col gap-[6px]">
                      <label className="text-[13px] font-medium text-[#5a6070]">Specimen</label>
                      <Dropdown
                        value={formSpecimen}
                        options={TEST_SPECIMEN_OPTIONS}
                        onChange={setFormSpecimen}
                        open={specOpen}
                        setOpen={setSpecOpen}
                        placeholder="e.g. Blood"
                      />
                    </div>
                    <div className="flex flex-col gap-[6px]">
                      <label className="text-[13px] font-medium text-[#5a6070]">Method</label>
                      <Dropdown
                        value={formMethod || undefined}
                        options={TEST_METHOD_OPTIONS}
                        onChange={setFormMethod}
                        open={methodOpen}
                        setOpen={setMethodOpen}
                        placeholder="e.g. Chromogenic"
                      />
                    </div>
                    <div className="flex flex-col gap-[6px]">
                      <label className="text-[13px] font-medium text-[#5a6070]">
                        Unit<span style={{ color: "#dc2626", marginLeft: 3 }}>*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. g/dL"
                        value={formUnit}
                        onChange={(e) => setFormUnit(e.target.value)}
                        className="mtest-input"
                        style={baseInput}
                      />
                    </div>
                  </div>

                  {/* Reference Ranges — one or more Gender/Age Group/Min/Max rows */}
                  <div
                    className="flex flex-col gap-[8px] rounded-[10px] px-[14px] py-[12px]"
                    style={{ background: "#F7F8FA", border: "1px solid #eef0f4" }}
                  >
                    <span className="text-[13px] font-semibold text-[#0F100F]">Reference Ranges</span>
                    {formRanges.length === 0 ? (
                      <div className="text-[13px] text-[#8c9198] italic py-[6px]">
                        No reference ranges yet.
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_28px] gap-[8px] items-center">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.3px] text-[#8c9198]">Gender</span>
                          <span className="text-[11px] font-semibold uppercase tracking-[0.3px] text-[#8c9198]">Age Group</span>
                          <span className="text-[11px] font-semibold uppercase tracking-[0.3px] text-[#8c9198]">Min</span>
                          <span className="text-[11px] font-semibold uppercase tracking-[0.3px] text-[#8c9198]">Max</span>
                          <span />
                        </div>
                        {formRanges.map((r) => (
                          <div key={r.id} className="grid grid-cols-[1fr_1fr_1fr_1fr_28px] gap-[8px] items-center">
                            <select
                              value={r.gender ?? ""}
                              onChange={(e) => updateRange(r.id, { gender: (e.target.value || undefined) as TestGender | undefined })}
                              className="mtest-input w-full text-[14px] text-[#0F100F] outline-none font-[DM_Sans] appearance-none cursor-pointer"
                              style={{
                                height: 36,
                                padding: "0 10px",
                                background: "#ffffff",
                                border: "1px solid #e3e6eb",
                                borderRadius: 6,
                                minWidth: 0,
                              }}
                            >
                              <option value="">All</option>
                              {TEST_GENDER_OPTIONS.map((g) => (
                                <option key={g} value={g}>{g}</option>
                              ))}
                            </select>
                            <input
                              type="text"
                              placeholder="Adult"
                              value={r.ageGroup ?? ""}
                              onChange={(e) => updateRange(r.id, { ageGroup: e.target.value })}
                              className="mtest-input w-full text-[14px] text-[#0F100F] outline-none font-[DM_Sans]"
                              style={{ height: 36, padding: "0 10px", background: "#ffffff", border: "1px solid #e3e6eb", borderRadius: 6, minWidth: 0 }}
                            />
                            <input
                              type="text"
                              placeholder="12"
                              value={r.rangeMin ?? ""}
                              onChange={(e) => updateRange(r.id, { rangeMin: e.target.value })}
                              className="mtest-input w-full text-[14px] text-[#0F100F] outline-none font-[DM_Sans]"
                              style={{ height: 36, padding: "0 10px", background: "#ffffff", border: "1px solid #e3e6eb", borderRadius: 6, minWidth: 0 }}
                            />
                            <input
                              type="text"
                              placeholder="16"
                              value={r.rangeMax ?? ""}
                              onChange={(e) => updateRange(r.id, { rangeMax: e.target.value })}
                              className="mtest-input w-full text-[14px] text-[#0F100F] outline-none font-[DM_Sans]"
                              style={{ height: 36, padding: "0 10px", background: "#ffffff", border: "1px solid #e3e6eb", borderRadius: 6, minWidth: 0 }}
                            />
                            <button
                              type="button"
                              onClick={() => removeRange(r.id)}
                              aria-label="Remove range"
                              className="flex items-center justify-center rounded-[6px] cursor-pointer border-none"
                              style={{ width: 28, height: 28, background: "transparent", color: "#dc2626" }}
                            >
                              <Trash2 size={13} strokeWidth={2.5} />
                            </button>
                          </div>
                        ))}
                      </>
                    )}
                    <button
                      type="button"
                      onClick={addRangeRow}
                      className="self-start flex items-center gap-[4px] text-[13px] font-semibold cursor-pointer bg-transparent border-none mt-[2px]"
                      style={{ color: "#358C11" }}
                    >
                      <Plus size={12} strokeWidth={2.5} /> Add another range
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-[10px] px-[22px] py-[14px] shrink-0" style={{ borderTop: "1px solid #eef0f4", background: "#fafbfc" }}>
                  <button
                    onClick={cancelForm}
                    className="px-[18px] h-[36px] rounded-[8px] text-[14px] font-semibold cursor-pointer bg-transparent"
                    style={{ color: "#5a6070", border: "1px solid #e3e6eb" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      // Ranges are carried across whole — every nested row is
                      // stored, not just the ones the form happened to render.
                      const ranges: TestRange[] = formRanges.map((rg) => ({ ...rg }));
                      const fields = {
                        panelName: formPanel,
                        name: formName,
                        abbreviation: formAbbrev,
                        specimen: formSpecimen,
                        method: formMethod || undefined,
                        unit: formUnit,
                        ranges,
                      };
                      if (mode === "add") {
                        const id = `tst-${Date.now().toString(36)}`;
                        onAdd({ id, ...fields, isMine: true });
                        setSelectedId(id);
                      } else if (editingTest) {
                        onEdit(editingTest.id, fields);
                      }
                      setEditingTestId(null);
                      setMode("view");
                    }}
                    disabled={!canSave}
                    className="px-[22px] h-[36px] rounded-[8px] text-[14px] font-semibold text-white border-none"
                    style={{
                      background: canSave ? "#358C11" : "#c4c9d4",
                      opacity: canSave ? 1 : 0.8,
                      cursor: canSave ? "pointer" : "not-allowed",
                    }}
                  >
                    {mode === "add" ? "Save Test" : "Save Changes"}
                  </button>
                </div>
              </>
            )}

            {mode === "view" && selectedPanel && (
              <>
                <div
                  className="flex items-center justify-between px-[22px] shrink-0"
                  style={{ borderBottom: "1px solid #eef0f4", paddingTop: 17, paddingBottom: 17 }}
                >
                  <div className="flex items-center gap-[8px]">
                    <span className="text-[16px] font-bold text-[#0F100F]">{selectedPanel}</span>
                    <span className="text-[11px] font-bold uppercase rounded-[4px]" style={{ background: "#eef0f4", color: "#5a6070", paddingTop: 3, paddingBottom: 2, paddingLeft: 6, paddingRight: 6 }}>
                      Panel
                    </span>
                    <span className="text-[13px] text-[#5a6070]">· {selectedPanelTests.length} test{selectedPanelTests.length === 1 ? "" : "s"}</span>
                  </div>
                  <div className="flex items-center" style={{ height: 28 }}>
                    <span className="text-[12px] text-[#8c9198] italic">Panel — added by system</span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto mtest-scroll px-[22px] py-[18px] flex flex-col gap-[18px]">
                  {selectedPanelTests.map((t, idx) => (
                    <div key={t.id} className="flex flex-col gap-[14px]">
                      {/* Test sub-header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-[8px] min-w-0">
                          <span
                            className="text-[11px] font-bold rounded-[4px] shrink-0"
                            style={{ background: "#eaf5e3", color: "#358C11", padding: "2px 7px" }}
                          >
                            {idx + 1}
                          </span>
                          <span className="text-[15px] font-bold text-[#0F100F]">{t.name}</span>
                          <span className="text-[13px] font-mono text-[#5a6070]">({t.abbreviation})</span>
                          {t.isMine && (
                            <span className="text-[11px] font-bold uppercase rounded-[4px]" style={{ background: "#358C11", color: "#ffffff", paddingTop: 3, paddingBottom: 2, paddingLeft: 6, paddingRight: 6 }}>
                              Own
                            </span>
                          )}
                        </div>
                        {t.isMine && (
                          <div className="flex items-center gap-[6px] shrink-0">
                            <button
                              onClick={() => startEdit(t.id)}
                              className="flex items-center gap-[4px] px-[8px] py-[4px] rounded-[6px] text-[12px] font-semibold cursor-pointer bg-transparent"
                              style={{ color: "#358C11", border: "1px solid #358C11" }}
                            >
                              <Pencil size={11} strokeWidth={2.5} /> Edit
                            </button>
                            <button
                              onClick={() => setConfirmDeleteFor(t.id)}
                              className="flex items-center gap-[4px] px-[8px] py-[4px] rounded-[6px] text-[12px] font-semibold cursor-pointer bg-transparent"
                              style={{ color: "#dc2626", border: "1px solid #fecaca" }}
                            >
                              <Trash2 size={11} strokeWidth={2.5} /> Delete
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Test info grid */}
                      <div className="grid grid-cols-3 gap-x-[24px] gap-y-[12px]">
                        <div className="flex flex-col gap-[4px]">
                          <span className="text-[12px] font-semibold uppercase tracking-[0.4px] text-[#8c9198]">Specimen</span>
                          <Val v={t.specimen} />
                        </div>
                        <div className="flex flex-col gap-[4px]">
                          <span className="text-[12px] font-semibold uppercase tracking-[0.4px] text-[#8c9198]">Method</span>
                          <Val v={t.method} />
                        </div>
                        <div className="flex flex-col gap-[4px]">
                          <span className="text-[12px] font-semibold uppercase tracking-[0.4px] text-[#8c9198]">Unit</span>
                          <Val v={t.unit} />
                        </div>
                      </div>

                      {/* Reference ranges */}
                      <div className="flex flex-col gap-[8px]">
                        <span className="text-[12px] font-semibold uppercase tracking-[0.4px] text-[#8c9198]">Reference Ranges</span>
                        {t.ranges.length === 0 ? (
                          <span className="text-[14px] text-[#8c9198]">--</span>
                        ) : (
                          <div className="rounded-[8px] overflow-hidden" style={{ border: "1px solid #eef0f4" }}>
                            <div className="grid grid-cols-[1fr_1.2fr_1.6fr] px-[14px] py-[8px] text-[12px] font-bold uppercase tracking-[0.3px] text-[#8c9198]" style={{ background: "#F7F8FA", borderBottom: "1px solid #eef0f4" }}>
                              <span>Gender</span>
                              <span>Age Group</span>
                              <span>Range</span>
                            </div>
                            {t.ranges.map((r, i) => (
                              <div
                                key={r.id}
                                className="grid grid-cols-[1fr_1.2fr_1.6fr] px-[14px] py-[10px] text-[14px] text-[#0F100F]"
                                style={{ borderBottom: i < t.ranges.length - 1 ? "1px solid #eef0f4" : "none" }}
                              >
                                <span>{r.gender ?? <span className="text-[#8c9198]">--</span>}</span>
                                <span>{r.ageGroup || <span className="text-[#8c9198]">--</span>}</span>
                                <span className="font-semibold">{renderRange(r, t.unit) || <span className="text-[#8c9198] font-normal">--</span>}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {idx < selectedPanelTests.length - 1 && (
                        <div style={{ height: 1, background: "#eef0f4", marginTop: 4 }} />
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {mode === "view" && !selected && !selectedPanel && (
              <div className="flex-1 flex flex-col items-center justify-center px-[40px] text-center">
                <div
                  className="flex items-center justify-center rounded-full mb-[18px]"
                  style={{ width: 72, height: 72, background: "#eaf5e3" }}
                >
                  <FlaskConical size={30} style={{ color: "#358C11" }} />
                </div>
                <span className="text-[17px] font-bold text-[#0F100F] mb-[6px]">
                  Select a test to view
                </span>
                <p className="text-[14px] text-[#8c9198] leading-[1.55] max-w-[340px]">
                  Pick a test or panel from the list on the left to see its specimen, method, and reference range — or add a new one of your own.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Delete confirmation */}
        {confirmTarget && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: "rgba(15,23,42,0.35)", borderRadius: 12 }}
          >
            <div
              className="bg-white rounded-[10px] shadow-xl flex flex-col overflow-hidden"
              style={{ width: 420, border: "1px solid #e3e6eb" }}
            >
              <div className="px-[22px] pt-[22px] pb-[6px] flex items-start gap-[12px]">
                <div
                  className="flex items-center justify-center rounded-full shrink-0"
                  style={{ width: 36, height: 36, background: "#fef2f2" }}
                >
                  <Trash2 size={17} style={{ color: "#dc2626" }} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[16px] font-bold text-[#0F100F]">Delete this test?</span>
                  <p className="text-[14px] text-[#5a6070] mt-[4px] leading-[1.55]">
                    <span className="font-semibold text-[#0F100F]">"{confirmTarget.name}"</span> will be permanently removed from your library. This can't be undone.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-[8px] px-[22px] py-[14px] mt-[10px]" style={{ background: "#fafbfc", borderTop: "1px solid #eef0f4" }}>
                <button
                  onClick={() => setConfirmDeleteFor(null)}
                  className="px-[16px] h-[34px] rounded-[8px] text-[14px] font-semibold cursor-pointer bg-transparent"
                  style={{ color: "#5a6070", border: "1px solid #e3e6eb" }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (confirmDeleteFor) onDelete(confirmDeleteFor);
                    setConfirmDeleteFor(null);
                    setSelectedId(null);
                    setMode("view");
                  }}
                  className="flex items-center gap-[6px] px-[16px] h-[34px] rounded-[8px] text-[14px] font-semibold text-white cursor-pointer border-none"
                  style={{ background: "#dc2626" }}
                >
                  <Trash2 size={13} strokeWidth={2.5} />
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Manage Diagnosis Modal ─────────────────────────────────

export type DiagnosisItem = {
  id: string;
  name: string;
  code?: string;
  codeType?: "ICD-10" | "ICD-11" | "SNOMED CT";
  description?: string;
  isMine: boolean;
};

const DIAGNOSIS_CODE_TYPES: NonNullable<DiagnosisItem["codeType"]>[] = ["ICD-10", "ICD-11", "SNOMED CT"];

export const MOCK_DIAGNOSES: DiagnosisItem[] = [
  { id: "dx1", name: "Essential hypertension", code: "I10", codeType: "ICD-10", description: "Elevated systemic arterial blood pressure without an identifiable secondary cause.", isMine: false },
  { id: "dx9", name: "Unspecified back pain", isMine: true },
  { id: "dx2", name: "Type 2 diabetes mellitus", code: "E11", codeType: "ICD-10", description: "Insulin resistance with relative insulin deficiency. Managed by diet, oral agents, and insulin as indicated.", isMine: false },
  { id: "dx10", name: "Mild chest discomfort", isMine: true },
  { id: "dx3", name: "Acute pharyngitis", code: "J02.9", codeType: "ICD-10", description: "Inflammation of the pharynx, most often viral and self-limiting.", isMine: false },
  { id: "dx4", name: "Migraine without aura", code: "G43.0", codeType: "ICD-10", description: "Recurrent headache disorder with moderate-to-severe pulsating unilateral pain lasting 4–72 hours.", isMine: false },
  { id: "dx5", name: "Iron deficiency anaemia", code: "D50", codeType: "ICD-10", description: "Anaemia due to insufficient iron for haemoglobin synthesis.", isMine: false },
  { id: "dx6", name: "Chronic kidney disease, stage 3", code: "N18.3", codeType: "ICD-10", description: "Moderate reduction in kidney function (eGFR 30–59 mL/min/1.73 m²).", isMine: false },
  { id: "dx7", name: "Post-operative pain syndrome", code: "G89.18", codeType: "ICD-10", description: "Site-specific pain persisting beyond the expected surgical recovery window.", isMine: true },
  { id: "dx8", name: "Seasonal rhinitis (Bangladesh)", code: "J30.2", codeType: "ICD-10", description: "Winter-season allergic rhinitis pattern observed locally; triggered by dust and pollen.", isMine: true },
];

function ManageDiagnosisModal({
  onClose,
  items,
  onAdd,
  onEdit,
  onDelete,
}: {
  onClose: () => void;
  items: DiagnosisItem[];
  onAdd: (d: DiagnosisItem) => void;
  onEdit: (id: string, patch: Partial<DiagnosisItem>) => void;
  onDelete: (id: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"all" | "mine">("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"view" | "edit" | "add">("view");
  const [confirmDeleteFor, setConfirmDeleteFor] = useState<string | null>(null);

  // Form state for edit/add
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formCodeType, setFormCodeType] = useState<DiagnosisItem["codeType"]>(undefined);
  const [formDesc, setFormDesc] = useState("");
  const [codeTypeOpen, setCodeTypeOpen] = useState(false);

  const filtered = items.filter((d) => {
    if (activeTab === "mine" && !d.isMine) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      (d.code ?? "").toLowerCase().includes(q) ||
      (d.codeType ?? "").toLowerCase().includes(q) ||
      (d.description ?? "").toLowerCase().includes(q)
    );
  });

  const selected = selectedId ? items.find((d) => d.id === selectedId) : null;

  const startAdd = () => {
    setMode("add");
    setSelectedId(null);
    setFormName("");
    setFormCode("");
    setFormCodeType(undefined);
    setFormDesc("");
  };
  const startEdit = () => {
    if (selected) {
      setFormName(selected.name);
      setFormCode(selected.code ?? "");
      setFormCodeType(selected.codeType);
      setFormDesc(selected.description ?? "");
    }
    setMode("edit");
  };
  const cancelForm = () => setMode("view");

  const editHasChanges = !!selected && (
    formName !== selected.name ||
    formCode !== (selected.code ?? "") ||
    formCodeType !== selected.codeType ||
    formDesc !== (selected.description ?? "")
  );
  const addIsValid = true;
  const canSave = mode === "edit" ? editHasChanges : addIsValid;

  const confirmTarget = confirmDeleteFor
    ? items.find((d) => d.id === confirmDeleteFor)
    : null;

  const scrollbarCss = `
    .mdx-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
    .mdx-scroll::-webkit-scrollbar-track { background: transparent; }
    .mdx-scroll::-webkit-scrollbar-thumb { background: rgba(140,145,152,0.25); border-radius: 999px; }
    .mdx-scroll::-webkit-scrollbar-thumb:hover { background: rgba(140,145,152,0.45); }
    .mdx-scroll { scrollbar-width: thin; scrollbar-color: rgba(140,145,152,0.25) transparent; }
    .mdx-add-btn { transition: background 0.15s ease; }
    .mdx-add-btn:hover:not(:disabled) { background: #2a7a0d !important; }
    .mdx-add-btn:disabled { cursor: not-allowed; opacity: 0.6; }
    .mdx-input { transition: border-color 0.15s ease, box-shadow 0.15s ease; }
    .mdx-input:focus {
      border-color: #358C11 !important;
      box-shadow: 0 0 0 3px rgba(53, 140, 17, 0.12) !important;
    }
    .mdx-list-item { transition: background 0.12s ease; }
    .mdx-list-item:hover:not(.mdx-selected) { background: #eaf5e3 !important; }
  `;

  const inputStyle: React.CSSProperties = {
    background: "#ffffff",
    border: "1px solid #e3e6eb",
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 14,
    color: "#0F100F",
    outline: "none",
    width: "100%",
  };

  return (
    <div data-module="master-data" className="fixed inset-0 z-50 flex items-center justify-center font-[DM_Sans]" style={{ background: "rgba(0,0,0,0.45)" }}>
      <style dangerouslySetInnerHTML={{ __html: scrollbarCss }} />
      <div className="w-[1000px] bg-white rounded-[12px] flex flex-col overflow-hidden shadow-2xl relative" style={{ height: 640 }}>

        {/* Header */}
        <div className="flex items-center justify-between px-[20px] py-[10px] shrink-0" style={{ background: "#358C11" }}>
          <span className="text-[15px] font-semibold text-white">Manage Diagnosis</span>
          <button onClick={onClose} className="flex items-center justify-center w-[28px] h-[28px] rounded-[6px] text-white border-none cursor-pointer" style={{ background: "rgba(255,255,255,0.15)" }}>
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0">

          {/* ─── Left panel ─── */}
          <div className="flex flex-col shrink-0" style={{ width: 374, borderRight: "1px solid #eef0f4", background: "#F7F8FA" }}>

            {/* Search */}
            <div className="p-[14px] shrink-0" style={{ borderBottom: "1px solid #eef0f4" }}>
              <div className="relative">
                <Search size={14} className="absolute left-[10px] top-1/2 -translate-y-1/2 text-[#8c9198] pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search diagnosis…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="mdx-input w-full text-[14px] text-[#0F100F] outline-none font-[DM_Sans]"
                  style={{
                    height: 34,
                    paddingLeft: 30,
                    paddingRight: search ? 30 : 10,
                    background: "#ffffff",
                    border: "1px solid #e3e6eb",
                    borderRadius: 6,
                  }}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                    className="absolute right-[6px] top-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer border-none"
                    style={{ width: 20, height: 20, borderRadius: 999, background: "#eef0f4", color: "#5a6070" }}
                  >
                    <X size={11} strokeWidth={2.5} />
                  </button>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex shrink-0" style={{ borderBottom: "1px solid #eef0f4" }}>
              {(["all", "mine"] as const).map((tab) => {
                const active = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className="flex-1 py-[9px] text-[13px] font-semibold cursor-pointer border-none bg-transparent"
                    style={{
                      color: active ? "#064232" : "#8c9198",
                      borderBottom: active ? "2px solid #358C11" : "2px solid transparent",
                      marginBottom: -1,
                    }}
                  >
                    {tab === "all" ? "All" : "Personalized"}
                  </button>
                );
              })}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto mdx-scroll">
              {filtered.length === 0 ? (
                <div className="px-[14px] py-[40px] text-center text-[13px] text-[#8c9198]">
                  No diagnosis found
                </div>
              ) : (
                filtered.map((d) => {
                  const isSelected = d.id === selectedId && mode !== "add";
                  return (
                    <button
                      key={d.id}
                      onClick={() => { setSelectedId(d.id); setMode("view"); }}
                      className={`mdx-list-item w-full text-left px-[14px] py-[10px] cursor-pointer border-none bg-transparent ${isSelected ? "mdx-selected" : ""}`}
                      style={{
                        background: isSelected ? "#eaf5e3" : "transparent",
                        borderBottom: "1px solid #eef0f4",
                        borderLeft: isSelected ? "3px solid #358C11" : "3px solid transparent",
                      }}
                    >
                      <div className="flex items-center justify-between gap-[6px]">
                        <span className="text-[14px] font-semibold text-[#0F100F] truncate">{d.name}</span>
                        {d.isMine && (
                          <span className="text-[10px] font-bold uppercase shrink-0 rounded-[3px]" style={{ background: "#358C11", color: "#ffffff", padding: "2px 5px 1px" }}>
                            Own
                          </span>
                        )}
                      </div>
                      {d.description && (
                        <p className="text-[12px] text-[#5a6070] leading-[1.45] truncate mt-[3px]">
                          {d.description}
                        </p>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Add new */}
            <div className="p-[12px] shrink-0" style={{ borderTop: "1px solid #eef0f4", background: "#ffffff" }}>
              <button
                onClick={startAdd}
                disabled={mode === "add"}
                className="mdx-add-btn w-full flex items-center justify-center gap-[6px] rounded-[8px] text-[14px] font-semibold cursor-pointer border-none font-[DM_Sans]"
                style={{ height: 40, background: "#358C11", color: "#ffffff" }}
              >
                <Plus size={14} strokeWidth={2.5} />
                Add New Diagnosis
              </button>
            </div>
          </div>

          {/* ─── Right panel ─── */}
          <div className="flex-1 flex flex-col min-w-0">

            {mode === "view" && selected && (
              <>
                <div
                  className="flex items-center justify-between px-[22px] shrink-0"
                  style={{
                    borderBottom: "1px solid #eef0f4",
                    paddingTop: selected.isMine ? 15 : 17,
                    paddingBottom: selected.isMine ? 15 : 17,
                  }}
                >
                  <div className="flex items-center gap-[8px]">
                    <span className="text-[16px] font-bold text-[#0F100F]">{selected.name}</span>
                    {selected.isMine && (
                      <span className="text-[11px] font-bold uppercase rounded-[4px]" style={{ background: "#358C11", color: "#ffffff", paddingTop: 3, paddingBottom: 2, paddingLeft: 6, paddingRight: 6 }}>
                        Own
                      </span>
                    )}
                  </div>
                  {selected.isMine ? (
                    <div className="flex items-center gap-[8px]">
                      <button
                        onClick={startEdit}
                        className="flex items-center gap-[4px] px-[10px] py-[6px] rounded-[6px] text-[13px] font-semibold cursor-pointer bg-transparent"
                        style={{ color: "#358C11", border: "1px solid #358C11" }}
                      >
                        <Pencil size={12} strokeWidth={2.5} /> Edit
                      </button>
                      <button
                        onClick={() => selectedId && setConfirmDeleteFor(selectedId)}
                        className="flex items-center gap-[4px] px-[10px] py-[6px] rounded-[6px] text-[13px] font-semibold cursor-pointer bg-transparent"
                        style={{ color: "#dc2626", border: "1px solid #fecaca" }}
                      >
                        <Trash2 size={12} strokeWidth={2.5} /> Delete
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center" style={{ height: 28 }}>
                      <span className="text-[12px] text-[#8c9198] italic">Read-only — added by system</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto mdx-scroll px-[22px] py-[18px] flex flex-col gap-[16px]">
                  <div className="flex gap-[40px]">
                    <div className="flex flex-col gap-[4px]">
                      <span className="text-[12px] font-semibold uppercase tracking-[0.4px] text-[#8c9198]">Code Type</span>
                      <span className="text-[14px] text-[#0F100F] font-semibold">
                        {selected.codeType ?? <span className="text-[#8c9198]">--</span>}
                      </span>
                    </div>
                    <div className="flex flex-col gap-[4px]">
                      <span className="text-[12px] font-semibold uppercase tracking-[0.4px] text-[#8c9198]">Code</span>
                      <span className="text-[14px] text-[#0F100F] font-mono">
                        {selected.code ? selected.code : <span className="text-[#8c9198]">--</span>}
                      </span>
                    </div>
                  </div>
                  <div style={{ height: 1, background: "#eef0f4" }} />
                  <div className="flex flex-col gap-[6px]">
                    <span className="text-[12px] font-semibold uppercase tracking-[0.4px] text-[#8c9198]">Description</span>
                    <p className="text-[15px] leading-[1.7] text-[#0F100F]">
                      {selected.description ? selected.description : <span className="text-[#8c9198]">--</span>}
                    </p>
                  </div>
                </div>
              </>
            )}

            {(mode === "edit" || mode === "add") && (
              <>
                <div className="flex items-center justify-between px-[22px] py-[14px] shrink-0" style={{ borderBottom: "1px solid #eef0f4" }}>
                  <span className="text-[16px] font-bold text-[#0F100F]">
                    {mode === "add" ? "Add New Diagnosis" : "Edit Diagnosis"}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto mdx-scroll px-[22px] py-[18px] flex flex-col gap-[14px]">
                  <div className="flex flex-col gap-[6px]">
                    <label className="text-[13px] font-medium text-[#5a6070]">
                      Name<span style={{ color: "#dc2626", marginLeft: 3 }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Essential hypertension"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="mdx-input"
                      style={inputStyle}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-[12px]">
                    <div className="flex flex-col gap-[6px]">
                      <label className="text-[13px] font-medium text-[#5a6070]">Code</label>
                      <input
                        type="text"
                        placeholder="e.g. I10"
                        value={formCode}
                        onChange={(e) => setFormCode(e.target.value)}
                        className="mdx-input"
                        style={inputStyle}
                      />
                    </div>
                    <div className="flex flex-col gap-[6px] relative">
                      <label className="text-[13px] font-medium text-[#5a6070]">Code type</label>
                      <button
                        type="button"
                        onClick={() => setCodeTypeOpen((v) => !v)}
                        className="flex items-center justify-between cursor-pointer mdx-input"
                        style={{
                          ...inputStyle,
                          border: codeTypeOpen ? "1px solid #358C11" : "1px solid #e3e6eb",
                          boxShadow: codeTypeOpen ? "0 0 0 3px rgba(53,140,17,0.12)" : "none",
                        }}
                      >
                        <span style={{ color: formCodeType ? "#0F100F" : "#8c9198" }}>
                          {formCodeType ?? "Select code type"}
                        </span>
                        <ChevronDown size={14} className="text-[#8c9198]" style={{ transform: codeTypeOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                      </button>
                      {codeTypeOpen && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setCodeTypeOpen(false)} />
                          <div
                            className="absolute left-0 right-0 rounded-[8px] bg-white overflow-hidden"
                            style={{
                              top: "calc(100% + 4px)",
                              border: "1px solid #e3e6eb",
                              boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
                              zIndex: 20,
                            }}
                          >
                            {DIAGNOSIS_CODE_TYPES.map((ct) => {
                              const isSel = ct === formCodeType;
                              return (
                                <button
                                  key={ct}
                                  type="button"
                                  onClick={() => { setFormCodeType(ct); setCodeTypeOpen(false); }}
                                  className="w-full text-left px-[12px] py-[8px] text-[14px] cursor-pointer border-none flex items-center justify-between"
                                  style={{
                                    background: isSel ? "#f0f7ed" : "transparent",
                                    color: isSel ? "#358C11" : "#0F100F",
                                    fontWeight: isSel ? 600 : 400,
                                  }}
                                >
                                  {ct}
                                  {isSel && <Check size={13} style={{ color: "#358C11" }} strokeWidth={2.5} />}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-[6px]">
                    <label className="text-[13px] font-medium text-[#5a6070]">Description</label>
                    <textarea
                      placeholder="Short description for this diagnosis…"
                      value={formDesc}
                      onChange={(e) => setFormDesc(e.target.value)}
                      rows={4}
                      className="mdx-input"
                      style={{ ...inputStyle, resize: "vertical", minHeight: 96 }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-[10px] px-[22px] py-[14px] shrink-0" style={{ borderTop: "1px solid #eef0f4", background: "#fafbfc" }}>
                  <button
                    onClick={cancelForm}
                    className="px-[18px] h-[36px] rounded-[8px] text-[14px] font-semibold cursor-pointer bg-transparent"
                    style={{ color: "#5a6070", border: "1px solid #e3e6eb" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (mode === "add") {
                        const id = `dx-${Date.now().toString(36)}`;
                        onAdd({
                          id,
                          name: formName,
                          code: formCode || undefined,
                          codeType: formCodeType,
                          description: formDesc || undefined,
                          isMine: true,
                        });
                        setSelectedId(id);
                      } else if (selected) {
                        onEdit(selected.id, {
                          name: formName,
                          code: formCode || undefined,
                          codeType: formCodeType,
                          description: formDesc || undefined,
                        });
                      }
                      setMode("view");
                    }}
                    disabled={!canSave}
                    className="px-[22px] h-[36px] rounded-[8px] text-[14px] font-semibold text-white border-none"
                    style={{
                      background: canSave ? "#358C11" : "#c4c9d4",
                      opacity: canSave ? 1 : 0.8,
                      cursor: canSave ? "pointer" : "not-allowed",
                    }}
                  >
                    {mode === "add" ? "Save Diagnosis" : "Save Changes"}
                  </button>
                </div>
              </>
            )}

            {mode === "view" && !selected && (
              <div className="flex-1 flex flex-col items-center justify-center px-[40px] text-center">
                <div
                  className="flex items-center justify-center rounded-full mb-[18px]"
                  style={{ width: 72, height: 72, background: "#eaf5e3" }}
                >
                  <Stethoscope size={30} style={{ color: "#358C11" }} />
                </div>
                <span className="text-[17px] font-bold text-[#0F100F] mb-[6px]">
                  Select a diagnosis to view
                </span>
                <p className="text-[14px] text-[#8c9198] leading-[1.55] max-w-[320px]">
                  Pick a diagnosis from the list on the left to see its code, type, and description, or add a new one of your own.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Delete confirmation */}
        {confirmTarget && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: "rgba(15,23,42,0.35)", borderRadius: 12 }}
          >
            <div
              className="bg-white rounded-[10px] shadow-xl flex flex-col overflow-hidden"
              style={{ width: 420, border: "1px solid #e3e6eb" }}
            >
              <div className="px-[22px] pt-[22px] pb-[6px] flex items-start gap-[12px]">
                <div
                  className="flex items-center justify-center rounded-full shrink-0"
                  style={{ width: 36, height: 36, background: "#fef2f2" }}
                >
                  <Trash2 size={17} style={{ color: "#dc2626" }} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[16px] font-bold text-[#0F100F]">Delete this diagnosis?</span>
                  <p className="text-[14px] text-[#5a6070] mt-[4px] leading-[1.55]">
                    <span className="font-semibold text-[#0F100F]">"{confirmTarget.name}"</span> will be permanently removed from your library. This can't be undone.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-[8px] px-[22px] py-[14px] mt-[10px]" style={{ background: "#fafbfc", borderTop: "1px solid #eef0f4" }}>
                <button
                  onClick={() => setConfirmDeleteFor(null)}
                  className="px-[16px] h-[34px] rounded-[8px] text-[14px] font-semibold cursor-pointer bg-transparent"
                  style={{ color: "#5a6070", border: "1px solid #e3e6eb" }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (confirmDeleteFor) onDelete(confirmDeleteFor);
                    setConfirmDeleteFor(null);
                    setSelectedId(null);
                    setMode("view");
                  }}
                  className="flex items-center gap-[6px] px-[16px] h-[34px] rounded-[8px] text-[14px] font-semibold text-white cursor-pointer border-none"
                  style={{ background: "#dc2626" }}
                >
                  <Trash2 size={13} strokeWidth={2.5} />
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Prescription Preview Modal (DR-006) ───────────────────
// HTML A4 at 210×297mm inside the file's standard modal shell. No PDF is
// generated: no client-side PDF library shapes Indic script, and the
// prescription is roughly half Bangla. Download calls window.print().

// Bars derived from the patient code. Cosmetic — it does not need to scan.
function CodeBarcode({ code }: { code: string }) {
  const bars: { x: number; w: number }[] = [];
  let x = 0;
  for (let i = 0; i < code.length; i++) {
    const c = code.charCodeAt(i);
    for (let k = 0; k < 3; k++) {
      const w = ((c >> k) & 1) === 1 ? 2 : 1;
      bars.push({ x, w });
      x += w + 1;
    }
  }
  return (
    <svg width={x} height={34} viewBox={`0 0 ${x} 34`} style={{ display: "block" }}>
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={0} width={b.w} height={34} fill="#0F100F" />
      ))}
    </svg>
  );
}

const PREVIEW_DATE = (iso: string) => {
  const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${String(d.getDate()).padStart(2, "0")} ${MON[d.getMonth()]}, ${d.getFullYear()}`;
};

function PrescriptionPreviewModal({
  onClose,
  rx,
  patient,
}: {
  onClose: () => void;
  rx: Prescription;
  patient: PatientRecord;
}) {
  const printCss = `
    @media print {
      body * { visibility: hidden !important; }
      #rx-a4, #rx-a4 * { visibility: visible !important; }
      #rx-a4 {
        position: absolute !important;
        left: 0 !important; top: 0 !important;
        margin: 0 !important; box-shadow: none !important;
      }
      @page { size: A4; margin: 0; }
    }
  `;
  const has = (n: number) => n > 0;
  return createPortal(
    <div
      data-module="preview"
      className="fixed inset-0 z-50 flex items-center justify-center font-[DM_Sans]"
      style={{ background: "rgba(0,0,0,0.45)" }}
    >
      <style dangerouslySetInnerHTML={{ __html: printCss }} />
      <div className="w-[794px] bg-white rounded-[12px] flex flex-col overflow-hidden shadow-2xl" style={{ height: 720, maxHeight: "calc(100vh - 32px)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-[20px] py-[10px] shrink-0" style={{ background: "#358C11" }}>
          <span className="text-[15px] font-semibold text-white">Prescription Preview</span>
          <button onClick={onClose} className="flex items-center justify-center w-[28px] h-[28px] rounded-[6px] text-white border-none cursor-pointer" style={{ background: "rgba(255,255,255,0.15)" }}>
            <X size={15} />
          </button>
        </div>

        {/* Scrollable A4 sheet */}
        <div className="flex-1 min-h-0 overflow-auto flex justify-center" style={{ background: "#eef0f4", padding: 16 }}>
          <div
            id="rx-a4"
            className="bg-white shrink-0"
            style={{ width: "210mm", height: "297mm", boxShadow: "0 2px 12px rgba(6,66,50,0.12)" }}
          >
            {/* Top third left blank — pre-printed letterhead space. */}
            <div style={{ height: "99mm" }} />

            <div className="flex" style={{ height: "198mm" }}>
              {/* LEFT COLUMN */}
              <div className="flex flex-col gap-[14px]" style={{ width: "68mm", padding: "0 6mm", borderRight: "1px solid #c2c2c2" }}>
                <div className="flex items-center gap-[10px]">
                  <div className="flex items-center justify-center rounded-full shrink-0" style={{ width: 44, height: 44, background: "#eaf5e3" }}>
                    <span className="text-[15px] font-bold" style={{ color: "#358C11" }}>{patient.initials}</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[14px] font-bold text-[#0F100F] truncate">{patient.name}</span>
                    <span className="text-[12px] text-[#5a6070]">{patient.age}{patient.sex ? ` · ${patient.sex}` : ""}</span>
                  </div>
                </div>

                {has(rx.complaints.length) && (
                  <div className="flex flex-col gap-[3px]">
                    <span className="text-[12px] font-bold text-[#064232]">C/C</span>
                    {rx.complaints.map((c) => (
                      <div key={c.id} className="flex flex-col">
                        <span className="text-[13px] text-[#0F100F]">{c.text}</span>
                        {c.remark ? <span className="text-[11px] text-[#5a6070]" style={{ paddingLeft: 10 }}>{c.remark}</span> : null}
                      </div>
                    ))}
                  </div>
                )}

                {has(rx.history.length) && (
                  <div className="flex flex-col gap-[3px]">
                    <span className="text-[12px] font-bold text-[#064232]">H/O</span>
                    {rx.history.map((h) => (
                      <div key={h.id} className="flex flex-col">
                        <span className="text-[13px] text-[#0F100F]">{h.text}</span>
                        {h.remark ? <span className="text-[11px] text-[#5a6070]" style={{ paddingLeft: 10 }}>{h.remark}</span> : null}
                      </div>
                    ))}
                  </div>
                )}

                {has(rx.diagnoses.length) && (
                  <div className="flex flex-col gap-[3px]">
                    <span className="text-[12px] font-bold text-[#064232]">Diagnosis</span>
                    {rx.diagnoses.map((d) => (
                      <span key={d.id} className="text-[13px] text-[#0F100F]">{d.text}</span>
                    ))}
                  </div>
                )}

                {has(rx.tests.length) && (
                  <div className="flex flex-col gap-[3px]">
                    <span className="text-[12px] font-bold text-[#064232]">Tests</span>
                    {rx.tests.map((t, i) => (
                      <span key={t.id} className="text-[13px] text-[#0F100F]">{i + 1}. {t.text}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN */}
              <div className="flex flex-col gap-[14px] flex-1 min-w-0" style={{ padding: "0 6mm" }}>
                <div className="flex flex-col gap-[2px]">
                  <CodeBarcode code={patient.id || "PT-000000"} />
                  <span className="text-[11px] text-[#5a6070]">{patient.id}</span>
                </div>
                <div className="flex flex-col gap-[2px]">
                  {rx.visitType ? <span className="text-[12px] text-[#0F100F]">Visit: {rx.visitType}</span> : null}
                  <span className="text-[12px] text-[#0F100F]">Date: {PREVIEW_DATE(rx.date)}</span>
                </div>

                {has(rx.medications.length) && (
                  <div className="flex flex-col gap-[6px]">
                    <span className="text-[18px] font-bold text-[#064232]">Rx</span>
                    {rx.medications.map((m, i) => (
                      <div key={m.id} className="flex flex-col">
                        <span className="text-[13px] text-[#0F100F]">{i + 1}. {m.medicine}</span>
                        {m.typeText ? (
                          <span className="text-[13px] text-[#0F100F] font-[Kalpurush]" style={{ paddingLeft: 14 }}>{m.typeText}</span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}

                {has(rx.advice.length) && (
                  <div className="flex flex-col gap-[3px]">
                    <span className="text-[12px] font-bold text-[#064232]">Advice</span>
                    {rx.advice.map((a) => (
                      <span key={a.id} className="text-[13px] text-[#0F100F] font-[Kalpurush]">{a.bn}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-[10px] px-[18px] py-[12px] shrink-0" style={{ borderTop: "1px solid #eef0f4", background: "#fafbfc" }}>
          <button
            onClick={onClose}
            className="px-[18px] h-[36px] rounded-[8px] text-[14px] font-semibold cursor-pointer bg-transparent"
            style={{ color: "#5a6070", border: "1px solid #e3e6eb" }}
          >
            Close
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-[6px] px-[22px] h-[36px] rounded-[8px] text-[14px] font-semibold text-white cursor-pointer border-none"
            style={{ background: "#358C11" }}
          >
            <FileDown size={14} />
            Download
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Insert Template (Advice) Modal ────────────────────────



function InsertTemplateModal({
  onClose,
  onInsert,
  onOpenManage,
  templates,
}: {
  onClose: () => void;
  onInsert: (t: AdviceTemplate) => void;
  onOpenManage: () => void;
  templates: AdviceTemplate[];
}) {
  const [search, setSearch] = useState("");

  const filtered = templates.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return t.title.toLowerCase().includes(q) ||
      t.advice.some((a) => a.bn.toLowerCase().includes(q));
  });

  const scrollbarCss = `
    .ins-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
    .ins-scroll::-webkit-scrollbar-track { background: transparent; }
    .ins-scroll::-webkit-scrollbar-thumb { background: rgba(140,145,152,0.25); border-radius: 999px; }
    .ins-scroll::-webkit-scrollbar-thumb:hover { background: rgba(140,145,152,0.45); }
    .ins-scroll { scrollbar-width: thin; scrollbar-color: rgba(140,145,152,0.25) transparent; }
    .ins-input { transition: border-color 0.15s ease, box-shadow 0.15s ease; }
    .ins-input:focus {
      border-color: #358C11 !important;
      box-shadow: 0 0 0 3px rgba(53,140,17,0.12) !important;
    }
    .ins-card { transition: background 0.12s ease, border-color 0.12s ease; }
    .ins-card:hover { background: #f4faf0 !important; border-color: #d5ebcb !important; }
  `;

  return (
    <div data-module="templates" className="fixed inset-0 z-50 flex items-center justify-center font-[DM_Sans]" style={{ background: "rgba(0,0,0,0.45)" }}>
      <style dangerouslySetInnerHTML={{ __html: scrollbarCss }} />
      <div className="w-[720px] bg-white rounded-[12px] flex flex-col overflow-hidden shadow-2xl" style={{ height: 720, maxHeight: "calc(100vh - 32px)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-[20px] py-[10px] shrink-0" style={{ background: "#358C11" }}>
          <span className="text-[15px] font-semibold text-white">Insert from Template</span>
          <button onClick={onClose} className="flex items-center justify-center w-[28px] h-[28px] rounded-[6px] text-white border-none cursor-pointer" style={{ background: "rgba(255,255,255,0.15)" }}>
            <X size={15} />
          </button>
        </div>

        {/* Search */}
        <div className="px-[18px] pt-[14px] pb-[10px] shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-[10px] top-1/2 -translate-y-1/2 text-[#8c9198] pointer-events-none" />
            <input
              type="text"
              placeholder="Search templates…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ins-input w-full text-[14px] text-[#0F100F] outline-none font-[DM_Sans]"
              style={{
                height: 36,
                paddingLeft: 30,
                paddingRight: search ? 30 : 10,
                background: "#ffffff",
                border: "1px solid #e3e6eb",
                borderRadius: 6,
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-[6px] top-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer border-none"
                style={{ width: 20, height: 20, borderRadius: 999, background: "#eef0f4", color: "#5a6070" }}
              >
                <X size={11} strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div
          className="overflow-y-auto ins-scroll px-[18px] pt-[4px] pb-[14px] flex flex-col gap-[10px]"
          style={{ flex: "1 1 0", minHeight: 0, height: 0 }}
        >
          {filtered.length === 0 ? (
            <div className="px-[14px] py-[40px] text-center text-[13px] text-[#8c9198]">
              No templates match "{search}"
            </div>
          ) : (
            filtered.map((t) => (
              <button
                key={t.id}
                onClick={() => onInsert(t)}
                className="ins-card w-full text-left flex flex-col gap-[4px] px-[14px] py-[12px] rounded-[10px] cursor-pointer"
                style={{ background: "#ffffff", border: "1px solid #eef0f4" }}
              >
                <div className="flex items-center justify-between gap-[10px]">
                  <span className="text-[14px] font-semibold text-[#0F100F] truncate">{t.title}</span>
                  <span
                    className="text-[11px] font-bold uppercase tracking-[0.4px] shrink-0 rounded-[3px]"
                    style={{ background: "#eef0f4", color: "#5a6070", padding: "2px 6px" }}
                  >
                    {t.advice.length} advices
                  </span>
                </div>
                <p
                  className="text-[14px] leading-[1.6]"
                  style={{ color: "#5a6070", fontFamily: "Kalpurush, sans-serif" }}
                >
                  {t.advice.map((adv, i) => (
                    <Fragment key={i}>
                      {i > 0 && (
                        <span
                          style={{
                            color: "#358C11",
                            fontSize: 21,
                            lineHeight: 1,
                            margin: "0 8px",
                            verticalAlign: "-2px",
                          }}
                        >
                          •
                        </span>
                      )}
                      {adv.bn}
                    </Fragment>
                  ))}
                </p>
              </button>
            ))
          )}
        </div>

        {/* Footer with Manage Templates gateway */}
        <div
          className="flex items-center justify-between px-[18px] py-[12px] shrink-0"
          style={{ borderTop: "1px solid #eef0f4", background: "#fafbfc" }}
        >
          <button
            onClick={onOpenManage}
            className="flex items-center gap-[4px] text-[14px] font-semibold cursor-pointer bg-transparent border-none"
            style={{ color: "#358C11" }}
          >
            <Settings size={13} strokeWidth={2.5} />
            Manage Templates
            <ChevronRight size={13} strokeWidth={2.5} />
          </button>
          <button
            onClick={onClose}
            className="px-[18px] h-[34px] rounded-[8px] text-[14px] font-semibold cursor-pointer bg-transparent"
            style={{ color: "#5a6070", border: "1px solid #e3e6eb" }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Toast (top-center, auto-dismiss) ───────────────────────

function Toast({ title, description, onClose }: { title: string; description?: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className="fixed z-[60] flex items-start gap-[14px] rounded-[12px] bg-white font-[DM_Sans]"
      style={{
        top: 32,
        left: "50%",
        transform: "translateX(-50%)",
        padding: "16px 24px",
        minWidth: 400,
        boxShadow: "0 12px 32px rgba(15,23,42,0.16), 0 2px 6px rgba(15,23,42,0.06)",
        border: "1px solid #d5ebcb",
        animation: "toastFadeIn 0.22s ease-out both",
      }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: "@keyframes toastFadeIn { from { opacity: 0; } to { opacity: 1; } }",
        }}
      />
      <div
        className="flex items-center justify-center rounded-full shrink-0"
        style={{ width: 36, height: 36, background: "#358C11", marginTop: 2 }}
      >
        <Check size={20} color="#fff" strokeWidth={3} />
      </div>
      <div className="flex flex-col gap-[2px]">
        <span className="text-[16px] font-semibold text-[#0F100F] leading-[1.3]">{title}</span>
        {description && (
          <span className="text-[14px] text-[#5a6070] leading-[1.45]">{description}</span>
        )}
      </div>
    </div>
  );
}

// ── Toolbar Dropdown (white panel, same look as landing page) ──
function ToolbarDropdown({
  value,
  options,
  onChange,
  placeholder,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between gap-[5px] px-[10px] py-[5px] h-[28px] rounded-[6px] cursor-pointer w-full"
        style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}
      >
        <span
          className={`text-[13px] font-medium whitespace-nowrap ${
            value ? "text-white" : "text-white/60"
          }`}
        >
          {value || placeholder || ""}
        </span>
        <ChevronDown
          size={13}
          className="text-white"
          style={{ transition: "transform 0.2s ease", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>
      {open && (
        <div
          className="absolute left-0 right-0 rounded-[12px] bg-white py-[6px] z-50"
          style={{
            top: "calc(100% + 6px)",
            border: "1px solid #eef0f4",
            boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
          }}
        >
          {options.map((opt) => {
            const isSelected = opt === value;
            return (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false); }}
                className="flex items-center w-full px-[14px] py-[8px] text-left cursor-pointer"
                style={{
                  background: isSelected ? "#f0f7ed" : "transparent",
                  border: "none",
                  transition: "background 0.12s ease",
                }}
                onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "#fafbfc"; }}
                onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
              >
                <span
                  className="text-[13px]"
                  style={{
                    color: isSelected ? "#358C11" : "#0F100F",
                    fontWeight: isSelected ? 600 : 400,
                  }}
                >
                  {opt}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Theme-matched date picker for the toolbar — a green-accented calendar
// dropdown (replaces the OS-native picker, which can't be styled). Value is
// YYYY-MM-DD; the trigger shows the formatted date + a down arrow.
const DP_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DP_WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function ToolbarDatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const initial = value ? value.split("-").map(Number) : [0, 0, 0];
  const [viewYear, setViewYear] = useState(initial[0] || new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(initial[1] ? initial[1] - 1 : new Date().getMonth());

  useEffect(() => {
    if (!open) return;
    // Re-sync the visible month to the selected value whenever it opens.
    if (value) {
      const [y, m] = value.split("-").map(Number);
      setViewYear(y);
      setViewMonth(m - 1);
    }
    const place = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (r) setPos({ top: r.bottom + 6, left: r.left });
    };
    place();
    const onDown = (e: MouseEvent) => {
      if (btnRef.current?.contains(e.target as Node)) return;
      if (panelRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  const label = value
    ? new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
      })
    : "Select date";

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const cellStr = (d: number) =>
    `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const prevMonth = () =>
    viewMonth === 0 ? (setViewMonth(11), setViewYear((y) => y - 1)) : setViewMonth((m) => m - 1);
  const nextMonth = () =>
    viewMonth === 11 ? (setViewMonth(0), setViewYear((y) => y + 1)) : setViewMonth((m) => m + 1);

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-[6px] px-[10px] h-[28px] rounded-[6px] cursor-pointer"
        style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}
      >
        <Calendar size={13} className="text-white/80" />
        <span className="text-[13px] font-medium text-white select-none whitespace-nowrap">{label}</span>
        <ChevronDown
          size={13}
          className="text-white/80 shrink-0"
          style={{ transition: "transform 0.2s ease", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>
      {open && pos && createPortal(
        <div
          ref={panelRef}
          className="fixed z-[9999] w-[248px] bg-white rounded-[12px] p-[12px] font-[DM_Sans]"
          style={{ top: pos.top, left: pos.left, border: "1px solid #eef0f4", boxShadow: "0 12px 32px rgba(6,66,50,0.16)" }}
        >
          {/* Header — month/year + nav */}
          <div className="flex items-center justify-between mb-[10px]">
            <button
              type="button"
              onClick={prevMonth}
              className="group w-[26px] h-[26px] flex items-center justify-center rounded-[7px] cursor-pointer hover:bg-[#358C11]"
              style={{ background: "transparent", border: "none" }}
            >
              <ChevronLeft size={16} className="text-[#064232] group-hover:text-white" />
            </button>
            <span className="text-[14px] font-semibold text-[#064232]">{DP_MONTHS[viewMonth]} {viewYear}</span>
            <button
              type="button"
              onClick={nextMonth}
              className="group w-[26px] h-[26px] flex items-center justify-center rounded-[7px] cursor-pointer hover:bg-[#358C11]"
              style={{ background: "transparent", border: "none" }}
            >
              <ChevronRight size={16} className="text-[#064232] group-hover:text-white" />
            </button>
          </div>
          {/* Weekday row */}
          <div className="grid grid-cols-7 mb-[4px]">
            {DP_WEEKDAYS.map((w) => (
              <span key={w} className="text-[11px] font-medium text-[#8c9198] text-center py-[2px]">{w}</span>
            ))}
          </div>
          {/* Day grid */}
          <div className="grid grid-cols-7 gap-[2px]">
            {cells.map((d, i) => {
              if (d === null) return <span key={`e${i}`} />;
              const ds = cellStr(d);
              const isSelected = ds === value;
              const isToday = ds === todayStr;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => { onChange(ds); setOpen(false); }}
                  className="h-[30px] rounded-[7px] text-[13px] cursor-pointer flex items-center justify-center transition-colors"
                  style={{
                    background: isSelected ? "#358C11" : "transparent",
                    color: isSelected ? "#ffffff" : "#0F100F",
                    fontWeight: isSelected || isToday ? 600 : 400,
                    border: isToday && !isSelected ? "1px solid #358C11" : "1px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      const el = e.currentTarget as HTMLButtonElement;
                      el.style.background = "#358C11";
                      el.style.color = "#ffffff";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      const el = e.currentTarget as HTMLButtonElement;
                      el.style.background = "transparent";
                      el.style.color = "#0F100F";
                    }
                  }}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

// ── Patient Details Modal ───────────────────────────────────
// Built from the Figma handoff (node 4039:1765). Header: green gradient
// strip + "PATIENT PROFILE" pill + close button. Overlapping profile row
// with initials avatar (in place of the design's photo) + name (Playfair
// Display) + green # + ID. Quick stats trio (Age / Gender / Blood),
// Contact & Personal Details list (Phone / Address / Marital Status /
// Occupation) in a single rounded card with coloured icon tiles, footer
// with Close + Update Profile buttons. Static fields (blood, address,
// marital, occupation) are mock until the patient model carries them.
function DetailRow({
  icon, iconBg, iconColor, label, value,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white flex items-center gap-[14px] px-[18px] py-[13px]">
      <div
        className="flex items-center justify-center rounded-[9px] shrink-0"
        style={{ width: 33, height: 33, background: iconBg, color: iconColor }}
      >
        {icon}
      </div>
      <div className="flex flex-col gap-[1px] flex-1 min-w-0">
        <div className="text-[11.7px] font-medium text-[#8c95a4]">{label}</div>
        <div className="text-[14.6px] font-medium text-[#0F100F] truncate">{value}</div>
      </div>
    </div>
  );
}

function PatientDetailsModal({
  patient,
  onClose,
}: {
  patient: PatientRecord;
  onClose: () => void;
}) {
  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Mock fields not yet on the patient model.
  const blood = "B+";
  const phoneDisplay = patient.phone ? `+880 ${patient.phone}` : "+880 01712-030812";
  const address = "House 12, Road 7, Dhanmondi, Dhaka-1205";
  const marital = "Married";
  const occupation = "Software Engineer";

  return createPortal(
    <div
      data-module="patient-registration" className="fixed inset-0 z-[1000] flex items-center justify-center p-[16px]"
      style={{ background: "rgba(15,23,42,0.45)" }}
      onClick={onClose}
    >
      <div
        className="bg-white overflow-hidden relative"
        style={{
          width: 560,
          borderRadius: 20,
          boxShadow: "0px 25px 60px rgba(0,0,0,0.15), 0px 0px 0px 1px rgba(0,0,0,0.04)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — green gradient */}
        <div
          className="relative h-[100px] overflow-hidden"
          style={{
            background: "linear-gradient(146.78deg, #3fa216 0%, #368814 50%, #568742 100%)",
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
          }}
        >
          <div className="absolute inset-0 flex items-center justify-between px-[24px]">
            <div
              className="flex items-center gap-[8px] px-[12px] py-[5px] rounded-full"
              style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(2px)" }}
            >
              <div className="w-[6px] h-[6px] rounded-full" style={{ background: "#6ee7b7" }} />
              <span
                className="text-[11.7px] font-medium uppercase text-white/90"
                style={{ letterSpacing: "0.485px", fontFamily: "DM Sans, sans-serif" }}
              >
                Patient Profile
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center rounded-full cursor-pointer"
              style={{
                width: 33, height: 33,
                background: "rgba(255,255,255,0.12)",
                backdropFilter: "blur(2px)",
                border: "none",
              }}
            >
              <X size={16} className="text-white" />
            </button>
          </div>
        </div>

        {/* Profile (overlapping the header) */}
        <div className="flex items-end gap-[17px] px-[24px] -mt-[27px] relative">
          <div
            className="rounded-full border-4 border-white flex items-center justify-center shrink-0"
            style={{ width: 85, height: 85, background: "#3fa216" }}
          >
            <span className="text-[29px] font-semibold text-white" style={{ fontFamily: "DM Sans, sans-serif" }}>
              {patient.initials || "?"}
            </span>
          </div>
          <div className="flex flex-col gap-[4px] pb-[8px] mb-[-10px]">
            <h2
              className="text-[22.3px] font-semibold text-[#0F100F] leading-[25.6px]"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {patient.name || "—"}
            </h2>
            <div className="flex items-center gap-[5px]">
              <span
                className="text-[13.1px] font-semibold text-[#3fa216]"
                style={{ letterSpacing: "0.291px" }}
              >
                #
              </span>
              <span
                className="text-[13.1px] font-medium text-[#8c95a4]"
                style={{ letterSpacing: "0.291px" }}
              >
                {patient.id || "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Stats — Age / Gender / Blood */}
        <div
          className="mx-[24px] mt-[20px] flex items-stretch p-px gap-px overflow-hidden"
          style={{ background: "#f1f5f9", border: "1px solid #f1f5f9", borderRadius: 8 }}
        >
          {[
            { label: "Age", value: patient.age || "—" },
            { label: "Gender", value: patient.sex || "—" },
            { label: "Blood", value: blood },
          ].map((s) => (
            <div key={s.label} className="bg-white flex-1 px-[12px] py-[14px] flex flex-col items-center gap-[4px]">
              <div
                className="text-[11.2px] font-medium text-[#8c95a4] uppercase"
                style={{ letterSpacing: "0.776px" }}
              >
                {s.label}
              </div>
              <div className="text-[15.6px] font-semibold text-[#0F100F]">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Contact & Personal Details */}
        <div className="px-[24px] mt-[24px]">
          <div
            className="text-[11.5px] font-semibold text-[#8c95a4] uppercase"
            style={{ letterSpacing: "1px" }}
          >
            Contact &amp; Personal Details
          </div>
          <div
            className="mt-[14px] flex flex-col gap-px p-px overflow-hidden"
            style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 14 }}
          >
            <DetailRow icon={<Phone size={16} />}     iconBg="#e8f5f0" iconColor="#3fa216" label="Phone"          value={phoneDisplay} />
            <DetailRow icon={<MapPin size={16} />}    iconBg="#eff6ff" iconColor="#2563eb" label="Address"        value={address} />
            <DetailRow icon={<Heart size={16} />}     iconBg="#fff1f2" iconColor="#e11d48" label="Marital Status" value={marital} />
            <DetailRow icon={<Briefcase size={16} />} iconBg="#f3f0ff" iconColor="#7c3aed" label="Occupation"     value={occupation} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-[10px] px-[24px] py-[24px] mt-[8px]">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-[6px] cursor-pointer"
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              padding: "12px 18px",
            }}
          >
            <X size={12} className="text-[#5a6678]" />
            <span className="text-[13.6px] font-semibold text-[#5a6678]">Close</span>
          </button>
          <button
            type="button"
            className="flex-1 flex items-center justify-center gap-[6px] cursor-pointer"
            style={{
              background: "#3fa216",
              border: "none",
              borderRadius: 10,
              padding: "12px 17px",
              boxShadow: "0px 2px 4px rgba(42,107,90,0.25)",
            }}
          >
            <Pencil size={14} className="text-white" />
            <span className="text-[13.6px] font-semibold text-white">Update Profile</span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── New Patient Modal ──────────────────────────────────────
// Opened by the "+ New Patient" CTA in the demographic search dropdown.
// Registration form mirrors the Patient Finder gate design (Mobile/ID,
// Title + Name, Age ⇄ DOB, Gender tabs, District). Adding a patient
// feeds the same selectPatient path a search-row pick uses.
const GATE_TITLES = [
  "Mr.", "Advocate", "Alhajj", "Dr.", "Engr.", "Master", "Mawlana", "Md.",
  "Miss", "Mrs.", "Ms", "Mst.", "Mufti", "Prof.", "Baby",
];
const GATE_COUNTRY_CODES = ["+880", "+91", "+92", "+94", "+977", "+971", "+966", "+60", "+44", "+1"];
const GATE_GENDERS = ["Male", "Female", "Other"];
const GATE_DISTRICTS = [
  "Dhaka", "Chattogram", "Rajshahi", "Khulna", "Barishal", "Sylhet",
  "Rangpur", "Mymensingh", "Cumilla", "Narayanganj", "Gazipur", "Bogura",
  "Jashore", "Cox's Bazar", "Tangail", "Faridpur",
];
type GateAgeUnit = "years" | "months" | "days";

// Age ⇄ DOB: filling either side computes the other. Units go down to
// months / days so infants can be entered (e.g. "45 days").
function gateDobFromAge(amount: number, unit: GateAgeUnit): string {
  const d = new Date();
  if (unit === "years") d.setFullYear(d.getFullYear() - amount);
  else if (unit === "months") d.setMonth(d.getMonth() - amount);
  else d.setDate(d.getDate() - amount);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function gateAgeFromDob(dob: string): { amount: string; unit: GateAgeUnit } | null {
  const b = new Date(`${dob}T00:00:00`);
  if (isNaN(b.getTime())) return null;
  const now = new Date();
  const days = Math.floor((now.getTime() - b.getTime()) / 86400000);
  if (days < 0) return null;
  if (days < 31) return { amount: String(days), unit: "days" };
  if (days < 366) return { amount: String(Math.floor(days / 30.44)), unit: "months" };
  return { amount: String(Math.floor(days / 365.25)), unit: "years" };
}

function gateAgeLabel(amount: string, unit: GateAgeUnit): string {
  if (unit === "years") return `${amount} yrs`;
  if (unit === "months") return `${amount} mo`;
  return `${amount} days`;
}

// ── Validation ────────────────────────────────────────────
// Correct rules, deliberately. Planted bugs are introduced later by removing
// or loosening specific ones, so this is the baseline the bug key diffs
// against. Messages state what is wrong and what is expected, in one line.

// Inline field error. Reuses the file's error colour (#dc2626) and the
// 12px semibold treatment already used for out-of-range values.
function FieldError({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return (
    <span className="text-[12px] font-semibold" style={{ color: "#dc2626" }}>
      {msg}
    </span>
  );
}

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const validateName = (v: string): string | null => {
  if (v.trim() === "") return "Name is required.";
  return null;
};

// Bangladesh mobile: exactly 11 digits starting 01.
const validateMobile = (v: string): string | null => {
  const digits = v.replace(/[^\d]/g, "");
  if (digits === "") return "Mobile number is required.";
  return null;
};

const validateDob = (dob: string): string | null => {
  if (dob === "") return null;
  const b = new Date(`${dob}T00:00:00`);
  if (Number.isNaN(b.getTime())) return "Enter a valid date.";
  if (b.getTime() > new Date(`${todayISO()}T00:00:00`).getTime()) return "Date of birth cannot be in the future.";
  return null;
};

// Age and DOB must agree — the modal auto-fills each from the other, so a
// mismatch means one was edited afterwards.
const validateAgeDobAgreement = (
  amount: string, unit: GateAgeUnit, dob: string,
): string | null => {
  if (amount.trim() === "" && dob === "") return "Enter an age or a date of birth.";
  if (amount.trim() === "" || dob === "") return null;
  return null;
};

// Vitals. Empty is always allowed; only entered values are checked.
type VitalRule = { min: number; max: number; unit: string };
const VITAL_RULES: Record<string, VitalRule> = {
  pulse: { min: 20, max: 250, unit: "bpm" },
  temperature: { min: 90, max: 110, unit: "°F" },
  respRate: { min: 5, max: 60, unit: "/min" },
  spo2: { min: 50, max: 100, unit: "%" },
  weight: { min: 0.5, max: 300, unit: "kg" },
  height: { min: 30, max: 250, unit: "cm" },
};
const validateVital = (field: string, raw: string): string | null => {
  const v = raw.trim();
  if (v === "") return null;
  if (field === "bp") {
    const m = v.match(/^(\d{1,3})\s*\/\s*(\d{1,3})$/);
    if (!m) return "Enter as systolic/diastolic, e.g. 120/80.";
    const sys = Number(m[1]), dia = Number(m[2]);
    if (sys < 50 || sys > 300) return "Systolic must be 50–300 mmHg.";
    if (dia < 30 || dia > 200) return "Diastolic must be 30–200 mmHg.";
    if (sys <= dia) return "Systolic must be greater than diastolic.";
    return null;
  }
  const rule = VITAL_RULES[field];
  if (!rule) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return "Enter a number.";
  // SpO2 checks only the lower bound.
  if (field === "spo2") {
    if (n < rule.min) return `Must be ${rule.min}–${rule.max} ${rule.unit}.`;
    return null;
  }
  if (n < rule.min || n > rule.max) return `Must be ${rule.min}–${rule.max} ${rule.unit}.`;
  return null;
};

const validateRxDate = (iso: string): string | null => {
  if (!iso) return null;
  if (iso > todayISO()) return "Date cannot be later than today.";
  return null;
};

const validateFee = (raw: string): string | null => {
  if (raw.trim() === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return "Fee must be a number.";
  if (n < 0) return "Fee cannot be negative.";
  return null;
};

const GATE_INPUT_CLS =
  "h-[38px] px-[12px] rounded-[7px] bg-white text-[14px] text-[#0F100F] font-[DM_Sans] outline-none w-full border border-[#e3e6eb] transition-[border-color]";

// Photo section layout — "row3": photo | text | buttons in one 3-column
// row. Flip to "stacked" to revert to the previous design (text + buttons
// stacked beside the photo).
const PHOTO_SECTION_LAYOUT: "row3" | "stacked" = "row3";

// Green border on focus, applied inline so every field behaves the same.
// Works on inputs directly and on compound-field wrappers (focus bubbles).
const gateFocus = {
  onFocus: (e: React.FocusEvent<HTMLElement>) => { e.currentTarget.style.borderColor = "#358C11"; },
  onBlur: (e: React.FocusEvent<HTMLElement>) => { e.currentTarget.style.borderColor = "#e3e6eb"; },
};

function GateField({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-[5px] min-w-0" style={{ flex: "1 1 0%" }}>
      <span className="text-[12.5px] font-medium text-[#5a6070]">
        {label}
        {required && <span className="text-[#e11d48]"> *</span>}
      </span>
      {children}
    </div>
  );
}

// Custom dropdown — grey trigger that goes white + green ring when open,
// rotating chevron, floating panel with green-highlighted selection.
// `compact` renders a borderless trigger for use inside compound fields
// (the Age unit) while keeping the same panel design.
function GateDropdown({
  value,
  onChange,
  options,
  placeholder = "Select",
  compact = false,
  compactAlign = "right",
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  compact?: boolean;
  compactAlign?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // Panel is portaled to <body> so it can't be clipped by the modal's
  // scroll container. Position tracks the trigger on scroll/resize.
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        const panel = document.getElementById("gate-dropdown-panel");
        if (panel && panel.contains(e.target as Node)) return;
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const update = () => {
      if (!ref.current) return;
      const r = ref.current.getBoundingClientRect();
      const width = compact ? 112 : r.width;
      const left = compact
        ? (compactAlign === "left" ? r.left - 9 : r.right - width + 9)
        : r.left;
      setPos({ top: r.bottom + 6, left, width });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, compact, compactAlign]);

  const label = value === "" ? placeholder : value;

  return (
    <div className="relative" ref={ref}>
      {compact ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-[4px] bg-transparent border-none cursor-pointer p-0"
        >
          <span className="text-[12px] text-[#0F100F] font-[DM_Sans]">{label}</span>
          <ChevronDown
            size={11}
            style={{ color: "#9198a5", transition: "transform 0.2s ease", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center justify-between w-full px-[12px] rounded-[7px] cursor-pointer"
          style={{
            minHeight: 38,
            background: "#fff",
            border: open ? "1px solid #358C11" : "1px solid #e3e6eb",
            transition: "all 0.15s ease",
          }}
        >
          <span
            className="text-[14px] font-[DM_Sans] truncate"
            style={{ color: value === "" ? "#9198a5" : "#0F100F", fontWeight: value === "" ? 400 : 500 }}
          >
            {label}
          </span>
          <ChevronDown
            size={13}
            style={{
              color: "#9198a5",
              transition: "transform 0.2s ease",
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              flexShrink: 0,
              marginLeft: 6,
            }}
          />
        </button>
      )}

      {open && pos && createPortal(
        <div
          id="gate-dropdown-panel"
          className="dsearch-scroll rounded-[12px] bg-white py-[6px] max-h-[236px] overflow-y-auto font-[DM_Sans]"
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            width: pos.width,
            zIndex: 1200,
            border: "1px solid #eef0f4",
            boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
          }}
        >
          {options.map((o) => {
            const isSelected = o === value;
            return (
              <button
                key={o}
                type="button"
                onClick={() => { onChange(o); setOpen(false); }}
                className="flex items-center w-full px-[14px] py-[8px] text-left cursor-pointer"
                style={{ background: isSelected ? "#358C11" : "transparent", border: "none", transition: "background 0.12s ease" }}
                onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "#fafbfc"; }}
                onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
              >
                <span
                  className="text-[14px] font-[DM_Sans]"
                  style={{ color: isSelected ? "#ffffff" : "#0F100F", fontWeight: isSelected ? 600 : 400 }}
                >
                  {o}
                </span>
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </div>
  );
}

function NewPatientModal({
  initialQuery,
  patients,
  onClose,
  onAdd,
}: {
  initialQuery: string;
  patients: PatientPick[];
  onClose: () => void;
  onAdd: (p: PatientPick) => void;
}) {
  // Whatever the doctor typed in the search box seeds the matching field —
  // digits go to Mobile/ID, anything else to the name.
  const seedIsNumeric = /\d/.test(initialQuery) && /^[\d+\-\s]*$/.test(initialQuery.trim());
  const [fCountryCode, setFCountryCode] = useState("+880");
  const [fMobileId, setFMobileId] = useState(seedIsNumeric ? initialQuery.trim() : "");

  // Live patient search on the mobile number — same dropdown panel as the
  // demographic search box. Picking a row selects that existing patient
  // (via onAdd) instead of registering a duplicate.
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileSearchPos, setMobileSearchPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const mobileWrapRef = useRef<HTMLDivElement>(null);
  const mobileMatches = useMemo(() => {
    const q = fMobileId.trim().toLowerCase();
    if (q.length === 0) return [] as PatientPick[];
    return patients.filter(
      (p) => p.phone.includes(q) || p.code.toLowerCase().includes(q),
    );
  }, [fMobileId, patients]);
  // Keyboard navigation across the panel: index 0 is the fixed "add another
  // patient" row, indexes 1..n are the matching patients. Defaults to the
  // fixed row so Enter registers a new patient unless the doctor navigates.
  const [mobileHighlight, setMobileHighlight] = useState(0);
  useEffect(() => { setMobileHighlight(0); }, [fMobileId, mobileSearchOpen]);
  const activateMobileItem = (idx: number) => {
    if (idx <= 0) setMobileSearchOpen(false);
    else onAdd(mobileMatches[idx - 1]);
  };

  useEffect(() => {
    if (!mobileSearchOpen) return;
    const update = () => {
      if (!mobileWrapRef.current) return;
      const r = mobileWrapRef.current.getBoundingClientRect();
      setMobileSearchPos({ top: r.bottom + 4, left: r.left, width: r.width });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [mobileSearchOpen]);

  useEffect(() => {
    function handle(e: MouseEvent) {
      const t = e.target as Node;
      if (mobileWrapRef.current && !mobileWrapRef.current.contains(t)) {
        const panel = document.getElementById("np-mobile-search-panel");
        if (panel && panel.contains(t)) return;
        setMobileSearchOpen(false);
      }
    }
    if (mobileSearchOpen) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [mobileSearchOpen]);
  const [fTitle, setFTitle] = useState("Mr.");
  const [fName, setFName] = useState(seedIsNumeric ? "" : initialQuery.trim());
  const [fAgeAmount, setFAgeAmount] = useState("");
  const [fAgeUnit, setFAgeUnit] = useState<GateAgeUnit>("years");
  const [fDob, setFDob] = useState("");
  const [fGender, setFGender] = useState("Male");
  const [fDistrict, setFDistrict] = useState("");
  // "More details" — optional extras behind a plain expand row below
  // District, past the modal's fold; the doctor scrolls to reach it.
  const [moreOpen, setMoreOpen] = useState(false);
  const [fMarital, setFMarital] = useState("");
  // The scroll viewport is sized to the measured photo→District block, so
  // those fields are always fully visible and the fold lands after District.
  const aboveFoldRef = useRef<HTMLDivElement>(null);
  const [bodyH, setBodyH] = useState<number | null>(null);
  useEffect(() => {
    if (!aboveFoldRef.current) return;
    const ro = new ResizeObserver(() => {
      // +5 breathing room below District so its green focus border isn't
      // clipped by the fold. (No top padding — the photo band sits flush.)
      setBodyH((aboveFoldRef.current?.offsetHeight ?? 0) + 5);
    });
    ro.observe(aboveFoldRef.current);
    return () => ro.disconnect();
  }, []);
  const [fEmail, setFEmail] = useState("");
  const [fNid, setFNid] = useState("");
  const [fOccupation, setFOccupation] = useState("");
  const [fBlood, setFBlood] = useState("");
  const [fAddress, setFAddress] = useState("");
  // Optional profile photo — picked file previews inside the avatar circle.
  // "Take Photo" opens the same picker with the device camera preferred.
  const [fPhoto, setFPhoto] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const handlePhotoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setFPhoto(URL.createObjectURL(file));
    e.target.value = "";
  };

  const handleAgeAmount = (v: string) => {
    const clean = v.replace(/[^\d]/g, "");
    setFAgeAmount(clean);

  };
  const handleAgeUnit = (u: GateAgeUnit) => {
    setFAgeUnit(u);

  };
  const handleDob = (v: string) => {
    setFDob(v);

  };

  // Errors surface on blur or on submit — never on every keystroke.
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const touch = (k: string) => setTouched((t) => ({ ...t, [k]: true }));
  const showFor = (k: string) => submitted || touched[k] === true;

  const nameErr = validateName(fName);
  const mobileErr = validateMobile(fMobileId);
  const dobErr = validateDob(fDob);
  const ageDobErr = dobErr ? null : validateAgeDobAgreement(fAgeAmount, fAgeUnit, fDob);
  const genderErr = fGender === "" ? "Select a gender." : null;

  // Validity is only refreshed when a field is blurred, so filling the last
  // required field leaves the button reading the previous state.
  const validityRef = useRef(false);
  const canAdd = validityRef.current;
  useEffect(() => {
    validityRef.current =
      validateName(fName) === null &&
      validateMobile(fMobileId) === null &&
      validateDob(fDob) === null &&
      validateAgeDobAgreement(fAgeAmount, fAgeUnit, fDob) === null &&
      fGender !== "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [touched]);

  const addNewPatient = () => {
    setSubmitted(true);
    if (!canAdd) return;
    const words = fName.trim().split(/\s+/);
    const initials = (((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase() || "?");
    const now = new Date();
    const code = `PT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${1000 + Math.floor(Math.random() * 9000)}`;
    const derived = fAgeAmount.trim() !== ""
      ? gateAgeLabel(fAgeAmount, fAgeUnit)
      : (() => { const a = gateAgeFromDob(fDob); return a ? gateAgeLabel(a.amount, a.unit) : "—"; })();
    onAdd({
      initials,
      name: fName.trim(),
      code,
      phone: fMobileId.replace(/[^\d]/g, "") || fMobileId.trim(),
      age: derived,
      sex: fGender,
    });
  };

  return createPortal(
    <div
      data-module="patient-registration" className="fixed inset-0 z-[1050] flex items-center justify-center p-[20px] font-[DM_Sans] text-[#0F100F]"
      style={{ background: "rgba(15,23,42,0.35)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        .np-photo-btn {
          background: #ffffff;
          border: 1px solid #e3e6eb;
          color: #1a2332;
          transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
        }
        .np-photo-btn:hover {
          background: #358C11;
          border-color: #358C11;
        }
        .np-photo-btn:hover span, .np-photo-btn:hover svg { color: #ffffff; }
        .np-search-row { transition: background 0.12s ease; }
        .np-search-row--active { background: #358C11 !important; }
        .np-search-row--active span, .np-search-row--active svg { color: #ffffff !important; }
        .np-search-row--active .np-avatar { background: rgba(255,255,255,0.22) !important; }
      ` }} />
      <div
        className="w-full max-w-[500px] flex flex-col overflow-hidden rounded-[14px]"
        style={{ background: "#ffffff", boxShadow: "0 25px 60px rgba(0,0,0,0.3)", maxHeight: "92vh" }}
      >
        {/* Header — green fill, same pattern as the workspace's other modals */}
        <div className="flex items-center justify-between px-[20px] py-[12px] shrink-0" style={{ background: "#358C11" }}>
          <span className="text-[16px] font-semibold text-white">Add New Patient</span>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-[28px] h-[28px] rounded-[6px] text-white cursor-pointer border-none"
            style={{ background: "rgba(255,255,255,0.15)" }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Body — registration form. Height matches the above-fold block so
            everything up to District shows without scrolling. */}
        <div className="dsearch-scroll min-h-0 overflow-y-auto px-[24px] pb-[20px]" style={{ height: bodyH ?? 460 }}>
          <div className="flex flex-col gap-[12px]">
          <div ref={aboveFoldRef} className="flex flex-col gap-[12px]">
            {/* Row 0 — Profile picture (optional): dashed avatar circle
                previews the picked photo; Take Photo prefers the camera. */}
            <div className="flex items-center gap-[14px] -mx-[24px] px-[24px] py-[14px]" style={{ background: "#f7f8fa" }}>
              <input ref={photoInputRef} type="file" accept="image/png,image/jpeg" onChange={handlePhotoFile} className="hidden" />
              <input ref={cameraInputRef} type="file" accept="image/png,image/jpeg" capture="user" onChange={handlePhotoFile} className="hidden" />
              {/* Col 1 — photo */}
              <div
                className="flex items-center justify-center w-[64px] h-[64px] rounded-[10px] shrink-0 overflow-hidden cursor-pointer"
                style={{
                  background: "#ffffff",
                  border: fPhoto ? "1px solid #e3e6eb" : "1.5px dashed #cdd3dc",
                }}
                onClick={() => photoInputRef.current?.click()}
              >
                {fPhoto ? (
                  <img src={fPhoto} alt="Profile preview" className="w-full h-full object-cover" />
                ) : (
                  <User size={28} strokeWidth={0} fill="currentColor" className="text-[#b6bdc9]" />
                )}
              </div>
              {PHOTO_SECTION_LAYOUT === "row3" ? (
                <>
                  {/* Col 2 — text */}
                  <div className="flex flex-col gap-[3px] min-w-0 flex-1">
                    <span className="text-[14px] font-semibold text-[#0F100F]">
                      Patient's Photo <span className="font-medium text-[#9198a5]">(Optional)</span>
                    </span>
                    <span className="text-[12.5px] text-[#9198a5]">JPG or PNG. Max size 5MB.</span>
                  </div>
                  {/* Col 3 — buttons stacked */}
                  <div className="flex flex-col gap-[6px] shrink-0">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="np-photo-btn flex items-center gap-[6px] px-[13px] h-[33px] rounded-[7px] cursor-pointer"
                    >
                      <Camera size={13} />
                      <span className="text-[13.5px] font-medium">Take Photo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="np-photo-btn flex items-center gap-[6px] px-[13px] h-[33px] rounded-[7px] cursor-pointer"
                    >
                      <Upload size={13} />
                      <span className="text-[13.5px] font-medium">Upload Photo</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-[3px] min-w-0">
                  <span className="text-[14px] font-semibold text-[#0F100F]">
                    Patient's Photo <span className="font-medium text-[#9198a5]">(Optional)</span>
                  </span>
                  <span className="text-[12.5px] text-[#9198a5]">JPG or PNG. Max size 5MB.</span>
                  <div className="flex items-center gap-[8px] mt-[5px]">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="np-photo-btn flex items-center gap-[6px] px-[13px] h-[33px] rounded-[7px] cursor-pointer"
                    >
                      <Camera size={13} />
                      <span className="text-[13.5px] font-medium">Take Photo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="np-photo-btn flex items-center gap-[6px] px-[13px] h-[33px] rounded-[7px] cursor-pointer"
                    >
                      <Upload size={13} />
                      <span className="text-[13.5px] font-medium">Upload Photo</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-[6px] text-[12.5px] text-[#5a6070]">
              <Info size={13} className="text-[#9198a5] shrink-0" />
              <span>
                Fields marked with <span className="text-[#e11d48] font-semibold">*</span> are required.
              </span>
            </div>

            {/* Row 1 — Mobile Number: country-code dropdown + number input
                sharing one compound field, same pattern as the Age field. */}
            <GateField label="Mobile Number" required>
              <div ref={mobileWrapRef} {...gateFocus} className="flex items-center gap-[8px] h-[38px] px-[12px] rounded-[7px] bg-white border border-[#e3e6eb] transition-[border-color]">
                <div className="shrink-0">
                  <GateDropdown
                    compact
                    compactAlign="left"
                    value={fCountryCode}
                    onChange={setFCountryCode}
                    options={GATE_COUNTRY_CODES}
                  />
                </div>
                <div className="w-px h-[18px] bg-[#e3e6eb] shrink-0" />
                <input
                  autoFocus
                  type="text"
                  inputMode="numeric"
                  value={fMobileId}
                  onChange={(e) => { setFMobileId(e.target.value); setMobileSearchOpen(true); }}
                  onFocus={() => setMobileSearchOpen(true)}
                  onKeyDown={(e) => {
                    const total = 1 + mobileMatches.length;
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setMobileSearchOpen(true);
                      setMobileHighlight((i) => Math.min(i + 1, total - 1));
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setMobileHighlight((i) => Math.max(i - 1, 0));
                    } else if (e.key === "Enter") {
                      if (mobileSearchOpen && mobileMatches.length > 0) {
                        e.preventDefault();
                        activateMobileItem(Math.min(mobileHighlight, total - 1));
                      }
                    } else if (e.key === "Escape") {
                      setMobileSearchOpen(false);
                    }
                  }}
                  placeholder="1XXXXXXXXX"
                  onBlur={() => touch("mobile")}
                  className="flex-1 min-w-0 bg-transparent outline-none border-none text-[14px] text-[#0F100F] font-[DM_Sans] p-0"
                />
              </div>
              <FieldError msg={showFor("mobile") ? mobileErr : null} />
            </GateField>
            {/* Existing-patient matches — same panel design as the
                demographic search; a row click selects that patient. */}
            {mobileSearchOpen && mobileSearchPos && fMobileId.trim() !== "" && mobileMatches.length > 0 && createPortal(
              <div
                id="np-mobile-search-panel"
                className="dsearch-scroll rounded-[8px] bg-white font-[DM_Sans] max-h-[240px] overflow-y-auto"
                style={{
                  position: "fixed",
                  top: mobileSearchPos.top,
                  left: mobileSearchPos.left,
                  width: mobileSearchPos.width,
                  zIndex: 1200,
                  border: "1px solid #eef0f4",
                  boxShadow: "0 8px 24px rgba(15,23,42,0.10)",
                }}
              >
                {/* Fixed first row — mobile numbers can be shared (e.g. a
                    mother and child), so the typed number is always offered
                    for registering another patient. */}
                <button
                  type="button"
                  onClick={() => setMobileSearchOpen(false)}
                  onMouseEnter={() => setMobileHighlight(0)}
                  className={`np-search-row flex items-center gap-[12px] w-full px-[14px] py-[8px] text-left cursor-pointer${mobileHighlight === 0 ? " np-search-row--active" : ""}`}
                  style={{
                    background: "transparent",
                    border: "none",
                    borderBottom: mobileMatches.length === 0 ? "none" : "1px solid #f1f2f5",
                  }}
                >
                  <div
                    className="np-avatar flex items-center justify-center w-[34px] h-[34px] rounded-full shrink-0"
                    style={{ background: "#358C11" }}
                  >
                    <UserPlus size={15} className="text-white" />
                  </div>
                  <div className="flex flex-col gap-[2px] flex-1 min-w-0">
                    <span className="text-[13px] font-semibold text-[#5a6070] truncate">{fCountryCode} {fMobileId.trim()}</span>
                    <span className="text-[14px] text-[#358C11] font-medium truncate">Use this number to add another patient</span>
                  </div>
                </button>
                {mobileMatches.map((p, idx) => (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => onAdd(p)}
                    onMouseEnter={() => setMobileHighlight(idx + 1)}
                    className={`np-search-row flex items-center gap-[12px] w-full px-[14px] py-[8px] text-left cursor-pointer${mobileHighlight === idx + 1 ? " np-search-row--active" : ""}`}
                    style={{
                      background: "transparent",
                      border: "none",
                      borderBottom: idx === mobileMatches.length - 1 ? "none" : "1px solid #f1f2f5",
                    }}
                  >
                    <div
                      className="np-avatar flex items-center justify-center w-[34px] h-[34px] rounded-full shrink-0"
                      style={{ background: "#358C11" }}
                    >
                      <span className="text-[13px] font-semibold text-white">{p.initials}</span>
                    </div>
                    <div className="flex flex-col gap-[2px] flex-1 min-w-0">
                      <span className="text-[15px] font-semibold text-[#0F100F] truncate">{p.name}</span>
                      <div className="flex items-center gap-[6px] text-[12px]">
                        <span className="text-[#358C11] font-medium">#{p.code}</span>
                        <span className="text-[#c0c4cc]">•</span>
                        <Phone size={10} className="text-[#9198a5]" />
                        <span className="text-[#5a6070]">{p.phone}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>,
              document.body,
            )}

            {/* Row 2 — Title (1/3) + Patient Name (2/3) */}
            <div className="grid grid-cols-3 gap-[10px]">
              <GateField label="Title">
                <GateDropdown value={fTitle} onChange={setFTitle} options={GATE_TITLES} />
              </GateField>
              <div className="col-span-2">
                <GateField label="Patient Name" required>
                  <input
                    {...gateFocus}
                    type="text"
                    value={fName}
                    onChange={(e) => setFName(e.target.value)}
                    onBlur={() => touch("name")}
                    placeholder="Patient's full name"
                    className={GATE_INPUT_CLS}
                  />
                  <FieldError msg={showFor("name") ? nameErr : null} />
                </GateField>
              </div>
            </div>

            {/* Row 3 — Age (1/3, amount + unit) + Date of Birth (2/3) */}
            <div className="grid grid-cols-3 gap-[10px]">
              <GateField label="Age" required>
                <div {...gateFocus} className="flex items-center gap-[4px] h-[38px] px-[10px] rounded-[7px] bg-white border border-[#e3e6eb] transition-[border-color]">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={fAgeAmount}
                    onChange={(e) => handleAgeAmount(e.target.value)}
                    onBlur={() => touch("age")}
                    placeholder="0"
                    className="flex-1 min-w-0 bg-transparent outline-none border-none text-[14px] text-[#0F100F] font-[DM_Sans] p-0"
                  />
                  {/* Unit dropdown pinned to the right edge of the field */}
                  <div className="shrink-0">
                    <GateDropdown
                      compact
                      value={{ years: "Years", months: "Months", days: "Days" }[fAgeUnit]}
                      onChange={(v) => handleAgeUnit(v.toLowerCase() as GateAgeUnit)}
                      options={["Years", "Months", "Days"]}
                    />
                  </div>
                </div>
              </GateField>
              <div className="col-span-2">
                <GateField label="Date of Birth">
                  <input
                    {...gateFocus}
                    type="date"
                    value={fDob}
                    onChange={(e) => handleDob(e.target.value)}
                    onBlur={() => touch("dob")}
                    className={GATE_INPUT_CLS}
                    style={{ colorScheme: "light" }}
                  />
                  <FieldError msg={showFor("dob") || showFor("age") ? (dobErr ?? ageDobErr) : null} />
                </GateField>
              </div>
            </div>
            {/* Row 4 — Gender, tab-style segmented control */}
            <GateField label="Gender" required>
              <div className="flex items-stretch h-[38px] p-[3px] gap-[3px] rounded-[7px] bg-white border border-[#e3e6eb]">
                {GATE_GENDERS.map((g) => {
                  const active = fGender === g;
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setFGender(g)}
                      className="flex-1 rounded-[5px] text-[14px] font-medium cursor-pointer"
                      style={{
                        background: active ? "#358C11" : "transparent",
                        color: active ? "#ffffff" : "#5a6070",
                        border: "1px solid transparent",
                        transition: "background 0.12s ease, color 0.12s ease",
                      }}
                    >
                      {g}
                    </button>
                  );
                })}
              </div>
            </GateField>

            {/* Row 5 — District (optional) */}
            <GateField label="District">
              <GateDropdown value={fDistrict} onChange={setFDistrict} options={GATE_DISTRICTS} placeholder="Select district" />
            </GateField>
          </div>

            {/* More details — plain toggle row (no card backdrop); expands
                to the optional extras */}
            <div>
              <button
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                className="flex items-center justify-between w-full py-[8px] px-0 text-left cursor-pointer bg-transparent border-none"
              >
                <div className="flex flex-col gap-[2px] min-w-0">
                  <span className="text-[14px] font-semibold text-[#0F100F]">More details</span>
                  <span className="text-[13px] text-[#9198a5]">Blood group, marital status, occupation, NID, email &amp; address</span>
                </div>
                <ChevronDown
                  size={16}
                  className="shrink-0 text-[#5a6070]"
                  style={{ transition: "transform 0.2s ease", transform: moreOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                />
              </button>
              {moreOpen && (
                <div className="flex flex-col gap-[12px] pt-[8px]">
                  <div className="grid grid-cols-2 gap-[10px]">
                    <GateField label="Blood Group">
                      <GateDropdown
                        value={fBlood}
                        onChange={setFBlood}
                        options={["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]}
                        placeholder="Select"
                      />
                    </GateField>
                    <GateField label="Marital Status">
                      <GateDropdown
                        value={fMarital}
                        onChange={setFMarital}
                        options={["Married", "Unmarried", "Widowed", "Divorced"]}
                        placeholder="Select"
                      />
                    </GateField>
                  </div>
                  <GateField label="Occupation">
                    <input
                      {...gateFocus}
                      type="text"
                      value={fOccupation}
                      onChange={(e) => setFOccupation(e.target.value)}
                      placeholder="e.g. Teacher, Farmer, Service holder"
                      className={GATE_INPUT_CLS}
                    />
                  </GateField>
                  <GateField label="NID Number">
                    <input
                      {...gateFocus}
                      type="text"
                      inputMode="numeric"
                      value={fNid}
                      onChange={(e) => setFNid(e.target.value)}
                      placeholder="National ID number"
                      className={GATE_INPUT_CLS}
                    />
                  </GateField>
                  <GateField label="Email ID">
                    <input
                      {...gateFocus}
                      type="text"
                      value={fEmail}
                      onChange={(e) => setFEmail(e.target.value)}
                      placeholder="patient@email.com"
                      className={GATE_INPUT_CLS}
                    />
                  </GateField>
                  <GateField label="Address">
                    <textarea
                      {...gateFocus}
                      value={fAddress}
                      onChange={(e) => setFAddress(e.target.value)}
                      placeholder="House, road, area…"
                      rows={2}
                      className="px-[12px] py-[9px] rounded-[7px] bg-white text-[14px] text-[#0F100F] font-[DM_Sans] outline-none w-full border border-[#e3e6eb] transition-[border-color] resize-none"
                    />
                  </GateField>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Footer — fixed at the modal's bottom; the form scrolls behind it */}
        <div className="shrink-0 px-[24px] pt-[12px] pb-[16px]" style={{ borderTop: "1px solid #eef0f4", background: "#ffffff" }}>
          <button
            type="button"
            onClick={addNewPatient}
            disabled={!canAdd}
            className="flex items-center justify-center gap-[7px] w-full h-[42px] rounded-[8px]"
            style={{
              background: canAdd ? "#358C11" : "#c8d4c2",
              border: "none",
              cursor: canAdd ? "pointer" : "not-allowed",
              transition: "background 0.12s ease",
            }}
            onMouseEnter={(e) => { if (canAdd) e.currentTarget.style.background = "#22680A"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = canAdd ? "#358C11" : "#c8d4c2"; }}
          >
            <UserPlus size={15} className="text-white" />
            <span className="text-[14.5px] font-semibold text-white">Add new patient</span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Main Page ──────────────────────────────────────────────
export default function PrescriptionApp({ token }: { token: string }) {
  const router = useRouter();
  // Patient pool comes from SUT state; every other section still reads its
  // module constant and is migrated in a later brief.
  const {
    state: sutState,
    setState: setSutState,
    draft,
    isDirty,
    updateDraft,
    saveDraft,
    loadDraftFor,
    completeDraft,
    startNewVisit,
  } = useSut();
  void token;
  // The six section arrays live on the draft. These accessors keep the
  // useState signature — value plus a setter taking a value or an updater —
  // so every existing add / edit / delete call site works unchanged.
  type ComplaintRow = { id: string; text: string; remark: string };
  const savedComplaints = draft?.complaints ?? EMPTY_COMPLAINTS;
  const setSavedComplaints = (
    v: ComplaintRow[] | ((p: ComplaintRow[]) => ComplaintRow[]),
  ) => updateDraft({ complaints: typeof v === "function" ? v(draft?.complaints ?? []) : v });
  // DR-026: one medication shape. The read-only saved block is gone; every
  // medication renders as an editable row in TreatmentAddRows.
  const savedMedications = draft?.medications ?? EMPTY_MEDICATIONS;
  const setMedications = (v: Medication[] | ((p: Medication[]) => Medication[])) =>
    updateDraft({ medications: typeof v === "function" ? v(draft?.medications ?? []) : v });

  // ── Libraries (DR-028) ────────────────────────────────────
  // Consumers derive their display strings from the full catalogue records at
  // read time, so the rich fields are never flattened away in storage.
  const libraries = sutState.libraries;
  const setLibraries = (
    v: typeof libraries | ((p: typeof libraries) => typeof libraries),
  ) =>
    setSutState((prev) => ({
      ...prev,
      libraries: typeof v === "function" ? v(prev.libraries) : v,
    }));
  const libAdd = <K extends keyof typeof libraries>(kind: K, entry: (typeof libraries)[K][number]) =>
    setLibraries((prev) => ({ ...prev, [kind]: [...prev[kind], entry] }));
  const libEdit = <K extends keyof typeof libraries>(
    kind: K, id: string, patch: Partial<(typeof libraries)[K][number]>,
  ) =>
    setLibraries((prev) => ({
      ...prev,
      [kind]: prev[kind].map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  // Deleting a catalogue entry never mutates the draft — a prescribed row
  // keeps its dangling drugId and renders from its own stored fields (DR-028).
  const libDelete = <K extends keyof typeof libraries>(kind: K, id: string) =>
    setLibraries((prev) => ({ ...prev, [kind]: prev[kind].filter((r) => r.id !== id) }));

  const testLibrary = useMemo(() => libraries.tests.map((t) => t.name), [libraries.tests]);
  const diagnosisLibrary = useMemo(() => libraries.diagnoses.map((d) => d.name), [libraries.diagnoses]);
  const adviceLibrary = useMemo(
    () => libraries.advice.map((a) => ({ en: a.descEn, bn: a.descBn })),
    [libraries.advice],
  );

  // Draft rows adapted to the shapes the Save-as-Template modals render.
  // A medication with a drugId resolves its catalogue fields from
  // libraries.drugs (DR-028); one without renders the free-text branch. A
  // drugId whose entry has been deleted resolves to blanks rather than
  // throwing — the lookup is allowed to miss.
  const draftMedicinesForTemplate = useMemo<DraftMedicine[]>(
    () =>
      (draft?.medications ?? []).map((m) => {
        if (!m.drugId) return { id: m.id, source: "freetext" as const, raw: m.medicine };
        const cat = libraries.drugs.find((d) => d.id === m.drugId);
        const dose = cat?.doses[0];
        return {
          id: m.id,
          source: "library" as const,
          brandName: cat?.brandName ?? "",
          genericName: cat?.genericName ?? "",
          drugClass: cat?.drugClass ?? "",
          manufacturer: cat?.manufacturer ?? "",
          doseForm: dose?.doseForm ?? "",
          strength: dose?.strength ?? "",
          schedule: m.phases[0]?.FREQUENCY ?? "",
          doseBn: m.typeText,
        };
      }),
    [draft?.medications, libraries.drugs],
  );
  const draftTestsForTemplate = useMemo<DraftTest[]>(
    () =>
      (draft?.tests ?? []).map((t) => {
        const cat = libraries.tests.find((x) => x.name === t.text);
        if (!cat) return { id: t.id, source: "freetext" as const, raw: t.text };
        return {
          id: t.id,
          source: "library" as const,
          panelName: cat.panelName,
          name: cat.name,
          abbreviation: cat.abbreviation,
          specimen: cat.specimen,
          method: cat.method,
          unit: cat.unit,
          ranges: cat.ranges,
        };
      }),
    [draft?.tests, libraries.tests],
  );
  const draftAdvicesForTemplate = useMemo<DraftAdvice[]>(
    () =>
      (draft?.advice ?? []).map((a) =>
        a.en
          ? { id: a.id, source: "library" as const, title: a.en, descBn: a.bn, descEn: a.en }
          : { id: a.id, source: "freetext" as const, title: a.bn },
      ),
    [draft?.advice],
  );

  // Vitals rendered as the modal's label/value rows; blank entries are
  // dropped so an untouched prescription previews as empty.
  const draftPhysicalForTemplate = useMemo(
    () =>
      ([
        ["Pulse", draft?.vitals.pulse], ["B.P.", draft?.vitals.bp],
        ["Temperature", draft?.vitals.temperature], ["Resp. Rate", draft?.vitals.respRate],
        ["SpO₂", draft?.vitals.spo2], ["Weight", draft?.vitals.weight],
        ["Height", draft?.vitals.height],
      ] as const)
        .filter(([, v]) => (v ?? "").trim() !== "")
        .map(([label, v]) => ({ id: `vit-${label}`, label, value: v as string })),
    [draft?.vitals],
  );
  const draftFollowUpForTemplate = useMemo(() => {
    const f = draft?.followUp;
    if (!f) return [];
    const text = f.mode === "On"
      ? (f.date ? `On ${f.date}` : "")
      : (f.amount ? `After ${f.amount} ${f.unit}` : "");
    const rows = text ? [{ id: "fu-when", text }] : [];
    if (draft?.referTo?.trim()) rows.push({ id: "fu-refer", text: `Refer to ${draft.referTo}` });
    return rows;
  }, [draft?.followUp, draft?.referTo]);

  // ── Templates (DR-027) ────────────────────────────────────
  const templates = sutState.templates;
  const addTemplate = <K extends keyof typeof templates>(
    kind: K,
    entry: (typeof templates)[K][number],
  ) =>
    setSutState((prev) => ({
      ...prev,
      templates: { ...prev.templates, [kind]: [...prev.templates[kind], entry] },
    }));

  // Every inserted row gets a fresh id — template ids are never reused.
  const reId = <T extends { id: string }>(rows: T[]): T[] =>
    rows.map((r) => ({ ...r, id: newRowId() }));

  // What a template captures: all nine sections, never fee/date/visit/patient.
  const capturePayload = (): TemplatePayload => ({
    complaints: draft?.complaints ?? [],
    history: draft?.history ?? [],
    drugHistory: draft?.drugHistory ?? [],
    vitals: draft?.vitals ?? {
      pulse: "", bp: "", temperature: "", respRate: "", spo2: "", weight: "", height: "",
    },
    diagnoses: draft?.diagnoses ?? [],
    medications: draft?.medications ?? [],
    tests: draft?.tests ?? [],
    advice: draft?.advice ?? [],
    followUp: draft?.followUp ?? { mode: "After", amount: "7", unit: "Days", date: "" },
    referTo: draft?.referTo ?? "",
  });

  const countPayload = (pl: TemplatePayload) =>
    pl.complaints.length + pl.history.length + pl.drugHistory.length +
    pl.diagnoses.length + pl.medications.length + pl.tests.length + pl.advice.length;
  type AdviceRow = SavedAdvice & { id: string };
  const savedTests = draft?.tests ?? EMPTY_ROWS;
  const setSavedTests = (v: SutListRow[] | ((p: SutListRow[]) => SutListRow[])) =>
    updateDraft({ tests: typeof v === "function" ? v(draft?.tests ?? []) : v });
  const savedAdvice = draft?.advice ?? EMPTY_ADVICE;
  const setSavedAdvice = (v: AdviceRow[] | ((p: AdviceRow[]) => AdviceRow[])) =>
    updateDraft({ advice: typeof v === "function" ? v(draft?.advice ?? []) : v });
  const savedDiagnoses = draft?.diagnoses ?? EMPTY_ROWS;
  const setSavedDiagnoses = (v: SutListRow[] | ((p: SutListRow[]) => SutListRow[])) =>
    updateDraft({ diagnoses: typeof v === "function" ? v(draft?.diagnoses ?? []) : v });
  const savedDrugHistory = draft?.drugHistory ?? EMPTY_ROWS;
  const setSavedDrugHistory = (v: SutListRow[] | ((p: SutListRow[]) => SutListRow[])) =>
    updateDraft({ drugHistory: typeof v === "function" ? v(draft?.drugHistory ?? []) : v });
  // Chief Complaints is split into 3 tabs (Present Complaints / History /
  // Summary) that live in the section header instead of stacking vertically.
  const [chiefTab, setChiefTab] = useState<"complaints" | "history" | "summary">("complaints");
  const [summaryText, setSummaryText] = useState("");
  const [noteText, setNoteText] = useState("");
  const [showIntakeV2, setShowIntakeV2] = useState(false);
  const [showHistoryIntake, setShowHistoryIntake] = useState(false);
  const savedHistory = draft?.history ?? EMPTY_COMPLAINTS;
  const setSavedHistory = (
    v: ComplaintRow[] | ((p: ComplaintRow[]) => ComplaintRow[]),
  ) => updateDraft({ history: typeof v === "function" ? v(draft?.history ?? []) : v });
  const [historyIntakeState, setHistoryIntakeState] = useState<HistoryIntakeState>(EMPTY_HISTORY_INTAKE);
  const [showTestResults, setShowTestResults] = useState(false);
  const [showManageAdvice, setShowManageAdvice] = useState(false);
  const [showSaveAdviceTemplate, setShowSaveAdviceTemplate] = useState(false);
  const [showInsertAdviceTemplate, setShowInsertAdviceTemplate] = useState(false);
  const [showManageDiagnosis, setShowManageDiagnosis] = useState(false);
  const [showManageTest, setShowManageTest] = useState(false);
  const [showInsertTestTemplate, setShowInsertTestTemplate] = useState(false);
  const [showSaveTestTemplate, setShowSaveTestTemplate] = useState(false);
  const [showInsertTreatmentTemplate, setShowInsertTreatmentTemplate] = useState(false);
  const [showManageDrug, setShowManageDrug] = useState(false);
  const [showSaveTreatmentTemplate, setShowSaveTreatmentTemplate] = useState(false);
  // Treatment row entry mode — "dropdown" (schema-driven dropdowns) or
  // "type" (single free-text dose & instruction field). Toggle from the
  // section header.
  const [treatmentMode, setTreatmentMode] = useState<"dropdown" | "type">("type");
  // Toggle: when true, TreatmentAddRows fills itself with all 18 V2 library
  // medicines; when false, it resets to a single blank add-row. Purely a
  // preview/demo aid, not part of the doctor workflow.
  const [treatmentDemoSeeded, setTreatmentDemoSeeded] = useState(false);
  // Bumped by the toolbar's Clear All button. Used as part of the `key`
  // on every section's add-row stack so React remounts them fresh,
  // discarding any in-progress text that's only kept in their internal
  // state (i.e. rows that haven't yet been committed to a saved* list).
  const [clearKey, setClearKey] = useState(0);

  // Compact display detection (≤1399px viewport — same threshold as the
  // Chief Complaint compact redesign). On compact, the Follow Up & Refer
  // section collapses into a 2-tab UI ("Follow up" / "Refer") instead of
  // showing both stacked vertically with labels.
  const [isCompactDisplay, setIsCompactDisplay] = useState<boolean>(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1399px)");
    const onChange = (e: MediaQueryListEvent) => setIsCompactDisplay(e.matches);
    setIsCompactDisplay(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  const [followRefTab, setFollowRefTab] = useState<"follow" | "refer">("follow");
  // Follow Up & Refer working state
  // Follow-up lives on draft.followUp; refer on draft.referTo. Same accessor
  // shape as the section arrays so the control props are unchanged.
  const followUpMode = (draft?.followUp.mode ?? "After") as "After" | "On";
  const setFollowUpMode = (v: "After" | "On" | ((p: "After" | "On") => "After" | "On")) =>
    updateDraft({
      followUp: {
        ...(draft?.followUp ?? { mode: "After" as const, amount: "7", unit: "Days", date: "" }),
        mode: typeof v === "function" ? v(followUpMode) : v,
      },
    });
  const followUpAmount = draft?.followUp.amount ?? "7";
  const setFollowUpAmount = (v: string | ((p: string) => string)) =>
    updateDraft({
      followUp: {
        ...(draft?.followUp ?? { mode: "After" as const, amount: "7", unit: "Days", date: "" }),
        amount: typeof v === "function" ? v(followUpAmount) : v,
      },
    });
  const followUpUnit = (draft?.followUp.unit ?? "Days") as "Days" | "Weeks" | "Months";
  const setFollowUpUnit = (
    v: "Days" | "Weeks" | "Months" | ((p: "Days" | "Weeks" | "Months") => "Days" | "Weeks" | "Months"),
  ) =>
    updateDraft({
      followUp: {
        ...(draft?.followUp ?? { mode: "After" as const, amount: "7", unit: "Days", date: "" }),
        unit: typeof v === "function" ? v(followUpUnit) : v,
      },
    });
  const followUpDate = draft?.followUp.date ?? "";
  const setFollowUpDate = (v: string | ((p: string) => string)) =>
    updateDraft({
      followUp: {
        ...(draft?.followUp ?? { mode: "After" as const, amount: "7", unit: "Days", date: "" }),
        date: typeof v === "function" ? v(followUpDate) : v,
      },
    });
  const [followUpUnitOpen, setFollowUpUnitOpen] = useState(false);
  const referToText = draft?.referTo ?? "";
  const setReferToText = (v: string | ((p: string) => string)) =>
    updateDraft({ referTo: typeof v === "function" ? v(referToText) : v });
  const [referToFocused, setReferToFocused] = useState(false);
  const followUpUnitRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!followUpUnitOpen) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      // Either inside the trigger wrapper OR inside the portaled panel — keep open.
      if (followUpUnitRef.current?.contains(t)) return;
      const panel = document.getElementById("follow-up-unit-panel");
      if (panel?.contains(t)) return;
      setFollowUpUnitOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [followUpUnitOpen]);
  const [showSaveOverallTemplate, setShowSaveOverallTemplate] = useState(false);
  const [showInsertOverallTemplate, setShowInsertOverallTemplate] = useState(false);
  const [showPatientDetails, setShowPatientDetails] = useState(false);
  // Patient state — starts empty (page is gated). Set when the doctor
  // picks a row in the demographic search panel; this populates the v2-style
  // demographic bar and ungates the rest of the page.
  const [patient, setPatient] = useState<PatientRecord>(EMPTY_PATIENT);
  // A completed prescription is permanently read-only (DR-009). The lock
  // reuses the dimming the no-patient gate already applies to the same
  // wrapper, so no new disabled styling is introduced.
  const [showPreview, setShowPreview] = useState(false);
  // Vitals validate on blur, never mid-typing. Out-of-range values are shown
  // inline beneath the grid and never block Save.
  const [vitalsTouched, setVitalsTouched] = useState<Record<string, boolean>>({});
  // Header + completion gates. Save is never blocked (a draft may be
  // incomplete); only Preview & Complete gates.
  const [headerTouched, setHeaderTouched] = useState<Record<string, boolean>>({});
  const [completeAttempted, setCompleteAttempted] = useState(false);
  // A medicine with no dosage in its first phase is incomplete.
  const incompleteMeds = useMemo(
    () =>
      (draft?.medications ?? []).filter(
        (m) => m.medicine.trim() !== "" && (m.phases[0]?.DOSAGE_UNIT ?? "").trim() === "" && m.typeText.trim() === "",
      ),
    [draft?.medications],
  );
  const completeBlockers = useMemo(() => {
    const out: string[] = [];
    if ((draft?.diagnoses ?? []).length === 0) out.push("Add at least one diagnosis.");
    if ((draft?.medications ?? []).length === 0) out.push("Add at least one medication.");
    return out;
  }, [draft?.diagnoses, draft?.medications]);
  const vitalErrors = useMemo(() => {
    const v = draft?.vitals;
    if (!v) return [] as { label: string; msg: string }[];
    const labels: Record<string, string> = {
      pulse: "Pulse", bp: "B.P.", temperature: "Temp.", respRate: "Resp. R.",
      spo2: "SpO₂", weight: "Weight", height: "Height",
    };
    return (Object.keys(labels) as (keyof typeof v)[])
      .filter((k) => vitalsTouched[k as string])
      .map((k) => ({ label: labels[k as string], msg: validateVital(k as string, v[k]) }))
      .filter((e): e is { label: string; msg: string } => e.msg !== null);
  }, [draft?.vitals, vitalsTouched]);
  const isCompleted = draft?.status === "completed";

  // Visit options come from the patient's completed count — every visit type
  // increments (DR-009). The prototype hardcoded three options.
  // Snapshot the completed count when the patient is loaded; later
  // completions do not refresh it.
  const completedCountRef = useRef(0);
  useEffect(() => {
    completedCountRef.current = patient.id
      ? (sutState.prescriptions[patient.id]?.completed.length ?? 0)
      : 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient.id]);
  const completedCount = completedCountRef.current;
  const visitTotal = completedCount + (isCompleted ? 0 : 1);
  const visitOptions = Array.from({ length: visitTotal }, (_, i) => `Visit ${visitTotal - i}/${visitTotal}`);

  const [demoSearch, setDemoSearch] = useState("");
  // Demographic search dropdown — opens on click/focus, shows a hint line
  // + divider + "New Patient" CTA. Anchored to the search box via portal.
  const [demoSearchOpen, setDemoSearchOpen] = useState(false);
  // "+ New Patient" CTA in the dropdown opens the registration modal.
  const [newPatientOpen, setNewPatientOpen] = useState(false);
  const [demoSearchPos, setDemoSearchPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const demoSearchWrapperRef = useRef<HTMLDivElement>(null);
  const demoSearchLabelRef = useRef<HTMLLabelElement>(null);
  const demoSearchInputRef = useRef<HTMLInputElement>(null);
  // Keyboard navigation: index into the filtered patient list. Recomputed
  // on every search-text change so it always points at a valid row.
  const [demoHighlight, setDemoHighlight] = useState(0);
  const filteredPatients = useMemo(() => {
    const q = demoSearch.trim().toLowerCase();
    if (q.length === 0) return [] as PatientPick[];
    return sutState.patients.filter((p) => p.phone === q);
  }, [demoSearch, sutState.patients]);
  // Reset highlight whenever the result list changes or the panel reopens.
  useEffect(() => { setDemoHighlight(0); }, [demoSearch, demoSearchOpen]);
  const [visit, setVisit] = useState("");
  const [visitType, setVisitType] = useState("");
  const [fee, setFee] = useState("");
  const [toast, setToast] = useState<{ title: string; description?: string } | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Reposition the demographic search panel when open + on scroll/resize.
  useEffect(() => {
    if (!demoSearchOpen) return;
    const update = () => {
      if (!demoSearchLabelRef.current) return;
      const r = demoSearchLabelRef.current.getBoundingClientRect();
      setDemoSearchPos({ top: r.bottom + 4, left: r.left, width: r.width });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [demoSearchOpen]);

  // Close panel on outside click — but ignore clicks inside the portal panel.
  useEffect(() => {
    function handle(e: MouseEvent) {
      const t = e.target as Node;
      if (demoSearchWrapperRef.current && !demoSearchWrapperRef.current.contains(t)) {
        const panel = document.getElementById("demo-search-panel");
        if (panel && panel.contains(t)) return;
        setDemoSearchOpen(false);
      }
    }
    if (demoSearchOpen) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [demoSearchOpen]);

  // Commit a patient pick — shared by row clicks and Enter-on-highlight.
  const selectPatient = (p: PatientPick) => {
    // Switching away with unsaved edits warns first. Confirming keeps the
    // outgoing draft in state per DR-009 — only the uncommitted edits are lost.
    if (isDirty && patient.id !== "" && patient.id !== p.code) {
      const ok = window.confirm(
        "This prescription has unsaved changes. Switch patient and discard them?",
      );
      if (!ok) return;
    }
    setPatient({
      initials: p.initials,
      name: p.name,
      id: p.code,
      age: p.age,
      sex: p.sex,
      phone: p.phone,
    });
    setVisit("Visit 3/3");
    setVisitType("New Visit");
    loadDraftFor(p.code);
    setDemoSearch("");
    setDemoSearchOpen(false);
    // Drop focus from the search input so the cursor doesn't sit blinking
    // in the now-cleared field after Enter / click.
    demoSearchInputRef.current?.blur();
  };

  // Prescription date (YYYY-MM-DD) — editable via the themed ToolbarDatePicker.
  const [prescriptionDate, setPrescriptionDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });

  const dateErr = validateRxDate(prescriptionDate);
  const feeErr = validateFee(fee);

  // A restored draft repopulates the toolbar fields. Keyed on the draft id so
  // this runs when a draft is loaded, not on every edit.
  const loadedDraftId = draft?.id ?? null;
  useEffect(() => {
    if (draft === null) return;
    setFee(draft.fee);
    if (draft.visitType !== "") setVisitType(draft.visitType);
    if (draft.date !== "") setPrescriptionDate(draft.date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedDraftId]);


  return (
    <div className="nm-page h-screen flex flex-col font-[DM_Sans] text-[#0F100F] overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: TOOLTIP_CSS }} />
      {/* ═══ TOOLBAR ═══ */}
      <div
        data-module="toolbar" className="flex items-center justify-between px-[16px] h-[45px] shrink-0"
        style={{ background: "#358C11" }}
      >
        {/* Left */}
        <div className="flex items-center gap-[8px]">
          {/* Back */}
          <button
            onClick={() => {
              if (window.history.length > 1) router.back();
              else router.push("/");
            }}
            className="flex items-center gap-[5px] text-white bg-transparent border-none cursor-pointer p-0"
          >
            <ChevronLeft size={15} />
            <span className="text-[13px]">Back</span>
          </button>

          <div className="w-px h-[24px] bg-white/20" />

          {/* Visit selector dropdown */}
          <div style={{ width: 96 }}>
            <ToolbarDropdown
              value={visit}
              options={visitOptions}
              onChange={setVisit}
              placeholder="Visit No."
            />
          </div>

          <div className="w-px h-[24px] bg-white/20" />

          {/* Visit type dropdown */}
          <div style={{ width: 100 }}>
            <ToolbarDropdown
              value={visitType}
              options={["New Visit", "Follow up", "Report"]}
              onChange={(v) => {
                // Selecting a visit type on a completed prescription opens a
                // fresh draft for the same patient; the count increments for
                // every type (DR-009).
                if (isCompleted && patient.id) {
                  startNewVisit(patient.id, v);
                  setVisit(`Visit ${completedCount + 1}/${completedCount + 1}`);
                  setVisitType(v);
                  return;
                }
                setVisitType(v);
                updateDraft({ visitType: v });
              }}
              placeholder="Visit type"
            />
          </div>

          <div className="w-px h-[24px] bg-white/20" />

          {/* Fee — fixed prefix + editable amount */}
          <label className="flex items-center gap-[4px] px-[10px] py-[5px] h-[28px] rounded-[6px] cursor-text" style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}>
            <span className="text-[12px] font-medium text-white tracking-[0.5px] select-none">FEE</span>
            {patient.name !== "" && (
              <span className="text-[13px] font-medium text-white select-none">৳</span>
            )}
            <input
              type="text"
              inputMode="numeric"
              value={fee}
              onChange={(e) => {
                // typed; validateFee makes the rule explicit regardless.
                const next = e.target.value.replace(/[^\d-]/g, "");
                setFee(next);
                updateDraft({ fee: next });
              }}
              onBlur={() => setHeaderTouched((t) => ({ ...t, fee: true }))}
              className="text-[13px] font-medium text-white bg-transparent border-none outline-none p-0 font-[DM_Sans]"
              style={{ width: `${Math.max(2, fee.length || 1)}ch` }}
            />
          </label>

          <div className="w-px h-[24px] bg-white/20" />

          {/* Date — themed calendar dropdown */}
          <ToolbarDatePicker
            value={prescriptionDate}
            onChange={(d) => { setPrescriptionDate(d); updateDraft({ date: d }); }}
          />
        </div>

        {/* Right */}
        <div className="flex items-center gap-[6px]">
          {/* Icon buttons first */}
          <button
            onClick={() => {
              if (syncing) return;
              // General page loading while syncing; the snackbar only
              // appears once the sync completes.
              setSyncing(true);
              window.setTimeout(() => {
                setSyncing(false);
                setToast({
                  title: "Patient data updated",
                  description: "Loaded the latest changes for this patient.",
                });
              }, 1100);
            }}
            className="flex items-center justify-center w-[30px] h-[30px] rounded-[6px] cursor-pointer"
            style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}
            title="Sync patient data"
          >
            <RefreshCw size={15} className={`text-white ${syncing ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowSaveOverallTemplate(true)}
            className="flex items-center justify-center w-[30px] h-[30px] rounded-[6px] cursor-pointer"
            style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}
            title="Save as Template"
          >
            <BookmarkPlus size={15} className="text-white" />
          </button>
          <button
            onClick={() => setShowInsertOverallTemplate(true)}
            className="flex items-center justify-center w-[30px] h-[30px] rounded-[6px] cursor-pointer"
            style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}
            title="Insert from Template"
          >
            <FileDown size={15} className="text-white" />
          </button>
          <button
            onClick={() => {
              // Wipe everything the doctor has entered for the current
              // prescription. Demographic state (patient + Visit No. /
              // Visit type / Fee in the toolbar) is intentionally left
              // intact — the page stays bound to the same patient.
              setSavedComplaints([]);
              setSavedHistory([]);
              setHistoryIntakeState(EMPTY_HISTORY_INTAKE);
              setMedications([]);
              setSavedTests([]);
              setSavedAdvice([]);
              setSavedDiagnoses([]);
              setSavedDrugHistory([]);
              setSummaryText("");
              setNoteText("");
              setFollowUpMode("After");
              setFollowUpAmount("7");
              setFollowUpUnit("Days");
              setFollowUpDate("");
              setReferToText("");
              setTreatmentDemoSeeded(false);
              // Force every add-row stack to remount with fresh internal
              // state so in-progress (uncommitted) rows clear too.
              setClearKey((n) => n + 1);
              setToast({
                title: "Prescription cleared",
                description: "All entries wiped. Patient demographics kept.",
              });
            }}
            className="flex items-center justify-center w-[30px] h-[30px] rounded-[6px] cursor-pointer"
            style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}
            title="Clear All"
          >
            <Eraser size={15} className="text-white" />
          </button>

          <div className="w-px h-[24px] bg-white/20" />

          {/* Save & Preview */}
          <button
            onClick={() => {
              if (draft === null) return;
              saveDraft();
              setToast({
                title: "Prescription saved",
                description: "Draft stored for this patient.",
              });
            }}
            className="flex items-center gap-[5px] px-[12px] h-[28px] rounded-[6px]" style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}>
            <Save size={14} className="text-white" />
            <span className="text-[13px] font-medium text-white">Save</span>
          </button>
          <button
            onClick={() => {
              if (draft === null) return;
              // Already completed — reopen the preview without re-completing.
              if (isCompleted) { setShowPreview(true); return; }
              setCompleteAttempted(true);
              if (completeBlockers.length > 0 || dateErr !== null) return;
              completeDraft();
              setShowPreview(true);
            }}
            className="flex items-center gap-[5px] px-[12px] h-[28px] rounded-[6px]" style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}>
            <Eye size={14} className="text-white" />
            <span className="text-[13px] font-medium text-white">Preview & Complete</span>
          </button>
        </div>
      </div>

      {/* ═══ DEMOGRAPHIC BAR ═══ */}
      <div data-module="patient" className="flex items-center gap-[16px] px-[16px] py-[6px] bg-white shrink-0">
        {/* Search — when no patient is selected, the box is visually
            "highlighted" (white bg, green border, soft green ring) to draw
            the doctor's eye to the next step. No autofocus — the cursor is
            NOT placed in the field; this is purely a visual cue.
            Clicking/focusing the box opens a small dropdown panel below it
            with a hint line and an "+ New Patient" CTA. */}
        <div className="w-[392px] shrink-0 relative" ref={demoSearchWrapperRef}>
          <label
            ref={demoSearchLabelRef}
            onClick={() => setDemoSearchOpen(true)}
            className="demo-search flex items-center gap-[7px] h-[30px] px-[13px] rounded-[6px] cursor-text"
            style={{
              background: patient.name === "" ? "#ffffff" : "#ffffff",
              border: patient.name === "" ? "1px solid #358C11" : "1px solid #b6bcc6",
              boxShadow: patient.name === "" ? "0 0 0 3px rgba(53,140,17,0.15)" : "none",
              transition: "background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease",
            }}
          >
            <Search
              size={13}
              className="shrink-0"
              style={{ color: "rgba(15,16,15,0.75)" }}
            />
            <input
              ref={demoSearchInputRef}
              type="text"
              value={demoSearch}
              onChange={(e) => setDemoSearch(e.target.value)}
              onFocus={() => setDemoSearchOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  if (!demoSearchOpen) setDemoSearchOpen(true);
                  setDemoHighlight((i) => Math.min(i + 1, Math.max(0, filteredPatients.length - 1)));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setDemoHighlight((i) => Math.max(i - 1, 0));
                } else if (e.key === "Enter") {
                  if (filteredPatients.length > 0) {
                    e.preventDefault();
                    const idx = Math.min(demoHighlight, filteredPatients.length - 1);
                    selectPatient(filteredPatients[idx]);
                  }
                } else if (e.key === "Escape") {
                  setDemoSearchOpen(false);
                }
              }}
              placeholder="Search or add patient by ID / mobile number"
              className="text-[15px] text-[#0F100F] font-[DM_Sans] bg-transparent outline-none flex-1 min-w-0"
            />
          </label>
        </div>
        {/* Portal panel — anchored to the search box, escapes any clipping */}
        {demoSearchOpen && demoSearchPos && createPortal(
          <div
            id="demo-search-panel"
            className="rounded-[8px] bg-white font-[DM_Sans]"
            style={{
              position: "fixed",
              top: demoSearchPos.top,
              left: demoSearchPos.left,
              width: demoSearchPos.width,
              zIndex: 1000,
              border: "1px solid #eef0f4",
              boxShadow: "0 8px 24px rgba(15,23,42,0.10)",
              overflow: "hidden",
            }}
          >
            {(() => {
              const q = demoSearch.trim().toLowerCase();
              // Empty input → show the "start typing" hint instead of the
              // full pool. Results only appear after the doctor types at
              // least one character.
              if (q.length === 0) {
                return (
                  <div className="flex items-center gap-[8px] px-[14px] py-[10px] text-[13px] text-[#5a6070]">
                    <AlertCircle size={14} className="text-[#5a6070] shrink-0" />
                    <span>Start typing patient mobile number or ID</span>
                  </div>
                );
              }
              if (filteredPatients.length === 0) {
                return (
                  <div className="flex items-center gap-[8px] px-[14px] py-[10px] text-[13px] text-[#5a6070]">
                    <AlertCircle size={14} className="text-[#5a6070] shrink-0" />
                    <span>
                      No patient found. Click <span className="font-bold">+ New Patient</span> to add as a new patient
                    </span>
                  </div>
                );
              }
              return (
                <div className="dsearch-scroll max-h-[280px] overflow-y-auto">
                  {filteredPatients.map((p, idx) => {
                    const isHighlighted = idx === demoHighlight;
                    return (
                    <button
                      key={p.code}
                      type="button"
                      onClick={() => selectPatient(p)}
                      onMouseEnter={() => setDemoHighlight(idx)}
                      className={`dsearch-row flex items-center gap-[12px] w-full px-[14px] py-[8px] text-left cursor-pointer${isHighlighted ? " dsearch-row--active" : ""}`}
                      style={{
                        background: "transparent",
                        border: "none",
                        borderBottom: idx === filteredPatients.length - 1 ? "none" : "1px solid #f1f2f5",
                      }}
                    >
                      {/* Avatar */}
                      <div
                        className="dsearch-avatar flex items-center justify-center w-[34px] h-[34px] rounded-full shrink-0"
                        style={{ background: "#358C11" }}
                      >
                        <span className="text-[13px] font-semibold text-white">{p.initials}</span>
                      </div>
                      {/* Name + meta */}
                      <div className="flex flex-col gap-[2px] flex-1 min-w-0">
                        <span className="text-[15px] font-semibold text-[#0F100F] truncate">{p.name}</span>
                        <div className="flex items-center gap-[6px] text-[12px]">
                          <span className="text-[#358C11] font-medium">#{p.code}</span>
                          <span className="text-[#c0c4cc]">•</span>
                          <Phone size={10} className="text-[#9198a5]" />
                          <span className="text-[#5a6070]">{p.phone}</span>
                        </div>
                      </div>
                    </button>
                    );
                  })}
                </div>
              );
            })()}
            <div className="h-px bg-[#eef0f4]" />
            <div className="flex justify-end px-[10px] py-[8px]">
              <button
                type="button"
                onClick={() => { setDemoSearchOpen(false); setNewPatientOpen(true); }}
                className="flex items-center gap-[6px] px-[12px] py-[6px] rounded-[6px] cursor-pointer"
                style={{ background: "#358C11", border: "none", transition: "background 0.12s ease" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#22680A"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#358C11"; }}
              >
                <Plus size={14} className="text-white" />
                <span className="text-[14px] font-semibold text-white">New Patient</span>
              </button>
            </div>
          </div>,
          document.body,
        )}

        {/* Add New Patient modal — registers the patient and flips the page
            into the selected state via the same path as a search-row pick. */}
        {newPatientOpen && (
          <NewPatientModal
            initialQuery={demoSearch}
            patients={sutState.patients}
            onClose={() => setNewPatientOpen(false)}
            onAdd={(p) => {
              // onAdd fires both for a newly registered patient and for an
              // existing one picked from the duplicate-check dropdown, so only
              // append when the code is not already in the pool.
              setSutState((prev) =>
                prev.patients.some((x) => x.code === p.code)
                  ? prev
                  : { ...prev, patients: [p, ...prev.patients] },
              );
              selectPatient(p);
              setNewPatientOpen(false);
            }}
          />
        )}

        {/* Patient Info — empty state shows a user icon + "No user selected"
            placeholder; once a patient is picked the avatar + name + meta
            row takes over. */}
        {patient.name === "" ? (
          <div className="flex items-center gap-[8px] shrink-0 text-[#8c9198]">
            <UserCircle size={20} strokeWidth={1.5} />
            <span className="text-[15px] font-medium font-[DM_Sans]">No user selected</span>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-[16px] shrink-0">
              {/* Avatar */}
              <div className="flex items-center justify-center w-[30px] h-[30px] rounded-[7px] bg-[#f2fbef] border border-[#d8e9d2]">
                <span className="text-[13px] font-semibold text-[#3fa216]">{patient.initials}</span>
              </div>

              {/* Name + Details */}
              <div className="flex items-center gap-[20px]">
                <span className="text-[15px] font-medium text-[#0F100F]">{patient.name}</span>
                <div className="flex items-center gap-[16px] text-[14px]">
                  <div className="flex items-center gap-[4px]">
                    <span className="font-medium text-[#064232]">ID:</span>
                    <span className="text-[#0F100F]">{patient.id}</span>
                  </div>
                  <div className="flex items-center gap-[4px]">
                    <span className="font-medium text-[#064232]">Age:</span>
                    <span className="text-[#0F100F]">{patient.age}</span>
                  </div>
                  <div className="flex items-center gap-[4px]">
                    <span className="font-medium text-[#064232]">Sex:</span>
                    <span className="text-[#0F100F]">{patient.sex}</span>
                  </div>
                  <div className="flex items-center gap-[4px]">
                    <span className="font-medium text-[#064232]">Phone:</span>
                    <span className="text-[#0F100F]">{patient.phone}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Patient Details Link */}
            <button
              type="button"
              onClick={() => setShowPatientDetails(true)}
              className="ml-auto flex items-center gap-[2px] cursor-pointer bg-transparent border-none p-0"
            >
              <span className="text-[15px] font-medium text-[#064232]">Patient Details</span>
              <ChevronRight size={16} className="text-[#064232]" />
            </button>
          </>
        )}
      </div>

      {/* ═══ "SELECT PATIENT" BANNER ═══ */}
      {patient.name === "" && (
        <div className="flex items-center gap-[10px] px-[16px] py-[10px] bg-[#fff8e6] shrink-0">
          <AlertCircle size={16} className="text-[#a47018] shrink-0" />
          <span className="text-[15px] font-bold text-[#5a4710] font-[DM_Sans]">
            Search for an existing patient or add a new one to begin creating a prescription.
          </span>
        </div>
      )}

      {(() => {
        const msgs: string[] = [];
        if (headerTouched.fee && feeErr) msgs.push(`Fee: ${feeErr}`);
        if (dateErr) msgs.push(`Date: ${dateErr}`);
        if (completeAttempted && !isCompleted) msgs.push(...completeBlockers);
        if (msgs.length === 0) return null;
        return (
          <div className="flex flex-col gap-[2px] px-[16px] py-[4px] bg-white shrink-0">
            {msgs.map((m) => <FieldError key={m} msg={m} />)}
          </div>
        );
      })()}

      {/* ═══ MAIN CONTENT ═══ */}
      {/* Grey section-body backdrop — transparent section bodies show this
          through, so the white input fields sit on grey. */}
      <div
        className={`flex flex-col flex-1 min-h-0 overflow-y-auto overflow-x-hidden ${
          patient.name === "" || isCompleted ? "opacity-50 pointer-events-none select-none" : ""
        }`}
        style={{ background: "#f4f6f9" }}
      >
        {/* Upper: two columns. Uses flex-[8] vs the bottom row's flex-[2]
            so the 3 logical bands (Chief+Treatment / Physical+Test+Advice /
            Diagnosis+Drug History+Note+Follow Up) preserve the 5:3:2
            height ratio (≈ 50% / 30% / 20%) regardless of viewport height. */}
        {/* Upper area is now a CSS grid: 2 columns (40% / 60%) × 2 content-
            driven rows. Same-row sections (Chief Complaints↔Treatment,
            Physical Findings↔Test/Advice) share equal heights and grow with
            content; minmax(min-content, Nfr) fills the screen 5:3 initially. */}
        <div
          className="grid"
          style={{
            gridTemplateColumns: "40% 60%",
            // Fixed vh minimums (NOT fr) so each row grows only with its OWN
            // content — adding items to row 2 must not stretch row 1. Row 1 ≈
            // 50% and row 2 ≈ 30% of the content area; the bottom band fills
            // the rest. minmax(min, auto): row = max(min, its content).
            gridTemplateRows: "minmax(45vh, auto) minmax(27vh, auto)",
          }}
        >

          {/* ── LEFT COLUMN (40%) — display:contents so its two sections
              become direct grid items ── */}
          <div className="contents">
            {/* Chief Complaints — grid col 1 / row 1; height links with
                Treatment (same grid row) and grows with content. */}
            <div className="flex flex-col min-w-0 border-r border-[#c2c2c2]" style={{ gridColumn: 1, gridRow: 1 }}>
              {/* Tabbed header — the 3 chief-complaint items each get their
                  own tab in place of the "Chief Complaints" header. Tab labels
                  reuse the SectionHeader label styling (12px bold uppercase). */}
              <div className="flex items-center justify-between bg-[#e0ecda] shrink-0 border-0 pr-[12px]">
                <div className="flex items-stretch">
                  {([
                    { key: "complaints", label: "Chief Complaints" },
                    { key: "history", label: "History" },
                    { key: "summary", label: "Summary" },
                  ] as const).map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setChiefTab(t.key)}
                      className="px-[18px] py-[6px] text-[12px] uppercase tracking-[0.096px] font-[DM_Sans] text-[#064232] cursor-pointer transition-colors"
                      style={{
                        background: "transparent",
                        // Explicit weight so the inactive tabs are truly regular
                        // (400) — only the active tab is bold.
                        fontWeight: chiefTab === t.key ? 700 : 600,
                      }}
                    >
                      {/* Underline lives on the LABEL span so it spans the label
                          width (not the padded button). Inset shadow so it never
                          adds height to the header bar. */}
                      <span className="relative inline-block">
                        {t.label}
                        {chiefTab === t.key && (
                          // Underline is label-width (child of the label span) but
                          // pushed down to the header's bottom edge (offset = the
                          // button's py-[6px]). Absolute → adds no height.
                          <span
                            className="absolute left-0 right-0"
                            style={{ bottom: -6, height: 2, background: "#064232" }}
                          />
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 p-[6px]">
                {/* Present Complaints */}
                {chiefTab === "complaints" && (
                  <div data-module="complaints" className="rounded-[8px] bg-white [&>*:first-child]:rounded-t-[7px] [&>*:last-child]:rounded-b-[7px]" style={{ border: "1px solid #e7ebf0" }}>
                    {savedComplaints.map((c, i) => (
                      <ListRow key={c.id} serial={i + 1}>
                        <span className="text-[14px] text-[#0F100F] flex-1 min-w-0 truncate">{c.text}</span>
                        <div className="flex items-center gap-[6px] flex-1 min-w-0">
                          <div className="flex-1 min-w-0">
                            {c.remark ? (
                              <div className="bg-white rounded-full px-[14px] h-[26px] flex items-center">
                                <span className="text-[13px] text-[#0F100F] truncate">{c.remark}</span>
                              </div>
                            ) : (
                              <div className="bg-white rounded-full px-[14px] h-[26px] flex items-center">
                                <span className="text-[13px] font-light text-[#0F100F]">History of present illness</span>
                              </div>
                            )}
                          </div>
                          <X
                            size={13}
                            className="text-[#8c9198] hover:text-[#dc2626] transition-colors cursor-pointer shrink-0"
                            onClick={() => setSavedComplaints((p) => p.filter((r) => r.id !== c.id))}
                          />
                        </div>
                      </ListRow>
                    ))}
                    <ChiefComplaintAddRows key={`cc-${clearKey}`} />
                  </div>
                )}

                {/* History — intake pulls the static past-disease checklist
                    from the patient information form. */}
                {chiefTab === "history" && (
                  <>
                    <div data-module="history" className="rounded-[8px] bg-white [&>*:first-child]:rounded-t-[7px] [&>*:last-child]:rounded-b-[7px]" style={{ border: "1px solid #e7ebf0" }}>
                      {savedHistory.map((h, i) => (
                        <ListRow key={h.id}>
                          <span className="text-[13px] text-[#0F100F] flex-1 min-w-0 truncate">{h.text}</span>
                          <div className="flex items-center gap-[6px] flex-1 min-w-0">
                            <div className="flex-1 min-w-0">
                              <div className="bg-white rounded-full px-[14px] h-[26px] flex items-center">
                                {h.remark ? (
                                  <span className="text-[12px] text-[#0F100F] truncate">{h.remark}</span>
                                ) : (
                                  <span className="text-[12px] text-[#8c9198]">Remark</span>
                                )}
                              </div>
                            </div>
                            <X
                              size={13}
                              className="text-[#8c9198] hover:text-[#dc2626] transition-colors cursor-pointer shrink-0"
                              onClick={() => setSavedHistory((p) => p.filter((r) => r.id !== h.id))}
                            />
                          </div>
                        </ListRow>
                      ))}
                      <ChiefComplaintAddRows key={`mh-${clearKey}`} library={MEDICAL_HISTORY_LIBRARY} placeholder="Add history" />
                    </div>
                    <div className="flex items-center justify-end mt-[6px]">
                      <button
                        type="button"
                        onClick={() => setShowHistoryIntake(true)}
                        className="flex items-center gap-[6px] text-[13px] font-medium text-[#358C11] hover:text-[#256b06] cursor-pointer"
                        style={{ background: "transparent", border: "none", padding: 0 }}
                      >
                        <ClipboardList size={13} />
                        Intake Questions
                      </button>
                    </div>
                  </>
                )}

                {/* Summary — populated by the assistant questionnaire and freely
                    editable by the doctor. */}
                {chiefTab === "summary" && (
                  <>
                    <textarea
                      value={summaryText}
                      onChange={(e) => setSummaryText(e.target.value)}
                      placeholder="Enter summary"
                      className="demo-field w-full bg-white rounded-[8px] px-[16px] py-[12px] text-[15px] text-[#0F100F] outline-none font-[DM_Sans] resize-none"
                      style={{ minHeight: "120px" }}
                    />
                    <div className="flex items-center justify-end mt-[6px]">
                      <button
                        type="button"
                        onClick={() => setShowIntakeV2(true)}
                        className="flex items-center gap-[6px] text-[13px] font-medium text-[#358C11] hover:text-[#256b06] cursor-pointer"
                        style={{ background: "transparent", border: "none", padding: 0 }}
                      >
                        <ClipboardList size={13} />
                        Intake Questions
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Physical Findings — bottom 3/8 of left column. */}
            <div data-module="vitals" className="flex flex-col min-w-0 border-t border-r border-[#c2c2c2]" style={{ gridColumn: 1, gridRow: 2 }}>
              <SectionHeader title="Physical Findings" />

              <div className="flex-1 p-[6px] flex flex-col gap-[6px]">
                {/* Vitals — 7 items on a 4-column grid (2 rows). Row 1: Wt Ht T P,
                    row 2: BP RR SpO₂ (last cell blank). border-r on every cell
                    except the last one in its row; border-b only on the top row so
                    columns align cleanly. */}
                <div className="grid grid-cols-4 bg-white rounded-[8px] overflow-hidden" style={{ border: "1px solid #e7ebf0" }}>
                  {[
                    // `field` maps each cell to its Prescription.vitals key. The
                    // render array's "rr" is the type's "respRate".
                    { label: "Pulse", field: "pulse" as const, value: vitals.pulse, unit: "bpm", inputW: 60 },
                    { label: "B.P.", field: "bp" as const, value: vitals.bp, unit: "mmHg", inputW: 56 },
                    { label: "Temp.", field: "temperature" as const, value: vitals.temperature, unit: "°F", inputW: 56 },
                    { label: "Resp. R.", field: "respRate" as const, value: vitals.rr, unit: "/min", inputW: 56 },
                    { label: "SpO₂", field: "spo2" as const, value: vitals.spo2, unit: "%", inputW: 60 },
                    { label: "Weight", field: "weight" as const, value: vitals.weight, unit: "kg", inputW: 56 },
                    { label: "Height", field: "height" as const, value: vitals.height, unit: "cm", inputW: 56 },
                  ].map((v, i) => {
                    // Only the col-4 cells sit at the box's right edge (i===3 in
                    // row 1; the blank cell fills col 4 of row 2). Height (i===6) is
                    // col 3, so it keeps its right divider like Temp. above it.
                    const isRowEnd = i === 3;
                    const isTopRow = i < 4;
                    return (
                      <label
                        key={v.label}
                        className={`demo-vcell grid items-center h-[30px] min-w-0 cursor-text ${
                          isRowEnd ? "border-r border-transparent" : "border-r border-[#e7ebf0]"
                        } ${isTopRow ? "border-b border-[#e7ebf0]" : ""}`}
                        style={{ gridTemplateColumns: `58px minmax(0,1fr) auto` }}
                      >
                        {/* Whole cell is a <label>, so clicking anywhere in it focuses
                            the input. Cell columns are 3:3:2 (label · input area · unit)
                            using minmax(0,…fr) so the tracks stay strictly proportional
                            regardless of label length → parts line up across rows. */}
                        <span className="text-[14px] text-[#064232] min-w-0 truncate pl-[8px]">{v.label}</span>
                        <input
                          value={draft?.vitals[v.field] ?? ""}
                          onChange={(e) =>
                            updateDraft({
                              vitals: {
                                ...(draft?.vitals ?? {
                                  pulse: "", bp: "", temperature: "",
                                  respRate: "", spo2: "", weight: "", height: "",
                                }),
                                [v.field]: e.target.value,
                              },
                            })
                          }
                          onBlur={() => setVitalsTouched((t) => ({ ...t, [v.field]: true }))}
                          className="text-[15px] text-[#0F100F] w-full min-w-0 h-full self-stretch text-left outline-none bg-transparent"
                        />
                        <span className="self-stretch flex items-center min-w-0 pl-[4px] pr-[8px]">
                          <span className="text-[13px] font-light text-[#0F100F]/75 truncate text-left">{v.unit}</span>
                        </span>
                      </label>
                    );
                  })}
                  {/* Blank 4th cell of row 2 so the 4×2 grid reads as complete —
                      otherwise the divider under "Resp. R." runs into empty space
                      and looks like a stray border at the bottom-right. */}
                  <div className="bg-white" />
                </div>

                {vitalErrors.length > 0 && (
                  <div className="flex flex-col gap-[2px] px-[2px]">
                    {vitalErrors.map((e) => (
                      <FieldError key={e.label} msg={`${e.label}: ${e.msg}`} />
                    ))}
                  </div>
                )}

                {/* Notes Textarea */}
                <textarea
                  placeholder="Describe additional physical findings"
                  value={draft?.physicalFindingsNote ?? ""}
                  onChange={(e) => updateDraft({ physicalFindingsNote: e.target.value })}
                  className="demo-field flex-1 min-h-0 bg-white rounded-[8px] px-[16px] py-[12px] text-[15px] text-[#0F100F] outline-none resize-none font-[DM_Sans]"
                />
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN (60%) — display:contents so its two sections
              become direct grid items ── */}
          <div className="contents">
            {/* Treatment — grid col 2 / row 1; height links with Chief
                Complaints (same grid row). */}
            <div data-module="treatment" className="flex flex-col min-w-0" style={{ gridColumn: 2, gridRow: 1 }}>
              <SectionHeader
                title="Treatment"
                menuItems={[
                  {
                    icon: <Sparkles size={14} />,
                    label: treatmentDemoSeeded ? "Clear sample medicines" : "Load sample medicines",
                    onClick: () => setTreatmentDemoSeeded((s) => !s),
                  },
                  {
                    icon: treatmentMode === "dropdown" ? <Type size={14} /> : <LayoutList size={14} />,
                    label: treatmentMode === "dropdown" ? "Switch to type mode" : "Switch to dropdown mode",
                    onClick: () => setTreatmentMode(treatmentMode === "dropdown" ? "type" : "dropdown"),
                  },
                  {
                    icon: <BookmarkPlus size={14} />,
                    label: "Save as template",
                    onClick: () => setShowSaveTreatmentTemplate(true),
                  },
                  {
                    icon: <FileDown size={14} />,
                    label: "Insert from template",
                    onClick: () => setShowInsertTreatmentTemplate(true),
                  },
                  {
                    icon: <Settings size={14} />,
                    label: "Manage Drug",
                    onClick: () => setShowManageDrug(true),
                  },
                ]}
              />

              <div className="flex-1 p-[6px]">
                <div className="rounded-[8px] bg-white [&>*:first-child]:rounded-t-[7px] [&>*:last-child]:rounded-b-[7px]" style={{ border: "1px solid #e7ebf0" }}>
                  <TreatmentAddRows
                    key={`tx-${clearKey}`}
                    mode={treatmentMode}
                    startingSerial={1}
                    demoSeeded={treatmentDemoSeeded}
                    drugs={libraries.drugs}
                    medications={savedMedications}
                    onChangeMedication={(id, patch) =>
                      setMedications((p) => p.map((m) => (m.id === id ? { ...m, ...patch } : m)))
                    }
                    onAddMedication={(data) =>
                      setMedications((p) => [...p, { id: newRowId(), ...data }])
                    }
                    onDeleteMedication={(id) => setMedications((p) => p.filter((m) => m.id !== id))}
                    onSeedMedications={(rows) =>
                      setMedications(rows.map((r) => ({ id: newRowId(), ...r })))
                    }
                  />
                  {incompleteMeds.length > 0 && (
                    <div className="flex flex-col gap-[2px] px-[6px] pb-[4px]">
                      {incompleteMeds.map((m) => (
                        <FieldError key={m.id} msg={`${m.medicine}: add a dose before completing.`} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Test + Advice — bottom 3/8 of right column, pairs with
                Physical Findings on the left. */}
            <div className="flex min-w-0 border-t border-[#c2c2c2]" style={{ gridColumn: 2, gridRow: 2 }}>
              {/* Test (2/3) */}
              <div data-module="investigation" className="w-2/3 flex flex-col border-r border-[#c2c2c2]">
                <SectionHeader
                  title="Investigation"
                  menuItems={[
                    {
                      icon: <FlaskConical size={14} />,
                      label: "Add test results",
                      onClick: () => setShowTestResults(true),
                    },
                    {
                      icon: <BookmarkPlus size={14} />,
                      label: "Save as template",
                      onClick: () => setShowSaveTestTemplate(true),
                    },
                    {
                      icon: <FileDown size={14} />,
                      label: "Insert from template",
                      onClick: () => setShowInsertTestTemplate(true),
                    },
                    {
                      icon: <Settings size={14} />,
                      label: "Manage test",
                      onClick: () => setShowManageTest(true),
                    },
                  ]}
                />
                <div className="flex-1 p-[6px]">
                  <div className="rounded-[8px] bg-white [&>*:first-child]:rounded-t-[7px] [&>*:last-child]:rounded-b-[7px]" style={{ border: "1px solid #e7ebf0" }}>
                    {savedTests.map((t, i) => (
                      <div
                        key={t.id}
                        className="demo-rowfocus flex items-center gap-[6px] px-[6px] h-[30px] bg-white border-b border-[#e7ebf0]"
                      >
                        <SerialBadge num={i + 1} />
                        <input
                          value={t.text}
                          onChange={(e) =>
                            setSavedTests((p) =>
                              p.map((r) => (r.id === t.id ? { ...r, text: e.target.value } : r)),
                            )
                          }
                          className="text-[14px] text-[#0F100F] flex-1 min-w-0 outline-none bg-transparent"
                        />
                        <X
                          size={13}
                          className="text-[#8c9198] hover:text-[#dc2626] transition-colors cursor-pointer shrink-0"
                          onClick={() => setSavedTests((p) => p.filter((_, j) => j !== i + 1))}
                        />
                      </div>
                    ))}
                    <SimpleAddRow
                      key={`test-${clearKey}`}
                      placeholder="Add test"
                      library={testLibrary}
                      panelId="tests-typeahead-panel"
                      serialNum={savedTests.length + 1}
                      onAdd={(v) => setSavedTests((p) => [...p, { id: newRowId(), text: v }])}
                    />
                  </div>
                </div>
              </div>

              {/* Advice (1/3) */}
              <div data-module="advice" className="w-1/3 flex flex-col">
                <SectionHeader
                  title="Advice"
                  menuItems={[
                    {
                      icon: <BookmarkPlus size={14} />,
                      label: "Save as template",
                      onClick: () => setShowSaveAdviceTemplate(true),
                    },
                    {
                      icon: <FileDown size={14} />,
                      label: "Insert from template",
                      onClick: () => setShowInsertAdviceTemplate(true),
                    },
                    {
                      icon: <Settings size={14} />,
                      label: "Manage advice",
                      onClick: () => setShowManageAdvice(true),
                    },
                  ]}
                />
                <div className="flex-1 p-[6px]">
                  <div className="rounded-[8px] bg-white [&>*:first-child]:rounded-t-[7px] [&>*:last-child]:rounded-b-[7px]" style={{ border: "1px solid #e7ebf0" }}>
                    {savedAdvice.map((a, i) => {
                      // Direction-aware default for free-text entries that
                      // don't have a real translation pair.
                      const DEFAULT_EN = "This is translated advice";
                      const DEFAULT_BN = "এটা ট্রান্সলেটেড উপদেশ";
                      const sourceIsBn = /[ঀ-৿]/.test(a.bn);
                      const fallback = sourceIsBn ? DEFAULT_EN : DEFAULT_BN;
                      const enText = a.en ?? fallback;
                      const showingEn = a.showEn;
                      const display = showingEn ? enText : a.bn;
                      const renderingBn = /[ঀ-৿]/.test(display);
                      return (
                        <ListRow key={a.id} serial={i + 1}>
                          <input
                            value={display}
                            onChange={(e) =>
                              setSavedAdvice((p) =>
                                p.map((r) =>
                                  r.id === a.id
                                    // Write back to whichever field is on screen —
                                    // the row shows `en` when toggled, `bn` otherwise.
                                    ? showingEn
                                      ? { ...r, en: e.target.value }
                                      : { ...r, bn: e.target.value }
                                    : r,
                                ),
                              )
                            }
                            title={display}
                            className={`text-[14px] text-[#0F100F] flex-1 min-w-0 outline-none bg-transparent ${
                              renderingBn ? "font-[Kalpurush]" : "font-[DM_Sans]"
                            }`}
                          />
                          <div className="flex items-center gap-[10px] shrink-0">
                            <Tooltip label="Remove">
                              <X
                                size={13}
                                className="text-[#8c9198] hover:text-[#dc2626] transition-colors cursor-pointer"
                                onClick={() => setSavedAdvice((p) => p.filter((r) => r.id !== a.id))}
                              />
                            </Tooltip>
                          </div>
                        </ListRow>
                      );
                    })}
                    <SimpleAddRow
                      key={`advice-${clearKey}`}
                      serialNum={savedAdvice.length + 1}
                      placeholder="Add advice"
                      library={adviceLibrary}
                      panelId="advice-typeahead-panel"
                      font="font-[Kalpurush]"
                      onAdd={(v, t) => setSavedAdvice((p) => [...p, { id: newRowId(), bn: v, en: t, showEn: false }])}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ CLINICAL SIGNS MODAL ═══ */}
        {showIntakeV2 && (
          <IntakeV2Modal
            onClose={() => setShowIntakeV2(false)}
            onSubmit={(summary) => setSummaryText(summary)}
          />
        )}
        {showHistoryIntake && (
          <HistoryIntakeModal
            initial={historyIntakeState}
            onClose={() => setShowHistoryIntake(false)}
            onSubmit={(items, state) => {
              setSavedHistory(items.map((it) => ({ id: newRowId(), ...it })));
              setHistoryIntakeState(state);
            }}
          />
        )}
        {showTestResults && <AddTestResultsModal
            onClose={() => setShowTestResults(false)}
            testList={savedTests.map((t) => t.text)}
            results={draft?.testResults ?? EMPTY_TEST_RESULTS}
            onChangeResults={(rows) => updateDraft({ testResults: rows })}
          />}
        {showManageAdvice && (
          <ManageAdviceModal
            onClose={() => setShowManageAdvice(false)}
            items={libraries.advice}
            onAdd={(a) => libAdd("advice", a)}
            onEdit={(id, patch) => libEdit("advice", id, patch)}
            onDelete={(id) => libDelete("advice", id)}
          />
        )}
        {showSaveAdviceTemplate && (
          <SaveAdviceTemplateModal
            advices={draftAdvicesForTemplate}
            onClose={() => setShowSaveAdviceTemplate(false)}
            onSave={(title) => {
              const advice = draft?.advice ?? [];
              addTemplate("advice", { id: newRowId(), title, advice });
              setShowSaveAdviceTemplate(false);
              setToast({
                title: "Template saved",
                description: `"${title}" saved with ${advice.length} advice ${advice.length === 1 ? "entry" : "entries"}.`,
              });
            }}
          />
        )}
        {showManageDiagnosis && (
          <ManageDiagnosisModal
            onClose={() => setShowManageDiagnosis(false)}
            items={libraries.diagnoses}
            onAdd={(d) => libAdd("diagnoses", d)}
            onEdit={(id, patch) => libEdit("diagnoses", id, patch)}
            onDelete={(id) => libDelete("diagnoses", id)}
          />
        )}
        {showManageTest && (
          <ManageTestModal
            onClose={() => setShowManageTest(false)}
            items={libraries.tests}
            onAdd={(t) => libAdd("tests", t)}
            onEdit={(id, patch) => libEdit("tests", id, patch)}
            onDelete={(id) => libDelete("tests", id)}
          />
        )}
        {showSaveTestTemplate && (
          <SaveTestTemplateModal
            tests={draftTestsForTemplate}
            onClose={() => setShowSaveTestTemplate(false)}
            onSave={(title) => {
              const tests = draft?.tests ?? [];
              addTemplate("test", { id: newRowId(), title, tests });
              setShowSaveTestTemplate(false);
              setToast({
                title: "Template saved",
                description: `"${title}" saved with ${tests.length} ${tests.length === 1 ? "test" : "tests"}.`,
              });
            }}
          />
        )}
        {showInsertTreatmentTemplate && (
          <InsertTreatmentTemplateModal
            templates={templates.treatment}
            onClose={() => setShowInsertTreatmentTemplate(false)}
            onInsert={(t) => {
              const medications = reId(t.medications);
              updateDraft({ medications });
              setShowInsertTreatmentTemplate(false);
              setToast({
                title: "Template inserted",
                description: `${medications.length} ${medications.length === 1 ? "medicine" : "medicines"} from "${t.title}" added to the prescription.`,
              });
            }}
            onOpenManage={() => { /* gateway to Manage Templates page */ }}
          />
        )}
        {showManageDrug && (
          <ManageDrugModal
            onClose={() => setShowManageDrug(false)}
            items={libraries.drugs}
            onAdd={(d) => libAdd("drugs", d)}
            onEdit={(id, patch) => libEdit("drugs", id, patch)}
            onDelete={(id) => libDelete("drugs", id)}
          />
        )}
        {showSaveTreatmentTemplate && (
          <SaveTreatmentTemplateModal
            medicines={draftMedicinesForTemplate}
            onClose={() => setShowSaveTreatmentTemplate(false)}
            onSave={(title) => {
              const medications = draft?.medications ?? [];
              addTemplate("treatment", { id: newRowId(), title, medications });
              setShowSaveTreatmentTemplate(false);
              setToast({
                title: "Template saved",
                description: `"${title}" saved with ${medications.length} ${medications.length === 1 ? "medicine" : "medicines"}.`,
              });
            }}
          />
        )}
        {showSaveOverallTemplate && (
          <SaveOverallTemplateModal
            medicines={draftMedicinesForTemplate}
            tests={draftTestsForTemplate}
            advices={draftAdvicesForTemplate}
            physical={draftPhysicalForTemplate}
            diagnoses={(draft?.diagnoses ?? []).map((d) => ({ id: d.id, text: d.text }))}
            drugHistory={(draft?.drugHistory ?? []).map((d) => ({ id: d.id, text: d.text }))}
            notes={noteText.trim() ? [{ id: "note", text: noteText }] : []}
            followUp={draftFollowUpForTemplate}
            chiefComplaints={(draft?.complaints ?? []).map((c) => ({ id: c.id, text: c.text, remark: c.remark }))}
            chiefHistory={(draft?.history ?? []).map((h) => ({ id: h.id, text: h.text, remark: h.remark }))}
            chiefSummary={summaryText}
            onClose={() => setShowSaveOverallTemplate(false)}
            onSave={(title) => {
              const payload = capturePayload();
              addTemplate("overall", { id: newRowId(), title, payload });
              setShowSaveOverallTemplate(false);
              setToast({
                title: "Overall template saved",
                description: `"${title}" saved with ${countPayload(payload)} entries across the prescription.`,
              });
            }}
          />
        )}
        {showPreview && draft && (
          <PrescriptionPreviewModal
            rx={draft}
            patient={patient}
            onClose={() => setShowPreview(false)}
          />
        )}
        {showPatientDetails && (
          <PatientDetailsModal
            patient={patient}
            onClose={() => setShowPatientDetails(false)}
          />
        )}
        {showInsertOverallTemplate && (
          <InsertOverallTemplateModal
            templates={templates.overall}
            onClose={() => setShowInsertOverallTemplate(false)}
            onInsert={(t) => {
              // Overall replaces all nine sections. Vitals and follow-up are
              // overwritten by the template's values (DR-027).
              const pl = t.payload;
              updateDraft({
                complaints: reId(pl.complaints),
                history: reId(pl.history),
                drugHistory: reId(pl.drugHistory),
                vitals: { ...pl.vitals },
                diagnoses: reId(pl.diagnoses),
                medications: reId(pl.medications),
                tests: reId(pl.tests),
                advice: reId(pl.advice),
                followUp: { ...pl.followUp },
                referTo: pl.referTo,
              });
              setShowInsertOverallTemplate(false);
              const total = countPayload(pl);
              setToast({
                title: "Template inserted",
                description: `${total} item${total === 1 ? "" : "s"} from "${t.title}" added to the prescription.`,
              });
            }}
            onOpenManage={() => { /* gateway to manage overall templates page */ }}
          />
        )}
        {showInsertTestTemplate && (
          <InsertTestTemplateModal
            templates={templates.test}
            onClose={() => setShowInsertTestTemplate(false)}
            onInsert={(t) => {
              const tests = reId(t.tests);
              updateDraft({ tests });
              setShowInsertTestTemplate(false);
              setToast({
                title: "Template inserted",
                description: `${tests.length} ${tests.length === 1 ? "test" : "tests"} from "${t.title}" added to the prescription.`,
              });
            }}
            onOpenManage={() => { /* gateway to Manage Templates page */ }}
          />
        )}
        {showInsertAdviceTemplate && (
          <InsertTemplateModal
            templates={templates.advice}
            onClose={() => setShowInsertAdviceTemplate(false)}
            onInsert={(t) => {
              const advice = reId(t.advice);
              updateDraft({ advice });
              setShowInsertAdviceTemplate(false);
              setToast({
                title: "Template inserted",
                description: `${advice.length} advice ${advice.length === 1 ? "entry" : "entries"} from "${t.title}" added to the prescription.`,
              });
            }}
            onOpenManage={() => {
              // design mockup: navigate to Manage Templates page (separate menu/route)
            }}
          />
        )}
        {toast && <Toast title={toast.title} description={toast.description} onClose={() => setToast(null)} />}

        {/* ═══ BOTTOM ROW (full width) — 2/10 of the page = 20%, so
             it's always shorter than the 2nd band above (30%) and the
             1st band above that (50%). Locked-in 1st > 2nd > 3rd. */}
        <div className="flex flex-1 border-t border-[#c2c2c2]">

          {/* Diagnosis (40%) */}
          <div data-module="diagnosis" className="w-[40%] flex flex-col border-r border-[#c2c2c2]">
            <SectionHeader
              title="Diagnosis"
              menuItems={[
                {
                  icon: <Settings size={14} />,
                  label: "Manage diagnosis",
                  onClick: () => setShowManageDiagnosis(true),
                },
              ]}
            />
            <div className="flex-1 p-[6px]">
              <div className="rounded-[8px] bg-white [&>*:first-child]:rounded-t-[7px] [&>*:last-child]:rounded-b-[7px]" style={{ border: "1px solid #e7ebf0" }}>
                {savedDiagnoses.map((d, i) => (
                  <ListRow key={d.id} serial={i + 1}>
                    <input
                      value={d.text}
                      onChange={(e) =>
                        setSavedDiagnoses((p) =>
                          p.map((r) => (r.id === d.id ? { ...r, text: e.target.value } : r)),
                        )
                      }
                      className="text-[14px] text-[#0F100F] flex-1 min-w-0 outline-none bg-transparent"
                    />
                    <X
                      size={13}
                      className="text-[#8c9198] hover:text-[#dc2626] transition-colors cursor-pointer shrink-0"
                      onClick={() => setSavedDiagnoses((p) => p.filter((r) => r.id !== d.id))}
                    />
                  </ListRow>
                ))}
                <SimpleAddRow
                  key={`dx-${clearKey}`}
                  serialNum={savedDiagnoses.length + 1}
                  placeholder="Add diagnosis"
                  library={diagnosisLibrary}
                  panelId="diagnosis-typeahead-panel"
                  onAdd={(v) => setSavedDiagnoses((p) => [...p, { id: newRowId(), text: v }])}
                />
              </div>
            </div>
          </div>

          {/* Drug History (20%) */}
          <div data-module="drug-history" className="w-[20%] flex flex-col border-r border-[#c2c2c2]">
            <SectionHeader title="Drug History" />
            <div className="flex-1 p-[6px]">
              <div className="rounded-[8px] bg-white [&>*:first-child]:rounded-t-[7px] [&>*:last-child]:rounded-b-[7px]" style={{ border: "1px solid #e7ebf0" }}>
                {savedDrugHistory.map((d, i) => (
                  <ListRow key={d.id} serial={i + 1}>
                    <input
                      value={d.text}
                      onChange={(e) =>
                        setSavedDrugHistory((p) =>
                          p.map((r) => (r.id === d.id ? { ...r, text: e.target.value } : r)),
                        )
                      }
                      className="text-[14px] text-[#0F100F] flex-1 min-w-0 outline-none bg-transparent"
                    />
                    <X
                      size={13}
                      className="text-[#8c9198] hover:text-[#dc2626] transition-colors cursor-pointer shrink-0"
                      onClick={() => setSavedDrugHistory((p) => p.filter((r) => r.id !== d.id))}
                    />
                  </ListRow>
                ))}
                <SimpleAddRow
                  key={`dh-${clearKey}`}
                  serialNum={savedDrugHistory.length + 1}
                  placeholder="Add drug history"
                  library={DRUG_HISTORY_LIBRARY}
                  panelId="drughistory-typeahead-panel"
                  onAdd={(v) => setSavedDrugHistory((p) => [...p, { id: newRowId(), text: v }])}
                />
              </div>
            </div>
          </div>

          {/* Note (20%) */}
          <div className="w-[20%] flex flex-col border-r border-[#c2c2c2]">
            <SectionHeader title="Note" />
            <div className="flex-1 p-[6px] min-h-0">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Write note"
                className={`demo-field w-full h-full bg-white rounded-[8px] px-[14px] py-[10px] text-[15px] text-[#0F100F] outline-none resize-none ${
                  /[ঀ-৿]/.test(noteText) ? "font-[Kalpurush]" : "font-[DM_Sans]"
                }`}
              />
            </div>
          </div>

          {/* Follow Up & Refer (20%) */}
          <div data-module="follow-up" className="w-[20%] flex flex-col">
            <SectionHeader title="Follow Up & Refer" />

            {/* Compact (≤1399px): single-tab UI — switches between
                "Follow up" and "Refer" instead of stacking both. */}
            {isCompactDisplay ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Tab strip */}
                <div className="flex items-center gap-[2px] px-[14px] pt-[0px] shrink-0">
                  {(["follow", "refer"] as const).map((t) => {
                    const isActive = followRefTab === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setFollowRefTab(t)}
                        className="px-[10px] pt-[3px] cursor-pointer bg-transparent border-none"
                      >
                        {/* Underline lives on the inner span so it matches
                            the text width, not the button's padding box. */}
                        <span
                          className="inline-block text-[12px] font-semibold pb-[2px]"
                          style={{
                            color: isActive ? "#3fa216" : "#64748b",
                            borderBottom: isActive
                              ? "1.5px solid rgba(63, 162, 22, 0.45)"
                              : "1.5px solid transparent",
                          }}
                        >
                          {t === "follow" ? "Follow up" : "Refer"}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Tab content */}
                <div className="flex-1 px-[14px] py-[10px] overflow-hidden">
                  {followRefTab === "follow" ? (
                    <FollowUpControls
                      mode={followUpMode}
                      setMode={setFollowUpMode}
                      amount={followUpAmount}
                      setAmount={setFollowUpAmount}
                      unit={followUpUnit}
                      setUnit={setFollowUpUnit}
                      unitOpen={followUpUnitOpen}
                      setUnitOpen={setFollowUpUnitOpen}
                      unitRef={followUpUnitRef}
                      date={followUpDate}
                      setDate={setFollowUpDate}
                    />
                  ) : (
                    <ReferToInput
                      value={referToText}
                      onChange={setReferToText}
                      focused={referToFocused}
                      setFocused={setReferToFocused}
                    />
                  )}
                </div>
              </div>
            ) : (
            <div className="flex-1 px-[14px] py-[10px] flex flex-col gap-[6px] overflow-hidden">
              {/* Follow Up */}
              <div>
                <p className="text-[15px] font-medium text-[#0F100F] mb-[6px]">
                  Follow Up
                </p>
                <FollowUpControls
                  mode={followUpMode}
                  setMode={setFollowUpMode}
                  amount={followUpAmount}
                  setAmount={setFollowUpAmount}
                  unit={followUpUnit}
                  setUnit={setFollowUpUnit}
                  unitOpen={followUpUnitOpen}
                  setUnitOpen={setFollowUpUnitOpen}
                  unitRef={followUpUnitRef}
                  date={followUpDate}
                  setDate={setFollowUpDate}
                />
              </div>

              <div className="h-px bg-[#f1f5f9]" />

              {/* Refer */}
              <div>
                <p className="text-[15px] font-medium text-[#0F100F] mb-[6px]">
                  Refer To
                </p>
                <ReferToInput
                  value={referToText}
                  onChange={setReferToText}
                  focused={referToFocused}
                  setFocused={setReferToFocused}
                />
              </div>
            </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
