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
});
