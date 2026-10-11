import { describe, expect, it } from "vitest";
import { LIFESTYLE, SMALL_DEALS } from "./data";
import { createMatch, cur, hydrate, marketFor, priceOf, quizOpen, reduce, spendOf, statement, unlocked, type GameState, type Player } from "./engine";
import { experienceLevel, gainSkill, gigIncome, maxFriends, negoDiscount, skillLevel, type SkillId } from "./skills";
import { CLASS_QUIZ, SKILL_RULES } from "./tuning";

const AOI = { characterId: "aoi", dreamId: "cafe" };
/** Smallest XP reaching a level on the skill curve (cumulative 100, 220, 364, 536.8, 744.2 … → ceil). */
const XP_FOR = Array.from({ length: 10 }, (_, l) => (l < 2 ? 0 : Math.ceil((100 * (Math.pow(1.2, l - 1) - 1)) / 0.2 - 1e-9)));
const at = (p: Player, id: SkillId, level: number): Player => ({ ...p, skills: { ...p.skills, [id]: XP_FOR[level]! } });
const idle = (seed = 3): GameState => {
  let s = createMatch([AOI], seed, false);
  while (s.phase === "card") s = reduce(s, { type: "CHOICE", id: s.card!.choices[0]!.id });
  return s;
};
const withPlayer = (s: GameState, f: (p: Player) => Player): GameState => ({ ...s, players: s.players.map((p, i) => (i === s.current ? f(p) : p)) });

describe("v3 skills: levels without a cap", () => {
  it("skillLevel on 0, 99, 100, 220, 1e9 XP", () => {
    const p = { skills: {} } as Player;
    expect(skillLevel(p, "nego")).toBe(1);
    expect(skillLevel(gainSkill(p, "nego", 99), "nego")).toBe(1);
    expect(skillLevel(gainSkill(p, "nego", 100), "nego")).toBe(2);
    expect(skillLevel(gainSkill(p, "nego", 220), "nego")).toBe(3);
    expect(skillLevel(gainSkill(p, "nego", 1e9), "nego")).toBeGreaterThan(50);
    for (let l = 2; l < XP_FOR.length; l++) expect(skillLevel(at(p, "nego", l), "nego")).toBe(l);
  });

  it("XP never goes down, never NaN", () => {
    const p = gainSkill({ skills: { luck: 50 } } as Player, "luck", -40);
    expect(p.skills!.luck).toBe(50);
    expect(gainSkill(p, "luck", Number.NaN).skills!.luck).toBe(50);
  });

  it("a save without skills is seeded from its gauges (gauge × 3), the new skills start at 0; Health gauge 60", () => {
    const s = idle();
    const raw = JSON.parse(JSON.stringify(s));
    delete raw.players[0].skills;
    delete raw.players[0].vitals.health;
    raw.players[0].vitals.social = 50;
    const h = hydrate(raw);
    expect(cur(h).skills!.social).toBe(150);
    expect(skillLevel(cur(h), "social")).toBe(2);
    expect(cur(h).skills!.nego).toBeUndefined();
    expect(cur(h).vitals.health).toBe(SKILL_RULES.health.start);
    // junk is dropped
    raw.players[0].skills = { nego: "x", luck: -5, mind: 300 };
    expect(cur(hydrate(raw)).skills).toEqual({ mind: 300 });
  });
});

describe("v3 skills: effects (SKILLS.md)", () => {
  it("Negotiation Lv. 3 = −10 % on a deal down payment; the table 0/5/10/12/15 %", () => {
    const p = cur(idle());
    const deal = SMALL_DEALS.find((d) => d.down >= 1000)!;
    const base = priceOf(at(p, "nego", 1), deal.id).down;
    expect(priceOf(at(p, "nego", 3), deal.id).down).toBe(Math.round(deal.down * 0.9));
    expect(base).toBe(deal.down);
    expect([1, 2, 3, 4, 5, 9].map((l) => negoDiscount(at(p, "nego", l)))).toEqual([0, 0.05, 0.1, 0.12, 0.15, 0.15]);
  });

  it("Happiness gauge 29 → lifestyle +10 %; 30 → normal", () => {
    const p = cur(idle());
    const spend = LIFESTYLE.find((x) => !x.id.includes("party"))!;
    const low = { ...p, vitals: { ...p.vitals, content: 29 } };
    const ok = { ...p, vitals: { ...p.vitals, content: 30 } };
    expect(spendOf(ok, spend.id)).toBe(spend.amount);
    expect(spendOf(low, spend.id)).toBe(Math.round(spend.amount * 1.1));
  });

  it("Luck softens a crash: the markdown and the bill shrink with the level", () => {
    const p = { ...cur(idle()), cash: 5000, assets: [{ id: "a1", name: "Room", cashFlow: 1000, down: 1000, cost: 5000 }] };
    expect(marketFor(at(p, "luck", 1), "crash").assets[0]!.cashFlow).toBe(700);
    expect(marketFor(at(p, "luck", 5), "crash").assets[0]!.cashFlow).toBe(760); // markdown 30 % × (1 − 20 %) = −24 %
    const bare = { ...p, assets: [] };
    expect(marketFor(at(bare, "luck", 1), "crash").cash).toBe(4800);
    expect(marketFor(at(bare, "luck", 9), "crash").cash).toBe(4880); // −40 % on the $200 bill
  });

  it("friend slots go from 3 to 7 with Social", () => {
    const p = cur(idle());
    expect([1, 2, 3, 4, 6, 8, 9].map((l) => maxFriends(at(p, "social", l)))).toEqual([3, 4, 4, 5, 6, 7, 7]);
  });

  it("high Health raises the salary (capped 8 %), low Health never does", () => {
    const p = cur(idle());
    const salary = statement(p).career.salary;
    const fit = at({ ...p, vitals: { ...p.vitals, health: 80 } }, "health", 3);
    expect(statement(fit).healthBonus).toBe(Math.round(salary * 0.03));
    expect(statement({ ...fit, vitals: { ...fit.vitals, health: 75 } }).healthBonus).toBe(0);
  });

  it("Creativity side incomes add to the cash flow but NOT to the Gate (open decision, flag countsTowardGate)", () => {
    const p = { ...at(cur(idle()), "creativity", 6), sideGigs: [{ id: "drawings", started: 1 }, { id: "online", started: 2 }] };
    expect(gigIncome(p)).toBe(210);
    const st = statement(p);
    const bare = statement({ ...p, sideGigs: [] });
    expect(st.cashFlow - bare.cashFlow).toBe(210);
    expect(st.passive).toBe(bare.passive);
    const flag = SKILL_RULES.creativity.countsTowardGate;
    SKILL_RULES.creativity.countsTowardGate = true;
    try {
      expect(statement(p).passive - bare.passive).toBe(210);
    } finally {
      SKILL_RULES.creativity.countsTowardGate = flag;
    }
    expect(unlocked(p)).toBe(unlocked({ ...p, sideGigs: [] }));
  });

  it("with SKILL_RULES.effects off, no effect at all (the regression replay relies on it)", () => {
    const p = at(at(cur(idle()), "nego", 5), "social", 9);
    SKILL_RULES.effects = false;
    try {
      expect(negoDiscount(p)).toBe(0);
      expect(maxFriends(p)).toBe(5);
    } finally {
      SKILL_RULES.effects = true;
    }
  });
});

