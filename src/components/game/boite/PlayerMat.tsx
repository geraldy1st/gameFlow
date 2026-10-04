/**
 * Player mat (desktop side column) and its mobile counterparts:
 * who box, monthly flow as coin rows (Salary + Passive − Expenses), the Gate
 * gauge, passive income per turn, and the dock (die + roll + secondary actions).
 */
import type { ReactNode } from "react";
import { GRIND, PASSIVE_WIN } from "@/game/data";
import { dreamOf, nameOf, portraitOf, statement, type GameState, type Player } from "@/game/engine";
import type { Lang } from "@/game/i18n";
import { dressedPortrait } from "@/game/speech";
import { fmtMoney, fmtNum } from "./format";
import { Gauge, gaugeMax } from "./Gauge";
import type { Point } from "./history";
import { Ico, spaceMeta } from "./icons";
import { trackSpaces } from "./MetroBoard";

type TFn = (text: string, vars?: Record<string, string | number>) => string;

/** Replace {x} placeholders with React nodes (after translation). */
export function rich(template: string, nodes: Record<string, ReactNode>): ReactNode[] {
  return template.split(/(\{\w+\})/).map((part, i) => {
    const m = part.match(/^\{(\w+)\}$/);
    return m && m[1]! in nodes ? <span key={i}>{nodes[m[1]!]}</span> : <span key={i}>{part}</span>;
  });
}

const PIPS: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

export function BoxDie({ value, rolling, t }: { value: number; rolling: boolean; t: TFn }) {
  const on = new Set(PIPS[value] ?? PIPS[1]);
  return (
    <div className={`bdie ${rolling ? "rolling" : ""}`} role="img" aria-label={t("Die showing {n}", { n: value })}>
      {Array.from({ length: 9 }, (_, i) => (
        <i key={i} className={on.has(i) ? "o" : ""} />
      ))}
    </div>
  );
}

function Avatar({ player, size = "md" }: { player: Player; size?: "md" | "sm" }) {
  return (
    <div className={`avatar avatar-${size}`}>
      <img
        src={dressedPortrait(player, player.reaction)}
        alt=""
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = portraitOf(player);
        }}
      />
    </div>
  );
}

export function lineName(p: Player, t: TFn): string {
  return t(p.track === "grind" ? "Line 1" : p.track === "venture" ? "Line 3" : "Line 2");
}

/** Social bar value, with the +bonus badge right after someone joined the circle (shown for that turn). */
export function SocialChip({ player, state, t, onlyFresh = false }: { player: Player; state: GameState; t: TFn; onlyFresh?: boolean }) {
  const social = player.vitals?.social;
  if (social === undefined) return null;
  // Joined since this player's previous turn (turn counts every player's turn), badge = Social actually gained
  // (clamped at 100). Older saves carry no socialGain, so they show no badge rather than a made-up +10.
  const since = state.turn - Math.max(1, state.players.length);
  const bonus = player.friends.filter((f) => f.sinceTurn >= since).reduce((sum, f) => sum + (f.socialGain ?? 0), 0);
  if (onlyFresh && !bonus) return null;
  return (
    <span className="socialchip" title={t("Social")}>
      <Ico name="people" />
      <span>
        {t("Social")} <b className="num">{social}</b>
      </span>
      {bonus > 0 && <b className="num plus">+{bonus}</b>}
    </span>
  );
}

export function WhoBox({ player, state, t, lang, onStatus }: { player: Player; state: GameState; t: TFn; lang: Lang; onStatus: () => void }) {
  const st = statement(player);
  const dream = dreamOf(player);
  return (
    <section className="box">
      <div className="who2">
        <button type="button" className="avatar-btn" onClick={onStatus} aria-label={t("Status")}>
          <Avatar player={player} />
        </button>
        <div className="who2-id">
          <h2>{nameOf(player)}</h2>
          <div className="sub">
            {t(st.career.title)} · {t("Turn {turn}", { turn: state.turn })}
          </div>
          <SocialChip player={player} state={state} t={t} />
        </div>
        <div className="cash">
          <div className="label">{t("Cash")}</div>
          <div className="num">
            <span className="coin-ic" aria-hidden="true">
              $
            </span>
            {fmtMoney(lang, player.cash)}
          </div>
        </div>
      </div>
      <div className="dreamchip">
        <Ico name="star" />
        <span>
          {rich(t("Dream: {name}"), { name: player.dreamBought ? t("Owned") : t(dream.name) })}
          {!player.dreamBought && (
            <>
              {" · "}
              <span className="num">{fmtMoney(lang, dream.cost)}</span>
            </>
          )}
        </span>
      </div>
    </section>
  );
}

const UNITS = [50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000];

export function coinUnit(...values: number[]): number {
  const top = Math.max(1, ...values);
  return UNITS.find((u) => top / u <= 14) ?? UNITS[UNITS.length - 1]!;
}

