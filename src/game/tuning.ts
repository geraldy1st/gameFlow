/**
 * GameFlow v3 — every tunable of the update in ONE place (open decisions for Geraldy).
 *
 * The values below are the mockup's proposals (gameflow-bc/v3: UPDATE-BRIEF §9, SKILLS.md, data.js). Change a number
 * here and the engine, the UI and the tests follow; nothing else hard-codes them.
 */

/* ------------------------------------------------------------------ numbers */

/** Compact numbers: "." gives 1.2K (brief example); "," gives 1,2K (French comma). */
export const NUMBER_FORMAT = { sep: "." };

/* ------------------------------------------------------------------ level curves (no cap) */

/** Level n → n+1 costs base × growth^(n−1) points (format-compact.ts levelState). */
export const CURVES = {
  /** HUD experience level. XP = the sum of every skill's XP (see skills.ts experienceXp). */
  xp: { base: 200, growth: 1.25 },
  /** Each of the 10 skills: 100 XP for Lv. 2, 220 for Lv. 3, 364 for Lv. 4, 537 for Lv. 5, 744 for Lv. 6. */
  skill: { base: 100, growth: 1.2 },
  /** Friendship affinity (Day › Circle, friend sheet). */
  affinity: { base: 120, growth: 1.3 },
};

/* ------------------------------------------------------------------ class quiz (Activities › Mini-games) */

export const CLASS_QUIZ = {
  /** Cash per correct answer, before the Intelligence bonus. 3 questions → 450 $ max at Intelligence Lv. 1. */
  perCorrect: 150,
  /** Intelligence bonus: +stepPct per level above 1, capped at +maxPct. */
  mindStepPct: 0.05,
  mindMaxPct: 0.5,
  /** Seconds per question. */
  seconds: 20,
  /** Once per this many of the player's own turns (0 = any time). */
  everyTurns: 5,
  /** XP per correct answer (Intelligence) and per finished quiz (Creativity). */
  xpPerCorrect: 30,
  creativityXp: 30,
  /** Teacher: name card and signature / label in her speech bubbles. */
  teacherName: "Kyoko M.",
  teacherLabel: "Kyoko-sensei",
};

/* ------------------------------------------------------------------ skills (SKILLS.md numbers) */

