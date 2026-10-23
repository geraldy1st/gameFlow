/** Chez Aoi engine rules (home-data.ts, DOSSIER.md §9). */
import { describe, expect, it } from "vitest";
import * as E from "./engine";
import type { GameState, Player } from "./engine";
import { HOME_SHOP } from "./shop";
import { FURNITURE, HOME_ACTIONS, HOME_SLOTS_PER_TURN, actionTodayText, residentFor } from "./home-data";
import { GAUGE_SKILLS, SKILL_IDS } from "./skills";

function idle(seed = 3, cash = 5000): GameState {
  let s = E.createMatch([{ characterId: "aoi", dreamId: "cafe" }], seed, true);
  while (s.phase === "card") s = E.reduce(s, { type: "CHOICE", id: s.card!.choices[0]?.id ?? "ok" });
  return { ...s, players: s.players.map((p) => ({ ...p, cash })) };
}
const P = (s: GameState) => E.cur(s);
const go = (s: GameState, ...as: E.Action[]) => as.reduce((x, a) => E.reduce(x, a), s);

describe("Home v1: Immo Dada furniture, fixed layout", () => {
  it("apartment: $1,000, empty on purchase, bought once; out-of-stock housing refused", () => {
    expect(P(go(idle(3, 999), { type: "BUY_HOUSING", id: "kichijoji" })).housing).toBeUndefined();
    const s = go(idle(3, 1000), { type: "BUY_HOUSING", id: "kichijoji" });
    expect(P(s).cash).toBe(0);
    expect(P(s).housing).toEqual({ kichijoji: { slots: {} } });
    expect(P(s).homeCurrent).toBe("kichijoji");
    const oos = idle();
    expect(go(oos, { type: "BUY_HOUSING", id: "nakameguro" })).toBe(oos);
  });

  it("8 pieces at the agreed prices ($880), one of each; resale 50 %; placement refused", () => {
    const prices = Object.fromEntries(FURNITURE.map((f) => [f.id, f.price]));
    expect(prices).toEqual({ canape: 120, tele: 150, cuisiniere: 140, table: 80, lit: 130, bibliotheque: 90, douche: 110, lavabo: 60 });
    let s = go(idle(), { type: "BUY_HOUSING", id: "kichijoji" }, { type: "BUY_FURNITURE", id: "canape" });
    expect(P(s).cash).toBe(5000 - 1000 - 120);
    expect(go(s, { type: "BUY_FURNITURE", id: "canape" })).toBe(s); // already owned
    expect(go(s, { type: "HOME_PLACE", homeId: "kichijoji", slot: "salon-fl", itemId: "canape" })).toBe(s);
    expect(go(s, { type: "HOME_STORE", homeId: "kichijoji", slot: "salon-fl" })).toBe(s);
    expect(E.homeActionState(P(s), "canape")).toBe("open");
    s = go(s, { type: "SELL_FURNITURE", id: "canape" });
    expect(P(s).cash).toBe(5000 - 1000 - 120 + 60);
    expect(E.homeActionState(P(s), "canape")).toBe("locked"); // relocked
  });
});

