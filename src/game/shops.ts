/**
 * GameFlow v3 — shops that open with progression (Activities) and the data-driven goods (Day › Goods).
 * Pure: the caller passes the player's progress, so this file never imports the engine.
 */
import { GOODS, SHOPS, type GoodDef, type ShopDef, type Unlock } from "./tuning";

export interface Progress {
  /** The player's own turns. */
  turns: number;
  /** Passive income $/mo. */
  passive: number;
  /** Table level (2 = Gate crossed). */
  level: number;
  /** HUD experience level. */
  xpLevel: number;
  /** Reputation: every threshold × (1 − cut). */
  cut: number;
}

export interface UnlockState {
  open: boolean;
  /** Threshold after the Reputation cut (0 for "start"). */
  need: number;
  have: number;
  kind: Unlock["kind"];
}

export function unlockState(u: Unlock, pr: Progress): UnlockState {
  if (u.kind === "start") return { open: true, need: 0, have: 0, kind: u.kind };
  // The table level is not shortened by Reputation (it is the Gate itself).
  const need = u.kind === "level" ? u.n : Math.max(1, Math.ceil(u.n * (1 - pr.cut)));
  const have = u.kind === "turn" ? pr.turns : u.kind === "passive" ? pr.passive : u.kind === "level" ? pr.level : pr.xpLevel;
  return { open: have >= need, need, have, kind: u.kind };
}

/** English condition text (i18n key + vars) for a closed shop. */
export function unlockText(st: UnlockState): { k: string; v: Record<string, string> } {
  if (st.kind === "turn") return { k: "Opens at turn {n}", v: { n: String(st.need) } };
  if (st.kind === "passive") return { k: "Opens at {n}/mo passive income", v: { n: `$${st.need.toLocaleString("en-US")}` } };
  if (st.kind === "level") return { k: "Opens once the Gate is crossed", v: {} };
  if (st.kind === "xp") return { k: "Opens at experience level {n}", v: { n: String(st.need) } };
  return { k: "Open", v: {} };
}

export function goodById(id: string): GoodDef | undefined {
  return GOODS.find((g) => g.id === id);
}

/** The shop that sells a good. */
export function shopOfGood(id: string): ShopDef | undefined {
  return SHOPS.find((s) => Array.isArray(s.sells) && s.sells.includes(id));
}
