/**
 * Refacto batch 6: the article / shop adapter must give exactly today's ids, prices, unlocks, effects and order.
 * Each expectation recomputes the legacy answer from the old tables (tuning.ts, life.ts, shop.ts) directly.
 */
import { describe, expect, it } from "vitest";
import { ARTICLES, BUY_ACTION, SHOP_DEFINITIONS, articleById, articlesOfShop, shopById, shopOfArticle, shopOfType } from "./articles";
import { OUTFITS } from "./life";
import { CLOTH_PRICE, HOME_SHOP } from "./shop";
import { goodById, shopOfGood } from "./shops";
import { GOODS, SHOPS } from "./tuning";

/** The old ShopView list: [id, base price, icon] per shop. */
function legacyList(id: string): [string, number, string][] {
  const sh = SHOPS.find((s) => s.id === id)!;
  if (sh.sells === "clothes") return OUTFITS.filter((x) => x.id !== "jeans").map((o) => [o.id, (CLOTH_PRICE as Record<string, number>)[o.id]!, o.id === "night" ? "dress" : o.id === "shirt" || o.id === "tee" ? "shirt" : "jeans"]);
  if (sh.sells === "home") return HOME_SHOP.map((h) => [h.id, h.cost, "lamp"]);
  return sh.sells.map((g) => goodById(g)).filter((g) => !!g).map((g) => [g!.id, g!.price, g!.icon]);
}

describe("article / shop adapter (batch 6)", () => {
  it("shops: same ids, order, names, icons, colours and unlocks", () => {
    expect(SHOP_DEFINITIONS.map((s) => [s.id, s.name, s.icon, s.color, s.unlock])).toEqual(SHOPS.map((s) => [s.id, s.name, s.icon, s.color, s.unlock]));
    for (const s of SHOPS) expect(shopById(s.id)?.id).toBe(s.id);
    expect(SHOP_DEFINITIONS.some((s) => s.page !== undefined)).toBe(false);
  });

  it("each shop lists the same articles, prices and icons, in the same order", () => {
    for (const s of SHOP_DEFINITIONS) expect(articlesOfShop(s).map((a) => [a.id, a.price, a.icon]), s.id).toEqual(legacyList(s.id));
  });

  it("goods keep every field; the good's shop is the same object as before", () => {
    for (const g of GOODS) {
      const a = articleById("good", g.id)!;
      expect({ id: a.id, name: a.name, note: a.note, icon: a.icon, cat: a.cat, price: a.price, repeat: a.repeat, ...a.effects }).toEqual({ id: g.id, name: g.name, note: g.note, icon: g.icon, cat: g.cat, price: g.price, repeat: g.repeat, monthly: g.monthly, passive: g.passive, xp: g.xp, gauge: g.gauge });
      expect(shopOfGood(g.id)).toBe(SHOPS.find((s) => Array.isArray(s.sells) && s.sells.includes(g.id)));
      expect(shopOfArticle("good", g.id)?.id).toBe(shopOfGood(g.id)?.id);
    }
    expect(shopOfGood("nope")).toBeUndefined();
  });

  it("clothes and home items keep their prices and effects", () => {
    for (const [id, price] of Object.entries(CLOTH_PRICE)) expect(articleById("cloth", id)?.price).toBe(price);
    expect(articleById("cloth", "jeans")).toBeUndefined();
    for (const h of HOME_SHOP) expect(articleById("home-item", h.id)).toMatchObject({ name: h.name, price: h.cost, effects: { bump: h.bump } });
    expect(shopOfType("cloth")).toBe(shopById("clothes"));
    expect(shopOfType("home-item")).toBe(shopById("home"));
  });

  it("the home-project types and fields are declared but unused", () => {
    expect(ARTICLES.filter((a) => a.type === "home" || a.type === "furniture")).toEqual([]);
    expect(ARTICLES.filter((a) => a.stock !== undefined || a.resaleRate !== undefined || a.placeable || a.homeType)).toEqual([]);
    expect(shopOfType("home")).toBeUndefined();
    expect(BUY_ACTION).toEqual({ good: "BUY_GOOD", cloth: "BUY_CLOTH", "home-item": "BUY_HOME" });
    expect(new Set(ARTICLES.map((a) => `${a.type}:${a.id}`)).size).toBe(ARTICLES.length);
  });
});
