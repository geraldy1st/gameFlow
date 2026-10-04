/**
 * The board as a metro map (SVG, viewBox 1240×900).
 *  - Line 1 "The Grind": the 24 GRIND spaces in engine order, clockwise from top-left.
 *  - The golden Gate station between Line 1 and Line 2 (lit when passive > expenses).
 *  - Line 2 "Freedom": outer express loop with the 16 FREEDOM spaces, greyed while locked.
 *  - Line 3 "The Venture": a dashed branch preview; at level 2, when the active player
 *    rides the Venture, the outer loop carries the 16 VENTURE spaces instead.
 */
import { Fragment, useId, type ReactNode } from "react";
import { FREEDOM, GRIND, VENTURE, type SpaceDef } from "@/game/data";
import { cur, nameOf, portraitOf, statement, unlocked, type GameState, type Player } from "@/game/engine";
import type { Lang } from "@/game/i18n";
import { fmtMoney } from "./format";
import { FAMILIES, spaceMeta, type Family } from "./icons";

type TFn = (text: string, vars?: Record<string, string | number>) => string;
type Pt = { x: number; y: number; nx: number; ny: number };
type Rect = { x: number; y: number; w: number; h: number; r: number };

const L1: Rect = { x: 196, y: 188, w: 628, h: 524, r: 56 };
const L2: Rect = { x: 56, y: 54, w: 908, h: 792, r: 104 };
const C = { x: L1.x + L1.w / 2, y: L1.y + L1.h / 2 };
const L3X = 1110;
const PAWN_COLORS = ["var(--coral)", "var(--sky)"];

const rr = ({ x, y, w, h, r }: Rect) =>
  `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;

/** Stations on straight edges only (corners stay free). counts = [top, right, bottom, left]. */
function edgeLayout(R: Rect, counts: [number, number, number, number], inset = 0): Pt[] {
  const { x, y, w, h, r } = R;
  const out: Pt[] = [];
  const seg = (n: number, f: (t: number) => Pt) => {
    for (let k = 0; k < n; k++) out.push(f((k + 0.5) / n));
  };
  const ins = (t: number) => inset + t * (1 - 2 * inset);
  seg(counts[0], (t) => ({ x: x + r + t * (w - 2 * r), y, nx: 0, ny: 1 }));
  seg(counts[1], (t) => ({ x: x + w, y: y + r + ins(t) * (h - 2 * r), nx: -1, ny: 0 }));
  seg(counts[2], (t) => ({ x: x + w - r - t * (w - 2 * r), y: y + h, nx: 0, ny: -1 }));
  seg(counts[3], (t) => ({ x, y: y + h - r - ins(t) * (h - 2 * r), nx: 1, ny: 0 }));
  return out;
}

export const S1 = edgeLayout(L1, [7, 5, 7, 5], 0.1);
export const S2 = edgeLayout(L2, [5, 3, 5, 3]);
const GATE = (() => {
  const right = S1.filter((p) => p.x > L1.x + L1.w - 2).sort((a, b) => a.y - b.y);
  let gy = C.y;
  for (let k = 0; k < right.length - 1; k++) {
    const m = (right[k]!.y + right[k + 1]!.y) / 2;
    if (k === 0 || Math.abs(m - C.y) < Math.abs(gy - C.y)) gy = m;
  }
  return { x: (L1.x + L1.w + L2.x + L2.w) / 2, y: gy };
})();
/** A preview of the Venture on the dashed branch: Client, Hire, Pitch, Exit. */
const VENTURE_PREVIEW = [1, 2, 5, 15].map((i) => VENTURE[i]!);

function Station({ x, y, size, space, double, fill, fg, sw = 4, opacity }: { x: number; y: number; size: number; space: SpaceDef; double?: boolean; fill?: string; fg?: string; sw?: number; opacity?: number }) {
  const m = spaceMeta(space);
  const r = size * 0.26;
  return (
    <g className="st" transform={`translate(${x} ${y})`} opacity={opacity}>
      <rect x={-size / 2} y={-size / 2 + 6} width={size} height={size} rx={r} fill="var(--navy)" />
      {double && <rect x={-size / 2 - 7} y={-size / 2 - 7} width={size + 14} height={size + 14} rx={size * 0.34} fill="none" stroke="var(--navy)" strokeWidth={3} strokeDasharray="6 5" />}
      <rect className="face" x={-size / 2} y={-size / 2} width={size} height={size} rx={r} fill={fill ?? m.bg} stroke="var(--navy)" strokeWidth={sw} />
      <use href={`#i-${m.icon}`} x={-size * 0.3} y={-size * 0.3} width={size * 0.6} height={size * 0.6} style={{ color: fg ?? m.fg }} />
    </g>
  );
}

