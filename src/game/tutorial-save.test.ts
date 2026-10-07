import { describe, expect, it } from "vitest";
import { SAVE_KEY } from "./data";
import { answer, firstChoice } from "./__tests__/drive";
import { createMatch, reduce, type GameState } from "./engine";
import {
  TRAINING_BACKUP_KEY,
  TUTORIAL_RESULT_KEY,
  backupBeforeReplay,
  classifySave,
  hasBackup,
  isTutorialResult,
  markTutorialResult,
  replayAsk,
  type KV,
} from "./tutorial-save";

const E = { reduce: reduce as (s: GameState, a: { type: string; [k: string]: unknown }) => GameState };

class Mem implements KV {
  m = new Map<string, string>();
  getItem(k: string) {
    return this.m.has(k) ? this.m.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, String(v));
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
}

function real(seed = 11, cash?: number): GameState {
  const s = answer(E, createMatch([{ characterId: "aoi", dreamId: "cafe" }], seed, false), firstChoice);
  return cash === undefined ? s : { ...s, players: s.players.map((p) => ({ ...p, cash })) };
}
function training(seed = 12): GameState {
  return answer(E, createMatch([{ characterId: "aoi", dreamId: "cafe" }], seed, false, { training: true }), firstChoice);
}
const put = (kv: KV, s: GameState) => kv.setItem(SAVE_KEY, JSON.stringify(s));
const cashOf = (raw: string | null) => (JSON.parse(raw!) as GameState).players[0]!.cash;

describe("Replay the tutorial: confirmation and backup (DEF-TUT-02 / 03)", () => {
  it("classifies saves", () => {
    const kv = new Mem();
    expect(classifySave(kv)).toBe("none");
    kv.setItem(SAVE_KEY, "{broken");
    expect(classifySave(kv)).toBe("none");
    put(kv, real());
    expect(classifySave(kv)).toBe("real");
    put(kv, training());
    expect(classifySave(kv)).toBe("training");
    const skipped = reduce(training(), { type: "SKIP_TRAINING" });
    put(kv, skipped);
    expect(classifySave(kv)).toBe("real");
  });

  it("asks for confirmation every time a real game exists, first replay or not", () => {
    const kv = new Mem();
    put(kv, real(1, 3000));
    expect(replayAsk(kv)).toBe("set-aside");
    expect(backupBeforeReplay(kv)).toBe(true);
    expect(cashOf(kv.getItem(TRAINING_BACKUP_KEY))).toBe(3000);
    // the tutorial runs, then the player keeps playing that game: game B
    put(kv, real(2, 2245));
    expect(replayAsk(kv)).toBe("set-aside-replace");
    expect(backupBeforeReplay(kv)).toBe(true);
    // C09: game B is not lost
    expect(cashOf(kv.getItem(TRAINING_BACKUP_KEY))).toBe(2245);
  });

  it("never backs up a training state, nor the bare tutorial result", () => {
    const kv = new Mem();
    put(kv, real(1, 3000));
    backupBeforeReplay(kv);
    put(kv, training());
    expect(replayAsk(kv)).toBe("restart-keep");
    expect(backupBeforeReplay(kv)).toBe(false);
    expect(cashOf(kv.getItem(TRAINING_BACKUP_KEY))).toBe(3000);
    const result = real(3, 2245);
    put(kv, result);
    markTutorialResult(kv, result);
    expect(classifySave(kv)).toBe("tutorial-result");
    expect(replayAsk(kv, { fromDoneCard: true })).toBe("restart-keep");
    expect(backupBeforeReplay(kv)).toBe(false);
    expect(cashOf(kv.getItem(TRAINING_BACKUP_KEY))).toBe(3000);
    expect(kv.getItem(TUTORIAL_RESULT_KEY)).toBeNull();
  });

  it("asks from the done card even without any saved game", () => {
    const kv = new Mem();
    const result = real(4);
    put(kv, result);
    markTutorialResult(kv, result);
    expect(replayAsk(kv, { fromDoneCard: true })).toBe("restart");
    expect(hasBackup(kv)).toBe(false);
  });

  it("a training in progress without a backup restarts without a question", () => {
    const kv = new Mem();
    put(kv, training());
    expect(replayAsk(kv)).toBeNull();
    expect(backupBeforeReplay(kv)).toBe(false);
    expect(kv.getItem(TRAINING_BACKUP_KEY)).toBeNull();
  });

  it("the tutorial-result marker only matches that exact moment of that game", () => {
    const kv = new Mem();
    const result = real(5);
    markTutorialResult(kv, result);
    expect(isTutorialResult(kv, result)).toBe(true);
    expect(isTutorialResult(kv, JSON.parse(JSON.stringify(result)) as GameState)).toBe(true);
    const later = reduce(result, { type: "ROLL" });
    expect(isTutorialResult(kv, later)).toBe(false);
    expect(isTutorialResult(kv, real(6))).toBe(false);
  });

  it("an unreadable backup does not count as a saved game", () => {
    const kv = new Mem();
    kv.setItem(TRAINING_BACKUP_KEY, "{nope");
    expect(hasBackup(kv)).toBe(false);
  });
});
