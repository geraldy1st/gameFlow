/** Chez Aoi engine rules (home-data.ts, DOSSIER.md §9). */
import { describe, expect, it } from "vitest";
import * as E from "./engine";
import type { GameState, Player } from "./engine";
import { HOME_SHOP } from "./shop";
import { FURNITURE, HOME_SLOTS_PER_TURN, residentFor } from "./home-data";

function idle(seed = 3, cash = 5000): GameState {
  let s = E.createMatch([{ characterId: "aoi", dreamId: "cafe" }], seed, true);
  while (s.phase === "card") s = E.reduce(s, { type: "CHOICE", id: s.card!.choices[0]?.id ?? "ok" });
  return { ...s, players: s.players.map((p) => ({ ...p, cash })) };
}
const P = (s: GameState) => E.cur(s);
const go = (s: GameState, ...as: E.Action[]) => as.reduce((x, a) => E.reduce(x, a), s);
const sofa = FURNITURE.find((f) => f.id === "sofa")!;

describe("Chez Aoi: Immo Dada, inventory, slots", () => {
  it("apartment: $1,000, empty on purchase, bought once; out-of-stock housing refused", () => {
    expect(P(go(idle(3, 999), { type: "BUY_HOUSING", id: "kichijoji" })).housing).toBeUndefined();
    const s = go(idle(3, 1000), { type: "BUY_HOUSING", id: "kichijoji" });
    expect(P(s).cash).toBe(0);
    expect(P(s).housing).toEqual({ kichijoji: { slots: {} } });
    expect(P(s).homeCurrent).toBe("kichijoji");
    const again = go({ ...s, players: s.players.map((p) => ({ ...p, cash: 5000 })) }, { type: "BUY_HOUSING", id: "kichijoji" });
    expect(P(again).cash).toBe(5000);
    const oos = idle();
    expect(go(oos, { type: "BUY_HOUSING", id: "nakameguro" })).toBe(oos);
  });

  it("supplies go to the inventory; place, swap, store; slot limits; resale 50 % of free items only", () => {
    let s = go(idle(), { type: "BUY_HOUSING", id: "kichijoji" }, { type: "BUY_FURNITURE", id: "sofa" }, { type: "BUY_FURNITURE", id: "plant" });
    expect(P(s).cash).toBe(5000 - 1000 - sofa.price - 60);
    expect(E.furnitureFree(P(s), "sofa")).toBe(1);
    s = go(s, { type: "HOME_PLACE", homeId: "kichijoji", slot: "salon-fl", itemId: "sofa" });
    expect(E.furnitureFree(P(s), "sofa")).toBe(0);
    expect(go(s, { type: "HOME_PLACE", homeId: "kichijoji", slot: "salon-fr", itemId: "sofa" })).toBe(s); // none left
    expect(go(s, { type: "HOME_PLACE", homeId: "kichijoji", slot: "sdb-c", itemId: "sofa" })).toBe(s); // bathroom: plant only
    expect(go(s, { type: "SELL_FURNITURE", id: "sofa" })).toBe(s); // placed: not sellable
    s = go(s, { type: "HOME_PLACE", homeId: "kichijoji", slot: "salon-fl", itemId: "plant" }); // swap: sofa back to inventory
    expect(P(s).housing!.kichijoji!.slots).toEqual({ "salon-fl": "plant" });
    expect(E.furnitureFree(P(s), "sofa")).toBe(1);
    const cash = P(s).cash;
    s = go(s, { type: "SELL_FURNITURE", id: "sofa" });
    expect(P(s).cash).toBe(cash + Math.floor(sofa.price / 2));
    expect(P(s).furniture).toEqual({ plant: 1 });
    s = go(s, { type: "HOME_STORE", homeId: "kichijoji", slot: "salon-fl" });
    expect(P(s).housing!.kichijoji!.slots).toEqual({});
    expect(E.furnitureFree(P(s), "plant")).toBe(1);
  });
});

describe("Chez Aoi: Sieste and the home counter", () => {
  it("+5 on every gauge, no turn spent; 100 / 50 / 25 % then no slot left; fresh counter next turn", () => {
    const base = go(idle(), { type: "BUY_HOUSING", id: "kichijoji" });
    expect(go(idle(), { type: "HOME_ACT", id: "nap" }).players[0]!.homeDay).toBeUndefined(); // no home: refused
    const v0 = P(base).vitals;
    let s = go(base, { type: "HOME_ACT", id: "nap" });
    expect(s.turn).toBe(base.turn);
    expect(s.phase).toBe("idle");
    for (const k of ["content", "social", "mind", "luck", "health"] as const) expect(P(s).vitals[k]).toBe(Math.min(100, v0[k] + 5));
    s = go(s, { type: "HOME_ACT", id: "nap" }, { type: "HOME_ACT", id: "nap" });
    expect(P(s).homeDay).toMatchObject({ used: HOME_SLOTS_PER_TURN, done: { nap: 3 } });
    expect(E.napPoints(P(s))).toBe(0);
    expect(go(s, { type: "HOME_ACT", id: "nap" })).toBe(s);
    const next = { ...s, players: s.players.map((p) => ({ ...p, turns: p.turns + 1 })) };
    expect(E.napPoints(P(next))).toBe(5);
  });

  it("refused in the tutorial (script and practice game)", () => {
    const t = E.createMatch([{ characterId: "aoi", dreamId: "cafe" }], 3, true, { training: true });
    for (const a of [{ type: "BUY_HOUSING", id: "kichijoji" }, { type: "BUY_FURNITURE", id: "plant" }, { type: "HOME_ACT", id: "nap" }] as E.Action[]) {
      expect(E.reduce(t, a)).toBe(t);
      const pr = { ...idle(), practice: true };
      expect(E.reduce(pr, a)).toBe(pr);
    }
  });
});

describe("Chez Aoi: saves", () => {
  it("old saves: no home field appears; sanitising is idempotent", () => {
    const old = JSON.parse(JSON.stringify(idle()));
    const h = E.hydrate(old);
    for (const k of ["housing", "homeCurrent", "furniture", "homeDay"]) expect(k in h.players[0]!).toBe(false);
    const bad = JSON.parse(JSON.stringify(idle()));
    Object.assign(bad.players[0] as Player, {
      furniture: { sofa: 1, plant: -2, desk: 1.7, ghost: 3 },
      housing: { kichijoji: { slots: { "salon-fl": "sofa", "salon-fr": "sofa", "sdb-c": "desk", "nowhere": "desk", "chambre-bl": "desk" } }, castle: { slots: {} } },
      homeCurrent: "castle",
      homeDay: { turn: 2, used: 4, done: { nap: -1 } },
    });
    const h1 = E.hydrate(bad);
    const p = h1.players[0]!;
    expect(p.furniture).toEqual({ sofa: 1, desk: 1 });
    expect(p.housing).toEqual({ kichijoji: { slots: { "salon-fl": "sofa", "chambre-bl": "desk" } } });
    expect(p.homeCurrent).toBe("kichijoji");
    expect(p.homeDay).toEqual({ turn: 2, used: 3, done: { nap: 0 } });
    expect(E.hydrate(JSON.parse(JSON.stringify(h1))).players[0]).toEqual(p);
    const neg = JSON.parse(JSON.stringify(idle()));
    neg.players[0].homeDay = { turn: 1, used: -1, done: {} };
    expect(E.hydrate(neg).players[0]!.homeDay!.used).toBe(0);
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
