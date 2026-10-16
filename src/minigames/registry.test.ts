import { describe, expect, it } from "vitest";
import { MINIGAME_REGISTRY, MINIGAME_SOON, minigameById, registryErrors, type AnyMinigame } from "./registry";

const fake = (id: string): AnyMinigame => ({
  id, name: "Fake", note: "", icon: "star", entry: "menu",
  isDue: () => true, sanitize: (r) => r, cash: () => 0, skillKeys: () => [], logLine: () => "", markerValue: () => 0,
  load: async () => ({ default: () => null }),
});

describe("mini-game registry (not wired yet)", () => {
  it("has valid unique ids", () => {
    expect(registryErrors([...MINIGAME_REGISTRY, ...MINIGAME_SOON])).toEqual([]);
  });
  it("finds by id", () => {
    const list = [fake("metro"), fake("quiz")];
    expect(minigameById("quiz", list)?.id).toBe("quiz");
    expect(minigameById("nope", list)).toBeUndefined();
  });
  it("reports duplicate and invalid ids", () => {
    expect(registryErrors([fake("a"), fake("a"), fake("Bad id")])).toEqual(['duplicate id "a"', 'invalid id "Bad id"']);
  });
});
