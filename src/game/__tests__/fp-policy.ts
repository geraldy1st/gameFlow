/**
 * Engine fingerprint play policies (refacto batch 5bis), shared by the fingerprint tests.
 *
 * - "v1": the original policy (ROLL / CHOICE / BORROW / SELL / REPAY / LIFE / QUIZ / METRO / ENTER / DREAM / RETIRE),
 *   identical to engine-fingerprint.test.ts and Crypto's engine-fp.mjs: c5b22799e4ee85a3. Kept as a regression.
 * - "v2": v1 plus the goods / home / circle actions at a low weight (6 % of idle steps that v1 would ROLL), so
 *   BUY_GOOD, BUY_CLOTH, WEAR, BUY_HOME, TOGGLE_HOME, HOUSE, CIRCLE and SKIP_TRAINING are covered.
 *   Every 10th seed of v2 / goods starts as a tutorial game (createMatch …, { training: true }).
 * - "goods": the same extra actions at a strong weight (50 %), to catch any goods / home rule change.
 *
 * v2 and goods only draw extra random numbers inside their own extra branch, so v1 consumes the stream exactly as
 * before. Same code as /workspace/home-plan/engine-fp-policy.patch for Crypto's engine-fp.mjs (keep them aligned).
 * Ids are written out (not read from tuning.ts) so Crypto's script, which bundles engine.ts alone, uses the same ones.
 */
import { createHash } from "node:crypto";

export type PolicyName = "v1" | "v2" | "goods";

export const POLICY_EXTRA_WEIGHT: Record<PolicyName, number> = { v1: 0, v2: 0.06, goods: 0.5 };

export const FP_GOODS = ["bike", "scooter", "kei", "duplex", "book", "gym", "canvas", "atelier", "nope"];
export const FP_CLOTHES = ["tee", "shorts", "jog", "night", "shirt", "jeans"];
export const FP_HOME = ["lamp", "plant", "sofa", "desk", "charm", "nope"];

interface Engine {
  createMatch: (picks: { characterId: string; dreamId: string }[], seed: number, muted: boolean, opts?: { training?: boolean }) => any;
  reduce: (s: any, a: any) => any;
  cur: (s: any) => any;
  unlocked: (p: any) => boolean;
}

const h = (o: unknown) => createHash("sha1").update(JSON.stringify(o)).digest("hex").slice(0, 16);

export function prng(seed: number) {
  let x = seed >>> 0 || 1;
  return () => {
    x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0;
    return x / 4294967296;
  };
}

const CH = ["aoi", "ren", "mio", "sora"], DR = ["cafe", "studio", "retreat", "scholar"];

/** One extra action (v2 / goods), drawn from `rnd`. */
export function extraAction(rnd: () => number, p: any): unknown {
  const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)]!;
  switch (Math.floor(rnd() * 8)) {
    case 0: return { type: "BUY_GOOD", id: pick(FP_GOODS) };
    case 1: return { type: "BUY_CLOTH", outfit: pick(FP_CLOTHES) };
    case 2: return { type: "WEAR", outfit: pick(FP_CLOTHES) };
    case 3: return { type: "BUY_HOME", id: pick(FP_HOME) };
    case 4: return { type: "TOGGLE_HOME", id: pick(FP_HOME) };
    case 5: return { type: "HOUSE" };
    case 6: return { type: "CIRCLE", friendId: p.friends?.length ? pick(p.friends as { id: string }[]).id : "nobody" };
    default: return { type: "SKIP_TRAINING" };
  }
}

export function playGame(E: Engine, seed: number, policy: PolicyName) {
  const w = POLICY_EXTRA_WEIGHT[policy];
  const rnd = prng(seed * 31 + 7);
  // v2 / goods: every 10th seed is a tutorial game, so SKIP_TRAINING and the training refusals are exercised.
  const training = w > 0 && seed % 10 === 0;
  let s = training
    ? E.createMatch([{ characterId: CH[seed % 4]!, dreamId: DR[(seed >> 2) % 4]! }], seed, true, { training: true })
    : E.createMatch([{ characterId: CH[seed % 4]!, dreamId: DR[(seed >> 2) % 4]! }], seed, true);
  const acc = createHash("sha1");
  let i = 0, states = 0;
  const counts: Record<string, number> = {};
  while (i++ < 1500 && s.phase !== "win") {
    const p = E.cur(s);
    let a: any;
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
      else if (w > 0 && r < 0.18 + w) a = extraAction(rnd, p);
      else a = { type: "ROLL" };
    } else if (s.phase === "rolling") a = { type: "REVEAL" };
    else if (s.phase === "moving") a = { type: "STEP" };
    else if (s.phase === "pass") a = { type: "READY" };
    else if (s.phase === "broke") a = { type: "BREATHE" };
    else a = { type: "ROLL" };
    const before = s;
    s = E.reduce(s, a);
    if (s !== before) counts[a.type] = (counts[a.type] ?? 0) + 1;
    acc.update(JSON.stringify(s));
    states++;
  }
  return { chain: acc.digest("hex").slice(0, 16), final: h(s), journal: h(s.history), states, counts };
}

/** 200 seeded games: total states, chain of chains, and how many actions of each type changed the state. */
export function fingerprint(E: Engine, policy: PolicyName, games = 200) {
  const all = Array.from({ length: games }, (_, k) => playGame(E, k + 1, policy));
  const effective: Record<string, number> = {};
  for (const g of all) for (const [t, n] of Object.entries(g.counts)) effective[t] = (effective[t] ?? 0) + n;
  return { games, states: all.reduce((n, g) => n + g.states, 0), chainAll: h(all.map((g) => g.chain)), effective };
}
