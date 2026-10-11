/**
 * GameFlow v3 — compact numbers and level bars without a cap (port of the mockup's v3/format.js).
 *
 * - formatCompact: 999 · 1K · 1.2K · 1M · 1B · 1T · 1aa … zz · aaa …; truncates (never rounds up: 1 999 → 1.9K,
 *   999 999 → 999.9K), accepts number or bigint, handles negatives.
 * - money / moneyFull: compact and exact amounts.
 * - levelState: closed form, O(1) even for 4-digit levels.
 *
 * The decimal separator default comes from tuning.ts (NUMBER_FORMAT.sep), so switching to "1,2K" is one line.
 */
import { NUMBER_FORMAT } from "./tuning";

const NAMED = ["", "K", "M", "B", "T"] as const;

export interface CompactOptions {
  /** Decimals kept after the integer part (truncated). Default 1. */
  decimals?: number;
  /** Decimal separator. Default NUMBER_FORMAT.sep ("." → 1.2K). */
  sep?: string;
}

/** Suffix of tier n (1000^n): "", K, M, B, T, then aa, ab … az, ba … zz, then aaa … */
export function suffix(tier: number): string {
  if (tier < NAMED.length) return NAMED[tier]!;
  let i = tier - NAMED.length;
  let len = 2;
  let span = 26 * 26;
  while (i >= span) {
    i -= span;
    len++;
    span *= 26;
  }
  let s = "";
  for (let k = 0; k < len; k++) {
    s = String.fromCharCode(97 + (i % 26)) + s;
    i = Math.floor(i / 26);
  }
  return s;
}

export function formatCompact(value: number | bigint, opts: CompactOptions = {}): string {
  const decimals = opts.decimals ?? 1;
  const sep = opts.sep ?? NUMBER_FORMAT.sep;
  if (typeof value === "bigint") {
    const neg = value < 0n;
    const v = neg ? -value : value;
    const digits = v.toString();
    if (digits.length <= 3) return (neg ? "-" : "") + digits;
    const tier = Math.floor((digits.length - 1) / 3);
    const head = digits.slice(0, digits.length - tier * 3);
    const frac = digits.slice(head.length, head.length + decimals).replace(/0+$/, "");
    return (neg ? "-" : "") + head + (frac ? sep + frac : "") + suffix(tier);
  }
  if (typeof value !== "number" || Number.isNaN(value)) return "0";
  if (!Number.isFinite(value)) return value < 0 ? "-∞" : "∞";
  const neg = value < 0;
  const v = Math.abs(value);
  if (v < 1000) return (neg ? "-" : "") + String(Math.floor(v));
  // Through BigInt, to avoid float rounding (1e15 / 1e12 …).
  const int = v >= 1e21 ? BigInt(Math.floor(v).toLocaleString("fullwide", { useGrouping: false })) : BigInt(Math.floor(v));
  return formatCompact(neg ? -int : int, { decimals, sep });
}

/** Compact amount the game way: "6.4K $", "950 $" (French order; the UI's money helpers localise the sign). */
export function money(value: number, opts?: CompactOptions): string {
  return formatCompact(value, opts) + " $";
}

/** Exact amount, French style: "6 450 $" (narrow no-break space), "+2 340 $", "−2 580 $". */
export function moneyFull(value: number, signed = false): string {
  const s = Math.round(Math.abs(value))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, "\u202F");
  return (value < 0 ? "−" : signed ? "+" : "") + s + "\u00A0$";
}

export interface Curve {
  base: number;
  growth: number;
}

export interface LevelState {
  /** Current level, >= 1, no cap. */
  level: number;
  /** Points inside the current level. */
  into: number;
  /** Points the current level needs. */
  need: number;
  /** Fill 0..1. */
  ratio: number;
}

/**
 * Bar with levels and no cap. Level n → n+1 costs base × growth^(n−1) points. Closed form, O(1) even for
 * astronomical levels. At 100 % the level goes up by 1 and the bar starts again from 0.
 */
export function levelState(xp: number, curve: Partial<Curve> = {}): LevelState {
  const base = curve.base ?? 100;
  const g = curve.growth ?? 1;
  const x = Math.max(0, Number(xp) || 0);
  let level: number;
  let before: number;
  if (g === 1) {
    level = Math.floor(x / base) + 1;
    before = (level - 1) * base;
  } else {
    level = Math.floor(Math.log(1 + (x * (g - 1)) / base) / Math.log(g)) + 1;
    const total = (L: number) => (base * (Math.pow(g, L - 1) - 1)) / (g - 1);
    // float rounding guards
    while (level > 1 && total(level) > x) level--;
    while (total(level + 1) <= x) level++;
    before = total(level);
  }
  const need = g === 1 ? base : base * Math.pow(g, level - 1);
  const into = x - before;
  return { level, into, need, ratio: Math.min(1, Math.max(0, into / need)) };
}
