/**
 * Metro run — "Akihabara by night" skin, v6.1 (Mirage's mockup gameflow-bc/runner/runner.js v3–v6.1, approved by
 * Geraldy). Painted backdrop (far end of the street + two facades that scroll, wet reflections, neon flicker),
 * Geraldy's Drive sprites for the runner (run / left / right / jump / slide / hit / win / countdown clips) and the
 * obstacles (movers carrying a wardrobe, police officer), drawn barrier, gold coins, Japanese signs on poles, lamps,
 * bokeh and the metro entrance. Pure drawing: reads RunState, never changes it.
 *
 * Accessibility (Crypto R2): the neon flicker only changes state on NEON_STEP (1/3 s) boundaries, i.e. at most
 * 3 changes a second, and is off under reduced motion (static facades); the hit blink uses the same step.
 * Assets: public/game/scenes/metro/ (tools/metro-assets.py), fetched on first draw only (lazy chunk).
 */
import { RUN, currentSpeed, jumpY, laneX, sliding, type Coin, type Obstacle, type RunState } from "../runner";
import type { Camera, DrawInput, RunnerSkin, SkinLabels } from "./types";
import { cachedText } from "../glyphCache";

/** Seconds between two neon on/off decisions (≥ 333 ms: never more than 3 flashes a second). */
export const NEON_STEP = 1 / 3;
/** Same step for the invulnerability blink after a hit. */
export const BLINK_STEP = 1 / 3;

const C = { navy: "#1B2A41", cream: "#FFF6E5", paper: "#FFFBF2", gold: "#FFC745", mint: "#3DDC97", coral: "#FF8A73", plum: "#6C4AB6", brick: "#B8323C", sky: "#8FD3FF", ink: "#1F7A55" };
const FONT = "Fredoka, Nunito, sans-serif";
const JP = '"Noto Sans JP", "Hiragino Sans", "Yu Gothic", Fredoka, sans-serif';
const ZP = 4.2;
const CAM_FOLLOW = 0.72;
const FAR_K = 3.2;
const WALL_H = 12;
const WALK_W = 3.4;
const WALL_FAR = 46;
const AOI_H = RUN.bodyH;
const COIN_R = 0.24;
const RUN_STRIDE = 2.6;
const TURN_TIME = 0.33;
const GO_SHOW = 0.75;
const OBST: Partial<Record<Obstacle["kind"], { img: string; h: number }>> = { walker: { img: "demenageurs", h: 2.8 }, cop: { img: "policier", h: 1.9 } };

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const noise = (i: number) => {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/** Neon flicker amount for tube `k` at time `t` (0 = off). Piecewise constant on NEON_STEP; 0 under reduced motion. */
export function neonAmp(t: number, k: number, reduced: boolean): number {
  if (reduced) return 0;
  const step = Math.floor(t / NEON_STEP);
  if (noise(step + k * 13.1) > 0.93) return 0;
  return 0.1 + 0.08 * Math.sin(step * NEON_STEP * 2.3 + k * 1.7);
}
/** Runner opacity while invulnerable: 0.35 / 1 alternating every BLINK_STEP (reduced motion: a still 55 %). */
export function blinkAlpha(invuln: number, reduced: boolean): number {
  if (invuln <= 0) return 1;
  if (reduced) return 0.55;
  return Math.floor(invuln / BLINK_STEP) % 2 ? 0.35 : 1;
}

/* ------------------------------------------------------------------ assets (lazy) */
interface Sheet { n: number; w: number; h: number; cols: number; norm: number; bb: number[][]; img: HTMLImageElement; foot?: number }
const A: { started: boolean; ready: boolean; sheets: Record<string, Sheet>; bg: Record<string, HTMLImageElement>; obst: Record<string, HTMLImageElement> } = { started: false, ready: false, sheets: {}, bg: {}, obst: {} };
const BASE = "/game/scenes/metro/";
function img(src: string): HTMLImageElement {
  const im = new Image();
  im.decoding = "async";
  im.src = src;
  return im;
}
/** Starts the downloads (idempotent). Called by the run / offer on mount. */
export function loadNeonAssets(): void {
  if (A.started || typeof Image === "undefined") return;
  A.started = true;
  for (const n of ["far", "facade-left", "facade-right"]) A.bg[n] = img(`${BASE}bg/${n}.webp`);
  for (const n of ["demenageurs", "policier"]) A.obst[n] = img(`${BASE}obst/${n}.webp`);
  void fetch(`${BASE}anim/frames.json`)
    .then((r) => r.json())
    .then((j: Record<string, Omit<Sheet, "img">>) => {
      for (const [k, m] of Object.entries(j)) A.sheets[k] = { ...m, img: img(`${BASE}anim/${k}.webp`) };
      A.ready = true;
    })
    .catch(() => {});
}
const ok = (im?: HTMLImageElement) => !!im && im.complete && im.naturalWidth > 0;

/* ------------------------------------------------------------------ projection */
interface View { w: number; h: number; HY: number; F: number; CAMH: number; camX: number; camZ: number; portrait: boolean }
interface Pt { x: number; y: number; s: number }
type Ctx = CanvasRenderingContext2D;
function viewFor(w: number, h: number, camX: number, camZ: number): View {
  const portrait = h > w * 1.05;
  const HY = h * (portrait ? 0.3 : 0.36);
  const roadPx = portrait ? w * 1.4 : Math.min(w * 0.7, h * 1.2);
  const F = (roadPx * ZP) / (3 * RUN.laneW);
  const CAMH = ((h * (portrait ? 0.84 : 0.86) - HY) * ZP) / F;
  return { w, h, HY, F, CAMH, camX, camZ, portrait };
}
function P(V: View, x: number, y: number, z: number): Pt | null {
  const dz = z - V.camZ;
  if (dz < 0.25) return null;
  const s = V.F / dz;
  return { x: V.w / 2 + (x - V.camX) * s, y: V.HY + (V.CAMH - y) * s, s };
}
function quad(c: Ctx, V: View, pts: [number, number, number][], fill?: string, stroke?: string, lw?: number): boolean {
  const q = pts.map(([x, y, z]) => P(V, x, y, z));
  if (q.some((p) => !p)) return false;
  c.beginPath();
  q.forEach((p, i) => (i ? c.lineTo(p!.x, p!.y) : c.moveTo(p!.x, p!.y)));
  c.closePath();
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = lw || 2;
    c.lineJoin = "round";
    c.stroke();
  }
  return true;
}

