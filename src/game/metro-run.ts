/**
 * "Metro run" — optional 3-lane runner offered every 10 of a player's own turns (spec: Geraldy, 09/10/2026).
 *
 * Pure module, no DOM: the offer rule, the reward, and the runner itself (lanes, obstacles, distance, lives,
 * outcome). The canvas UI (components/game/boite/MetroRun.tsx) only renders this state and feeds it actions and
 * time; the engine only reads `metroOfferTurn` / `metroReward` and records the result (`METRO` action).
 *
 * Only type imports from engine.ts, so engine.ts can import this module without a runtime cycle.
 */
import type { GameState } from "./engine";

/* ------------------------------------------------------------------ offer & reward */

/** An offer every 10 of a player's own finished turns (Player.turns), i.e. at their turns 10, 20, 30... */
export const METRO_EVERY = 10;
export const METRO_LIVES = 3;
export const METRO_REWARD_FULL = 500;
export const METRO_REWARD_HURT = 250;
/**
 * Solo only: when the turn after a multiple of 10 opens on "broke" or on a rest card, the offer waits for the next
 * idle start, at most this many turns later; after that it is simply gone (an old save loaded at turn 57 is not
 * offered the run of turn 50).
 */
const SOLO_GRACE = 2;

type OfferState = Pick<GameState, "screen" | "phase" | "players" | "current" | "training" | "intro"> & {
  practice?: boolean;
};

/**
 * The multiple of 10 of the active player's own turns whose metro offer is due right now, or null.
 *
 * Counted per player (Player.turns, decided by Geraldy 09/10/2026): every player gets their own offer after their
 * own turns 10, 20, 30... `Player.turns` counts the turns a player has started (the current one included). Their
 * turn N is over when:
 * - hot-seat: phase "pass" (before the next player takes the table) with turns === N; the active player
 *   (`current`) is the one who just played and gets the offer;
 * - solo: the engine already opened turn N + 1 (turns === N + 1), phase "idle" (before the first roll).
 * Never during the tutorial / practice games, on a card, broke, win, or after this player answered the offer for N
 * (`Player.metroTurn`, optional: absent in old saves = never offered).
 */
export function metroOfferTurn(s: OfferState): number | null {
  if (s.screen !== "play" || s.practice === true || s.training || s.intro || !s.players?.length) return null;
  const p = s.players[s.current];
  if (!p || typeof p.turns !== "number") return null;
  const done = typeof p.metroTurn === "number" ? p.metroTurn : 0;
  if (s.players.length > 1) {
    if (s.phase !== "pass") return null;
    const n = p.turns;
    return n > 0 && n % METRO_EVERY === 0 && done < n ? n : null;
  }
  if (s.phase !== "idle") return null;
  const ended = p.turns - 1;
  const n = ended - (ended % METRO_EVERY);
  return n > 0 && ended - n <= SOLO_GRACE && done < n ? n : null;
}

/** Cash for a finished run: 500 with no life lost, 250 after a hit, nothing on a failed run. */
export function metroReward(lives: number): number {
  const l = Math.max(0, Math.min(METRO_LIVES, Math.floor(lives)));
  if (l <= 0) return 0;
  return l === METRO_LIVES ? METRO_REWARD_FULL : METRO_REWARD_HURT;
}

/* ------------------------------------------------------------------ runner */
/*
 * Pure runner, tuned on Mirage's validated mockup (gameflow-bc/runner/runner.js, SPEC-NOTES.md). Units: metres,
 * seconds. No DOM: the skin (rendering), the audio and the React shell only read this state.
 */

export type Lane = 0 | 1 | 2;
/** walker: passer-by carrying a plank (slide under, or change lane; jumping hits the plank) ·
 *  cop: blocks the whole lane (change lane only) · barrier: works fence ≈ 1 m (jump over, or change lane). */
export type ObstacleKind = "walker" | "cop" | "barrier";
/** gauche / droite / saute / glisse */
export type MetroAction = "left" | "right" | "jump" | "slide";
export type RunOutcome = "running" | "won" | "lost";
/** count: "Ready? / Run!" · run · enter: going down the metro stairs · fall: out of lives · done: show the result. */
export type RunPhase = "count" | "run" | "enter" | "fall" | "done";

