import { describe, expect, it } from "vitest";
import { createMatch, cur, hydrate, portraitOf, reduce, statement, wasMultiSave, type GameState } from "./engine";
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
    expect(["card", "idle"]).toContain(s.phase);
  });
  it("keeps present fields and fixes unknown ids", () => {
    const s = hydrate({ ...MINIMAL, players: [{ id: "p1", characterId: "nobody", dreamId: "?", careerId: "?", cash: 1234, position: 3 }] } as unknown as GameState);
    const p = cur(s);
    expect(p.cash).toBe(1234);
    expect(p.position).toBe(3);
    expect(p.characterId).toBe("aoi");
  });
});

describe("v3: 2-player (hot-seat) saves load as solo games", () => {
  const AOI = { characterId: "aoi", dreamId: "cafe" };
  const REN = { characterId: "ren", dreamId: "studio" };
  const play = (s0: GameState, n: number) => {
    let s = s0;
    for (let i = 0; i < n && s.phase !== "win"; i++) {
      if (s.phase === "card" && s.card) s = reduce(s, { type: "CHOICE", id: s.card.choices[0]!.id });
      else if (s.phase === "idle") s = reduce(s, { type: "ROLL" });
      else if (s.phase === "rolling") s = reduce(s, { type: "REVEAL" });
      else if (s.phase === "moving") s = reduce(s, { type: "STEP" });
      else if (s.phase === "broke") s = reduce(s, { type: "BREATHE" });
    }
    return s;
  };
  /** A save written by the old hot-seat build: two players, the hand-over phase "pass" after player 2's turn. */
  const oldDuo = (phase: string, current: number) => {
    const s = createMatch([AOI, REN], 77, false);
    return JSON.parse(JSON.stringify({ ...s, intro: false, card: null, phase, current, turn: 9, players: s.players.map((p, i) => ({ ...p, turns: i === 0 ? 5 : 4, cash: 1000 + i })) })) as GameState;
  };

  it("a 2-player save in the hand-over phase becomes a playable solo game for the player who just played", () => {
    expect(wasMultiSave(oldDuo("pass", 1))).toBe(true);
    const h = hydrate(oldDuo("pass", 1));
    expect(h.players).toHaveLength(1);
    expect(h.current).toBe(0);
    expect(h.winner).toBe(0);
    expect(h.players[0]!.characterId).toBe("ren");
    expect(h.players[0]!.cash).toBe(1001);
    expect(h.phase).toBe("idle"); // the next turn is open, as READY used to do
    expect(h.turn).toBe(10);
    expect(h.players[0]!.turns).toBe(5);
    const later = play(h, 300);
    expect(later.players).toHaveLength(1);
    expect(later.turn).toBeGreaterThan(h.turn);
    expect(Number.isFinite(cur(later).cash)).toBe(true);
  });

  it("mid-turn (idle or a card open) keeps the current player; a finished game keeps the winner", () => {
    const idle = hydrate(oldDuo("idle", 0));
    expect(idle.players.map((p) => p.characterId)).toEqual(["aoi"]);
    expect(idle.phase).toBe("idle");
    const won = hydrate({ ...oldDuo("win", 0), screen: "win", winner: 1, winReason: "flow" });
    expect(won.players.map((p) => p.characterId)).toEqual(["ren"]);
    expect(won.winner).toBe(0);
    // a junk winner index never crashes
    expect(hydrate({ ...oldDuo("win", 0), screen: "win", winner: 9 as number }).players).toHaveLength(1);
  });

  it("a solo save is untouched by the migration", () => {
    const s = play(createMatch([AOI], 5, false), 40);
    expect(wasMultiSave(s)).toBe(false);
    expect(hydrate(JSON.parse(JSON.stringify(s))).players).toHaveLength(1);
  });
});