function Coins({ value, unit, tone }: { value: number; unit: number; tone: "gold" | "mint" | "brick" }) {
  const n = value <= 0 ? 0 : Math.max(1, Math.min(16, Math.round(value / unit)));
  return (
    <span className={`coins ${tone}`} aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <i key={i} />
      ))}
    </span>
  );
}

export function FlowBox({ player, t, lang }: { player: Player; t: TFn; lang: Lang }) {
  const st = statement(player);
  const unit = coinUnit(st.salary, st.passive, st.expenses);
  return (
    <section className="box" aria-labelledby="flow-h">
      <h3 className="h3" id="flow-h">
        <span className="dot" style={{ background: "var(--gold)" }} />
        {t("Monthly cash flow")}
        <span className="r">{t("1 coin = {amount}", { amount: fmtMoney(lang, unit) })}</span>
      </h3>
      <div className="eqrow sal">
        <span>{t("Salary")}</span>
        <Coins value={st.salary} unit={unit} tone="gold" />
        <span className="num">{fmtMoney(lang, st.salary)}</span>
      </div>
      <div className="eqrow in">
        <span>
          <span className="op">+</span> {t("Passive")}
        </span>
        <Coins value={st.passive} unit={unit} tone="mint" />
        <span className="num pos">{fmtMoney(lang, st.passive)}</span>
      </div>
      <div className="eqrow out">
        <span>
          <span className="op">−</span> {t("Expenses")}
        </span>
        <Coins value={st.expenses} unit={unit} tone="brick" />
        <span className="num neg">{fmtMoney(lang, st.expenses)}</span>
      </div>
      <div className={`eqtotal ${st.cashFlow < 0 ? "is-neg" : ""}`}>
        <small>{t("= what's left each month")}</small>
        <span className="num">{fmtMoney(lang, st.cashFlow, true)}</span>
      </div>
    </section>
  );
}

export function gateHint(player: Player, t: TFn, lang: Lang): ReactNode {
  const st = statement(player);
  const gap = st.expenses - st.passive;
  if (player.level >= 2) return <>{t("Level 2: grow, sell, or retire when you want.")}</>;
  if (player.track !== "grind") return <>{rich(t("Freedom line: buy your dream or reach {goal}/mo of passive income."), { goal: <b>{fmtMoney(lang, PASSIVE_WIN)}</b> })}</>;
  if (gap > 0) return <>{rich(t("Still {amount} of passive income to open the Gate."), { amount: <b>{fmtMoney(lang, gap)}</b> })}</>;
  return <>{rich(t("{open}: your assets pay the whole month."), { open: <b>{t("Gate open")}</b> })}</>;
}

export function PassiveChart({ points, expenses, t, lang }: { points: Point[]; expenses: number; t: TFn; lang: Lang }) {
  const shown = points.slice(-20);
  const top = Math.max(expenses, ...shown.map((p) => p.passive), 1) * 1.12;
  const first = shown[0];
  const last = shown[shown.length - 1];
  const summary = first && last
    ? t("Passive income went from {a} on turn {ta} to {b} on turn {tb}.", { a: fmtMoney(lang, first.passive), ta: first.turn, b: fmtMoney(lang, last.passive), tb: last.turn })
    : "";
  return (
    <figure className="chartfig">
      <div className="chart" role="img" aria-label={summary}>
        {shown.map((p) => (
          <i key={p.turn} style={{ height: `${Math.max(3, (p.passive / top) * 100)}%` }} title={`${t("Turn {turn}", { turn: p.turn })} · ${fmtMoney(lang, p.passive)}`} />
        ))}
        <div className="exp" style={{ bottom: `${(expenses / top) * 100}%` }}>
          <span>
            {t("Expenses")} {fmtMoney(lang, expenses)}
          </span>
        </div>
      </div>
      <figcaption className="chartaxis">
        <span>{first ? t("Turn {turn}", { turn: first.turn }) : ""}</span>
        <span>{t("Passive income per turn")}</span>
        <span>{last ? t("Turn {turn}", { turn: last.turn }) : ""}</span>
      </figcaption>
    </figure>
  );
}

export function GateBox({ player, t, lang, points }: { player: Player; t: TFn; lang: Lang; points: Point[] }) {
  const st = statement(player);
  const max = gaugeMax(st.expenses, st.passive);
  return (
    <section className="box gatebox" aria-labelledby="gate-h">
      <h3 className="h3" id="gate-h">
        <span className="dot" style={{ background: "var(--mint)" }} />
        {t("The Gate: passive vs expenses")}
      </h3>
      <Gauge passive={st.passive} expenses={st.expenses} max={max} lang={lang} t={t} />
      <div className="gaugelegend">
        <span className="p">
          {t("Passive")} {fmtMoney(lang, st.passive)}
        </span>
        <span className="e">
          {t("Expenses")} {fmtMoney(lang, st.expenses)}
        </span>
      </div>
      <p className="hint">{gateHint(player, t, lang)}</p>
      <PassiveChart points={points.length ? points : [{ turn: 1, passive: st.passive }]} expenses={st.expenses} t={t} lang={lang} />
    </section>
  );
}