export const RUN = {
  laneW: 1.7,
  /** Metres to the threshold of the metro entrance. */
  length: 260,
  /** 8 → 11.5 m/s at +0.13 m/s² (cap reached at ≈ 26.9 s); ≈ 26.7 s clean run, ≈ 27.3 s with one hit. */
  speed0: 8,
  speedMax: 11.5,
  accel: 0.13,
  laneTime: 0.15,
  jump: 0.62,
  jumpH: 1.25,
  slide: 0.45,
  invuln: 0.6,
  /** A hit pushes back 4 m over 0.25 s in the same lane (controls ignored meanwhile)… */
  knock: 4,
  knockTime: 0.25,
  /** …then the speed comes back from ×0.5 to ×1 over 0.6 s. */
  stumble: 0.6,
  /** Half depth of the runner's body, and "same lane" = |x − lane centre| < 0.45 lane (0.77 m). */
  halfDepth: 0.3,
  laneHit: 0.45,
  /** Feet above 0.55 m clear the barrier (≈ 0.46 s of the 0.62 s jump). */
  barrierClear: 0.55,
  /** The walker's plank, metres above the street (slide under it). */
  plank: [1.25, 1.42] as const,
  depth: { walker: 0.6, cop: 0.6, barrier: 0.4 } as Record<ObstacleKind, number>,
  firstRow: 30,
  endClear: 28,
  /** Seconds of running between two rows, start → end of the street, +0.5 s breather every 6 rows. */
  gapT0: 1.45,
  gapT1: 1.0,
  doubleP: 0.45,
  breatherEvery: 6,
  breatherT: 0.5,
  countdown: 1.2,
  enterTime: 1.6,
  fallTime: 1.3,
  /** Fixed physics step, seconds (rendering frames are cut into these). */
  step: 1 / 120,
  /** Validated level (17 rows, 24 obstacles). */
  seed: 1008,
} as const;

export interface Obstacle {
  id: number;
  row: number;
  lane: Lane;
  /** Distance from the start of the street to the front of the obstacle, metres. */
  z: number;
  kind: ObstacleKind;
  depth: number;
  /** Side it falls to when hit (rendering only). */
  side: -1 | 1;
  /** Hit once: never hits again. */
  hit: boolean;
  /** Behind the runner (or crossed while invulnerable). */
  passed: boolean;
}

export interface RunState {
  phase: RunPhase;
  /** Seconds in the current phase (count / enter / fall). */
  phaseT: number;
  /** Clock, seconds (pauses excluded). */
  t: number;
  /** Seconds of actual running (drives the speed). */
  runT: number;
  /** Distance run, metres (goes back on a hit). */
  z: number;
  /** Distance covered by the legs (animation only). */
  runDist: number;
  /** Lateral position, metres (lane centres at −1.7 / 0 / +1.7). */
  x: number;
  lane: Lane;
  /** Lateral position when the last lane change started, and seconds since. */
  laneFrom: number;
  laneT: number;
  /** Seconds into the jump / slide, −1 when not jumping / sliding. */
  jumpT: number;
  slideT: number;
  invuln: number;
  knock: number;
  stumble: number;
  lives: number;
  length: number;
  obstacles: Obstacle[];
  outcome: RunOutcome;
  hits: number;
  lastHit: ObstacleKind | null;
}

/** mulberry32, same as the mockup. */
function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export const laneX = (l: number): number => (l - 1) * RUN.laneW;
export const speedAt = (t: number): number => Math.min(RUN.speedMax, RUN.speed0 + RUN.accel * t);

/** Time to reach z without a hit. */
function zToTime(z: number): number {
  const tc = (RUN.speedMax - RUN.speed0) / RUN.accel;
  const zc = RUN.speed0 * tc + 0.5 * RUN.accel * tc * tc;
  if (z <= zc) return (-RUN.speed0 + Math.sqrt(RUN.speed0 * RUN.speed0 + 2 * RUN.accel * z)) / RUN.accel;
  return tc + (z - zc) / RUN.speedMax;
}

