/**
 * Metro run definition (refacto batch 3). The engine still handles the METRO action itself (doMetro, awardXp):
 * these functions mirror it so batch 5 can switch the engine to the registry with an identical fingerprint.
 * The UI ("offer" and "run") is code-split: nothing from ui.tsx, the skins or the audio is in the main bundle.
 */
import { tl } from "@/game/text";
import type { MinigameDefinition, SkillAward } from "../types";
import { METRO_LIVES, metroOfferTurn, metroReward } from "./logic";

export interface MetroResult {
  lives: number;
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
    const lives = typeof raw === "object" && raw !== null ? (raw as { lives?: unknown }).lives : raw;
    return { lives: Math.max(0, Math.min(METRO_LIVES, Math.floor(Number(lives) || 0))) };
  },
  cash: (r) => metroReward(r.lives),
  skillKeys: (r) => {
    const out: SkillAward[] = [{ key: "runner.finish" }];
    if (r.lives > 0) out.push({ key: "runner.win" });
    if (r.lives > 0) out.push({ key: "runner.perLife", times: r.lives });
    if (r.lives === METRO_LIVES) out.push({ key: "runner.noHit" });
    return out;
  },
  logLine: (r, cash) =>
    r === "decline" ? "Metro run: not this time" : cash > 0 ? tl("Metro run: +{amount}", { amount: `$${Math.round(cash).toLocaleString("en-US")}` /* = engine money() */ }) : "Metro run: missed",
  feedsGig: true,
  parts: {
    offer: () => ui().then((m) => m.MetroOffer),
    run: () => ui().then((m) => m.MetroRun),
  },
};
