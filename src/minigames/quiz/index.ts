/**
 * Class quiz definition (refacto batch 4; batch 5: the engine plays it through the generic MINIGAME action, QUIZ is
 * an alias). Must stay bit-identical to the old doQuiz / awardXp branch (engine-fingerprint.test.ts).
 * The UI and the questions (with their fr/es texts) are code-split: they load when the quiz opens.
 * No runtime import of engine.ts (the helpers live in the leaf module minigame-rules.ts), so the engine can import
 * the registry without a cycle.
 */
import { creativeOpen, isPractice, moneyText, quizOpen, quizWait } from "@/game/minigame-rules";
import { quizCash, quizXpBonus } from "@/game/skills";
import { tl } from "@/game/text";
import { CLASS_QUIZ } from "@/game/tuning";
import type { MinigameDefinition, SkillAward } from "../types";

export interface QuizResult {
  correct: number;
  creative: number;
}

const ui = () => import("./ui");

export const QUIZ_MINIGAME: MinigameDefinition<QuizResult> = {
  id: "quiz",
  name: "Class quiz",
  note: "3 questions · up to $450",
  icon: "quiz",
  entry: "menu",
  isDue: (s, p) => s.phase === "idle" && quizOpen(p) && !s.training && !isPractice(s),
  waitTurns: (p) => quizWait(p),
  sanitize: (raw, p) => {
    const r = (typeof raw === "object" && raw !== null ? raw : {}) as { correct?: unknown; creative?: unknown };
    const total = CLASS_QUIZ.questions;
    const correct = Math.max(0, Math.min(total, Math.floor(Number(r.correct) || 0)));
    const creative = correct > 0 && creativeOpen(p) ? Math.max(0, Math.min(2, Math.floor(Number(r.creative) || 0))) : 0;
    return { correct, creative };
  },
  cash: (r) => quizCash(r.correct, CLASS_QUIZ.questions) + (r.creative === 2 ? CLASS_QUIZ.creativeBest : r.creative === 1 ? CLASS_QUIZ.creativeOk : 0),
  skillKeys: (r, p, raw) => {
    if (r.correct <= 0) return []; // Geraldy: 0 / 5 gives nothing at all.
    const out: SkillAward[] = [{ key: "quiz.complete", bonus: quizXpBonus(p) }];
    // As the QUIZ action always did: the raw `creative` answer (not the clamped one) opens the Creativity XP.
    const c = typeof raw === "object" && raw !== null ? (raw as { creative?: number }).creative : undefined;
    if (creativeOpen(p) && (c ?? 0) > 0) out.push({ skill: "creativity", xp: CLASS_QUIZ.creativeXp });
    return out;
  },
  logLine: (r, cash) =>
    r === "decline"
      ? ""
      : tl("Class quiz: {n}/{m}, +{amount}", { n: String(r.correct), m: String(CLASS_QUIZ.questions), amount: moneyText(cash) }),
  feedsGig: (r) => r.correct > 0,
  markerValue: (_s, p) => p.turns,
  legacyMarker: "quizTurn",
  blipAlways: true,
  parts: {
    play: () => ui().then((m) => m.ClassQuiz),
  },
};