const KINDS: ObstacleKind[] = ["walker", "cop", "barrier"];
const INTRO: ObstacleKind[] = ["barrier", "walker", "cop"];

/**
 * The street (port of the mockup's buildLevel): first row at 30 m, nothing in the last 28 m. The first three rows
 * teach one type each in the middle lane (barrier, walker, cop). Then 1 obstacle, or 2 with p = 0.45, never 3 and
 * never two in one lane, so one lane is always free; two cops in a row: the second becomes a barrier or a walker.
 * Rows are 1.45 s → 1.0 s of running apart, +0.5 s breather every 6 rows. Deterministic for a seed.
 */
export function generateObstacles(seed: number = RUN.seed, length: number = RUN.length): Obstacle[] {
  const R = prng(seed);
  const out: Obstacle[] = [];
  let z: number = RUN.firstRow;
  let i = 0;
  let lastTypes: ObstacleKind[] = [];
  while (z <= length - RUN.endClear) {
    const items: { lane: Lane; kind: ObstacleKind }[] = [];
    if (i < 3) items.push({ lane: 1, kind: INTRO[i]! });
    else {
      const n = R() < RUN.doubleP ? 2 : 1;
      const lanes = ([0, 1, 2] as Lane[]).sort(() => R() - 0.5).slice(0, n);
      for (const lane of lanes) {
        let kind: ObstacleKind;
        let guard = 0;
        do {
          kind = KINDS[Math.min(2, Math.floor(R() * 3))]!;
          guard++;
        } while (guard < 6 && lastTypes.length >= 2 && lastTypes.every((k) => k === kind) && n === 1);
        items.push({ lane, kind });
      }
      if (n === 2 && items[0]!.kind === "cop" && items[1]!.kind === "cop") items[1]!.kind = R() < 0.5 ? "barrier" : "walker";
    }
    lastTypes = [items[0]!.kind, ...lastTypes].slice(0, 2);
    for (const it of items) {
      out.push({ ...it, id: out.length, row: i, z, depth: RUN.depth[it.kind], side: R() < 0.5 ? -1 : 1, hit: false, passed: false });
    }
    const p = z / length;
    let gapT = lerp(RUN.gapT0, RUN.gapT1, p);
    if (i > 2 && (i + 1) % RUN.breatherEvery === 0) gapT += RUN.breatherT;
    z += speedAt(zToTime(z)) * gapT;
    i++;
  }
  return out;
}

export function newRun(seed: number = RUN.seed, length: number = RUN.length): RunState {
  return {
    phase: "count",
    phaseT: 0,
    t: 0,
    runT: 0,
    z: 0,
    runDist: 0,
    x: 0,
    lane: 1,
    laneFrom: 0,
    laneT: 1,
    jumpT: -1,
    slideT: -1,
    invuln: 0,
    knock: 0,
    stumble: 0,
    lives: METRO_LIVES,
    length,
    obstacles: generateObstacles(seed, length),
    outcome: "running",
    hits: 0,
    lastHit: null,
  };
}

/** Height of the feet, metres (parabolic jump). */
export function jumpY(s: Pick<RunState, "jumpT">): number {
  if (s.jumpT < 0) return 0;
  const u = Math.min(1, s.jumpT / RUN.jump);
  return 4 * RUN.jumpH * u * (1 - u);
}
export const sliding = (s: Pick<RunState, "slideT">): boolean => s.slideT >= 0;
export function currentSpeed(s: Pick<RunState, "runT" | "stumble">): number {
  return speedAt(s.runT) * (s.stumble > 0 ? lerp(1, 0.5, s.stumble / RUN.stumble) : 1);
}

/** gauche / droite (bounded 0..2) / saute / glisse. Ignored outside the run and during the knock-back. */
export function act(s: RunState, a: MetroAction): RunState {
  if (s.phase !== "run" || s.knock > 0) return s;
  switch (a) {
    case "left":
    case "right": {
      const to = clamp(s.lane + (a === "left" ? -1 : 1), 0, 2) as Lane;
      return to === s.lane ? s : { ...s, laneFrom: s.x, lane: to, laneT: 0 };
    }
    case "jump":
      // jumping during a slide cancels the slide
      return s.jumpT >= 0 ? s : { ...s, slideT: -1, jumpT: 0 };
    case "slide":
      // sliding in the air cuts the jump
      return s.slideT >= 0 ? s : { ...s, jumpT: -1, slideT: 0 };
  }
}

