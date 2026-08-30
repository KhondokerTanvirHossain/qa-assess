"use client";

// SUT state provider.
//
// State initializes to the seed fixture during render and hydrates from
// localStorage in an effect on mount. Reading localStorage in a useState
// initializer would make the server and client render different trees and
// reintroduce the hydration mismatch fixed under DR-022 — do not do it.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { Prescription, SutState } from "./types";
import { createSeedState } from "./seed";
import { load, save } from "./persistence";

type SutContextValue = {
  state: SutState;
  setState: Dispatch<SetStateAction<SutState>>;
  /** Draft for the currently selected patient, or null when none is loaded. */
  draft: Prescription | null;
  /** True when the working draft differs from the persisted copy. */
  isDirty: boolean;
  /** Mutates the in-memory draft. Does NOT persist — only saveDraft does. */
  updateDraft: (patch: Partial<Prescription>) => void;
  /** Commits the working draft to persisted state. */
  saveDraft: () => void;
  /** Creates a new draft for the patient, or restores the stored one. */
  loadDraftFor: (patientId: string) => void;
};

const SutContext = createContext<SutContextValue | null>(null);

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function createDraft(patientId: string): Prescription {
  return {
    id: `rx-${patientId}-${Date.now()}`,
    patientId,
    visitType: "",
    visitNumber: 1,
    date: today(),
    fee: "",
    vitals: {
      pulse: "",
      bp: "",
      temperature: "",
      respRate: "",
      spo2: "",
      weight: "",
      height: "",
    },
    physicalFindingsNote: "",
    complaints: [],
    history: [],
    drugHistory: [],
    diagnoses: [],
    medications: [],
    tests: [],
    advice: [],
    followUp: { mode: "After", amount: "7", unit: "Days", date: "" },
    referTo: "",
    status: "draft",
    completedAt: null,
  };
}

export function SutProvider({
  token,
  children,
}: {
  token: string;
  children: ReactNode;
}) {
  // Seed during render — identical on server and client.
  const [state, setState] = useState<SutState>(createSeedState);

  // The working draft lives outside `state` on purpose. Persistence runs off
  // `state`, so holding the draft here is what makes edits non-persisting:
  // updateDraft touches only this, and saveDraft is the single path that
  // folds it into `state` and therefore into localStorage.
  const [draft, setDraft] = useState<Prescription | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Gates persistence until the stored state for THIS token has been read, so
  // the seed never overwrites a returning candidate's data on first paint.
  // Tracks the token it hydrated, not a bare boolean: on a token change the
  // persist effect must not write the previous token's state under the new key.
  const hydratedFor = useRef<string | null>(null);

  useEffect(() => {
    const stored = load(token);
    setState(stored ?? createSeedState());
    setDraft(null);
    setIsDirty(false);
    hydratedFor.current = token;
  }, [token]);

  useEffect(() => {
    if (hydratedFor.current !== token) return;
    save(token, state);
  }, [token, state]);

  // Mirrors `state` so loadDraftFor can read the stored draft without taking a
  // stale closure and without calling setDraft from inside a setState updater
  // (which React may invoke more than once).
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const loadDraftFor = useCallback((patientId: string) => {
    const stored = stateRef.current.prescriptions[patientId]?.draft ?? null;
    setDraft(stored ?? createDraft(patientId));
    setIsDirty(false);
  }, []);

  const updateDraft = useCallback((patch: Partial<Prescription>) => {
    setDraft((prev) => (prev === null ? prev : { ...prev, ...patch }));
    setIsDirty(true);
  }, []);

  const draftRef = useRef(draft);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const saveDraft = useCallback(() => {
    const current = draftRef.current;
    if (current === null) return;
    setState((prev) => ({
      ...prev,
      prescriptions: {
        ...prev.prescriptions,
        [current.patientId]: {
          draft: current,
          completed: prev.prescriptions[current.patientId]?.completed ?? [],
        },
      },
    }));
    setIsDirty(false);
  }, []);

  const value = useMemo<SutContextValue>(
    () => ({ state, setState, draft, isDirty, updateDraft, saveDraft, loadDraftFor }),
    [state, draft, isDirty, updateDraft, saveDraft, loadDraftFor],
  );

  return <SutContext.Provider value={value}>{children}</SutContext.Provider>;
}

export function useSut(): SutContextValue {
  const ctx = useContext(SutContext);
  if (ctx === null) {
    throw new Error("useSut must be used inside a SutProvider");
  }
  return ctx;
}
