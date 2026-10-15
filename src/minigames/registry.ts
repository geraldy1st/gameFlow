/**
 * Mini-game registry (PLAN.md §2, batch 1). Empty and not wired yet: batches 3–5 move the metro run and the class
 * quiz here and make GameFlow / Hub / the engine read it. Display order = array order.
 */
import type { MinigameDefinition, MinigameId, MinigameSoon } from "./types";

export type AnyMinigame = MinigameDefinition<any>;

export const MINIGAME_REGISTRY: readonly AnyMinigame[] = [];

/** Activités slots still to come. */
export const MINIGAME_SOON: readonly MinigameSoon[] = [];

export function minigameById(id: MinigameId, list: readonly AnyMinigame[] = MINIGAME_REGISTRY): AnyMinigame | undefined {
  return list.find((m) => m.id === id);
}

/** Ids must be unique and non-empty: checked by registry.test.ts on every list. */
export function registryErrors(list: readonly { id: MinigameId }[]): string[] {
  const seen = new Set<string>();
  const errors: string[] = [];
  for (const m of list) {
    if (!m.id || !/^[a-z][a-z0-9-]*$/.test(m.id)) errors.push(`invalid id "${m.id}"`);
    else if (seen.has(m.id)) errors.push(`duplicate id "${m.id}"`);
    seen.add(m.id);
  }
  return errors;
}
