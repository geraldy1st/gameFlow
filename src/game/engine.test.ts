/**
 * Engine unit tests: Social +10 bonus when someone joins the circle, and hydrate() on old / partial saves.
 * Based on the QA campaign's ad hoc suite (gameflow-recette/unit/engine.test.mjs, DEF-GF RJ-01).
 */
import { describe, expect, it } from "vitest";
import { FRIEND_SOCIAL_BONUS, FRIENDS, MAX_FRIENDS } from "./data";
import { createMatch, cur, hydrate, money, reduce, statement, unlocked, type FriendState, type GameState, type Pick } from "./engine";

type AnyAction = { type: string; [k: string]: unknown };
const act = (s: GameState, a: AnyAction): GameState => reduce(s, a as Parameters<typeof reduce>[1]);
const clone = <T>(o: T): T => JSON.parse(JSON.stringify(o)) as T;
const AOI: Pick = { characterId: "aoi", dreamId: "cafe" };
const REN: Pick = { characterId: "ren", dreamId: "studio" };

/** Past the start card(s), first player to move, phase idle. */
function idle(seed = 42, picks: Pick[] = [AOI]): GameState {
  let s = createMatch(picks, seed, true);
  for (let i = 0; i < 4 && s.phase === "card" && s.card; i++) s = act(s, { type: "CHOICE", id: s.card.choices[0]!.id });
  return s;
}

const tie = (id: string): FriendState => ({ id, loyalty: 3, role: "friend", sinceTurn: 1, earned: 0, spent: 0, likes: 0, dislikes: 0 });

/** Current player is offered `friendId`, with a given Social and `count` friends already in the circle. */
function withFriendCard(base: GameState, friendId: string, social: number, count = 0): GameState {
  const s = clone(base);
  const p = s.players[s.current]!;
  p.vitals.social = social;
  p.friends = FRIENDS.map((f) => f.id)
    .filter((id) => id !== friendId)
    .slice(0, count)
    .map(tie);
  p.calm = 5;
  s.phase = "card";
  s.card = {
    title: "x",
    story: "x",
    art: "",
    tag: "",
    lines: [],
    choices: [
      { id: "friend", label: "Become friends", tone: "gold" },
      { id: "biz", label: "Business partner", tone: "gold" },
      { id: "decline", label: "Ignore", tone: "ghost" },
    ],
    payload: { t: "friend", id: friendId },
  } as unknown as GameState["card"];
  return s;
}

const FRIEND = FRIENDS[0]!.id;
const clamp = (x: number) => Math.max(0, Math.min(100, x));

describe("Social bonus when someone joins the circle", () => {
  const base = idle();
  // the CHOICE also ends the turn (beginTurn → driftVitals); measure that drift away from the bounds
  const drift = (choice: string) => cur(act(withFriendCard(base, FRIEND, 50), { type: "CHOICE", id: choice })).vitals.social - 60;

  for (const social of [0, 50, 89, 90, 91, 99, 100]) {
    for (const choice of ["friend", "biz"]) {
      it(`social ${social}, ${choice}: +${Math.min(FRIEND_SOCIAL_BONUS, 100 - social)} exactly once, clamped at 100`, () => {
        const s = withFriendCard(base, FRIEND, social);
        const n = act(s, { type: "CHOICE", id: choice });
        const p = n.players[s.current]!;
        const gain = Math.min(FRIEND_SOCIAL_BONUS, 100 - social);
        expect(p.friends).toHaveLength(1);
        expect(p.friends[0]!.role).toBe(choice === "biz" ? "partner" : "friend");
        expect(p.friends[0]!.socialGain).toBe(gain);
        expect(p.vitals.social).toBe(clamp(Math.min(100, social + FRIEND_SOCIAL_BONUS) + drift(choice)));
        expect(Number.isFinite(p.vitals.social)).toBe(true);
      });
    }
  }

  it("decline: no bonus, nobody joins", () => {
    const n = act(withFriendCard(base, FRIEND, 50), { type: "CHOICE", id: "decline" });
    expect(cur(n).friends).toHaveLength(0);
    expect(cur(n).vitals.social).toBe(50 + drift("friend"));
  });

  it("already in the circle: no bonus, no duplicate", () => {
    const s = withFriendCard(base, FRIEND, 50);
    s.players[0]!.friends = [tie(FRIEND)];
    const n = act(s, { type: "CHOICE", id: "friend" });
    expect(cur(n).friends).toHaveLength(1);
    expect(cur(n).vitals.social).toBe(50 + drift("friend"));
  });

  it(`circle at ${MAX_FRIENDS - 1}: the last seat is taken, with the bonus`, () => {
    const n = act(withFriendCard(base, FRIEND, 50, MAX_FRIENDS - 1), { type: "CHOICE", id: "friend" });
    expect(cur(n).friends).toHaveLength(MAX_FRIENDS);
    expect(cur(n).vitals.social).toBe(60 + drift("friend"));
  });

  it("full circle: refused, no bonus", () => {
    const s = withFriendCard(base, FRIEND, 50, MAX_FRIENDS - 1);
    s.players[0]!.friends.push(tie("zz"));
    const n = act(s, { type: "CHOICE", id: "friend" });
    expect(cur(n).friends).toHaveLength(MAX_FRIENDS);
    expect(cur(n).vitals.social).toBe(50 + drift("friend"));
  });

  it("the same CHOICE dispatched twice counts once", () => {
    const once = act(withFriendCard(base, FRIEND, 50), { type: "CHOICE", id: "friend" });
    const twice = act(once, { type: "CHOICE", id: "friend" });
    expect(twice.players[0]!.vitals).toEqual(once.players[0]!.vitals);
    expect(twice.players[0]!.friends).toHaveLength(1);
  });

  it("2 players: only the current player gets the bonus", () => {
    const s0 = idle(7, [AOI, REN]);
    const s = withFriendCard(s0, FRIEND, 50);
    const other = (s.current + 1) % 2;
    const before = clone(s.players[other]!.vitals);
    const n = act(s, { type: "CHOICE", id: "friend" });
    expect(n.players[s.current]!.vitals.social).toBe(60);
    expect(n.players[other]!.vitals).toEqual(before);
  });
});

