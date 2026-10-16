/**
 * Article and shop data model (refacto batch 6, PLAN.md §3).
 *
 * One `ArticleDef` per thing the player can buy, whatever its type, and one `ShopDefinition` per shop, which sells
 * article types (and, optionally, a fixed list of ids). This module is an ADAPTER: it reads today's tables unchanged —
 * tuning.ts GOODS / SHOPS, life.ts OUTFITS, shop.ts CLOTH_PRICE / HOME_SHOP — and keeps their ids, prices, unlocks and
 * effects. The engine rules (doBuyGood, doBuyCloth, doBuyHome) are untouched; goods-inventory.test.ts freezes them.
 *
 * Prepared for the home project (home-plan/DOSSIER.md §9), NOT implemented: the article types "home" and "furniture"
 * and the optional fields `stock`, `resaleRate`, `placeable`, `homeType`, `page` exist but no table fills them yet.
 * Pure, no engine import.
 */
import { OUTFITS, type OutfitId } from "./life";
import { CLOTH_PRICE, HOME_SHOP, type HomeItem } from "./shop";
import { GOODS, SHOPS, type GoodDef, type GoodsCategory, type ShopDef, type Unlock } from "./tuning";

/**
 * "good": tuning.ts GOODS; "cloth": life.ts OUTFITS (priced in shop.ts CLOTH_PRICE); "home-item": shop.ts HOME_SHOP.
 * Reserved for the home project (no article yet): "home" (a dwelling), "furniture" (placed in a room).
 */
export type ArticleType = "good" | "cloth" | "home-item" | "home" | "furniture";

/** Engine action that buys an article of this type (reserved types have none yet). */
export const BUY_ACTION = { good: "BUY_GOOD", cloth: "BUY_CLOTH", "home-item": "BUY_HOME" } as const satisfies Partial<Record<ArticleType, string>>;

export interface ArticleEffects {
  /** Monthly expense change (negative = saves money each month). Goods. */
  monthly?: number;
  /** Passive income $/mo (an asset on the ledger). Goods. */
  passive?: number;
  /** Skill XP on purchase. Goods. */
  xp?: GoodDef["xp"];
  /** Gauge points on purchase. Goods. */
  gauge?: GoodDef["gauge"];
  /** Gauge points while equipped (toggled with TOGGLE_HOME). Home items. */
  bump?: HomeItem["bump"];
}

export interface ArticleDef {
  id: string;
  type: ArticleType;
  /** English text key. */
  name: string;
  /** English text key (goods); clothes and home items build their note in the UI. */
  note?: string;
  icon: string;
  /** Day › Goods tab of a good. */
  cat?: GoodsCategory;
  /** Base price before the Negotiation discount (engine shopPrice). */
  price: number;
  /** Can be bought again (books). */
  repeat?: boolean;
  effects: ArticleEffects;
  /** Home project, unused for now: units left (0 = "out of stock"; absent = unlimited). */
  stock?: number;
  /** Home project, unused for now: resale share of the purchase price from the inventory (DOSSIER §9: 0.5). */
  resaleRate?: number;
  /** Home project, unused for now: furniture placed in a room ({ itemId, x, y, flip }). */
  placeable?: boolean;
  /** Home project, unused for now: scene / home type of a dwelling ("appart-2ldk"). */
  homeType?: string;
}

export interface ShopSells {
  /** Article types on sale. */
  types: ArticleType[];
  /** Only these ids, in this order (GOODS shops). Absent: every article of the types, in table order. */
  ids?: string[];
}

export interface ShopDefinition {
  id: string;
  name: string;
  icon: string;
  color: string;
  unlock: Unlock;
  sells: ShopSells;
  /** Home project, unused for now: shown on its own page instead of the Activities shop list ("Immo Dada"). */
  page?: string;
}

/* ------------------------------------------------------------------ adapter */

const clothIcon = (id: string) => (id === "night" ? "dress" : id === "shirt" || id === "tee" ? "shirt" : "jeans");

function fromGood(g: GoodDef): ArticleDef {
  const effects: ArticleEffects = {};
  if (g.monthly !== undefined) effects.monthly = g.monthly;
  if (g.passive !== undefined) effects.passive = g.passive;
  if (g.xp !== undefined) effects.xp = g.xp;
  if (g.gauge !== undefined) effects.gauge = g.gauge;
  return { id: g.id, type: "good", name: g.name, note: g.note, icon: g.icon, cat: g.cat, price: g.price, ...(g.repeat ? { repeat: true } : {}), effects };
}

/** Every buyable article, by type then in each table's order. Jeans (never sold) is not an article. */
export const ARTICLES: readonly ArticleDef[] = [
  ...GOODS.map(fromGood),
  ...OUTFITS.filter((o) => o.id !== "jeans").map((o): ArticleDef => ({
    id: o.id,
    type: "cloth",
    name: o.name,
    icon: clothIcon(o.id),
    price: CLOTH_PRICE[o.id as Exclude<OutfitId, "jeans">],
    effects: {},
  })),
  ...HOME_SHOP.map((h): ArticleDef => ({ id: h.id, type: "home-item", name: h.name, icon: "lamp", price: h.cost, effects: { bump: h.bump } })),
];

function sellsOf(sh: ShopDef): ShopSells {
  if (sh.sells === "clothes") return { types: ["cloth"] };
  if (sh.sells === "home") return { types: ["home-item"] };
  return { types: ["good"], ids: [...sh.sells] };
}

/** Every shop, in tuning.ts SHOPS order (Activities list). */
export const SHOP_DEFINITIONS: ShopDefinition[] = SHOPS.map((sh) => ({ id: sh.id, name: sh.name, icon: sh.icon, color: sh.color, unlock: sh.unlock, sells: sellsOf(sh) }));

export function articleById(type: ArticleType, id: string): ArticleDef | undefined {
  return ARTICLES.find((a) => a.type === type && a.id === id);
}

export function shopById(id: string): ShopDefinition | undefined {
  return SHOP_DEFINITIONS.find((s) => s.id === id);
}

/** Whether `shop` sells article `a`. */
export function shopSells(shop: ShopDefinition, a: Pick<ArticleDef, "type" | "id">): boolean {
  return shop.sells.types.includes(a.type) && (!shop.sells.ids || shop.sells.ids.includes(a.id));
}

/** The articles on sale in a shop, in display order. */
export function articlesOfShop(shop: ShopDefinition): ArticleDef[] {
  if (shop.sells.ids) {
    const ids = shop.sells.ids;
    return ids.map((id) => ARTICLES.find((a) => shop.sells.types.includes(a.type) && a.id === id)).filter((a): a is ArticleDef => !!a);
  }
  return ARTICLES.filter((a) => shop.sells.types.includes(a.type));
}

/** The first shop (SHOPS order) that sells an article of this type and id. */
export function shopOfArticle(type: ArticleType, id: string): ShopDefinition | undefined {
  return SHOP_DEFINITIONS.find((s) => shopSells(s, { type, id }));
}

/** First shop selling any article of a type (the wardrobe / home tabs name it in their "On sale at" note). */
export function shopOfType(type: ArticleType): ShopDefinition | undefined {
  return SHOP_DEFINITIONS.find((s) => s.sells.types.includes(type));
}