describe("Home v1: actions and the home counter", () => {
  const all = (s: GameState) => go(s, { type: "BUY_HOUSING", id: "kichijoji" }, ...FURNITURE.map((f) => ({ type: "BUY_FURNITURE", id: f.id }) as E.Action));
  it("each action applies exactly its effects and uses 1 slot; no turn spent", () => {
    for (const a of HOME_ACTIONS) {
      const base = all(idle());
      const s = go(base, { type: "HOME_ACT", id: a.id });
      expect(s.turn).toBe(base.turn);
      expect(P(s).homeDay).toMatchObject({ used: 1, done: { [a.id]: 1 } });
      for (const id of SKILL_IDS) {
        const n = a.effects[id] ?? 0;
        if ((GAUGE_SKILLS as readonly string[]).includes(id)) expect(P(s).vitals[id as "health"], `${a.id} ${id}`).toBe(Math.min(100, P(base).vitals[id as "health"] + n));
        else expect(P(s).skills?.[id] ?? 0, `${a.id} ${id}`).toBe((P(base).skills?.[id] ?? 0) + n);
      }
    }
    expect(HOME_ACTIONS.map((a) => [a.id, a.effects])).toEqual([
      ["canape", { content: 2, health: 1 }], ["tele", { content: 3 }], ["cuisiner", { creativity: 2, health: 1 }], ["manger", { health: 3 }],
      ["dormir", { health: 2, discipline: 2 }], ["lire", { mind: 3 }], ["douche", { health: 2, charisma: 1 }], ["dents", { health: 1, charisma: 2 }],
    ]);
  });

  it("locked without its furniture; 3 slots then full; fresh counter next turn; old 'nap' id = canape", () => {
    const home = go(idle(), { type: "BUY_HOUSING", id: "kichijoji" });
    expect(go(home, { type: "HOME_ACT", id: "lire" })).toBe(home);
    expect(E.homeActionState(P(home), "lire")).toBe("locked");
    expect(go(idle(), { type: "HOME_ACT", id: "canape" }).players[0]!.homeDay).toBeUndefined(); // no home
    let s = all(idle());
    s = go(s, { type: "HOME_ACT", id: "nap" }, { type: "HOME_ACT", id: "lire" }, { type: "HOME_ACT", id: "douche" });
    expect(P(s).homeDay).toMatchObject({ used: HOME_SLOTS_PER_TURN, done: { canape: 1, lire: 1, douche: 1 } });
    expect(E.homeActionState(P(s), "tele")).toBe("full");
    expect(go(s, { type: "HOME_ACT", id: "tele" })).toBe(s);
    const next = { ...s, players: s.players.map((p) => ({ ...p, turns: p.turns + 1 })) };
    expect(E.homeActionState(P(next), "tele")).toBe("open");
  });

  it("daily limit: lire 3 a day (1,2,3 ok, 4th refused), others once (2nd refused); both limits; reset next day", () => {
    const nextDay = (x: E.GameState) => ({ ...x, players: x.players.map((p) => ({ ...p, turns: p.turns + 1 })) });
    let s = all(idle());
    expect(HOME_ACTIONS.find((a) => a.id === "lire")!.dailyLimit).toBe(3);
    expect(HOME_ACTIONS.filter((a) => a.id !== "lire").every((a) => a.dailyLimit === undefined)).toBe(true);
    for (const n of [1, 2, 3]) {
      expect(E.homeActionLeft(P(s), "lire")).toBe(4 - n);
      s = go(s, { type: "HOME_ACT", id: "lire" });
      expect(P(s).homeDay!.done.lire).toBe(n);
    }
    expect(E.homeActionState(P(s), "lire")).toBe("done");
    s = nextDay(s);
    expect(E.homeActionLeft(P(s), "lire")).toBe(3);
    s = go(s, { type: "HOME_ACT", id: "lire" }, { type: "HOME_ACT", id: "lire" });
    expect(P(s).homeDay!.done.lire).toBe(2);
    s = go(s, { type: "HOME_ACT", id: "canape" });
    expect(E.homeActionState(P(s), "lire")).toBe("full"); // 3 slots used, 1 lire left
    expect(go(s, { type: "HOME_ACT", id: "lire" })).toBe(s); // 4th of the day refused (slots)
    // other action: 1 ok, 2 refused
    let o = all(idle());
    o = go(o, { type: "HOME_ACT", id: "tele" });
    expect(P(o).homeDay).toMatchObject({ used: 1, done: { tele: 1 } });
    expect(E.homeActionState(P(o), "tele")).toBe("done");
    expect(go(o, { type: "HOME_ACT", id: "tele" })).toBe(o);
    o = nextDay(o);
    expect(E.homeActionState(P(o), "tele")).toBe("open");
    expect(P(go(o, { type: "HOME_ACT", id: "tele" })).homeDay).toMatchObject({ used: 1, done: { tele: 1 } });
  });

  it("lire 4th refused by the daily limit itself", () => {
    let s = all(idle());
    s = go(s, { type: "HOME_ACT", id: "lire" }, { type: "HOME_ACT", id: "lire" }, { type: "HOME_ACT", id: "lire" });
    expect(P(s).homeDay).toMatchObject({ used: 3, done: { lire: 3 } });
    expect(E.homeActionState(P(s), "lire")).toBe("done");
    expect(go(s, { type: "HOME_ACT", id: "lire" })).toBe(s);
  });

  it("labels: done today / remaining count (fr plurals)", () => {
    const t = (k: string, v?: Record<string, string | number>) => k.replace("{n}", String(v?.n ?? ""));
    expect(actionTodayText(t, 0, 1)).toBe("Already done today");
    expect(actionTodayText(t, 1, 1)).toBe("");
    expect(actionTodayText(t, 2, 3)).toBe("2 times left today");
    expect(actionTodayText(t, 1, 3)).toBe("1 time left today");
    // DEF-HOME-05: the label follows the blocking reason
    expect(actionTodayText(t, 1, 3, true)).toBe("No time slot left today");
    expect(actionTodayText(t, 1, 1, true)).toBe("No time slot left today");
    expect(actionTodayText(t, 0, 3, true)).toBe("Already done today");
  });

  it("refused in the tutorial (script and practice game)", () => {
    const t = E.createMatch([{ characterId: "aoi", dreamId: "cafe" }], 3, true, { training: true });
    for (const a of [{ type: "BUY_HOUSING", id: "kichijoji" }, { type: "BUY_FURNITURE", id: "lavabo" }, { type: "HOME_ACT", id: "canape" }] as E.Action[]) {
      expect(E.reduce(t, a)).toBe(t);
      const pr = { ...idle(), practice: true };
      expect(E.reduce(pr, a)).toBe(pr);
    }
  });
});

