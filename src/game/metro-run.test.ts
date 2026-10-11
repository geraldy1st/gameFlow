import { describe, expect, it } from "vitest";
import { createMatch, cur, hydrate, reduce, type GameState, type Pick, type Player } from "./engine";
import {
  RUN,
  act,
  advanceRun,
  currentSpeed,
  generateObstacles,
  jumpY,
  makeAutopilot,
  metroOfferTurn,
  metroReward,
  newRun,
  sliding,
  speedAt,
  wrongGestures,
  type Lane,
  type MetroAction,
  type Obstacle,
  type ObstacleKind,
  type RunState,
} from "./metro-run";
import { parseText } from "./text";
import { tr } from "./i18n";
import { firstChoice } from "./__tests__/drive";

const AOI: Pick = { characterId: "aoi", dreamId: "cafe" };
const REN: Pick = { characterId: "ren", dreamId: "studio" };

/** One automatic step of a normal game (same policy as the regression driver). */
function step(s: GameState): GameState {
  if (s.phase === "card" && s.card) return reduce(s, { type: "CHOICE", id: firstChoice(s) });
  if (s.phase === "idle") return reduce(s, { type: "ROLL" });
  if (s.phase === "rolling") return reduce(s, { type: "REVEAL" });
  if (s.phase === "moving") return reduce(s, { type: "STEP" });
  if (s.phase === "broke") return reduce(s, { type: "BREATHE" });
  return s;
}

interface Offer {
  due: number;
  turn: number;
  phase: string;
  own: number;
}

/** Own turns finished (Player.turns counts the current one too). */
const ownDone = (s: GameState) => cur(s).turns - 1;

/** Plays until `maxOwn` own turns are finished, answering every offer with `answer`. */
function playWithOffers(picks: Pick[], seed: number, maxOwn: number, answer: (s: GameState) => GameState): { offers: Offer[]; s: GameState } {
  let s = createMatch(picks, seed, false);
  const offers: Offer[] = [];
  for (let i = 0; i < 8000 && ownDone(s) < maxOwn && s.phase !== "win"; i++) {
    const due = metroOfferTurn(s);
    if (due !== null) {
      offers.push({ due, turn: s.turn, phase: s.phase, own: cur(s).turns });
      const next = answer(s);
      expect(metroOfferTurn(next)).toBeNull(); // answered: never twice for the same multiple of 10
      s = next;
      continue;
    }
    s = step(s);
  }
  return { offers, s };
}

const decline = (s: GameState) => reduce(s, { type: "METRO", result: "decline" });
const english = (line: string) => (parseText(line) ? tr("en", line) : line);
const noMetro = (p: Player) => {
  const { metroTurn: _m, ...rest } = p;
  return rest;
};

/** A match past its opening card (the opening "intro" card is never interrupted). */
function started(picks: Pick[], seed: number): GameState {
  let s = createMatch(picks, seed, false);
  while (s.phase === "card") s = step(s);
  return s;
}

/** The player's own turn count set to `own`, in `phase`. */
function withOwn(s: GameState, own: number, phase: GameState["phase"], extra: Partial<Player> = {}): GameState {
  return { ...s, phase, card: null, players: s.players.map((p, i) => (i === s.current ? { ...p, turns: own, ...extra } : p)) };
}

/** A state where the offer for `n` is due: idle at the start of own turn n + 1. */
function dueState(picks: Pick[], n = 10): GameState {
  return withOwn(started(picks, 5), n + 1, "idle");
}

