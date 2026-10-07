/**
 * Training mode overlay ("Entraînement", 5 scripted turns). Port of Mirage's tutorial mockup
 * (gameflow-bc/tutorial/tutorial.js + tutorial.css) onto the real engine: every step maps to an
 * engine phase and every button dispatches a real action (ROLL / CHOICE), so the game state is the
 * single source of truth. Speech bubble from the player's portrait, spotlighted zone, turn pill,
 * "Skip the tutorial" always visible, bottom sheet on mobile.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { LIFESTYLE, SMALL_DEALS, TRAINING_COMPARE, TRAINING_DEAL, TRAINING_DEAL_CAP, TRAINING_MONTHLY_CAP, TRAINING_SPEND, TRAINING_TURNS } from "@/game/data";
import { cur, nameOf, portraitOf, statement, type GameState, type Player } from "@/game/engine";
import { tr, type Lang } from "@/game/i18n";
import { dressedPortrait } from "@/game/speech";
import { fmtMoney } from "./format";
import { Ico } from "./icons";
import { TRAINING_STRINGS, fill, type StepId } from "./training-strings";

/** UI-only progress that the engine does not need to know about. */
export interface TutLocal {
  /** A coachmark shown after a card resolved (asset recap, Gate), before play goes on. */
  post: null | { id: "t3asset" | "t5gate"; turn: number };
  /** The "Tutorial complete" card is open. */
  done: boolean;
}

export type CoachView =
  | { k: "bubble"; id: StepId; turn: number }
  | { k: "nod"; turn: number }
  | { k: "wait"; turn: number }
  | { k: "done" }
  | null;

/** What the overlay shows for this engine state. null = the normal game UI is in charge. */
export function coachView(s: GameState, tut: TutLocal | null): CoachView {
  if (!tut || s.screen !== "play") return null;
  if (tut.done) return { k: "done" };
  if (tut.post) return { k: "bubble", id: tut.post.id, turn: tut.post.turn };
  const t = s.training;
  if (!t || t.skipped || s.current !== t.player || t.turn > TRAINING_TURNS) return null;
  const n = t.turn;
  if (s.phase === "idle") return { k: "bubble", id: `t${n}roll` as StepId, turn: n };
  if (s.phase === "rolling" || s.phase === "moving") return { k: "wait", turn: n };
  if (s.phase !== "card" || !s.card) return null;
  const pt = s.card.payload.t;
  if (n === 1 && pt === "rest") return { k: "bubble", id: "t1pawn", turn: 1 };
  if (n === 2 && pt === "ok" && s.card.title === "Payday") return { k: "bubble", id: "t2pay", turn: 2 };
  if (n === 3 && pt === "deal") return { k: "bubble", id: "t3deal", turn: 3 };
  if (n === 4 && pt === "spend") return { k: "bubble", id: "t4life", turn: 4 };
  if (n === 5 && pt === "ok") return { k: "nod", turn: 5 };
  return null;
}

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}
type Side = "l" | "r" | "t" | "b";
interface Layout {
  spot: Rect | null;
  bubble: CSSProperties | null;
  tail: CSSProperties;
  side: Side;
  lifted: boolean;
  host: CSSProperties;
}

const ROOM_DEAL = SMALL_DEALS.find((d) => d.id === TRAINING_DEAL)!;
const SUBS = LIFESTYLE.find((x) => x.id === TRAINING_SPEND)!;
const DINNER = LIFESTYLE.find((x) => x.id === TRAINING_COMPARE)!;

