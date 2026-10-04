/**
 * "A new friend joins your circle" — port of Mirage's events/friend.js.
 * The whole choreography is a set of Web Animations created at once with
 * delays: a single clock, so it can be skipped (finish), replayed or seeked.
 * transform/opacity only (plus one stroke-dashoffset). Under
 * prefers-reduced-motion the final state is shown immediately, no motion.
 *
 * Data is live: the friend who just joined, the player's other friends, and
 * the statement before/after the CHOICE (only what the engine actually
 * changed — e.g. Omar's rent −180; no extra Social bonus is invented).
 */
import { useEffect, useRef, useState } from "react";
import { FRIENDS, FRIEND_SOCIAL_BONUS } from "@/game/data";
import { nameOf, portraitOf, statement, type Player } from "@/game/engine";
import type { Lang } from "@/game/i18n";
import { fmtMoney } from "./format";
import { gaugeMax } from "./Gauge";
import { ICON_PATHS } from "./icons";
import { prefersReducedMotion } from "./hooks";

type TFn = (text: string, vars?: Record<string, string | number>) => string;

export interface FriendEvent {
  before: Player;
  after: Player;
  friendId: string;
  role: "friend" | "partner";
  speech: string;
  space: string;
  turn: number;
}

const EASE = { out: "cubic-bezier(.22,1,.36,1)", pop: "cubic-bezier(.34,1.56,.64,1)", draw: "cubic-bezier(.45,.05,.25,1)" };
const RING_COLORS = ["var(--lilac)", "var(--mint)", "var(--gold)", "var(--coral)", "var(--sky)"];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const svg = (k: string) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON_PATHS[k] ?? ""}</svg>`;

function spring({ k = 170, c = 14, m = 1 } = {}) {
  let x = 0;
  let v = 0;
  const out = [0];
  const dt = 1 / 240;
  for (let i = 0; i < 240 * 3; i++) {
    const a = (-k * (x - 1) - c * v) / m;
    v += a * dt;
    x += v * dt;
    if (i % 4 === 3) out.push(x);
    if (i > 60 && Math.abs(x - 1) < 0.0015 && Math.abs(v) < 0.02) break;
  }
  out.push(1);
  return { values: out, ms: (out.length - 1) * (1000 / 60) };
}
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function perkText(ev: FriendEvent, t: TFn, lang: Lang): { icon: string; text: string } {
  const b = statement(ev.before);
  const a = statement(ev.after);
  if (ev.role === "partner") {
    return { icon: "case", text: t("Partner: {income}/mo passive, {cost}/mo costs", { income: fmtMoney(lang, a.passive - b.passive, true), cost: fmtMoney(lang, -(a.expenses - b.expenses)) }) };
  }
  const def = FRIENDS.find((f) => f.id === ev.friendId);
  switch (def?.friendTrait) {
    case "Reliable roommate":
      return { icon: "house", text: t("Perk: rent {amount}/mo", { amount: fmtMoney(lang, -(b.rent - a.rent)) }) };
    case "Investor":
      return { icon: "coin", text: t("Perk: −10% on deal down payments") };
    case "Connector":
      return { icon: "people", text: t("Perk: small-deal squares can offer two deals") };
    case "Party-goer":
      return { icon: "bag", text: t("Trait: lifestyle costs +15%") };
    case "Mentor":
      return { icon: "cap", text: t("Perk: bigger mentor bonus ({amount})", { amount: fmtMoney(lang, 350) }) };
    default:
      return { icon: "heart", text: t(def?.trait ?? "Friend") };
  }
}

export function FriendScene({ ev, t, lang, onDone }: { ev: FriendEvent; t: TFn; lang: Lang; onDone: () => void }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dimRef = useRef<HTMLDivElement>(null);
  const ctl = useRef<{ skip: () => void; play: () => void; done: () => boolean } | null>(null);
  const [done, setDone] = useState(false);
  const def = FRIENDS.find((f) => f.id === ev.friendId);
  const bSt = statement(ev.before);
  const aSt = statement(ev.after);
  const perk = perkText(ev, t, lang);
  const friendName = def?.name ?? ev.friendId;
  // mirrors the engine: bumpVitals clamps at 100 (per-turn drift is not part of the event)
  const socialDelta = Math.max(0, Math.min(FRIEND_SOCIAL_BONUS, 100 - (ev.before.vitals?.social ?? 50)));
  const socialTxt = socialDelta !== 0 ? `${t("Social")} ${socialDelta > 0 ? "+" : "−"}${Math.abs(socialDelta)}` : "";
  const desc = [
    t(ev.role === "partner" ? "{name} joins your circle as a business partner." : "{name}, {trait}, joins your circle.", { name: friendName, trait: t(def?.trait ?? "") }),
    perk.text,
    socialTxt,
    bSt.expenses !== aSt.expenses ? t("Your expenses go from {a} to {b}.", { a: fmtMoney(lang, bSt.expenses), b: fmtMoney(lang, aSt.expenses) }) : "",
    bSt.passive !== aSt.passive ? t("Your passive income goes from {a} to {b}.", { a: fmtMoney(lang, bSt.passive), b: fmtMoney(lang, aSt.passive) }) : "",
  ]
    .filter(Boolean)
    .join(" ");

  const build = () => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const dim = dimRef.current;
    if (!stage || !canvas || !dim) return null;
    let anims: Animation[] = [];
    const A = (el: Element, kf: Keyframe[], delay: number, duration: number, easing = "linear") => {
      const a = el.animate(kf, { delay, duration, easing, fill: "both" });
      anims.push(a);
      return a;
    };
    const S = (el: Element, map: (v: number) => Keyframe, delay: number, opts?: { k?: number; c?: number }) => {
      const s = spring(opts);
      return A(el, s.values.map(map), delay, s.ms);
    };
    const T = (el: Element, pts: ({ t: number } & Keyframe)[]) => {
      const t0 = pts[0]!.t;
      const t1 = pts[pts.length - 1]!.t;
      return A(el, pts.map(({ t: tt, ...p }) => ({ ...p, offset: (tt - t0) / (t1 - t0) })), t0, t1 - t0);
    };
    const el = (cls: string, html = "", style: Partial<CSSStyleDeclaration> = {}) => {
      const d = document.createElement("div");
      d.className = cls;
      d.innerHTML = html;
      Object.assign(d.style, style);
      return d;
    };
    const px = (n: number) => `${n}px`;
    const token = (img: string, s: number, color: string, alt = "") => {
      const tk = el("tok", `<div class="tok-sq"><div class="base"></div><div class="disc"><img src="${esc(img)}" alt="${esc(alt)}"/></div></div>`);
      tk.style.setProperty("--s", `${s}px`);
      tk.style.setProperty("--c", color);
      return tk;
    };

    // Fixed design canvas, scaled to fit the viewport.
    const mobile = window.innerWidth < 700;
    const W = mobile ? 390 : 1440;
    const H = mobile ? 844 : 900;
    const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
    Object.assign(canvas.style, { width: px(W), height: px(H), transform: `translate(-50%, -50%) scale(${scale})` });
    canvas.innerHTML = "";
    const G = !mobile
      ? (() => {
          const cx = W / 2 + 370;
          const cy = H / 2 - 20;
          return { banner: { x: W / 2, y: 64 }, S: 150, land: { x: W / 2 - 420, y: 560 }, start: { x: -120, y: 600 }, card: { x: W / 2 - 290, y: 240, w: 360, h: 380 }, ring: { cx, cy, R: 168, Sa: 124, Sf: 90, plateR: 238 }, newAng: 180, hop1: 300, hop2: 52, hopJ: 250, chips: { x: W / 2 - 420, y: 706, w: 600 }, mat: { x: cx - 238, y: 704, w: 476 }, ctl: { x: W / 2 - 170, y: 852 } };
        })()
      : { banner: { x: W / 2, y: 44 }, S: 96, land: { x: 74, y: 286 }, start: { x: -70, y: 300 }, card: { x: 138, y: 92, w: W - 152, h: 224 }, ring: { cx: W / 2, cy: 452, R: 84, Sa: 76, Sf: 56, plateR: 120 }, newAng: -90, hop1: 190, hop2: 34, hopJ: 120, chips: { x: 12, y: 590, w: W - 24 }, mat: { x: 12, y: 638, w: W - 24 }, ctl: { x: W / 2, y: 810 } };
    const Rg = G.ring;
    const rad = (d: number) => (d * Math.PI) / 180;
    const slot = (deg: number) => ({ x: Rg.cx + Rg.R * Math.cos(rad(deg)), y: Rg.cy + Rg.R * Math.sin(rad(deg)) });

    A(dim, [{ opacity: 0 }, { opacity: 1 }], 0, 380, EASE.out);

    const banner = el(
      "abs banner",
      `<div class="lid">${svg(ev.role === "partner" ? "case" : "people")}</div><div><small>${esc(t("{space} · turn {turn}", { space: t(ev.space), turn: ev.turn }))}</small><h2 id="ev-title">${esc(t(ev.role === "partner" ? "A new partner joins your circle" : "A new friend joins your circle"))}</h2></div>`,
      { left: px(G.banner.x), top: px(G.banner.y) },
    );
    canvas.append(banner);
    S(banner, (v) => ({ transform: `translate(-50%, -50%) translateY(${lerp(-90, 0, v)}px) scale(${lerp(0.82, 1, v)})`, opacity: clamp01(v * 2.2) }), 120, { k: 210, c: 17 });

    // ring: plate + player + existing friends
    const ring = el("abs", "", { left: "0", top: "0" });
    canvas.append(ring);
    ring.append(el("abs plate", "", { left: px(Rg.cx - Rg.plateR), top: px(Rg.cy - Rg.plateR), width: px(Rg.plateR * 2), height: px(Rg.plateR * 2) }));
    const plate = ring.lastElementChild!;
    const lines = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    lines.setAttribute("class", "lines");
    Object.assign(lines.style, { left: "0", top: "0", width: px(W), height: px(H) });
    ring.append(lines);
    const others = ev.after.friends.filter((f) => f.id !== ev.friendId);
    const n = others.length;
    const orbs = others.map((f, i) => {
      const fd = FRIENDS.find((x) => x.id === f.id);
      const a0 = G.newAng + ((i + 0.5) * 360) / n;
      const a1 = G.newAng + ((i + 1) * 360) / (n + 1);
      const orb = el("abs orb", "", { left: px(Rg.cx), top: px(Rg.cy) });
      const arm = el("arm", "", { width: px(Rg.R) });
      const ft = el("ft", "", { left: px(Rg.R) });
      const tk = token(fd?.portrait ?? "", Rg.Sf, RING_COLORS[i % RING_COLORS.length]!, fd?.name ?? "");
      tk.style.left = "0px";
      tk.style.top = px(0.68 * Rg.Sf);
      ft.append(tk);
      orb.append(arm, ft);
      ring.append(orb);
      orb.style.transform = `rotate(${a0}deg)`;
      ft.style.transform = `rotate(${-a0}deg)`;
      return { orb, ft, a0, a1 };
    });
    const me = token(portraitOf(ev.after), Rg.Sa, "var(--coral)", nameOf(ev.after));
    Object.assign(me.style, { left: px(Rg.cx), top: px(Rg.cy + 0.68 * Rg.Sa) });
    ring.append(me);
    const lab = el(
      "abs ringlabel",
      `${svg("heart")}${esc(t("Your circle"))} <span class="cnt"><span class="c0" aria-hidden="true">${n}/5</span><span class="c1">${n + 1}/5</span></span>`,
      { left: px(Rg.cx), top: px(mobile ? Rg.cy + Rg.plateR : Rg.cy - Rg.plateR) },
    );
    ring.append(lab);
    S(ring, (v) => ({ transform: `translate(${Rg.cx}px, ${Rg.cy}px) scale(${lerp(0.6, 1, v)}) translate(${-Rg.cx}px, ${-Rg.cy}px)`, opacity: clamp01(v * 2) }), 200, { k: 190, c: 15 });

    // new friend token: enters, bounces, jumps into the ring
    const S0 = G.S;
    const k = Rg.Sf / S0;
    const L = G.land;
    const os = slot(G.newAng);
    const og = { x: os.x, y: os.y + 0.68 * Rg.Sf };
    const gsh = el("gsh");
    gsh.style.setProperty("--s", `${S0}px`);
    Object.assign(gsh.style, { left: px(L.x), top: px(L.y) });
    const nf = token(def?.portrait ?? "", S0, "var(--sky)", friendName);
    Object.assign(nf.style, { left: px(L.x), top: px(L.y), zIndex: "5" });
    const sq = nf.querySelector(".tok-sq")!;
    const pos: ({ t: number } & Keyframe)[] = [];
    const shp: ({ t: number } & Keyframe)[] = [];
    const arc = (t0: number, t1: number, p0: { x: number; y: number }, p1: { x: number; y: number }, h: number, s0 = 1, s1 = 1, steps = 30) => {
      for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        const x = lerp(p0.x, p1.x, u);
        const y = lerp(p0.y, p1.y, u) - 4 * h * u * (1 - u);
        const s = lerp(s0, s1, u);
        const tt = lerp(t0, t1, u);
        pos.push({ t: tt, transform: `translate(${x}px, ${y}px) scale(${s})` });
        const lift = (4 * h * u * (1 - u)) / Math.max(G.hop1, 1);
        shp.push({ t: tt, transform: `translate(${x}px, ${lerp(p0.y, p1.y, u)}px) scale(${s * (1 - 0.6 * Math.min(1, lift))})`, opacity: 0.42 * (1 - 0.65 * Math.min(1, lift)) });
      }
    };
    const hold = (tt: number, p: { x: number; y: number }) => {
      pos.push({ t: tt, transform: `translate(${p.x}px, ${p.y}px) scale(1)` });
      shp.push({ t: tt, transform: `translate(${p.x}px, ${p.y}px) scale(1)`, opacity: 0.42 });
    };
    const P0 = { x: G.start.x - L.x, y: G.start.y - L.y };
    const Pa = { x: mobile ? -18 : -40, y: 0 };
    const Z = { x: 0, y: 0 };
    const Pj = { x: og.x - L.x, y: og.y - L.y };
    const tEnter = 360, tLand1 = 960, tUp2 = 1030, tLand2 = 1290, tCrouch = 1880, tLaunch = 2060, tLandJ = 2520;
    arc(tEnter, tLand1, P0, Pa, G.hop1, 1, 1, 36);
    hold(tUp2, Pa);
    arc(tUp2, tLand2, Pa, Z, G.hop2, 1, 1, 18);
    hold(tLaunch, Z);
    arc(tLaunch, tLandJ, Z, Pj, G.hopJ, 1, k, 32);
    shp.forEach((p, i) => {
      if (i < 37) p.opacity = Number(p.opacity) * Math.min(1, i / 10);
    });
    const lastS = shp[shp.length - 1]!;
    shp.push({ t: tLandJ + 200, transform: lastS.transform, opacity: 0 });
    T(nf, pos);
    T(gsh, shp);
    const sc = (tt: number, x: number, y: number) => ({ t: tt, transform: `scale(${x}, ${y})` });
    T(sq, [sc(tEnter, 0.9, 1.1), sc(700, 1, 1), sc(tLand1 - 60, 0.9, 1.12), sc(tLand1, 1.26, 0.74), sc(tUp2, 0.9, 1.12), sc(1120, 1, 1), sc(tLand2 - 40, 0.94, 1.07), sc(tLand2, 1.15, 0.85), sc(1370, 0.96, 1.05), sc(1450, 1.015, 0.985), sc(1540, 1, 1), sc(tCrouch, 1, 1), sc(2030, 1.16, 0.82), sc(tLaunch, 1.16, 0.82), sc(2120, 0.88, 1.14), sc(2260, 1, 1), sc(tLandJ - 50, 0.92, 1.1), sc(tLandJ, 1.24, 0.78), sc(2610, 0.93, 1.07), sc(2700, 1.03, 0.97), sc(2800, 1, 1)]);
    canvas.append(gsh);

    // card: arrives face down, flips
    const C = G.card;
    const card = el(
      "abs card3d",
      `<div class="card-in"><div class="face back"><div class="seal">${svg("people")}</div></div><div class="face front"><div class="hd"><b>${svg("people")}${esc(t(ev.role === "partner" ? "Ties · new partner" : "Ties · new friend"))}</b><span class="pill">${esc(t(ev.role === "partner" ? "Business partner" : "Friend"))}</span></div><div class="bd"><h3>${esc(friendName)}</h3><span class="role">${esc(t(def?.trait ?? ""))}</span><div class="quote">${esc(t(ev.speech))}</div><div class="blurb">${esc(t(def?.blurb ?? ""))}</div><div class="trait">${svg(perk.icon)}${esc(perk.text)}</div></div></div></div>`,
      { left: px(C.x), top: px(C.y), width: px(C.w), height: px(C.h) },
    );
    canvas.append(card);
    const cin = card.querySelector(".card-in")!;
    S(card, (v) => ({ transform: `translateY(${lerp(60, 0, v)}px) rotate(${lerp(-9, -2, v)}deg) scale(${lerp(0.7, 1, v)})`, opacity: clamp01(v * 2.5) }), 820, { k: 200, c: 16 });
    S(cin, (v) => ({ transform: `rotateY(${lerp(180, 0, v)}deg) scale(${1 + 0.06 * Math.sin(Math.PI * clamp01(v))})` }), 1240, { k: 150, c: 15 });

    orbs.forEach(({ orb, ft, a0, a1 }, i) => {
      S(orb, (v) => ({ transform: `rotate(${lerp(a0, a1, v)}deg)` }), 1840 + i * 70, { k: 150, c: 12 });
      S(ft, (v) => ({ transform: `rotate(${-lerp(a0, a1, v)}deg)` }), 1840 + i * 70, { k: 150, c: 12 });
    });
    canvas.append(nf);

    // connection line + knot
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    const len = Math.hypot(os.x - Rg.cx, os.y - Rg.cy);
    for (const [a, v] of Object.entries({ x1: Rg.cx, y1: Rg.cy, x2: os.x, y2: os.y, stroke: "var(--navy)", "stroke-width": 6, "stroke-linecap": "round", "stroke-dasharray": len })) line.setAttribute(a, String(v));
    lines.append(line);
    A(line, [{ strokeDashoffset: len }, { strokeDashoffset: 0 }], 2560, 420, EASE.draw);
    const knot = el("abs heartknot", svg("heart"), { left: px((Rg.cx + os.x) / 2), top: px((Rg.cy + os.y) / 2) });
    ring.append(knot);
    S(knot, (v) => ({ transform: `scale(${Math.max(0, v)})` }), 2900, { k: 260, c: 13 });
    ring.append(me);
    ring.append(lab);

    const plus = el("abs plus1", "+1", { left: px(os.x + Rg.Sf * (mobile ? 0.42 : 0.5)), top: px(os.y - Rg.Sf * 0.62), zIndex: "6" });
    canvas.append(plus);
    S(plus, (v) => ({ transform: `translateY(${lerp(16, 0, v)}px) scale(${Math.max(0, v)}) rotate(${lerp(-30, 8, v)}deg)` }), 2600, { k: 230, c: 11 });
    A(lab.querySelector(".c0")!, [{ transform: "translateY(0)", opacity: 1 }, { transform: "translateY(-14px)", opacity: 0 }], 2660, 220, EASE.out);
    A(lab.querySelector(".c1")!, [{ transform: "translateY(14px)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }], 2740, 320, EASE.pop);
    S(plate, (v) => ({ transform: `scale(${1 + 0.035 * Math.sin(Math.PI * clamp01(v)) * (1 - clamp01(v - 1))})` }), 2520, { k: 120, c: 9 });

    // effect chips (only real engine effects)
    const chips = el("abs chips", "", { left: px(G.chips.x), top: px(G.chips.y), width: px(G.chips.w) });
    const flowDelta = aSt.cashFlow - bSt.cashFlow;
    // mobile: one row only; the perk is already on the card, so the Social chip takes its place
    const chipData: [string, string, string][] = mobile && socialDelta !== 0 ? [] : [["s", perk.icon, esc(perk.text)]];
    if (socialDelta !== 0) chipData.push([socialDelta > 0 ? "g" : "r", "people", `${esc(t("Social"))} <span class="num">${socialDelta > 0 ? "+" : "−"}${Math.abs(socialDelta)}</span>`]);
    if (!mobile && aSt.expenses !== bSt.expenses) chipData.push(["", aSt.expenses < bSt.expenses ? "down" : "up", `${esc(t("Expenses"))} <span class="num">${esc(fmtMoney(lang, bSt.expenses))} → ${esc(fmtMoney(lang, aSt.expenses))}</span>`]);
    if (aSt.passive !== bSt.passive) chipData.push(["g", "up", `${esc(t("Passive income"))} <span class="num">${esc(fmtMoney(lang, aSt.passive - bSt.passive, true))}</span>`]);
    if (flowDelta !== 0) chipData.push([flowDelta > 0 ? "g" : "r", flowDelta > 0 ? "up" : "down", `${esc(t("Monthly cash flow"))} <span class="num">${esc(fmtMoney(lang, flowDelta, true))}</span>`]);
    chipData.forEach(([cls, ic, txt], i) => {
      const c = el(`chip ${cls}`, `<i>${svg(ic)}</i><span>${txt}</span>`);
      chips.append(c);
      S(c, (v) => ({ transform: `translateY(${lerp(18, 0, v)}px) scale(${lerp(0.4, 1, v)})`, opacity: clamp01(v * 3) }), 2800 + i * 120, { k: 240, c: 15 });
    });
    canvas.append(chips);

    // player-mat gauge: the Gate marker / fill slide to the new values
    const M = G.mat;
    const max = gaugeMax(bSt.expenses, aSt.expenses, Math.max(aSt.passive, bSt.passive));
    const gapB = bSt.expenses - bSt.passive;
    const gapA = aSt.expenses - aSt.passive;
    const openTxt = esc(t("Gate open"));
    const mat = el(
      "abs mat2",
      `<div class="h3"><span class="dot" style="background:var(--mint)"></span>${esc(t("The Gate: passive vs expenses"))}</div>
      <div class="track2"><div class="fill"></div><div class="gap"></div><div class="marker"><div class="door">${svg("door")}${esc(t("Gate"))} · <span class="mk">${esc(fmtMoney(lang, bSt.expenses))}</span></div></div></div>
      <div class="matrow"><span class="p">${esc(t("Passive"))} <span class="pv">${esc(fmtMoney(lang, bSt.passive))}</span></span><span class="e">${esc(t("Expenses"))} <span class="ev">${esc(fmtMoney(lang, bSt.expenses))}</span></span></div>
      <div class="mhint"></div>`,
      { left: px(M.x), top: px(M.y), width: px(M.w) },
    );
    canvas.append(mat);
    const hintEl = mat.querySelector(".mhint") as HTMLElement;
    const setHint = (gap: number) => {
      hintEl.innerHTML = gap > 0 ? esc(t("Still {amount} of passive income to open the Gate.", { amount: "§" })).replace("§", `<b>${esc(fmtMoney(lang, gap))}</b>`) : `<b class="ok">${openTxt}</b>`;
    };
    setHint(gapB);
    const tw = M.w - (mobile ? 24 : 32) - 6;
    const xE0 = (bSt.expenses / max) * tw;
    const xE1 = (aSt.expenses / max) * tw;
    const xP0 = (bSt.passive / max) * tw;
    const xP1 = (aSt.passive / max) * tw;
    const fill = mat.querySelector(".fill") as HTMLElement;
    const mk = mat.querySelector(".marker") as HTMLElement;
    const gp = mat.querySelector(".gap") as HTMLElement;
    fill.style.width = px(Math.max(xP0, xP1));
    fill.style.transformOrigin = "0 50%";
    S(mat, (v) => ({ transform: `translateY(${lerp(24, 0, v)}px) scale(${lerp(0.85, 1, v)})`, opacity: clamp01(v * 2.5) }), 2720, { k: 200, c: 17 });
    S(mk, (v) => ({ transform: `translateX(${lerp(xE0, xE1, v)}px)` }), 3020, { k: 120, c: 13 });
    const mx = Math.max(xP0, xP1) || 1;
    S(fill, (v) => ({ transform: `scaleX(${lerp(xP0, xP1, v) / mx})` }), 3020, { k: 120, c: 13 });
    // gap = stripes between passive and expenses (only while still locked)
    const g0 = Math.max(0, xE0 - xP0);
    const g1 = Math.max(0, xE1 - xP1);
    const gw = Math.max(g0, g1, 1);
    Object.assign(gp.style, { width: px(gw) });
    S(gp, (v) => ({ transform: `translateX(${lerp(xP0, xP1, v)}px) scaleX(${lerp(g0, g1, v) / gw})` }), 3020, { k: 120, c: 13 });
    const counters = { t0: 3020, t1: 3560, ev: mat.querySelector(".ev")!, mk: mat.querySelector(".mk")!, pv: mat.querySelector(".pv")! };

    // controls: React-rendered, positioned where the design canvas puts them
    const ctlEl = stage.querySelector<HTMLElement>(".ctl");
    if (ctlEl) {
      Object.assign(ctlEl.style, {
        left: px(window.innerWidth / 2 + (G.ctl.x - W / 2) * scale),
        top: px(Math.min(window.innerHeight - 40, window.innerHeight / 2 + (G.ctl.y - H / 2) * scale)),
      });
      S(ctlEl, (v) => ({ transform: `translate(-50%, -50%) translateY(${lerp(30, 0, v)}px) scale(${lerp(0.8, 1, v)})`, opacity: clamp01(v * 2.5) }), 3280, { k: 220, c: 18 });
    }
    const hint = el("abs skiphint", esc(t("Tap to skip")));
    canvas.append(hint);
    A(hint, [{ opacity: 0 }, { opacity: 1, offset: 0.12 }, { opacity: 1, offset: 0.85 }, { opacity: 0 }], 400, 2900);

    // confetti: coins + hearts, ballistic arcs
    const fxl = el("fx");
    canvas.append(fxl);
    const r = rng(11);
    const sc2 = mobile ? 0.62 : 1;
    for (let i = 0; i < (mobile ? 16 : 24); i++) {
      const heart = i % 3 === 1;
      const p = el(`cf ${heart ? "heart" : "coin"}`, heart ? svg("heart") : "$");
      fxl.append(p);
      const vx = (r() * 2 - 1) * 460 * sc2;
      const vy = -(420 + r() * 420) * sc2;
      const g = 1500 * sc2;
      const w = (r() * 2 - 1) * 560;
      const d = 1.05 + r() * 0.55;
      const steps = 26;
      const sz = 0.75 + r() * 0.45;
      const kf: Keyframe[] = [];
      for (let j = 0; j <= steps; j++) {
        const tt = (j / steps) * d;
        const u = j / steps;
        kf.push({ transform: `translate(${os.x + vx * tt}px, ${os.y + vy * tt + 0.5 * g * tt * tt}px) rotate(${w * tt}deg) scale(${sz * Math.min(1, u / 0.08)})`, opacity: u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3 });
      }
      A(p, kf, 2540 + Math.floor(r() * 90), d * 1000);
    }

    const total = Math.max(...anims.map((a) => Number(a.effect?.getComputedTiming().endTime ?? 0)));
    const update = (tm: number) => {
      const u = clamp01((tm - counters.t0) / (counters.t1 - counters.t0));
      const e = 1 - Math.pow(1 - u, 3);
      const ex = Math.round(lerp(bSt.expenses, aSt.expenses, e));
      const pv = Math.round(lerp(bSt.passive, aSt.passive, e));
      counters.ev.textContent = fmtMoney(lang, ex);
      counters.mk.textContent = fmtMoney(lang, ex);
      counters.pv.textContent = fmtMoney(lang, pv);
      setHint(u >= 1 ? gapA : ex - pv);
    };
    return {
      anims,
      total,
      update,
      cancel: () => {
        anims.forEach((a) => a.cancel());
        anims = [];
      },
    };
  };

  const buildRef = useRef(build);
  buildRef.current = build;

  useEffect(() => {
    let raf = 0;
    let scene: ReturnType<typeof build> = null;
    let finished = false;
    let gen = 0; // bumps on every (re)play so a stale `finished` promise can't end a newer run
    const finish = () => {
      if (!scene || finished) return;
      finished = true;
      cancelAnimationFrame(raf);
      raf = 0;
      scene.update(scene.total);
      setDone(true);
      window.setTimeout(() => stageRef.current?.querySelector<HTMLButtonElement>(".js-next")?.focus({ preventScroll: true }), 0);
    };
    // Drive the counters from the scene clock (the longest-running animation), not anims[0],
    // which ends long before the scene does. Completion itself comes from Animation.finished.
    const tick = () => {
      if (!scene || finished) return;
      const tm = Math.max(0, ...scene.anims.map((a) => Number(a.currentTime ?? 0)));
      scene.update(tm);
      raf = requestAnimationFrame(tick);
    };
    const skip = () => {
      if (finished) return;
      cancelAnimationFrame(raf);
      scene?.anims.forEach((a) => a.finish());
      finish();
    };
    const play = () => {
      cancelAnimationFrame(raf);
      scene?.cancel();
      finished = false;
      setDone(false);
      const my = ++gen;
      scene = buildRef.current();
      if (!scene) return;
      if (prefersReducedMotion() || scene.anims.length === 0) {
        skip();
        return;
      }
      Promise.all(scene.anims.map((a) => a.finished)).then(
        () => {
          if (my === gen) finish();
        },
        () => {}, // cancelled (replay / unmount)
      );
      raf = requestAnimationFrame(tick);
    };
    ctl.current = { skip, play, done: () => finished };
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      play();
    };
    if (document.fonts?.ready) void document.fonts.ready.then(start);
    else start();
    const fallback = window.setTimeout(start, 400);
    return () => {
      window.clearTimeout(fallback);
      gen++;
      cancelAnimationFrame(raf);
      scene?.cancel();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!["Escape", " ", "Spacebar", "Enter"].includes(e.key)) return;
      if (ctl.current && !ctl.current.done()) {
        e.preventDefault();
        e.stopImmediatePropagation();
        ctl.current.skip();
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        onDone();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onDone]);

  return (
    <div className="ev-root" role="dialog" aria-modal="true" aria-labelledby="ev-title" aria-describedby="ev-desc">
      <div className="dim" ref={dimRef} />
      <div
        className={`stage ${done ? "done" : ""}`}
        ref={stageRef}
        onClick={() => {
          if (ctl.current && !ctl.current.done()) ctl.current.skip();
        }}
      >
        <div className="ev-canvas" ref={canvasRef} />
        <div className="ctl">
          <button
            type="button"
            className="btn"
            onClick={(e) => {
              e.stopPropagation();
              ctl.current?.play();
            }}
          >
            <span dangerouslySetInnerHTML={{ __html: svg("replay") }} />
            {t("Replay")}
          </button>
          <button
            type="button"
            className="btn gold js-next"
            onClick={(e) => {
              e.stopPropagation();
              onDone(); // "Continue" always closes in one action, even mid-animation
            }}
          >
            {t("Continue")}
            <span dangerouslySetInnerHTML={{ __html: svg("next") }} />
          </button>
        </div>
      </div>
      <p className="sr-only" id="ev-desc" aria-live="polite">
        {desc}
      </p>
    </div>
  );
}
