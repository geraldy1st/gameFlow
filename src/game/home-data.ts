/**
 * Home v1 "appartement d'Aoi" (Mirage's home3 prototype, validated by Geraldy 23/10/2026): data only, engine-free.
 * Housing sold by Immo Dada, 8 pieces of furniture in a fixed layout (no free placement), 4 rooms and 8 data-driven
 * actions, each played as a video sequence go → loop → return (scenes/home/HomeLayer.tsx).
 * Clips: the 24 animation clips the prototype serves, re-encoded (H.264 CRF 26, no audio), public/game/scenes/home3/.
 */
import type { SkillId } from "./skills";

export type RoomId = "salon" | "cuisine" | "chambre" | "sdb";

export interface HousingDef {
  id: string;
  name: string;
  /** Price at Immo Dada. The apartment's $1,000 is a temporary test price (Geraldy). */
  price: number;
  /** false = listed as "out of stock" for now. */
  inStock: boolean;
  type: "appart-2ldk";
}

export const HOUSING: HousingDef[] = [
  { id: "kichijoji", name: "Kichijoji apartment", price: 1000, inStock: true, type: "appart-2ldk" },
  { id: "nakameguro", name: "Nakameguro loft", price: 1800, inStock: false, type: "appart-2ldk" },
  { id: "shimokita", name: "Shimokitazawa house", price: 2600, inStock: false, type: "appart-2ldk" },
];

export interface FurnitureDef {
  id: string;
  name: string;
  /** Immo Dada price (Ash, validated by Geraldy 23/10/2026: $880 for the 8). One of each at most. */
  price: number;
  room: RoomId;
  icon: string;
}

export const FURNITURE: FurnitureDef[] = [
  { id: "canape", name: "Sofa", price: 120, room: "salon", icon: "house" },
  { id: "tele", name: "TV", price: 150, room: "salon", icon: "game" },
  { id: "cuisiniere", name: "Stove", price: 140, room: "cuisine", icon: "brush" },
  { id: "table", name: "Table", price: 80, room: "cuisine", icon: "people" },
  { id: "lit", name: "Bed", price: 130, room: "chambre", icon: "moon" },
  { id: "bibliotheque", name: "Bookshelf", price: 90, room: "chambre", icon: "book" },
  { id: "douche", name: "Shower", price: 110, room: "sdb", icon: "star" },
  { id: "lavabo", name: "Washbasin", price: 60, room: "sdb", icon: "clover" },
];

/**
 * Furniture of the previous Chez Aoi shop (home-aoi, free placement) → new furniture, or null = removed and
 * refunded at its full purchase price on load (Geraldy 23/10/2026).
 */
export const LEGACY_FURNITURE: Record<string, { price: number; to: string | null }> = {
  sofa: { price: 420, to: "canape" },
  futon: { price: 180, to: "lit" },
  bookshelf: { price: 220, to: "bibliotheque" },
  "tv-stand": { price: 320, to: "tele" },
  "dining-table": { price: 300, to: "table" },
  desk: { price: 380, to: null },
  plant: { price: 60, to: null },
  "coffee-table": { price: 120, to: null },
};

/** Resale from the inventory: 50 % of the purchase price, rounded down to the dollar (Geraldy). */
export const RESALE_RATE = 0.5;

export interface RoomDef {
  id: RoomId;
  name: string;
  /** Clip folder (root-absolute, rebased by the Pages build). */
  dir: string;
  /** Still shown when standing in the room. */
  start: string;
}

export const ROOMS: RoomDef[] = [
  { id: "salon", name: "Living room", dir: "/game/scenes/home3/salon/", start: "/game/scenes/home3/salon/canape-depart.jpg" },
  { id: "cuisine", name: "Kitchen", dir: "/game/scenes/home3/cuisine/", start: "/game/scenes/home3/cuisine/cuisine-depart.jpg" },
  { id: "chambre", name: "Bedroom", dir: "/game/scenes/home3/chambre/", start: "/game/scenes/home3/chambre/chambre-depart.jpg" },
  { id: "sdb", name: "Bathroom", dir: "/game/scenes/home3/salle-de-bain/", start: "/game/scenes/home3/salle-de-bain/sdb-depart.jpg" },
];

