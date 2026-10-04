/* Deterministic drivers for engine tests. Engine-agnostic so the regression fixture can be produced by another engine build. */

export interface EngineLike<S> {
  reduce: (s: S, a: { type: string; [k: string]: unknown }) => S;
}

type AnyState = {
  phase: string;
  screen: string;
  card: { choices: { id: string }[]; payload: { t: string } } | null;
};

/** Plays one roll: ROLL → REVEAL → STEP until a card (or anything else) shows up. */
export function rollAndMove<S extends AnyState>(e: EngineLike<S>, s0: S): S {
  let s = e.reduce(s0, { type: "ROLL" });
  s = e.reduce(s, { type: "REVEAL" });
  let guard = 0;
  while (s.phase === "moving" && guard++ < 20) s = e.reduce(s, { type: "STEP" });
  return s;
}

/** Answers cards with `pick` until the phase leaves "card". */
export function answer<S extends AnyState>(e: EngineLike<S>, s0: S, pick: (s: S) => string): S {
  let s = s0;
  let guard = 0;
  while (s.phase === "card" && s.card && guard++ < 20) s = e.reduce(s, { type: "CHOICE", id: pick(s) });
  return s;
}

export const firstChoice = (s: AnyState): string => s.card!.choices[0]!.id;

/** Canonical JSON (sorted keys) so snapshots don't depend on object key order. */
export function canonical(v: unknown): string {
  return JSON.stringify(v, (_k, val) => {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      return Object.fromEntries(Object.keys(val).sort().map((k) => [k, (val as Record<string, unknown>)[k]]));
    }
    return val;
  });
}

/** FNV-1a 32-bit hash, enough to detect any drift between two engine builds. */
export function hash(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/**
 * Plays a normal game with a fixed policy (always the first choice, READY on pass, BREATHE when broke)
 * and returns a hash after every action, plus the final state. `strip` removes fields absent from the baseline engine.
 */
export function playNormal<S extends AnyState>(
  e: EngineLike<S>,
  start: S,
  actions: number,
  strip: (s: S) => unknown = (s) => s,
): { hashes: string[]; final: unknown } {
  let s = start;
  const hashes: string[] = [];
  for (let i = 0; i < actions; i++) {
    if (s.phase === "win" || s.screen === "win") break;
    if (s.phase === "card" && s.card) s = e.reduce(s, { type: "CHOICE", id: firstChoice(s) });
    else if (s.phase === "idle") s = e.reduce(s, { type: "ROLL" });
    else if (s.phase === "rolling") s = e.reduce(s, { type: "REVEAL" });
    else if (s.phase === "moving") s = e.reduce(s, { type: "STEP" });
    else if (s.phase === "pass") s = e.reduce(s, { type: "READY" });
    else if (s.phase === "broke") s = e.reduce(s, { type: "BREATHE" });
    else break;
    hashes.push(hash(canonical(strip(s))));
  }
  return { hashes, final: strip(s) };
}

export const REGRESSION_SEEDS = [1, 7, 42, 99, 1234, 2026, 31337, 424242];
export const REGRESSION_ACTIONS = 400;
