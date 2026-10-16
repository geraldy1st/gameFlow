/**
 * "Chez Aoi" home (DOSSIER.md §9, Geraldy 16/10/2026): data only, engine-free. Housing sold by Immo Dada, home
 * supplies (furniture), the apartment type with its 4 rooms and predefined furniture slots (keyboard friendly: one
 * button per slot, no free drag), and the resident character per chosen character (only Aoi has assets for now).
 * Art: Mirage's mockup (gameflow-bc/v3), converted once by tools/home-assets.py into public/game/scenes/home/.
 */

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
  /** Immo Dada price (Ash, carte blanche: below the mockup prices, in line with the $1,000 apartment). */
  price: number;
  /** Real width in metres and sprite height / width. */
  wM: number;
  ar: number;
  icon: string;
}

export const FURNITURE: FurnitureDef[] = [
  { id: "sofa", name: "Three-seat sofa", price: 420, wM: 2.1, ar: 0.3496, icon: "house" },
  { id: "futon", name: "Futon", price: 180, wM: 1.9, ar: 0.4395, icon: "moon" },
  { id: "bookshelf", name: "Bookshelf", price: 220, wM: 1.4, ar: 0.916, icon: "book" },
  { id: "tv-stand", name: "TV stand and screen", price: 320, wM: 1.5, ar: 0.4961, icon: "board" },
  { id: "desk", name: "Work desk", price: 380, wM: 1.6, ar: 0.6758, icon: "brush" },
  { id: "plant", name: "Green plant", price: 60, wM: 0.62, ar: 1.3223, icon: "plant" },
  { id: "coffee-table", name: "Coffee table", price: 120, wM: 1.2, ar: 0.3672, icon: "star" },
  { id: "dining-table", name: "Dining table", price: 300, wM: 1.6, ar: 0.5938, icon: "pan" },
];

/** Resale from the inventory: 50 % of the purchase price, rounded down to the dollar (Geraldy). */
export const RESALE_RATE = 0.5;

export interface SlotDef {
  id: string;
  /** Feet of the item in the 1280×720 background. */
  x: number;
  y: number;
  /** Spoken position ("back left"...). */
  label: string;
  /** Allowed items; absent = any furniture. */
  only?: string[];
}

export interface RoomDef {
  id: RoomId;
  name: string;
  bg: string;
  horizon: number;
  slots: SlotDef[];
  /** Where the resident stands / naps (feet). */
  stand: [number, number];
}

export const HOME_TYPE = {
  id: "appart-2ldk",
  w: 1280,
  h: 720,
  camH: 1.4,
  rooms: [
    { id: "salon", name: "Living room", bg: "/game/scenes/home/salon.webp", horizon: 233, stand: [640, 640], slots: [
      { id: "salon-bl", x: 440, y: 548, label: "back left" },
      { id: "salon-br", x: 1010, y: 575, label: "back right" },
      { id: "salon-fl", x: 360, y: 668, label: "front left" },
      { id: "salon-fr", x: 860, y: 640, label: "front right" },
    ] },
    { id: "cuisine", name: "Kitchen", bg: "/game/scenes/home/cuisine.webp", horizon: 330, stand: [760, 660], slots: [
      { id: "cuisine-c", x: 900, y: 650, label: "centre" },
      { id: "cuisine-r", x: 1180, y: 700, label: "front right" },
    ] },
    { id: "chambre", name: "Bedroom", bg: "/game/scenes/home/chambre.webp", horizon: 319, stand: [700, 670], slots: [
      { id: "chambre-bl", x: 520, y: 580, label: "back left" },
      { id: "chambre-br", x: 940, y: 610, label: "back right" },
      { id: "chambre-fl", x: 330, y: 708, label: "front left" },
    ] },
    { id: "sdb", name: "Bathroom", bg: "/game/scenes/home/sdb.webp", horizon: 232, stand: [560, 700], slots: [
      { id: "sdb-c", x: 700, y: 690, label: "by the bath", only: ["plant"] },
    ] },
  ] as RoomDef[],
};

export interface ClipDef {
  /** Horizontal strips of ≤ 4096 px (one decoded at a time), frames per strip. */
  strips: string[];
  perStrip: number;
  frames: number;
  fw: number;
  fh: number;
  fps: number;
  /** Still frame: reduced motion and the fallback when a strip cannot be decoded (old Safari). */
  still: string;
  /** Outfit the clip was drawn for; any other outfit shows the still body instead. */
  outfit: string;
}

export interface ResidentDef {
  /** Standing body per outfit ("{outfit}" placeholder), height in metres. */
  body: string;
  outfits: string[];
  hM: number;
  nap?: ClipDef;
}

/** Resident per chosen character. Only Aoi has art for now; every other character falls back to her (Geraldy). */
export const RESIDENTS: Record<string, ResidentDef> = {
  aoi: {
    body: "/game/scenes/home/aoi-{outfit}.webp",
    outfits: ["jeans", "jog", "night", "shirt", "shorts", "tee"],
    hM: 1.58,
    nap: {
      strips: ["/game/scenes/home/aoi-nap-0.webp", "/game/scenes/home/aoi-nap-1.webp", "/game/scenes/home/aoi-nap-2.webp"],
      perStrip: 6,
      frames: 15,
      fw: 660,
      fh: 200,
      fps: 8,
      still: "/game/scenes/home/aoi-nap-still.png",
      outfit: "jeans",
    },
  },
};

export function residentFor(characterId: string | undefined): { id: string; def: ResidentDef } {
  const id = characterId && RESIDENTS[characterId] ? characterId : "aoi";
  return { id, def: RESIDENTS[id]! };
}

/** Sieste (nap): no turn spent, +5 on every gauge, 3 time slots a turn, home counter 100 / 50 / 25 / 0 %. */
export const HOME_SLOTS_PER_TURN = 3;
export const NAP_POINTS = 5;
export const HOME_DIM = [1, 0.5, 0.25, 0];

export const housingById = (id: string) => HOUSING.find((h) => h.id === id);
export const furnitureById = (id: string) => FURNITURE.find((f) => f.id === id);
export const allSlots = () => HOME_TYPE.rooms.flatMap((r) => r.slots.map((s) => ({ room: r.id, ...s })));
export const slotById = (id: string) => allSlots().find((s) => s.id === id);
