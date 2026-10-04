/**
 * "La Boîte de Jeu" icon set (original 24×24 glyphs, currentColor) and the
 * space-type → family/colour/icon mapping used by the metro board, the mobile
 * strip and the legend. Families are visual only (not engine concepts).
 */
import type { CSSProperties } from "react";
import type { SpaceDef, SpaceKind } from "@/game/data";

const S = 'fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"';

export const ICON_PATHS: Record<string, string> = {
  coin: `<circle cx="12" cy="12" r="9" ${S}/><text x="12" y="16.6" text-anchor="middle" font-family="Fredoka,Nunito,sans-serif" font-weight="700" font-size="13" fill="currentColor">$</text>`,
  up: `<path d="M12 3.5l7.5 8.5h-4.8v8.5H9.3V12H4.5z" fill="currentColor"/>`,
  up2: `<path d="M7.5 3l5 6H9.6v5H5.4V9H2.5z" fill="currentColor"/><path d="M16.5 8l5.5 6.5h-3.3V21h-4.4v-6.5H11z" fill="currentColor"/>`,
  down: `<path d="M12 21l-7.5-8.5h4.8V3.5h5.4v9h4.8z" fill="currentColor"/>`,
  bag: `<path d="M4.5 8.5h15l-1.3 12H5.8z" fill="currentColor"/><path d="M8.8 8.5V7a3.2 3.2 0 0 1 6.4 0v1.5" ${S}/>`,
  pct: `<circle cx="7" cy="7" r="2.8" ${S}/><circle cx="17" cy="17" r="2.8" ${S}/><path d="M18.5 4.5l-13 15" ${S}/>`,
  case: `<rect x="2.5" y="8" width="19" height="12.5" rx="2.6" fill="currentColor"/><path d="M8.8 8V5h6.4v3" ${S}/>`,
  cap: `<path d="M1.5 9.5L12 4.5l10.5 5L12 14.5z" fill="currentColor"/><path d="M6 12v4.6c3.6 2.6 8.4 2.6 12 0V12M21.5 10v5" ${S}/>`,
  people: `<circle cx="8" cy="7.6" r="3.4" fill="currentColor"/><circle cx="16.8" cy="8.4" r="2.9" fill="currentColor"/><path d="M1.8 20c0-4 2.7-6.6 6.2-6.6s6.2 2.6 6.2 6.6z" fill="currentColor"/><path d="M15.2 20c.1-2.8 1-5.4 2.2-5.6 2.8-.3 4.8 2 4.8 5.6z" fill="currentColor"/>`,
  heart: `<path d="M12 20.8S3.2 15.6 3.2 9.3A4.5 4.5 0 0 1 12 7.1a4.5 4.5 0 0 1 8.8 2.2c0 6.3-8.8 11.5-8.8 11.5z" fill="currentColor"/>`,
  chart: `<path d="M3 18l5.5-5.5 4 3L20 7.5" ${S}/><path d="M14.5 6H21v6.5z" fill="currentColor"/>`,
  cross: `<path d="M9.3 3h5.4v6.3H21v5.4h-6.3V21H9.3v-6.3H3V9.3h6.3z" fill="currentColor"/>`,
  moon: `<path d="M14.5 3a9 9 0 1 0 6.6 14.8A7.6 7.6 0 0 1 14.5 3z" fill="currentColor"/>`,
  gift: `<rect x="3.5" y="10.5" width="17" height="10" rx="1.6" ${S}/><path d="M2.5 7.5h19v3h-19zM12 7.5v13M12 7.5c-2-4-6-4-6-1.5S12 7.5 12 7.5zm0 0c2-4 6-4 6-1.5s-6 1.5-6 1.5z" ${S}/>`,
  gem: `<path d="M6 3.5h12l3.5 5L12 21 2.5 8.5z" fill="currentColor"/>`,
  book: `<path d="M3.5 4.5c3.2-1 5.8-.6 8.5 1.3 2.7-1.9 5.3-2.3 8.5-1.3v14.2c-3.2-1-5.8-.6-8.5 1.3-2.7-1.9-5.3-2.3-8.5-1.3z" fill="currentColor"/>`,
  boom: `<path d="M3 18l5-6 4 3 7.5-8.5" ${S}/><path d="M14 5.5h6.5V12z" fill="currentColor"/>`,
  crash: `<path d="M3 6l5 6 4-3 7.5 8.5" ${S}/><path d="M14 18.5h6.5V12z" fill="currentColor"/>`,
  star: `<path d="M12 2.6l2.9 6 6.5.8-4.8 4.5 1.3 6.5L12 17.2l-5.9 3.2 1.3-6.5-4.8-4.5 6.5-.8z" fill="currentColor"/>`,
  house: `<path d="M2.5 11.2L12 3.3l9.5 7.9v9.5h-6.3v-6H8.8v6H2.5z" fill="currentColor"/>`,
  door: `<path d="M5 21.5V10a7 7 0 0 1 14 0v11.5" ${S} stroke-width="2.8"/><path d="M8.5 21.5V11a3.5 3.5 0 0 1 7 0v10.5z" fill="currentColor"/><path d="M2.5 21.5h19" ${S}/>`,
  lock: `<rect x="4.5" y="10.5" width="15" height="10.5" rx="2.4" fill="currentColor"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" ${S}/>`,
  dice: `<rect x="3" y="3" width="18" height="18" rx="4.5" ${S}/><circle cx="8" cy="8" r="1.8" fill="currentColor"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/><circle cx="16" cy="16" r="1.8" fill="currentColor"/>`,
  sun: `<circle cx="12" cy="12" r="4.6" fill="currentColor"/><path d="M12 2v2.6M12 19.4V22M2 12h2.6M19.4 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" ${S}/>`,
  save: `<path d="M4 3.5h12.5L20.5 7.5v13H4z" ${S}/><path d="M8 3.5v5h7v-5M7.5 20.5v-6h9v6" ${S}/>`,
  sound: `<path d="M3.5 9h4l5-4.5v15l-5-4.5h-4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.8 5.8a9 9 0 0 1 0 12.4" ${S}/>`,
  mute: `<path d="M3.5 9h4l5-4.5v15l-5-4.5h-4z" fill="currentColor"/><path d="M16 9l6 6M22 9l-6 6" ${S}/>`,
  zoom: `<circle cx="10.5" cy="10.5" r="6.8" ${S}/><path d="M15.6 15.6L21 21M10.5 7.5v6M7.5 10.5h6" ${S}/>`,
  unzoom: `<circle cx="10.5" cy="10.5" r="6.8" ${S}/><path d="M15.6 15.6L21 21M7.5 10.5h6" ${S}/>`,
  key: `<circle cx="5" cy="6" r="2" fill="currentColor"/><circle cx="5" cy="12" r="2" fill="currentColor"/><circle cx="5" cy="18" r="2" fill="currentColor"/><path d="M10 6h10M10 12h10M10 18h10" ${S}/>`,
  bulb: `<path d="M12 2.5a6.6 6.6 0 0 0-3.9 11.9c.8.6 1.3 1.5 1.3 2.5V18h5.2v-1.1c0-1 .5-1.9 1.3-2.5A6.6 6.6 0 0 0 12 2.5z" fill="currentColor"/><rect x="9.4" y="19.2" width="5.2" height="2.6" rx="1.2" fill="currentColor"/>`,
  wrench: `<path d="M14.6 3.2a5.2 5.2 0 0 0-5 6.7L3.4 16.1a2.2 2.2 0 0 0 3.1 3.1l6.2-6.2a5.2 5.2 0 0 0 6.7-5l-3 3-2.9-.6-.6-2.9z" fill="currentColor"/>`,
  mega: `<path d="M3 10v4h3l9 5V5L6 10z" fill="currentColor"/><path d="M18.5 9a4 4 0 0 1 0 6" ${S}/><path d="M7 14.5l1.5 5.5h3l-1.2-4.4" fill="currentColor"/>`,
  rocket: `<path d="M12 2.5c3.6 2.2 5.4 6 5 10.6l-2.6 3.4H9.6L7 13.1C6.6 8.5 8.4 4.7 12 2.5z" fill="currentColor"/><path d="M7.2 13.4L4 16.6l1.4 3 3.4-2M16.8 13.4l3.2 3.2-1.4 3-3.4-2M10.5 19.5l1.5 2.5 1.5-2.5" ${S}/>`,
  shop: `<path d="M3.5 9.5h17v11h-17z" fill="currentColor"/><path d="M2.5 9.5l2-6h15l2 6" ${S}/>`,
  replay: `<path d="M4 12a8 8 0 1 0 2.4-5.7" ${S} stroke-width="2.8"/><path d="M3 3.5v5.5h5.5" ${S} stroke-width="2.8"/>`,
  next: `<path d="M5 12h13M13 6l6 6-6 6" ${S} stroke-width="2.8"/>`,
  skip: `<path d="M5 5l8 7-8 7zM13 5l8 7-8 7z" fill="currentColor"/>`,
  shield: `<path d="M12 2.5l8 3v6c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10v-6z" fill="currentColor"/><path d="M8 12l3 3 5-6" fill="none" stroke="#FFF6E5" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  repeat: `<path d="M4 9a5 5 0 0 1 5-5h9M15 1l3 3-3 3M20 15a5 5 0 0 1-5 5H6M9 23l-3-3 3-3" ${S}/>`,
  ledger: `<rect x="4" y="2.5" width="16" height="19" rx="2.6" ${S}/><path d="M8 8h8M8 12h8M8 16h5" ${S}/>`,
  list: `<path d="M5 6h14M5 12h14M5 18h9" ${S}/>`,
  close: `<path d="M6 6l12 12M18 6L6 18" ${S} stroke-width="3"/>`,
  check: `<path d="M5 12.5l4.5 4.5L19 7.5" ${S} stroke-width="3.2"/>`,
};

export type IconName = keyof typeof ICON_PATHS;

/** Hidden sprite with every glyph as a <symbol>; mount once near the root. */
export function IconDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <defs dangerouslySetInnerHTML={{ __html: Object.entries(ICON_PATHS).map(([k, v]) => `<symbol id="i-${k}" viewBox="0 0 24 24">${v}</symbol>`).join("") }} />
    </svg>
  );
}

export function Ico({ name, className, style, title }: { name: IconName | string; className?: string; style?: CSSProperties; title?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden={title ? undefined : true} role={title ? "img" : undefined} focusable="false">
      {title ? <title>{title}</title> : null}
      <use href={`#i-${name}`} />
    </svg>
  );
}

