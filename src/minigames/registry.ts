/**
 * Mini-game registry (PLAN.md §2). Batch 3: the metro run is registered and GameFlow renders its UI through
 * MinigameHost (lazy chunk). Batch 4: the class quiz too, and Activités lists
 * MINIGAME_REGISTRY + MINIGAME_SOON. Batch 5: the engine reads it (MINIGAME action). Display order = array order.
 * Runtime imports must stay engine-free (engine.ts imports this module).
 */
import { METRO_MINIGAME } from "./metro";
import { QUIZ_MINIGAME } from "./quiz";
import type { MinigameDefinition, MinigameId, MinigameSoon } from "./types";

export type AnyMinigame = MinigameDefinition<any>;

export const MINIGAME_REGISTRY: readonly AnyMinigame[] = [METRO_MINIGAME, QUIZ_MINIGAME];

/** Activités slots still to come. */
export const MINIGAME_SOON: readonly MinigameSoon[] = [
  { id: "soon1", soon: true },
  { id: "soon2", soon: true },
];

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