/** True when the gesture in progress gets past this obstacle in its lane. */
export function clears(kind: ObstacleKind, s: Pick<RunState, "jumpT" | "slideT">): boolean {
  if (kind === "barrier") return jumpY(s) > RUN.barrierClear; // feet above the fence (sliding fails)
  if (kind === "walker") return sliding(s); // under the plank (jumping hits it)
  return false; // cop: only another lane
}

function runStep(s0: RunState, dt: number): RunState {
  const s: RunState = { ...s0, runT: s0.runT + dt };
  if (s.knock > 0) {
    const k = Math.min(dt, s.knock);
    s.z -= (RUN.knock / RUN.knockTime) * k;
    s.knock -= k;
  } else {
    const v = currentSpeed(s);
    s.z += v * dt;
    s.runDist += v * dt;
  }
  s.stumble = Math.max(0, s.stumble - dt);
  s.invuln = Math.max(0, s.invuln - dt);
  s.laneT += dt;
  s.x = lerp(s.laneFrom, laneX(s.lane), easeOut(clamp(s.laneT / RUN.laneTime, 0, 1)));
  if (s.jumpT >= 0) {
    s.jumpT += dt;
    if (s.jumpT >= RUN.jump) s.jumpT = -1;
  }
  if (s.slideT >= 0) {
    s.slideT += dt;
    if (s.slideT >= RUN.slide) s.slideT = -1;
  }
  // collisions: body [z − 0.3, z + 0.3] against [o.z, o.z + depth], same lane = within 0.77 m of its centre
  const a = s.z - RUN.halfDepth;
  const b = s.z + RUN.halfDepth;
  let obstacles = s.obstacles;
  const mark = (id: number, patch: Partial<Obstacle>) => {
    obstacles = obstacles.map((o) => (o.id === id ? { ...o, ...patch } : o));
  };
  let hitBy: Obstacle | null = null;
  for (const o of s.obstacles) {
    if (o.hit || o.passed) continue;
    if (o.z + o.depth < a) {
      mark(o.id, { passed: true });
      continue;
    }
    if (o.z > b) continue;
    if (Math.abs(s.x - laneX(o.lane)) > RUN.laneW * RUN.laneHit) continue;
    if (clears(o.kind, s)) continue;
    if (s.invuln > 0) {
      mark(o.id, { passed: true });
      continue;
    }
    hitBy = o;
    break;
  }
  s.obstacles = obstacles;
  if (hitBy) {
    mark(hitBy.id, { hit: true });
    s.obstacles = obstacles;
    s.lives -= 1;
    s.hits += 1;
    s.lastHit = hitBy.kind;
    s.knock = RUN.knockTime;
    s.invuln = RUN.invuln;
    s.stumble = RUN.stumble;
    s.jumpT = -1;
    s.slideT = -1;
    // same lane: snap to the nearest lane without changing it
    s.lane = clamp(Math.round(s.x / RUN.laneW) + 1, 0, 2) as Lane;
    s.laneFrom = s.x;
    s.laneT = 0;
    if (s.lives <= 0) {
      s.phase = "fall";
      s.phaseT = 0;
      s.outcome = "lost";
    }
    return s;
  }
  if (s.z >= s.length) {
    s.phase = "enter";
    s.phaseT = 0;
    s.jumpT = -1;
    s.slideT = -1;
    s.outcome = "won";
  }
  return s;
}

function tick(s: RunState, dt: number): RunState {
  const n = { ...s, t: s.t + dt };
  switch (n.phase) {
    case "count":
      n.phaseT += dt;
      if (n.phaseT >= RUN.countdown) {
        n.phase = "run";
        n.phaseT = 0;
      }
      return n;
    case "run":
      return runStep(n, dt);
    case "enter": {
      n.phaseT += dt;
      const v = lerp(currentSpeed(n), 4, clamp(n.phaseT / 0.8, 0, 1));
      n.z += v * dt;
      n.runDist += v * dt;
      if (n.phaseT >= RUN.enterTime) n.phase = "done";
      return n;
    }
    case "fall":
      n.phaseT += dt;
      if (n.phaseT >= RUN.fallTime) n.phase = "done";
      return n;
    default:
      return s;
  }
}