describe("v3 skills: XP sources and the new actions", () => {
  it("repaying a loan gives Discipline +60 and Reputation +40; buying clothes gives Negotiation (+ Charisma for a shirt)", () => {
    let s = reduce(idle(), { type: "BORROW" });
    const loan = cur(s).liabilities[0]!;
    s = withPlayer(s, (p) => ({ ...p, cash: 5000 }));
    const before = cur(s).skills!;
    const n = reduce(s, { type: "REPAY", id: loan.id });
    expect((cur(n).skills!.discipline ?? 0) - (before.discipline ?? 0)).toBe(60);
    expect((cur(n).skills!.reputation ?? 0) - (before.reputation ?? 0)).toBe(40);
    const shirt = reduce(n, { type: "BUY_CLOTH", outfit: "shirt" });
    expect((cur(shirt).skills!.nego ?? 0) - (cur(n).skills!.nego ?? 0)).toBe(20);
    expect((cur(shirt).skills!.charisma ?? 0) - (cur(n).skills!.charisma ?? 0)).toBe(60);
  });

  it("gauge → skill bridge: +10 XP per gauge point gained", () => {
    const s = withPlayer(idle(), (p) => ({ ...p, cash: 5000, lifeTurn: -1 }));
    const card = reduce(s, { type: "LIFE", kind: "museum" });
    const n = reduce(card, { type: "CHOICE", id: "go" });
    const dMind = cur(n).vitals.mind - cur(s).vitals.mind;
    expect(dMind).toBeGreaterThan(0);
    expect((cur(n).skills!.mind ?? 0) - (cur(s).skills!.mind ?? 0)).toBe(dMind * 10);
    expect((cur(n).skills!.creativity ?? 0) - (cur(s).skills!.creativity ?? 0)).toBe(40);
  });

  it("class quiz: 150 $ per good answer (+5 %/Intelligence level), once every few turns, never in practice", () => {
    const s = idle();
    const n = reduce(s, { type: "QUIZ", correct: 3 });
    const lv = skillLevel(cur(s), "mind");
    expect(cur(n).cash - cur(s).cash).toBe(Math.round(3 * CLASS_QUIZ.perCorrect * (1 + Math.min(0.5, 0.05 * (lv - 1)))));
    expect((cur(n).skills!.mind ?? 0) - (cur(s).skills!.mind ?? 0)).toBe(90);
    expect(quizOpen(cur(n))).toBe(false);
    expect(reduce(n, { type: "QUIZ", correct: 3 })).toBe(n);
    const practice = createMatch([AOI], 3, false, { training: true });
    expect(reduce(practice, { type: "QUIZ", correct: 3 })).toBe(practice);
  });

  it("goods: a shop must be open; the book is repeatable and gives Intelligence XP", () => {
    const s = withPlayer(idle(), (p) => ({ ...p, cash: 50_000 }));
    const book = reduce(s, { type: "BUY_GOOD", id: "book" });
    expect(cur(book).goods).toEqual(["book"]);
    expect((cur(book).skills!.mind ?? 0) - (cur(s).skills!.mind ?? 0)).toBe(120);
    const twice = reduce(book, { type: "BUY_GOOD", id: "book" });
    expect(cur(twice).goodsCount!.book).toBe(2);
    // the estate agency opens at turn 20 (minus Reputation): closed on turn 1
    expect(reduce(s, { type: "BUY_GOOD", id: "duplex" })).toBe(s);
    const later = withPlayer(s, (p) => ({ ...p, turns: 25 }));
    const duplex = reduce(later, { type: "BUY_GOOD", id: "duplex" });
    expect(statement(cur(duplex)).passive - statement(cur(later)).passive).toBe(900);
  });

  it("experience level sums every skill", () => {
    const p = cur(idle());
    expect(experienceLevel({ skills: {} })).toBe(1);
    expect(experienceLevel(at(at(p, "nego", 9), "luck", 9))).toBeGreaterThan(experienceLevel(p));
  });
});
