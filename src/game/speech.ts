import { portraitOf, statement, type CardView, type Player, type Reaction } from "./engine";

const CAST = new Set(["aoi", "ren", "mio", "sora"]);

export function expressionOf(player: Player, mood: Reaction): string {
  const base = portraitOf(player);
  if (mood === "idle" || player.custom || player.characterId === "custom" || !CAST.has(player.characterId)) return base;
  return `/game/portraits/expr/${player.characterId}-${mood}.jpg`;
}

/** Outfit art when it exists. Jeans keep the original face, including expressions. */
export function dressedPortrait(player: Player, mood: Reaction): string {
  const outfit = player.outfit;
  if (outfit && outfit !== "jeans" && !player.custom && player.characterId !== "custom" && CAST.has(player.characterId)) {
    return `/game/portraits/outfits/${player.characterId}-${outfit}.jpg`;
  }
  return expressionOf(player, mood);
}

/** Full-body sheet for the four cast faces. Falls back in the UI if the file is missing. */
export function bodyPortrait(player: Player, outfit?: string): string {
  const piece = outfit || player.outfit || "jeans";
  if (!player.custom && player.characterId !== "custom" && CAST.has(player.characterId)) {
    return `/game/portraits/body/${player.characterId}-${piece}.jpg`;
  }
  return portraitOf(player);
}

export function speakerIsNpc(card: CardView): boolean {
  const kind = card.payload.t;
  return !!card.portrait && (kind === "friend" || kind === "friendAct" || kind === "mentor" || kind === "partner" || kind === "help" || kind === "breakup" || kind === "circle" || kind === "rate");
}

export function arrivalMood(card: CardView, player: Player): Reaction {
  if (card.mood) return card.mood;
  const kind = card.payload.t;
  const cf = statement(player).cashFlow;
  if (kind === "spend" || kind === "tax" || kind === "health" || kind === "loan") return "stressed";
  if (kind === "partner" || kind === "child" || kind === "help") return "love";
  if (kind === "breakup") return "stressed";
  if (kind === "mentor" || kind === "dream" || kind === "legacy" || kind === "ascent") return "proud";
  if (kind === "ok" && card.tag === "Payday") return cf >= 0 ? "happy" : "stressed";
  if (kind === "deal" || kind === "deal2" || kind === "career") return "proud";
  if (kind === "friend" || kind === "friendAct") return "happy";
  return cf >= 0 ? "happy" : "stressed";
}

/** Mixes turn, square, and the line itself so the same square doesn't repeat. */
export function phraseSalt(turn: number, position: number, extra = 0): number {
  const n = (turn + 1) * 17 + position * 13 + extra * 29;
  return Math.abs((n ^ (n >> 3)) % 997);
}

function pick(list: readonly string[], salt: number): string {
  return list[Math.abs(salt) % list.length]!;
}

