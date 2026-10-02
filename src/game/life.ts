export type OutfitId = "shorts" | "jeans" | "jog" | "tee" | "shirt" | "night";

export interface Vitals {
  content: number;
  social: number;
  mind: number;
  luck: number;
}

export const BIRTHDAY_COST = 280;
export const MUSEUM_COST = 60;
export const CLOTH_SWING = 300;

export const OUTFITS: { id: OutfitId; name: string; note: string }[] = [
  { id: "shorts", name: "Shorts", note: "Too casual for a contract or a first day." },
  { id: "jeans", name: "Jeans", note: "Ordinary clothes. The offer stays as written." },
  { id: "jog", name: "Jogging suit", note: "Comfortable. A landlord still notices." },
  { id: "tee", name: "T-shirt", note: "Fine on a day off. Weak in an interview." },
  { id: "shirt", name: "Professional shirt", note: "The room takes the offer more seriously." },
  { id: "night", name: "Going-out clothes", note: "Right for a night out. Wrong for a signing." },
];

const REALTY = new Set([
  "room",
  "laundry",
  "walkup",
  "hall",
  "hostel",
  "warehouse",
  "onsen",
  "solar",
  "retail",
  "clinic",
  "chain",
]);

const OUTFIT_SET = new Set<string>(OUTFITS.map((o) => o.id));

export function isOutfit(id: string | undefined | null): id is OutfitId {
  return !!id && OUTFIT_SET.has(id);
}

export function isRealty(id: string): boolean {
  return REALTY.has(id);
}

/** Jeans are neutral. A shirt helps a property or a new job. The rest cost the offer. */
export function clothDelta(outfit: OutfitId | undefined): number {
  if (outfit === "shirt") return CLOTH_SWING;
  if (!outfit || outfit === "jeans") return 0;
  return -CLOTH_SWING;
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function startingVitals(characterId: string): Vitals {
  if (characterId === "aoi") return { content: 64, social: 58, mind: 52, luck: 48 };
  if (characterId === "ren") return { content: 44, social: 40, mind: 72, luck: 42 };
  if (characterId === "mio") return { content: 70, social: 66, mind: 48, luck: 62 };
  if (characterId === "sora") return { content: 56, social: 46, mind: 68, luck: 54 };
  return { content: 55, social: 50, mind: 55, luck: 50 };
}

export function normalizeVitals(raw: Partial<Vitals> | undefined, characterId: string): Vitals {
  const base = startingVitals(characterId);
  return {
    content: clamp(raw?.content ?? base.content),
    social: clamp(raw?.social ?? base.social),
    mind: clamp(raw?.mind ?? base.mind),
    luck: clamp(raw?.luck ?? base.luck),
  };
}

export function bumpVitals(v: Vitals | undefined, d: Partial<Vitals>): Vitals {
  const base = v ?? { content: 50, social: 50, mind: 50, luck: 50 };
  return {
    content: clamp(base.content + (d.content ?? 0)),
    social: clamp(base.social + (d.social ?? 0)),
    mind: clamp(base.mind + (d.mind ?? 0)),
    luck: clamp(base.luck + (d.luck ?? 0)),
  };
}

/** A small drift every turn, so the bars move even when the day is only a roll. */
export function driftVitals(v: Vitals, turns: number): Vitals {
  const luck = ((turns * 3) % 5) - 2;
  return bumpVitals(v, {
    content: -1,
    social: turns % 2 === 0 ? -1 : 0,
    mind: turns % 4 === 0 ? 1 : 0,
    luck,
  });
}