export const SKILL_RULES = {
  /**
   * Master switch for the skill EFFECTS (prices, chances, bonuses...). XP is still earned when false. The regression
   * replay turns it off to prove the base rules are untouched; the game always runs with it on.
   */
  effects: true,
  /** Gauge → skill bridge: each positive gauge point also gives this much XP to the skill of the same name. */
  bridgeXpPerPoint: 10,
  /** Saves without skills: seed XP = gauge × this, for the 4 existing skills (gauge 50 → 150 XP, Lv. 2). */
  seedFromGauge: 3,

  happiness: {
    lowBelow: 30, // gauge under this → lifestyle costs +lowPct
    lowPct: 0.1,
    highAbove: 70, // gauge over this → chance of a free re-roll once per turn on lifestyle / tax / health
    rerollBase: 0.1,
    rerollStep: 0.02,
    rerollMax: 0.25,
  },
  social: {
    /** Friend slots = slotsBase + min(slotsMaxExtra, floor(level / 2)) → 3 to 7. */
    slotsBase: 3,
    slotsMaxExtra: 4,
    /** From this level, every +1 loyalty becomes +2 (still capped at 4). */
    fasterAffinityAt: 6,
    /** From this level, a Social square has this chance of a friend's hidden small deal. */
    hiddenDealAt: 8,
    hiddenDealChance: 0.15,
  },
  mind: {
    /** Under this level, deal cards show "???" for profitability and risk. */
    readDealsAt: 3,
  },
  luck: {
    /** Neutral (quiet) square → small deal instead: min(max, step × (level − 1)). */
    quietDealStep: 0.015,
    quietDealMax: 0.12,
    /** Crash markdown and bill × (1 − min(max, step × (level − 1))). */
    crashStep: 0.05,
    crashMax: 0.4,
  },
  health: {
    start: 60, // gauge for new players and old saves
    driftEvery: 2, // −1 gauge every N own turns
    lowBelow: 25,
    forcedRestChance: 0.2,
    medicalBase: 150,
    medicalSalaryPct: 0.02,
    forcedRestHeal: 15, // gauge back after the forced rest
    highAbove: 75,
    salaryStepPct: 0.01, // + step × level of salary, capped
    salaryMaxPct: 0.08,
    clinicHeal: 20, // "Pay the clinic" on the Health square
    sleepHeal: 10,
  },
  discipline: {
    /** Lifestyle square → quiet: min(max, step × (level − 1)). */
    skipLifestyleStep: 0.03,
    skipLifestyleMax: 0.3,
    /** Refusing a lifestyle card costs `refuseMood − min(refuseMood, level − 1)` Happiness gauge (0 from Lv. 7). */
    refuseMood: 6,
  },
  nego: {
    /** Discount by level: index = level − 1, the last value holds for every level above. */
    discount: [0, 0.05, 0.1, 0.12, 0.15],
    /** Investor friend (−10 %) + negotiation, capped. */
    maxCombined: 0.25,
    /** Resale: × (1 + min(max, step × (level − 1))). */
    resaleStep: 0.02,
    resaleMax: 0.1,
  },
  charisma: {
    /** Extra "promo" copies in the career deck: min(max, floor((level − 1) / 2)). */
    promoMax: 3,
    /** From this level a Career square offers "Interview" (an on-demand offer), once every `interviewEvery` turns. */
    interviewAt: 4,
    interviewEvery: 5,
  },
  creativity: {
    /** Side incomes switched on the first time the level is reached. */
    gigs: [
      { id: "drawings", at: 3, monthly: 60 },
      { id: "online", at: 6, monthly: 150 },
    ] as const,
    /** After the last gig level: +step per level, capped. */
    stepPct: 0.1,
    maxPct: 1,
    /**
     * OPEN DECISION: do creative side incomes count as passive income (and so toward opening the Gate)?
     * false (default asked for) = they are earned income: they add to cash flow but not to the Gate.
     */
    countsTowardGate: false,
  },
  reputation: {
    /** Unlock conditions (turn, passive income, experience level) drop by min(max, step × (level − 1)). */
    unlockStep: 0.05,
    unlockMax: 0.3,
    /** Social square: chance of a mentor instead, + step × (level − 1), capped. */
    mentorStep: 0.03,
    mentorMax: 0.2,
  },
};

/** XP by source (SKILLS.md "Barème des sources"). The gauge bridge comes on top. */
export const SKILL_XP = {
  partyCharisma: 30,
  circleReputation: 10,
  museumCreativity: 40,
  sleepHappiness: 40,
  shopNego: 20,
  shirtCharisma: 60, // professional shirt / going-out clothes
  promoCharisma: 80,
  refuseDiscipline: 40,
  refuseReputation: 10,
  dealNego: 40,
  dealReputation: 20,
  sellNego: 40,
  paydayDiscipline: 20, // positive payday with no loan
  repayDiscipline: 60,
  repayReputation: 40,
  giveReputation: 40,
  loyalFriendReputation: 20, // per own turn and per friend at loyalty 4
  metroLuckPerLife: 20,
  metroHappiness: 40,
  minigameCreativity: 30,
};

/* ------------------------------------------------------------------ affinity */

/** Affinity XP per circle activity kind (friend sheet), and for "Like" after it. */
export const AFFINITY_XP = { party: 180, movies: 120, gift: 150, mission: 135, stocks: 105, shop: 105, like: 60 };
/** Old saves without affinity: seed = likes × perLike + loyalty × perLoyalty. */
export const AFFINITY_SEED = { perLike: 60, perLoyalty: 30 };

/* ------------------------------------------------------------------ goods and shops (proposals) */

export type GoodsCategory = "wardrobe" | "garage" | "homes" | "other";

export type Unlock =
  | { kind: "start" }
  | { kind: "turn"; n: number } // the player's own turns
  | { kind: "passive"; n: number } // passive income $/mo
  | { kind: "level"; n: 2 } // table level (2 = Gate crossed, level 2 started)
  | { kind: "xp"; n: number }; // HUD experience level

