/** Page (0-based) of item `index` with `per` items a page. */
export function pageOf(index: number, per: number): number {
  return Math.max(0, Math.floor(index / Math.max(1, per)));
}
