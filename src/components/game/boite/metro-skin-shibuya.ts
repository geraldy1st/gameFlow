/**
 * Metro run — "Shibuya by day" skin. Port of Mirage's validated mockup renderer (gameflow-bc/runner/runner.js):
 * pastel facades with halftone tops, striped awnings, vertical shop signs (Latin and Japanese), lamps, the metro
 * entrance « MÉTRO 地下鉄 », the walker with his plank, the police officer, the works barrier, and the runner seen
 * from the front with the player's portrait as a medallion face. Pure drawing: reads RunState, never changes it.
 */
import { RUN, jumpY, currentSpeed, laneX, sliding, type Obstacle, type RunState } from "@/game/metro-run";
import type { Camera, DrawInput, FaceSet, RunnerSkin, SkinLabels } from "./metro-skin";

const C = {
  navy: "#1B2A41",
  cream: "#FFF6E5",
  cream2: "#FDEBCB",
  paper: "#FFFBF2",
  gold: "#FFC745",
  mint: "#3DDC97",
  coral: "#FF8A73",
  plum: "#6C4AB6",
  brick: "#B8323C",
  sky: "#8FD3FF",
  lilac: "#C9B6FF",
  ink: "#1F7A55",
  skin: "#F6D2B8",
  coat: "#F1E4C8",
  wood: "#D9A066",
  asphalt: "#3A4862",
};
const STAGE = {
  sky: ["#8FD3FF", "#FFF6E5"],
  hill: "#C9B6FF",
  walls: ["#FFF6E5", "#FDEBCB", "#FFD9CF", "#E4F4FF", "#E6DEFF", "#D8F7E9"],
};
/** Metres between the camera and the runner. */
const ZP = 4.2;
const FONT = "Fredoka, Nunito, sans-serif";
const JP = '"Noto Sans JP", "Hiragino Sans", "Yu Gothic", Fredoka, sans-serif';

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const noise = (i: number) => {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};
function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Building {
  side: -1 | 1;
  z1: number;
  z2: number;
  h: number;
  col: string;
  shop: number;
}
const cities = new Map<number, Building[]>();
function city(length: number): Building[] {
  let out = cities.get(length);
  if (out) return out;
  const R = mulberry(RUN.seed * 7 + 3);
  out = [];
  for (const side of [-1, 1] as const) {
    let z = -24;
    let n = 0;
    while (z < length + 60) {
      const w = 6.5 + R() * 5.5;
      const h = 8 + R() * 9;
      out.push({ side, z1: z, z2: z + w, h, col: STAGE.walls[Math.floor(R() * STAGE.walls.length)]!, shop: n * 2 + (side < 0 ? 0 : 1) });
      z += w + 0.6;
      n++;
    }
  }
  cities.set(length, out);
  return out;
}