function visible(sel: string): HTMLElement | null {
  for (const el of Array.from(document.querySelectorAll<HTMLElement>(sel))) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

function union(els: (HTMLElement | null)[]): Rect | null {
  const rs = els.filter((e): e is HTMLElement => !!e).map((e) => e.getBoundingClientRect());
  if (!rs.length) return null;
  const l = Math.min(...rs.map((r) => r.left));
  const t = Math.min(...rs.map((r) => r.top));
  const r = Math.max(...rs.map((x) => x.right));
  const b = Math.max(...rs.map((x) => x.bottom));
  return { left: l, top: t, width: r - l, height: b - t };
}

function targets(id: StepId, mobile: boolean): string[] {
  if (id.endsWith("roll")) return mobile ? [".mdock .row"] : [".dock .dicecell", ".dock .roll"];
  // DEF-TUT-06: on phones the station strip sits below the fixed dock; the pawn on the map is on screen.
  if (id === "t1pawn") return ["svg.metro .pawn"];
  if (id === "t2pay") return mobile ? [".mhud"] : [".mat > .box:nth-of-type(1)", ".mat > .box:nth-of-type(2)"];
  if (id === "t3asset") return mobile ? [".mflow"] : [".eqrow.in", ".eqtotal"];
  if (id === "t5gate") return mobile ? [".mhud .gauge", ".mhud .hint"] : [".gatebox"];
  return [];
}

export interface TrainingCoachProps {
  state: GameState;
  view: Exclude<CoachView, null>;
  lang: Lang;
  mobile: boolean;
  reduced: boolean;
  hasBackup: boolean;
  onRoll: () => void;
  onChoose: (id: string, post?: TutLocal["post"]) => void;
  onPostDone: () => void;
  onFinish: () => void;
  onSkip: () => void;
  onPlay: () => void;
  onReplay: () => void;
  onRestore: () => void;
}

export function TrainingCoach(props: TrainingCoachProps) {
  const { state, view, lang, mobile, reduced } = props;
  const T = TRAINING_STRINGS[lang];
  const p: Player = state.training ? state.players[state.training.player] ?? cur(state) : cur(state);
  const st = statement(p);
  const m = (n: number, signed = false) => fmtMoney(lang, n, signed);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [tick, setTick] = useState(0);
  /** Mobile, short screens: the card drops its secondary lines so its buttons stay above the bubble (DEF-TUT-05). */
  const [tight, setTight] = useState<string | null>(null);
  const stepKey = view.k === "bubble" ? `${view.id}` : view.k === "nod" ? "nod" : view.k;
  const isCard = view.k === "bubble" && (view.id === "t3deal" || view.id === "t4life");
  const showHost = isCard || view.k === "nod";

  // ---------- step data ----------
  const card = state.card;
  const deal = card?.payload.t === "deal" ? card.payload : null;
  const down = deal?.down ?? Math.min(ROOM_DEAL.down, TRAINING_DEAL_CAP);
  const cf = deal?.cashFlow ?? ROOM_DEAL.cashFlow;
  const monthly = Math.min(SUBS.monthly ?? 0, TRAINING_MONTHLY_CAP);
  const subNow = card?.payload.t === "spend" ? card.payload.amount : SUBS.amount;
  const gap = Math.max(0, st.expenses - st.passive);
  const vars: Record<string, string | number> = {
    d: state.die,
    sal: m(st.salary),
    pas: m(st.passive),
    exp: m(st.expenses),
    flow: m(st.cashFlow, true),
    down: m(down),
    cf: m(cf, true),
    m: m(monthly),
    gap: m(gap),
    k: Math.max(1, Math.ceil(gap / ROOM_DEAL.cashFlow)),
  };

  const primary = useCallback(() => {
    if (view.k === "done") return props.onPlay();
    if (view.k === "nod") return props.onChoose("ok", { id: "t5gate", turn: view.turn });
    if (view.k !== "bubble") return;
    const id = view.id;
    if (id.endsWith("roll")) return props.onRoll();
    if (id === "t1pawn") return props.onChoose("rest");
    if (id === "t2pay") return props.onChoose("ok");
    // t3deal: no default action. The player must pick "Buy it" or "Decline" on the card itself.
    if (id === "t3asset") return props.onPostDone();
    if (id === "t4life") return props.onChoose("decline");
    if (id === "t5gate") return props.onFinish();
  }, [view, props]);

  // ---------- layout: spotlight, card host, bubble ----------
  useLayoutEffect(() => {
    if (view.k === "wait" || view.k === "done") {
      setLayout(null);
      return;
    }
    const W = window.innerWidth;
    const H = window.innerHeight;
    let host: CSSProperties = {};
    let rect: Rect | null = null;
    if (showHost && hostRef.current) {
      const hw = hostRef.current.offsetWidth;
      const hh = hostRef.current.offsetHeight;
      const left = mobile ? (W - hw) / 2 : Math.max(16, Math.min(W - hw - 30, W / 2 - hw / 2 + 210));
      let top = mobile ? 66 : Math.max(84, (H - hh) / 2 - 10);
      if (mobile && view.k === "bubble" && bubbleRef.current) {
        // DEF-TUT-05: the bottom-sheet bubble must never cover the card's buttons. First drop the card's secondary
        // lines, then lift the card (down to 8 px from the top) so it ends above the bubble.
        // What must stay clear is the card's choice row (the impact panel under the deal card may slide below).
        const limit = H - bubbleRef.current.offsetHeight - 8;
        const row = hostRef.current.querySelector<HTMLElement>(".choice") ?? hostRef.current;
        const need = row.getBoundingClientRect().bottom - hostRef.current.getBoundingClientRect().top;
        if (top + need > limit && tight !== stepKey) {
          setTight(stepKey);
          return;
        }
        top = Math.max(8, Math.min(top, limit - need));
      }
      host = { left, top };
      rect = { left, top, width: hw, height: hh };
    } else if (view.k === "bubble") {
      rect = union(targets(view.id, mobile).map(visible));
      if (mobile && view.id === "t1pawn" && (!rect || rect.top + rect.height > H)) rect = union([visible(".tstop.here")]);
    }
    const pad = showHost ? 10 : 8;
    const spot = rect && view.k === "bubble" ? { left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 } : null;
    let bubble: CSSProperties | null = null;
    let tail: CSSProperties = {};
    let side: Side = "t";
    let lifted = false;
    const b = bubbleRef.current;
    if (b && view.k === "bubble") {
      const bw = b.offsetWidth;
      const bh = b.offsetHeight;
      const r = rect ?? { left: W / 2, top: H / 2, width: 0, height: 0 };
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      if (mobile) {
        let y = H - bh;
        side = "t";
        if (!showHost && r.top + r.height > H - bh - 8) {
          const ty = r.top - 14 - bh - 18;
          if (ty > 60) {
            lifted = true;
            y = ty;
            side = "b";
          }
        }
        const x0 = lifted ? 8 : 0;
        const bw2 = lifted ? W - 16 : W;
        bubble = { top: y };
        tail = { left: Math.max(90, Math.min(bw2 - 40, cx - x0 - 13)) };
      } else {
        const g = 34;
        const room = { r: W - (r.left + r.width), l: r.left, t: r.top };
        let x: number;
        let y: number;
        if (room.r >= bw + g + 16) {
          side = "l";
          x = r.left + r.width + g;
          y = cy - bh / 2;
        } else if (room.l >= bw + g + 40) {
          side = "r";
          x = r.left - g - bw;
          y = cy - bh / 2;
        } else if (room.t >= bh + g + 70) {
          side = "b";
          y = r.top - g - bh;
          x = cx - bw / 2;
        } else {
          side = "t";
          y = r.top + r.height + g;
          x = cx - bw / 2;
        }
        x = Math.max(44, Math.min(W - bw - 16, x));
        y = Math.max(78, Math.min(H - bh - 18, y));
        bubble = { left: x, top: y };
        tail = side === "l" || side === "r" ? { top: Math.max(56, Math.min(bh - 40, cy - y - 13)) } : { left: Math.max(56, Math.min(bw - 40, cx - x - 13)) };
      }
    }
    setLayout({ spot, bubble, tail, side, lifted, host });
  }, [stepKey, mobile, tick, showHost, view.k, lang, p.cash, p.position, tight]);

  // Re-measure on resize and once the board has settled (pawn hop, sheet transitions).
  useEffect(() => {
    const bump = () => setTick((n) => n + 1);
    window.addEventListener("resize", bump);
    const a = window.setTimeout(bump, 120);
    const b = window.setTimeout(bump, 450);
    return () => {
      window.removeEventListener("resize", bump);
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, [stepKey]);

  // Focus the main button of each step (keyboard users land on the action).
  useEffect(() => {
    if (view.k === "wait") return;
    const id = window.setTimeout(() => primaryRef.current?.focus({ preventScroll: true }), reduced ? 0 : 260);
    return () => window.clearTimeout(id);
  }, [stepKey, reduced, view.k]);

  // Keyboard: Enter / Space trigger the step's main action (the game's own shortcuts are off meanwhile).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      if (e.target instanceof HTMLElement && e.target.closest("button, a, input, textarea, summary")) return;
      if (view.k === "wait" || document.querySelector(".tut-confirm")) return;
      e.preventDefault();
      primary();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [primary, view.k]);

  // ---------- effects (payday glow + coins, asset plus) ----------
  const [fx, setFx] = useState<ReactNode[]>([]);
  useEffect(() => {
    setFx([]);
    if (view.k !== "bubble" || (view.id !== "t2pay" && view.id !== "t3asset")) return;
    const id = window.setTimeout(() => {
      const nodes: ReactNode[] = [];
      const rowSel =
        view.id === "t2pay"
          ? mobile
            ? [".mflow .s", ".mflow .p", ".mflow .e", ".mflow .t"]
            : [".eqrow.sal", ".eqrow.in", ".eqrow.out", ".eqtotal"]
          : mobile
            ? [".mflow .p"]
            : [".eqrow.in"];
      rowSel.forEach((sel, i) => {
        const el = visible(sel);
        if (!el) return;
        const r = el.getBoundingClientRect();
        nodes.push(<div key={`g${i}`} className="tut-glow" style={{ left: r.left - 3, top: r.top - 3, width: r.width + 6, height: r.height + 6, animationDelay: `${i * 260}ms` }} />);
      });
      const anchor = view.id === "t2pay" ? visible(mobile ? ".mhud .cash .num" : ".mat .cash .num") : visible(rowSel[0]!);
      if (anchor) {
        const r = anchor.getBoundingClientRect();
        const text = view.id === "t2pay" ? `${m(st.cashFlow, true)} · ${T.paid}` : `${m(cf, true)}${T.perMonth}`;
        nodes.push(
          <div key="plus" className="tut-plus" style={{ left: Math.max(90, Math.min(window.innerWidth - 90, r.left + r.width / 2)), top: Math.max(40, r.top - 6) }} role="status">
            {text}
          </div>,
        );
        if (view.id === "t2pay" && !reduced) {
          const from = visible(rowSel[3]!);
          if (from) {
            const a = from.getBoundingClientRect();
            for (let k = 0; k < 7; k++) {
              const sx = a.left + a.width / 2;
              const sy = a.top + a.height / 2;
              const ex = r.left + r.width / 2 + (k - 3) * 4;
              const ey = r.top + r.height / 2;
              nodes.push(<FlyCoin key={`c${k}`} from={[sx, sy]} to={[ex, ey]} delay={1150 + k * 70} lift={70 + k * 6} />);
            }
          }
        }
      }
      setFx(nodes);
    }, reduced ? 0 : 160);
    return () => window.clearTimeout(id);
  }, [stepKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- render ----------
  const face = portraitOf(p);
  const stepCopy = view.k === "bubble" ? T.steps[view.id] : null;
  const btnLabel = view.k === "bubble" && /pawn|pay|asset|gate/.test(view.id) ? T.got : `${T.next} →`;
  const turnNo = view.k === "done" ? TRAINING_TURNS : view.turn;
  const bold = (s: string) => {
    // Render {var} values in bold, as in the mockup.
    const parts = s.split(/(\{\w+\})/g);
    return parts.map((part, i) => {
      const mm = /^\{(\w+)\}$/.exec(part);
      return mm && mm[1]! in vars ? <b key={i}>{String(vars[mm[1]!])}</b> : <span key={i}>{part}</span>;
    });
  };

  // Deal choice: focus lands on "Buy it", but a keyboard activation only counts once the card has been
  // on screen for a moment, so an Enter / Space carried over from the previous step can never buy by accident.
  const dealShownAt = useRef(0);
  useEffect(() => {
    if (view.k === "bubble" && view.id === "t3deal") dealShownAt.current = performance.now();
  }, [stepKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const dealPick = (e: React.MouseEvent, id: "accept" | "decline") => {
    const keyboard = e.detail === 0;
    if (keyboard && performance.now() - dealShownAt.current < 700) return;
    props.onChoose(id, id === "accept" ? { id: "t3asset", turn: 3 } : undefined);
  };

  // DEF-TUT-03: a double click on one step's button must not also answer the next step.
  const stepArmed = useArmed(stepKey);

  const blockClick = (e: React.MouseEvent) => {
    if (view.k !== "bubble" || !view.id.endsWith("roll") || !layout?.spot) return;
    const s = layout.spot;
    if (e.clientX >= s.left && e.clientX <= s.left + s.width && e.clientY >= s.top && e.clientY <= s.top + s.height) primary();
  };

  const dimmed = view.k === "nod" || view.k === "done" || (view.k === "bubble" && !layout?.spot);

  return (
    <div className={`tut ${dimmed ? "nospot" : ""} ${view.k === "wait" ? "is-wait" : ""}`}>
      <div className="tut-block" onClick={blockClick} aria-hidden="true" />
      <div className="tut-dim" aria-hidden="true" />
      {layout?.spot && (
        <div
          key={`spot-${stepKey}`}
          className="tut-spot"
          aria-hidden="true"
          style={{ left: layout.spot.left, top: layout.spot.top, width: layout.spot.width, height: layout.spot.height, borderRadius: Math.min(22, layout.spot.height / 2) }}
        />
      )}

      {showHost && (
        <div className={`tut-cardhost ${tight === stepKey ? "tight" : ""}`} ref={hostRef} style={layout?.host ?? { visibility: "hidden" }} key={`host-${stepKey}`}>
          {view.k === "bubble" && view.id === "t3deal" && (
            <>
              <article className="tcard deal" aria-labelledby="tcard-h">
                <div className="hd" style={{ background: "var(--mint)" }}>
                  <b><Ico name="up" />{T.deal.tag}</b>
                  <span className="pill">{T.deal.kind}</span>
                </div>
                <div className="bd">
                  <span className="safe"><Ico name="shield" />{T.deal.safe}</span>
                  <h4 id="tcard-h">{T.deal.title}</h4>
                  <p className="story">{T.deal.story}</p>
                  <div className="rows">
                    <div className="row dn"><span>{T.deal.down}</span><span className="num">{m(-down)}</span></div>
                    <div className="row up"><span>{T.deal.cf}</span><span className="num">{m(cf, true)}{T.perMonth}</span></div>
                    <div className="row nomob"><span>{T.deal.note}</span><span className="num">{T.deal.none}</span></div>
                  </div>
                  <div className="cap"><Ico name="lock" />{fill(T.deal.cap, { cap: m(TRAINING_DEAL_CAP) })}</div>
                  <div className="choice" role="group" aria-label={fill(T.pill, { n: 3 })}>
                    <button
                      type="button"
                      className="tut-btn"
                      ref={primaryRef}
                      onClick={(e) => dealPick(e, "accept")}
                    >
                      {tr(lang, "Buy it")} · <span className="num">{m(down)}</span>
                    </button>
                    <button type="button" className="tut-btn ghost" onClick={(e) => dealPick(e, "decline")}>{tr(lang, "Decline")}</button>
                  </div>
                </div>
              </article>
              <section className="impact2" aria-label={T.deal.if}>
                <h5><i />{T.deal.if}</h5>
                {([
                  [T.deal.cash, m(p.cash), m(p.cash - down), "dn"],
                  [T.deal.passive, m(st.passive), m(st.passive + cf), "up"],
                  [T.deal.flow, m(st.cashFlow, true), m(st.cashFlow + cf, true), "up"],
                  [T.deal.gap, m(Math.max(0, st.expenses - st.passive)), m(Math.max(0, st.expenses - st.passive - cf)), "up"],
                ] as const).map(([k, a, b, c]) => (
                  <div className="dl" key={k}>
                    <span>{k}</span>
                    <span className="was num"><span className="sr-only">{lang === "fr" ? "avant " : lang === "es" ? "antes " : "before "}</span>{a}</span>
                    <span className="arr" aria-hidden="true">→</span>
                    <span className={`num ${c}`}>{b}</span>
                  </div>
                ))}
              </section>
            </>
          )}
          {view.k === "bubble" && view.id === "t4life" && (
            <article className="tcard" aria-labelledby="tcard-h">
              <div className="hd" style={{ background: "var(--coral)" }}>
                <b><Ico name="bag" />{T.life.tag}</b>
                <span className="pill">{T.life.kind}</span>
              </div>
              <div className="bd">
                <h4 id="tcard-h">{T.life.title}</h4>
                <p className="story">{T.life.story}</p>
                <div className="rows">
                  <div className="row dn"><span>{T.life.pay}</span><span className="num">{m(-subNow)}</span></div>
                  <div className="row dn"><span>{T.life.then}</span><span className="num">{m(monthly, true)}{T.perMonth}</span></div>
                </div>
                <div className="cmp">
                  {(() => {
                    const year = subNow + monthly * 12;
                    const max = Math.max(DINNER.amount, year);
                    return (
                      <>
                        <div className="bar">
                          <span>{T.life.once}</span>
                          <span className="tr"><i style={{ width: `${(DINNER.amount / max) * 100}%`, background: "var(--gold)" }} /></span>
                          <span className="num">{m(DINNER.amount)}</span>
                          <span className="sub">{fill(T.life.onceEx, { once: m(DINNER.amount) })}</span>
                        </div>
                        <div className="bar">
                          <span>{T.life.sub}</span>
                          <span className="tr"><i style={{ width: `${(year / max) * 100}%`, background: "var(--coral)" }} /></span>
                          <span className="num">{m(year)}</span>
                          <span className="sub">{fill(T.life.subEx, { now: m(subNow), m: m(monthly) })} · {T.life.year}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
                <div className="choice">
                  <button type="button" className="tut-btn ghost" onClick={() => props.onChoose("pay")}>
                    {T.life.btnPay} <span className="num">{m(subNow)}</span>
                  </button>
                  <button type="button" className="tut-btn" onClick={() => props.onChoose("decline")}>{T.life.btnPass}</button>
                </div>
              </div>
            </article>
          )}
          {view.k === "nod" && (
            <article className="tcard tmini" role="dialog" aria-labelledby="tcard-h">
              <div className="hd" style={{ background: "var(--sky)" }}>
                <b><Ico name="people" />{T.nod.tag}</b>
                <span className="pill">{fill(T.pill, { n: view.turn })}</span>
              </div>
              <div className="bd">
                <h4 id="tcard-h">{T.nod.title}</h4>
                <p className="story">{T.nod.story}</p>
                <div className="choice">
                  <button type="button" className="tut-btn" ref={primaryRef} onClick={primary}>{T.next} →</button>
                </div>
              </div>
            </article>
          )}
        </div>
      )}

      {view.k === "bubble" && stepCopy && (
        <div
          key={`bubble-${stepKey}`}
          ref={bubbleRef}
          className={`tut-bubble side-${layout?.side ?? "t"} ${layout?.lifted ? "lifted" : ""}`}
          role="dialog"
          aria-labelledby="tut-h"
          aria-describedby="tut-p"
          style={layout?.bubble ?? { visibility: "hidden", left: 0, top: 0 }}
        >
          <div className="tut-face"><img src={face} alt={nameOf(p)} /></div>
          <span className={`tut-tail ${layout?.side ?? "t"}`} style={layout?.tail} aria-hidden="true" />
          <div className="tut-head">
            <span className="tut-pill"><i aria-hidden="true" /><span>{fill(T.pill, { n: turnNo })}</span></span>
          </div>
          <h3 id="tut-h">{fill(stepCopy[0], vars)}</h3>
          <p className="tut-p" id="tut-p">{bold(stepCopy[1])}</p>
          <div className="tut-foot">
            <div className="tut-dots" aria-hidden="true">
              {Array.from({ length: TRAINING_TURNS }, (_, i) => (
                <b key={i} className={i + 1 < turnNo ? "on" : i + 1 === turnNo ? "cur" : ""} />
              ))}
            </div>
            {view.id !== "t3deal" && (
              <button type="button" className="tut-btn" ref={primaryRef} onClick={() => stepArmed() && primary()}>{btnLabel}</button>
            )}
          </div>
          {view.id === "t5gate" && (
            <div className="tut-note"><Ico name="replay" /><span>{T.replayNote}</span></div>
          )}
        </div>
      )}

      {fx}

      {view.k === "done" && (
        <DoneCard
          face={dressedPortrait(p, "happy")}
          fallback={face}
          name={nameOf(p)}
          lang={lang}
          reduced={reduced}
          mobile={mobile}
          hasBackup={props.hasBackup}
          primaryRef={primaryRef}
          onPlay={props.onPlay}
          onReplay={props.onReplay}
          onRestore={props.onRestore}
        />
      )}

      {view.k !== "done" && (
        <button type="button" className="tut-skip" onClick={props.onSkip}>
          {T.skip}
          <Ico name="skip" />
        </button>
      )}
    </div>
  );
}

function FlyCoin({ from, to, delay, lift }: { from: [number, number]; to: [number, number]; delay: number; lift: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [gone, setGone] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof el.animate !== "function") return;
    const kf: Keyframe[] = [];
    const N = 22;
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const e = u * u * (3 - 2 * u);
      const x = from[0] + (to[0] - from[0]) * e;
      const y = from[1] + (to[1] - from[1]) * e - 4 * lift * u * (1 - u);
      kf.push({ transform: `translate(${x}px, ${y}px) scale(${Math.min(1, 0.6 + u * 1.6) * (1 - 0.3 * u)})`, opacity: u > 0.92 ? 0 : 1 });
    }
    const a = el.animate(kf, { duration: 620, delay, easing: "linear", fill: "both" });
    a.onfinish = () => setGone(true);
    return () => a.cancel();
  }, [from, to, delay, lift]);
  if (gone) return null;
  return <div ref={ref} className="tut-coin" aria-hidden="true">$</div>;
}

/** Ignore activations for a moment after a step appears, so the second click of a double click aimed at the previous
 * step's button (or a held Enter) never lands on whatever replaced it (DEF-TUT-03). */
const ARM_MS = 450;
function useArmed(key: unknown): () => boolean {
  const shownAt = useRef(0);
  useEffect(() => {
    shownAt.current = performance.now();
  }, [key]);
  return () => performance.now() - shownAt.current >= ARM_MS;
}

function DoneCard(props: {
  face: string;
  fallback: string;
  name: string;
  lang: Lang;
  reduced: boolean;
  mobile: boolean;
  hasBackup: boolean;
  primaryRef: React.RefObject<HTMLButtonElement | null>;
  onPlay: () => void;
  onReplay: () => void;
  onRestore: () => void;
}) {
  const T = TRAINING_STRINGS[props.lang];
  const D = T.done;
  const [src, setSrc] = useState(props.face);
  const armed = useArmed("done");
  const guard = (fn: () => void) => () => {
    if (armed()) fn();
  };
  return (
    <>
      {!props.reduced && <Confetti count={props.mobile ? 16 : 26} />}
      <div className="tdone" role="dialog" aria-modal="true" aria-labelledby="tdone-h">
        <div className="face"><img src={src} alt={props.name} onError={() => setSrc(props.fallback)} /></div>
        <span className="k">{D.kicker}</span>
        <h2 id="tdone-h">{D.title}</h2>
        <ul>
          <li><i style={{ background: "var(--paper)" }}><Ico name="dice" /></i>{D.r1}</li>
          <li><i style={{ background: "var(--gold)" }}><Ico name="coin" /></i>{D.r2}</li>
          <li><i style={{ background: "var(--mint)" }}><Ico name="door" /></i>{D.r3}</li>
        </ul>
        <div className="row2">
          <button type="button" className="tut-btn" ref={props.primaryRef} onClick={guard(props.onPlay)}>{D.play} →</button>
          <button type="button" className="tut-btn ghost" onClick={guard(props.onReplay)}><Ico name="replay" />{D.replay}</button>
        </div>
        {props.hasBackup && (
          <button type="button" className="tut-link" onClick={guard(props.onRestore)}>{D.restore}</button>
        )}
        <div className="tut-note"><Ico name="repeat" /><span>{T.replayNote}</span></div>
      </div>
    </>
  );
}

function Confetti({ count }: { count: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    let seed = 7;
    const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const o = { x: window.innerWidth / 2, y: window.innerHeight * 0.36 };
    const anims: Animation[] = [];
    Array.from(root.children).forEach((el, k) => {
      const vx = (r() * 2 - 1) * (count < 20 ? 300 : 520);
      const vy = -(380 + r() * 420);
      const g = 1500;
      const d = 1.2 + r() * 0.5;
      const w = (r() * 2 - 1) * 600;
      const kf: Keyframe[] = [];
      for (let j = 0; j <= 24; j++) {
        const t = (j / 24) * d;
        kf.push({ transform: `translate(${o.x + vx * t}px, ${o.y + vy * t + 0.5 * g * t * t}px) rotate(${w * t}deg)`, opacity: j > 17 ? 1 - (j - 17) / 7 : 1 });
      }
      anims.push((el as HTMLElement).animate(kf, { duration: d * 1000, delay: 250 + k * 12, fill: "both" }));
    });
    return () => anims.forEach((a) => a.cancel());
  }, [count]);
  return (
    <div ref={ref} aria-hidden="true">
      {Array.from({ length: count }, (_, k) => (
        <i key={k} className={`tut-cf ${k % 3 === 1 ? "h" : ""}`} />
      ))}
    </div>
  );
}