/* ------------------------------------------------------------------ world */
const SIGNS = [
  { txt: "寿司", bg: "#FFFBF2" },
  { txt: "ラーメン", bg: "#FFC745" },
  { txt: "カラオケ", bg: "#FF8A73" },
  { txt: "コンビニ", bg: "#3DDC97" },
  { txt: "居酒屋", bg: "#FFC745" },
  { txt: "ブティック", bg: "#FFFBF2" },
];
interface Pole { side: -1 | 1; z: number; sign: number }
const poleCache = new Map<number, Pole[]>();
/** Japanese signs on poles at the kerb (the mockup's buildCity, one sign every other building). */
function poles(length: number): Pole[] {
  const hit = poleCache.get(length);
  if (hit) return hit;
  let a = (RUN.seed * 7 + 3) >>> 0;
  const R = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out: Pole[] = [];
  for (const side of [-1, 1] as const) {
    let z = -24;
    let n = 0;
    while (z < length + 60) {
      const w = 6.5 + R() * 5.5;
      R();
      R();
      const shop = n * 2 + (side < 0 ? 0 : 1);
      // mockup SIGNS alternate Latin / Japanese; only the Japanese ones are drawn (odd indexes)
      if (shop % 2 === 1) out.push({ side, z: z + 1.4, sign: ((shop - 1) / 2) % SIGNS.length });
      z += w + 0.6;
      n++;
    }
  }
  poleCache.set(length, out);
  return out;
}

function backdrop(c: Ctx, V: View, t: number, near: number, RW: number, SW: number, reduced: boolean) {
  const { w, h, HY } = V;
  c.fillStyle = "#151B33";
  c.fillRect(0, 0, w, h);
  const zEnd = V.camZ + WALL_FAR;
  const far = A.bg["far"];
  if (ok(far)) {
    const a = P(V, -SW, 0, zEnd);
    const b = P(V, SW, 0, zEnd);
    if (a && b) {
      const dw = (b.x - a.x) * FAR_K;
      const dh = (dw * far!.naturalHeight) / far!.naturalWidth;
      const fx = P(V, 0, V.CAMH, zEnd + 400) || { x: w / 2 };
      c.drawImage(far!, fx.x - 0.51 * dw, HY - 0.886 * dh, dw, dh);
    }
  }
  for (const [side, tex] of [[-1, A.bg["facade-left"]], [1, A.bg["facade-right"]]] as const) {
    if (!ok(tex)) continue;
    const x = side * SW;
    const TW = tex!.naturalWidth;
    const TH = tex!.naturalHeight;
    const WALL_L = (WALL_H * TW) / TH;
    const pf = P(V, x, 0, zEnd);
    if (!pf) continue;
    const COL = 2;
    const xEdge = side < 0 ? 0 : w;
    for (let sx = pf.x; side < 0 ? sx > xEdge - COL : sx < xEdge + COL; sx += side * COL) {
      const den = sx - w / 2;
      if (Math.abs(den) < 1) continue;
      const dz = ((x - V.camX) * V.F) / den;
      if (dz < 0.3 || dz > WALL_FAR + 0.5) continue;
      const z = V.camZ + dz;
      const s = V.F / dz;
      const yb = HY + V.CAMH * s;
      const yt = HY + (V.CAMH - WALL_H) * s;
      const u = ((((z / WALL_L) % 1) + 1) % 1) * TW;
      const dz2 = ((x - V.camX) * V.F) / (den + side * COL);
      const du = clamp((Math.abs(dz2 - dz) / WALL_L) * TW, 0.05, 6);
      const uu = side < 0 ? Math.min(u, TW - du) : Math.max(0, TW - u - du);
      const fade = clamp((WALL_FAR - dz) / 8, 0, 1);
      const cx = side < 0 ? sx - COL : sx;
      c.globalAlpha = fade;
      c.drawImage(tex!, uu, 0, du, TH, cx, yt, COL + 0.6, yb - yt);
      c.globalAlpha = fade * 0.32;
      c.save();
      c.translate(0, yb);
      c.scale(1, -0.45);
      c.drawImage(tex!, uu, TH * 0.45, du, TH * 0.55, cx, -(yb - yt) * 0.55, COL + 0.6, (yb - yt) * 0.55);
      c.restore();
      const amp = neonAmp(t, Math.floor(z / 3) + (side > 0 ? 97 : 0), reduced);
      if (amp > 0) {
        c.globalCompositeOperation = "lighter";
        c.globalAlpha = fade * amp;
        c.drawImage(tex!, uu, 0, du, TH * 0.75, cx, yt, COL + 0.6, (yb - yt) * 0.75);
        c.globalCompositeOperation = "source-over";
      }
    }
    c.globalAlpha = 1;
  }
  c.strokeStyle = "rgba(190,240,255,.16)";
  c.lineWidth = 1.2;
  for (let z = Math.floor(near / 2.5) * 2.5; z < V.camZ + 60; z += 2.5)
    for (const sd of [-1, 1]) {
      const a = P(V, sd * (RW + 0.2), 0, z);
      const b = P(V, sd * SW, 0, z);
      if (a && b) {
        c.beginPath();
        c.moveTo(a.x, a.y);
        c.lineTo(b.x, b.y);
        c.stroke();
      }
    }
}

