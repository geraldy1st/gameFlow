import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CHARACTERS, FRIENDS, PARTNERS } from "./data";
import { createMatch, reduce, type GameState, type Pick } from "./engine";
import { tr } from "./i18n";
import { parseText, tl } from "./text";
import { localizeMoney } from "@/components/game/boite/format";

const AOI: Pick = { characterId: "aoi", dreamId: "cafe" };
const REN: Pick = { characterId: "ren", dreamId: "studio" };
const show = (lang: "en" | "fr" | "es", s: string) => localizeMoney(lang, tr(lang, s));

describe("DEF-I18N-01..04: engine text as key + variables, translated at display time", () => {
  it("[I18N-01] tl() without variables is the plain key; with variables, a token only tr() reads", () => {
    expect(tl("Training complete.")).toBe("Training complete.");
    const tok = tl("Bought {title}. {cf}/mo passive.", { title: "Corner laundromat", cf: "+$300" });
    expect(parseText(tok)).toEqual({ k: "Bought {title}. {cf}/mo passive.", v: { title: "Corner laundromat", cf: "+$300" } });
    expect(parseText("Bought Corner laundromat. +$300/mo passive.")).toBeNull();
  });

  it("[I18N-01] journal lines with amounts read naturally in fr and es", () => {
    const line = tl("Passed payday {amount}.", { amount: "+$1,690" });
    expect(show("en", line)).toBe("Passed payday +$1,690.");
    expect(show("fr", line)).toBe(localizeMoney("fr", "Jour de paie passé : +$1,690."));
    expect(show("es", line)).toBe(localizeMoney("es", "Día de pago superado: +$1,690."));
    expect(show("fr", tl("Tax paid {amount}.", { amount: "$310" }))).not.toMatch(/Tax|paid|\$3/);
  });

  it("[I18N-02] fixed journal and result lines are in both dictionaries", () => {
    for (const en of ["Training complete.", "The market shrugs.", "Broke. Cash resets and you skip a turn.", "A smooth month. Payroll −$200.", "You stand on the Freedom Track."]) {
      expect(tr("fr", en), en).not.toBe(en);
      expect(tr("es", en), en).not.toBe(en);
    }
    expect(tr("fr", "The market shrugs.")).toBe("Le marché hausse les épaules.");
    expect(tr("es", "The market shrugs.")).toBe("El mercado se encoge de hombros.");
  });

  it("[I18N-04] renders the same English as the old template, and natural fr/es with translated variables", () => {
    const tok = tl("Bought {title}. {cf}/mo passive.", { title: "Corner laundromat", cf: "+$300" });
    expect(show("en", tok)).toBe("Bought Corner laundromat. +$300/mo passive.");
    expect(show("fr", tok)).toBe(localizeMoney("fr", "Achat : Laverie du coin. +$300/mois de passif."));
    expect(show("es", tok)).toBe(localizeMoney("es", "Compraste Lavandería de la esquina. +$300/mes de pasivo."));
    expect(show("fr", tok)).not.toMatch(/Bought|laundromat|\/mo\b/);
  });

  it("[I18N-04] supports nested tokens and the {x|lower} modifier", () => {
    const inner = tl("{title} note", { title: "Six-unit walk-up" });
    expect(tr("en", tl("Repaid {loan}.", { loan: inner }))).toBe("Repaid Six-unit walk-up note.");
    expect(tr("fr", tl("Repaid {loan}.", { loan: inner }))).toBe("Remboursé : Traite · Petit immeuble de six logements.");
    const start = tl("{name} starts as a {career|lower}. {blurb} Cash on hand is modest. The Grind is not.", {
      name: "Aoi",
      career: "Café artist",
      blurb: "Lattes, chalk menus, and paint under your nails.",
    });
    expect(tr("en", start)).toBe("Aoi starts as a café artist. Lattes, chalk menus, and paint under your nails. Cash on hand is modest. The Grind is not.");
    expect(tr("es", start)).toMatch(/^Aoi empieza como [a-zé]/);
  });

  it("[I18N-01] old saves (finished English sentences) still display: exact lookup, else the English as-is", () => {
    expect(tr("fr", "Payday")).toBe("Jour de paie");
    expect(tr("fr", "Bought Corner laundromat. +$300/mo passive.")).toBe("Bought Corner laundromat. +$300/mo passive.");
    expect(tr("es", "\u2063tl:{broken")).toBe("\u2063tl:{broken");
  });

  it("[I18N-03] every tl() key of the engine exists in fr and es with the same placeholders", () => {
    const src = readFileSync(new URL("./engine.ts", import.meta.url), "utf8");
    const keys = [...src.matchAll(/\btl\(\s*"((?:[^"\\]|\\.)*)"/g)].map((m) => JSON.parse(`"${m[1]}"`) as string);
    expect(keys.length).toBeGreaterThan(70);
    const names = (s: string) => [...s.matchAll(/\{(\w+)(?:\|lower)?\}/g)].map((m) => m[1]).sort();
    for (const k of keys) {
      for (const lang of ["fr", "es"] as const) {
        const v = tr(lang, k);
        if (k !== "{amount} max" || lang === "es") expect(v, `${lang}: ${k}`).not.toBe(k); // "{amount} max" is French too
        expect(names(v), `${lang}: ${k}`).toEqual(names(k));
      }
    }
  });

  it("[I18N-04] real games: every journal line and card text is translated in fr and es (no token, no English left)", () => {
    const seen = new Set<string>();
    const collect = (s: GameState) => {
      for (const x of s.log ?? []) seen.add(x);
      for (const x of s.history ?? []) seen.add(x);
      for (const p of s.players) for (const x of [...p.assets, ...p.liabilities]) seen.add(x.name);
      const c = s.card;
      if (c) {
        for (const x of [c.title, c.story, c.tag, c.speech]) if (x) seen.add(x);
        for (const l of c.lines ?? []) { seen.add(l.k); seen.add(l.v); }
        for (const ch of c.choices) seen.add(ch.label);
      }
    };
    for (const picks of [[AOI], [AOI, REN]]) {
      for (const seed of [1, 7, 42, 99, 1234, 2026]) {
        let rng = seed;
        const rand = (n: number) => ((rng = (Math.imul(rng, 1103515245) + 12345) >>> 0) % n);
        let s = createMatch(picks, seed, false);
        for (let i = 0; i < 700 && s.phase !== "win"; i++) {
          collect(s);
          if (s.phase === "card" && s.card) s = reduce(s, { type: "CHOICE", id: s.card.choices[rand(s.card.choices.length)]!.id });
          else if (s.phase === "idle") s = reduce(s, { type: "ROLL" });
          else if (s.phase === "rolling") s = reduce(s, { type: "REVEAL" });
          else if (s.phase === "moving") s = reduce(s, { type: "STEP" });
          else if (s.phase === "pass") s = reduce(s, { type: "READY" });
          else if (s.phase === "broke") s = reduce(s, { type: "BREATHE" });
          else break;
        }
      }
    }
    const english = /[A-Za-z]{2,}[^A-Za-z]+[A-Za-z]{2,}/; // two words or more, unchanged = untranslated
    const names = new Set([...CHARACTERS, ...FRIENDS, ...PARTNERS].map((p) => p.name)); // proper names stay as-is
    const left: string[] = [];
    for (const x of seen) {
      if (names.has(x)) continue;
      for (const lang of ["fr", "es"] as const) {
        const out = show(lang, x);
        if (out.includes("\u2063")) left.push(`${lang} token: ${x}`);
        else if (tr(lang, x) === tr("en", x) && english.test(out)) left.push(`${lang}: ${out}`);
      }
    }
    expect(seen.size).toBeGreaterThan(150);
    expect(left).toEqual([]);
  });
});
