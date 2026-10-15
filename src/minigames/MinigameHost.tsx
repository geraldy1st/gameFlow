/**
 * Generic mini-game host (refacto batch 3): renders a registered game's UI piece, loaded on demand from the game's
 * own chunk. Shows a small loading card while the chunk arrives, and a retry / close card if it fails (offline,
 * stale deploy). Browsers keep a failed dynamic import() in their module map, so "Try again" reloads the page
 * (the game is saved in localStorage on every change), and an unfinished run is offered again,
 * as after any reload).
 */
import { Component, lazy, Suspense, type ComponentType, type LazyExoticComponent, type ReactNode } from "react";
import { minigameById } from "./registry";

type AnyComp = ComponentType<any>;
const cache = new Map<string, LazyExoticComponent<AnyComp>>();

/** One lazy component per (game, piece), created once. */
function lazyPiece(id: string, part: string): LazyExoticComponent<AnyComp> | null {
  const loader = minigameById(id)?.parts?.[part];
  if (!loader) return null;
  const k = `${id}:${part}`;
  let c = cache.get(k);
  if (!c) {
    c = lazy(() => loader().then((m) => ({ default: m })));
    cache.set(k, c);
  }
  return c;
}

interface BoundaryProps {
  t: (s: string) => string;
  onClose?: () => void;
  onRetry: () => void;
  children: ReactNode;
}

class LoadBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    const { t, onClose, onRetry } = this.props;
    return (
      <div className="overlay" role="alertdialog" aria-live="assertive">
        <div className="pass-gate">
          <p>{t("The mini-game could not load. Check your connection.")}</p>
          <button type="button" className="btn btn-gold" onClick={onRetry}>{t("Try again")}</button>
          {onClose && <button type="button" className="btn btn-ghost" onClick={onClose}>{t("Close")}</button>}
        </div>
      </div>
    );
  }
}

export function MinigameHost({ id, part, t, onClose, props }: { id: string; part: string; t: (s: string) => string; onClose?: () => void; props: Record<string, unknown> }) {
  const Piece = lazyPiece(id, part);
  if (!Piece) return null;
  return (
    <LoadBoundary t={t} onClose={onClose} onRetry={() => window.location.reload()}>
      <Suspense
        fallback={
          <div className="overlay" role="status" aria-live="polite">
            <div className="pass-gate"><p>{t("Loading…")}</p></div>
          </div>
        }
      >
        <Piece {...props} />
      </Suspense>
    </LoadBoundary>
  );
}