const ARRIVAL: Record<string, readonly string[]> = {
  paydayUp: [
    "The month paid me. I'll keep what it left.",
    "Payday. The envelope is warm.",
    "Another month, and it actually landed.",
    "I can breathe until the next bill.",
  ],
  paydayDown: [
    "The month cost more than it paid.",
    "The paycheck arrived already spoken for.",
    "I worked the month and still came up short.",
    "The numbers went out faster than they came in.",
  ],
  deal: [
    "A deal is on this square. I should read it before I nod.",
    "Someone is selling something. I want the small print.",
    "An offer. I don't say yes just because it's written nicely.",
    "This could be a door, or a very polite trap.",
  ],
  spend: [
    "This wants money I might need later.",
    "The square is holding out a hand.",
    "Pretty thing. Expensive thing.",
    "I can want it and still walk past.",
  ],
  market: [
    "The market moved. I don't control that.",
    "Prices shifted while I was walking.",
    "The board changed the numbers without asking.",
    "Up or down, it wasn't my pen.",
  ],
  career: [
    "Work is asking something of me.",
    "The job has a new sentence for me.",
    "A desk, a demand, a decision.",
    "They want more of the hours I already sold.",
  ],
  people: [
    "Someone is looking this way.",
    "A face I don't have a name for yet.",
    "The square brought company.",
    "I should hear them out before I decide.",
  ],
  home: [
    "This square is about people, not prices.",
    "Someone's life just sat down next to mine.",
    "The ledger can wait a minute.",
    "This one isn't a purchase. It's a person.",
  ],
  health: [
    "My body is sending a bill.",
    "I ignored the ache. It invoiced me.",
    "Health doesn't take a rain check.",
    "The month wants me upright, and it will charge for it.",
  ],
  tax: [
    "The office found me.",
    "Paperwork, with interest.",
    "They remembered my name. Of course they did.",
    "A form, a stamp, a number I didn't choose.",
  ],
  mentor: [
    "Someone who already left the Grind is waiting.",
    "A voice from further up the board.",
    "They've walked this ring. I should listen.",
    "Advice, if I can sit still for it.",
  ],
  rest: [
    "I could sit, or I could give.",
    "A quiet square. I don't have to fill it.",
    "The month offers a bench.",
    "Nothing is due here except a breath.",
  ],
  dream: [
    "The dream is right here, if I can pay.",
    "This is the thing I said I wanted.",
    "The price tag is on the life I pictured.",
    "Close enough to touch. Not free.",
  ],
  start: [
    "First paycheck, first choices. Let's see the month.",
    "The board is open. So is the ledger.",
    "One square at a time, starting now.",
    "I have a job, a dream, and not much else. Good.",
  ],
  loan: [
    "The cash is gone. I have to face it.",
    "Red numbers. I can't pretend they're black.",
    "The month ran past what I had.",
    "I need a bridge, and I know what bridges cost.",
  ],
  company: [
    "The company needs a decision.",
    "The venture is waiting on me.",
    "Clients, costs, or a bigger room. Pick one.",
    "The business doesn't walk itself.",
  ],
  default: [
    "Let me see what this square wants.",
    "Something is waiting on this tile.",
    "I landed. Now I read.",
    "One step, one story.",
  ],
};

function arrivalKey(card: CardView, player: Player): string {
  const kind = card.payload.t;
  const cf = statement(player).cashFlow;
  if (kind === "ok" && card.tag === "Payday") return cf >= 0 ? "paydayUp" : "paydayDown";
  if (kind === "deal" || kind === "deal2") return "deal";
  if (kind === "spend") return "spend";
  if (kind === "market" || kind === "boom") return "market";
  if (kind === "career") return "career";
  if (kind === "friend" || kind === "friendAct") return "people";
  if (kind === "partner" || kind === "child" || kind === "help" || kind === "breakup" || kind === "house") return "home";
  if (kind === "health") return "health";
  if (kind === "tax") return "tax";
  if (kind === "mentor") return "mentor";
  if (kind === "rest") return "rest";
  if (kind === "dream") return "dream";
  if (kind === "start") return "start";
  if (kind === "loan") return "loan";
  if (
    kind === "client" ||
    kind === "hire" ||
    kind === "expand" ||
    kind === "ops" ||
    kind === "pitch" ||
    kind === "press" ||
    kind === "brand" ||
    kind === "scale" ||
    kind === "exit"
  ) {
    return "company";
  }
  return "default";
}

export function arrivalLine(card: CardView, player: Player, salt = 0): string {
  if (card.speech) return card.speech;
  const key = arrivalKey(card, player);
  return pick(ARRIVAL[key] ?? ARRIVAL.default, salt + key.length);
}

const QUIPS: Record<Reaction, readonly string[]> = {
  happy: [
    "That was the right yes.",
    "The month just got lighter.",
    "I'll take that and keep walking.",
    "Good. I can feel the square behind me.",
    "A small win. I'll write it down.",
    "That one smiled back.",
  ],
  proud: [
    "That one felt like progress.",
    "I can stand a little taller.",
    "The ledger noticed.",
    "I chose, and it held.",
    "One more brick in the thing I'm building.",
    "Worth the pause.",
  ],
  stressed: [
    "That one stung.",
    "The month got heavier.",
    "I should remember this.",
    "Not the choice I wanted to make.",
    "It cost more than the story promised.",
    "I'll walk it off. Slowly.",
  ],
  love: [
    "This is what the month is for.",
    "People first. The numbers can follow.",
    "Worth keeping.",
    "I said yes to a person, not a price.",
    "The board got warmer.",
    "I'll remember the face more than the fee.",
  ],
  idle: [
    "On we go.",
    "The square is done.",
    "Nothing broken. Nothing gained.",
    "A quiet landing.",
    "I keep the pace.",
    "Next square.",
  ],
};

export function outcomeLine(mood: Reaction, salt: number): string {
  return pick(QUIPS[mood] ?? QUIPS.idle, salt);
}
