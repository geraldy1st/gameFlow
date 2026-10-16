import { minigameById } from "./registry";

/** Start downloading a mini-game UI piece early (e.g. as soon as an offer is due). Errors are left to MinigameHost. */
export function preloadMinigame(id: string, part: string): void {
  minigameById(id)?.parts?.[part]?.().catch(() => {});
}
