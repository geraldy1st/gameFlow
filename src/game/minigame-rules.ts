/**
 * Mini-game rules shared by the engine and the mini-game definitions (refacto batch 5).
 *
 * Leaf module: only type imports from engine.ts, so src/minigames/* can use these helpers and engine.ts can read the
 * registry without a runtime import cycle (quiz/index.ts used to import engine.ts). engine.ts re-exports the public
 * ones under their old names.
 */
import type { Player } from "./engine";
import { skillLevel } from "./skills";
import { CLASS_QUIZ, SKILL_RULES } from "./tuning";

/** DEF-TUT-10/11/12: true for a tutorial (throw-away) game, during and after its scripted turns. */
export function isPractice(s: { practice?: unknown }): boolean {
  return s.practice === true;
}

/** SKILLS.md §11.2: the creative bonus question shows from Creativity CLASS_QUIZ.creativeAt. */
export function creativeOpen(p: Player): boolean {
  return SKILL_RULES.effects && skillLevel(p, "creativity") >= CLASS_QUIZ.creativeAt;
}

/** SKILLS.md §11.6: a finished mini-game with high Creativity feeds the "online content" side income (counts for the Gate). */
export function minigameGig(p: Player): Player {
  const r = SKILL_RULES.creativity;
  if (!SKILL_RULES.effects || skillLevel(p, "creativity") < r.minigameAt) return p;
  return { ...p, gigBonus: Math.min(r.minigameMax, (p.gigBonus ?? 0) + r.minigameStep) };
}

/** The quiz can be played once every CLASS_QUIZ.everyTurns own turns. */
export function quizOpen(p: Player): boolean {
  if (CLASS_QUIZ.everyTurns <= 0 || typeof p.quizTurn !== "number") return true;
  return p.turns - p.quizTurn >= CLASS_QUIZ.everyTurns;
}

/** Own turns left before the quiz opens again (0 = open). */
export function quizWait(p: Player): number {
  if (quizOpen(p)) return 0;
  return CLASS_QUIZ.everyTurns - (p.turns - (p.quizTurn ?? 0));
}

/** Engine money() format, duplicated here so definitions need no runtime engine import. */
export function moneyText(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}
