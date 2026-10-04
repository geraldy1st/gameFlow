import type { Lang } from "@/game/i18n";
import { fmtMoney } from "./format";
import { Ico } from "./icons";

type TFn = (text: string, vars?: Record<string, string | number>) => string;

const pct = (v: number, max: number) => `${Math.max(0, Math.min(100, (v / max) * 100))}%`;
const clampTag = (v: number, max: number) => `${Math.max(13, Math.min(87, (v / max) * 100))}%`;

/** Scale shared by every gauge on screen, so before/after bars compare honestly. */
export function gaugeMax(...values: number[]): number {
  const top = Math.max(1000, ...values) * 1.18;
  const step = top > 20000 ? 5000 : top > 5000 ? 1000 : 250;
  return Math.ceil(top / step) * step;
}

/**
 * The Gate gauge: passive income fill vs the expenses marker ("Gate").
 * `after` draws a hatched segment for a previewed passive value.
 */
export function Gauge({ passive, expenses, max, after, lang, t, className = "" }: { passive: number; expenses: number; max: number; after?: number; lang: Lang; t: TFn; className?: string }) {
  const open = passive > expenses;
  return (
    <div
      className={`gauge ${open ? "is-open" : ""} ${className}`}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={Math.max(1, expenses)}
      aria-valuenow={Math.min(passive, Math.max(1, expenses))}
      aria-label={t("Passive income {passive} against expenses {expenses}", { passive: fmtMoney(lang, passive), expenses: fmtMoney(lang, expenses) })}
    >
      <div className="fill" style={{ width: pct(passive, max) }} />
      {after !== undefined && after > passive && <div className="after" style={{ left: pct(passive, max), width: `calc(${pct(after, max)} - ${pct(passive, max)})` }} />}
      <div className="mark" style={{ left: pct(expenses, max) }} />
      <div className="door" style={{ left: clampTag(expenses, max) }}>
        <Ico name="door" />
        {t("Gate")} · {fmtMoney(lang, expenses)}
      </div>
    </div>
  );
}
