/**
 * GameFlow v3 — the 10 skills (SKILLS.md). Pure helpers on a Player-like shape; every number lives in tuning.ts.
 *
 * Two layers per skill:
 * - the gauge (vitals, 0-100) = how the player feels today; it drifts every turn (only 5 skills have one);
 * - the level (XP without a cap) = what the player has learnt; it never goes down. The level is computed, never stored.
 */
import { levelState } from "./format-compact";
import { CURVES, SKILL_RULES } from "./tuning";

export const SKILL_IDS = ["content", "social", "mind", "luck", "health", "discipline", "nego", "charisma", "creativity", "reputation"] as const;
export type SkillId = (typeof SKILL_IDS)[number];
export type Skills = Partial<Record<SkillId, number>>;
/** Skills that also have a 0-100 gauge (Player.vitals). */
export const GAUGE_SKILLS = ["content", "social", "mind", "luck", "health"] as const;
export type GaugeId = (typeof GAUGE_SKILLS)[number];

/** English source names (i18n keys). "Luck" shows as « Chance » in French: one key, change it in i18n.ts only. */
export const SKILL_NAMES: Record<SkillId, string> = {
  content: "Happiness",
  social: "Social",
  mind: "Intelligence",
  luck: "Luck",
  health: "Health",
  discipline: "Discipline",
  nego: "Negotiation",
  charisma: "Charisma",
  creativity: "Creativity",
  reputation: "Reputation",
};

export function isSkill(id: unknown): id is SkillId {
  return typeof id === "string" && (SKILL_IDS as readonly string[]).includes(id);
}

interface HasSkills {
  skills?: Skills;
}

export function skillXp(p: HasSkills, id: SkillId): number {
  const x = p.skills?.[id];
  return typeof x === "number" && Number.isFinite(x) && x > 0 ? x : 0;
}

export function skillLevel(p: HasSkills, id: SkillId): number {
  return levelState(skillXp(p, id), CURVES.skill).level;
}

/** Adds XP (never negative, never NaN). Returns the same object when nothing is gained. */
export function gainSkill<P extends HasSkills>(p: P, id: SkillId, xp: number): P {
  if (!(xp > 0) || !Number.isFinite(xp)) return p;
  return { ...p, skills: { ...p.skills, [id]: skillXp(p, id) + Math.round(xp) } };
}

export function gainSkills<P extends HasSkills>(p: P, gains: Skills): P {
  let n = p;
  for (const id of SKILL_IDS) n = gainSkill(n, id, gains[id] ?? 0);
  return n;
}

/** Experience (HUD level): the sum of every skill's XP, on its own curve. */
export function experienceXp(p: HasSkills): number {
  return SKILL_IDS.reduce((n, id) => n + skillXp(p, id), 0);
}

export function experienceLevel(p: HasSkills): number {
  return levelState(experienceXp(p), CURVES.xp).level;
}

/** Clean skills from a save; seeds the 4 historic skills from their gauges when the save has none. */
export function hydrateSkills(raw: unknown, gauges: Partial<Record<GaugeId, number>>): Skills {
  const out: Skills = {};
  if (raw && typeof raw === "object") {
    for (const id of SKILL_IDS) {
      const v = (raw as Record<string, unknown>)[id];
      if (typeof v === "number" && Number.isFinite(v) && v > 0) out[id] = Math.floor(v);
    }
    return out;
  }
  for (const id of ["content", "social", "mind", "luck"] as const) {
    const g = gauges[id];
    if (typeof g === "number" && g > 0) out[id] = Math.round(g * SKILL_RULES.seedFromGauge);
  }
  return out;
}

/* ------------------------------------------------------------------ effect formulas (SKILLS.md) */

/** palier(niv, pas, max) = min(max, pas × (niv − 1)). */
export function tier(level: number, step: number, max: number): number {
  return Math.min(max, step * Math.max(0, level - 1));
}

const on = () => SKILL_RULES.effects;

/** Friend slots: 3 to 7 with Social. Without effects, the historic 5. */
export function maxFriends(p: HasSkills, historic = 5): number {
  if (!on()) return historic;
  const r = SKILL_RULES.social;
  return r.slotsBase + Math.min(r.slotsMaxExtra, Math.floor(skillLevel(p, "social") / 2));
}

/** Loyalty step (+1, or +2 from Social Lv. 6). */
export function loyaltyStep(p: HasSkills): number {
  return on() && skillLevel(p, "social") >= SKILL_RULES.social.fasterAffinityAt ? 2 : 1;
}

export function negoDiscount(p: HasSkills): number {
  if (!on()) return 0;
  const t = SKILL_RULES.nego.discount;
  return t[Math.min(t.length - 1, skillLevel(p, "nego") - 1)] ?? 0;
}

