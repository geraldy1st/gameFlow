/**
 * Metro run definition (refacto batch 3; batch 5: the engine plays it through the generic MINIGAME action, METRO
 * is an alias). Must stay bit-identical to the old doMetro / awardXp branch (engine-fingerprint.test.ts).
 * The UI ("offer" and "run") is code-split: nothing from ui.tsx, the skins or the audio is in the main bundle.
 */
import { moneyText } from "@/game/minigame-rules";
import { tl } from "@/game/text";
import type { MinigameDefinition, SkillAward } from "../types";
import { METRO_COIN_VALUE, METRO_LIVES, metroCoins, metroOfferTurn, metroReward } from "./logic";

export interface MetroResult {
  lives: number;
  /** v6.1: coins picked up, an integer 0..53 ($5 each, kept on a failed run). 0 for the old METRO action. */
  coins: number;
}

const ui = () => import("./ui");

export const METRO_MINIGAME: MinigameDefinition<MetroResult> = {
  id: "metro",
  name: "Metro run",
  note: "Every 10 turns · $250 to $500",
  icon: "metro",
  entry: "offer",
  isDue: (s) => metroOfferTurn(s) !== null,
  sanitize: (raw) => {
    const obj = typeof raw === "object" && raw !== null ? (raw as { lives?: unknown; coins?: unknown }) : null;
    const lives = obj ? obj.lives : raw;
    return { lives: Math.max(0, Math.min(METRO_LIVES, Math.floor(Number(lives) || 0))), coins: metroCoins(obj?.coins) };
  },
  // Credited once per offer: the engine only pays while the offer is due, and the answer moves the marker.
  cash: (r) => metroReward(r.lives) + r.coins * METRO_COIN_VALUE,
  skillKeys: (r) => {
    const out: SkillAward[] = [{ key: "runner.finish" }];
    if (r.lives > 0) out.push({ key: "runner.win" });
    if (r.lives > 0) out.push({ key: "runner.perLife", times: r.lives, farm: false });
    if (r.lives === METRO_LIVES) out.push({ key: "runner.noHit" });
    return out;
  },
  logLine: (r, cash) =>
    r === "decline" ? "Metro run: not this time" : cash > 0 ? tl("Metro run: +{amount}", { amount: moneyText(cash) }) : "Metro run: missed",
  feedsGig: true,
  canDecline: true,
  markerValue: (s) => metroOfferTurn(s) ?? 0,
  legacyMarker: "metroTurn",
  parts: {
    offer: () => ui().then((m) => m.MetroOffer),
    run: () => ui().then((m) => m.MetroRun),
  },
};
