import type { Lang } from "@/game/i18n";

function group(n: number, lang: Lang): string {
  const s = String(Math.abs(Math.round(n)));
  const sep = lang === "en" ? "," : lang === "fr" ? "\u202f" : ".";
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}

/**
 * Locale-aware money. `signed` forces "+" on positives; negatives always carry
 * a true minus sign "−", so amounts never rely on colour alone.
 */
export function fmtMoney(lang: Lang, n: number, signed = false): string {
  const v = Math.round(n);
  const sign = v < 0 ? "\u2212" : signed && v > 0 ? "+" : "";
  const g = group(v, lang);
  return lang === "en" ? `${sign}$${g}` : `${sign}${g}\u00a0$`;
}

/** Bare grouped number with the same sign rules (for compact chips). */
export function fmtNum(lang: Lang, n: number, signed = false): string {
  const v = Math.round(n);
  const sign = v < 0 ? "\u2212" : signed && v > 0 ? "+" : "";
  return `${sign}${group(v, lang)}`;
}

/** One decimal, localised separator. */
export function fmtDec(lang: Lang, n: number): string {
  const s = (Math.round(n * 10) / 10).toFixed(1);
  return lang === "en" ? s : s.replace(".", ",");
}

/** "Label: value" with French spacing ("Libellé : valeur"). */
export function colon(lang: Lang): string {
  return lang === "fr" ? "\u00a0: " : ": ";
}
