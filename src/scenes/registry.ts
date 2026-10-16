/**
 * Scene registry (refacto batch 7). Display order = array order.
 * Runtime imports must stay engine-free (data only).
 */
import type { SceneDefinition, SceneId } from "./types";

export const SCENES: readonly SceneDefinition[] = [
  {
    id: "ecole",
    name: "School",
    icon: "quiz",
    status: "open",
    unlock: { kind: "start" },
    hotspots: [{ id: "class-quiz", label: "Class quiz", target: { minigame: "quiz" } }],
  },
  // Roadmap, locked and never shown (home project: DOSSIER.md §9, after batch 7). No asset, no rule yet.
  { id: "maison", name: "Home", icon: "house", status: "locked", unlock: { kind: "start" }, hotspots: [] },
  { id: "garage", name: "Garage", icon: "car", status: "locked", unlock: { kind: "start" }, hotspots: [] },
];

export function sceneById(id: SceneId, list: readonly SceneDefinition[] = SCENES): SceneDefinition | undefined {
  return list.find((s) => s.id === id);
}

/** Scenes the UI may show (status "open"); locked ones never appear. */
export function openScenes(list: readonly SceneDefinition[] = SCENES): SceneDefinition[] {
  return list.filter((s) => s.status === "open");
}

/** The open scene that hosts a mini-game through a hotspot, if any. */
export function sceneOfMinigame(minigameId: string, list: readonly SceneDefinition[] = SCENES): SceneDefinition | undefined {
  return openScenes(list).find((s) => s.hotspots.some((h) => "minigame" in h.target && h.target.minigame === minigameId));
}

/** Ids must be unique and well formed; hotspot ids unique per scene; backgrounds are "/game/…" paths. */
export function sceneErrors(list: readonly SceneDefinition[]): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const s of list) {
    if (!/^[a-z][a-z0-9-]*$/.test(s.id)) errors.push(`invalid scene id "${s.id}"`);
    else if (seen.has(s.id)) errors.push(`duplicate scene id "${s.id}"`);
    seen.add(s.id);
    const hs = new Set<string>();
    for (const h of s.hotspots) {
      if (hs.has(h.id)) errors.push(`${s.id}: duplicate hotspot "${h.id}"`);
      hs.add(h.id);
    }
    if (s.background !== undefined && !s.background.startsWith("/game/")) errors.push(`${s.id}: background must be a /game/ path`);
  }
  return errors;
}