function bokeh(c: Ctx, V: View, SW: number) {
  c.save();
  c.globalCompositeOperation = "lighter";
  const SPAN = 48;
  const cols = ["255,90,170", "80,220,255", "255,200,90", "170,120,255"];
  for (let i = 0; i < 14; i++) {
    const base = noise(i * 3.7) * SPAN;
    const z = V.camZ + 2 + ((((base - V.camZ) % SPAN) + SPAN) % SPAN);
    const p = P(V, (noise(i * 5.1) * 2 - 1) * SW * 0.95, 2.5 + noise(i * 9.3) * 6, z);
    if (!p) continue;
    const r = clamp(p.s * 0.35, 3, 60);
    const a = clamp((z - V.camZ - 2) / 6, 0, 1) * clamp((SPAN - (z - V.camZ)) / 10, 0, 1) * 0.22;
    const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    g.addColorStop(0, `rgba(${cols[i % 4]},${a})`);
    g.addColorStop(1, `rgba(${cols[i % 4]},0)`);
    c.fillStyle = g;
    c.beginPath();
    c.arc(p.x, p.y, r, 0, 7);
    c.fill();
  }
  c.restore();
}

function coin(c: Ctx, V: View, cn: Coin, t: number, reduced: boolean) {
  const p = P(V, laneX(cn.lane), cn.y, cn.z);
  if (!p) return;
  const r = COIN_R * p.s;
  if (r < 1.2) return;
  const fade = clamp((V.camZ + 70 - cn.z) / 12, 0, 1);
  const ang = reduced ? 0.35 : t * 5 + cn.id * 0.7;
  const sx = Math.max(0.12, Math.abs(Math.cos(ang)));
  c.save();
  c.globalAlpha = fade;
  c.globalCompositeOperation = "lighter";
  const gl = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2.4);
  gl.addColorStop(0, "rgba(255,200,80,.45)");
  gl.addColorStop(1, "rgba(255,200,80,0)");
  c.fillStyle = gl;
  c.beginPath();
  c.arc(p.x, p.y, r * 2.4, 0, 7);
  c.fill();
  c.globalCompositeOperation = "source-over";
  c.fillStyle = "#A8661A";
  c.beginPath();
  c.ellipse(p.x + r * 0.12 * Math.sign(Math.cos(ang) || 1), p.y, r * sx, r, 0, 0, 7);
  c.fill();
  const g = c.createLinearGradient(p.x - r, p.y - r, p.x + r, p.y + r);
  g.addColorStop(0, "#FFF2B0");
  g.addColorStop(0.35, "#FFC745");
  g.addColorStop(1, "#C98418");
  c.fillStyle = g;
  c.strokeStyle = "#6B3E0A";
  c.lineWidth = Math.max(1, r * 0.12);
  c.beginPath();
  c.ellipse(p.x, p.y, r * sx, r, 0, 0, 7);
  c.fill();
  c.stroke();
  if (sx > 0.35) {
    c.strokeStyle = "rgba(107,62,10,.55)";
    c.lineWidth = Math.max(0.8, r * 0.08);
    c.beginPath();
    c.ellipse(p.x, p.y, r * sx * 0.66, r * 0.66, 0, 0, 7);
    c.stroke();
    c.fillStyle = "rgba(107,62,10,.8)";
    c.save();
    c.translate(p.x, p.y);
    c.scale(sx, 1);
    cachedText(c, "円", "700", JP, r * 0.95, 0, r * 0.05);
    c.restore();
  }
  c.fillStyle = "rgba(255,255,255,.75)";
  c.beginPath();
  c.ellipse(p.x - r * sx * 0.35, p.y - r * 0.42, r * sx * 0.22, r * 0.12, -0.5, 0, 7);
  c.fill();
  c.restore();
}

function signPole(c: Ctx, V: View, pl: Pole, SW: number) {
  const sg = SIGNS[pl.sign]!;
  const x = pl.side * (SW - 0.6);
  const g = P(V, x, 0, pl.z);
  const t = P(V, x, 3.2, pl.z);
  if (!g || !t) return;
  c.strokeStyle = C.navy;
  c.lineWidth = Math.max(1.5, g.s * 0.08);
  c.lineCap = "round";
  c.beginPath();
  c.moveTo(g.x, g.y);
  c.lineTo(t.x, t.y);
  c.stroke();
  const p1 = P(V, x - 0.38, 5.4, pl.z);
  const p2 = P(V, x + 0.38, 2.4, pl.z);
  if (!p1 || !p2) return;
  const ww = p2.x - p1.x;
  const hh = p2.y - p1.y;
  c.fillStyle = sg.bg;
  c.lineWidth = Math.max(1.4, p1.s * 0.05);
  c.beginPath();
  c.roundRect(p1.x, p1.y, Math.max(2, ww), Math.max(2, hh), 4);
  c.fill();
  c.stroke();
  const letters = [...sg.txt];
  const fs = Math.min(ww * 0.72, hh / (letters.length + 0.8));
  if (fs > 6) {
    c.fillStyle = C.navy;
    letters.forEach((ch, i) => cachedText(c, ch, "700", JP, fs, p1.x + ww / 2, p1.y + (hh * (i + 0.9)) / (letters.length + 0.7)));
  }
}

