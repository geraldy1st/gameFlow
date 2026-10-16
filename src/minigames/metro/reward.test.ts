/**
 * Metro v6.1 (Crypto R1): the coin reward is bounded by the engine (integer 0..53, $5 each), credited once per
 * offer (a replay of the same answer, or the same save loaded again, pays nothing more), the old METRO alias
 * still replays, and old saves load.
 */
import { describe, expect, it } from "vitest";
import * as E from "@/game/engine";
import type { GameState } from "@/game/engine";
import { METRO_MAX_COINS, metroCoins, metroOfferTurn, metroReward } from "./logic";

function due(): GameState {
  const s0 = E.createMatch([{ characterId: "aoi", dreamId: "cafe" }], 7, true);
  const s = { ...s0, screen: "play", phase: "idle", training: undefined, intro: false } as unknown as GameState;
  const p = { ...s.players[0]!, turns: 11 };
  delete (p as { metroTurn?: number }).metroTurn;
  const out = { ...s, players: [p] } as GameState;
  expect(metroOfferTurn(out)).toBe(10);
  return out;
}
const cashAfter = (s: GameState, result: unknown) => E.reduce(s, { type: "MINIGAME", id: "metro", result } as E.Action).players[0]!.cash - s.players[0]!.cash;

describe("metro v6.1 — coins in the engine", () => {
  it("metroCoins clamps to an integer 0..53", () => {
    const cases: [unknown, number][] = [[-1, 0], [0, 0], [1, 1], [52, 52], [53, 53], [54, 53], [2.5, 2], [NaN, 0], [Infinity, 0], ["7", 7], [null, 0], [undefined, 0], [{}, 0]];
    for (const [raw, want] of cases) expect(metroCoins(raw)).toBe(want);
    expect(METRO_MAX_COINS).toBe(53);
  });

  it("credits prime + 5 $ per coin, bounded, for -1, 0, 1, 52, 53, 54, 2.5, NaN", () => {
    const s = due();
    const full = metroReward(3);
    const cases: [number, number][] = [[-1, 0], [0, 0], [1, 5], [52, 260], [53, 265], [54, 265], [2.5, 10], [NaN, 0]];
    for (const [coins, extra] of cases) expect(cashAfter(s, { lives: 3, coins })).toBe(full + extra);
    // failed run: the coins are kept, no prime
    expect(cashAfter(s, { lives: 0, coins: 3 })).toBe(15);
    expect(cashAfter(s, { lives: 0, coins: 1e9 })).toBe(265);
  });

  it("is credited once per offer, also after a reload", () => {
    const s = due();
    const once = E.reduce(s, { type: "MINIGAME", id: "metro", result: { lives: 3, coins: 20 } });
    expect(once.players[0]!.cash - s.players[0]!.cash).toBe(600);
    const twice = E.reduce(once, { type: "MINIGAME", id: "metro", result: { lives: 3, coins: 20 } });
    expect(twice.players[0]!.cash).toBe(once.players[0]!.cash);
    const reloaded = E.hydrate(JSON.parse(JSON.stringify(once)));
    expect(metroOfferTurn(reloaded)).toBeNull();
    const again = E.reduce(reloaded, { type: "MINIGAME", id: "metro", result: { lives: 3, coins: 20 } });
    expect(again.players[0]!.cash).toBe(reloaded.players[0]!.cash);
  });

  it("the old METRO alias still replays (no coins) and matches MINIGAME without coins", () => {
    const s = due();
    const a = E.reduce(s, { type: "METRO", result: "run", lives: 2 });
    const b = E.reduce(s, { type: "MINIGAME", id: "metro", result: { lives: 2 } });
    expect(a.players[0]!.cash - s.players[0]!.cash).toBe(250);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(E.reduce(s, { type: "METRO", result: "decline" }).players[0]!.cash).toBe(s.players[0]!.cash);
  });

  it("an old save (metroTurn, no coins anywhere) loads and keeps its offer state", () => {
    const old = JSON.parse(JSON.stringify(due()));
    old.players[0].metroTurn = 10;
    const h = E.hydrate(old);
    expect(h.players[0]!.metroTurn).toBe(10);
    expect(metroOfferTurn(h)).toBeNull();
    const fresh = E.hydrate(JSON.parse(JSON.stringify(due())));
    expect(metroOfferTurn(fresh)).toBe(10);
  });
});
