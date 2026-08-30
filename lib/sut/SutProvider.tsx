"use client";

// SUT state provider.
//
// State initializes to the seed fixture during render and hydrates from
// localStorage in an effect on mount. Reading localStorage in a useState
// initializer would make the server and client render different trees and
// reintroduce the hydration mismatch fixed under DR-022 — do not do it.

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { SutState } from "./types";
import { createSeedState } from "./seed";
import { load, save } from "./persistence";

type SutContextValue = {
  state: SutState;
  setState: Dispatch<SetStateAction<SutState>>;
};

const SutContext = createContext<SutContextValue | null>(null);

export function SutProvider({
  token,
  children,
}: {
  token: string;
  children: ReactNode;
}) {
  // Seed during render — identical on server and client.
  const [state, setState] = useState<SutState>(createSeedState);

  // Gates persistence until the stored state for THIS token has been read, so
  // the seed never overwrites a returning candidate's data on first paint.
  // Tracks the token it hydrated, not a bare boolean: on a token change the
  // persist effect must not write the previous token's state under the new key.
  const hydratedFor = useRef<string | null>(null);

  useEffect(() => {
    const stored = load(token);
    setState(stored ?? createSeedState());
    hydratedFor.current = token;
  }, [token]);

  useEffect(() => {
    if (hydratedFor.current !== token) return;
    save(token, state);
  }, [token, state]);

  return (
    <SutContext.Provider value={{ state, setState }}>
      {children}
    </SutContext.Provider>
  );
}

export function useSut(): SutContextValue {
  const ctx = useContext(SutContext);
  if (ctx === null) {
    throw new Error("useSut must be used inside a SutProvider");
  }
  return ctx;
}