// v3: solo only. The hot-seat cases (offer at the hand-over, one offer per player) went with the 2-player mode.
describe("metro run — offer every 10 of the player's own turns", () => {
  it("offered at the start of the next turn (after own turns 10, 20, 30), not after 5 or 15", () => {
    const base = started([AOI], 3);
    // Player.turns at the start of a turn = that turn's number
    const at = (turn: number, phase: GameState["phase"] = "idle") => metroOfferTurn(withOwn({ ...base, turn }, turn, phase));
    expect([6, 10, 11, 12, 13, 14, 16, 21, 31].map((n) => at(n))).toEqual([null, null, 10, 10, 10, null, null, 20, 30]);
    expect(at(11, "card")).toBeNull();
    expect(at(11, "rolling")).toBeNull();
    expect(at(11, "broke")).toBeNull();
    expect(at(11, "win")).toBeNull();
    expect(metroOfferTurn(withOwn(base, 11, "idle", { metroTurn: 10 }))).toBeNull();
  });

  it("Player.turns follows GameState.turn", () => {
    let s = started([AOI], 9);
    for (let i = 0; i < 3000 && s.turn < 25 && s.phase !== "win"; i++) {
      expect(cur(s).turns).toBe(s.turn);
      s = step(s);
    }
  });

  it("real games: 10/20/30 offered once each, at the idle start of the next turn", () => {
    for (const picks of [[AOI], [REN]]) {
      for (const seed of [1, 7, 42, 99, 2026]) {
        const solo = playWithOffers(picks, seed, 31, decline);
        if (solo.s.phase !== "win") expect(solo.offers.map((o) => o.due)).toEqual([10, 20, 30]);
        for (const o of solo.offers) {
          expect(o.phase).toBe("idle");
          expect(o.turn).toBe(o.due + 1);
          expect(o.own).toBe(o.due + 1);
        }
      }
    }
  });

  it("refusing has no effect on the game (only a journal line and the 'answered' flag)", () => {
    const s = dueState([AOI]);
    const n = decline(s);
    expect(n.players.map(noMetro)).toEqual(s.players.map(noMetro));
    expect(cur(n).metroTurn).toBe(10);
    expect(n.phase).toBe(s.phase);
    expect(n.turn).toBe(s.turn);
    expect(n.seed).toBe(s.seed);
    expect(n.log.length).toBe(s.log.length + 1);
    expect(english(n.log[0]!)).toBe("Metro run: not this time");
    expect(metroOfferTurn(n)).toBeNull();
    // answering again is ignored
    expect(reduce(n, { type: "METRO", result: "run", lives: 3 })).toBe(n);
  });

  it("rewards: 3 lives = +$500, 1–2 lives = +$250, 0 lives = nothing — cash and skill XP only", () => {
    expect([0, 1, 2, 3].map(metroReward)).toEqual([0, 250, 250, 500]);
    for (const [lives, gain, line] of [
      [3, 500, "Metro run: +$500"],
      [2, 250, "Metro run: +$250"],
      [1, 250, "Metro run: +$250"],
      [0, 0, "Metro run: missed"],
    ] as const) {
      const s = dueState([AOI]);
      const n = reduce(s, { type: "METRO", result: "run", lives });
      expect(cur(n).cash).toBe(cur(s).cash + gain);
      expect(cur(n).metroTurn).toBe(10);
      // nothing else moves: calm, debts, assets, position (skills earn XP, SKILLS.md)
      const bare = (p: Player) => ({ ...noMetro(p), cash: 0, skills: undefined, skillLog: undefined, gigBonus: undefined });
      expect(bare(cur(n))).toEqual(bare(cur(s)));
      expect(n.phase).toBe(s.phase);
      expect(n.turn).toBe(s.turn);
      expect(english(n.log[0]!)).toBe(line);
      // no double credit
      expect(reduce(n, { type: "METRO", result: "run", lives })).toBe(n);
    }
  });

  it("the journal lines are {key, vars} tokens translated in fr and es", () => {
    const s = dueState([AOI]);
    const won = reduce(s, { type: "METRO", result: "run", lives: 3 }).log[0]!;
    expect(parseText(won)).toEqual({ k: "Metro run: +{amount}", v: { amount: "$500" } });
    expect(tr("fr", won)).toBe("Course vers le métro : +$500");
    expect(tr("es", won)).toBe("Carrera al metro: +$500");
    expect(tr("fr", reduce(s, { type: "METRO", result: "run", lives: 0 }).log[0]!)).toBe("Course vers le métro : ratée");
    expect(tr("fr", decline(s).log[0]!)).toBe("Course vers le métro : pas cette fois");
  });

  it("never offered in the training or the practice game, and METRO is refused there", () => {
    let s = createMatch([AOI], 42, false, { training: true });
    expect(s.practice).toBe(true);
    for (let i = 0; i < 4000 && s.phase !== "win" && ownDone(s) < 32; i++) {
      expect(metroOfferTurn(s)).toBeNull();
      expect(reduce(s, { type: "METRO", result: "run", lives: 3 })).toBe(s);
      s = step(s);
    }
    expect(cur(s).turns).toBeGreaterThan(30);
    const forced = withOwn(createMatch([AOI], 1, false, { training: true }), 11, "idle");
    expect(metroOfferTurn(forced)).toBeNull();
    expect(reduce(forced, { type: "METRO", result: "run", lives: 3 })).toBe(forced);
  });

  it("not on the menu, not with a card open, not after a win", () => {
    const s = dueState([AOI]);
    expect(metroOfferTurn({ ...s, screen: "menu" })).toBeNull();
    expect(metroOfferTurn({ ...s, phase: "card" })).toBeNull();
    expect(metroOfferTurn({ ...s, phase: "win" })).toBeNull();
  });

  it("saves: old saves load fine and still get their offers; junk is dropped; the legacy table-wide flag is migrated", () => {
    const s = dueState([AOI]);
    const roundTrip = (x: unknown) => hydrate(JSON.parse(JSON.stringify(x)) as GameState);
    const h = roundTrip({ ...s, players: s.players.map(noMetro) });
    expect(cur(h).metroTurn).toBeUndefined();
    expect(metroOfferTurn(h)).toBe(10);
    const answered = decline(s);
    expect(cur(roundTrip(answered)).metroTurn).toBe(10);
    expect(metroOfferTurn(roundTrip(answered))).toBeNull();
    const junk = (v: unknown) => cur(roundTrip(withOwn(s, 11, "idle", { metroTurn: v as number }))).metroTurn;
    expect(junk("x")).toBeUndefined();
    expect(junk(-4)).toBeUndefined();
    expect(junk(10.7)).toBe(10);
    // first metro-run build: one table-wide `metroTurn`, the same count as the player's own turns → moved onto them.
    const legacySolo = roundTrip({ ...s, metroTurn: 10 });
    expect("metroTurn" in legacySolo).toBe(false);
    expect(legacySolo.players[0]!.metroTurn).toBe(10);
    expect(metroOfferTurn(legacySolo)).toBeNull();
    expect(roundTrip({ ...s, metroTurn: "x" }).players[0]!.metroTurn).toBeUndefined();
  });

  it("an old 2-player save becomes solo: its table-wide metro flag is dropped, the kept player's own flag stays", () => {
    const duo = createMatch([AOI, REN], 3, false);
    const saved = { ...duo, phase: "idle", intro: false, card: null, current: 1, metroTurn: 20, players: duo.players.map((p, i) => ({ ...p, turns: 11, metroTurn: i === 1 ? 10 : undefined })) };
    const h = hydrate(JSON.parse(JSON.stringify(saved)) as GameState);
    expect(h.players).toHaveLength(1);
    expect(h.players[0]!.characterId).toBe("ren");
    expect(h.players[0]!.metroTurn).toBe(10);
    expect("metroTurn" in h).toBe(false);
    expect(metroOfferTurn(h)).toBeNull();
  });
});