function lamp(c: Ctx, V: View, x: number, z: number) {
  const a = P(V, x, 0, z);
  const b = P(V, x, 4.2, z);
  if (!a || !b) return;
  c.strokeStyle = C.navy;
  c.lineWidth = Math.max(1.5, a.s * 0.1);
  c.lineCap = "round";
  c.beginPath();
  c.moveTo(a.x, a.y);
  c.lineTo(b.x, b.y);
  c.stroke();
  c.fillStyle = C.cream;
  c.lineWidth = Math.max(1, a.s * 0.04);
  c.beginPath();
  c.arc(b.x, b.y, Math.max(2.5, a.s * 0.22), 0, 7);
  c.fill();
  c.stroke();
}

function drawBarrier(c: Ctx) {
  c.strokeStyle = C.navy;
  c.lineWidth = 0.06;
  for (const s of [-1, 1]) {
    c.beginPath();
    c.moveTo(s * 0.7, 0);
    c.lineTo(s * 0.7, -1.0);
    c.stroke();
    c.beginPath();
    c.moveTo(s * 0.85, 0);
    c.lineTo(s * 0.55, 0);
    c.stroke();
  }
  for (const [y0, hh] of [[-1.0, 0.24], [-0.6, 0.2]] as const) {
    c.save();
    c.beginPath();
    c.roundRect(-0.82, y0, 1.64, hh, 0.04);
    c.clip();
    c.fillStyle = C.cream;
    c.fillRect(-0.82, y0, 1.64, hh);
    c.fillStyle = C.brick;
    for (let k = -6; k < 8; k++) {
      c.beginPath();
      c.moveTo(k * 0.24, y0);
      c.lineTo(k * 0.24 + 0.12, y0);
      c.lineTo(k * 0.24 + 0.12 - hh, y0 + hh);
      c.lineTo(k * 0.24 - hh, y0 + hh);
      c.closePath();
      c.fill();
    }
    c.restore();
    c.beginPath();
    c.roundRect(-0.82, y0, 1.64, hh, 0.04);
    c.stroke();
  }
  c.fillStyle = C.gold;
  for (const s of [-1, 1]) {
    c.beginPath();
    c.arc(s * 0.7, -1.08, 0.07, 0, 7);
    c.fill();
    c.stroke();
  }
}
function drawFallback(c: Ctx, h: number, col: string) {
  c.fillStyle = col;
  c.strokeStyle = C.navy;
  c.lineWidth = 0.05;
  c.beginPath();
  c.roundRect(-0.35, -h, 0.7, h, 0.12);
  c.fill();
  c.stroke();
}

function obstacle(c: Ctx, V: View, o: Obstacle) {
  const p = P(V, laneX(o.lane), 0, o.z + o.depth * 0.5);
  if (!p) return;
  const dz = o.z - V.camZ;
  c.save();
  c.globalAlpha = clamp((90 - dz) / 16, 0, 1) * (o.hit ? 0.5 : 1);
  c.translate(p.x, p.y);
  c.scale(p.s, p.s);
  if (o.hit) {
    c.rotate(o.side * 0.35);
    c.translate(o.side * 0.4, 0.05);
  }
  c.lineWidth = Math.max(1.3, p.s * 0.028) / p.s;
  c.strokeStyle = C.navy;
  c.lineJoin = "round";
  c.lineCap = "round";
  c.fillStyle = "rgba(27,42,65,.28)";
  c.beginPath();
  c.ellipse(0, 0, o.kind === "barrier" ? 0.8 : 0.55, 0.12, 0, 0, 7);
  c.fill();
  const ob = OBST[o.kind];
  const im = ob ? A.obst[ob.img] : undefined;
  if (ob && ok(im)) {
    const ww = (ob.h * im!.naturalWidth) / im!.naturalHeight;
    c.drawImage(im!, -ww / 2, -ob.h, ww, ob.h);
  } else if (o.kind === "barrier") drawBarrier(c);
  else drawFallback(c, ob?.h ?? 1.8, o.kind === "cop" ? "#2E4A7A" : C.mint);
  if (!o.hit && dz > 7 && dz < 70) {
    const col = { walker: C.coral, cop: C.sky, barrier: C.gold }[o.kind];
    const glyph = { walker: "↓", cop: "⇆", barrier: "↑" }[o.kind];
    const by = o.kind === "barrier" ? -1.45 : -(ob?.h ?? 1.8) - 0.32;
    c.fillStyle = col;
    c.beginPath();
    c.arc(0, by, 0.22, 0, 7);
    c.fill();
    c.stroke();
    c.fillStyle = C.navy;
    cachedText(c, glyph, "700", FONT, 0.28, 0, by + 0.02);
  }
  c.restore();
}

