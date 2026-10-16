/**
 * Refactor guard (PLAN.md batch 0): the engine must behave bit for bit the same while it is split into modules.
 *
 * Same oracle as Crypto's recette script (gameflow-recette/deadcode/scripts/engine-fp.mjs): 200 seeded games,
 * the same xorshift policy (ROLL / CHOICE / BORROW / SELL / REPAY / LIFE / QUIZ / METRO / ENTER / DREAM / RETIRE),
 * SHA-1 of every state, chain of the 200 game chains. Both must print the same value
 * (c5b22799e4ee85a3 on main 24b5a39 … 6ac2294; 844f62971aa0030a since the payday invite).
 * Also: hydrate of the repo's save fixtures, and the public export list of src/game/engine.ts.
 *
 * A deliberate behaviour change updates EXPECTED here, in its own commit, with the reason.
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import * as E from "./engine";
import type { Action, GameState } from "./engine";

// payday-friends (Oct 2026): the payday invite (docs/tutorial/RULES.md §14) changes the rules on purpose.
// Before: 102806 states, c5b22799e4ee85a3.
const EXPECTED = {
  games: 200,
  states: 93335,
  chainAll: "844f62971aa0030a",
};

const HERE = dirname(fileURLToPath(import.meta.url));
const h = (o: unknown) => createHash("sha1").update(JSON.stringify(o)).digest("hex").slice(0, 16);

function prng(seed: number) {
  let x = seed >>> 0 || 1;
  return () => {
    x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0;
    return x / 4294967296;
  };
}

const CH = ["aoi", "ren", "mio", "sora"], DR = ["cafe", "studio", "retreat", "scholar"];

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
      else if (r < 0.16) a = { type: "QUIZ", correct: Math.floor(rnd() * 6), creative: Math.floor(rnd() * 2) };
      else if (r < 0.18) a = { type: "METRO", result: rnd() < 0.5 ? "decline" : "run", lives: Math.floor(rnd() * 4) };
      else a = { type: "ROLL" };
    } else if (s.phase === "rolling") a = { type: "REVEAL" };
    else if (s.phase === "moving") a = { type: "STEP" };
    else if ((s.phase as string) === "pass") a = { type: "READY" }; // kept for parity with Crypto's oracle
    else if (s.phase === "broke") a = { type: "BREATHE" };
    else a = { type: "ROLL" };
    s = E.reduce(s, a as Action);
    acc.update(JSON.stringify(s));
    states++;
  }
  return { chain: acc.digest("hex").slice(0, 16), final: h(s), journal: h(s.history), states };
}

/** Public surface of engine.ts (values and types), resolved through re-exports so a barrel file gives the same list. */
function exportList(): string[] {
  const file = join(HERE, "engine.ts");
  const program = ts.createProgram([file], { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, noEmit: true, skipLibCheck: true });
  const checker = program.getTypeChecker();
  const sym = checker.getSymbolAtLocation(program.getSourceFile(file)!)!;
  return checker.getExportsOfModule(sym).map((s) => s.getName()).sort();
}

describe("engine fingerprint (refactor guard)", () => {
  it("200 seeded games give the same chain as Crypto's oracle", () => {
    const games = Array.from({ length: 200 }, (_, k) => play(k + 1));
    const chainAll = h(games.map((g) => g.chain));
    const states = games.reduce((n, g) => n + g.states, 0);
    expect({ games: games.length, states, chainAll }).toEqual(EXPECTED);
    // Final states and journals, per game, as a snapshot (diff shows which seed moved).
    expect(Object.fromEntries(games.map((g, k) => [k + 1, `${g.final} ${g.journal}`]))).toMatchSnapshot();
  }, 120_000);

  it("hydrate of the repo save fixtures is unchanged", () => {
    const dir = join(HERE, "__tests__");
    const out: Record<string, string> = {};
    for (const f of readdirSync(dir).filter((x) => x.endsWith(".fixture.json")).sort()) {
      out[f] = h(E.hydrate(JSON.parse(readFileSync(join(dir, f), "utf8")) as GameState));
    }
    expect(out).toMatchSnapshot();
  });

  it("the public export list of engine.ts is unchanged", () => {
    expect(exportList()).toMatchSnapshot();
    expect(Object.keys(E).sort()).toMatchSnapshot();
  }, 60_000);
});