describe("hydrate: old and partial saves", () => {
  it("player without vitals / friends / outfit (old main save) resumes", () => {
    const s = clone(idle()) as unknown as { players: Record<string, unknown>[] } & GameState;
    for (const k of ["vitals", "friends", "outfit", "ownedOutfits", "homeOwned"]) delete s.players[0]![k];
    const h = hydrate(s);
    expect(h.screen).toBe("play");
    expect(h.players[0]!.friends).toEqual([]);
    expect(Number.isFinite(h.players[0]!.vitals.social)).toBe(true);
  });

  it("old friend entries carry no socialGain (no made-up +10 badge)", () => {
    const s = clone(idle());
    s.players[0]!.friends = [tie(FRIEND)];
    expect(hydrate(s).players[0]!.friends[0]!.socialGain).toBeUndefined();
  });

  it("players: [] or null → menu, no crash", () => {
    expect(hydrate({ version: 1, players: [] } as unknown as GameState).screen).toBe("menu");
    expect(hydrate({ version: 1, players: null } as unknown as GameState).screen).toBe("menu");
  });

  it('vitals.social as a string ("70") becomes a number', () => {
    const s = clone(idle()) as GameState;
    (s.players[0]!.vitals as unknown as Record<string, unknown>).social = "70";
    expect(typeof hydrate(s).players[0]!.vitals.social).toBe("number");
  });

  it("missing cash / arrays → defaults, no NaN in statement or money()", () => {
    const s = clone(idle()) as unknown as { players: Record<string, unknown>[] } & GameState;
    for (const k of ["cash", "children", "assets", "liabilities"]) delete s.players[0]![k];
    const p = hydrate(s).players[0]!;
    expect(money(p.cash)).not.toMatch(/NaN|undefined/);
    for (const v of Object.values(statement(p))) if (typeof v === "number") expect(Number.isFinite(v)).toBe(true);
  });

  it("unknown friend id is dropped instead of crashing later", () => {
    const s = clone(idle());
    s.players[0]!.friends = [tie("ghost"), tie(FRIEND)];
    expect(hydrate(s).players[0]!.friends.map((f) => f.id)).toEqual([FRIEND]);
  });
});

describe("simulation", () => {
  function prng(seed: number) {
    let x = seed >>> 0 || 1;
    return () => {
      x ^= x << 13;
      x >>>= 0;
      x ^= x >>> 17;
      x ^= x << 5;
      x >>>= 0;
      return x / 4294967296;
    };
  }
  const PHASES = new Set(["idle", "rolling", "moving", "card", "pass", "broke", "win"]);

  it("idle helper reaches the board", () => {
    expect(idle().phase).toBe("idle");
    expect(idle(7, [AOI, REN]).phase).toBe("idle");
  });

  it("100 games (1 and 2 players): finite money, valid phases, vitals within [0, 100]", () => {
    const bad: string[] = [];
    for (let seed = 1; seed <= 50; seed++) {
      for (const picks of [[AOI], [AOI, REN]]) {
        let s = createMatch(picks, seed, true);
        const rnd = prng(seed * 31 + 7);
        for (let i = 0; i < 3000 && s.phase !== "win"; i++) {
          const p = cur(s);
          let a: AnyAction = { type: "ROLL" };
          if (s.phase === "card" && s.card) {
            const ch = s.card.choices;
            a = { type: "CHOICE", id: ch.length ? ch[Math.floor(rnd() * ch.length)]!.id : "ok" };
          } else if (s.phase === "idle") {
            if (p.track === "grind" && unlocked(p)) a = { type: "ENTER" };
            else if (p.level >= 2 && rnd() < 0.2) a = { type: "RETIRE" };
          } else if (s.phase === "rolling") a = { type: "REVEAL" };
          else if (s.phase === "moving") a = { type: "STEP" };
          else if (s.phase === "pass") a = { type: "READY" };
          else if (s.phase === "broke") a = { type: "BREATHE" };
          s = act(s, a);
          if (!PHASES.has(s.phase)) bad.push(`seed ${seed}: phase ${s.phase}`);
          for (const pl of s.players) {
            if (!Number.isFinite(pl.cash)) bad.push(`seed ${seed}: cash ${pl.cash}`);
            for (const [k, v] of Object.entries(pl.vitals)) if (!(v >= 0 && v <= 100)) bad.push(`seed ${seed}: ${k}=${v}`);
            for (const f of pl.friends) if (f.socialGain !== undefined && !(f.socialGain >= 0 && f.socialGain <= FRIEND_SOCIAL_BONUS)) bad.push(`seed ${seed}: socialGain ${f.socialGain}`);
          }
        }
      }
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });
});
