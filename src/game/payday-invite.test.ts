/**
 * Payday invite (Geraldy, Oct 2026): after the salary of a payday square (landing on it or passing it), one random
 * not-yet-met friend is offered for PAYDAY_INVITE_COST: friend / partner / ignore. The offer is queued until the
 * move and its landing card are over, respects the circle slot limit (a full circle gets no meeting, at payday nor
 * on the social square), and never shows in a tutorial game. docs/tutorial/RULES.md §14.
 */
import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as E from "./engine";
import type { GameState, Player } from "./engine";
import { FREEDOM, FRIENDS, GRIND, PAYDAY_INVITE_COST, VENTURE } from "./data";
import { maxFriends } from "./skills";
import { SKILL_RULES } from "./tuning";
import { prng } from "./__tests__/fp-policy";

const POOL = FRIENDS.map((f) => f.id);
const isInvite = (s: GameState) => s.phase === "card" && s.card?.tag === "Payday invite";
const isMeet = (s: GameState) => s.phase === "card" && s.card?.payload.t === "friend";

function idle(seed = 3): GameState {
  let s = E.createMatch([{ characterId: "aoi", dreamId: "cafe" }], seed, true);
  let guard = 0;
  while (s.phase === "card" && guard++ < 10) s = E.reduce(s, { type: "CHOICE", id: s.card!.choices[0]?.id ?? "ok" });
  expect(s.phase).toBe("idle");
  return s;
}

const friend = (id: string, turn = 1) => ({ id, loyalty: 3, role: "friend" as const, sinceTurn: turn, earned: 0, spent: 0, likes: 0, dislikes: 0 });
const withPlayer = (s: GameState, f: (p: Player) => Player): GameState => ({ ...s, players: s.players.map((p, i) => (i === s.current ? f(p) : p)) });
const setFriends = (s: GameState, ids: string[]) => withPlayer(s, (p) => ({ ...p, friends: ids.map((id) => friend(id)) }));

/** Moves the current player along `path` (grind indexes) from `from`, step by step; returns every intermediate state. */
function move(s0: GameState, from: number, path: number[]): GameState[] {
  let s: GameState = withPlayer({ ...s0, phase: "moving", die: path.length, path, step: 0, passedPay: 0, card: null, moveSerial: s0.moveSerial + 1 }, (p) => ({ ...p, track: "grind", position: from }));
  const seen = [s];
  let guard = 0;
  while (s.phase === "moving" && guard++ < 20) {
    s = E.reduce(s, { type: "STEP" });
    seen.push(s);
  }
  return seen;
}
const last = <T,>(xs: T[]) => xs[xs.length - 1]!;
const choose = (s: GameState, id: string) => E.reduce(s, { type: "CHOICE", id });

/** Answers non-invite cards with `pick` (default: the "decline"/"ignore" choice, else the first). Stops on the invite or off-card. */
function settle(s0: GameState, pick?: (s: GameState) => string): GameState {
  let s = s0;
  let guard = 0;
  while (s.phase === "card" && !isInvite(s) && guard++ < 10) {
    const ids = s.card!.choices.map((c) => c.id);
    s = choose(s, pick ? pick(s) : ids.find((id) => id === "decline" || id === "ignore") ?? ids[0] ?? "ok");
  }
  return s;
}

