// localStorage persistence for SUT state.
//
// DR-005 / DR-008: candidate-scoped, disposable, per-device. One JSON blob per
// token. Never reads or writes Postgres, never fetches. A failure to read is
// always recoverable — the caller falls back to the seed fixture.

import type { SutState } from "./types";

const KEY_PREFIX = "qa-assess:sut:";

// Bumped whenever the persisted shape changes incompatibly. A payload written
// under a different version is discarded and the caller reseeds — SUT state is
// disposable per-candidate state (DR-005), so migration is not worth its cost
// (DR-025). Version 2 introduced stable ids on draft list rows; version 3
// replaced the lossy template display shapes with TemplatePayload (DR-027).
const SCHEMA_VERSION = 3;

type Envelope = { version: number; state: SutState };

function keyFor(token: string): string {
  return `${KEY_PREFIX}${token}`;
}

/**
 * Reads the stored state for a token. Returns null when the key is absent,
 * the value does not parse, or localStorage is unavailable (private mode,
 * blocked site data, SSR). Never throws.
 */
export function load(token: string): SutState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(keyFor(token));
    if (raw === null) return null;
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object") return null;
    // Anything without the current version stamp predates the id-bearing list
    // rows and would crash on read. Discard it; the caller falls back to seed.
    const env = parsed as Partial<Envelope>;
    if (env.version !== SCHEMA_VERSION || typeof env.state !== "object" || env.state === null) {
      return null;
    }
    return env.state as SutState;
  } catch {
    return null;
  }
}

// Debounce is per-token: a pending write for one candidate must not be
// cancelled by a write for another.
const timers = new Map<string, ReturnType<typeof setTimeout>>();

const DEBOUNCE_MS = 400;

/**
 * Persists state for a token, debounced at 400ms. Writing on every keystroke
 * produces input lag that reads as a defect and is not in the bug key.
 */
export function save(token: string, state: SutState): void {
  if (typeof window === "undefined") return;
  const existing = timers.get(token);
  if (existing !== undefined) clearTimeout(existing);
  timers.set(
    token,
    setTimeout(() => {
      timers.delete(token);
      try {
        const envelope: Envelope = { version: SCHEMA_VERSION, state };
        window.localStorage.setItem(keyFor(token), JSON.stringify(envelope));
      } catch {
        // Quota exceeded or storage blocked — the SUT keeps working from
        // in-memory state. Losing persistence must never break the screen.
      }
    }, DEBOUNCE_MS),
  );
}
