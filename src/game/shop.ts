import type { OutfitId, Vitals } from "./life";

export const CLOTH_PRICE: Record<Exclude<OutfitId, "jeans">, number> = {
  tee: 120,
  shorts: 180,
  jog: 240,
  night: 380,
  shirt: 520,
};

export interface HomeItem {
  id: string;
  name: string;
  cost: number;
  bump: Partial<Vitals>;
}

/** The home shop opens once the table reaches level 2. */
export const HOME_LEVEL = 2;

export const HOME_SHOP: HomeItem[] = [
  { id: "lamp", name: "Reading lamp", cost: 350, bump: { content: 6 } },
  { id: "plant", name: "Window plant", cost: 180, bump: { content: 4 } },
  { id: "sofa", name: "Low sofa", cost: 900, bump: { social: 8 } },
  { id: "desk", name: "Work desk", cost: 1100, bump: { mind: 8 } },
  { id: "charm", name: "Door charm", cost: 640, bump: { luck: 8 } },
];

export function homeItem(id: string): HomeItem | undefined {
  return HOME_SHOP.find((item) => item.id === id);
}
