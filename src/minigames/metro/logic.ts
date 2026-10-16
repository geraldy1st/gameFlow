/**
 * "Metro run" — optional 3-lane runner offered every 10 of a player's own turns (spec: Geraldy, 09/10/2026).
 *
 * Pure module, no DOM: the offer rule, the reward, and the runner itself (lanes, obstacles, distance, lives,
 * outcome). The canvas UI (components/game/boite/MetroRun.tsx) only renders this state and feeds it actions and
 * time; the engine only reads `metroOfferTurn` / `metroReward` and records the result (`METRO` action).
 *
 * Only type imports from engine.ts, so engine.ts can import this module without a runtime cycle.
 */
import type { GameState } from "@/game/engine";

/* ------------------------------------------------------------------ offer & reward */

/** An offer every 10 of a player's own finished turns (Player.turns), i.e. at their turns 10, 20, 30... */
export const METRO_EVERY = 10;
export const METRO_LIVES = 3;
/** v6: gold coins on the street, $5 each, kept even on a failed run. 53 on the validated level; the engine never
 *  credits more (MetroResult.coins is clamped to 0..METRO_MAX_COINS). */
export const METRO_MAX_COINS = 53;
export const METRO_COIN_VALUE = 5;
const METRO_REWARD_FULL = 500;
const METRO_REWARD_HURT = 250;
/**
 * Solo only: when the turn after a multiple of 10 opens on "broke" or on a rest card, the offer waits for the next
 * idle start, at most this many turns later; after that it is simply gone (an old save loaded at turn 57 is not
 * offered the run of turn 50).
 */
const SOLO_GRACE = 2;

type OfferState = Pick<GameState, "screen" | "phase" | "players" | "current" | "training" | "intro"> & {
  practice?: boolean;
};

/**
 * The multiple of 10 of the active player's own turns whose metro offer is due right now, or null.
 *
 * Counted on the player's own turns (Player.turns, decided by Geraldy 09/10/2026): an offer after turns 10, 20,
 * 30... `Player.turns` counts the turns the player has started (the current one included), so turn N is over once
 * the engine opened turn N + 1 (turns === N + 1), phase "idle" (before the first roll). The game is solo only since
 * v3 (the same-screen 2-player mode was removed); the per-player marker stays ready for online play.
 * Never during the tutorial / practice games, on a card, broke, win, or after this player answered the offer for N
 * (`Player.metroTurn`, optional: absent in old saves = never offered).
 */
export function metroOfferTurn(s: OfferState): number | null {
  if (s.screen !== "play" || s.practice === true || s.training || s.intro || !s.players?.length) return null;
  const p = s.players[s.current];
  if (!p || typeof p.turns !== "number") return null;
  const done = typeof p.metroTurn === "number" ? p.metroTurn : 0;
  if (s.phase !== "idle") return null;
  const ended = p.turns - 1;
  const n = ended - (ended % METRO_EVERY);
  return n > 0 && ended - n <= SOLO_GRACE && done < n ? n : null;
}

/** Cash for a finished run: 500 with no life lost, 250 after a hit, nothing on a failed run. */
export function metroReward(lives: number): number {
  const l = Math.max(0, Math.min(METRO_LIVES, Math.floor(lives)));
  if (l <= 0) return 0;
  return l === METRO_LIVES ? METRO_REWARD_FULL : METRO_REWARD_HURT;
}

/** Coins as the engine credits them: an integer 0..53 (anything else is clamped; NaN / non-numbers count 0). */
export function metroCoins(raw: unknown): number {
  const n = typeof raw === "number" ? raw : typeof raw === "string" && raw.trim() !== "" ? Number(raw) : NaN;
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(METRO_MAX_COINS, Math.floor(n)));
}

/* The runner itself (lanes, obstacles, coins, physics, bots) lives in ./runner.ts, imported by the lazy UI chunk
 * only (v6.1, Crypto: nothing added to the first screen). */