describe("Home v1: saves and migration", () => {
  it("old saves without a home: no home field appears", () => {
    const h = E.hydrate(JSON.parse(JSON.stringify(idle())));
    for (const k of ["housing", "homeCurrent", "furniture", "homeDay"]) expect(k in h.players[0]!).toBe(false);
  });

  it("old Chez Aoi save (free placement, Sieste) loads: converted, the rest refunded at full price, idempotent", () => {
    const old = JSON.parse(JSON.stringify(idle(3, 100)));
    Object.assign(old.players[0] as Player, {
      furniture: { sofa: 2, futon: 1, plant: 1, desk: 1, "coffee-table": 1, "dining-table": 1, ghost: 3, bookshelf: -1 },
      housing: { kichijoji: { slots: { "salon-fl": "sofa", "chambre-bl": "desk", "sdb-c": "plant" } }, castle: { slots: {} } },
      homeCurrent: "castle",
      homeDay: { turn: 2, used: 4, done: { nap: 2 } },
    });
    const h = E.hydrate(old);
    const p = h.players[0]!;
    expect(p.furniture).toEqual({ canape: 1, lit: 1, table: 1 });
    expect(p.cash).toBe(100 + 420 + 60 + 380 + 120); // 2nd sofa, plant, desk, coffee table
    expect(p.housing).toEqual({ kichijoji: { slots: {} } });
    expect(p.homeCurrent).toBe("kichijoji");
    expect(p.homeDay).toEqual({ turn: 2, used: 3, done: { canape: 2 } });
    expect(E.homeActionState(p, "canape")).not.toBe("locked");
    const again = E.hydrate(JSON.parse(JSON.stringify(h)));
    expect(again.players[0]).toEqual(p);
  });

  it("resident: keyed by character, Aoi as the fallback", () => {
    expect(residentFor("aoi").id).toBe("aoi");
    expect(residentFor("ren").id).toBe("aoi");
    expect(residentFor(undefined).id).toBe("aoi");
  });
});

describe("Chez Aoi: legacy home items (R4)", () => {
  it("an old save with homeOwned/homeOn loads and keeps its bonuses", () => {
    const old = JSON.parse(JSON.stringify(idle()));
    const [a, b] = [HOME_SHOP[0]!.id, HOME_SHOP[1]!.id];
    Object.assign(old.players[0], { level: 2, homeOwned: [a, b], homeOn: [a], vitals: { ...old.players[0].vitals } });
    for (const k of ["housing", "homeCurrent", "furniture", "homeDay"]) delete old.players[0][k];
    const h = E.hydrate(old);
    const p = h.players[0]!;
    expect(p.homeOwned).toEqual([a, b]);
    expect(p.homeOn).toEqual([a]);
    expect(p.vitals).toEqual(old.players[0].vitals);
    for (const k of ["housing", "homeCurrent", "furniture", "homeDay"]) expect(k in p).toBe(false);
    expect(E.hydrate(JSON.parse(JSON.stringify(h)))).toEqual(h);
    const t = E.reduce(h, { type: "TOGGLE_HOME", id: b } as E.Action);
    expect(t.players[0]!.homeOn).toContain(b);
  });
});
