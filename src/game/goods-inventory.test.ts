/**
 * Refacto batch 5bis: inventory of every article (goods, clothes, home items), frozen as a snapshot before the
 * article model (batch 6) rewrites how shops are read. For each article: the data (price, unlock, effects) and what
 * the engine actually does when it is bought / worn / toggled (cash, monthly expenses, gauges, skill XP, assets).
 * A deliberate price or rule change shows up here as a reviewed snapshot diff.
 */
import { describe, expect, it } from "vitest";
import * as E from "./engine";
import type { Action, GameState, Player } from "./engine";
import { CLOTH_PRICE, HOME_LEVEL, HOME_SHOP } from "./shop";
import { OUTFITS } from "./life";
import { unlockState } from "./shops";
import { SKILL_IDS } from "./skills";
import { GOODS, SHOPS, SOON_GOODS } from "./tuning";

/** A player for whom every shop is open, with no Negotiation discount (nego 0), on an idle turn. */
function richState(): GameState {
  const s = E.createMatch([{ characterId: "aoi", dreamId: "cafe" }], 99, true);
  const p = E.cur(s);
  const skills = Object.fromEntries(SKILL_IDS.map((id) => [id, id === "nego" ? 0 : 20000]));
  const rich: Player = {
    ...p,
    cash: 1_000_000,
    level: 2,
    turns: 30,
    skills,
    assets: [...p.assets, { id: "fp-asset", name: "Test rent", cashFlow: 3000, down: 0, cost: 0 }],
  };
  return { ...s, phase: "idle", card: null, players: [rich] } as GameState;
}

function diff(a: Player, b: Player) {
  const num = (x: Record<string, number> | undefined, y: Record<string, number> | undefined) => {
    const out: Record<string, number> = {};
    for (const k of new Set([...Object.keys(x ?? {}), ...Object.keys(y ?? {})])) {
      const d = Math.round(((y?.[k] ?? 0) - (x?.[k] ?? 0)) * 1000) / 1000;
      if (d) out[k] = d;
    }
    return out;
  };
  return {
    cash: b.cash - a.cash,
    expenseMods: b.expenseMods - a.expenseMods,
    vitals: num(a.vitals as unknown as Record<string, number>, b.vitals as unknown as Record<string, number>),
    skills: num(a.skills as Record<string, number>, b.skills as Record<string, number>),
    passive: E.statement(b).passive - E.statement(a).passive,
    newAssets: b.assets.filter((x) => !a.assets.some((y) => y.id === x.id)).map((x) => ({ name: x.name, cashFlow: x.cashFlow, down: x.down, cost: x.cost })),
    goods: b.goods, outfit: b.outfit, ownedOutfits: b.ownedOutfits, homeOwned: b.homeOwned, homeOn: b.homeOn,
  };
}

function effect(s: GameState, action: Action) {
  const next = E.reduce(s, action);
  if (next === s) return "refused";
  return { ...diff(E.cur(s), E.cur(next)), journal: next.history[0] };
}

describe("article inventory (batch 5bis)", () => {
  it("shops: unlock rule, what they sell, open at the start of a game", () => {
    const start = E.createMatch([{ characterId: "aoi", dreamId: "cafe" }], 1, true);
    const pr = E.progressOf(E.cur(start));
    expect(SHOPS.map((sh) => ({ id: sh.id, unlock: sh.unlock, sells: sh.sells, openAtStart: unlockState(sh.unlock, pr).open, openRich: unlockState(sh.unlock, E.progressOf(E.cur(richState()))).open }))).toMatchSnapshot();
    expect({ HOME_LEVEL, SOON_GOODS }).toMatchSnapshot();
  });

  it("goods: data and engine effect of one purchase (and a second one)", () => {
    const s = richState();
    expect(Object.fromEntries(GOODS.map((g) => {
      const once = E.reduce(s, { type: "BUY_GOOD", id: g.id });
      return [g.id, { data: g, buy: effect(s, { type: "BUY_GOOD", id: g.id }), again: effect(once, { type: "BUY_GOOD", id: g.id }) }];
    }))).toMatchSnapshot();
    expect(effect(s, { type: "BUY_GOOD", id: "nope" })).toBe("refused");
  });

  it("clothes: price, buy, wear", () => {
    const s = richState();
    expect(Object.fromEntries(OUTFITS.map((o) => {
      const bought = E.reduce(s, { type: "BUY_CLOTH", outfit: o.id });
      return [o.id, { note: o.note, price: (CLOTH_PRICE as Record<string, number>)[o.id] ?? null, buy: effect(s, { type: "BUY_CLOTH", outfit: o.id }), wear: effect(bought, { type: "WEAR", outfit: o.id }) }];
    }))).toMatchSnapshot();
  });

  it("home shop: price, gauges, buy, toggle off and on", () => {
    const s = richState();
    expect(Object.fromEntries(HOME_SHOP.map((it) => {
      const bought = E.reduce(s, { type: "BUY_HOME", id: it.id });
      const off = E.reduce(bought, { type: "TOGGLE_HOME", id: it.id });
      return [it.id, { data: it, buy: effect(s, { type: "BUY_HOME", id: it.id }), off: effect(bought, { type: "TOGGLE_HOME", id: it.id }), on: effect(off, { type: "TOGGLE_HOME", id: it.id }) }];
    }))).toMatchSnapshot();
    const low = { ...richState(), players: [{ ...E.cur(richState()), level: 1 }] } as GameState;
    expect(effect(low, { type: "BUY_HOME", id: HOME_SHOP[0]!.id })).toBe("refused");
  });
});
