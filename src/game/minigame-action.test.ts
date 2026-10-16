/**
 * Refacto batch 5: generic MINIGAME action, METRO / QUIZ aliases, Player.minigames and its hydrate migration.
 * The fingerprint guard (engine-fingerprint.test.ts) replays METRO / QUIZ; here the same 200 games are replayed with
 * MINIGAME and must give the same chain, and old saves with metroTurn / quizTurn keep their offers exactly.
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import * as E from "./engine";
import type { Action, GameState } from "./engine";
import { metroOfferTurn } from "./metro-run";

const HERE = dirname(fileURLToPath(import.meta.url));
const SAVES = join(HERE, "__tests__", "saves");
const save = (name: string) => (JSON.parse(readFileSync(join(SAVES, name), "utf8")) as { save: GameState }).save;
const json = (s: unknown) => JSON.stringify(s);
const h = (o: unknown) => createHash("sha1").update(JSON.stringify(o)).digest("hex").slice(0, 16);

function prng(seed: number) {
  let x = seed >>> 0 || 1;
  return () => {
    x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0;
    return x / 4294967296;
  };
}

const CH = ["aoi", "ren", "mio", "sora"], DR = ["cafe", "studio", "retreat", "scholar"];

/** engine-fingerprint.test.ts policy, with METRO / QUIZ dispatched as MINIGAME (same random draws). */
function play(seed: number) {
  const rnd = prng(seed * 31 + 7);
  let s: GameState = E.createMatch([{ characterId: CH[seed % 4]!, dreamId: DR[(seed >> 2) % 4]! }], seed, true);
  const acc = createHash("sha1");
  let i = 0, states = 0;
  while (i++ < 1500 && s.phase !== "win") {
    const p = E.cur(s);
    let a: unknown;
    const r = rnd();
    if (s.phase === "card") {
      const ch = s.card?.choices || [];
      a = { type: "CHOICE", id: ch.length ? ch[Math.floor(rnd() * ch.length)]!.id : "ok" };
    } else if (s.phase === "idle") {
      if (p.track === "grind" && E.unlocked(p)) a = { type: "ENTER" };
      else if (p.level >= 2 && r < 0.05) a = { type: "RETIRE" };
      else if (p.track === "freedom" && !p.dreamBought && r < 0.2) a = { type: "DREAM" };
      else if (r < 0.06 && p.cash < 500) a = { type: "BORROW" };
      else if (r < 0.09 && p.liabilities?.length && p.cash > 3000) a = { type: "REPAY", id: p.liabilities[0]!.id };
      else if (r < 0.11 && p.assets?.length) a = { type: "SELL", id: p.assets[0]!.id };
      else if (r < 0.14) a = { type: "LIFE", kind: ["birthday", "museum", "sleep"][Math.floor(rnd() * 3)] };
      else if (r < 0.16) a = { type: "MINIGAME", id: "quiz", result: { correct: Math.floor(rnd() * 6), creative: Math.floor(rnd() * 2) } };
      else if (r < 0.18) {
        const run = rnd() >= 0.5, lives = Math.floor(rnd() * 4);
        a = { type: "MINIGAME", id: "metro", result: run ? { lives } : "decline" };
      } else a = { type: "ROLL" };
    } else if (s.phase === "rolling") a = { type: "REVEAL" };
    else if (s.phase === "moving") a = { type: "STEP" };
    else if ((s.phase as string) === "pass") a = { type: "READY" };
    else if (s.phase === "broke") a = { type: "BREATHE" };
    else a = { type: "ROLL" };
    s = E.reduce(s, a as Action);
    acc.update(JSON.stringify(s));
    states++;
  }
  return { chain: acc.digest("hex").slice(0, 16), states };
}

