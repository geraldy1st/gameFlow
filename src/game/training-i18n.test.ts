import { describe, expect, it } from "vitest";
import { tr } from "./i18n";

/** DEF-TUT-08: every English string of the scripted training cards has a fr and an es entry (shown after Skip). */
const TRAINING_CARD_STRINGS = [
  "Rest / Charity",
  "A bench, a paper cup, and a box for someone else’s tuition. You can sit, or you can give.",
  "Rest",
  "Clear a skipped or broke turn",
  "Just rest",
  "Spare-room sublet",
  "A cousin’s futon becomes a quiet little income.",
  "Training price cap",
  "Subscription shrine",
  "Three apps, two crates, one magazine. They renew forever.",
  "Lifestyle expense",
  "Pay",
  "Then monthly",
  "One-off",
  "Subscription over 12 months",
  "Pay $40",
  "Let it pass",
  "A nod across the room",
  "Someone almost introduces themselves. The moment passes.",
  "Social circle",
  "Continue",
];

describe("DEF-TUT-08: scripted training cards are translated", () => {
  for (const lang of ["fr", "es"] as const) {
    it(lang, () => {
      const missing = TRAINING_CARD_STRINGS.filter((k) => tr(lang, k) === k);
      expect(missing).toEqual([]);
    });
  }
});
