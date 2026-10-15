/**
 * Class quiz definition (refacto batch 4). The engine still handles the QUIZ action itself (doQuiz, awardXp):
 * these functions mirror it so batch 5 can switch the engine to the registry with an identical fingerprint.
 * The UI and the questions (with their fr/es texts) are code-split: they load when the quiz opens.
 * Note for batch 5: this module imports engine.ts at runtime (quizOpen, quizWait, creativeOpen, isPractice); when the
 * engine reads the registry, those helpers move here (or to a leaf module) to avoid an import cycle.
 */
import { creativeOpen, isPractice, quizOpen, quizWait } from "@/game/engine";
import { quizCash, quizXpBonus } from "@/game/skills";
import { tl } from "@/game/text";
import { CLASS_QUIZ } from "@/game/tuning";
import type { MinigameDefinition } from "../types";

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
  skillKeys: (r, p) => (r.correct > 0 ? [{ key: "quiz.complete", bonus: quizXpBonus(p) }] : []),
  logLine: (r, cash) =>
    r === "decline"
      ? ""
      : tl("Class quiz: {n}/{m}, +{amount}", { n: String(r.correct), m: String(CLASS_QUIZ.questions), amount: `$${Math.round(cash).toLocaleString("en-US")}` }),
  feedsGig: true,
  parts: {
    play: () => ui().then((m) => m.ClassQuiz),
  },
};
