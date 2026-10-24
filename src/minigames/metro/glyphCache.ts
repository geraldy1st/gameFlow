/**
 * Pre-rendered text sprites for the Metro runner canvas.
 *
 * The skins draw short labels (円, 駅, 地下鉄, M, line names, sign letters) every
 * frame with a font size that changes with perspective. Each new size defeats the
 * browser's glyph cache (very costly on iOS Safari). Here each (text, font, colour)
 * is rasterised once at a fixed reference size, then blitted with a scaled
 * `drawImage`. Callers always use textAlign "center" / textBaseline "middle".
 *
 * Falls back to `fillText` when no canvas is available (tests), when the fill is
 * not a plain colour, or while web fonts are still loading (so a fallback font is
 * never frozen into the cache).
 */
type Ctx = CanvasRenderingContext2D;

/** Sprite font size in px: 2x the largest label size actually drawn (about 60 css px at DPR 2). */
export const GLYPH_REF_PX = 128;
/** Hard cap on cached sprites; the cache is wiped when exceeded (labels are a small fixed set). */
export const GLYPH_CACHE_MAX = 128;

interface Sprite {
  img: HTMLCanvasElement | OffscreenCanvas;
  /** Anchor (text centre / middle baseline) inside the sprite, in sprite px. */
  ax: number;
  ay: number;
}

const cache = new Map<string, Sprite | null>();

function makeCanvas(w: number, h: number): HTMLCanvasElement | OffscreenCanvas | null {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h);
  if (typeof document !== "undefined") {
    const el = document.createElement("canvas");
    el.width = w;
    el.height = h;
    return el;
  }
  return null;
}

function fontsReady(): boolean {
  if (typeof document === "undefined" || !document.fonts) return true;
  return document.fonts.status === "loaded";
}

function build(text: string, weight: string, family: string, fill: string): Sprite | null {
  const font = `${weight} ${GLYPH_REF_PX}px ${family}`;
  const probe = makeCanvas(1, 1);
  const pc = probe?.getContext("2d") as Ctx | null | undefined;
  if (!probe || !pc) return null;
  pc.font = font;
  pc.textAlign = "center";
  pc.textBaseline = "middle";
  const m = pc.measureText(text);
  const left = m.actualBoundingBoxLeft || m.width / 2;
  const right = m.actualBoundingBoxRight || m.width / 2;
  const asc = m.actualBoundingBoxAscent || GLYPH_REF_PX * 0.7;
  const desc = m.actualBoundingBoxDescent || GLYPH_REF_PX * 0.7;
  const pad = 4;
  const w = Math.ceil(left + right) + pad * 2;
  const h = Math.ceil(asc + desc) + pad * 2;
  const img = makeCanvas(w, h);
  const g = img?.getContext("2d") as Ctx | null | undefined;
  if (!img || !g) return null;
  const ax = pad + left;
  const ay = pad + asc;
  g.font = font;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = fill;
  g.fillText(text, ax, ay);
  return { img, ax, ay };
}

/**
 * Draw `text` centred on (x, y) at `size` px (in the current transform), using the
 * context's current fillStyle. Same visual contract as
 * `c.font = \`${weight} ${size}px ${family}\`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(text, x, y)`.
 */
export function cachedText(c: Ctx, text: string, weight: string, family: string, size: number, x: number, y: number): void {
  const fill = c.fillStyle;
  if (typeof fill !== "string" || !fontsReady() || !(size > 0)) {
    c.font = `${weight} ${size}px ${family}`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(text, x, y);
    return;
  }
  const key = `${weight}|${family}|${fill}|${text}`;
  let s = cache.get(key);
  if (s === undefined) {
    if (cache.size >= GLYPH_CACHE_MAX) cache.clear();
    s = build(text, weight, family, fill);
    cache.set(key, s);
  }
  if (!s) {
    c.font = `${weight} ${size}px ${family}`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(text, x, y);
    return;
  }
  const k = size / GLYPH_REF_PX;
  c.drawImage(s.img, x - s.ax * k, y - s.ay * k, s.img.width * k, s.img.height * k);
}

/** Release every sprite (end of a run / unmount), so iOS can reclaim the canvas memory. */
export function clearGlyphCache(): void {
  for (const s of cache.values()) {
    if (s) {
      s.img.width = 0;
      s.img.height = 0;
    }
  }
  cache.clear();
}

/** Number of cached sprites (tests and memory checks). */
export function glyphCacheSize(): number {
  return cache.size;
}