/* ------------------------------------------------------------------ runner */

function single(kind: ObstacleKind, lane: Lane = 1, z = 12): RunState {
  return { ...newRun(), obstacles: [{ id: 0, row: 0, lane, z, kind, depth: RUN.depth[kind], side: 1, hit: false, passed: false }] };
}

/** Skips the countdown. */
function running(s: RunState): RunState {
  let n = s;
  while (n.phase === "count") n = advanceRun(n, RUN.step);
  return n;
}

/** Runs until the middle of the obstacle is `lead` seconds ahead, plays `a`, then runs past it. */
function meet(s0: RunState, a: MetroAction | null, lead = 0.12): RunState {
  let s = running(s0);
  const o = s.obstacles[0]!;
  while (o.z + o.depth / 2 - s.z > currentSpeed(s) * lead) s = advanceRun(s, RUN.step);
  if (a) s = act(s, a);
  for (let i = 0; i < 150; i++) s = advanceRun(s, RUN.step);
  return s;
}

function play(seed: number, bot: (s: RunState) => MetroAction | null): RunState {
  let s = newRun(seed);
  for (let i = 0; i < 6000 && s.phase !== "done"; i++) {
    s = advanceRun(s, 1 / 60);
    const a = bot(s);
    if (a) s = act(s, a);
  }
  return s;
}

