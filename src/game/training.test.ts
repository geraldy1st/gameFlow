import { describe, expect, it } from "vitest";
import { TRAINING_DICE, TRAINING_TURNS } from "./data";
import { createMatch, cur, hydrate, reduce, statement, type GameState, type Pick } from "./engine";
import { answer, canonical, firstChoice, hash, playNormal, REGRESSION_ACTIONS, REGRESSION_SEEDS, rollAndMove } from "./__tests__/drive";
import fixture from "./__tests__/normal-game.fixture.json";

const E = { reduce: reduce as (s: GameState, a: { type: string; [k: string]: unknown }) => GameState };
const AOI: Pick = { characterId: "aoi", dreamId: "cafe" };
const REN: Pick = { characterId: "ren", dreamId: "studio" };
const SEEDS = Array.from({ length: 100 }, (_, i) => i * 7919 + 1);

/** Training game past the start card, at turn 1 idle. */
function training(seed: number, picks: Pick[] = [AOI]): GameState {
  return answer(E, createMatch(picks, seed, false, { training: true }), firstChoice);
}

type Policy = Partial<Record<number, string>>;
interface TurnLog {
  die: number;
  position: number;
  card: GameState["card"];
}

/** Plays one turn of the current player. `choice` overrides the card answer (default: first choice). */
function turn(s0: GameState, choice?: string): { s: GameState; log: TurnLog } {
  const moved = rollAndMove(E, s0);
  const log = { die: moved.die, position: cur(moved).position, card: moved.card };
  let s = answer(E, moved, (st) => (choice && st.card!.choices.some((c) => c.id === choice) ? choice : firstChoice(st)));
  if (s.phase === "pass") s = reduce(s, { type: "READY" });
  return { s, log };
}

/** Plays the 5 scripted turns (solo). */
function playScript(seed: number, policy: Policy = {}): { s: GameState; logs: TurnLog[]; states: GameState[] } {
  let s = training(seed);
  const logs: TurnLog[] = [];
  const states: GameState[] = [s];
  for (let t = 1; t <= TRAINING_TURNS; t++) {
    const r = turn(s, policy[t]);
    s = r.s;
    logs.push(r.log);
    states.push(s);
  }
  return { s, logs, states };
}

