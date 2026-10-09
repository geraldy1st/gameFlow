/**
 * "Course vers le métro" — the optional minigame offered every 10 turns (UI after Mirage's validated mockup,
 * gameflow-bc/runner/).
 *
 * - <MetroOffer>: « Le métro passe. Tu cours ? » (J'y vais / Pas cette fois) with a live vignette of the street.
 * - <MetroRun>: fullscreen run. Rules = src/game/metro-run.ts (pure), look = a RunnerSkin (metro-skin*.ts),
 *   sound = metro-audio.ts; this file only wires input, loop, HUD, result and accessibility.
 * Nothing here touches the game state: onDone(lives) hands control back to GameFlow, which dispatches METRO.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { METRO_LIVES, RUN, act, advanceRun, currentSpeed, metroReward, newRun, type MetroAction, type RunState } from "@/game/metro-run";
import { RunnerAudio, readRunnerMute, saveRunnerMute } from "./metro-audio";
import { FIREWORK_MARKS, fireworkBurst, staticSparkles, updateSparks, type Camera, type FaceSet, type Fx, type RunnerSkin, type SkinLabels, type Spark } from "./metro-skin";
import { SHIBUYA } from "./metro-skin-shibuya";

type TFn = (text: string, vars?: Record<string, string | number>) => string;
type MoneyFn = (n: number, signed?: boolean) => string;

/** The only skin for now (Shibuya by day). */
export const METRO_SKIN: RunnerSkin = SHIBUYA;

/** Japanese shop signs: only these glyphs are fetched, and only once the minigame shows up. */
function ensureJpFont(): void {
  if (typeof document === "undefined" || document.getElementById("metro-jp-font")) return;
  const l = document.createElement("link");
  l.id = "metro-jp-font";
  l.rel = "stylesheet";
  l.href = `https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700&display=swap&text=${encodeURIComponent("寿司ラーメンカラオケコンビニ居酒屋ブティック地下鉄駅")}`;
  document.head.appendChild(l);
}

function skinLabels(t: TFn): SkinLabels {
  return {
    metro: t("METRO"),
    line: t("Line 2 · Freedom"),
    ready: t("On your marks"),
    go: t("Run!"),
    ding: t("DING!"),
    stop: t("STOP"),
    bonk: t("BONK!"),
    oops: t("OOPS!"),
  };
}

function useCanvasSize(canvas: React.RefObject<HTMLCanvasElement | null>, onSize: () => void) {
  const size = useRef({ w: 0, h: 0, dpr: 1 });
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const fit = () => {
      const r = c.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      size.current = { w: r.width, h: r.height, dpr };
      c.width = Math.max(2, Math.round(r.width * dpr));
      c.height = Math.max(2, Math.round(r.height * dpr));
      onSize();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(c);
    return () => ro.disconnect();
  }, [canvas, onSize]);
  return size;
}

/* ------------------------------------------------------------------ offer */

export interface MetroOfferProps {
  t: TFn;
  money: MoneyFn;
  portrait: string;
  reduced: boolean;
  gameMuted: boolean;
  /** Called from the click, with the audio already unlocked (browsers need the gesture). */
  onRun: (audio: RunnerAudio) => void;
  onDecline: () => void;
}

