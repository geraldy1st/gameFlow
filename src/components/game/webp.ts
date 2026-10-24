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
 * onError for an <img> whose src went through toWebp(): falls back once to the JPEG (WebP not
 * decodable, file missing). Returns true when it handled the error, so callers can chain their
 * own fallback otherwise.
 */
export function webpFallback(e: SyntheticEvent<HTMLImageElement>): boolean {
  const img = e.currentTarget;
  const src = img.getAttribute("src") ?? "";
  const jpg = fromWebp(src);
  if (jpg === src) return false;
  img.setAttribute("src", jpg);
  return true;
}

/** Number of variants (tests). */
export const WEBP_VARIANTS = HAS.size;