function Label({ x, y, nx, ny, text, dist, cls = "" }: { x: number; y: number; nx: number; ny: number; text: string; dist: number; cls?: string }) {
  const anchor = nx > 0.45 ? "start" : nx < -0.45 ? "end" : "middle";
  const sp = text.indexOf(" ");
  const parts = text.length > 7 && sp > 0 ? [text.slice(0, sp), text.slice(sp + 1)] : [text];
  const lh = 17;
  const n = parts.length;
  let y0 = y + ny * dist;
  if (ny > 0.45) y0 += 8;
  else if (ny < -0.45) y0 -= (n - 1) * lh;
  else y0 += 6 - ((n - 1) * lh) / 2;
  const lx = x + nx * dist;
  return (
    <text className={`st-label ${cls}`} x={lx} y={y0} textAnchor={anchor}>
      {parts.map((p, i) => (
        <tspan key={i} x={lx} dy={i ? lh : 0}>
          {p}
        </tspan>
      ))}
    </text>
  );
}

function LineTag({ x, y, text, bg, fg, lock }: { x: number; y: number; text: string; bg: string; fg: string; lock?: boolean }) {
  const w = text.length * 9.6 + (lock ? 66 : 44);
  return (
    <g transform={`translate(${x} ${y})`} className="l2tag">
      <rect x={-w / 2} y={-13} width={w} height={34} rx={17} fill="var(--navy)" />
      <rect x={-w / 2} y={-17} width={w} height={34} rx={17} fill={bg} stroke="var(--navy)" strokeWidth={3} />
      <text x={lock ? -w / 2 + 16 : 0} y={6} textAnchor={lock ? "start" : "middle"} fill={fg} className="tag-text">
        {text}
      </text>
      {lock && <use href="#i-lock" x={w / 2 - 34} y={-10} width={20} height={20} style={{ color: fg }} />}
    </g>
  );
}

/** Where a player's pawn stands. */
export function pawnPoint(p: Player): { x: number; y: number } {
  if (p.track === "grind") return S1[p.position % S1.length]!;
  return S2[p.position % S2.length]!;
}

export function trackSpaces(p: Player): SpaceDef[] {
  return p.track === "grind" ? GRIND : p.track === "venture" ? VENTURE : FREEDOM;
}

export function Pawn({ player, idx, clip, x, y, hopKey }: { player: Player; idx: number; clip: string; x: number; y: number; hopKey?: string | number }) {
  return (
    <g className="pawn" style={{ transform: `translate(${x - 2}px, ${y - 12}px)` }}>
      <g className="bob" key={hopKey}>
        <ellipse cx={0} cy={4} rx={24} ry={8} fill="rgba(27,42,65,.3)" />
        <path d="M-20 2 Q-20 -8 -12 -12 L-8 -30 Q-17 -36 -17 -48 L17 -48 Q17 -36 8 -30 L12 -12 Q20 -8 20 2 Z" fill={PAWN_COLORS[idx % 2]} stroke="var(--navy)" strokeWidth={4} strokeLinejoin="round" />
        <circle cx={0} cy={-58} r={20} fill="var(--paper)" stroke="var(--navy)" strokeWidth={4} />
        <image href={portraitOf(player)} x={-20} y={-82} width={40} height={53} preserveAspectRatio="xMidYMin slice" clipPath={`url(#${clip})`} />
        <circle cx={0} cy={-58} r={18} fill="none" stroke="var(--navy)" strokeWidth={3} />
      </g>
    </g>
  );
}