interface View {
  w: number;
  h: number;
  HY: number;
  F: number;
  CAMH: number;
  camX: number;
  camZ: number;
  portrait: boolean;
}
function viewFor(w: number, h: number, camX: number, camZ: number): View {
  const portrait = h > w * 1.05;
  const HY = h * (portrait ? 0.3 : 0.36);
  const roadPx = portrait ? w * 0.96 : Math.min(w * 0.6, h * 1.05);
  const F = (roadPx * ZP) / (3 * RUN.laneW);
  const CAMH = ((h * (portrait ? 0.84 : 0.86) - HY) * ZP) / F;
  return { w, h, HY, F, CAMH, camX, camZ, portrait };
}
interface Pt {
  x: number;
  y: number;
  s: number;
}
function P(V: View, x: number, y: number, z: number): Pt | null {
  const dz = z - V.camZ;
  if (dz < 0.25) return null;
  const s = V.F / dz;
  return { x: V.w / 2 + (x - V.camX) * s, y: V.HY + (V.CAMH - y) * s, s };
}
type Ctx = CanvasRenderingContext2D;
function quad(c: Ctx, V: View, pts: [number, number, number][], fill?: string | CanvasPattern | null, stroke?: string, lw?: number): boolean {
  const q = pts.map(([x, y, z]) => P(V, x, y, z));
  if (q.some((p) => !p)) return false;
  c.beginPath();
  (q as Pt[]).forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
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

const dotsCache = new WeakMap<Ctx, CanvasPattern | null>();
function halftone(c: Ctx): CanvasPattern | null {
  if (dotsCache.has(c)) return dotsCache.get(c)!;
  const t = document.createElement("canvas");
  t.width = t.height = 10;
  const x = t.getContext("2d");
  if (x) {
    x.fillStyle = "rgba(27,42,65,.16)";
    x.beginPath();
    x.arc(5, 5, 1.6, 0, 7);
    x.fill();
  }
  const p = c.createPattern(t, "repeat");
  dotsCache.set(c, p);
  return p;
}

/* Vertical shop signs: Latin and Japanese, same frame and colours, stacked letters. */
const SIGNS = [
  { txt: "GYOZA", bg: "#FFC745", aw: "#B8323C" },
  { txt: "寿司", bg: "#FFFBF2", aw: "#1F7A55", jp: true },
  { txt: "CAFÉ", bg: "#FF8A73", aw: "#6C4AB6" },
  { txt: "ラーメン", bg: "#FFC745", aw: "#B8323C", jp: true },
  { txt: "SUSHI", bg: "#FFFBF2", aw: "#1F7A55" },
  { txt: "カラオケ", bg: "#FF8A73", aw: "#1E5F74", jp: true },
  { txt: "RAMEN", bg: "#3DDC97", aw: "#B8323C" },
  { txt: "コンビニ", bg: "#3DDC97", aw: "#1B2A41", jp: true },
  { txt: "CAFÉ", bg: "#FFC745", aw: "#6C4AB6" },
  { txt: "居酒屋", bg: "#FFC745", aw: "#B8323C", jp: true },
  { txt: "GYOZA", bg: "#FF8A73", aw: "#1E5F74" },
  { txt: "ブティック", bg: "#FFFBF2", aw: "#6C4AB6", jp: true },
];

function building(c: Ctx, V: View, b: Building, near: number, SW: number) {
  const x = b.side * SW;
  const za = Math.max(b.z1, near);
  const zb = b.z2;
  if (zb <= za) return;
  const sg = SIGNS[b.shop % SIGNS.length]!;
  quad(c, V, [[x, 0, za], [x, b.h, za], [x, b.h, zb], [x, 0, zb]], b.col, C.navy, 2);
  const dz = za - V.camZ;
  if (dz < 90) quad(c, V, [[x, b.h * 0.72, za], [x, b.h, za], [x, b.h, zb], [x, b.h * 0.72, zb]], halftone(c));
  if (dz < 80) {
    for (let y = 3.6; y + 1.4 < b.h; y += 2.6)
      for (let z = b.z1 + 0.7; z + 1.15 < b.z2; z += 2.1)
        if (z > near + 0.2) quad(c, V, [[x, y, z], [x, y + 1.35, z], [x, y + 1.35, z + 1.05], [x, y, z + 1.05]], noise(z * 3 + y) > 0.5 ? "#FFF3C4" : C.sky, C.navy, 1.1);
  }
  if (dz < 70) {
    quad(c, V, [[x, 0.2, za + 0.4], [x, 2.1, za + 0.4], [x, 2.1, zb - 0.4], [x, 0.2, zb - 0.4]], "rgba(143,211,255,.55)", C.navy, 1.4);
    const stripes = Math.max(4, Math.round((zb - za) / 0.7));
    for (let i = 0; i < stripes; i++) {
      const z1 = lerp(za + 0.2, zb - 0.2, i / stripes);
      const z2 = lerp(za + 0.2, zb - 0.2, (i + 1) / stripes);
      quad(c, V, [[x, 2.75, z1], [x, 2.75, z2], [x - b.side * 0.9, 2.25, z2], [x - b.side * 0.9, 2.25, z1]], i % 2 ? C.cream : sg.aw, C.navy, 1.2);
    }
    const sz = za + 1.4;
    if (sz - V.camZ > 6 && sz - V.camZ < 55) {
      const p1 = P(V, x, 7.2, sz);
      const p2 = P(V, x - b.side * 0.9, 3.15, sz);
      if (p1 && p2) {
        const x0 = Math.min(p1.x, p2.x);
        const y0 = Math.min(p1.y, p2.y);
        const ww = Math.abs(p2.x - p1.x);
        const hh = Math.abs(p2.y - p1.y);
        c.fillStyle = sg.bg;
        c.strokeStyle = C.navy;
        c.lineWidth = Math.max(1.4, p1.s * 0.05);
        c.beginPath();
        c.roundRect(x0, y0, Math.max(2, ww), Math.max(2, hh), 4);
        c.fill();
        c.stroke();
        const letters = [...sg.txt];
        const fs = Math.min(ww * 0.72, hh / (letters.length + 0.8));
        if (fs > 6) {
          c.save();
          c.beginPath();
          c.rect(x0, y0, ww, hh);
          c.clip();
          c.fillStyle = C.navy;
          c.font = `700 ${fs}px ${sg.jp ? JP : FONT}`;
          c.textAlign = "center";
          c.textBaseline = "middle";
          letters.forEach((ch, i) => c.fillText(ch, x0 + ww / 2, y0 + (hh * (i + 0.9)) / (letters.length + 0.7)));
          c.restore();
        }
      }
    }
  }
}

function drawWalker(c: Ctx) {
  // a passer-by carrying a plank on the shoulder across the lane (1.25 → 1.42 m): slide under it
  for (const s of [-1, 1]) {
    c.strokeStyle = C.navy;
    c.lineWidth = 0.1;
    c.beginPath();
    c.moveTo(s * 0.08, -0.9);
    c.lineTo(s * 0.12, -0.02);
    c.stroke();
  }
  c.fillStyle = C.mint;
  c.strokeStyle = C.navy;
  c.lineWidth = 0.045;
  c.beginPath();
  c.moveTo(-0.22, -0.9);
  c.lineTo(-0.2, -1.45);
  c.lineTo(0.2, -1.45);
  c.lineTo(0.22, -0.9);
  c.closePath();
  c.fill();
  c.stroke();
  c.fillStyle = C.skin;
  c.beginPath();
  c.arc(0, -1.62, 0.15, 0, 7);
  c.fill();
  c.stroke();
  c.fillStyle = C.navy;
  c.beginPath();
  c.arc(0, -1.66, 0.15, Math.PI * 1.05, Math.PI * 1.95);
  c.fill();
  c.fillStyle = C.wood;
  c.beginPath();
  c.roundRect(-0.85, -1.42, 1.7, 0.17, 0.04);
  c.fill();
  c.stroke();
  c.strokeStyle = "rgba(27,42,65,.35)";
  c.lineWidth = 0.02;
  for (const gx of [-0.55, -0.2, 0.3, 0.6]) {
    c.beginPath();
    c.moveTo(gx, -1.39);
    c.lineTo(gx + 0.12, -1.28);
    c.stroke();
  }
  c.strokeStyle = C.navy;
  c.lineWidth = 0.07;
  c.beginPath();
  c.moveTo(0.16, -1.38);
  c.lineTo(0.3, -1.42);
  c.stroke();
}
function drawCop(c: Ctx, stop: string) {
  for (const s of [-1, 1]) {
    c.fillStyle = C.coral;
    c.beginPath();
    c.moveTo(s * 0.78 - 0.1, 0);
    c.lineTo(s * 0.78, -0.55);
    c.lineTo(s * 0.78 + 0.1, 0);
    c.closePath();
    c.fill();
    c.stroke();
  }
  for (const s of [-1, 1]) {
    c.strokeStyle = C.navy;
    c.lineWidth = 0.1;
    c.beginPath();
    c.moveTo(s * 0.08, -0.9);
    c.lineTo(s * 0.1, -0.02);
    c.stroke();
  }
  c.lineWidth = 0.1;
  c.strokeStyle = "#2E4A7A";
  c.beginPath();
  c.moveTo(-0.72, -1.25);
  c.lineTo(0.72, -1.25);
  c.stroke();
  c.strokeStyle = C.navy;
  c.lineWidth = 0.045;
  c.fillStyle = "#2E4A7A";
  c.beginPath();
  c.moveTo(-0.22, -0.9);
  c.lineTo(-0.2, -1.42);
  c.lineTo(0.2, -1.42);
  c.lineTo(0.22, -0.9);
  c.closePath();
  c.fill();
  c.stroke();
  c.fillStyle = C.gold;
  c.beginPath();
  c.arc(0, -1.2, 0.05, 0, 7);
  c.fill();
  c.fillStyle = C.skin;
  c.beginPath();
  c.arc(0, -1.58, 0.15, 0, 7);
  c.fill();
  c.stroke();
  c.fillStyle = C.navy;
  c.fillRect(-0.16, -1.78, 0.32, 0.1);
  c.strokeRect(-0.16, -1.78, 0.32, 0.1);
  c.fillStyle = C.brick;
  c.beginPath();
  c.arc(0.62, -1.55, 0.16, 0, 7);
  c.fill();
  c.stroke();
  c.fillStyle = C.cream;
  c.font = "800 0.1px Nunito, sans-serif";
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText(stop, 0.62, -1.54);
}
function drawBarrier(c: Ctx) {
  // works fence ≈ 1 m, brick and cream stripes: jump over it
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
  for (const [y0, hh] of [
    [-1.0, 0.24],
    [-0.6, 0.2],
  ] as const) {
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
  c.beginPath();
  c.arc(-0.7, -1.08, 0.07, 0, 7);
  c.fill();
  c.stroke();
  c.beginPath();
  c.arc(0.7, -1.08, 0.07, 0, 7);
  c.fill();
  c.stroke();
}

function obstacle(c: Ctx, V: View, o: Obstacle, stop: string) {
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
  if (o.kind === "walker") drawWalker(c);
  else if (o.kind === "cop") drawCop(c, stop);
  else drawBarrier(c);
  // action badge from 70 m to 7 m: ↓ walker (coral), ⇆ cop (sky), ↑ barrier (gold)
  if (!o.hit && dz > 7 && dz < 70) {
    const col = { walker: C.coral, cop: C.sky, barrier: C.gold }[o.kind];
    const glyph = { walker: "↓", cop: "⇆", barrier: "↑" }[o.kind];
    const by = o.kind === "barrier" ? -1.45 : -2.15;
    c.fillStyle = col;
    c.beginPath();
    c.arc(0, by, 0.22, 0, 7);
    c.fill();
    c.stroke();
    c.fillStyle = C.navy;
    c.font = `700 0.28px ${FONT}`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(glyph, 0, by + 0.02);
  }
  c.restore();
}

/** Face crop (centre x, centre y, radius, as fractions of the width) measured on the cast portraits. */
const CROP = { idle: [0.47, 0.3, 0.3], mood: [0.51, 0.27, 0.27] } as const;
function face(c: Ctx, faces: FaceSet, mood: "idle" | "happy" | "stressed", r: number) {
  const im = (mood !== "idle" && faces[mood]?.naturalWidth ? faces[mood] : faces.idle) ?? null;
  const f = im && im !== faces.idle ? CROP.mood : CROP.idle;
  c.save();
  c.beginPath();
  c.arc(0, 0, r, 0, 7);
  c.clip();
  if (im && im.complete && im.naturalWidth) {
    const W = im.naturalWidth;
    const s = r / (f[2] * W);
    c.drawImage(im, -f[0] * W * s, -f[1] * W * s, W * s, im.naturalHeight * s);
  } else {
    c.fillStyle = C.skin;
    c.fillRect(-r, -r, 2 * r, 2 * r);
  }
  c.restore();
  c.strokeStyle = C.navy;
  c.lineWidth = r * 0.12;
  c.beginPath();
  c.arc(0, 0, r, 0, 7);
  c.stroke();
}

/** The runner from the front: portrait medallion on a simple manga body. */
function runner(c: Ctx, V: View, s: RunState, d: DrawInput) {
  if (s.phase === "done" && s.outcome === "won") return; // already down in the station
  const g0 = P(V, s.x, 0, s.z);
  if (!g0) return;
  const px = (V.portrait ? 0.2 : 0.24) * (d.viewportH || V.h);
  let lift = (jumpY(s) / RUN.jumpH) * px * 0.32;
  let drop = 0;
  if (s.phase === "enter") {
    const into = s.z - (s.length + 0.6);
    if (into > 0) drop = into * px * 0.35;
    lift = 0;
  }
  if (s.phase === "fall" || (s.phase === "done" && s.outcome === "lost")) lift = (1 - easeOut(clamp(s.phaseT / 0.35, 0, 1))) * px * 0.2;
  c.fillStyle = "rgba(27,42,65,.28)";
  c.beginPath();
  c.ellipse(g0.x, g0.y + 2, px * (s.jumpT >= 0 ? 0.16 : 0.22), px * 0.045, 0, 0, 7);
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
  c.globalAlpha = s.invuln > 0 ? (d.reduced ? 0.55 : Math.floor(s.invuln * 18) % 2 ? 0.25 : 1) : 1;
  c.translate(g0.x, g0.y - lift + drop);
  c.scale(px, px);
  c.lineJoin = "round";
  c.lineCap = "round";
  const falling = s.phase === "fall" || (s.phase === "done" && s.outcome === "lost");
  const hurt = s.knock > 0 || falling;
  if (falling) c.rotate(-0.7 * easeOut(clamp(s.phaseT / 0.4, 0, 1)));
  else if (hurt) c.rotate(0.22);
  const slide = sliding(s);
  const air = s.jumpT >= 0;
  if (slide) c.scale(1.12, 0.62);
  const ph = (s.runDist / 1.2) % 1;
  const sw = Math.sin(ph * Math.PI * 2);
  const run = !air && !slide && s.phase !== "count";
  c.translate(0, run ? -Math.abs(sw) * 0.025 : 0);
  const legL = run ? Math.max(0, sw) * 0.16 : air ? 0.14 : 0;
  const legR = run ? Math.max(0, -sw) * 0.16 : air ? 0.12 : 0;
  for (const [sd, up] of [
    [-1, legL],
    [1, legR],
  ] as const) {
    c.strokeStyle = C.navy;
    c.lineWidth = 0.1;
    c.beginPath();
    c.moveTo(sd * 0.07, -0.42);
    c.lineTo(sd * 0.08, -0.03 - up);
    c.stroke();
    c.strokeStyle = "#243044";
    c.lineWidth = 0.06;
    c.stroke();
    c.fillStyle = C.cream;
    c.strokeStyle = C.navy;
    c.lineWidth = 0.02;
    c.beginPath();
    c.ellipse(sd * 0.09, -0.02 - up, 0.07, 0.035, 0, 0, 7);
    c.fill();
    c.stroke();
  }
  c.fillStyle = C.navy;
  c.beginPath();
  if (d.skirt) {
    c.moveTo(-0.15, -0.5);
    c.lineTo(0.15, -0.5);
    c.lineTo(0.19, -0.38);
    c.lineTo(-0.19, -0.38);
  } else {
    c.moveTo(-0.15, -0.5);
    c.lineTo(0.15, -0.5);
    c.lineTo(0.13, -0.42);
    c.lineTo(-0.13, -0.42);
  }
  c.closePath();
  c.fill();
  c.fillStyle = C.coat;
  c.strokeStyle = C.navy;
  c.lineWidth = 0.03;
  c.beginPath();
  c.moveTo(-0.16, -0.8);
  c.quadraticCurveTo(0, -0.84, 0.16, -0.8);
  c.lineTo(0.18, -0.48);
  c.quadraticCurveTo(0, -0.45, -0.18, -0.48);
  c.closePath();
  c.fill();
  c.stroke();
  c.fillStyle = C.paper;
  c.beginPath();
  c.moveTo(-0.05, -0.8);
  c.lineTo(0, -0.68);
  c.lineTo(0.05, -0.8);
  c.closePath();
  c.fill();
  c.stroke();
  const aL = run ? -sw * 0.12 : air ? -0.28 : 0;
  const aR = run ? sw * 0.12 : air ? -0.3 : 0;
  for (const [sd, a] of [
    [-1, aL],
    [1, aR],
  ] as const) {
    c.strokeStyle = C.navy;
    c.lineWidth = 0.085;
    c.beginPath();
    c.moveTo(sd * 0.15, -0.76);
    c.lineTo(sd * 0.24, -0.52 + a);
    c.stroke();
    c.strokeStyle = C.coat;
    c.lineWidth = 0.05;
    c.stroke();
    c.fillStyle = C.skin;
    c.strokeStyle = C.navy;
    c.lineWidth = 0.015;
    c.beginPath();
    c.arc(sd * 0.245, -0.5 + a, 0.03, 0, 7);
    c.fill();
    c.stroke();
  }
  // satchel
  c.strokeStyle = "#8A5A34";
  c.lineWidth = 0.02;
  c.beginPath();
  c.moveTo(-0.12, -0.8);
  c.lineTo(0.14, -0.5);
  c.stroke();
  c.fillStyle = "#8A5A34";
  c.strokeStyle = C.navy;
  c.lineWidth = 0.018;
  c.beginPath();
  c.roundRect(0.1, -0.52, 0.11, 0.09, 0.02);
  c.fill();
  c.stroke();
  // hair behind the medallion, then the portrait
  c.fillStyle = "#1A2744";
  c.strokeStyle = C.navy;
  c.lineWidth = 0.025;
  c.beginPath();
  c.roundRect(-0.2, -1.1, 0.4, 0.34, 0.12);
  c.fill();
  c.stroke();
  c.save();
  c.translate(0, -0.95);
  face(c, d.faces, hurt ? "stressed" : s.phase === "enter" ? "happy" : "idle", 0.16);
  c.restore();
  c.strokeStyle = C.gold;
  c.lineWidth = 0.025;
  c.beginPath();
  c.moveTo(0.08, -1.08);
  c.lineTo(0.16, -1.04);
  c.stroke();
  c.restore();
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

function metro(c: Ctx, V: View, z0: number, z1: number, hx: number, L: SkinLabels) {
  for (const s of [-1, 1]) {
    const x = s * (hx + 0.15);
    quad(c, V, [[x, 1.0, z0], [x, 1.08, z0], [x, 1.08, z1], [x, 1.0, z1]], C.ink, C.navy, 1.4);
  }
  quad(c, V, [[-hx - 1.4, 0, z1 + 1.2], [hx + 1.4, 0, z1 + 1.2], [hx + 1.4, 5.4, z1 + 1.2], [-hx - 1.4, 5.4, z1 + 1.2]], C.plum, C.navy, 2);
  const wl = P(V, 0, 2.3, z1 + 1.2);
  if (wl && wl.s > 6) {
    c.fillStyle = C.cream;
    c.font = `700 ${wl.s * 0.42}px ${FONT}`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(L.line, wl.x, wl.y);
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
    c.font = `700 ${hh * 0.4}px ${FONT}`;
    c.fillText(L.metro, cx - (s2.x - s1.x) * 0.17, cy);
    c.font = `700 ${hh * 0.34}px ${JP}`;
    c.fillText("地下鉄", cx + (s2.x - s1.x) * 0.24, cy);
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
    c.font = `700 ${m.s * 0.5}px ${FONT}`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("M", m.x, m.y + 1);
    const k = P(V, hx - 0.2, 4.7, z0);
    if (k) {
      c.fillStyle = C.cream;
      c.beginPath();
      c.roundRect(k.x - k.s * 0.3, k.y - k.s * 0.3, k.s * 0.6, k.s * 0.6, 4);
      c.fill();
      c.stroke();
      c.fillStyle = C.navy;
      c.font = `700 ${k.s * 0.42}px ${JP}`;
      c.fillText("駅", k.x, k.y + 1);
    }
  }
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
  c.font = `700 ${r * 0.5}px ${FONT}`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText(text, 0, 2);
  c.restore();
}

function drawWorld(c: Ctx, V: View, s: RunState | null, length: number, L: SkinLabels) {
  const { w, h, HY } = V;
  const near = V.camZ + 0.4;
  const far = V.camZ + 150;
  const RW = 1.5 * RUN.laneW;
  const SW = RW + 2.3;
  const sky = c.createLinearGradient(0, 0, 0, HY);
  sky.addColorStop(0, STAGE.sky[0]!);
  sky.addColorStop(1, STAGE.sky[1]!);
  c.fillStyle = sky;
  c.fillRect(0, 0, w, HY + 2);
  const ht = halftone(c);
  if (ht) {
    c.fillStyle = ht;
    c.fillRect(0, 0, w, HY * 0.55);
  }
  c.fillStyle = C.gold;
  c.strokeStyle = C.navy;
  c.lineWidth = 2.5;
  c.beginPath();
  c.arc(w * 0.78 - V.camX * 4, HY * 0.38, Math.min(w, h) * 0.055, 0, 7);
  c.fill();
  c.stroke();
  c.fillStyle = STAGE.hill;
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(0, HY);
  const sx = -V.camX * 6;
  for (let i = 0; i <= 18; i++) {
    const bx = sx + (i / 18) * w * 1.2 - w * 0.1;
    const bh = (0.25 + noise(i + 3) * 0.6) * HY * 0.45;
    c.lineTo(bx, HY - bh);
    c.lineTo(bx + w * 0.06, HY - bh);
  }
  c.lineTo(w, HY);
  c.closePath();
  c.fill();
  c.stroke();
  const tx = w * 0.3 + sx;
  c.beginPath();
  c.moveTo(tx - 10, HY);
  c.lineTo(tx, HY - HY * 0.62);
  c.lineTo(tx + 10, HY);
  c.fillStyle = C.coral;
  c.fill();
  c.stroke();
  c.fillStyle = C.cream2;
  c.fillRect(0, HY, w, h - HY);
  quad(c, V, [[-RW, 0, near], [RW, 0, near], [RW, 0, far], [-RW, 0, far]], C.asphalt);
  for (const sd of [-1, 1]) quad(c, V, [[sd * RW, 0, near], [sd * (RW + 0.22), 0, near], [sd * (RW + 0.22), 0, far], [sd * RW, 0, far]], C.navy);
  c.strokeStyle = "rgba(27,42,65,.18)";
  c.lineWidth = 1.2;
  for (let z = Math.floor(near / 2.5) * 2.5; z < V.camZ + 70; z += 2.5)
    for (const sd of [-1, 1]) {
      const a = P(V, sd * (RW + 0.22), 0, z);
      const b = P(V, sd * SW, 0, z);
      if (a && b) {
        c.beginPath();
        c.moveTo(a.x, a.y);
        c.lineTo(b.x, b.y);
        c.stroke();
      }
    }
  for (let z = Math.floor(near / 6) * 6; z < V.camZ + 95; z += 6)
    for (const lx of [-0.5, 0.5])
      quad(c, V, [[lx * RUN.laneW - 0.07, 0, z], [lx * RUN.laneW + 0.07, 0, z], [lx * RUN.laneW + 0.07, 0, z + 2.6], [lx * RUN.laneW - 0.07, 0, z + 2.6]], "rgba(255,246,229,.8)");
  // the metro entrance opening + steps
  const z0 = length + 0.6;
  const z1 = length + 7.5;
  const hx = 2.3;
  if (z0 < V.camZ + 140) {
    const pts: [number, number, number][] = [[-hx, 0, Math.max(z0, near)], [hx, 0, Math.max(z0, near)], [hx, 0, z1], [-hx, 0, z1]];
    quad(c, V, pts, "#0F1828", C.gold, 3);
    const edge = pts.map((p) => P(V, ...p));
    if (edge.every(Boolean)) {
      c.save();
      c.beginPath();
      (edge as Pt[]).forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
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
  const vis = city(length)
    .filter((b) => b.z2 > near && b.z1 < V.camZ + 140)
    .sort((a, b) => b.z1 - a.z1);
  for (const b of vis) building(c, V, b, near, SW);
  const fog = c.createLinearGradient(0, HY - h * 0.08, 0, HY + h * 0.05);
  fog.addColorStop(0, "rgba(255,246,229,0)");
  fog.addColorStop(0.75, "rgba(255,246,229,.28)");
  fog.addColorStop(1, "rgba(255,246,229,0)");
  c.fillStyle = fog;
  c.fillRect(0, HY - h * 0.08, w, h * 0.13);
  const ents: { z: number; draw: () => void }[] = [];
  for (let z = Math.ceil(near / 16) * 16; z < V.camZ + 110; z += 16) for (const sd of [-1, 1]) ents.push({ z, draw: () => lamp(c, V, sd * (RW + 0.9), z) });
  // obstacles already ~1 m behind the runner are no longer drawn (they would fill the screen between camera and runner)
  if (s) for (const o of s.obstacles) if (o.z + 1 > near && o.z + o.depth > s.z - 1 && o.z < V.camZ + 95) ents.push({ z: o.z, draw: () => obstacle(c, V, o, L.stop) });
  if (z0 < V.camZ + 140) ents.push({ z: z0 + 0.01, draw: () => metro(c, V, z0, z1, hx, L) });
  ents.sort((a, b) => b.z - a.z).forEach((e) => e.draw());
}

const spring = (t: number, reduced: boolean) => (reduced ? 1 : 1 - Math.exp(-7 * t) * Math.cos(14 * t));

export const SHIBUYA: RunnerSkin = {
  id: "shibuya-day",
  music: { bpm: 132, scale: [60, 62, 64, 67, 69], root: 60, melody: [0, 2, 4, 2, 4, 7, 4, 2, 0, -1, 4, 5, 4, 2, 0, 2, 4, 7, 9, 7, 4, 2, 0, -1] },

  follow(cam: Camera, s: RunState, dt: number, reduced: boolean): Camera {
    const k = 1 - Math.exp(-(reduced ? 3 : 9) * dt);
    const x = lerp(cam.x, s.x * 0.32, k);
    const z = s.phase === "enter" || (s.phase === "done" && s.outcome === "won") ? s.length - ZP - 0.4 : s.z - ZP;
    return { x, z };
  },

  draw(c, w, h, d) {
    const s = d.state;
    c.save();
    if (d.shake > 0 && !d.reduced) {
      const m = (d.shake / 0.3) * 7;
      c.translate((noise(s.t * 60) - 0.5) * m, (noise(s.t * 60 + 9) - 0.5) * m);
    }
    const V = viewFor(w, h, d.cam.x, d.cam.z);
    drawWorld(c, V, s, s.length, d.labels);
    runner(c, V, s, d);
    // manga speed lines
    if (!d.reduced && s.phase === "run") {
      const k = clamp((currentSpeed(s) - 7) / 5, 0, 1);
      const seed = Math.floor(s.t / 0.06);
      c.strokeStyle = `rgba(27,42,65,${0.12 + 0.2 * k})`;
      c.lineCap = "round";
      const cx = w / 2;
      const cy = V.HY;
      const R = Math.hypot(w, h);
      for (let i = 0; i < 30; i++) {
        const a = noise(seed * 31 + i) * Math.PI * 2;
        const r0 = R * (0.42 + noise(seed * 7 + i) * 0.15);
        c.lineWidth = 1 + noise(i + seed) * 2.2;
        c.beginPath();
        c.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
        c.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
        c.stroke();
      }
    }
    const ap = P(V, s.x, 1.9, Math.max(s.z, V.camZ + 1.6));
    for (const f of d.fx) {
      if (f.kind === "bam" && ap) {
        const k = spring(f.age, d.reduced);
        c.globalAlpha = d.reduced ? clamp(1 - f.age / f.life, 0, 1) : clamp((f.life - f.age) / 0.2, 0, 1);
        burst(c, ap.x + ap.s * 0.75, ap.y - ap.s * 0.2, Math.max(34, ap.s * 0.42), f.word, C.gold, k);
        c.globalAlpha = 1;
      }
      if (f.kind === "word") {
        c.globalAlpha = clamp((f.life - f.age) / 0.3, 0, 1);
        burst(c, w * 0.24, h * 0.62, Math.min(w, h) * 0.09, f.word, f.color ?? C.mint, spring(f.age, d.reduced));
        c.globalAlpha = 1;
      }
    }
    if (s.phase === "count") {
      const t = s.phaseT;
      const first = t < RUN.countdown / 2;
      const lt = first ? t : t - RUN.countdown / 2;
      c.globalAlpha = d.reduced ? clamp(lt / 0.15, 0, 1) : 1;
      burst(c, w / 2, h * 0.42, Math.min(w, h) * 0.13, first ? d.labels.ready : d.labels.go, first ? C.paper : C.gold, spring(lt, d.reduced));
      c.globalAlpha = 1;
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
    const drift = reduced ? 0 : (time * 3) % 6;
    const V = viewFor(w, h, 0, RUN.length - 22 + drift);
    drawWorld(c, V, null, RUN.length, labels);
    if (!reduced) {
      c.strokeStyle = "rgba(27,42,65,.22)";
      const R = Math.hypot(w, h);
      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * Math.PI * 2 + 0.1;
        const r0 = R * 0.38;
        c.lineWidth = 1 + (i % 3);
        c.beginPath();
        c.moveTo(w / 2 + Math.cos(a) * r0, V.HY + Math.sin(a) * r0);
        c.lineTo(w / 2 + Math.cos(a) * R, V.HY + Math.sin(a) * R);
        c.stroke();
      }
    }
  },
};
