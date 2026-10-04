/**
 * Passive income per turn, for the player-mat chart. The engine does not keep
 * this series, so the UI records it under its own localStorage key (keyed by
 * the match seed). The game save (SAVE_KEY) is never touched, so existing saves
 * load unchanged; an old save simply starts its chart at the current turn.
 */
import { useEffect, useState } from "react";
import { statement, type GameState } from "@/game/engine";

export const HISTORY_KEY = "gameflow-passive-history-v1";
const MAX_POINTS = 60;

export type Point = { turn: number; passive: number };
type Store = { seed: number; players: Record<string, Point[]> };

function load(): Store | null {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Store;
    if (typeof s?.seed !== "number" || typeof s.players !== "object" || !s.players) return null;
    return s;
  } catch {
    return null;
  }
}

function record(prev: Store | null, state: GameState): Store {
  const base: Store = prev && prev.seed === state.seed ? prev : { seed: state.seed, players: {} };
  const players: Record<string, Point[]> = { ...base.players };
  for (const p of state.players) {
    const passive = statement(p).passive;
    const list = (players[p.id] ?? []).filter((pt) => pt.turn !== state.turn && pt.turn < state.turn + 1);
    list.push({ turn: state.turn, passive });
    list.sort((a, b) => a.turn - b.turn);
    players[p.id] = list.slice(-MAX_POINTS);
  }
  return { seed: state.seed, players };
}

/** Keeps the series in sync with the live game and returns it. */
export function usePassiveHistory(state: GameState): Record<string, Point[]> {
  const [store, setStore] = useState<Store | null>(null);
  const active = state.screen === "play" && state.players.length > 0;
  const sig = active ? `${state.seed}:${state.turn}:${state.players.map((p) => statement(p).passive).join(",")}` : "";
  useEffect(() => {
    if (!active) return;
    setStore((prev) => {
      const next = record(prev ?? load(), state);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      } catch {
        /* storage full or private mode: chart stays in memory */
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);
  return store && store.seed === state.seed ? store.players : {};
}
