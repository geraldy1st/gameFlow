import { describe, expect, it } from "vitest";
import { cur, hydrate, portraitOf, reduce, statement, type GameState } from "./engine";
import { expressionOf } from "./speech";

/** DEF-GF-04 remaining case: Crypto's fixture partial-player-minimal. */
const MINIMAL = { version: 1, screen: "play", phase: "idle", turn: 4, current: 0, players: [{ id: "p1", characterId: "aoi", dreamId: "cafe", careerId: "tester" }] } as unknown as GameState;

describe("DEF-GF-04: hydrate fills a minimal player", () => {
  it("gives a playable player with a valid position, track and reaction", () => {
    const s = hydrate(MINIMAL);
    const p = cur(s);
    expect(p.careerId).toBe("tester");
    expect(p.track).toBe("grind");
    expect(Number.isInteger(p.position)).toBe(true);
    expect(p.reaction).toBe("idle");
    expect(Number.isFinite(statement(p).cashFlow)).toBe(true);
    expect(portraitOf(p)).not.toContain("undefined");
    expect(expressionOf(p, p.reaction)).not.toContain("undefined");
  });
  it("can roll and move", () => {
    let s = reduce(hydrate(MINIMAL), { type: "ROLL" });
    s = reduce(s, { type: "REVEAL" });
    for (let i = 0; i < 12 && s.phase === "moving"; i++) s = reduce(s, { type: "STEP" });
    expect(["card", "idle", "pass"]).toContain(s.phase);
  });
  it("keeps present fields and fixes unknown ids", () => {
    const s = hydrate({ ...MINIMAL, players: [{ id: "p1", characterId: "nobody", dreamId: "?", careerId: "?", cash: 1234, position: 3 }] } as unknown as GameState);
    const p = cur(s);
    expect(p.cash).toBe(1234);
    expect(p.position).toBe(3);
    expect(p.characterId).toBe("aoi");
  });
});