/** Advances the run by `dt` seconds (cut into fixed steps; a long frame is capped at 0.1 s). */
export function advanceRun(s: RunState, dt: number): RunState {
  let left = Math.min(Math.max(0, dt), 0.1);
  let n = s;
  while (left > 1e-9 && n.phase !== "done") {
    const h = Math.min(RUN.step, left);
    n = tick(n, h);
    left -= h;
  }
  return n;
}

/**
 * The mockup's autopilot (tests, hidden dev demo): reads the real state and plays the same gestures as a player.
 * `miss`: encounter ranks (0 = first obstacle met in the runner's lane) deliberately ignored, to take a hit.
 * Returns a stateful bot: call it after every frame, play the returned action.
 */
export function makeAutopilot(opts: { miss?: number[] } = {}): (s: RunState) => MetroAction | null {
  let pending: Lane | null = null;
  let lastHits = 0;
  const done = new Set<number>();
  const seen = new Map<number, number>();
  return (s) => {
    if (s.phase !== "run") return null;
    if (s.hits !== lastHits) {
      lastHits = s.hits;
      pending = null;
    }
    if (s.knock > 0) return null;
    const v = currentSpeed(s);
    if (pending !== null && s.laneT >= RUN.laneTime && s.lane !== pending) return pending < s.lane ? "left" : "right";
    if (pending === s.lane && s.laneT >= RUN.laneTime) pending = null;
    const ahead = s.obstacles.filter((o) => !o.hit && !o.passed && o.z + o.depth > s.z - RUN.halfDepth && o.z - s.z < v * 1.2 + 3);
    const mine = ahead.filter((o) => o.lane === (pending ?? s.lane)).sort((p, q) => p.z - q.z)[0];
    if (!mine || done.has(mine.id)) return null;
    const d = mine.z + mine.depth / 2 - s.z;
    if (!seen.has(mine.id)) seen.set(mine.id, seen.size);
    if (opts.miss?.includes(seen.get(mine.id)!)) {
      done.add(mine.id);
      return null;
    }
    if (mine.kind === "cop") {
      if (d > v * 0.7) return null;
      const row = s.obstacles.filter((o) => Math.abs(o.z - mine.z) < 0.5);
      const next = s.obstacles.filter((o) => o.z > mine.z + 1 && o.z < mine.z + v * 1.6);
      const free = ([0, 1, 2] as Lane[]).filter((l) => !row.some((o) => o.lane === l));
      free.sort((l1, l2) => Math.abs(l1 - s.lane) - Math.abs(l2 - s.lane) || next.filter((o) => o.lane === l1).length - next.filter((o) => o.lane === l2).length);
      const target = free[0];
      if (target === undefined) return null;
      pending = target;
      done.add(mine.id);
      return target < s.lane ? "left" : "right";
    }
    if (mine.kind === "barrier") {
      if (d > v * 0.31) return null;
      done.add(mine.id);
      return "jump";
    }
    if (d > v * 0.2) return null;
    done.add(mine.id);
    return "slide";
  };
}

/** The opposite bot: always the wrong gesture (jump at a walker's plank, slide at a barrier, stay in front of a cop). */
export function wrongGestures(s: RunState): MetroAction | null {
  if (s.phase !== "run" || s.knock > 0) return null;
  const v = currentSpeed(s);
  const mine = s.obstacles.find((o) => !o.hit && !o.passed && o.lane === s.lane && o.z + o.depth / 2 - s.z > 0 && o.z + o.depth / 2 - s.z < v * 0.2);
  if (!mine || mine.kind === "cop") return null;
  if (mine.kind === "walker") return s.jumpT >= 0 ? null : "jump";
  return s.slideT >= 0 ? null : "slide";
}