/** The 8 visual families of Line 1 (colour + icon, never colour alone). */
export type Family = "pay" | "deals" | "lifestyle" | "tax" | "career" | "ties" | "market" | "care";

export const FAMILIES: Record<Family, { name: string; bg: string; fg: string; icon: IconName }> = {
  pay: { name: "Wages", bg: "var(--gold)", fg: "var(--navy)", icon: "coin" },
  deals: { name: "Deals", bg: "var(--mint)", fg: "var(--navy)", icon: "up" },
  lifestyle: { name: "Lifestyle", bg: "var(--coral)", fg: "var(--navy)", icon: "bag" },
  tax: { name: "Tax", bg: "var(--brick)", fg: "#FFFFFF", icon: "pct" },
  career: { name: "Career", bg: "var(--plum)", fg: "#FFFFFF", icon: "case" },
  ties: { name: "Ties", bg: "var(--sky)", fg: "var(--navy)", icon: "heart" },
  market: { name: "Market", bg: "var(--lilac)", fg: "var(--navy)", icon: "chart" },
  care: { name: "Care", bg: "var(--cream)", fg: "var(--navy)", icon: "cross" },
};

const KIND_META: Partial<Record<SpaceKind, { family?: Family; icon: IconName }>> = {
  payday: { family: "pay", icon: "coin" },
  small: { family: "deals", icon: "up" },
  big: { family: "deals", icon: "up2" },
  lifestyle: { family: "lifestyle", icon: "bag" },
  tax: { family: "tax", icon: "pct" },
  career: { family: "career", icon: "case" },
  mentor: { family: "career", icon: "cap" },
  social: { family: "ties", icon: "people" },
  love: { family: "ties", icon: "heart" },
  market: { family: "market", icon: "chart" },
  health: { family: "care", icon: "cross" },
  rest: { family: "care", icon: "moon" },
  premium: { icon: "gem" },
  legacy: { icon: "book" },
  boom: { icon: "boom" },
  dream: { icon: "star" },
  philanthropy: { icon: "gift" },
  family: { icon: "house" },
  client: { icon: "people" },
  hire: { icon: "case" },
  expand: { icon: "shop" },
  ops: { icon: "wrench" },
  pitch: { icon: "chart" },
  press: { icon: "mega" },
  brand: { icon: "gem" },
  scale: { icon: "rocket" },
  exit: { icon: "star" },
};

/** Family + icon of a space. Labels refine the icon (Charity is a rest square, Crash a boom square). */
export function spaceMeta(space: SpaceDef): { family: Family | null; icon: IconName; bg: string; fg: string } {
  const base = KIND_META[space.kind] ?? { icon: "star" as IconName };
  let icon = base.icon;
  if (space.label === "Charity") icon = "gift";
  if (space.label === "Crash") icon = "crash";
  if (space.label === "Market" && space.kind === "boom") icon = "chart";
  if (space.label === "Books") icon = "ledger";
  const fam = base.family ? FAMILIES[base.family] : null;
  return { family: base.family ?? null, icon, bg: fam?.bg ?? "var(--locked)", fg: fam?.fg ?? "var(--navy-soft)" };
}
