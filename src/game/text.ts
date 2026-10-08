/**
 * DEF-I18N-01 / 03: engine text with variables, translated at display time.
 *
 * The engine used to store journal lines and card texts as finished English sentences (`Bought ${title}.`), which no
 * dictionary lookup can ever match. `tl(key, vars)` stores the English *key* ("Bought {title}.") and its variables
 * instead; `tr()` (i18n.ts) translates the key, translates each string variable (deal titles, career names...) and
 * fills the placeholders, in the language on screen.
 *
 * The result is still a `string`, so GameState, CardView and the saves keep their exact shape:
 * - `tl(key)` without variables is just `key` (a plain dictionary key, as before);
 * - with variables, it is a marked JSON payload, decoded only by `tr()`;
 * - old saves hold plain English strings: they keep the old exact-lookup behaviour (fallback).
 *
 * A placeholder may carry a modifier: `{career|lower}` inserts the translated value in lower case.
 */
export type TextVars = Record<string, string | number>;

const MARK = "\u2063tl:";

export function tl(key: string, vars?: TextVars): string {
  if (!vars || Object.keys(vars).length === 0) return key;
  return MARK + JSON.stringify({ k: key, v: vars });
}

/** The key and variables of a `tl()` text, or null for a plain string (old saves, literal keys). */
export function parseText(s: string): { k: string; v: TextVars } | null {
  if (typeof s !== "string" || !s.startsWith(MARK)) return null;
  try {
    const o = JSON.parse(s.slice(MARK.length)) as { k?: unknown; v?: unknown };
    if (typeof o?.k !== "string") return null;
    const v: TextVars = {};
    if (o.v && typeof o.v === "object") for (const [k, x] of Object.entries(o.v)) if (typeof x === "string" || typeof x === "number") v[k] = x;
    return { k: o.k, v };
  } catch {
    return null;
  }
}

/** Fills `{name}` and `{name|lower}` placeholders. */
export function fillVars(s: string, vars: Record<string, string | number>): string {
  let out = s;
  for (const [k, v] of Object.entries(vars)) {
    const str = String(v);
    out = out.split(`{${k}}`).join(str).split(`{${k}|lower}`).join(str.toLowerCase());
  }
  return out;
}
