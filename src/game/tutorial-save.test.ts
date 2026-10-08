import { describe, expect, it } from "vitest";
import { SAVE_KEY } from "./data";
import { answer, firstChoice } from "./__tests__/drive";
import { blankMenu, createMatch, hydrate, isPractice, reduce, statement, type GameState, type Pick } from "./engine";
import {
  TRAINING_BACKUP_KEY,
  TUTORIAL_RESULT_KEY,
  backupBeforeReplay,
  classifySave,
  hasBackup,
  isTutorialResult,
  markTutorialResult,
  replayAsk,
  setAsideFreshGame,
  tutorialExit,
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
    // DEF-TUT-10 (new rule): a tutorial game is a throw-away even once skipped, never a real game.
    expect(classifySave(kv)).toBe("training");
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

/** Plays the 5 scripted turns of a tutorial game, buying the T3 deal and paying the T4 subscription. */
function playTutorial(s0: GameState): GameState {
  let s = s0;
  for (let i = 0; i < 400 && s.training; i++) {
    if (s.phase === "card" && s.card) {
      const ids = s.card.choices.map((c) => c.id);
      const id = ["ok", "rest", "accept", "pay", "buy"].find((x) => ids.includes(x)) ?? ids[0]!;
      s = E.reduce(s, { type: "CHOICE", id });
    } else if (s.phase === "idle") s = E.reduce(s, { type: "ROLL" });
    else if (s.phase === "rolling") s = E.reduce(s, { type: "REVEAL" });
    else if (s.phase === "moving") s = E.reduce(s, { type: "STEP" });
    else if (s.phase === "pass") s = E.reduce(s, { type: "READY" });
    else break;
  }
  return s;
}

describe("DEF-TUT-10: the first-game tutorial never touches the real game", () => {
  const AOI: Pick = { characterId: "aoi", dreamId: "cafe" };
  const REN: Pick = { characterId: "ren", dreamId: "studio" };
  for (const picks of [[AOI], [AOI, REN]]) {
    for (const exit of ["finish", "skip"] as const) {
      it(`${picks.length} player(s), tutorial ${exit === "finish" ? "finished" : "skipped"}: the real game starts at its initial state`, () => {
        const kv = new Mem();
        // startGame(): the real game is dealt first and set aside, then the throw-away tutorial runs for player 1 only.
        const fresh = reduce(blankMenu(), { type: "NEW", picks, training: false });
        setAsideFreshGame(kv, fresh);
        let tut = reduce(fresh, { type: "NEW", picks: [picks[0]!], training: true });
        expect(tut.players).toHaveLength(1);
        expect(isPractice(tut)).toBe(true);
        expect(tut.seed).not.toBe(fresh.seed);
        tut = exit === "finish" ? playTutorial(tut) : reduce(tut, { type: "SKIP_TRAINING" });
        put(kv, tut);
        if (exit === "finish") expect(tut.players[0]!.assets.length).toBe(1); // the tutorial did buy the sublet
        // The tutorial game is never set aside over the real one, and Play / Skip lead back to it.
        expect(backupBeforeReplay(kv)).toBe(false);
        expect(tutorialExit(kv)).toBe("restore");
        const back = reduce(blankMenu(), { type: "CONTINUE", saved: JSON.parse(kv.getItem(TRAINING_BACKUP_KEY)!) as GameState });
        expect(back.turn).toBe(1);
        expect(back.training).toBeNull();
        expect(isPractice(back)).toBe(false);
        expect(back.players).toHaveLength(picks.length);
        expect(back.log).toEqual(["The board is set. First career dealt."]);
        expect(back.card?.payload?.t).toBe("start");
        for (const [i, p] of back.players.entries()) {
          const f = fresh.players[i]!;
          expect(p.careerId).toBe(f.careerId);
          expect(p.cash).toBe(f.cash);
          expect(p.assets).toEqual([]);
          expect(p.expenseMods).toBe(0);
          expect(p.position).toBe(11);
          expect(statement(p).passive).toBe(0);
        }
      });
    }
  }

  it("the career of the real game is not forced to the tutorial's barista", () => {
    const careers = new Set<string>();
    for (let seed = 1; seed < 60; seed++) careers.add(createMatch([{ characterId: "aoi", dreamId: "cafe" }], seed * 7919, false).players[0]!.careerId);
    expect(careers.size).toBeGreaterThan(1);
  });

  it("with nothing set aside (Replay from the menu, no game), leaving the tutorial deals a fresh game", () => {
    const kv = new Mem();
    put(kv, training());
    expect(tutorialExit(kv)).toBe("fresh");
  });

  it("a tutorial game stays a practice game after its script, across save / reload", () => {
    const done = playTutorial(createMatch([{ characterId: "aoi", dreamId: "cafe" }], 5, false, { training: true }));
    expect(done.training).toBeNull();
    expect(isPractice(done)).toBe(true);
    expect(isPractice(hydrate(JSON.parse(JSON.stringify(done)) as GameState))).toBe(true);
    // A pre-fix save of a running script (no flag yet) is still recognised.
    const old = { ...createMatch([{ characterId: "aoi", dreamId: "cafe" }], 5, false, { training: true }) } as GameState;
    delete old.practice;
    expect(isPractice(hydrate(old))).toBe(true);
    expect(isPractice(hydrate(createMatch([{ characterId: "aoi", dreamId: "cafe" }], 5, false)))).toBe(false);
  });
});

describe("Options › Replay the tutorial: reachable at any time, zero impact on the real game", () => {
  const AOI: Pick = { characterId: "aoi", dreamId: "cafe" };
  const REN: Pick = { characterId: "ren", dreamId: "studio" };
  /** A real game well under way (cards answered, rolls, paydays...). */
  function midGame(picks: Pick[], seed: number, actions: number): GameState {
    let s = createMatch(picks, seed, false);
    for (let i = 0; i < actions; i++) {
      if (s.phase === "card" && s.card) s = reduce(s, { type: "CHOICE", id: firstChoice(s) });
      else if (s.phase === "idle") s = reduce(s, { type: "ROLL" });
      else if (s.phase === "rolling") s = reduce(s, { type: "REVEAL" });
      else if (s.phase === "moving") s = reduce(s, { type: "STEP" });
      else if (s.phase === "pass") s = reduce(s, { type: "READY" });
      else if (s.phase === "broke") s = reduce(s, { type: "BREATHE" });
    }
    return s;
  }
  for (const picks of [[AOI], [AOI, REN]]) {
    for (const exit of ["finish", "skip", "replay-twice"] as const) {
      it(`${picks.length} player(s), replay then ${exit}: the real game comes back byte for byte, and Replay stays available`, () => {
        const kv = new Mem();
        const game = midGame(picks, 4242 + picks.length, 160);
        expect(game.turn).toBeGreaterThan(3);
        put(kv, game);
        const before = kv.getItem(SAVE_KEY)!;
        for (let round = 0; round < 2; round++) {
          // Replay (Options): the real game is set aside, a solo practice game starts.
          expect(backupBeforeReplay(kv)).toBe(true);
          expect(kv.getItem(TRAINING_BACKUP_KEY)).toBe(before);
          let tut = reduce(blankMenu(), { type: "NEW", picks: [picks[0]!], training: true });
          expect(isPractice(tut)).toBe(true);
          put(kv, tut);
          if (exit === "replay-twice") {
            // Replay again in the middle of the tutorial: the copy set aside is still the real game, not the tutorial.
            tut = playTutorial(tut);
            put(kv, tut);
            expect(backupBeforeReplay(kv)).toBe(false);
            expect(kv.getItem(TRAINING_BACKUP_KEY)).toBe(before);
          }
          tut = exit === "skip" ? reduce(tut, { type: "SKIP_TRAINING" }) : playTutorial(tut);
          put(kv, tut);
          // Play / Skip: back to the game set aside, untouched.
          expect(tutorialExit(kv)).toBe("restore");
          const raw = kv.getItem(TRAINING_BACKUP_KEY)!;
          expect(raw).toBe(before);
          kv.removeItem(TRAINING_BACKUP_KEY);
          kv.setItem(SAVE_KEY, raw);
          expect(classifySave(kv)).toBe("real");
        }
        expect(kv.getItem(SAVE_KEY)).toBe(before);
      });
    }
  }
});
