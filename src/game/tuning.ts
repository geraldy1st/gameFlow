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
  /** Questions per quiz (Geraldy, 11/10). */
  questions: 5,
  /** Cash: all correct → perfect; 1 to (questions − 1) correct → partial; 0 correct → zero (no cash, no skill points). */
  perfectReward: 500,
  partialReward: 250,
  zeroReward: 0,
  /** Intelligence XP bonus on quiz.* skill points (SKILLS.md §12): +stepPct per level above 1, capped at +maxPct. XP only, never cash. */
  mindStepPct: 0.05,
  mindMaxPct: 0.5,
  /** Seconds per question. */
  seconds: 20,
  /** Once per this many of the player's own turns (SKILLS.md §12: "once per turn at most"; 0 = any time). */
  everyTurns: 1,
  /** SKILLS.md §11.2: creative bonus question from this Creativity level; cash for the best / another answer; Creativity XP. Never counts in the perfect score. */
  creativeAt: 5,
  creativeBest: 100,
  creativeOk: 50,
  creativeXp: 60,
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
    /** Geraldy (11/10): creative side incomes count as passive income, and so toward opening the Gate. */
    countsTowardGate: true,
    /** SKILLS.md §11.6: each finished mini-game with Creativity ≥ minigameAt adds +minigameStep $/mo to "online content", capped. */
    minigameAt: 6,
    minigameStep: 5,
    minigameMax: 100,
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
};

/**
 * SKILLS.md §12 — skill points for mini-games and activities, ONE editable table (quiz decided by Geraldy, the rest
 * delegated). Keys: SkillId ("content" = Happiness / Bonheur, "mind" = Intelligence, "nego" = Negotiation).
 * Rules: no negative points; the same activity again in the same own turn gives ANTI_FARM[n] of the points.
 */
export const SKILL_REWARDS: Record<string, Partial<Record<"content" | "social" | "mind" | "luck" | "health" | "discipline" | "nego" | "charisma" | "creativity" | "reputation", number>>> = {
  "quiz.complete": { nego: 200, content: 150, mind: 100, luck: 100, charisma: 100, discipline: 100, reputation: 50, health: 10, creativity: 10, social: 10 },
  "runner.finish": { health: 60, luck: 50, content: 40, discipline: 20 },
  "runner.win": { luck: 40, content: 40, discipline: 30 },
  "runner.perLife": { health: 15, luck: 10 },
  "runner.spot": { creativity: 30, reputation: 10 },
  "runner.noHit": { discipline: 40 },
  "circle.party": { social: 80, content: 70, charisma: 50 },
  "circle.movies": { content: 60, social: 40, creativity: 30 },
  "circle.gift": { social: 60, reputation: 30, charisma: 20 },
  "circle.mission": { mind: 70, discipline: 50, reputation: 40 },
  "circle.stocks": { mind: 60, luck: 50, nego: 40 },
  "circle.shop": { nego: 70, luck: 30, social: 30 },
  "circle.partner": { content: 20 },
  "life.birthday": { social: 160, content: 140 },
  "life.museum": { mind: 140, creativity: 40 },
  "life.sleep": { health: 100, content: 40 },
};
/** circle.bonusAffinity: × (1 + step × min(maxSteps, affinity level − 1)) → up to × 1.5. */
export const CIRCLE_AFFINITY_BONUS = { step: 0.1, maxSteps: 5 };
/** Anti-farm: 1st time in an own turn 100 %, then 50 %, 25 %, then 0. */
export const ANTI_FARM = [1, 0.5, 0.25, 0];

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

/** Day › Goods categories, data-driven: add an entry here (and items with that `cat`) and the tab shows it. */
export const GOODS_CATEGORIES: { id: GoodsCategory; name: string; icon: string }[] = [
  { id: "wardrobe", name: "Wardrobe", icon: "shirt" },
  { id: "garage", name: "Garage", icon: "car" },
  { id: "homes", name: "Homes", icon: "house" },
  { id: "other", name: "Other", icon: "gem" },
];

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
