/**
 * Save bookkeeping around the training mode ("Replay the tutorial"), kept free of React and of the DOM
 * so it can be unit-tested (DEF-TUT-01, 02, 03).
 *
 * - SAVE_KEY holds the game on screen, training games included (it is written on every state change).
 * - TRAINING_BACKUP_KEY holds the player's last *real* game, set aside while a training runs.
 *   Only a real game is ever copied there: never a training in progress, never the bare result of a tutorial.
 * - TUTORIAL_RESULT_KEY fingerprints the save at the moment the 5 scripted turns end (Gate coachmark), so that
 *   a reload brings the coach back and so that this throw-away result is never mistaken for a real game.
 */
import { SAVE_KEY } from "./data";

export const TRAINING_BACKUP_KEY = `${SAVE_KEY}:before-training`;
export const TUTORIAL_RESULT_KEY = `${SAVE_KEY}:tutorial-result`;

export interface KV {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Fields that identify one exact moment of one game (the seed moves on every random draw). */
export interface SaveFingerprint {
  seed: number;
  turn: number;
  moveSerial: number;
}

interface SaveLike {
  version?: unknown;
  players?: unknown;
  training?: { skipped?: unknown } | null;
  seed?: unknown;
  turn?: unknown;
  moveSerial?: unknown;
}

/**
 * - none: no save, or one that cannot be continued;
 * - training: the scripted turns are still running (nothing to protect, the real game is in the backup if any);
 * - tutorial-result: the game exactly as the tutorial left it (Gate coachmark / done card), not yet played on;
 * - real: anything else, including a game that started as a tutorial and was then played with normal rules.
 */
export type SaveKind = "none" | "training" | "tutorial-result" | "real";

function parse(raw: string | null): SaveLike | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as unknown;
    return v && typeof v === "object" ? (v as SaveLike) : null;
  } catch {
    return null;
  }
}

export function fingerprint(s: SaveLike): SaveFingerprint | null {
  if (typeof s.seed !== "number" || typeof s.turn !== "number" || typeof s.moveSerial !== "number") return null;
  return { seed: s.seed, turn: s.turn, moveSerial: s.moveSerial };
}

function sameMoment(a: SaveFingerprint | null, b: SaveFingerprint | null): boolean {
  return !!a && !!b && a.seed === b.seed && a.turn === b.turn && a.moveSerial === b.moveSerial;
}

export function classifyRaw(raw: string | null, resultMarker: string | null): SaveKind {
  const s = parse(raw);
  if (!s || s.version !== 1 || !Array.isArray(s.players) || s.players.length === 0) return "none";
  if (s.training && typeof s.training === "object" && !s.training.skipped) return "training";
  const marker = parse(resultMarker) as SaveFingerprint | null;
  if (marker && sameMoment(fingerprint(s), marker)) return "tutorial-result";
  return "real";
}

export function classifySave(store: KV): SaveKind {
  return classifyRaw(store.getItem(SAVE_KEY), store.getItem(TUTORIAL_RESULT_KEY));
}

export function hasBackup(store: KV): boolean {
  return classifyRaw(store.getItem(TRAINING_BACKUP_KEY), null) === "real";
}

/** What the "Replay the tutorial" confirmation must say, or null when nothing would be lost (no confirmation). */
export type ReplayAsk = null | "set-aside" | "set-aside-replace" | "restart-keep" | "restart";

/**
 * DEF-TUT-02 / 03: a confirmation is required whenever a game would be replaced, every time (not only the first),
 * from Options as from the done card. `onScreen` is the game currently displayed, which may be more recent than
 * the save (it is the same object in practice: the save is written on every change).
 */
export function replayAsk(store: KV, opts: { fromDoneCard?: boolean } = {}): ReplayAsk {
  const kind = classifySave(store);
  const backup = hasBackup(store);
  if (kind === "real") return backup ? "set-aside-replace" : "set-aside";
  if (kind === "none") return null;
  // A training in progress or a fresh tutorial result: the training restarts, the real game (if any) stays set aside.
  if (opts.fromDoneCard || kind === "tutorial-result") return backup ? "restart-keep" : "restart";
  return backup ? "restart-keep" : null;
}

/**
 * Called right before a replay starts (after the confirmation). Copies the current game to the backup when it is
 * a real game — every time, so the game in progress is never lost — and never copies a training state.
 * Returns true when a backup was written.
 */
export function backupBeforeReplay(store: KV): boolean {
  const raw = store.getItem(SAVE_KEY);
  const kind = classifyRaw(raw, store.getItem(TUTORIAL_RESULT_KEY));
  store.removeItem(TUTORIAL_RESULT_KEY);
  if (kind !== "real" || !raw) return false;
  store.setItem(TRAINING_BACKUP_KEY, raw);
  return true;
}

/** DEF-TUT-01: remember that this exact save is the tutorial's result (set when the Gate coachmark shows). */
export function markTutorialResult(store: KV, s: SaveLike): void {
  const fp = fingerprint(s);
  if (fp) store.setItem(TUTORIAL_RESULT_KEY, JSON.stringify(fp));
}

/** True when `s` (typically the save being continued) is still the untouched tutorial result. */
export function isTutorialResult(store: KV, s: SaveLike): boolean {
  const marker = parse(store.getItem(TUTORIAL_RESULT_KEY)) as SaveFingerprint | null;
  return sameMoment(fingerprint(s), marker);
}

export function clearTutorialResult(store: KV): void {
  store.removeItem(TUTORIAL_RESULT_KEY);
}
