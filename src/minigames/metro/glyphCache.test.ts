import { afterEach, describe, expect, it, vi } from "vitest";
import { GLYPH_CACHE_MAX, cachedText, clearGlyphCache, glyphCacheSize } from "./glyphCache";

function fakeCtx(fill: unknown = "#123456") {
  return { fillStyle: fill, font: "", textAlign: "", textBaseline: "", fillText: vi.fn(), drawImage: vi.fn() } as unknown as CanvasRenderingContext2D & { fillText: ReturnType<typeof vi.fn>; drawImage: ReturnType<typeof vi.fn> };
}

afterEach(() => clearGlyphCache());

describe("glyphCache", () => {
  it("falls back to fillText with the same font contract when no canvas exists (node)", () => {
    const c = fakeCtx();
    cachedText(c, "駅", "700", "JP", 12, 5, 6);
    expect(c.fillText).toHaveBeenCalledWith("駅", 5, 6);
    expect(c.font).toBe("700 12px JP");
    expect(c.textAlign).toBe("center");
    expect(c.textBaseline).toBe("middle");
  });

  it("never caches a non-string fill (gradient/pattern)", () => {
    const c = fakeCtx({});
    cachedText(c, "M", "700", "F", 10, 0, 0);
    expect(glyphCacheSize()).toBe(0);
    expect(c.fillText).toHaveBeenCalled();
  });

  it("stays bounded and is released by clearGlyphCache", () => {
    const c = fakeCtx();
    for (let i = 0; i < GLYPH_CACHE_MAX * 3; i++) cachedText(c, `t${i}`, "700", "F", 10, 0, 0);
    expect(glyphCacheSize()).toBeLessThanOrEqual(GLYPH_CACHE_MAX);
    clearGlyphCache();
    expect(glyphCacheSize()).toBe(0);
  });
});
