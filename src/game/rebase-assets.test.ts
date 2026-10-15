import { afterEach, describe, expect, it, vi } from "vitest";
import { createMatch, hydrate, rebaseAssetPath, rebaseAssets, type GameState } from "./engine";
import dealCard from "./__tests__/pc3-deal-card.fixture.json";
import friendCard from "./__tests__/pc3-friend-card.fixture.json";

const clone = <T>(o: T): T => JSON.parse(JSON.stringify(o)) as T;
const PAGES = "/gameFlow/";
const ROOT_ART = ["", "game", "art", "market.jpg"].join("/"); // built so the Pages build plugin leaves it alone

describe("PC-3: stored image paths follow the current base", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("rewrites a root path onto the Pages base, and back", () => {
    expect(rebaseAssetPath(ROOT_ART, PAGES)).toBe("/gameFlow/game/art/market.jpg");
    expect(rebaseAssetPath("/gameFlow/game/portraits/noa.jpg", "/")).toBe("/game/portraits/noa.jpg");
    expect(rebaseAssetPath("/gameFlow/game/portraits/noa.jpg", PAGES)).toBe("/gameFlow/game/portraits/noa.jpg");
  });

  it("is idempotent and leaves other strings alone", () => {
    const once = rebaseAssetPath(ROOT_ART, PAGES);
    expect(rebaseAssetPath(once, PAGES)).toBe(once);
    for (const s of ["Funds small runs.", "game/art/x.jpg", "https://x.y/game/art/x.jpg", "/a/b/game/art/x.jpg", "/game/other/x.jpg", "/game/art/"]) {
      expect(rebaseAssetPath(s, PAGES)).toBe(s);
    }
  });

  it("returns the same object when nothing changes", () => {
    const s = createMatch([{ characterId: "aoi", dreamId: "cafe" }], 42, true);
    const fresh = rebaseAssets(s, "/");
    expect(fresh).toBe(s);
  });

  it("hydrates the 04/10 deal and friend fixtures with Pages paths", () => {
    vi.stubEnv("BASE_URL", PAGES);
    const deal = hydrate(clone(dealCard) as unknown as GameState);
    expect(deal.card?.art).toBe("/gameFlow/game/art/market.jpg");
    const friend = hydrate(clone(friendCard) as unknown as GameState);
    expect(friend.card?.art).toBe("/gameFlow/game/art/friends.jpg");
    expect(friend.card?.portrait).toBe("/gameFlow/game/portraits/noa.jpg");
    expect(JSON.stringify(friend)).not.toMatch(/"\/game\//);
    // twice: no double prefix
    const again = hydrate(clone(friend));
    expect(again.card?.art).toBe("/gameFlow/game/art/friends.jpg");
    expect(again.card?.portrait).toBe("/gameFlow/game/portraits/noa.jpg");
  });

  it("keeps the fixture paths on the root host", () => {
    vi.stubEnv("BASE_URL", "/");
    const friend = hydrate(clone(friendCard) as unknown as GameState);
    expect(friend.card?.art).toBe(["", "game", "art", "friends.jpg"].join("/"));
  });
});
