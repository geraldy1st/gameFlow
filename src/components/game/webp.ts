/**
 * perf-ios lot B: display-time WebP variant of a heavy JPEG.
 *
 * Game state, saves and data keep their `.jpg` paths (no migration, fingerprints untouched).
 * Only paths listed in the generated manifest (tools/webp-assets.py) get a `.webp` URL, because a
 * missing file is a 404 that neither <img> nor <picture> recovers from (QA RES-1). Everything else
 * is returned unchanged: data:/blob:/http(s) URLs, query strings or hashes, `.JPG`, other formats.
 */
import type { SyntheticEvent } from "react";
import manifest from "./webp-manifest.json";

const HAS = new Set<string>(manifest as string[]);
/** `<anything>/game/<rel>.jpg`, rel being a manifest entry. */
const GAME_JPG = /^((?:\/[A-Za-z0-9._-]+)*\/game\/)([A-Za-z0-9._/-]+\.jpg)$/;

export function toWebp(url: string | undefined | null): string {
  if (!url) return url ?? "";
  if (/^(?:data|blob|https?):/i.test(url) || url.includes("?") || url.includes("#")) return url;
  const m = GAME_JPG.exec(url);
  if (!m || !HAS.has(m[2]!)) return url;
  return `${m[1]}${m[2]!.slice(0, -4)}.webp`;
}

/** The JPEG a variant was derived from (identity for anything else). */
export function fromWebp(url: string): string {
  const m = /^((?:\/[A-Za-z0-9._-]+)*\/game\/)([A-Za-z0-9._/-]+)\.webp$/.exec(url);
  return m && HAS.has(`${m[2]}.jpg`) ? `${m[1]}${m[2]}.jpg` : url;
}

/**
 * Falls back once from a toWebp() variant to its JPEG on an <img> (`src`) or an SVG <image>
 * (`href`). Returns true when it swapped the URL, false otherwise (not a manifest variant, or
 * already on the JPEG), so callers can chain their own fallback.
 */
export function webpFallbackElement(el: Element): boolean {
  const attr = el.hasAttribute("src") || el.tagName.toLowerCase() === "img" ? "src" : "href";
  const url = el.getAttribute(attr) ?? "";
  const jpg = fromWebp(url);
  if (jpg === url) return false;
  el.setAttribute(attr, jpg);
  return true;
}

/** onError handler for React <img>/<image> elements whose URL went through toWebp(). */
export function webpFallback(e: SyntheticEvent<Element>): boolean {
  return webpFallbackElement(e.currentTarget);
}

/** Same fallback for imperatively built DOM (innerHTML): wires every <img> under `root`. */
export function attachWebpFallback(root: ParentNode): void {
  root.querySelectorAll("img").forEach((img) => {
    img.addEventListener("error", () => webpFallbackElement(img));
  });
}

/** Number of variants (tests). */
export const WEBP_VARIANTS = HAS.size;