export function rollLabel(state: GameState, t: TFn): string {
  if (state.phase === "rolling") return t("The die is thinking");
  if (state.phase === "moving") return t("Walking the ring");
  return t("Roll the die");
}

export function Dock({ state, die, t, onRoll, actions, ctx }: { state: GameState; die: number; t: TFn; onRoll: () => void; actions: ReactNode; ctx?: ReactNode }) {
  const idle = state.phase === "idle";
  return (
    <section className="dock" aria-label={t("Actions")}>
      {ctx && <div className="ctx">{ctx}</div>}
      <div className="dicecell">
        <BoxDie value={die} rolling={state.phase === "rolling"} t={t} />
      </div>
      <div className="actions">
        <button type="button" className="btn gold roll" onClick={onRoll} disabled={!idle}>
          <Ico name="dice" />
          {rollLabel(state, t)}
          {idle && <kbd>{t("Space bar")}</kbd>}
        </button>
        {actions}
      </div>
    </section>
  );
}

export function MobileHud({ player, state, t, lang, onStatus }: { player: Player; state: GameState; t: TFn; lang: Lang; onStatus: () => void }) {
  const st = statement(player);
  const max = gaugeMax(st.expenses, st.passive);
  return (
    <section className="box mhud m-only" aria-label={t("Dashboard")}>
      <div className="row1">
        <button type="button" className="avatar-btn" onClick={onStatus} aria-label={t("Status")}>
          <Avatar player={player} size="sm" />
        </button>
        <div>
          <h2>{nameOf(player)}</h2>
          <div className="sub">
            {t(st.career.title)} · {t("Turn {turn}", { turn: state.turn })}
          </div>
          <SocialChip player={player} state={state} t={t} onlyFresh />
        </div>
        <div className="cash">
          <div className="label">{t("Cash")}</div>
          <div className="num">{fmtMoney(lang, player.cash)}</div>
        </div>
      </div>
      <div className="mflow num" aria-label={`${t("Salary")} ${fmtMoney(lang, st.salary)}, ${t("Passive")} ${fmtMoney(lang, st.passive)}, ${t("Expenses")} ${fmtMoney(lang, st.expenses)}`}>
        <span className="c s">{fmtNum(lang, st.salary)}</span>+<span className="c p">{fmtNum(lang, st.passive)}</span>−<span className="c e">{fmtNum(lang, st.expenses)}</span>
        <span className={`t ${st.cashFlow < 0 ? "is-neg" : ""}`}>
          {fmtMoney(lang, st.cashFlow, true)}
          {t("/mo")}
        </span>
      </div>
      <Gauge passive={st.passive} expenses={st.expenses} max={max} lang={lang} t={t} />
      <p className="hint">{gateHint(player, t, lang)}</p>
    </section>
  );
}

export function StationStrip({ player, t }: { player: Player; t: TFn }) {
  const spaces = trackSpaces(player);
  const stops = [];
  for (let k = -1; k <= 6; k++) {
    const i = (player.position + k + spaces.length) % spaces.length;
    const space = spaces[i]!;
    const m = spaceMeta(space);
    const fill = player.track === "grind" ? m.bg : player.track === "venture" ? "var(--lilac)" : "var(--gold-tint)";
    const fg = player.track === "grind" ? m.fg : "var(--navy)";
    stops.push(
      <li key={k} className={`tstop ${k === 0 ? "here" : k < 0 ? "past" : ""}`}>
        {k > 0 && <span className="n">{k}</span>}
        {k === 0 && (
          <span className="mpawn" aria-hidden="true">
            <img src={portraitOf(player)} alt="" />
          </span>
        )}
        <div className={`tile ${space.kind === "big" ? "is-big" : ""}`} style={{ background: fill, color: fg }}>
          <Ico name={m.icon} />
        </div>
        <b>{t(space.label)}</b>
      </li>,
    );
  }
  const title = player.track === "grind" ? t("Line 1 · next stations") : player.track === "venture" ? t("Line 3 · next stations") : t("Line 2 · next stations");
  return (
    <section className="box strip m-only" aria-label={title}>
      <h3 className="h3">
        <span className="dot" />
        {title}
        <span className="r">{t("die: 1 to 6")}</span>
      </h3>
      <ol className="track" tabIndex={0} aria-label={title}>
        {stops}
      </ol>
    </section>
  );
}

export function hereLabel(player: Player, t: TFn): string {
  const space = trackSpaces(player)[player.position] ?? GRIND[0]!;
  return t("You are here · {station}", { station: t(space.label) });
}
