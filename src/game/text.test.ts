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

  it("[I18N-01] old saves (finished English sentences) still display: exact lookup, else the English as-is", () => {
    expect(tr("fr", "Payday")).toBe("Jour de paie");
    expect(tr("fr", "Bought Corner laundromat. +$300/mo passive.")).toBe("Bought Corner laundromat. +$300/mo passive.");
    expect(tr("es", "\u2063tl:{broken")).toBe("\u2063tl:{broken");
  });
});