describe("training mode (tutorial/RULES.md §13)", () => {
  it("1. createMatch with training: barista, $1,705 cash, space 21, +$1,040 cash flow", () => {
    const s = createMatch([AOI], 42, false, { training: true });
    const p = s.players[0]!;
    expect(p.cash).toBe(1705);
    expect(p.careerId).toBe("barista");
    expect(p.position).toBe(21);
    expect(statement(p).cashFlow).toBe(1040);
    expect(s.training).toEqual({ turn: 1, player: 0, skipped: false });
    // Same seed trajectory as a normal game (career rand still consumed).
    expect(s.seed).toBe(createMatch([AOI], 42, false).seed);
  });

  it("2. forced dice [2,1,1,1,1] and positions [23,0,1,2,3] for 100 seeds", () => {
    for (const seed of SEEDS) {
      const { logs } = playScript(seed);
      expect(logs.map((l) => l.die)).toEqual([...TRAINING_DICE]);
      expect(logs.map((l) => l.position)).toEqual([23, 0, 1, 2, 3]);
    }
  });

  it("3. T2 payday → $2,745; T3 accept → $2,245, 1 asset, +$340 passive, no liabilities", () => {
    const { states } = playScript(42, { 3: "accept" });
    expect(states[2]!.players[0]!.cash).toBe(2745);
    const p = states[3]!.players[0]!;
    expect(p.cash).toBe(2245);
    expect(p.assets).toHaveLength(1);
    expect(statement(p).passive).toBe(340);
    expect(p.liabilities).toHaveLength(0);
    expect(statement(p).cashFlow).toBe(1380);
  });

  it("4. T4 pay → expenseMods 70, $2,205; decline changes nothing", () => {
    const paid = playScript(42, { 3: "accept", 4: "pay" }).states[4]!.players[0]!;
    expect(paid.expenseMods).toBe(70);
    expect(paid.cash).toBe(2205);
    expect(statement(paid).expenses).toBe(2130);
    const run = playScript(42, { 3: "accept", 4: "decline" });
    const before = run.states[3]!.players[0]!;
    const after = run.states[4]!.players[0]!;
    expect(after.expenseMods).toBe(before.expenseMods);
    expect(after.cash).toBe(before.cash);
    expect(after.assets).toEqual(before.assets);
  });

  it("5. T1 rest card only offers 'rest'; no served card ever offers 'borrow'", () => {
    const t1 = playScript(42).logs[0]!.card!;
    expect(t1.payload.t).toBe("rest");
    expect(t1.choices.map((c) => c.id)).toEqual(["rest"]);
    for (const seed of SEEDS.slice(0, 30)) {
      for (const policy of [{}, { 3: "accept", 4: "pay" }, { 3: "decline", 4: "decline" }] as Policy[]) {
        for (const l of playScript(seed, policy).logs) {
          expect(l.card!.choices.some((c) => c.id === "borrow")).toBe(false);
        }
      }
    }
    // BORROW is a no-op while training.
    const s = training(42);
    expect(reduce(s, { type: "BORROW" })).toBe(s);
  });

  it("6. vitals unchanged across the 5 turns, no friends", () => {
    for (const policy of [{ 3: "accept", 4: "pay" }, { 3: "decline", 4: "decline" }] as Policy[]) {
      const { states, s } = playScript(42, policy);
      const v0 = states[0]!.players[0]!.vitals;
      for (const st of states) {
        expect(st.players[0]!.vitals).toEqual(v0);
        expect(st.players[0]!.friends).toEqual([]);
      }
      // Natural end: training cleared at the start of turn 6, turn counter still correct.
      expect(s.training).toBeNull();
      expect(s.players[0]!.turns).toBe(6);
      expect(s.phase).toBe("idle");
    }
  });

  it("7. SKIP_TRAINING at T2: T2 finishes per script, then random dice, training null, drawDeal used", () => {
    const dice = new Set<number>();
    let drew = 0;
    for (const seed of SEEDS) {
      let s = turn(training(seed)).s; // T1
      s = reduce(s, { type: "SKIP_TRAINING" });
      expect(s.training!.skipped).toBe(true);
      const t2 = turn(s);
      expect(t2.log.die).toBe(1); // current turn keeps the script
      expect(t2.log.position).toBe(0);
      s = t2.s;
      expect(s.training).toBeNull();
      const moved = rollAndMove(E, s);
      dice.add(moved.die);
      // From 0 a small deal sits on spaces 1 and 6: the card must come from drawDeal (the deck queue gets shuffled in).
      if (moved.card?.payload.t === "deal" || moved.card?.payload.t === "deal2") {
        drew++;
        expect(moved.decks.small.length).toBeGreaterThan(0);
      }
    }
    expect(dice.size).toBeGreaterThan(3);
    expect(drew).toBeGreaterThan(0);
  });

  it("8. two players: player 2 rolls random dice from turn one, player 1 keeps the script", () => {
    const p2First = new Set<number>();
    for (const seed of SEEDS.slice(0, 40)) {
      let s = training(seed, [AOI, REN]);
      expect(s.players[1]!.position).toBe(11);
      const p1Dice: number[] = [];
      const p1Pos: number[] = [];
      for (let t = 1; t <= TRAINING_TURNS; t++) {
        expect(s.current).toBe(0);
        const a = turn(s);
        p1Dice.push(a.log.die);
        p1Pos.push(a.log.position);
        s = a.s;
        expect(s.current).toBe(1);
        const b = turn(s);
        if (t === 1) {
          p2First.add(b.log.die);
          expect(b.log.position).toBe((11 + b.log.die) % 24);
        }
        s = b.s;
      }
      expect(p1Dice).toEqual([...TRAINING_DICE]);
      expect(p1Pos).toEqual([23, 0, 1, 2, 3]);
      expect(s.training).toBeNull();
    }
    expect(p2First.size).toBeGreaterThan(3);
  });

  it("9. hydrate() of an old v1 save without `training` gives training: null", () => {
    const old = createMatch([AOI], 42, false) as Partial<GameState>;
    delete old.training;
    const s = hydrate(old as GameState);
    expect(s.training).toBeNull();
    // A save made mid-training round-trips.
    const mid = turn(training(42)).s;
    expect(hydrate(JSON.parse(JSON.stringify(mid))).training).toEqual({ turn: 2, player: 0, skipped: false });
  });

  it("10. normal game (training off) is unchanged: same snapshots as the base engine", () => {
    const rosters: Record<string, Pick[]> = { solo: [AOI], duo: [AOI, REN] };
    const strip = (s: GameState) => {
      const { training: t, ...rest } = s;
      expect(t).toBeNull();
      return rest;
    };
    // main@4803db0 reference: drop what the redesign intentionally adds (vitals with the Social bonus, and the
    // per-friend socialGain record used by the mat badge, DEF-GF-05)
    const stripVitals = (s: GameState) => ({
      ...strip(s),
      players: s.players.map(({ vitals: _v, ...p }) => ({ ...p, friends: p.friends.map(({ socialGain: _g, ...f }) => f) })),
    });
    for (const [name, picks] of Object.entries(rosters)) {
      for (const seed of REGRESSION_SEEDS) {
        const key = `${name}:${seed}` as keyof typeof fixture.full;
        const start = createMatch(picks, seed, false);
        const full = playNormal(E, start, REGRESSION_ACTIONS, strip);
        const want = fixture.full[key];
        expect(full.hashes.length).toBe(want.actions);
        expect(full.hashes.filter((_, i) => i % 25 === 24)).toEqual(want.checkpoints);
        expect(hash(canonical(full.final))).toBe(want.final);
        const noV = playNormal(E, start, REGRESSION_ACTIONS, stripVitals);
        expect(hash(canonical(noV.final))).toBe(fixture.mainNoVitals[key].final);
      }
    }
  });
});