function metro(c: Ctx, V: View, z0: number, z1: number, hx: number, L: SkinLabels) {
  for (const s of [-1, 1]) {
    const x = s * (hx + 0.15);
    quad(c, V, [[x, 1.0, z0], [x, 1.08, z0], [x, 1.08, z1], [x, 1.0, z1]], C.ink, C.navy, 1.4);
  }
  quad(c, V, [[-hx - 1.4, 0, z1 + 1.2], [hx + 1.4, 0, z1 + 1.2], [hx + 1.4, 5.4, z1 + 1.2], [-hx - 1.4, 5.4, z1 + 1.2]], C.plum, C.navy, 2);
  const wl = P(V, 0, 2.3, z1 + 1.2);
  if (wl && wl.s > 6) {
    c.fillStyle = C.cream;
    cachedText(c, L.line, "700", FONT, wl.s * 0.42, wl.x, wl.y);
  }
  const Lb = P(V, -hx - 0.15, 0, z0);
  const Lt = P(V, -hx - 0.15, 4.3, z0);
  const Rb = P(V, hx + 0.15, 0, z0);
  const Rt = P(V, hx + 0.15, 4.3, z0);
  if (!Lb || !Lt || !Rb || !Rt) return;
  c.strokeStyle = C.ink;
  c.lineWidth = Math.max(2, Lb.s * 0.14);
  c.lineCap = "round";
  c.beginPath();
  c.moveTo(Lb.x, Lb.y);
  c.lineTo(Lt.x, Lt.y);
  c.moveTo(Rb.x, Rb.y);
  c.lineTo(Rt.x, Rt.y);
  c.stroke();
  const s1 = P(V, -hx + 0.15, 4.05, z0);
  const s2 = P(V, hx - 0.15, 3.15, z0);
  if (s1 && s2) {
    c.fillStyle = C.navy;
    c.beginPath();
    c.roundRect(s1.x, s1.y, s2.x - s1.x, s2.y - s1.y, 6);
    c.fill();
    c.fillStyle = C.cream;
    c.textAlign = "center";
    c.textBaseline = "middle";
    const hh = s2.y - s1.y;
    const cx = (s1.x + s2.x) / 2;
    const cy = (s1.y + s2.y) / 2;
    cachedText(c, L.metro, "700", FONT, hh * 0.4, cx - (s2.x - s1.x) * 0.17, cy);
    cachedText(c, "地下鉄", "700", JP, hh * 0.34, cx + (s2.x - s1.x) * 0.24, cy);
  }
  const m = P(V, 0, 4.7, z0);
  if (m) {
    c.fillStyle = C.coral;
    c.strokeStyle = C.navy;
    c.lineWidth = Math.max(1.5, m.s * 0.06);
    c.beginPath();
    c.arc(m.x, m.y, m.s * 0.42, 0, 7);
    c.fill();
    c.stroke();
    c.fillStyle = C.navy;
    cachedText(c, "M", "700", FONT, m.s * 0.5, m.x, m.y + 1);
    const k = P(V, hx - 0.2, 4.7, z0);
    if (k) {
      c.fillStyle = C.cream;
      c.beginPath();
      c.roundRect(k.x - k.s * 0.3, k.y - k.s * 0.3, k.s * 0.6, k.s * 0.6, 4);
      c.fill();
      c.stroke();
      c.fillStyle = C.navy;
      cachedText(c, "駅", "700", JP, k.s * 0.42, k.x, k.y + 1);
    }
  }
}

/** Clip and frame for the runner (mockup aoiFrame). */
function frameOf(s: RunState, reduced: boolean): [string, number] {
  const R = reduced;
  const n = (k: string) => A.sheets[k]?.n ?? 1;
  if (s.phase === "done" && s.outcome === "won") return ["win", R ? 8 : Math.floor(s.t * 12) % n("win")];
  if (s.phase === "fall" || s.knock > 0 || s.stumble > RUN.stumble * 0.25) {
    const t = s.phase === "fall" ? s.phaseT : RUN.stumble - s.stumble;
    return ["hit", R ? 7 : 3 + (Math.floor(t * 14) % 11)];
  }
  if (s.jumpT >= 0) return ["jump", R ? 6 : clamp(Math.floor(1 + (s.jumpT / RUN.jump) * 11), 1, 12)];
  if (s.slideT >= 0) return ["slide", R ? 6 : clamp(Math.floor(1 + (s.slideT / RUN.slide) * 10), 1, 10)];
  if (s.smileT >= 0) return ["hit", R ? 3 : [1, 2, 3, 3, 2, 1][Math.min(5, Math.floor((s.smileT / RUN.smile) * 6))]!];
  if (s.laneT < 0.35 && s.phase === "run") {
    const k = s.lane > Math.round(s.laneFrom / RUN.laneW) + 1 ? "right" : "left";
    return [k, R ? 7 : 3 + Math.min(6, Math.floor((s.laneT / 0.35) * 7))];
  }
  if (s.phase === "count") return ["count", R ? 0 : Math.min(n("count") - 1, Math.floor(s.phaseT * 12))];
  if (s.phase === "run" && s.runT < TURN_TIME && !R) return ["hit", [3, 2, 1, 0][Math.min(3, Math.floor((s.runT / TURN_TIME) * 4))]!];
  return ["run", R ? 2 : Math.floor((s.runDist / RUN_STRIDE) * 12) % n("run")];
}