export interface HomeActionDef {
  id: string;
  /** English source label (i18n key). */
  name: string;
  room: RoomId;
  /** Furniture that unlocks the action. */
  furniture: string;
  /** Points per skill (gauge skills move the gauge, the others add XP). */
  effects: Partial<Record<SkillId, number>>;
  /** Loop clip: "pingpong" (symmetric, mirror jump on "Se lever") or "fade" (forward, `period` s per cycle). */
  loop: "pingpong" | "fade";
  period?: number;
  /** Playback rate used to reach the cut frame after "Se lever" (shower: 1). */
  upRate: number;
  /** Times per in-game day (Geraldy 23/10/2026: 1, reading 3). Missing = 1. Both this and the 3 slots apply. */
  dailyLimit?: number;
}

export const HOME_ACTIONS: HomeActionDef[] = [
  { id: "canape", name: "Sit on the sofa", room: "salon", furniture: "canape", effects: { content: 2, health: 1 }, loop: "pingpong", upRate: 2 },
  { id: "tele", name: "Watch TV", room: "salon", furniture: "tele", effects: { content: 3 }, loop: "pingpong", upRate: 2 },
  { id: "cuisiner", name: "Cook", room: "cuisine", furniture: "cuisiniere", effects: { creativity: 2, health: 1 }, loop: "pingpong", upRate: 2 },
  { id: "manger", name: "Eat", room: "cuisine", furniture: "table", effects: { health: 3 }, loop: "pingpong", upRate: 2 },
  { id: "dormir", name: "Sleep", room: "chambre", furniture: "lit", effects: { health: 2, discipline: 2 }, loop: "pingpong", upRate: 2 },
  { id: "lire", name: "Read", room: "chambre", furniture: "bibliotheque", effects: { mind: 3 }, loop: "pingpong", upRate: 2, dailyLimit: 3 },
  { id: "douche", name: "Shower", room: "sdb", furniture: "douche", effects: { health: 2, charisma: 1 }, loop: "fade", period: 2, upRate: 1 },
  { id: "dents", name: "Brush teeth", room: "sdb", furniture: "lavabo", effects: { health: 1, charisma: 2 }, loop: "pingpong", upRate: 2 },
];

export const dailyLimitOf = (a: HomeActionDef) => Math.max(1, a.dailyLimit ?? 1);

/** Old "Sieste" action id, mapped to the sofa action. */
export const LEGACY_ACTION: Record<string, string> = { nap: "canape" };

/** 3 time slots a turn; one per action, used as soon as the action starts. */
export const HOME_SLOTS_PER_TURN = 3;
/** "Se lever": the return clip starts at most this many seconds later (DEF-HOME3-01). */
export const UP_MAX_DELAY = 1.7;

export const housingById = (id: string) => HOUSING.find((h) => h.id === id);
export const furnitureById = (id: string) => FURNITURE.find((f) => f.id === id);
export const homeActionById = (id: string) => HOME_ACTIONS.find((a) => a.id === (LEGACY_ACTION[id] ?? id));
export const roomById = (id: RoomId) => ROOMS.find((r) => r.id === id)!;
export const actionsIn = (room: RoomId) => HOME_ACTIONS.filter((a) => a.room === room);

/** Resident per chosen character. Only Aoi has art for now; every other character falls back to her (Geraldy). */
export const RESIDENTS: Record<string, { name: string }> = { aoi: { name: "Aoi" } };
export function residentFor(characterId: string | undefined): { id: string; def: { name: string } } {
  const id = characterId && RESIDENTS[characterId] ? characterId : "aoi";
  return { id, def: RESIDENTS[id]! };
}

/** "n of max time slots left" with real plurals (DEF-HOME-03): 0 / 1 / many are separate keys (fr: 0 is singular). */
export function slotsLeftText(t: (k: string, v?: Record<string, string | number>) => string, n: number, max: number): string {
  if (n <= 0) return t("No time slot left today");
  return t(n === 1 ? "{n} of {max} time slot left today" : "{n} of {max} time slots left today", { n, max });
}

/** Accessible label of an action for today: "done today" when exhausted, remaining count when the limit is > 1. */
export function actionTodayText(t: (k: string, v?: Record<string, string | number>) => string, left: number, max: number): string {
  if (left <= 0) return t("Already done today");
  if (max <= 1) return "";
  return t(left === 1 ? "{n} time left today" : "{n} times left today", { n: left });
}
