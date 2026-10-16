/**
 * Scene contract (refacto batch 7, PLAN.md §3 "Modèle décors, scènes et boutiques").
 *
 * A scene is a place the player can visit (the school, later the home, the garage...): data only, no React. It
 * hosts mini-games, shops or engine actions through hotspots. Batch 7 only registers "ecole" (it hosts the class
 * quiz, which Activités › Mini-games keeps showing exactly as before); every other scene is declared locked and is
 * never shown. Type imports only, so the engine can read scenes later without a runtime cycle.
 */
import type { Action } from "@/game/engine";
import type { Unlock } from "@/game/tuning";

/** Stable id, may be stored in saves later (current scene). Never rename one. */
export type SceneId = string;

/** What a hotspot opens. */
export type HotspotTarget =
  | { minigame: string } // src/minigames/registry.ts id
  | { shop: string } // src/game/articles.ts SHOP_DEFINITIONS id
  | { action: Action }; // a plain engine action

export interface SceneHotspot {
  id: string;
  /** English text key. */
  label: string;
  target: HotspotTarget;
}

/**
 * "open": usable (subject to `unlock`). "locked": declared for the roadmap, never shown and never entered.
 * Batch 7: only "ecole" is open.
 */
export type SceneStatus = "open" | "locked";

export interface SceneDefinition {
  id: SceneId;
  /** English text key. */
  name: string;
  icon: string;
  status: SceneStatus;
  unlock: Unlock;
  /**
   * Background image, always written as a "/game/…" string literal (Pages base plugin + rebaseAssets, PC-3).
   * Optional: the school has no painted background yet.
   */
  background?: string;
  ambience?: { music?: string; palette?: string };
  hotspots: SceneHotspot[];
  /** Shops reachable from the scene (SHOP_DEFINITIONS ids). */
  shops?: string[];
  /**
   * Home project (home-plan/DOSSIER.md §9), unused for now: the dwelling type a home scene renders ("appart-2ldk").
   */
  homeType?: string;
}
