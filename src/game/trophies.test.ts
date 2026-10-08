import { describe, expect, it } from "vitest";
import { createMatch, reduce, type GameState } from "./engine";
import { recordsFor } from "./trophies";

const AOI = { characterId: "aoi", dreamId: "cafe" };
const rich = (s: GameState, cash: number): GameState => ({ ...s, players: s.players.map((p) => ({ ...p, cash })) });

describe("DEF-TUT-12: the tutorial never touches gameflow-trophies-v1", () => {
  const peak = { cash: 2465, passive: 160 };
  it("a tutorial game, running or after its script, raises no peak and unlocks no trophy", () => {
    const tut = createMatch([AOI], 9, false, { training: true });
    expect(recordsFor(["pass"], peak, rich(tut, 60_000))).toBeNull();
    expect(recordsFor(["pass"], peak, rich(reduce(tut, { type: "SKIP_TRAINING" }), 60_000))).toBeNull();
    expect(recordsFor(["pass"], peak, rich({ ...tut, training: null }, 60_000))).toBeNull();
  });
  it("a real game still updates the records", () => {
    const r = recordsFor(["pass"], peak, rich(createMatch([AOI], 9, false), 60_000))!;
    expect(r.peak.cash).toBe(60_000);
    expect(r.ids).toEqual(expect.arrayContaining(["pass", "harbor", "beach"]));
  });
});