function runner(c: Ctx, V: View, s: RunState, reduced: boolean) {
  const run = A.sheets["run"];
  if (!A.ready || !run || !ok(run.img)) return;
  const win = s.phase === "done" && s.outcome === "won";
  const z = win ? s.length - 0.2 : s.z;
  const x = win ? 0 : s.x;
  const g0 = P(V, x, 0, z);
  if (!g0) return;
  const [k, fi] = frameOf(s, reduced);
  const m = A.sheets[k];
  if (!m || !ok(m.img)) return;
  const f = Math.min(fi, m.n - 1);
  const bb = m.bb[f]!;
  const ref = run.bb[0]!;
  const k1 = ((g0.s * AOI_H) / (ref[3]! - ref[1]!)) * m.norm;
  let lift = jumpY(s) * g0.s;
  let drop = 0;
  if (s.phase === "enter") {
    const into = s.z - (s.length + 0.6);
    if (into > 0) drop = into * g0.s * 0.5;
    lift = 0;
  }
  c.fillStyle = "rgba(0,0,0,.38)";
  c.beginPath();
  c.ellipse(g0.x, g0.y + 1, g0.s * (s.jumpT >= 0 ? 0.26 : 0.36), g0.s * 0.07, 0, 0, 7);
  c.fill();
  c.save();
  if (s.phase === "enter") {
    const e = P(V, 0, 0, s.length + 0.6);
    if (e) {
      c.beginPath();
      c.rect(0, 0, V.w, e.y);
      c.clip();
    }
  }
  c.globalAlpha = blinkAlpha(s.invuln, reduced);
  if (s.phase === "fall") {
    c.translate(g0.x, g0.y);
    c.rotate(-0.5 * easeOut(clamp(s.phaseT / 0.4, 0, 1)));
    c.translate(-g0.x, -g0.y);
  }
  const footY = k === "jump" || k === "slide" ? bb[3]! : (m.foot ??= Math.max(...m.bb.map((q) => q[3]!)));
  const dx = g0.x - 112 * k1;
  const dy = g0.y - lift + drop - footY * k1;
  c.drawImage(m.img, (f % m.cols) * m.w, Math.floor(f / m.cols) * m.h, m.w, m.h, dx, dy, m.w * k1, m.h * k1);
  c.restore();
}

function drawWorld(c: Ctx, V: View, s: RunState | null, length: number, t: number, L: SkinLabels, reduced: boolean) {
  const near = V.camZ + 0.4;
  const far = V.camZ + 150;
  const RW = 1.5 * RUN.laneW;
  const SW = RW + WALK_W;
  backdrop(c, V, t, near, RW, SW, reduced);
  quad(c, V, [[-RW, 0, near], [RW, 0, near], [RW, 0, far], [-RW, 0, far]], "rgba(14,20,40,.5)");
  c.save();
  c.globalCompositeOperation = "lighter";
  const RC = ["255,70,160", "60,210,255", "255,190,80", "150,110,255", "60,255,200"];
  for (let z = Math.floor(near / 3) * 3; z < V.camZ + 60; z += 3)
    for (let k = 0; k < 3; k++) {
      const n = noise(z * 0.37 + k * 11.3);
      if (n < 0.35) continue;
      const xx = (noise(z * 1.91 + k * 3.1) * 2 - 1) * RW * 0.95;
      const len = 1.5 + noise(z + k) * 3;
      const ww = 0.03 + noise(z * 2 + k) * 0.08;
      const tw = reduced ? 1 : 0.75 + 0.25 * Math.sin(t * 5 + z + k * 2);
      const a = 0.26 * tw * clamp((V.camZ + 60 - z) / 15, 0, 1) * clamp((z - V.camZ - 4) / 10, 0, 1);
      quad(c, V, [[xx - ww, 0, z], [xx + ww, 0, z], [xx + ww, 0, z + len], [xx - ww, 0, z + len]], `rgba(${RC[Math.floor(n * 50) % 5]},${a})`);
    }
  c.restore();
  for (let z = Math.ceil(near / 40) * 40; z < V.camZ + 80; z += 40)
    for (let k = -4; k <= 4; k++) quad(c, V, [[k * 0.6 - 0.2, 0, z], [k * 0.6 + 0.2, 0, z], [k * 0.6 + 0.2, 0, z + 3], [k * 0.6 - 0.2, 0, z + 3]], "rgba(190,240,255,.3)");
  for (const sd of [-1, 1]) quad(c, V, [[sd * RW, 0, near], [sd * (RW + 0.16), 0, near], [sd * (RW + 0.16), 0, far], [sd * RW, 0, far]], "rgba(255,199,69,.9)");
  for (let z = Math.floor(near / 6) * 6; z < V.camZ + 95; z += 6)
    for (const lx of [-0.5, 0.5]) quad(c, V, [[lx * RUN.laneW - 0.07, 0, z], [lx * RUN.laneW + 0.07, 0, z], [lx * RUN.laneW + 0.07, 0, z + 2.6], [lx * RUN.laneW - 0.07, 0, z + 2.6]], "rgba(255,246,229,.85)");
  const z0 = length + 0.6;
  const z1 = length + 7.5;
  const hx = 2.3;
  if (z0 < V.camZ + 140) {
    quad(c, V, [[-hx, 0, Math.max(z0, near)], [hx, 0, Math.max(z0, near)], [hx, 0, z1], [-hx, 0, z1]], "#0F1828", C.gold, 3);
    const edge = ([[-hx, 0, Math.max(z0, near)], [hx, 0, Math.max(z0, near)], [hx, 0, z1], [-hx, 0, z1]] as const).map((p) => P(V, p[0], p[1], p[2]));
    if (edge.every(Boolean)) {
      c.save();
      c.beginPath();
      edge.forEach((p, i) => (i ? c.lineTo(p!.x, p!.y) : c.moveTo(p!.x, p!.y)));
      c.closePath();
      c.clip();
      for (let k = 0; k < 14; k++) {
        const sz = z0 + 0.15 + k * 0.42;
        const sy = -0.28 * (k + 1);
        const a = P(V, -hx, sy, sz);
        const b = P(V, hx, sy, sz);
        if (a && b) {
          c.strokeStyle = `rgba(201,182,255,${0.75 - k * 0.05})`;
          c.lineWidth = Math.max(1, a.s * 0.05);
          c.beginPath();
          c.moveTo(a.x, a.y);
          c.lineTo(b.x, b.y);
          c.stroke();
        }
      }
      c.restore();
    }
  }
  const ents: { z: number; draw: () => void }[] = [];
  for (const pl of poles(length)) if (pl.z > near + 6 && pl.z < V.camZ + 55) ents.push({ z: pl.z, draw: () => signPole(c, V, pl, SW) });
  for (let z = Math.ceil(near / 16) * 16; z < V.camZ + 110; z += 16) for (const sd of [-1, 1]) ents.push({ z, draw: () => lamp(c, V, sd * (RW + 0.9), z) });
  if (s) {
    for (const o of s.obstacles) if (o.z + 1 > near && o.z < V.camZ + 95) ents.push({ z: o.z, draw: () => obstacle(c, V, o) });
    for (const cn of s.coins) if (!cn.got && cn.z > near + 0.3 && cn.z < V.camZ + 70) ents.push({ z: cn.z, draw: () => coin(c, V, cn, t, reduced) });
  }
  if (z0 < V.camZ + 140) ents.push({ z: z0 + 0.01, draw: () => metro(c, V, z0, z1, hx, L) });
  // v5.1: sliding under the movers' wardrobe, the runner is drawn just before it (wardrobe and legs over her)
  const inSort = !!s && (s.phase === "run" || s.phase === "count" || s.phase === "fall");
  if (s && inSort) {
    const under = sliding(s) && s.obstacles.find((o) => o.kind === "walker" && !o.hit && Math.abs(s.x - laneX(o.lane)) < RUN.laneW * RUN.laneHit && o.z + o.depth + 0.5 > s.z && o.z - 0.9 < s.z);
    ents.push({ z: under ? under.z + 0.001 : s.z, draw: () => runner(c, V, s, reduced) });
  }
  ents.sort((a, b) => b.z - a.z).forEach((e) => e.draw());
  if (!reduced) bokeh(c, V, SW);
  if (s && !inSort) runner(c, V, s, reduced);
}