export function resaleBonus(p: HasSkills): number {
  return on() ? tier(skillLevel(p, "nego"), SKILL_RULES.nego.resaleStep, SKILL_RULES.nego.resaleMax) : 0;
}

export function crashCut(p: HasSkills): number {
  return on() ? tier(skillLevel(p, "luck"), SKILL_RULES.luck.crashStep, SKILL_RULES.luck.crashMax) : 0;
}

export function quietDealChance(p: HasSkills): number {
  return on() ? tier(skillLevel(p, "luck"), SKILL_RULES.luck.quietDealStep, SKILL_RULES.luck.quietDealMax) : 0;
}

export function skipLifestyleChance(p: HasSkills): number {
  return on() ? tier(skillLevel(p, "discipline"), SKILL_RULES.discipline.skipLifestyleStep, SKILL_RULES.discipline.skipLifestyleMax) : 0;
}

/** Happiness gauge lost when refusing a lifestyle card (0 from Discipline Lv. 7). */
export function refuseMoodCost(p: HasSkills): number {
  if (!on()) return 0;
  const m = SKILL_RULES.discipline.refuseMood;
  return m - Math.min(m, skillLevel(p, "discipline") - 1);
}

export function promoCopies(p: HasSkills): number {
  return on() ? Math.min(SKILL_RULES.charisma.promoMax, Math.floor((skillLevel(p, "charisma") - 1) / 2)) : 0;
}

export function mentorBonus(p: HasSkills): number {
  return on() ? tier(skillLevel(p, "reputation"), SKILL_RULES.reputation.mentorStep, SKILL_RULES.reputation.mentorMax) : 0;
}

/** Unlock conditions × (1 − this). */
export function unlockCut(p: HasSkills): number {
  return on() ? tier(skillLevel(p, "reputation"), SKILL_RULES.reputation.unlockStep, SKILL_RULES.reputation.unlockMax) : 0;
}

/** Re-roll chance once per turn when the Happiness gauge is high, else 0. */
export function rerollChance(p: HasSkills & { vitals?: { content?: number } }): number {
  const r = SKILL_RULES.happiness;
  if (!on() || (p.vitals?.content ?? 0) <= r.highAbove) return 0;
  return Math.min(r.rerollMax, r.rerollBase + r.rerollStep * (skillLevel(p, "content") - 1));
}

/** Lifestyle cost factor from a low mood: 1.1 under 30, else 1. */
export function lowMoodFactor(p: { vitals?: { content?: number } }): number {
  const r = SKILL_RULES.happiness;
  return on() && (p.vitals?.content ?? 100) < r.lowBelow ? 1 + r.lowPct : 1;
}

/** Salary bonus (share) from a high Health gauge. */
export function healthSalaryPct(p: HasSkills & { vitals?: { health?: number } }): number {
  const r = SKILL_RULES.health;
  if (!on() || (p.vitals?.health ?? 0) <= r.highAbove) return 0;
  return Math.min(r.salaryMaxPct, r.salaryStepPct * skillLevel(p, "health"));
}

export function lowHealth(p: { vitals?: { health?: number } }): boolean {
  return on() && (p.vitals?.health ?? 100) < SKILL_RULES.health.lowBelow;
}

export type GigId = (typeof SKILL_RULES.creativity.gigs)[number]["id"];

/** Monthly creative side income for the gigs the player has switched on. */
export function gigIncome(p: HasSkills & { sideGigs?: { id: string }[] }): number {
  if (!on() || !p.sideGigs?.length) return 0;
  const r = SKILL_RULES.creativity;
  const base = r.gigs.filter((g) => p.sideGigs!.some((x) => x.id === g.id)).reduce((n, g) => n + g.monthly, 0);
  const last = r.gigs[r.gigs.length - 1]!.at;
  const over = Math.max(0, skillLevel(p, "creativity") - last);
  return Math.round(base * (1 + Math.min(r.maxPct, r.stepPct * over)));
}

/** Gigs whose level is reached but not switched on yet. */
export function dueGigs(p: HasSkills & { sideGigs?: { id: string }[] }): GigId[] {
  if (!on()) return [];
  const lv = skillLevel(p, "creativity");
  return SKILL_RULES.creativity.gigs.filter((g) => lv >= g.at && !p.sideGigs?.some((x) => x.id === g.id)).map((g) => g.id);
}

/** Class quiz cash for `correct` answers, with the Intelligence bonus. */
export function quizReward(p: HasSkills, correct: number, perCorrect: number, stepPct: number, maxPct: number): number {
  const bonus = on() ? tier(skillLevel(p, "mind"), stepPct, maxPct) : 0;
  return Math.round(Math.max(0, Math.floor(correct)) * perCorrect * (1 + bonus));
}

/** Percent text for chips: 0.1 → "10 %"-style number (rounded to 1 decimal). */
export function pct(x: number): number {
  return Math.round(x * 1000) / 10;
}