describe("MINIGAME action (batch 5)", () => {
  it("200 seeded games with MINIGAME give the METRO / QUIZ fingerprint bit for bit", () => {
    const games = Array.from({ length: 200 }, (_, k) => play(k + 1));
    expect({ states: games.reduce((n, g) => n + g.states, 0), chainAll: h(games.map((g) => g.chain)) }).toEqual({ states: 93335, chainAll: "844f62971aa0030a" }); // payday invite (RULES.md §14); was 102806 / c5b22799e4ee85a3
  }, 120_000);

  it("METRO / QUIZ and MINIGAME give the same state, XP and journal", () => {
    const s0 = E.hydrate(save("old-metro-quiz-turns.save.json"));
    const pairs: [Action, Action][] = [
      [{ type: "METRO", result: "run", lives: 3 }, { type: "MINIGAME", id: "metro", result: { lives: 3 } }],
      [{ type: "METRO", result: "run", lives: 1 }, { type: "MINIGAME", id: "metro", result: { lives: 1 } }],
      [{ type: "METRO", result: "run", lives: 0 }, { type: "MINIGAME", id: "metro", result: { lives: 0 } }],
      [{ type: "METRO", result: "decline" }, { type: "MINIGAME", id: "metro", result: "decline" }],
      [{ type: "QUIZ", correct: 3, creative: 1 }, { type: "MINIGAME", id: "quiz", result: { correct: 3, creative: 1 } }],
      [{ type: "QUIZ", correct: 0 }, { type: "MINIGAME", id: "quiz", result: { correct: 0 } }],
      [{ type: "QUIZ", correct: 99 }, { type: "MINIGAME", id: "quiz", result: { correct: 99 } }],
    ];
    for (const [old, gen] of pairs) expect(json(E.reduce(s0, gen))).toBe(json(E.reduce(s0, old)));
    const ran = E.reduce(s0, { type: "MINIGAME", id: "metro", result: { lives: 3 } });
    expect(E.cur(ran).cash).toBe(E.cur(s0).cash + 500);
    expect(E.cur(ran).metroTurn).toBe(20);
    expect(E.cur(ran).minigames).toBeUndefined();
    expect(ran.history[0]).not.toBe(s0.history[0]);
    expect(json(E.cur(ran).skills)).not.toBe(json(E.cur(s0).skills));
  });

  it("refuses unknown ids, quiz declines, games not due, and the tutorial", () => {
    const s0 = E.hydrate(save("old-metro-quiz-turns.save.json"));
    expect(E.reduce(s0, { type: "MINIGAME", id: "nope", result: {} })).toBe(s0);
    expect(E.reduce(s0, { type: "MINIGAME", id: "quiz", result: "decline" })).toBe(s0);
    const answered = E.reduce(s0, { type: "MINIGAME", id: "metro", result: "decline" });
    expect(E.reduce(answered, { type: "MINIGAME", id: "metro", result: { lives: 3 } })).toBe(answered);
    const quizzed = E.reduce(s0, { type: "MINIGAME", id: "quiz", result: { correct: 2 } });
    expect(E.reduce(quizzed, { type: "MINIGAME", id: "quiz", result: { correct: 3 } })).toBe(quizzed);
    const training = E.createMatch([{ characterId: "aoi", dreamId: "cafe" }], 7, true, { training: true });
    expect(E.reduce(training, { type: "MINIGAME", id: "quiz", result: { correct: 3 } })).toBe(training);
  });
});

describe("old saves and Player.minigames (batch 5 hydrate)", () => {
  it("keeps metroTurn / quizTurn of an old save: the due offer stays due, once", () => {
    const s = E.hydrate(save("old-metro-quiz-turns.save.json"));
    expect(E.cur(s).metroTurn).toBe(10);
    expect(E.cur(s).quizTurn).toBe(19);
    expect(E.cur(s).minigames).toBeUndefined();
    expect(metroOfferTurn(s)).toBe(20);
    expect(E.quizOpen(E.cur(s))).toBe(true);
    const after = E.reduce(s, { type: "MINIGAME", id: "metro", result: "decline" });
    expect(metroOfferTurn(after)).toBeNull();
    expect(metroOfferTurn(E.hydrate(JSON.parse(json(after))))).toBeNull();
  });

  it("an already answered offer is not offered again after load (no duplicate offer)", () => {
    const s = E.hydrate(save("old-metro-answered.save.json"));
    expect(E.cur(s).metroTurn).toBe(20);
    expect(metroOfferTurn(s)).toBeNull();
    expect(E.reduce(s, { type: "METRO", result: "run", lives: 3 })).toBe(s);
  });

  it("moves the first build's table-wide metroTurn to the player", () => {
    const s = E.hydrate(save("old-table-metro-turn.save.json"));
    expect(E.cur(s).metroTurn).toBe(20);
    expect((s as unknown as { metroTurn?: number }).metroTurn).toBeUndefined();
    expect(metroOfferTurn(s)).toBeNull();
  });

  it("folds metro / quiz markers from Player.minigames, keeps other ids, drops bad entries", () => {
    const s = E.hydrate(save("minigames-field.save.json"));
    const p = E.cur(s);
    expect(p.metroTurn).toBe(20);
    expect(p.quizTurn).toBe(19);
    expect(p.minigames).toEqual({ "delivery-run": 12 });
    expect(metroOfferTurn(s)).toBeNull();
  });

  it("legacy fields win over Player.minigames for metro / quiz", () => {
    const raw = save("old-metro-quiz-turns.save.json");
    raw.players[0] = { ...raw.players[0]!, minigames: { metro: 20, quiz: 21 } };
    const p = E.cur(E.hydrate(raw));
    expect(p.metroTurn).toBe(10);
    expect(p.quizTurn).toBe(19);
    expect(p.minigames).toBeUndefined();
  });

  it("is idempotent: migrated then re-hydrated (and through JSON) gives the same state", () => {
    for (const f of readdirSync(SAVES).filter((x) => x.endsWith(".save.json")).sort()) {
      const once = E.hydrate(save(f));
      expect(json(E.hydrate(once)), f).toBe(json(once));
      expect(json(E.hydrate(JSON.parse(json(once)) as GameState)), f).toBe(json(once));
    }
  });

  it("older saves hydrate without a minigames key at all", () => {
    const s = E.hydrate(save("old-metro-quiz-turns.save.json"));
    expect(json(s)).not.toContain('"minigames"');
  });
});
