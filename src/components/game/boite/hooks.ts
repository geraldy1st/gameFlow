import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia && window.matchMedia(QUERY).matches;
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

export function useIsMobile(max = 700): boolean {
  const [m, setM] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${max}px)`);
    const on = () => setM(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [max]);
  return m;
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

function visible(el: Element): boolean {
  if (!(el instanceof HTMLElement) || !el.getClientRects().length) return false;
  if (el.closest('[inert], [aria-hidden="true"]')) return false;
  return getComputedStyle(el).visibility !== "hidden";
}

function topDialog(): HTMLElement | null {
  const all = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]')).filter(visible);
  return all[all.length - 1] ?? null;
}

function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(visible);
}

/**
 * Modal focus management for every `role="dialog" aria-modal="true"` overlay (DEF-GF-03):
 * - when a dialog opens and focus is outside it, focus moves to the dialog itself (or a `[data-autofocus]` child).
 *   The container, not the first button, so a stray Enter can't activate a choice; components that place
 *   focus on their own primary action (deal card, friend scene "Continue", coach) still win;
 * - Tab / Shift+Tab cycle inside the topmost dialog;
 * - when the last dialog closes, focus returns to where it was before it opened (if still on the page).
 */
export function useModalFocus(): void {
  useEffect(() => {
    let current: HTMLElement | null = null;
    let returnTo: HTMLElement | null = null;
    let raf = 0;
    const sync = () => {
      raf = 0;
      const d = topDialog();
      if (d === current) return;
      const prev = current;
      current = d;
      if (d && !prev) returnTo = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
      if (d) {
        window.setTimeout(() => {
          if (current !== d || d.contains(document.activeElement)) return;
          const target = d.querySelector<HTMLElement>("[data-autofocus]") ?? d;
          if (target === d && !d.hasAttribute("tabindex")) d.setAttribute("tabindex", "-1");
          target.focus({ preventScroll: true });
        }, 30);
      } else if (returnTo) {
        const r = returnTo;
        returnTo = null;
        if (r.isConnected && visible(r) && (document.activeElement === document.body || !document.activeElement)) r.focus({ preventScroll: true });
      }
    };
    const mo = new MutationObserver(() => {
      if (!raf) raf = requestAnimationFrame(sync);
    });
    mo.observe(document.body, { childList: true, subtree: true });
    sync();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const d = topDialog();
      if (!d) return;
      const list = focusables(d);
      const active = document.activeElement as HTMLElement | null;
      if (!list.length) {
        e.preventDefault();
        if (!d.hasAttribute("tabindex")) d.setAttribute("tabindex", "-1");
        d.focus({ preventScroll: true });
        return;
      }
      const first = list[0]!;
      const last = list[list.length - 1]!;
      const inside = !!active && d.contains(active);
      if (!inside || active === d) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      mo.disconnect();
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey, true);
    };
  }, []);
}