export function MetroBoard({ state, t, lang, lid = false }: { state: GameState; t: TFn; lang: Lang; lid?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const active = state.players.length ? cur(state) : null;
  const st = active ? statement(active) : null;
  const lit = !!active && (active.track !== "grind" || active.level >= 2 || unlocked(active));
  const ventureMode = active?.track === "venture";
  const outer = ventureMode ? VENTURE : FREEDOM;
  const gap = st ? Math.max(0, st.expenses - st.passive) : 0;

  const reach: ReactNode[] = [];
  if (active && !lid && state.phase === "idle" && state.screen === "play") {
    const pts = active.track === "grind" ? S1 : S2;
    for (let k = 1; k <= 6; k++) {
      const p = pts[(active.position + k) % pts.length]!;
      reach.push(
        <g key={k} transform={`translate(${p.x + 24} ${p.y - 26})`}>
          <circle r={12} fill="var(--paper)" stroke="var(--navy)" strokeWidth={2.5} />
          <text y={4.5} textAnchor="middle">
            {k}
          </text>
        </g>,
      );
    }
  }

  const here = active ? trackSpaces(active)[active.position] : null;
  const label = active
    ? t("Metro board. {name} is at {station} on {line}.", {
        name: nameOf(active),
        station: here ? t(here.label) : "",
        line: t(active.track === "grind" ? "Line 1 · The Grind" : active.track === "venture" ? "Line 3 · The Venture" : "Line 2 · Freedom"),
      })
    : t("Metro board: Line 1 The Grind, the Gate, Line 2 Freedom, Line 3 The Venture.");

  const famIcons: Record<Family, string> = { pay: "coin", deals: "up", lifestyle: "bag", tax: "pct", career: "case", ties: "heart", market: "chart", care: "cross" };

  return (
    <svg viewBox="0 0 1240 900" className={`metro ${lit ? "lit" : "locked"} ${lid ? "lid-board" : ""} ${ventureMode ? "venture" : ""}`} role="img" aria-label={label}>
      <defs>
        <pattern id={`${uid}-grid`} width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0H0V40" fill="none" stroke="rgba(27,42,65,.06)" strokeWidth="2" />
        </pattern>
        {state.players.map((_, i) => (
          <clipPath id={`${uid}-head-${i}`} key={i}>
            <circle cx="0" cy="-58" r="17" />
          </clipPath>
        ))}
      </defs>
      <rect width="1240" height="900" fill={`url(#${uid}-grid)`} />

      <g>
        {!ventureMode && (
          <>
            <path d={`M${L2.x + L2.w} 700H${L3X}V215`} fill="none" stroke="var(--navy)" strokeWidth={22} strokeLinejoin="round" opacity={0.35} />
            <path d={`M${L2.x + L2.w} 700H${L3X}V215`} fill="none" stroke="var(--plum)" strokeWidth={13} strokeDasharray="18 12" strokeLinejoin="round" opacity={0.6} />
          </>
        )}
        <g className="l2line">
          {ventureMode ? (
            <>
              <path d={rr(L2)} fill="none" stroke="var(--navy)" strokeWidth={28} />
              <path d={rr(L2)} fill="none" stroke="var(--plum)" strokeWidth={18} strokeDasharray="30 14" />
            </>
          ) : (
            <>
              <path className="l2glow" d={rr(L2)} fill="none" stroke="var(--gold)" strokeWidth={60} strokeOpacity={lit ? 0.6 : 0} />
              <path d={rr(L2)} fill="none" stroke="var(--navy)" strokeWidth={28} />
              <path d={rr(L2)} fill="none" stroke="var(--gold)" strokeWidth={18} />
              <path className="l2run" d={rr(L2)} fill="none" stroke={lit ? "var(--paper)" : "var(--navy)"} strokeWidth={lit ? 5 : 3} strokeDasharray={lit ? "20 28" : "10 10"} opacity={lit ? 0.95 : 0.5} />
            </>
          )}
        </g>
        <path d={`M${L1.x + L1.w} ${GATE.y}H${GATE.x}`} stroke="var(--navy)" strokeWidth={16} />
        <path d={`M${GATE.x} ${GATE.y}H${L2.x + L2.w}`} stroke="var(--navy)" strokeWidth={24} opacity={lit ? 1 : 0.45} />
        <path d={`M${GATE.x} ${GATE.y}H${L2.x + L2.w}`} stroke="var(--gold)" strokeWidth={14} opacity={lit ? 1 : 0.45} />
        <path d={rr(L1)} fill="none" stroke="var(--navy)" strokeWidth={24} />
        <path d={rr(L1)} fill="none" stroke="var(--paper)" strokeWidth={3} strokeDasharray="14 12" />
      </g>

      <g className="st-l2">
        {S2.map((p, i) => {
          const space = outer[i]!;
          const out = p.nx < -0.5;
          const style = ventureMode
            ? { fill: "var(--lilac)", fg: "var(--navy)", sw: 3.5 }
            : lit
              ? { fill: "var(--gold-tint)", fg: "var(--navy)", sw: 3.5 }
              : { fill: "var(--locked)", fg: "var(--navy-soft)", sw: 3 };
          return (
            <Fragment key={i}>
              <Station x={p.x} y={p.y} size={44} space={space} {...style} />
              <Label x={p.x} y={p.y} nx={out ? 1 : p.nx} ny={p.ny} text={t(space.label)} dist={38} />
            </Fragment>
          );
        })}
      </g>
      {!ventureMode && (
        <g className="st-l3">
          {VENTURE_PREVIEW.map((space, i) => {
            const y = 610 - i * 112;
            return (
              <Fragment key={i}>
                <Station x={L3X} y={y} size={40} space={space} fill="var(--locked)" fg="#646C7E" sw={3} opacity={0.8} />
                <Label x={L3X} y={y} nx={1} ny={0} text={t(space.label)} dist={34} cls="l3lab" />
              </Fragment>
            );
          })}
        </g>
      )}
      {!ventureMode ? (
        <>
          <LineTag x={C.x} y={L2.y} text={lit ? t("Line 2 · Freedom · open") : t("Line 2 · Freedom")} bg="var(--gold)" fg="var(--navy)" lock={!lit} />
          <LineTag x={L3X - 10} y={178} text={t("Line 3 · The Venture")} bg="var(--paper)" fg="var(--plum)" lock={!active || active.level < 2} />
        </>
      ) : (
        <LineTag x={C.x} y={L2.y} text={t("Line 3 · The Venture")} bg="var(--paper)" fg="var(--plum)" />
      )}

      <g className="st-l1">
        {S1.map((p, i) => {
          const space = GRIND[i]!;
          const big = space.kind === "big";
          const pay = space.kind === "payday";
          return (
            <Fragment key={i}>
              <Station x={p.x} y={p.y} size={big ? 60 : pay ? 58 : 52} space={space} double={big} />
              <Label x={p.x} y={p.y} nx={p.nx} ny={p.ny} text={t(space.label)} dist={big ? 52 : 46} />
            </Fragment>
          );
        })}
      </g>

      <g className="gate">
        {lit && <circle className="l2glow-c" cx={GATE.x} cy={GATE.y} r={62} fill="var(--gold)" opacity={0.35} />}
        <g transform={`translate(${GATE.x} ${GATE.y})`}>
          <rect x={-37} y={-31} width={74} height={74} rx={19} fill="var(--navy)" />
          <rect x={-37} y={-37} width={74} height={74} rx={19} fill="var(--gold)" stroke="var(--navy)" strokeWidth={5} />
          <use href="#i-door" x={-22} y={-22} width={44} height={44} style={{ color: "var(--navy)" }} />
        </g>
        {!lit && (
          <>
            <circle cx={GATE.x + 34} cy={GATE.y - 34} r={15} fill="var(--brick)" stroke="var(--navy)" strokeWidth={3} />
            <use href="#i-lock" x={GATE.x + 25} y={GATE.y - 43} width={18} height={18} style={{ color: "#fff" }} />
          </>
        )}
        <rect x={GATE.x - 44} y={GATE.y + 50} width={88} height={28} rx={14} fill="var(--navy)" />
        <text x={GATE.x} y={GATE.y + 70} textAnchor="middle" className="gate-text">
          {t("GATE")}
        </text>
      </g>

      {!lid && (
        <>
          <g className="legend cartouche" transform="translate(1112 806)">
            <rect x={-96} y={-35} width={192} height={80} rx={18} fill="var(--navy)" />
            <rect x={-96} y={-40} width={192} height={80} rx={18} fill="var(--gold)" stroke="var(--navy)" strokeWidth={3} />
            <text y={-6} textAnchor="middle" className="ct-title">
              GameFlow
            </text>
            <text y={20} textAnchor="middle" className="ct-sub">
              {t("NETWORK MAP")}
            </text>
          </g>
          <foreignObject x={C.x - 138} y={C.y - 140} width={276} height={290} className="legend">
            <div className="lg">
              <div className="lg-h">
                <span className="lg-n">1</span>
                <div>
                  <b>{t("The Grind")}</b>
                  <small>{t("24 stations · loop")}</small>
                </div>
              </div>
              <div className="lg-grid">
                {(Object.keys(FAMILIES) as Family[]).map((k) => (
                  <span key={k}>
                    <i style={{ background: FAMILIES[k].bg, color: FAMILIES[k].fg }}>
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <use href={`#i-${famIcons[k]}`} />
                      </svg>
                    </i>
                    {t(FAMILIES[k].name)}
                  </span>
                ))}
              </div>
              <div className="lg-f">
                <i className="dbl" />
                {t("Big Deal: double frame")}
              </div>
            </div>
          </foreignObject>
          <g className="mmcenter" transform={`translate(${C.x} ${C.y})`}>
            <circle cx={-150} cy={-8} r={34} fill="var(--navy)" />
            <text x={-150} y={6} textAnchor="middle" className="mm-n">
              {ventureMode ? "3" : active && active.track === "freedom" ? "2" : "1"}
            </text>
            <text x={-100} y={8} className="mm-title">
              {t(ventureMode ? "The Venture" : active?.track === "freedom" ? "Freedom" : "The Grind")}
            </text>
            <text x={0} y={80} textAnchor="middle" className="mmhint">
              {lit ? t("Gate open →") : t("Gate: {amount} more passive", { amount: fmtMoney(lang, gap) })}
            </text>
          </g>
        </>
      )}

      <g className="reach">{reach}</g>
      {state.players.map((p, idx) => {
        const pt = lid ? S1[0]! : pawnPoint(p);
        const twin = state.players.some((o, j) => j < idx && o.track === p.track && o.position === p.position);
        return <Pawn key={p.id} player={p} idx={idx} clip={`${uid}-head-${idx}`} x={pt.x + (twin ? 18 : 0)} y={pt.y} hopKey={`${p.track}-${p.position}`} />;
      })}
    </svg>
  );
}
