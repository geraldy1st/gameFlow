/**
 * DEF-HOME-04: after an action, keep the focus on an enabled control: the action itself if still enabled, else the next
 * enabled action in the room (wrapping), else the room selector. Never null when a room button exists.
 */
export function focusAfterAction(root: ParentNode, id: string): HTMLElement | null {
  const acts = Array.from(root.querySelectorAll<HTMLButtonElement>("[data-act]"));
  const i = acts.findIndex((b) => b.dataset.act === id);
  for (let k = 0; k < acts.length; k++) {
    const b = acts[(Math.max(0, i) + k) % acts.length]!;
    if (!b.disabled) return b;
  }
  return root.querySelector<HTMLElement>('[data-room][aria-pressed="true"]:not(:disabled)') ?? root.querySelector<HTMLElement>("[data-room]:not(:disabled)");
}
