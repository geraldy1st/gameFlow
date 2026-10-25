import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "./webp-manifest.json";
import { WEBP_VARIANTS, attachWebpFallback, fromWebp, toWebp, webpFallbackElement } from "./webp";

const sample = (manifest as string[])[0]!;
const root = resolve(__dirname, "../../../public/game");

describe("toWebp (QA RES-1)", () => {
  it("has the 120 generated variants", () => {
    expect(WEBP_VARIANTS).toBe(120);
  });
  it("derives a .webp only for manifest entries, with any base", () => {
    expect(toWebp(`/game/${sample}`)).toBe(`/game/${sample.replace(/\.jpg$/, ".webp")}`);
    expect(toWebp(`/gameFlow/game/${sample}`)).toBe(`/gameFlow/game/${sample.replace(/\.jpg$/, ".webp")}`);
  });
  it("leaves every other URL unchanged", () => {
    for (const u of [
      "/game/art/not-in-manifest.jpg",
      `/game/${sample.replace(/\.jpg$/, ".JPG")}`,
      `/game/${sample}?v=2`,
      `/game/${sample}#x`,
      `https://example.com/game/${sample}`,
      `http://example.com/game/${sample}`,
      "data:image/jpeg;base64,AAAA",
      "blob:https://x/123",
      "/game/quiz/a.webp",
      "/game/tokens/a.png",
      "",
    ]) expect(toWebp(u)).toBe(u);
    expect(toWebp(undefined)).toBe("");
  });
  it("fromWebp is the inverse for variants only", () => {
    expect(fromWebp(toWebp(`/gameFlow/game/${sample}`))).toBe(`/gameFlow/game/${sample}`);
    expect(fromWebp("/game/quiz/a.webp")).toBe("/game/quiz/a.webp");
  });
  it("every manifest entry has its .webp and its .jpg on disk (0 404)", () => {
    for (const r of manifest as string[]) {
      expect(existsSync(`${root}/${r}`), r).toBe(true);
      expect(existsSync(`${root}/${r.replace(/\.jpg$/, ".webp")}`), r).toBe(true);
    }
  });
});

/** Minimal Element stub (vitest runs in node, no DOM). */
function fakeEl(tag: string, attrs: Record<string, string>) {
  const a = { ...attrs };
  const listeners: Record<string, () => void> = {};
  return {
    tagName: tag.toUpperCase(),
    hasAttribute: (k: string) => k in a,
    getAttribute: (k: string) => a[k] ?? null,
    setAttribute: (k: string, v: string) => { a[k] = v; },
    addEventListener: (k: string, f: () => void) => { listeners[k] = f; },
    fire: (k: string) => listeners[k]?.(),
    attrs: a,
  };
}

describe("WebP -> JPEG fallback (DEF-PERF-01)", () => {
  const webp = toWebp(`/gameFlow/game/${sample}`);
  const jpg = `/gameFlow/game/${sample}`;
  it("swaps <img src> once, then lets callers chain", () => {
    const img = fakeEl("img", { src: webp });
    expect(webpFallbackElement(img as unknown as Element)).toBe(true);
    expect(img.attrs.src).toBe(jpg);
    expect(webpFallbackElement(img as unknown as Element)).toBe(false);
  });
  it("swaps SVG <image href> (board pawn portrait)", () => {
    const image = fakeEl("image", { href: webp });
    expect(webpFallbackElement(image as unknown as Element)).toBe(true);
    expect(image.attrs.href).toBe(jpg);
  });
  it("wires imperatively built <img> (FriendScene tokens)", () => {
    const img = fakeEl("img", { src: webp });
    attachWebpFallback({ querySelectorAll: () => [img] } as unknown as ParentNode);
    img.fire("error");
    expect(img.attrs.src).toBe(jpg);
  });
  it("leaves non-variants untouched", () => {
    const img = fakeEl("img", { src: "/gameFlow/game/none.png" });
    expect(webpFallbackElement(img as unknown as Element)).toBe(false);
  });
});