describe("metro run — runner (mockup tuning)", () => {
  it("the right gesture gets through: slide under the walker's plank, jump the barrier, change lane at the police", () => {
    expect(meet(single("walker"), "slide").lives).toBe(3);
    expect(meet(single("barrier"), "jump", 0.25).lives).toBe(3);
    for (const kind of ["cop", "walker", "barrier"] as const) {
      expect(meet(single(kind), "left", 0.4).lives).toBe(3); // changing lane always works
      expect(meet(single(kind), "right", 0.4).lives).toBe(3);
    }
  });

  it("the wrong gesture costs a life: jump at the police, slide at a barrier, nothing (or a jump) at a walker", () => {
    expect(meet(single("cop"), "jump").lives).toBe(2);
    expect(meet(single("cop"), "slide").lives).toBe(2);
    expect(meet(single("cop"), null).lives).toBe(2);
    expect(meet(single("barrier"), "slide").lives).toBe(2);
    expect(meet(single("barrier"), null).lives).toBe(2);
    expect(meet(single("walker"), null).lives).toBe(2);
    expect(meet(single("walker"), "jump", 0.25).lives).toBe(2); // the plank is at 1.25–1.42 m
  });

  it("a hit: −1 life, pushed back 4 m over 0.25 s in the same lane, controls ignored, then 0.6 s invulnerable at half speed", () => {
    let s = running(single("cop"));
    while (s.hits === 0) s = advanceRun(s, RUN.step);
    const at = s.z;
    expect(s.lives).toBe(2);
    expect(s.lastHit).toBe("cop");
    expect(s.lane).toBe(1);
    expect(s.invuln).toBeCloseTo(RUN.invuln, 2);
    expect(currentSpeed(s)).toBeLessThan(speedAt(s.runT) * 0.55);
    expect(act(s, "left")).toBe(s); // knock-back: controls ignored
    let steps = 0;
    while (s.knock > 0) {
      s = advanceRun(s, RUN.step);
      steps++;
    }
    expect(steps * RUN.step).toBeCloseTo(RUN.knockTime, 1);
    expect(at - s.z).toBeCloseTo(RUN.knock, 1);
    expect(s.lane).toBe(1);
    expect(act(s, "left").lane).toBe(0);
    for (let i = 0; i < 300; i++) s = advanceRun(s, RUN.step);
    expect(s.lives).toBe(2); // the consumed obstacle never hits again
    expect(s.obstacles[0]!.hit).toBe(true);
  });

  it("3 hits = run over, no retry; actions are ignored afterwards", () => {
    let s: RunState = {
      ...newRun(),
      obstacles: [20, 40, 60].map((z, id) => ({ id, row: id, lane: 1 as const, z, kind: "cop" as const, depth: 0.6, side: 1 as const, hit: false, passed: false })),
    };
    for (let i = 0; i < 2000 && s.phase !== "done"; i++) s = advanceRun(s, 1 / 60);
    expect(s.outcome).toBe("lost");
    expect(s.lives).toBe(0);
    expect(s.phase).toBe("done");
    expect(act(s, "left")).toBe(s);
    expect(advanceRun(s, 1)).toBe(s);
  });

  it("controls: left stops at lane 0, right at lane 2 (0.15 s glide); jump 0.62 s with a 1.25 m apex; slide 0.45 s", () => {
    let s = running(newRun());
    expect(act(newRun(), "left").lane).toBe(1); // nothing during the countdown
    s = act(s, "left");
    for (let i = 0; i < 30; i++) s = advanceRun(s, RUN.step);
    s = act(s, "left");
    expect(s.lane).toBe(0);
    expect(s.x).toBeCloseTo(-RUN.laneW, 2);
    s = act(act(act(act(s, "right"), "right"), "right"), "right");
    expect(s.lane).toBe(2);
    let j = act(running(newRun()), "jump");
    let apex = 0;
    let air = 0;
    while (j.jumpT >= 0) {
      j = advanceRun(j, RUN.step);
      apex = Math.max(apex, jumpY(j));
      air += RUN.step;
    }
    expect(apex).toBeCloseTo(RUN.jumpH, 2);
    expect(air).toBeCloseTo(RUN.jump, 1);
    expect(sliding(act(running(newRun()), "slide"))).toBe(true);
    expect(act(act(running(newRun()), "jump"), "slide").jumpT).toBe(-1); // sliding in the air cuts the jump
    expect(act(act(running(newRun()), "slide"), "jump").slideT).toBe(-1); // jumping cancels the slide
  });

  it("the validated level (seed 1008): 17 rows, first three teach barrier / walker / cop in the middle lane", () => {
    const o = generateObstacles(RUN.seed);
    expect(new Set(o.map((x) => x.row)).size).toBe(17);
    expect(o.length).toBe(22);
    expect(o.slice(0, 3).map((x) => [x.kind, x.lane, x.z])).toEqual([
      ["barrier", 1, 30],
      ["walker", 1, expect.closeTo(41.8, 1)],
      ["cop", 1, expect.closeTo(53.8, 1)],
    ]);
  });

  it("clean run ≈ 26.7 s (≈ 29.5 s on the clock with the countdown and the stairs), one hit ≈ 27.3 s", () => {
    const clean = play(RUN.seed, makeAutopilot());
    expect(clean.outcome).toBe("won");
    expect(clean.lives).toBe(3);
    expect(clean.runT).toBeCloseTo(26.7, 0);
    expect(clean.t).toBeCloseTo(29.5, 0);
    const hurt = play(RUN.seed, makeAutopilot({ miss: [3] }));
    expect(hurt.outcome).toBe("won");
    expect(hurt.lives).toBe(2);
    expect(hurt.runT).toBeCloseTo(27.3, 0);
  });

  it("every street is fair: never 3 in a row or 2 in a lane, nothing before 30 m or in the last 28 m, winnable without a hit", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const obs = generateObstacles(seed);
      const rows = new Map<number, Obstacle[]>();
      for (const o of obs) rows.set(o.row, [...(rows.get(o.row) ?? []), o]);
      for (const row of rows.values()) {
        expect(row.length).toBeLessThanOrEqual(2); // one lane always free
        expect(new Set(row.map((o) => o.lane)).size).toBe(row.length);
        expect(row.filter((o) => o.kind === "cop").length).toBeLessThanOrEqual(1);
      }
      expect(Math.min(...obs.map((o) => o.z))).toBeGreaterThanOrEqual(RUN.firstRow);
      expect(Math.max(...obs.map((o) => o.z + o.depth))).toBeLessThanOrEqual(RUN.length - RUN.endClear + 1);
      const s = play(seed, makeAutopilot());
      expect(s.outcome, `seed ${seed}`).toBe("won");
      expect(s.lives, `seed ${seed}`).toBe(3);
      expect(s.runT).toBeGreaterThan(25);
      expect(s.runT).toBeLessThan(35);
    }
  });

  it("the speed rises slightly (8 → 11.5 m/s) and stays capped", () => {
    expect(speedAt(0)).toBe(RUN.speed0);
    expect(speedAt(10)).toBeCloseTo(9.3, 5);
    expect(speedAt(60)).toBe(RUN.speedMax);
  });

  it("doing nothing, or always the wrong gesture, runs out of lives", () => {
    for (let seed = 1; seed <= 30; seed++) {
      expect(play(seed, wrongGestures).outcome).toBe("lost");
      expect(play(seed, () => null).outcome).toBe("lost");
    }
  });
});