function burst(c: Ctx, x: number, y: number, r: number, text: string, fill: string, k: number) {
  c.save();
  c.translate(x, y);
  c.scale(k, k);
  c.rotate(-0.08);
  c.beginPath();
  for (let i = 0; i < 24; i++) {
    const a = (i * Math.PI) / 12;
    const rad = i % 2 ? r * 0.72 : r;
    c.lineTo(Math.cos(a) * rad * 1.35, Math.sin(a) * rad);
  }
  c.closePath();
  c.fillStyle = fill;
  c.fill();
  c.lineWidth = Math.max(2.5, r * 0.07);
  c.strokeStyle = C.navy;
  c.stroke();
  c.fillStyle = C.navy;
  cachedText(c, text, "700", FONT, r * 0.5, 0, 2);
  c.restore();
}
const spring = (t: number, reduced: boolean) => (reduced ? 1 : 1 - Math.exp(-7 * t) * Math.cos(14 * t));

export const NEON: RunnerSkin = {
  id: "akihabara-night",
  // unused by the v6.1 music (RunnerAudio plays the original K-pop instrumental); kept for the skin interface
  music: { bpm: 124, scale: [57, 59, 61, 64, 66], root: 57, melody: [0] },

  follow(cam: Camera, s: RunState, dt: number, reduced: boolean): Camera {
    const k = 1 - Math.exp(-(reduced ? 3 : 9) * dt);
    const x = cam.x + (s.x * CAM_FOLLOW - cam.x) * k;
    const z = s.phase === "enter" || (s.phase === "done" && s.outcome === "won") ? s.length - ZP - 0.4 : s.z - ZP;
    return { x, z };
  },

  draw(c, w, h, d: DrawInput) {
    loadNeonAssets();
    const s = d.state;
    c.save();
    if (d.shake > 0 && !d.reduced) {
      const m = (d.shake / 0.3) * 7;
      c.translate((noise(s.t * 60) - 0.5) * m, (noise(s.t * 60 + 9) - 0.5) * m);
    }
    const V = viewFor(w, h, d.cam.x, d.cam.z);
    drawWorld(c, V, s, s.length, s.t, d.labels, d.reduced);
    if (!d.reduced && s.phase === "run") {
      const k = clamp((currentSpeed(s) - 7) / 5, 0, 1);
      const seed = Math.floor(s.t / 0.06);
      c.strokeStyle = `rgba(27,42,65,${0.12 + 0.2 * k})`;
      c.lineCap = "round";
      const R = Math.hypot(w, h);
      for (let i = 0; i < 30; i++) {
        const a = noise(seed * 31 + i) * Math.PI * 2;
        const r0 = R * (0.42 + noise(seed * 7 + i) * 0.15);
        c.lineWidth = 1 + noise(i + seed) * 2.2;
        c.beginPath();
        c.moveTo(w / 2 + Math.cos(a) * r0, V.HY + Math.sin(a) * r0);
        c.lineTo(w / 2 + Math.cos(a) * R, V.HY + Math.sin(a) * R);
        c.stroke();
      }
    }
    const ap = P(V, s.x, 1.9, Math.max(s.z, V.camZ + 1.6));
    for (const f of d.fx) {
      if (f.kind === "bam" && ap) {
        c.globalAlpha = d.reduced ? clamp(1 - f.age / f.life, 0, 1) : clamp((f.life - f.age) / 0.2, 0, 1);
        burst(c, ap.x + ap.s * 0.75, ap.y - ap.s * 0.2, Math.max(34, ap.s * 0.42), f.word, C.gold, spring(f.age, d.reduced));
        c.globalAlpha = 1;
      }
      if (f.kind === "word") {
        c.globalAlpha = clamp((f.life - f.age) / 0.3, 0, 1);
        burst(c, w * 0.24, h * 0.62, Math.min(w, h) * 0.09, f.word, f.color ?? C.mint, spring(f.age, d.reduced));
        c.globalAlpha = 1;
      }
    }
    // pick-up sparks (10, or 4 still ones under reduced motion)
    for (const f of d.fx) {
      if (f.kind !== "spark" || f.z === undefined) continue;
      const sp = P(V, f.x ?? 0, f.y ?? 0, Math.max(f.z, V.camZ + 1.2));
      if (!sp) continue;
      const u = f.age / f.life;
      const n = d.reduced ? 4 : 10;
      c.save();
      c.globalCompositeOperation = "lighter";
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + f.z;
        const dd = (d.reduced ? 0.6 : easeOut(u)) * Math.max(18, sp.s * 0.6);
        const rr = Math.max(1.5, sp.s * 0.05) * (1 - u * 0.7);
        c.fillStyle = `rgba(255,${200 + (k % 2) * 40},90,${1 - u})`;
        const px = sp.x + Math.cos(a) * dd;
        const py = sp.y + Math.sin(a) * dd;
        c.beginPath();
        c.moveTo(px, py - rr * 2.2);
        c.lineTo(px + rr * 0.6, py);
        c.lineTo(px, py + rr * 2.2);
        c.lineTo(px - rr * 0.6, py);
        c.closePath();
        c.fill();
      }
      c.restore();
    }
    // 3, 2, 1 (scale pop; fade only under reduced motion), then the start word
    if (s.phase === "count" || (s.phase === "run" && s.runT < GO_SHOW)) {
      const go = s.phase === "run";
      const lt = go ? s.runT : s.phaseT % 1;
      const txt = go ? d.labels.go : String(Math.max(1, 3 - Math.floor(s.phaseT)));
      const pop = d.reduced ? 1 : lt < 0.18 ? 0.4 + easeOut(lt / 0.18) * 0.75 : 1.15 - Math.min(0.15, (lt - 0.18) * 0.6);
      const life = go ? GO_SHOW : 1;
      c.save();
      c.globalAlpha = d.reduced ? clamp(Math.min(lt / 0.15, (life - lt) / 0.2), 0, 1) : clamp((life - lt) / 0.18, 0, 1);
      const size = go ? Math.min(w * 0.13, h * 0.09) : Math.min(w * 0.42, h * 0.26);
      c.translate(w / 2, h * 0.4);
      c.scale(pop, pop);
      c.font = `700 ${size}px ${FONT}`;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.lineJoin = "round";
      c.lineWidth = size * 0.12;
      c.strokeStyle = C.navy;
      c.strokeText(txt, 0, 0);
      c.fillStyle = go ? C.gold : C.cream;
      c.fillText(txt, 0, 0);
      c.restore();
    }
    for (const p of d.sparks) {
      c.globalAlpha = p.fixed ? 0.95 : clamp(1 - p.age / p.life, 0, 1);
      c.fillStyle = p.col;
      c.strokeStyle = C.navy;
      c.lineWidth = 1;
      c.beginPath();
      c.arc(p.u * w, p.v * h, p.r, 0, 7);
      c.fill();
      c.stroke();
    }
    c.globalAlpha = 1;
    if (d.flash > 0 && !d.reduced) {
      c.fillStyle = `rgba(255,251,242,${(0.5 * d.flash) / 0.12})`;
      c.fillRect(-20, -20, w + 40, h + 40);
    }
    if (d.vign > 0) {
      const k = d.vign / (d.reduced ? 0.6 : 0.45);
      const gr = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.hypot(w, h) * 0.6);
      gr.addColorStop(0, "rgba(255,138,115,0)");
      gr.addColorStop(1, `rgba(184,50,60,${0.45 * k})`);
      c.fillStyle = gr;
      c.fillRect(-20, -20, w + 40, h + 40);
    }
    c.restore();
  },

  drawPanel(c, w, h, time, { reduced, labels }) {
    loadNeonAssets();
    const drift = reduced ? 0 : (time * 3) % 6;
    const V = viewFor(w, h, 0, RUN.length - 22 + drift);
    drawWorld(c, V, null, RUN.length, time, labels, reduced);
  },
};