export function MetroOffer({ t, money, portrait, reduced, gameMuted, onRun, onDecline }: MetroOfferProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const labels = useRef(skinLabels(t));
  labels.current = skinLabels(t);
  const t0 = useRef(typeof performance !== "undefined" ? performance.now() : 0);
  const draw = useCallback(() => {
    const c = canvas.current;
    const g = c?.getContext("2d");
    if (!c || !g) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = c.width / dpr;
    const h = c.height / dpr;
    if (w < 4) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    METRO_SKIN.drawPanel(g, w, h, (performance.now() - t0.current) / 1000, { reduced, labels: labels.current });
  }, [reduced]);
  useCanvasSize(canvas, draw);
  useEffect(() => {
    ensureJpFont();
    if (reduced) {
      draw();
      const id = window.setTimeout(draw, 600); // fonts
      return () => window.clearTimeout(id);
    }
    let raf = 0;
    const loop = () => {
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [draw, reduced]);

  const go = () => {
    const audio = new RunnerAudio(METRO_SKIN.music, readRunnerMute(gameMuted));
    audio.unlock();
    onRun(audio);
  };

  return (
    <div className="overlay metro-offer-wrap">
      <div className="mr-card mr-offer" role="dialog" aria-modal="true" aria-labelledby="metro-offer-title" aria-describedby="metro-offer-desc">
        <div className="mr-panel" aria-hidden="true">
          <canvas ref={canvas} />
          <span className="mr-sfx">{t("BZZZ… DING")}</span>
        </div>
        <div className="mr-offer-body">
          <span className="mr-pill gold">{t("Bonus · every 10 turns")}</span>
          <div className="mr-speech">
            <img src={portrait} alt="" />
            <h2 id="metro-offer-title">{t("The metro is coming. Do you run?")}</h2>
          </div>
          <p id="metro-offer-desc">
            {t("Three lanes, three lives, one street to the metro entrance.")} {t("Arrive without a hit:")} <b>{money(500, true)}</b>.{" "}
            {t("With one or two lives left:")} <b>{money(250, true)}</b>. {t("Saying no costs nothing.")}
          </p>
          <ul className="mr-legend">
            <li>
              <i className="mr-lg walker" aria-hidden="true">↓</i>
              <span><b>{t("Passer-by with a plank")}</b> : {t("slide under it, or change lane")}</span>
            </li>
            <li>
              <i className="mr-lg cop" aria-hidden="true">⇆</i>
              <span><b>{t("Police officer")}</b> : {t("change lane only")}</span>
            </li>
            <li>
              <i className="mr-lg barrier" aria-hidden="true">↑</i>
              <span><b>{t("Works barrier")}</b> : {t("jump over it, or change lane")}</span>
            </li>
          </ul>
          <div className="mr-row">
            <button type="button" className="mr-btn gold" data-autofocus onClick={go}>{t("I’m going")}</button>
            <button type="button" className="mr-btn ghost" onClick={onDecline}>{t("Not this time")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ run */

const KEYS: Record<string, MetroAction> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "jump",
  ArrowDown: "slide",
  KeyA: "left",
  KeyD: "right",
  KeyW: "jump",
  KeyS: "slide",
};
const LETTERS: Record<string, MetroAction> = { a: "left", d: "right", w: "jump", s: "slide" };

export interface MetroRunProps {
  t: TFn;
  money: MoneyFn;
  name: string;
  faces: { idle: string; happy: string; stressed: string };
  /** Simple body variant under the portrait. */
  skirt: boolean;
  /** Active player's cash before the reward (result card counter). */
  cash: number;
  seed?: number;
  reduced: boolean;
  /** The game's own mute (default for the runner's ♪ until the player chooses). */
  gameMuted: boolean;
  audio: RunnerAudio | null;
  /** Called once, from « Retour à la partie »: lives left (0 = missed). */
  onDone: (lives: number) => void;
  /** Dev-only bot (hidden ?metro-demo hook); never passed in production builds. */
  driver?: (s: RunState) => MetroAction | null;
}

type Pause = null | "user" | "hidden";

export function MetroRun({ t, money, name, faces, skirt, cash, seed = RUN.seed, reduced, gameMuted, audio, onDone, driver }: MetroRunProps) {
  const run = useRef<RunState>(newRun(seed));
  const cam = useRef<Camera>({ x: 0, z: -4.2 });
  const fx = useRef<Fx[]>([]);
  const sparks = useRef<Spark[]>([]);
  const fw = useRef({ t: 0, i: 0 });
  const fxT = useRef({ shake: 0, flash: 0, vign: 0 });
  const faceImgs = useRef<FaceSet>({ idle: null, happy: null, stressed: null });
  const labels = useRef(skinLabels(t));
  labels.current = skinLabels(t);
  const [lives, setLives] = useState(METRO_LIVES);
  const [paused, setPaused] = useState<Pause>(null);
  const pausedRef = useRef<Pause>(null);
  pausedRef.current = paused;
  const [result, setResult] = useState<null | { won: boolean; lives: number }>(null);
  const [say, setSay] = useState(t("On your marks. 3 lives."));
  const [muted, setMutedState] = useState(() => readRunnerMute(gameMuted));
  const [shownCash, setShownCash] = useState(cash);
  const [cashBump, setCashBump] = useState(false);
  const [journalShown, setJournalShown] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const view = useRef<HTMLDivElement>(null);
  const progFill = useRef<HTMLElement>(null);
  const progFace = useRef<HTMLImageElement>(null);
  const progText = useRef<HTMLElement>(null);
  const progBar = useRef<HTMLSpanElement>(null);
  const speedText = useRef<HTMLElement>(null);
  const rewardEl = useRef<HTMLSpanElement>(null);
  const cashEl = useRef<HTMLElement>(null);
  const coinsHost = useRef<HTMLDivElement>(null);
  const backBtn = useRef<HTMLButtonElement>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    ensureJpFont();
    const load = (src: string) => {
      const im = new Image();
      im.src = src;
      return im;
    };
    faceImgs.current = { idle: load(faces.idle), happy: load(faces.happy), stressed: load(faces.stressed) };
  }, [faces.idle, faces.happy, faces.stressed]);

  const draw = useCallback(() => {
    const c = canvas.current;
    const g = c?.getContext("2d");
    if (!c || !g) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = c.width / dpr;
    const h = c.height / dpr;
    if (w < 4) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    METRO_SKIN.draw(g, w, h, {
      state: run.current,
      cam: cam.current,
      reduced,
      faces: faceImgs.current,
      skirt,
      labels: labels.current,
      fx: fx.current,
      sparks: sparks.current,
      shake: fxT.current.shake,
      flash: fxT.current.flash,
      vign: fxT.current.vign,
      viewportH: window.innerHeight,
    });
  }, [reduced, skirt]);
  useCanvasSize(canvas, draw);

  const hud = useCallback(() => {
    const s = run.current;
    const left = Math.max(0, s.length - s.z);
    const pct = Math.max(0, Math.min(1, s.z / s.length)) * 100;
    if (progFill.current) progFill.current.style.width = `${pct}%`;
    if (progFace.current) progFace.current.style.left = `${pct}%`;
    if (progText.current) progText.current.textContent = `${Math.ceil(left)} m`;
    if (progBar.current) {
      progBar.current.setAttribute("aria-valuenow", String(Math.round(Math.min(s.z, s.length))));
      progBar.current.setAttribute("aria-valuetext", t("{m} m to the metro", { m: Math.ceil(left) }));
    }
    if (speedText.current) speedText.current.textContent = `${Math.round(currentSpeed(s) * 3.6)} km/h`;
  }, [t]);

  const finish = useCallback(
    (s: RunState) => {
      const won = s.outcome === "won";
      setResult({ won, lives: won ? s.lives : 0 });
      audio?.sfx(won ? "win" : "fail");
      const reward = won ? metroReward(s.lives) : 0;
      setSay(
        won
          ? t("You made the metro. Lives left: {n}/3. {amount} won.", { n: s.lives, amount: money(reward) })
          : t("Missed. No reward."),
      );
      fw.current = { t: 0, i: 0 };
      sparks.current = won && reduced ? staticSparkles() : [];
    },
    [audio, money, reduced, t],
  );

  // Game loop: fixed-step rules, skin drawing, effects. Keeps drawing the fireworks behind the result card.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!pausedRef.current) {
        const before = run.current;
        let s = advanceRun(before, dt);
        if (driver) {
          const a = driver(s);
          if (a) {
            const n = act(s, a);
            if (n !== s) {
              if (n.jumpT === 0) audio?.sfx("jump");
              if (n.slideT === 0) audio?.sfx("slide");
            }
            s = n;
          }
        }
        run.current = s;
        audio?.pump(dt);
        fx.current = fx.current.filter((f) => (f.age += dt) < f.life);
        const k = fxT.current;
        k.shake = Math.max(0, k.shake - dt);
        k.flash = Math.max(0, k.flash - dt);
        k.vign = Math.max(0, k.vign - dt);
        if (before.phase === "count" && s.phase === "run") setSay(t("Run! 3 lives. The metro is {m} metres away.", { m: s.length }));
        if (s.hits > before.hits) {
          const kind = s.lastHit;
          fx.current.push({ kind: "bam", age: 0, life: 0.7, word: kind === "cop" ? t("STOP!") : kind === "barrier" ? labels.current.bonk : labels.current.oops });
          audio?.sfx("hit");
          if (!reduced) {
            k.shake = 0.3;
            k.flash = 0.12;
          }
          k.vign = reduced ? 0.6 : 0.45;
          setLives(s.lives);
          const who = kind === "cop" ? t("Hit by a police officer.") : kind === "barrier" ? t("Hit by a barrier.") : t("Hit by a passer-by.");
          setSay(`${who} ${s.lives > 0 ? t("Lives left: {n}/3.", { n: s.lives }) : t("No lives left.")}`);
        }
        if (before.phase === "run" && s.phase === "enter") fx.current.push({ kind: "word", age: 0, life: 1.4, word: labels.current.ding, color: "#3DDC97" });
        if (before.phase !== "done" && s.phase === "done") finish(s);
        if (s.phase === "done" && s.outcome === "won" && !reduced) {
          fw.current.t += dt;
          while (fw.current.i < FIREWORK_MARKS.length && fw.current.t >= FIREWORK_MARKS[fw.current.i]!) {
            sparks.current.push(...fireworkBurst(fw.current.i));
            fw.current.i++;
          }
        }
        const c = canvas.current;
        sparks.current = updateSparks(sparks.current, dt, c?.clientWidth ?? 1, c?.clientHeight ?? 1);
        cam.current = METRO_SKIN.follow(cam.current, s, dt, reduced);
        hud();
      }
      draw();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [audio, draw, driver, finish, hud, reduced, t]);

  const press = useCallback(
    (a: MetroAction) => {
      const b = document.querySelector<HTMLElement>(`.mr-ctl[data-act="${a}"]`);
      if (b) {
        b.classList.add("down");
        window.setTimeout(() => b.classList.remove("down"), 140);
      }
      if (pausedRef.current) return;
      const s = run.current;
      const n = act(s, a);
      if (n === s) return;
      if (n.jumpT === 0 && s.jumpT !== 0) audio?.sfx("jump");
      if (n.slideT === 0 && s.slideT !== 0) audio?.sfx("slide");
      run.current = n;
    },
    [audio],
  );

  const pause = useCallback(
    (why: "user" | "hidden") => {
      const s = run.current;
      if (pausedRef.current || s.phase === "done") return;
      pausedRef.current = why;
      setPaused(why);
      audio?.silence();
      setSay(t("Run paused."));
    },
    [audio, t],
  );
  const resume = () => {
    if (!pausedRef.current) return;
    pausedRef.current = null;
    setPaused(null);
    audio?.resume();
    setSay(t("Resumed."));
    view.current?.focus({ preventScroll: true });
  };
  const giveUp = () => {
    run.current = { ...run.current, phase: "done", outcome: "lost", lives: 0 };
    pausedRef.current = null;
    setPaused(null);
    setLives(0);
    finish(run.current);
  };

  // Pause when the tab is hidden.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden") pause("hidden");
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [pause]);

  // Keyboard: arrows or A/D, W/up = jump, S/down = slide (physical keys: ZQSD on AZERTY), Esc / P = pause.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Escape" || e.code === "KeyP") {
        if (run.current.phase === "done") return;
        e.preventDefault();
        e.stopImmediatePropagation();
        if (pausedRef.current) resume();
        else pause("user");
        return;
      }
      const a = KEYS[e.code] ?? KEYS[e.key] ?? LETTERS[e.key.toLowerCase()];
      if (!a) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (!e.repeat) press(a);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [press, pause]);

  // Swipes on the street: horizontal = left / right, up = jump, down = slide (30 px).
  const swipe = useRef<{ x: number; y: number; done: boolean } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    swipe.current = { x: e.clientX, y: e.clientY, done: false };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch {
      /* pointer already released (e.g. synthetic events): swipes still work */
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const sw = swipe.current;
    if (!sw || sw.done) return;
    const dx = e.clientX - sw.x;
    const dy = e.clientY - sw.y;
    if (Math.hypot(dx, dy) < 30) return;
    sw.done = true;
    press(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "left" : "right") : dy < 0 ? "jump" : "slide");
  };
  const endSwipe = () => {
    swipe.current = null;
  };

  // No page scroll while the run is open (mobile).
  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.overflow;
    const prevBody = document.body.style.overflow;
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    view.current?.focus({ preventScroll: true });
    return () => {
      html.style.overflow = prev;
      document.body.style.overflow = prevBody;
    };
  }, []);

  // Result: coins fly from the reward to the cash counter (reduced motion: the counter just updates).
  useEffect(() => {
    if (!result) return;
    window.setTimeout(() => backBtn.current?.focus({ preventScroll: true }), 30);
    const reward = result.won ? metroReward(result.lives) : 0;
    if (!reward) {
      const id = window.setTimeout(() => setJournalShown(true), reduced ? 0 : 450);
      return () => window.clearTimeout(id);
    }
    audio?.sfx("coin");
    const host = coinsHost.current;
    const from = rewardEl.current?.getBoundingClientRect();
    const to = cashEl.current?.getBoundingClientRect();
    const n = reduced || !host || !from || !to ? 0 : Math.round(reward / 50);
    const dur = 620;
    const gap = 70;
    const t0 = 380;
    for (let i = 0; i < n; i++) {
      const c = document.createElement("span");
      c.className = "mr-coin";
      c.textContent = "$";
      const x0 = from!.left + from!.width / 2 - 13 + (((i * 37) % 11) / 11 - 0.5) * 30;
      const y0 = from!.top + from!.height / 2 - 13;
      const dx = to!.left + to!.width / 2 - 13 - x0;
      const dy = to!.top + to!.height / 2 - 13 - y0;
      c.style.left = `${x0}px`;
      c.style.top = `${y0}px`;
      c.style.opacity = "0";
      host!.append(c);
      const anim = c.animate?.(
        [
          { transform: "translate(0,0) scale(.6)", opacity: 0 },
          { transform: `translate(${dx * 0.35}px,${dy * 0.35 - 70}px) scale(1.1)`, opacity: 1, offset: 0.45 },
          { transform: `translate(${dx}px,${dy}px) scale(.7)`, opacity: 1, offset: 0.95 },
          { transform: `translate(${dx}px,${dy}px) scale(.5)`, opacity: 0 },
        ],
        { duration: dur, delay: t0 + i * gap, easing: "cubic-bezier(.35,.1,.3,1)", fill: "both" },
      );
      if (anim) anim.onfinish = () => c.remove();
    }
    const total = n ? t0 + (n - 1) * gap + dur : 600;
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      const el = performance.now() - start;
      const k = n ? Math.max(0, Math.min(1, (el - t0 - dur * 0.9) / ((n - 1) * gap + 1))) : Math.min(1, el / 600);
      setShownCash(Math.round(cash + reward * k));
      if (el < total + 60) raf = requestAnimationFrame(tick);
      else {
        setShownCash(cash + reward);
        if (!reduced) setCashBump(true);
        setJournalShown(true);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      if (host) host.innerHTML = "";
    };
  }, [result, audio, cash, reduced]);

  const toggleMute = () => {
    const m = !muted;
    setMutedState(m);
    saveRunnerMute(m);
    audio?.setMuted(m);
  };

  const back = () => {
    if (doneRef.current || !result) return;
    doneRef.current = true;
    audio?.close();
    onDone(result.won ? result.lives : 0);
  };

  const reward = result?.won ? metroReward(result.lives) : 0;
  const journal = result ? (result.won ? t("Metro run: +{amount}", { amount: money(reward) }) : t("Metro run: missed")) : "";
  const controls: { a: MetroAction; label: string; hint: string; kbd: string; path: string }[] = [
    { a: "left", label: t("left"), hint: t("Change lane to the left"), kbd: "← A", path: "M15 5l-7 7 7 7" },
    { a: "jump", label: t("jump"), hint: t("Jump over a barrier"), kbd: "↑ W", path: "M5 16l7-8 7 8" },
    { a: "slide", label: t("slide"), hint: t("Slide under a passer-by’s plank"), kbd: "↓ S", path: "M5 8l7 8 7-8" },
    { a: "right", label: t("right"), hint: t("Change lane to the right"), kbd: "D →", path: "M9 5l7 7-7 7" },
  ];
  const heart = "M12 21s-7.5-4.6-9.6-9.3C.8 8.1 3 4.5 6.6 4.5c2.1 0 3.6 1.1 5.4 3.1 1.8-2 3.3-3.1 5.4-3.1 3.6 0 5.8 3.6 4.2 7.2C19.5 16.4 12 21 12 21z";

  return (
    <div className={`metro-run${reduced ? " is-reduced" : ""}`} role="dialog" aria-modal="true" aria-labelledby="metro-run-title">
      <div className="mr-frame" aria-hidden={result || paused ? true : undefined}>
        <header className="mr-head">
          <span className="mr-pill gold">{t("Bonus")}</span>
          <h1 id="metro-run-title">{t("Metro run")}</h1>
          <span className="mr-hint">{t("Arrows or A/D · up = jump · down = slide · Esc = pause")}</span>
        </header>
        <div className="mr-view" ref={view} tabIndex={-1} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endSwipe} onPointerCancel={endSwipe}>
          <canvas ref={canvas} aria-hidden="true" />
          <div className="mr-hud">
            <div className="mr-chip mr-lives" role="img" aria-label={t("Lives: {n} of {max}", { n: lives, max: METRO_LIVES })}>
              {Array.from({ length: METRO_LIVES }, (_, i) => (
                <svg key={i} className={`mr-heart${i < lives ? "" : " lost"}`} viewBox="0 0 24 24" aria-hidden="true">
                  <path d={heart} />
                </svg>
              ))}
            </div>
            <div className="mr-chip mr-meter">
              <span className="mr-lbl">{t("Metro")}</span>
              <span className="mr-bar" ref={progBar} role="progressbar" aria-label={t("Distance to the metro")} aria-valuemin={0} aria-valuemax={RUN.length} aria-valuenow={0}>
                <i ref={progFill} />
                <img ref={progFace} src={faces.idle} alt="" />
                <em aria-hidden="true">M</em>
              </span>
              <b ref={progText}>{RUN.length} m</b>
            </div>
            <div className="mr-chip mr-speed">
              <span className="mr-lbl">{t("Speed")}</span>
              <b ref={speedText}>29 km/h</b>
            </div>
            <button type="button" className="mr-chip mr-iconbtn mr-mute" aria-pressed={muted} aria-label={muted ? t("Turn the sound back on") : t("Mute the sound")} onClick={toggleMute}>
              <span aria-hidden="true">♪</span>
            </button>
            <button type="button" className="mr-chip mr-iconbtn" aria-label={t("Pause the run")} onClick={() => pause("user")}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 5v14M16 5v14" />
              </svg>
            </button>
          </div>
        </div>
        <div className="mr-controls" role="group" aria-label={t("Runner controls")}>
          {controls.map((c) => (
            <button
              key={c.a}
              type="button"
              className="mr-ctl"
              data-act={c.a}
              aria-label={`${c.label} : ${c.hint}`}
              onPointerDown={(e) => {
                e.preventDefault();
                press(c.a);
              }}
              onClick={(e) => {
                if (e.detail === 0) press(c.a); // Enter / Space on the focused button
              }}
              onContextMenu={(e) => e.preventDefault()}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d={c.path} />
              </svg>
              <span>{c.label}</span>
              <kbd aria-hidden="true">{c.kbd}</kbd>
            </button>
          ))}
        </div>
      </div>

      {paused && (
        <div className="mr-overlay">
          <div className="mr-card mr-pausecard" role="dialog" aria-modal="true" aria-labelledby="mr-pause-title">
            <span className="mr-pill">{t("Pause")}</span>
            <h2 id="mr-pause-title">{t("Run paused")}</h2>
            <p>{paused === "hidden" ? t("The tab was hidden: the run stopped by itself. It picks up where you left it.") : t("The run is stopped. It picks up where you left it.")}</p>
            <div className="mr-row">
              <button type="button" className="mr-btn gold" data-autofocus onClick={resume}>{t("Resume")}</button>
              <button type="button" className="mr-btn ghost" onClick={giveUp}>{t("Give up")}</button>
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="mr-overlay">
          <div className="mr-card mr-result" role="dialog" aria-modal="true" aria-labelledby="mr-result-title" aria-describedby="mr-result-text">
            <span className={`mr-burst${result.won ? " ok" : ""}`} aria-hidden="true">{result.won ? t("METRO!") : t("MISSED")}</span>
            <img className="mr-face" src={result.won ? faces.happy : faces.stressed} alt="" />
            <h2 id="mr-result-title">{result.won ? (result.lives === METRO_LIVES ? t("Not a scratch") : t("Made it, just in time")) : t("Missed")}</h2>
            <p id="mr-result-text">
              {result.won
                ? result.lives === METRO_LIVES
                  ? t("{name} jumps into the train with all 3 lives. The trip pays the full bonus.", { name })
                  : t("{name} catches the train. Lives left: {n}/3. Reduced bonus.", { name, n: result.lives })
                : t("The metro left without you. No reward, and no second try for this offer.")}
            </p>
            {result.won && (
              <div className="mr-rewardrow">
                <span className="mr-reward" ref={rewardEl}>{money(reward, true)}</span>
                <span className={`mr-cash${cashBump ? " bump" : ""}`}>
                  <span className="mr-lbl">{t("Cash")}</span>
                  <b ref={cashEl}>{money(shownCash)}</b>
                </span>
              </div>
            )}
            <p className="mr-jline">{journalShown ? `${t("Journal")} · ${journal}` : "\u00a0"}</p>
            <button type="button" className="mr-btn gold" ref={backBtn} data-autofocus onClick={back}>{t("Back to the game")}</button>
          </div>
        </div>
      )}
      <div className="mr-coins" ref={coinsHost} aria-hidden="true" />
      <p className="sr-only" role="status" aria-live="polite">{say}</p>
    </div>
  );
}
