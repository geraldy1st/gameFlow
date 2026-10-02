import { FORTUNE_CASH, PASSIVE_WIN, VENTURE_GOAL } from "./data";
import { statement, type Player } from "./engine";

export const TROPHY_KEY = "gameflow-trophies-v1";

export interface TrophyPeak {
  cash: number;
  passive: number;
}

export const TROPHIES = [
  { id: "harbor", art: "/game/trophies/harbor.jpg", name: "First light", hint: "Hold $10,000 cash." },
  { id: "beach", art: "/game/trophies/beach.jpg", name: "Warm tide", hint: "Hold $50,000 cash." },
  { id: "cliffs", art: "/game/trophies/cliffs.jpg", name: "High cliff", hint: "Hold $250,000 cash." },
  { id: "pass", art: "/game/trophies/pass.jpg", name: "The pass", hint: "Step onto the Freedom Track." },
  { id: "terrace", art: "/game/trophies/terrace.jpg", name: "The dream", hint: "Buy your dream." },
  { id: "hills", art: "/game/trophies/hills.jpg", name: "Unbound", hint: "Reach $50,000 a month in passive income." },
  { id: "city", art: "/game/trophies/city.jpg", name: "The company", hint: "Found a business." },
  { id: "peak", art: "/game/trophies/peak.jpg", name: "The peak", hint: "Sell the company, or clear a level 2 goal." },
] as const;

export function mergeTrophies(ids: string[], peak: TrophyPeak, players: Player[]): { ids: string[]; peak: TrophyPeak } {
  let cash = peak.cash;
  let passive = peak.passive;
  const set = new Set(ids);
  for (const p of players) {
    cash = Math.max(cash, p.cash);
    const st = statement(p);
    passive = Math.max(passive, st.passive);
    if (p.track !== "grind") set.add("pass");
    if (p.dreamBought) set.add("terrace");
    if (st.passive >= PASSIVE_WIN) set.add("hills");
    if (p.business || p.capstone === "exit") set.add("city");
    if (p.capstone || p.stretchClaimed || (p.business && p.business.revenue >= VENTURE_GOAL)) set.add("peak");
  }
  if (cash >= 10_000) set.add("harbor");
  if (cash >= 50_000) set.add("beach");
  if (cash >= FORTUNE_CASH) set.add("cliffs");
  return { ids: [...set], peak: { cash, passive } };
}