describe("payday invite (RULES.md §14)", () => {
  it("board: a single roll (1..6) can never cross two paydays", () => {
    for (const track of [GRIND, VENTURE, FREEDOM]) {
      const pays = track.map((sp, i) => (sp.kind === "payday" ? i : -1)).filter((i) => i >= 0);
      for (let k = 0; k < pays.length; k++) {
        const gap = ((pays[(k + 1) % pays.length]! - pays[k]! + track.length - 1) % track.length) + 1;
        expect(gap).toBeGreaterThan(6);
      }
    }
    expect(GRIND.length).toBe(24);
    expect(GRIND[0]!.kind).toBe("payday");
    expect(GRIND[12]!.kind).toBe("payday");
    expect(GRIND[3]!.kind).toBe("social");
  });

  it("landing on payday: payday card first, then the invite (one random unmet friend, $150, friend / partner / ignore)", () => {
    const seen = move(setFriends(idle(), []), 9, [10, 11, 12]);
    const s = last(seen);
    expect(s.card?.title).toBe("Payday");
    const inv = choose(s, "ok");
    expect(isInvite(inv)).toBe(true);
    expect(inv.card!.choices.map((c) => c.id)).toEqual(["friend", "biz", "decline"]);
    expect(inv.card!.payload).toMatchObject({ t: "friend", cost: PAYDAY_INVITE_COST });
    expect(POOL).toContain((inv.card!.payload as { id: string }).id);
    expect(inv.card!.lines[0]).toMatchObject({ k: "Invitation", tone: "down" });
  });

  it("passing payday: no card mid-movement; the landing card comes first, the invite after it", () => {
    const seen = move(setFriends(idle(), []), 10, [11, 12, 13]);
    const mid = seen.filter((x) => x.phase === "moving");
    expect(mid.every((x) => x.card === null)).toBe(true);
    expect(mid.some((x) => x.paydayInviteTurn === x.turn)).toBe(true); // queued while moving
    const landed = last(seen);
    expect(landed.phase).toBe("card");
    expect(isInvite(landed)).toBe(false); // the square's own card (small deal)
    const inv = settle(landed);
    expect(isInvite(inv)).toBe(true);
  });

  it("payday + social in the same move: the social card first; the invite after it, if the circle still has room", () => {
    let hits = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const start = setFriends(idle(seed), ["jun"]);
      const landed = last(move(start, 22, [23, 0, 1, 2, 3]));
      expect(isInvite(landed)).toBe(false);
      // decline whatever the social square offers: the invite follows
      const inv = settle(landed);
      expect(isInvite(inv)).toBe(true);
      // accept a social meeting when offered: the invite still follows while there is room (3 slots: jun + 1 → room)
      if (isMeet(landed) && !isInvite(landed)) {
        hits++;
        const met = settle(landed, (x) => (isMeet(x) ? "friend" : x.card!.choices[0]!.id));
        const p = E.cur(met);
        if (p.friends.length < maxFriends(p, 5)) expect(isInvite(met)).toBe(true);
        else expect(isInvite(met)).toBe(false);
      }
    }
    expect(hits).toBeGreaterThan(0);
  });

  it("full circle: no offer at payday, and never a meeting on the social square", () => {
    const slots = maxFriends(E.cur(idle()), 5);
    expect(slots).toBeLessThan(5); // starting Social level: some friends stay unmet
    const base = setFriends(idle(), POOL.slice(0, slots));
    const atPay = settle(choose(last(move(base, 9, [10, 11, 12])), "ok"));
    expect(isInvite(atPay)).toBe(false);
    expect(atPay.phase).toBe("idle");
    const passing = settle(last(move(base, 10, [11, 12, 13])));
    expect(isInvite(passing)).toBe(false);
    // social square, many seeds, with the mentor branch reachable: never a meeting card (lila / noa are unmet)
    for (let seed = 1; seed <= 300; seed++) {
      const s = setFriends({ ...idle(1), seed: seed * 7919 }, POOL.filter((id) => id !== "daichi").slice(0, slots)); // daichi unmet → the mentor meeting used to be offered
      for (const at of [3, 17]) {
        const landed = last(move(s, at - 1, [at]));
        expect(isMeet(landed)).toBe(false);
      }
    }
  });

  it("cash after salary 149 / 150 / 151: no offer / offer (cash → 0) / offer (cash → 1)", () => {
    const landed = last(move(setFriends(idle(), []), 9, [10, 11, 12]));
    const at = (cash: number) => choose(withPlayer(landed, (p) => ({ ...p, cash })), "ok");
    expect(isInvite(at(149))).toBe(false);
    for (const [cash, left] of [[150, 0], [151, 1]] as const) {
      const inv = at(cash);
      expect(isInvite(inv)).toBe(true);
      const done = choose(inv, "friend");
      expect(E.cur(done).cash).toBe(left);
      expect(E.cur(done).friends).toHaveLength(1);
      // ignore costs nothing
      expect(E.cur(choose(inv, "decline")).cash).toBe(cash);
    }
  });

  it("0 / 1 / 5 unmet friends", () => {
    const effects = SKILL_RULES.effects;
    SKILL_RULES.effects = false; // historic MAX_FRIENDS = 5, so 4 known still leaves a slot
    try {
      const at = (ids: string[]) => choose(last(move(setFriends(idle(), ids), 9, [10, 11, 12])), "ok");
      expect(isInvite(at(POOL))).toBe(false); // 0 unmet
      const one = at(POOL.slice(0, 4)); // 1 unmet
      expect(isInvite(one)).toBe(true);
      expect((one.card!.payload as { id: string }).id).toBe(POOL[4]);
      const five = at([]); // 5 unmet
      expect(isInvite(five)).toBe(true);
      const offered = new Set<string>();
      for (let seed = 1; seed <= 80; seed++) {
        const inv = choose(last(move({ ...setFriends(idle(), []), seed }, 9, [10, 11, 12])), "ok");
        offered.add((inv.card!.payload as { id: string }).id);
      }
      expect([...offered].sort()).toEqual([...POOL].sort());
    } finally {
      SKILL_RULES.effects = effects;
    }
  });

  it("deterministic: with enough Social, five paydays meet all five friends; the sixth offers nothing", () => {
    let s = withPlayer(setFriends(idle(), []), (p) => ({ ...p, cash: 10_000, skills: { ...(p as { skills?: object }).skills, social: 1e6 } as never }));
    expect(maxFriends(E.cur(s), 5)).toBeGreaterThanOrEqual(5);
    for (let k = 1; k <= 5; k++) {
      const inv = choose(last(move(s, 9, [10, 11, 12])), "ok");
      expect(isInvite(inv)).toBe(true);
      s = settle(choose(inv, k === 2 ? "biz" : "friend"));
      expect(E.cur(s).friends).toHaveLength(k);
    }
    expect(E.cur(s).friends.map((f) => f.id).sort()).toEqual([...POOL].sort());
    expect(E.cur(s).friends.filter((f) => f.role === "partner")).toHaveLength(1);
    expect(isInvite(choose(last(move(s, 9, [10, 11, 12])), "ok"))).toBe(false);
  });

  it("never in a tutorial game (scripted turns nor practice recap)", () => {
    let s = E.createMatch([{ characterId: "aoi", dreamId: "cafe" }], 5, true, { training: true });
    let guard = 0;
    let saw = false;
    while (guard++ < 200 && s.phase !== "win") {
      if (s.phase === "card") {
        saw ||= isInvite(s) || s.paydayInviteTurn !== undefined;
        s = choose(s, s.card!.choices[0]?.id ?? "ok");
      } else if (s.phase === "idle") s = E.reduce(s, { type: "ROLL" });
      else if (s.phase === "rolling") s = E.reduce(s, { type: "REVEAL" });
      else if (s.phase === "moving") { s = E.reduce(s, { type: "STEP" }); saw ||= s.paydayInviteTurn !== undefined; }
      else s = E.reduce(s, { type: "BREATHE" });
    }
    expect(s.practice).toBe(true);
    expect(saw).toBe(false);
    // practice recap after the script: still nothing
    const recap = { ...idle(), practice: true, training: null } as GameState;
    expect(isInvite(choose(last(move(setFriends(recap, []), 9, [10, 11, 12])), "ok"))).toBe(false);
  });

  it("saves: old saves without the field load as before; a queued invite survives hydrate", () => {
    const landed = last(move(setFriends(idle(), []), 10, [11, 12, 13]));
    const old = JSON.parse(JSON.stringify(landed));
    delete old.paydayInviteTurn;
    const h1 = E.hydrate(old);
    expect(h1.paydayInviteTurn).toBeUndefined();
    expect(isInvite(settle(h1))).toBe(false); // nothing queued: no offer
    const h2 = E.hydrate(JSON.parse(JSON.stringify(landed)));
    expect(h2.paydayInviteTurn).toBe(landed.turn);
    expect(isInvite(settle(h2))).toBe(true);
  });

  it("simulation: 200 games with vs without the invite (numbers only, no threshold)", () => {
    const CH = ["aoi", "ren", "mio", "sora"], DR = ["cafe", "studio", "retreat", "scholar"];
    const run = (withInvite: boolean) => {
      const partner: number[] = [], door: number[] = [], friendsAt20: number[] = [];
      let offers = 0, accepted = 0;
      for (let seed = 1; seed <= 200; seed++) {
        const rnd = prng(seed * 31 + 7);
        let s = E.createMatch([{ characterId: CH[seed % 4]!, dreamId: DR[(seed >> 2) % 4]! }], seed, true);
        let firstPartner: number | null = null, firstDoor: number | null = null, f20: number | null = null;
        for (let i = 0; i < 3000 && s.phase !== "win" && s.turn <= 120; i++) {
          const p = E.cur(s);
          if (firstPartner === null && p.friends.some((f) => f.role === "partner")) firstPartner = s.turn;
          if (firstDoor === null && (p.track !== "grind" || E.unlocked(p))) firstDoor = s.turn;
          if (f20 === null && s.turn >= 20) f20 = p.friends.length;
          if (s.phase === "card") {
            const ch = s.card!.choices;
            let id = ch.length ? ch[Math.floor(rnd() * ch.length)]!.id : "ok";
            if (isInvite(s)) {
              offers++;
              if (!withInvite) id = "decline";
              else if (id !== "decline") accepted++;
            }
            s = choose(s, id);
          } else if (s.phase === "idle") s = E.reduce(s, p.track === "grind" && E.unlocked(p) ? { type: "ENTER" } : p.cash < 0 ? { type: "BORROW" } : { type: "ROLL" });
          else if (s.phase === "rolling") s = E.reduce(s, { type: "REVEAL" });
          else if (s.phase === "moving") s = E.reduce(s, { type: "STEP" });
          else s = E.reduce(s, { type: "BREATHE" });
        }
        if (firstPartner !== null) partner.push(firstPartner);
        if (firstDoor !== null) door.push(firstDoor);
        friendsAt20.push(f20 ?? E.cur(s).friends.length);
      }
      const mean = (xs: number[]) => (xs.length ? +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(2) : null);
      const median = (xs: number[]) => { const v = [...xs].sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)]! : null; };
      return { games: 200, invitesOffered: offers, invitesAccepted: accepted, gamesWithPartner: partner.length, firstPartnerTurnMean: mean(partner), firstPartnerTurnMedian: median(partner), gamesDoorOpened: door.length, doorTurnMean: mean(door), doorTurnMedian: median(door), friendsAtTurn20Mean: mean(friendsAt20) };
    };
    const out = { withInvite: run(true), withoutInvite: run(false) };
    writeFileSync("/tmp/payday-invite-sim.json", JSON.stringify(out, null, 1));
    expect(out.withInvite.invitesOffered).toBeGreaterThan(0);
    expect(out.withoutInvite.invitesAccepted).toBe(0);
  });
});
