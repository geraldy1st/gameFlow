import { describe, expect, it } from "vitest";
import { persistedNext, record } from "../components/game/boite/history";
import { createMatch, reduce, type GameState } from "./engine";

const AOI = { characterId: "aoi", dreamId: "cafe" };

describe("DEF-TUT-11: the tutorial never writes the passive-income chart history", () => {
  it("a tutorial game (any moment) leaves the persisted series untouched", () => {
    const realGame: GameState = { ...createMatch([AOI], 77, false), turn: 7 };
    const before = record(record(null, { ...realGame, turn: 6 }), realGame);
    expect(before.players.p1).toHaveLength(2);
    const tut = createMatch([AOI], 77, false, { training: true }); // same seed on purpose: the worst case
    expect(persistedNext(before, tut)).toBeNull();
    const skipped = reduce(tut, { type: "SKIP_TRAINING" });
    expect(persistedNext(before, skipped)).toBeNull();
    // Back to the real game: both points are still there.
    const after = persistedNext(before, realGame)!;
    expect(after.players.p1).toEqual(before.players.p1);
  });

  it("a real game is still recorded as before", () => {
    const g = createMatch([AOI], 3, false);
    const s = persistedNext(null, g)!;
    expect(s.seed).toBe(g.seed);
    expect(s.players.p1).toEqual([{ turn: 1, passive: 0 }]);
  });
});
