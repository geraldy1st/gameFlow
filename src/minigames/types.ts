/**
 * Mini-game plugin contract (PLAN.md §2, batch 1). Not wired yet: nothing in the game imports this module.
 *
 * A mini-game is pure data + pure functions for the engine (offer rule, result check, cash, skill points, journal
 * line) and one lazily loaded React component for the UI, so each mini-game becomes its own Vite chunk.
 * Only type imports from the engine, so engine modules can later import the registry without a runtime cycle.
 */
import type { ComponentType } from "react";
import type { GameState, Player } from "@/game/engine";
import type { SKILL_REWARDS } from "@/game/tuning";

/** Stable id, stored in saves (Player.minigames, journal). Never rename one. */
export type MinigameId = string;

/** "offer": modal the game proposes when due (metro run). "menu": played from Activités when open (class quiz). */
export type MinigameEntry = "offer" | "menu";

/** One SKILL_REWARDS line to award: `key` must exist in tuning.ts SKILL_REWARDS. */
export interface SkillAward {
  key: keyof typeof SKILL_REWARDS & string;
  /** How many times the line is given (runner.perLife × lives). Default 1. */
  times?: number;
  /** Multiplier bonus on top of 1 (quiz Intelligence bonus). Default 0. */
  bonus?: number;
}

/** What the UI hands back to the host when the player finishes. */
export interface MinigameUiProps<R> {
  state: GameState;
  player: Player;
  lang: "en" | "fr" | "es";
  t: (text: string, vars?: Record<string, string | number>) => string;
  /** Finished: the engine validates `result` with `sanitize` before any reward. */
  onDone: (result: R) => void;
  /** Closed without a result (declined, abandoned). */
  onClose: () => void;
}

export interface MinigameDefinition<R = unknown> {
  id: MinigameId;
  /** English text keys, translated through i18n like every engine text. */
  name: string;
  note: string;
  icon: string;
  entry: MinigameEntry;
  /** Whether the game is offered / playable for `p` now (replaces metroOfferTurn / quizOpen). Pure. */
  isDue: (s: GameState, p: Player) => boolean;
  /** Own turns left before it opens again (0 = open). Optional: "Bientôt dans N tours". */
  waitTurns?: (p: Player) => number;
  /** Turn the result from the UI (untrusted) into a valid result, clamped. Pure. */
  sanitize: (raw: unknown, p: Player) => R;
  /** Cash for a result (tuning.ts holds the amounts). Pure, deterministic. */
  cash: (result: R, p: Player) => number;
  /** SKILL_REWARDS lines for a result. */
  skillKeys: (result: R, p: Player) => SkillAward[];
  /** Journal line (stored as a text key via tl()). "decline" for a refused offer. */
  logLine: (result: R | "decline", cash: number) => string;
  /** A finished run feeds the Creativity "online content" gig (SKILLS.md §11.6). */
  feedsGig?: boolean;
  /** The UI, loaded on demand (`() => import("./ui")`). Optional until batch 5 moves every game to MinigameUiProps. */
  load?: () => Promise<{ default: ComponentType<MinigameUiProps<R>> }>;
  /**
   * Transitional (batches 3–4): named UI pieces with their own props, each loaded on demand from the game's chunk
   * (metro: "offer" and "run"). MinigameHost renders them. Replaced by `load` in batch 5.
   */
  parts?: Record<string, () => Promise<ComponentType<any>>>;
}

/** Placeholder card in Activités ("Bientôt"). */
export interface MinigameSoon {
  id: MinigameId;
  soon: true;
}