export interface GoodDef {
  id: string;
  name: string;
  note: string;
  cat: GoodsCategory;
  icon: string;
  price: number;
  /** Monthly expense change (negative = saves money each month). */
  monthly?: number;
  /** Passive income $/mo (an asset on the ledger). */
  passive?: number;
  /** Skill XP and gauge points on purchase. */
  xp?: Partial<Record<"content" | "social" | "mind" | "luck" | "health" | "discipline" | "nego" | "charisma" | "creativity" | "reputation", number>>;
  gauge?: Partial<Record<"content" | "social" | "mind" | "luck" | "health", number>>;
  /** Can be bought again (books). */
  repeat?: boolean;
}

/** New goods (mockup proposals). Clothes and home items stay in life.ts / shop.ts and keep their rules. */
export const GOODS: GoodDef[] = [
  { id: "bike", name: "City bike", note: "Transport −$40/mo", cat: "garage", icon: "bike", price: 300, monthly: -40, xp: { health: 60 } },
  { id: "scooter", name: "50 cc scooter", note: "Transport −$80/mo", cat: "garage", icon: "scooter", price: 1200, monthly: -80 },
  { id: "kei", name: "Kei car", note: "Transport −$120/mo · Reputation", cat: "garage", icon: "car", price: 6000, monthly: -120, xp: { reputation: 150 } },
  { id: "duplex", name: "Duplex in Nakano", note: "Rent received +$900/mo", cat: "homes", icon: "house", price: 24000, passive: 900 },
  { id: "book", name: "A finance book", note: "Intelligence +120 XP", cat: "other", icon: "book", price: 80, xp: { mind: 120 }, repeat: true },
  { id: "gym", name: "Gym membership", note: "Health +15 · $40/mo", cat: "other", icon: "gym", price: 200, monthly: 40, gauge: { health: 15 }, xp: { health: 150 } },
  { id: "canvas", name: "Signed canvas", note: "Creativity +200 XP · Reputation", cat: "other", icon: "frame", price: 2500, xp: { creativity: 200, reputation: 60 } },
  { id: "atelier", name: "Studio corner", note: "Creativity +150 XP", cat: "other", icon: "brush", price: 1500, xp: { creativity: 150 } },
];

/** Locked silhouettes announcing future content (shown as "???" with their condition). */
export const SOON_GOODS: { id: string; cat: GoodsCategory; icon: string; when: string }[] = [
  { id: "yukata", cat: "wardrobe", icon: "dress", when: "Coming in an update" },
  { id: "foodtruck", cat: "garage", icon: "car", when: "Coming in an update" },
  { id: "mystery", cat: "other", icon: "question", when: "Coming in an update" },
];

export interface ShopDef {
  id: string;
  name: string;
  icon: string;
  color: string;
  unlock: Unlock;
  /** What it sells: clothes (life.ts OUTFITS), the home shop (shop.ts), or GOODS ids. */
  sells: "clothes" | "home" | string[];
}

/** Shops open with progression; a closed shop shows its condition. */
export const SHOPS: ShopDef[] = [
  { id: "clothes", name: "Clothes shop", icon: "shirt", color: "var(--coral)", unlock: { kind: "start" }, sells: "clothes" },
  { id: "kiosk", name: "Books & gym", icon: "book", color: "var(--lilac-tint)", unlock: { kind: "start" }, sells: ["book", "gym"] },
  { id: "bikes", name: "Bike workshop", icon: "bike", color: "var(--mint)", unlock: { kind: "turn", n: 10 }, sells: ["bike", "scooter"] },
  { id: "home", name: "Home shop", icon: "lamp", color: "var(--gold)", unlock: { kind: "level", n: 2 }, sells: "home" },
  { id: "cars", name: "Car dealer", icon: "car", color: "var(--sky)", unlock: { kind: "passive", n: 2000 }, sells: ["kei"] },
  { id: "estate", name: "Estate agency", icon: "house", color: "var(--lilac)", unlock: { kind: "turn", n: 20 }, sells: ["duplex"] },
  { id: "gallery", name: "Art gallery", icon: "frame", color: "var(--cream-2)", unlock: { kind: "xp", n: 10 }, sells: ["canvas", "atelier"] },
];

/* ------------------------------------------------------------------ mini-games */

export const MINIGAMES = [
  { id: "metro", name: "Metro run", note: "Every 10 turns · $250 to $500" },
  { id: "quiz", name: "Class quiz", note: "3 questions · up to $450" },
  { id: "soon1", soon: true },
  { id: "soon2", soon: true },
] as const;
