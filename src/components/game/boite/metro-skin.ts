/**
 * Metro run — skin interface. A skin draws the street, the obstacles, the runner and the effects from the pure
 * RunState (src/game/metro-run.ts) and brings its own music; the gameplay never depends on it. One skin today
 * ("Shibuya by day", metro-skin-shibuya.ts, after Mirage's mockup); another one (e.g. motorbike delivery) only has
 * to implement RunnerSkin.
 */
import type { RunState } from "@/game/metro-run";

export interface FaceSet {
  idle: HTMLImageElement | null;
  happy: HTMLImageElement | null;
  stressed: HTMLImageElement | null;
}

/** Translated words painted in the scene. */
export interface SkinLabels {
  metro: string;
  line: string;
  ready: string;
  go: string;
  ding: string;
  stop: string;
  bonk: string;
  oops: string;
}

/** Comic words (hit "BONK!", "DING!" at the entrance). */
export interface Fx {
  kind: "bam" | "word";
  word: string;
  age: number;
  life: number;
  color?: string;
}

/** Firework spark, in fractions of the view (u, v). */
export interface Spark {
  u: number;
  v: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  col: string;
  r: number;
  fixed?: boolean;
}

export interface Camera {
  x: number;
  z: number;
}

export interface DrawInput {
  state: RunState;
  cam: Camera;
  reduced: boolean;
  faces: FaceSet;
  /** Simple body variant for the portrait (skirt or trousers). */
  skirt: boolean;
  labels: SkinLabels;
  fx: Fx[];
  sparks: Spark[];
  /** Seconds left of the hit shake / white flash / red vignette. */
  shake: number;
  flash: number;
  vign: number;
  /** Window height, px (the runner keeps a fixed size on screen). */
  viewportH: number;
}

export interface SkinMusic {
  bpm: number;
  /** MIDI notes of the scale, root note, melody in scale degrees (−1 = rest). */
  scale: number[];
  root: number;
  melody: number[];
}

export interface RunnerSkin {
  id: string;
  music: SkinMusic;
  /** Camera follow (visual only). */
  follow(cam: Camera, s: RunState, dt: number, reduced: boolean): Camera;
  draw(ctx: CanvasRenderingContext2D, w: number, h: number, input: DrawInput): void;
  /** Small animated picture for the offer card (the end of the street, the metro entrance). */
  drawPanel(ctx: CanvasRenderingContext2D, w: number, h: number, time: number, input: { reduced: boolean; labels: SkinLabels }): void;
}

/* ---------------------------------------------------------------- shared effects (skin-independent) */

const noise = (i: number) => {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

export const FIREWORK_COLOURS = ["#FFC745", "#3DDC97", "#FF8A73", "#6C4AB6", "#8FD3FF", "#FFF6E5"];
const SPOTS = [
  [0.16, 0.16],
  [0.84, 0.14],
  [0.5, 0.08],
  [0.1, 0.3],
  [0.9, 0.26],
  [0.5, 0.18],
];
/** Seconds after the win when each of the 6 bursts goes off. */
export const FIREWORK_MARKS = [0.05, 0.32, 0.55, 0.82, 1.1, 1.4];

export function fireworkBurst(index: number, rnd: () => number = Math.random): Spark[] {
  const spot = SPOTS[index % SPOTS.length]!;
  const u = spot[0]! + (rnd() - 0.5) * 0.06;
  const v = spot[1]! + (rnd() - 0.5) * 0.04;
  const col = FIREWORK_COLOURS[Math.floor(rnd() * FIREWORK_COLOURS.length)]!;
  const out: Spark[] = [];
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2 + rnd() * 0.15;
    const sp = 90 + rnd() * 160;
    out.push({ u, v, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, age: 0, life: 0.95 + rnd() * 0.4, col, r: 3.2 + rnd() * 2.4 });
  }
  return out;
}

/** Reduced motion: a few still sparkles instead of the bursts. */
export function staticSparkles(): Spark[] {
  return Array.from({ length: 18 }, (_, i) => ({
    u: 0.08 + noise(i) * 0.84,
    v: 0.06 + noise(i + 4) * 0.42,
    vx: 0,
    vy: 0,
    age: 0,
    life: 99,
    col: FIREWORK_COLOURS[i % 5]!,
    r: 3 + noise(i + 2) * 2.5,
    fixed: true,
  }));
}

export function updateSparks(sparks: Spark[], dt: number, w: number, h: number): Spark[] {
  for (const p of sparks) {
    if (p.fixed) continue;
    p.age += dt;
    p.u += (p.vx * dt) / Math.max(1, w);
    p.v += (p.vy * dt) / Math.max(1, h);
    p.vy += 150 * dt;
  }
  return sparks.filter((p) => p.age < p.life && p.v < 1.2);
}
