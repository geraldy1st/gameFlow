import { describe, expect, it } from "vitest";
import { SHOP_DEFINITIONS } from "@/game/articles";
import { MINIGAME_REGISTRY, minigameById } from "@/minigames/registry";
import { SCENES, openScenes, sceneById, sceneErrors, sceneOfMinigame } from "./registry";

describe("scene registry (batch 7)", () => {
  it("is valid", () => {
    expect(sceneErrors(SCENES)).toEqual([]);
    expect(sceneErrors([{ ...SCENES[0]!, background: "game/x.jpg" }, SCENES[0]!])).toEqual(["ecole: background must be a /game/ path", 'duplicate scene id "ecole"']);
  });
  it("only the school is open; it hosts the class quiz", () => {
    expect(openScenes().map((s) => s.id)).toEqual(["ecole"]);
    expect(sceneOfMinigame("quiz")?.id).toBe("ecole");
    expect(sceneOfMinigame("metro")).toBeUndefined();
    expect(sceneById("maison")?.status).toBe("locked");
  });
  it("hotspots point at registered mini-games and shops", () => {
    for (const s of SCENES) for (const h of s.hotspots) {
      if ("minigame" in h.target) expect(minigameById(h.target.minigame), `${s.id}/${h.id}`).toBeDefined();
      if ("shop" in h.target) expect(SHOP_DEFINITIONS.some((x) => "shop" in h.target && x.id === h.target.shop), `${s.id}/${h.id}`).toBe(true);
    }
    for (const s of SCENES) for (const id of s.shops ?? []) expect(SHOP_DEFINITIONS.some((x) => x.id === id)).toBe(true);
  });
  it("every menu mini-game is hosted by an open scene (Activités shows the same list as before)", () => {
    for (const g of MINIGAME_REGISTRY) if (g.entry === "menu") expect(sceneOfMinigame(g.id), g.id).toBeDefined();
  });
});
