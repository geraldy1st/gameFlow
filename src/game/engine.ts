import {
  BIG_DEALS,
  BOOMS,
  CAREERS,
  CHILD_COST,
  CHILD_NAMES,
  DREAMS,
  FORTUNE_CASH,
  FORTUNE_PASSIVE,
  FRIENDS,
  type FriendTrait,
  GRIND,
  LEGACY,
  LIFESTYLE,
  LOAN_CASH,
  LOAN_PAYMENT,
  MAX_CHILDREN,
  MAX_FRIENDS,
  FRIEND_SOCIAL_BONUS,
  PARTNERS,
  PASSIVE_WIN,
  PREMIUM_DEALS,
  SMALL_DEALS,
  VENTURE_GOAL,
  type CareerDef,
  type DealDef,
  type DreamDef,
  type PersonDef,
  type SpendDef,
  baseExpenses,
  businessFor,
  careerById,
  characterById,
  dreamById,
  openCareers,
  trackOf,
} from "./data";
import {
  BIRTHDAY_COST,
  MUSEUM_COST,
  bumpVitals,
  clothDelta,
  driftVitals,
  isRealty,
  isOutfit,
  normalizeVitals,
  startingVitals,
  type OutfitId,
  type Vitals,
} from "./life";
import { CLOTH_PRICE, HOME_LEVEL, homeItem } from "./shop";

export type TrackId = "grind" | "freedom" | "venture";
export type Reaction = "idle" | "happy" | "stressed" | "love" | "proud";
export type Phase = "idle" | "rolling" | "moving" | "card" | "pass" | "broke" | "win";
export type Screen = "menu" | "rules" | "credits" | "play" | "win";
export type Tone = "up" | "down" | "gold";
export type SfxName = "dice" | "card" | "cash" | "whoosh" | "win" | null;
export type GoalReason = "dream" | "flow";
export type Capstone = "exit" | "venture" | "fortune" | null;
export type WinReason = "dream" | "flow" | "venture" | "exit" | "fortune" | null;

export interface Line {
  k: string;
  v: string;
  tone?: Tone;
}

export interface Choice {
  id: string;
  label: string;
  tone: "gold" | "ghost" | "rose";
  confirm?: boolean;
}

export interface Asset {
  id: string;
  name: string;
  cashFlow: number;
  down: number;
  cost: number;
}

export interface Liability {
  id: string;
  name: string;
  principal: number;
  payment: number;
}

export interface CustomLook {
  name: string;
  age: number;
  sex: "f" | "m" | "x";
  hair: "black" | "brown" | "blonde" | "auburn";
  skin: "fair" | "warm" | "deep";
  bio: string;
}

export function customPortrait(look: CustomLook): string {
  return `/game/portraits/custom/${look.sex}-${look.skin}-${look.hair}.jpg`;
}

export interface Business {
  name: string;
  revenue: number;
  payroll: number;
  insured: boolean;
}

export interface PartnerState {
  id: string;
  helped: boolean;
}

export interface ChildState {
  id: string;
  name: string;
}

export interface FriendState {
  id: string;
  loyalty: number;
  role?: "friend" | "partner";
  sinceTurn: number;
  /** Social actually gained when they joined (bonus clamped at 100). Absent on older saves. */
  socialGain?: number;
  earned: number;
  spent: number;
  likes: number;
  dislikes: number;
}

export interface Player {
  id: string;
  characterId: string;
  dreamId: string;
  careerId: string;
  cash: number;
  salaryBonus: number;
  sideIncome: number;
  expenseMods: number;
  assets: Asset[];
  liabilities: Liability[];
  partner: PartnerState | null;
  children: ChildState[];
  friends: FriendState[];
  track: TrackId;
  position: number;
  brokeTurns: number;
  skipTurns: number;
  dreamBought: boolean;
  level: 1 | 2;
  business: Business | null;
  keptRevenue: boolean;
  stretchClaimed: boolean;
  goalReason: GoalReason | null;
  capstone: Capstone;
  custom: CustomLook | null;
  reaction: Reaction;
  calm: number;
  turns: number;
  householdIn: number;
  nextCfBoost: boolean;
  nextDownCut: boolean;
  circleTurn: number;
  lifeTurn: number;
  outfit: OutfitId;
  ownedOutfits: OutfitId[];
  homeOwned: string[];
  homeOn: string[];
  vitals: Vitals;
}

export type Payload =
  | { t: "ok" }
  | { t: "start" }
  | { t: "deal"; dealId: string; pool: "small" | "big" | "premium"; down: number; cashFlow: number }
  | { t: "deal2"; a: string; b: string; pool: "small"; downA: number; cfA: number; downB: number; cfB: number }
  | { t: "spend"; spendId: string; amount: number }
  | { t: "career"; kind: string; careerId?: string }
  | { t: "partner"; id: string }
  | { t: "breakup" }
  | { t: "help" }
  | { t: "child"; name: string }
  | { t: "friend"; id: string }
  | { t: "friendAct"; id: string }
  | { t: "circle"; friendId: string; kind: "party" | "movies" | "gift" | "mission" | "stocks" | "shop"; cost: number; gain: number; down: number; cashFlow: number; assetName: string }
  | { t: "rate"; friendId: string }
  | { t: "market"; id: string }
  | { t: "tax"; amount: number }
  | { t: "health" }
  | { t: "rest" }
  | { t: "mentor" }
  | { t: "legacy"; id: string }
  | { t: "boom"; id: string }
  | { t: "dream" }
  | { t: "give" }
  | { t: "family" }
  | { t: "loan"; fromBroke?: boolean }
  | { t: "freedom" }
  | { t: "house" }
  | { t: "skip" }
  | { t: "letter" }
  | { t: "ascent"; reason: GoalReason }
  | { t: "summit"; kind: "venture" | "fortune" }
  | { t: "client"; id: "retainer" | "whale" | "walkin" }
  | { t: "hire"; id: "lead" | "crew" }
  | { t: "expand"; id: "site" | "gear" }
  | { t: "ops"; id: "break" | "refund" | "smooth" }
  | { t: "pitch" }
  | { t: "press"; id: "feature" | "scandal" }
  | { t: "brand" }
  | { t: "scale" }
  | { t: "exit"; price: number }
  | { t: "life"; kind: "birthday" | "museum" | "sleep" };

export interface CardView {
  title: string;
  story: string;
  speech?: string;
  mood?: Reaction;
  art: string;
  portrait?: string;
  tag: string;
  lines: Line[];
  choices: Choice[];
  payload: Payload;
}

export interface Statement {
  career: CareerDef;
  salary: number;
  passive: number;
  expenses: number;
  cashFlow: number;
  taxes: number;
  rent: number;
  food: number;
  transport: number;
  other: number;
  childCost: number;
  partnerIncome: number;
  partnerExpense: number;
  debtPay: number;
  mods: number;
  roommate: number;
  bizRevenue: number;
  bizPayroll: number;
  allyIncome: number;
  allyCost: number;
}

export interface GameState {
  version: 1;
  screen: Screen;
  players: Player[];
  current: number;
  phase: Phase;
  die: number;
  path: number[];
  step: number;
  moveSerial: number;
  passedPay: number;
  card: CardView | null;
  log: string[];
  history: string[];
  turn: number;
  intro: boolean;
  seed: number;
  seq: number;
  muted: boolean;
  sfx: SfxName;
  sfxId: number;
  winReason: WinReason;
  winner: number;
  decks: {
    small: string[];
    big: string[];
    premium: string[];
    life: string[];
    market: string[];
    career: string[];
  };
}

export interface Pick {
  characterId: string;
  dreamId: string;
  custom?: CustomLook | null;
}

const gold = (label: string, id: string, confirm = false): Choice => ({
  id,
  label,
  tone: "gold",
  confirm,
});
const ghost = (label: string, id: string): Choice => ({ id, label, tone: "ghost" });
const rose = (label: string, id: string): Choice => ({ id, label, tone: "rose" });

export function money(n: number, signed = false): string {
  const v = Math.round(n);
  const abs = Math.abs(v).toLocaleString("en-US");
  if (v < 0) return `-$${abs}`;
  if (signed) return `+$${abs}`;
  return `$${abs}`;
}

function clothesLine(delta: number): Line {
  return {
    k: "Clothes",
    v: delta === 0 ? money(0) : money(delta, true),
    tone: delta > 0 ? "up" : delta < 0 ? "down" : "gold",
  };
}

function rand(seed: number): { seed: number; value: number } {
  let a = seed | 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return { seed: a >>> 0, value: ((t ^ (t >>> 14)) >>> 0) / 4294967296 };
}

function shuffle(ids: string[], seed: number): { ids: string[]; seed: number } {
  const arr = [...ids];
  let s = seed;
  for (let i = arr.length - 1; i > 0; i--) {
    const r = rand(s);
    s = r.seed;
    const j = Math.floor(r.value * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j]!;
    arr[j] = tmp!;
  }
  return { ids: arr, seed: s };
}

export function cur(s: GameState): Player {
  return s.players[s.current]!;
}

function withP(s: GameState, fn: (p: Player) => Player): GameState {
  const players = s.players.slice();
  players[s.current] = fn(players[s.current]!);
  return { ...s, players };
}

function log(s: GameState, line: string): GameState {
  return {
    ...s,
    log: [line, ...s.log].slice(0, 8),
    history: [line, ...(s.history ?? [])].slice(0, 80),
  };
}

function blip(s: GameState, name: SfxName): GameState {
  return { ...s, sfx: name, sfxId: s.sfxId + 1 };
}

function face(p: Player): { name: string; portrait: string } {
  if (p.custom?.name) return { name: p.custom.name, portrait: customPortrait(p.custom) };
  const c = characterById(p.characterId);
  return { name: c.name, portrait: c.portrait };
}

function partnerDef(p: Player): PersonDef | null {
  if (!p.partner) return null;
  return PARTNERS.find((x) => x.id === p.partner!.id) ?? null;
}

function friendDef(id: string): PersonDef {
  const f = FRIENDS.find((x) => x.id === id);
  if (!f) throw new Error(id);
  return f;
}

function blankFriend(id: string, role: "friend" | "partner", turn: number, loyalty = 3): FriendState {
  return { id, loyalty, role, sinceTurn: turn, earned: 0, spent: 0, likes: 0, dislikes: 0 };
}

function addLedger(friends: FriendState[], id: string, earned: number, spent: number): FriendState[] {
  return friends.map((f) => (f.id === id ? { ...f, earned: f.earned + earned, spent: f.spent + spent } : f));
}

export function hasTrait(p: Player, trait: FriendTrait): boolean {
  return p.friends.some((f) => friendDef(f.id).friendTrait === trait && f.loyalty > 0);
}

const ALLY_INCOME = 480;
const ALLY_COST = 160;

export function statement(p: Player): Statement {
  const career = careerById(p.careerId);
  const roommate = hasTrait(p, "Reliable roommate") ? 180 : 0;
  const rent = Math.max(0, career.rent - roommate);
  const partner = partnerDef(p);
  const partnerIncome = partner?.income ?? 0;
  const partnerExpense = partner?.expense ?? 0;
  const childCost = p.children.length * CHILD_COST;
  const debtPay = p.liabilities.reduce((n, l) => n + l.payment, 0);
  const bizRevenue = p.business?.revenue ?? 0;
  const bizPayroll = p.business?.payroll ?? 0;
  const allies = p.friends.filter((f) => f.role === "partner").length;
  const allyIncome = allies * ALLY_INCOME;
  const allyCost = allies * ALLY_COST;
  const expenses =
    career.taxes +
    rent +
    career.food +
    career.transport +
    career.other +
    childCost +
    partnerExpense +
    debtPay +
    p.expenseMods +
    bizPayroll +
    allyCost;
  const salary = career.salary + p.salaryBonus + p.sideIncome + partnerIncome;
  const passive = p.assets.reduce((n, a) => n + a.cashFlow, 0) + bizRevenue + allyIncome;
  return {
    career,
    salary,
    passive,
    expenses,
    cashFlow: salary + passive - expenses,
    taxes: career.taxes,
    rent,
    food: career.food,
    transport: career.transport,
    other: career.other,
    childCost,
    partnerIncome,
    partnerExpense,
    debtPay,
    mods: p.expenseMods,
    roommate,
    bizRevenue,
    bizPayroll,
    allyIncome,
    allyCost,
  };
}

export function unlocked(p: Player): boolean {
  const st = statement(p);
  return st.passive > st.expenses;
}

function dealById(id: string): DealDef {
  const all = [...SMALL_DEALS, ...BIG_DEALS, ...PREMIUM_DEALS];
  const d = all.find((x) => x.id === id);
  if (!d) throw new Error(id);
  return d;
}

function price(p: Player, deal: DealDef): { down: number; cashFlow: number } {
  let down = deal.down;
  let cashFlow = deal.cashFlow;
  if (hasTrait(p, "Investor")) down = Math.round(down * 0.9);
  if (p.nextDownCut) down = Math.round(down * 0.8);
  if (p.nextCfBoost) cashFlow = Math.round(cashFlow * 1.2);
  if (isRealty(deal.id)) cashFlow = Math.max(40, cashFlow + clothDelta(p.outfit));
  return { down, cashFlow };
}

function spendAmount(p: Player, spend: SpendDef): number {
  const base = spend.amount;
  return hasTrait(p, "Party-goer") ? Math.round(base * 1.15) : base;
}

function takeDeal(p: Player, deal: DealDef, down: number, cashFlow: number, seq: number): Player {
  const next: Player = {
    ...p,
    cash: p.cash - down,
    nextCfBoost: false,
    nextDownCut: false,
    assets: p.assets.slice(),
    liabilities: p.liabilities.slice(),
    sideIncome: p.sideIncome,
    expenseMods: p.expenseMods,
  };
  if (deal.passive) {
    const id = `a${seq}`;
    next.assets = [...p.assets, { id, name: deal.title, cashFlow, down, cost: deal.cost }];
    if (deal.payment > 0) {
      next.liabilities = [
        ...p.liabilities,
        { id: `${id}:note`, name: `${deal.title} note`, principal: Math.max(0, deal.cost - down), payment: deal.payment },
      ];
    }
  } else {
    next.sideIncome = p.sideIncome + cashFlow;
    if (deal.payment > 0) next.expenseMods = p.expenseMods + deal.payment;
  }
  return next;
}

function cardShell(partial: Omit<CardView, "lines" | "choices"> & { lines?: Line[]; choices?: Choice[] }): CardView {
  return { lines: [], choices: [gold("Continue", "ok", true)], ...partial };
}

function dealCard(p: Player, deal: DealDef, pool: "small" | "big" | "premium"): CardView {
  const priced = price(p, deal);
  const lines: Line[] = [
    { k: deal.passive ? "Down payment" : "Cost", v: money(priced.down), tone: "down" },
    {
      k: deal.passive ? "Passive cash flow" : "Earned income",
      v: `${money(priced.cashFlow, true)}/mo`,
      tone: "up",
    },
  ];
  if (deal.payment > 0) lines.push({ k: "Monthly note", v: `${money(deal.payment)}/mo`, tone: "down" });
  if (deal.passive) lines.push({ k: "Total price", v: money(deal.cost) });
  if (isRealty(deal.id)) lines.push(clothesLine(clothDelta(p.outfit)));
  if (hasTrait(p, "Investor")) lines.push({ k: "Investor friend", v: "−10% down", tone: "gold" });
  const afford = p.cash >= priced.down;
  const choices: Choice[] = afford
    ? [gold(deal.passive ? "Buy it" : "Take it", "accept"), ghost("Decline", "decline")]
    : [gold(`Borrow ${money(LOAN_CASH)}`, "borrow"), ghost("Decline", "decline")];
  if (!afford) lines.push({ k: "You are short", v: money(priced.down - p.cash), tone: "down" });
  return {
    title: deal.title,
    story: deal.story,
    art: deal.art,
    tag: pool === "premium" ? "Premium deal" : pool === "big" ? "Big opportunity" : "Small opportunity",
    lines,
    choices,
    payload: { t: "deal", dealId: deal.id, pool, down: priced.down, cashFlow: priced.cashFlow },
  };
}

function twoDealCard(p: Player, a: DealDef, b: DealDef): CardView {
  const pa = price(p, a);
  const pb = price(p, b);
  const choices: Choice[] = [];
  choices.push(p.cash >= pa.down ? gold(`Take ${a.title}`, "a") : gold("Borrow, then look again", "borrow"));
  if (p.cash >= pa.down) choices.push(p.cash >= pb.down ? gold(`Take ${b.title}`, "b") : ghost(`${b.title} — short`, "borrow"));
  else choices.push(ghost("Decline both", "decline"));
  if (p.cash >= pa.down) choices.push(ghost("Decline both", "decline"));
  return {
    title: "Jun knows two doors",
    story: "Your connector slides two opportunities across the table. Only one can be yours tonight.",
    art: "/game/art/friends.jpg",
    portrait: friendDef("jun").portrait,
    tag: "Social circle",
    lines: [
      { k: a.title, v: `${money(pa.down)} down · ${money(pa.cashFlow, true)}/mo`, tone: "gold" },
      { k: b.title, v: `${money(pb.down)} down · ${money(pb.cashFlow, true)}/mo`, tone: "gold" },
      ...(isRealty(a.id) || isRealty(b.id) ? [clothesLine(clothDelta(p.outfit))] : []),
    ],
    choices,
    payload: { t: "deal2", a: a.id, b: b.id, pool: "small", downA: pa.down, cfA: pa.cashFlow, downB: pb.down, cfB: pb.cashFlow },
  };
}

function drawId(queue: string[], pool: string[], seed: number): { id: string; queue: string[]; seed: number } {
  let q = queue;
  let s = seed;
  if (q.length === 0) {
    const sh = shuffle(pool, s);
    q = sh.ids;
    s = sh.seed;
  }
  return { id: q[0]!, queue: q.slice(1), seed: s };
}

function paydayLine(amount: number): Line {
  return {
    k: amount >= 0 ? "Payday cleared" : "The month ran short",
    v: `${money(amount, true)}`,
    tone: amount >= 0 ? "up" : "down",
  };
}

function isStipend(track: TrackId, index: number, kind: string): boolean {
  return kind === "payday" || (track === "freedom" && index === 0);
}

function loanCard(fromBroke = false): CardView {
  return {
    title: fromBroke ? "Expenses still due" : "The ledger is red",
    story: fromBroke
      ? "Even a quiet turn has a cost of living. Borrow, or pay what cash you have and let the rest go."
      : `Cash went negative. Borrow ${money(LOAN_CASH)} from the bank — it adds ${money(LOAN_PAYMENT)}/mo until you repay the principal — or go Broke and sit out a turn.`,
    art: "/game/art/career.jpg",
    tag: "Bank",
    lines: [
      { k: "Loan", v: money(LOAN_CASH), tone: "up" },
      { k: "Interest", v: `${money(LOAN_PAYMENT)}/mo (10%)`, tone: "down" },
    ],
    choices: fromBroke
      ? [gold("Take the loan", "borrow", true), rose("Pay what you can", "scrape")]
      : [gold("Take the loan", "borrow", true), rose("Go broke", "broke")],
    payload: { t: "loan", fromBroke },
  };
}

function startCard(p: Player): CardView {
  const st = statement(p);
  const who = face(p);
  return {
    title: st.career.title,
    story: `${who.name.split(" ")[0]} starts as a ${st.career.title.toLowerCase()}. ${st.career.blurb} Cash on hand is modest. The Grind is not.`,
    art: "/game/art/career.jpg",
    portrait: who.portrait,
    tag: "Starting career",
    lines: [
      { k: "Salary", v: `${money(st.salary)}/mo`, tone: "up" },
      { k: "Expenses", v: `${money(st.expenses)}/mo`, tone: "down" },
      { k: "Cash flow", v: `${money(st.cashFlow, true)}/mo`, tone: st.cashFlow >= 0 ? "gold" : "down" },
      { k: "Cash", v: money(p.cash), tone: "gold" },
    ],
    choices: [gold("Open the ledger", "ok", true)],
    payload: { t: "start" },
  };
}

export function blankMenu(): GameState {
  return {
    version: 1,
    screen: "menu",
    players: [],
    current: 0,
    phase: "idle",
    die: 1,
    path: [],
    step: 0,
    moveSerial: 0,
    passedPay: 0,
    card: null,
    log: [],
    history: [],
    turn: 1,
    intro: false,
    seed: 1,
    seq: 1,
    muted: false,
    sfx: null,
    sfxId: 0,
    winReason: null,
    winner: 0,
    decks: { small: [], big: [], premium: [], life: [], market: [], career: [] },
  };
}

export function createMatch(picks: Pick[], seed: number, muted: boolean): GameState {
  const starters = CAREERS.filter((c) => c.starting);
  let s = seed || 1;
  const players: Player[] = picks.map((pick, i) => {
    const r = rand(s);
    s = r.seed;
    const career = starters[Math.floor(r.value * starters.length)]!;
    const cash = Math.round(career.salary * 0.55);
    return {
      id: `p${i + 1}`,
      characterId: pick.custom ? "custom" : pick.characterId,
      dreamId: pick.dreamId,
      careerId: career.id,
      cash,
      salaryBonus: 0,
      sideIncome: 0,
      expenseMods: 0,
      assets: [],
      liabilities: [],
      partner: null,
      children: [],
      friends: [],
      track: "grind",
      position: 11,
      brokeTurns: 0,
      skipTurns: 0,
      dreamBought: false,
      level: 1,
      business: null,
      keptRevenue: false,
      stretchClaimed: false,
      goalReason: null,
      capstone: null,
      custom: pick.custom ?? null,
      reaction: "idle",
      calm: 0,
      turns: 0,
      householdIn: 0,
      nextCfBoost: false,
      nextDownCut: false,
      circleTurn: 0,
      lifeTurn: 0,
      outfit: "jeans",
      ownedOutfits: ["jeans"],
      homeOwned: [],
      homeOn: [],
      vitals: startingVitals(pick.custom ? "custom" : pick.characterId),
    };
  });
  let state: GameState = {
    ...blankMenu(),
    screen: "play",
    players,
    seed: s,
    muted,
    intro: true,
    turn: 1,
    phase: "card",
  };
  state = blip(state, "card");
  state.card = startCard(state.players[0]!);
  state.log = ["The board is set. First career dealt."];
  state.history = ["The board is set. First career dealt."];
  return state;
}

function collect(s: GameState, index: number, finalSpace: boolean): GameState {
  const p = cur(s);
  const spaces = trackOf(p.track);
  const space = spaces[index]!;
  if (!isStipend(p.track, index, space.kind)) return { ...s, players: s.players.map((pl, i) => (i === s.current ? { ...pl, position: index } : pl)) };
  const amount = statement(p).cashFlow;
  const next = withP(s, (pl) => ({ ...pl, position: index, cash: pl.cash + amount }));
  if (finalSpace) return { ...next, passedPay: s.passedPay + amount };
  return log({ ...next, passedPay: next.passedPay + amount }, `Passed payday ${money(amount, true)}.`);
}

function landing(s: GameState): GameState {
  const p = cur(s);
  const space = trackOf(p.track)[p.position]!;
  let card = buildSpace(s, space.kind);
  if (s.passedPay !== 0 && space.kind !== "payday") {
    card = { ...card, lines: [paydayLine(s.passedPay), ...card.lines] };
  }
  const reaction: Reaction =
    space.kind === "love" || space.kind === "family" ? "love" : space.kind === "payday" ? "happy" : p.reaction;
  return blip({ ...withP(s, (pl) => ({ ...pl, reaction })), phase: "card", card, passedPay: 0 }, "card");
}

function buildSpace(s: GameState, kind: string): CardView {
  const p = cur(s);
  if (kind === "payday") {
    const amount = s.passedPay;
    return cardShell({
      title: "Payday",
      story: amount >= 0 ? "Salary, assets, and bills meet. What remains is yours." : "The month costs more than it pays. The shortfall comes out of cash.",
      art: "/game/art/career.jpg",
      tag: "Payday",
      lines: [paydayLine(amount), { k: "Cash now", v: money(p.cash), tone: "gold" }],
      payload: { t: "ok" },
    });
  }
  if (kind === "small") return drawDeal(s, "small");
  if (kind === "big") return drawDeal(s, "big");
  if (kind === "premium") return drawDeal(s, "premium");
  if (kind === "lifestyle") return lifestyleCard(s);
  if (kind === "market") return marketCard(s);
  if (kind === "career") return careerCard(s);
  if (kind === "social") return socialCard(s);
  if (kind === "love") return loveCard(s);
  if (kind === "health") return healthCard();
  if (kind === "tax") return taxCard(p);
  if (kind === "mentor") return mentorCard(p);
  if (kind === "rest") return restCard();
  if (kind === "legacy") return legacyCard(s);
  if (kind === "boom") return boomCard(s);
  if (kind === "dream") return dreamCard(p);
  if (kind === "philanthropy") return giveCard(p);
  if (kind === "family") return familyCard(p);
  if (kind === "client") return clientCard(s);
  if (kind === "hire") return hireCard(s);
  if (kind === "expand") return expandCard(s);
  if (kind === "ops") return opsCard(s);
  if (kind === "pitch") return pitchCard(p);
  if (kind === "press") return pressCard(s);
  if (kind === "brand") return brandCard(p);
  if (kind === "scale") return scaleCard(p);
  if (kind === "exit") return exitCard(s);
  return cardShell({ title: "A quiet square", story: "Nothing but the sound of the die settling.", art: "/game/art/crest.jpg", tag: "Board", payload: { t: "ok" } });
}

function drawDeal(s: GameState, pool: "small" | "big" | "premium"): CardView {
  const p = cur(s);
  const catalog = pool === "small" ? SMALL_DEALS : pool === "big" ? BIG_DEALS : PREMIUM_DEALS;
  const ids = catalog.map((d) => d.id);
  let seed = s.seed;
  let queue = s.decks[pool];
  const first = drawId(queue, ids, seed);
  seed = first.seed;
  queue = first.queue;
  if (pool === "small" && hasTrait(p, "Connector")) {
    const second = drawId(queue, ids.filter((id) => id !== first.id), seed);
    s.seed = second.seed;
    s.decks = { ...s.decks, small: second.queue };
    return twoDealCard(p, dealById(first.id), dealById(second.id));
  }
  s.seed = seed;
  s.decks = { ...s.decks, [pool]: queue };
  return dealCard(p, dealById(first.id), pool);
}

function lifestyleCard(s: GameState): CardView {
  const p = cur(s);
  const drawn = drawId(s.decks.life, LIFESTYLE.map((x) => x.id), s.seed);
  s.seed = drawn.seed;
  s.decks = { ...s.decks, life: drawn.queue };
  const spend = LIFESTYLE.find((x) => x.id === drawn.id)!;
  const amount = spendAmount(p, spend);
  const lines: Line[] = [{ k: "Pay", v: money(amount), tone: "down" }];
  if (spend.monthly) lines.push({ k: "Then monthly", v: `${money(spend.monthly)}/mo`, tone: "down" });
  if (hasTrait(p, "Party-goer")) lines.push({ k: "Party friend", v: "Lifestyle costs +15%", tone: "down" });
  const choices: Choice[] =
    p.cash >= amount
      ? [gold("Pay", "pay"), ghost("Let it pass", "decline")]
      : [gold(`Borrow ${money(LOAN_CASH)}`, "borrow"), ghost("Let it pass", "decline")];
  return {
    title: spend.title,
    story: spend.story,
    art: spend.art,
    tag: "Lifestyle expense",
    lines,
    choices,
    payload: { t: "spend", spendId: spend.id, amount },
  };
}

function marketCard(s: GameState): CardView {
  const ids = ["rents", "tenant", "viral", "rates", "boom", "crash", "glut", "rumor"];
  const drawn = drawId(s.decks.market, ids, s.seed);
  s.seed = drawn.seed;
  s.decks = { ...s.decks, market: drawn.queue };
  const id = drawn.id;
  const stories: Record<string, [string, string]> = {
    rents: ["Rents rise", "Every asset you hold pays a little more. Landlords somewhere smile."],
    tenant: ["A tenant leaves", "One unit goes quiet. The cash flow thins until you refill it."],
    viral: ["Something goes viral", "A small thing you own is suddenly everywhere."],
    rates: ["Rates tick up", "Every note on your ledger gets heavier."],
    boom: ["A rumor of boom", "The next deal you accept will cash-flow harder."],
    crash: ["A soft crash", "One asset is marked down. It still works. It just pays less."],
    glut: ["Supply glut", "Equipment is cheap. Your next down payment shrinks."],
    rumor: ["Tax rumor", "You prepay a slice of worry before the office asks."],
  };
  const [title, story] = stories[id]!;
  return cardShell({
    title,
    story,
    art: "/game/art/market.jpg",
    tag: "Market shift",
    choices: [gold("Take the market", "ok", true)],
    payload: { t: "market", id },
  });
}

function careerCard(s: GameState): CardView {
  const p = cur(s);
  const ids = ["promo", "offer", "hustle", "solo", "burn", "cert", "city", "layoff"];
  const drawn = drawId(s.decks.career, ids, s.seed);
  s.seed = drawn.seed;
  s.decks = { ...s.decks, career: drawn.queue };
  const kind = drawn.id;
  if (kind === "offer" || kind === "layoff") {
    const open = openCareers(s.turn, p.level).filter((c) => c.id !== p.careerId);
    const offered = drawSome(s, open, kind === "layoff" ? 2 : 3);
    const cloth = clothDelta(p.outfit);
    const title = kind === "offer" ? "An offer arrives" : "The badge is taken";
    const later = open.some((c) => (c.tier ?? 0) > 0);
    const story =
      kind === "offer"
        ? later
          ? "More than one job is open, including work that was not on the table at the start. Pick a career. Your clothes shift every salary by the same amount."
          : "More than one job is open. Pick a career. Your clothes shift every salary by the same amount."
        : "The badge is gone. Two careers will take you tomorrow. Clothes still change the salary.";
    return {
      title,
      story,
      art: "/game/art/career.jpg",
      tag: "Career crossroads",
      lines: [
        ...offered.map((next) => ({
          k: next.title,
          v: `${money(next.salary + cloth)}/mo`,
          tone: "gold" as const,
        })),
        clothesLine(cloth),
      ],
      choices:
        kind === "layoff"
          ? offered.map((next) => gold(next.title, `take:${next.id}`, true))
          : [...offered.map((next) => gold(next.title, `take:${next.id}`)), ghost("Stay", "decline")],
      payload: { t: "career", kind },
    };
  }
  const copy: Record<string, [string, string, Line[]]> = {
    promo: ["Promotion", "A new title, a thicker paycheck, and a slightly louder life.", [{ k: "Salary", v: "+$650/mo", tone: "up" }, { k: "Expenses", v: "+$140/mo", tone: "down" }]],
    hustle: ["Side hustle", "Evenings get a second job. It pays. It also nibbles.", [{ k: "Earned income", v: "+$420/mo", tone: "up" }, { k: "Expenses", v: "+$60/mo", tone: "down" }]],
    solo: ["Quit to run it", "No employer. If you own a real asset, it works harder. Your salary becomes a sole prop’s.", [{ k: "Career", v: "Sole proprietor", tone: "gold" }]],
    burn: ["Burnout", "You still show up. The work pays less of you back.", [{ k: "Salary", v: "−$250/mo", tone: "down" }]],
    cert: ["Certification", "Pay for the letters after your name. They raise the salary.", [{ k: "Cost", v: money(900), tone: "down" }, { k: "Salary", v: "+$800/mo", tone: "up" }]],
    city: ["Cheaper city", "A transfer. The room is smaller and the rent finally behaves.", [{ k: "Expenses", v: "−$180/mo", tone: "up" }]],
  };
  const [title, story, lines] = copy[kind]!;
  const choices: Choice[] =
    kind === "cert"
      ? p.cash >= 900
        ? [gold("Pay $900", "take"), ghost("Skip it", "decline")]
        : [gold("Borrow $1,000", "borrow"), ghost("Skip it", "decline")]
      : [gold("Take it", "take", true), ...(kind === "burn" ? [] : [ghost("Not now", "decline")])];
  if (kind === "burn") {
    return {
      title,
      story,
      art: "/game/art/career.jpg",
      tag: "Career crossroads",
      lines,
      choices: [gold("Endure it", "take", true)],
      payload: { t: "career", kind },
    };
  }
  return { title, story, art: "/game/art/career.jpg", tag: "Career crossroads", lines, choices, payload: { t: "career", kind } };
}

function socialCard(s: GameState): CardView {
  const p = cur(s);
  const known = new Set(p.friends.map((f) => f.id));
  const missing = FRIENDS.filter((f) => !known.has(f.id));
  const r = rand(s.seed);
  s.seed = r.seed;
  if ((missing.length && (p.friends.length === 0 || r.value < 0.62)) && p.friends.length < MAX_FRIENDS) {
    const r2 = rand(s.seed);
    s.seed = r2.seed;
    const person = missing[Math.floor(r2.value * missing.length)]!;
    return meetCard(person);
  }
  if (p.friends.length === 0) {
    return cardShell({
      title: "A nod across the room",
      story: "Someone almost introduces themselves. The moment passes.",
      art: "/game/art/friends.jpg",
      tag: "Social circle",
      payload: { t: "ok" },
    });
  }
  const r3 = rand(s.seed);
  s.seed = r3.seed;
  const fr = p.friends[Math.floor(r3.value * p.friends.length)]!;
  const def = friendDef(fr.id);
  const story =
    def.friendTrait === "Connector"
      ? "Jun texts a name and a price. A small deal is about to find you."
      : def.friendTrait === "Investor"
        ? "Noa marks up your next down payment with a kinder pencil."
        : def.friendTrait === "Mentor"
          ? "Daichi buys the coffee and leaves you a sharper salary."
          : def.friendTrait === "Party-goer"
            ? "Lila has already ordered for the table."
            : "Omar covered groceries and pretends it was nothing.";
  return {
    title: def.name,
    story,
    speech: story,
    mood: def.friendTrait === "Party-goer" ? "stressed" : "happy",
    art: "/game/art/friends.jpg",
    portrait: def.portrait,
    tag: def.trait,
    lines: [{ k: "Loyalty", v: `${fr.loyalty}/4`, tone: "gold" }],
    choices: [gold("Go along", "accept", true), ...(def.friendTrait === "Party-goer" ? [ghost("Stay in", "decline")] : [])],
    payload: { t: "friendAct", id: def.id },
  };
}

function loveCard(s: GameState): CardView {
  const p = cur(s);
  const r = rand(s.seed);
  s.seed = r.seed;
  if (!p.partner && r.value < 0.78) {
    const r2 = rand(s.seed);
    s.seed = r2.seed;
    const person = PARTNERS[Math.floor(r2.value * PARTNERS.length)]!;
    return {
      title: person.name,
      story: `${person.blurb} They ask if this is a one-time coffee or a life.`,
      art: "/game/art/love.jpg",
      portrait: person.portrait,
      tag: "Love & family",
      lines: [
        { k: "Their income", v: `${money(person.income ?? 0)}/mo`, tone: "up" },
        { k: "Shared expenses", v: `${money(person.expense ?? 0)}/mo`, tone: "down" },
      ],
      choices: [gold("Build a household", "accept"), ghost("Decline, kindly", "decline")],
      payload: { t: "partner", id: person.id },
    };
  }
  if (p.partner && !p.partner.helped && r.value < 0.55) {
    const person = partnerDef(p)!;
    return {
      title: "A household venture",
      story: `${person.name.split(" ")[0]} wants to run a small thing beside your life. It would pay you both.`,
      art: "/game/art/love.jpg",
      portrait: person.portrait,
      tag: "Household",
      lines: [{ k: "Passive", v: "+$360/mo", tone: "up" }],
      choices: [gold("Start it together", "accept"), ghost("Not now", "decline")],
      payload: { t: "help" },
    };
  }
  if (p.partner && p.children.length < MAX_CHILDREN && r.value < 0.72) {
    const used = new Set(p.children.map((c) => c.name));
    const name = CHILD_NAMES.find((n) => !used.has(n)) ?? "Mio";
    return {
      title: "A new name in the house",
      story: p.partner
        ? `You and ${partnerDef(p)!.name.split(" ")[0]} choose the name ${name}. The ledger grows a line called love.`
        : `${name} comes into your care. The month gets more expensive and much louder.`,
      art: "/game/art/love.jpg",
      portrait: partnerDef(p)?.portrait,
      tag: "Family",
      lines: [{ k: "Child expenses", v: `+${money(CHILD_COST)}/mo`, tone: "down" }],
      choices: [gold(`Welcome ${name}`, "accept", true)],
      payload: { t: "child", name },
    };
  }
  if (p.partner && r.value < 0.85) {
    const person = partnerDef(p)!;
    return {
      title: "An argument with a view",
      story: `${person.name.split(" ")[0]} says the spending isn’t the point. It still feels like the point.`,
      art: "/game/art/love.jpg",
      portrait: person.portrait,
      tag: "Love & family",
      lines: [
        { k: "Make up", v: "+$180/mo expenses", tone: "down" },
        { k: "Part ways", v: "Lose their income", tone: "down" },
      ],
      choices: [gold("Make up", "stay"), rose("Part ways", "leave")],
      payload: { t: "breakup" },
    };
  }
  return cardShell({
    title: "A letter you meant to send",
    story: "You write half a page to someone who knew you before the ledger. It steadies the month.",
    art: "/game/art/love.jpg",
    tag: "Love & family",
    lines: [{ k: "Quiet gift to yourself", v: money(120, true), tone: "up" }],
    payload: { t: "letter" },
  });
}

function healthCard(): CardView {
  return {
    title: "The clinic on the corner",
    story: "Nothing dramatic. Enough to make you sit down and choose between a bill and a day you don’t roll.",
    art: "/game/art/health.jpg",
    tag: "Health",
    lines: [
      { k: "Pay the clinic", v: money(320), tone: "down" },
      { k: "Or rest", v: "Skip your next turn", tone: "gold" },
    ],
    choices: [gold("Pay $320", "pay"), ghost("Rest instead", "rest")],
    payload: { t: "health" },
  };
}

function taxCard(p: Player): CardView {
  const amount = Math.max(100, Math.round(p.cash * 0.1));
  return {
    title: "Tax",
    story: "The office does not care about your dream. Ten percent of cash on hand, at least a hundred.",
    art: "/game/art/career.jpg",
    tag: "Tax",
    lines: [{ k: "Due", v: money(amount), tone: "down" }],
    choices: p.cash >= amount ? [gold("Pay", "pay", true)] : [gold("Borrow to pay", "borrow", true)],
    payload: { t: "tax", amount },
  };
}

function meetCard(person: PersonDef): CardView {
  const speech =
    person.id === "jun"
      ? "I'm Jun. I hear who is selling before the sign goes up. Friends, or something with a ledger?"
      : person.id === "daichi"
        ? "Daichi. I left the Grind. I still sit with people who are mid-climb. Shall we?"
        : person.id === "omar"
          ? "Omar. I pay my half and I keep the quiet. Friend, partner, or just a nod?"
          : person.id === "lila"
            ? "Lila. If the month gets expensive, it should at least become a story."
            : "Noa. I fund small runs and I remember every term. Friend, or business?";
  return {
    title: person.name,
    story: person.blurb,
    speech,
    mood: "happy",
    art: "/game/art/friends.jpg",
    portrait: person.portrait,
    tag: "A meeting",
    lines: [
      { k: "Trait", v: person.trait, tone: "gold" },
      { k: "Business partner", v: `+${money(ALLY_INCOME)}/mo · ${money(ALLY_COST)}/mo costs`, tone: "up" },
    ],
    choices: [gold("Become friends", "friend"), gold("Business partner", "biz"), ghost("Ignore", "decline")],
    payload: { t: "friend", id: person.id },
  };
}

function mentorCard(p: Player): CardView {
  if (!p.friends.some((f) => f.id === "daichi")) return meetCard(friendDef("daichi"));
  return {
    title: "Mentorship",
    story: "Someone who already escaped the Grind buys the tea and offers one useful thing.",
    speech: "The tea is poured. Pick the lesson you can actually use.",
    mood: "proud",
    art: "/game/art/friends.jpg",
    portrait: "/game/portraits/daichi.jpg",
    tag: "Mentorship",
    lines: [
      { k: "Cash", v: "+$250", tone: "up" },
      { k: "Or a raise habit", v: "+$150/mo salary", tone: "up" },
      { k: "Or a sharper eye", v: "Next asset pays more", tone: "gold" },
    ],
    choices: [gold("Take $250", "cash"), gold("Raise +$150", "raise"), ghost("Sharpen the next deal", "eye")],
    payload: { t: "mentor" },
  };
}

function restCard(): CardView {
  return {
    title: "Rest / Charity",
    story: "A bench, a paper cup, and a box for someone else’s tuition. You can sit, or you can give.",
    art: "/game/art/scholar.jpg",
    tag: "Rest",
    lines: [
      { k: "Give", v: "$200 now, −$40/mo expenses", tone: "gold" },
      { k: "Rest", v: "Clear a skipped or broke turn", tone: "up" },
    ],
    choices: [gold("Give $200", "give"), ghost("Just rest", "rest")],
    payload: { t: "rest" },
  };
}

function legacyCard(s: GameState): CardView {
  const r = rand(s.seed);
  s.seed = r.seed;
  const item = LEGACY[Math.floor(r.value * LEGACY.length)]!;
  const p = cur(s);
  return {
    title: item.title,
    story: item.story,
    art: "/game/art/scholar.jpg",
    tag: "Legacy project",
    lines: [
      { k: "Cost", v: money(item.cost), tone: "down" },
      { k: "Passive", v: `${money(item.cashFlow, true)}/mo`, tone: "up" },
    ],
    choices:
      p.cash >= item.cost
        ? [gold("Fund it", "accept"), ghost("Not this decade", "decline")]
        : [gold("Borrow $1,000", "borrow"), ghost("Decline", "decline")],
    payload: { t: "legacy", id: item.id },
  };
}

function boomCard(s: GameState): CardView {
  const r = rand(s.seed);
  s.seed = r.seed;
  const item = BOOMS[Math.floor(r.value * BOOMS.length)]!;
  return cardShell({
    title: item.title,
    story: item.story,
    art: "/game/art/market.jpg",
    tag: "Market boom / crash",
    choices: [gold("Face it", "ok", true)],
    payload: { t: "boom", id: item.id },
  });
}

export function dreamCard(p: Player): CardView {
  const dream = dreamById(p.dreamId);
  if (p.dreamBought) {
    return cardShell({
      title: dream.name,
      story: "You stand inside the thing you wanted. It does not ask for another payment.",
      art: dream.art,
      tag: "Dream goal",
      payload: { t: "ok" },
    });
  }
  const short = p.cash < dream.cost;
  return {
    title: dream.name,
    story: dream.blurb,
    art: dream.art,
    tag: "Dream goal",
    lines: [
      { k: "Price", v: money(dream.cost), tone: "gold" },
      { k: "Your cash", v: money(p.cash), tone: short ? "down" : "up" },
    ],
    choices: short
      ? [gold("Borrow $1,000", "borrow"), ghost("Not yet", "decline")]
      : p.track === "freedom"
        ? [gold("Buy the dream", "buy", true), ghost("Wait", "decline")]
        : [ghost("Only on the Freedom Track", "decline")],
    payload: { t: "dream" },
  };
}

function giveCard(p: Player): CardView {
  const dream = dreamById(p.dreamId);
  return {
    title: "Philanthropy",
    story:
      dream.id === "scholar"
        ? "A foundation matches gifts toward the scholarship you keep describing at dinner."
        : "You fund a small public good. The tax line notices.",
    art: "/game/art/scholar.jpg",
    tag: "Philanthropy",
    lines: [
      { k: "Gift", v: money(1500), tone: "down" },
      { k: "Expenses", v: "−$120/mo", tone: "up" },
      ...(dream.id === "scholar" ? [{ k: "Match", v: "+$200/mo passive", tone: "up" as const }] : []),
    ],
    choices:
      p.cash >= 1500 ? [gold("Give $1,500", "give"), ghost("Keep it", "decline")] : [gold("Borrow $1,000", "borrow"), ghost("Keep it", "decline")],
    payload: { t: "give" },
  };
}

function familyCard(p: Player): CardView {
  if (p.partner || p.children.length) {
    const who = p.partner ? partnerDef(p)!.name.split(" ")[0] : p.children[0]!.name;
    return {
      title: "Family milestone",
      story: `${who} wants the day marked. A loud party, or a quiet gift that still counts.`,
      art: "/game/art/love.jpg",
      portrait: p.partner ? partnerDef(p)!.portrait : face(p).portrait,
      tag: "Family milestone",
      lines: [
        { k: "Party", v: money(800), tone: "down" },
        { k: "Quiet gift", v: money(200), tone: "down" },
      ],
      choices: [gold("Throw the party", "party"), ghost("A quiet gift", "quiet")],
      payload: { t: "family" },
    };
  }
  return cardShell({
    title: "An empty chair",
    story: "The milestone on the card is someone else’s. You send flowers anyway and feel briefly famous for being kind.",
    art: "/game/art/love.jpg",
    tag: "Family milestone",
    lines: [{ k: "Flowers", v: "−$80", tone: "down" }, { k: "A stranger’s thanks", v: "+$40", tone: "up" }],
    payload: { t: "family" },
  });
}

function clampBiz(b: Business, revenue: number, payroll: number): Business {
  return { ...b, revenue: Math.max(800, Math.round(revenue)), payroll: Math.max(200, Math.round(payroll)) };
}

function ascentCard(p: Player, reason: GoalReason): CardView {
  const dream = dreamById(p.dreamId);
  const st = statement(p);
  const wonDream = reason === "dream";
  return {
    title: wonDream ? "The dream is paid for" : "The month pays itself",
    story: wonDream
      ? `${dream.name} is yours. That was level 1. Level 2 asks what you do with a life that finally works: fold this month into a business, or keep the revenue and aim higher. The table stays set either way.`
      : `Passive income cleared ${money(PASSIVE_WIN)} a month. That was level 1. Level 2 asks whether you build a company on it, or keep this revenue and push further. You can retire later. You do not have to stop now.`,
    art: wonDream ? dream.art : "/game/art/market.jpg",
    portrait: face(p).portrait,
    tag: "Level 2",
    lines: [
      { k: "Cash flow", v: `${money(st.cashFlow, true)}/mo`, tone: "gold" },
      { k: "Passive", v: `${money(st.passive)}/mo`, tone: "up" },
      { k: "Found a business", v: "New ring, seeded by this month", tone: "gold" },
      { k: "Keep this revenue", v: `${money(FORTUNE_PASSIVE)}/mo or ${money(FORTUNE_CASH)} cash`, tone: "up" },
    ],
    choices: [gold("Found a business", "found"), ghost("Keep this revenue", "keep")],
    payload: { t: "ascent", reason },
  };
}

function summitCard(p: Player, kind: "venture" | "fortune"): CardView {
  if (kind === "venture" && p.business) {
    return {
      title: "The company can stand",
      story: `${p.business.name} clears ${money(VENTURE_GOAL)} a month. Retire if the story feels finished, or keep the doors open and play on.`,
      art: dreamById(p.dreamId).art,
      tag: "Level 2",
      lines: [
        { k: "Revenue", v: `${money(p.business.revenue)}/mo`, tone: "gold" },
        { k: "Payroll", v: `${money(p.business.payroll)}/mo`, tone: "down" },
      ],
      choices: [gold("Retire", "retire"), ghost("Keep the doors open", "keep")],
      payload: { t: "summit", kind },
    };
  }
  const st = statement(p);
  const byCash = p.cash >= FORTUNE_CASH && st.passive < FORTUNE_PASSIVE;
  return {
    title: byCash ? "A fortune in the drawer" : "Income, past the second line",
    story: "Level 2's mark is met. Retire if you want the ending. Or stay. The month does not stop until you say so.",
    art: "/game/art/market.jpg",
    tag: "Level 2",
    lines: [
      { k: "Cash", v: money(p.cash), tone: "gold" },
      { k: "Passive", v: `${money(st.passive)}/mo`, tone: "up" },
    ],
    choices: [gold("Retire", "retire"), ghost("Keep playing", "keep")],
    payload: { t: "summit", kind: "fortune" },
  };
}

function openingRevenue(st: Statement): number {
  return Math.max(4000, Math.min(28000, Math.round(Math.max(st.cashFlow, 0) * 0.8 + 2000)));
}

function foundBusiness(s: GameState, reason: GoalReason): GameState {
  const p = cur(s);
  const before = statement(p);
  const idea = businessFor(p.dreamId);
  const revenue = openingRevenue(before);
  const payroll = Math.round(revenue * 0.34);
  const stake = Math.min(p.cash, Math.max(p.cash === 0 ? 0 : 500, Math.round(p.cash * 0.12)));
  const draft: Player = {
    ...p,
    cash: p.cash - stake,
    level: 2,
    goalReason: reason,
    keptRevenue: false,
    stretchClaimed: false,
    capstone: null,
    business: { name: idea.name, revenue, payroll, insured: false },
    track: "venture",
    position: 0,
    reaction: "proud",
  };
  const books = Math.max(0, statement(draft).cashFlow);
  const seated = { ...draft, cash: draft.cash + books };
  let n = withP(s, () => seated);
  n = log(n, `Founded ${idea.name}. Opening revenue ${money(revenue)}/mo.`);
  if (books > 0) n = log(n, `First books ${money(books, true)}.`);
  return blip(
    {
      ...n,
      phase: "card",
      card: {
        title: idea.name,
        story: `${idea.blurb} The outer ring is now The Venture. Grow it toward ${money(VENTURE_GOAL)} a month, or take an exit when one is offered. You can retire whenever you like.`,
        art: dreamById(p.dreamId).art,
        tag: "Level 2 · Business",
        lines: [
          { k: "Stake", v: money(stake), tone: "down" },
          { k: "Revenue", v: `${money(revenue)}/mo`, tone: "up" },
          { k: "Payroll", v: `${money(payroll)}/mo`, tone: "down" },
          { k: "Goal", v: `${money(VENTURE_GOAL)}/mo revenue`, tone: "gold" },
        ],
        choices: [gold("Open the doors", "ok", true)],
        payload: { t: "ok" },
      },
    },
    "win",
  );
}

function keepRevenue(s: GameState, reason: GoalReason): GameState {
  const p = cur(s);
  let n = withP(s, (pl) => ({
    ...pl,
    level: 2,
    goalReason: reason,
    keptRevenue: true,
    stretchClaimed: false,
    capstone: null,
    reaction: "proud",
  }));
  n = log(n, "Level 2. You keep this revenue and aim higher.");
  return blip(
    {
      ...n,
      phase: "card",
      card: {
        title: "The same month, a taller aim",
        story: "Nothing resets. Salary, assets, and the people stay. Level 2 asks for $100,000 a month in passive income, or $250,000 cash in hand. Hit either and you may retire — or keep walking.",
        art: "/game/art/cafe.jpg",
        portrait: face(p).portrait,
        tag: "Level 2 · Freedom",
        lines: [
          { k: "Cash flow", v: `${money(statement(cur(n)).cashFlow, true)}/mo`, tone: "gold" },
          { k: "Passive aim", v: `${money(FORTUNE_PASSIVE)}/mo`, tone: "up" },
          { k: "Or cash", v: money(FORTUNE_CASH), tone: "gold" },
        ],
        choices: [gold("Keep walking", "ok", true)],
        payload: { t: "ok" },
      },
    },
    "win",
  );
}

function noCompany(): CardView {
  return cardShell({
    title: "The company is gone",
    story: "This square belongs to a business you no longer run. The month passes quietly.",
    art: "/game/art/crest.jpg",
    tag: "The Venture",
    payload: { t: "ok" },
  });
}

function clientCard(s: GameState): CardView {
  const p = cur(s);
  if (!p.business) return noCompany();
  const ids = ["retainer", "whale", "walkin"] as const;
  const r = rand(s.seed);
  s.seed = r.seed;
  const id = ids[Math.floor(r.value * ids.length)]!;
  return renderClient(p, id);
}

function renderClient(p: Player, id: "retainer" | "whale" | "walkin"): CardView {
  const biz = p.business!;
  if (id === "whale") {
    const cost = 2200;
    const afford = p.cash >= cost;
    return {
      title: "A whale on the books",
      story: `${biz.name} can land one account that changes the year. It costs to win them, and they will expect staff.`,
      art: "/game/art/market.jpg",
      tag: "Client",
      lines: [
        { k: "Cost", v: money(cost), tone: "down" },
        { k: "Revenue", v: "+$4,200/mo", tone: "up" },
        { k: "Payroll", v: "+$700/mo", tone: "down" },
      ],
      choices: afford
        ? [gold("Sign them", "accept"), ghost("Let them go", "decline")]
        : [gold("Borrow $1,000", "borrow"), ghost("Let them go", "decline")],
      payload: { t: "client", id },
    };
  }
  if (id === "walkin") {
    return cardShell({
      title: "A walk-in that stays",
      story: "Someone found you without a pitch. They pay now, and a little every month after.",
      art: "/game/art/friends.jpg",
      tag: "Client",
      lines: [
        { k: "Cash", v: "+$900", tone: "up" },
        { k: "Revenue", v: "+$350/mo", tone: "up" },
      ],
      choices: [gold("Welcome them", "ok", true)],
      payload: { t: "client", id },
    });
  }
  return {
    title: "A quiet retainer",
    story: "A neighborhood chain wants the unshowy version of what you do. It is not famous. It pays.",
    art: "/game/art/small.jpg",
    tag: "Client",
    lines: [
      { k: "Revenue", v: "+$1,400/mo", tone: "up" },
      { k: "Payroll", v: "+$280/mo", tone: "down" },
    ],
    choices: [gold("Take the retainer", "accept"), ghost("Pass", "decline")],
    payload: { t: "client", id: "retainer" },
  };
}

function hireCard(s: GameState): CardView {
  const p = cur(s);
  if (!p.business) return noCompany();
  const r = rand(s.seed);
  s.seed = r.seed;
  const id = r.value < 0.5 ? "lead" : "crew";
  return renderHire(p, id);
}

function renderHire(p: Player, id: "lead" | "crew"): CardView {
  if (id === "lead") {
    const cost = 2500;
    return {
      title: "Hire a lead",
      story: "Someone who has done this before will take a desk, a salary, and a piece of the worry.",
      art: "/game/art/career.jpg",
      tag: "Hire",
      lines: [
        { k: "To hire", v: money(cost), tone: "down" },
        { k: "Payroll", v: "+$650/mo", tone: "down" },
        { k: "Revenue", v: "+$1,900/mo", tone: "up" },
      ],
      choices:
        p.cash >= cost
          ? [gold("Hire them", "accept"), ghost("Stay lean", "decline")]
          : [gold("Borrow $1,000", "borrow"), ghost("Stay lean", "decline")],
      payload: { t: "hire", id },
    };
  }
  const cost = 700;
  return {
    title: "Two part-timers",
    story: "They split the counter and the late hour. The company gets wider without getting grand.",
    art: "/game/art/career.jpg",
    tag: "Hire",
    lines: [
      { k: "To hire", v: money(cost), tone: "down" },
      { k: "Payroll", v: "+$300/mo", tone: "down" },
      { k: "Revenue", v: "+$800/mo", tone: "up" },
    ],
    choices:
      p.cash >= cost
        ? [gold("Bring them in", "accept"), ghost("Not this month", "decline")]
        : [gold("Borrow $1,000", "borrow"), ghost("Not this month", "decline")],
    payload: { t: "hire", id },
  };
}

function expandCard(s: GameState): CardView {
  const p = cur(s);
  if (!p.business) return noCompany();
  const r = rand(s.seed);
  s.seed = r.seed;
  return renderExpand(p, r.value < 0.5 ? "site" : "gear");
}

function renderExpand(p: Player, id: "site" | "gear"): CardView {
  if (id === "site") {
    const cost = 7500;
    return {
      title: "A second site",
      story: `${p.business!.name} could open another door. The lease is the honest part. The staff bill comes after.`,
      art: "/game/art/big.jpg",
      tag: "Expand",
      lines: [
        { k: "Cost", v: money(cost), tone: "down" },
        { k: "Revenue", v: "+$5,200/mo", tone: "up" },
        { k: "Payroll", v: "+$1,500/mo", tone: "down" },
      ],
      choices:
        p.cash >= cost
          ? [gold("Open it", "accept"), ghost("Stay in one place", "decline")]
          : [gold("Borrow $1,000", "borrow"), ghost("Stay in one place", "decline")],
      payload: { t: "expand", id },
    };
  }
  const cost = 2800;
  return {
    title: "Better tools",
    story: "The work is faster when the tools stop apologizing. Revenue follows, a little payroll with it.",
    art: "/game/art/studio.jpg",
    tag: "Expand",
    lines: [
      { k: "Cost", v: money(cost), tone: "down" },
      { k: "Revenue", v: "+$1,700/mo", tone: "up" },
      { k: "Payroll", v: "+$180/mo", tone: "down" },
    ],
    choices:
      p.cash >= cost
        ? [gold("Buy the tools", "accept"), ghost("Make do", "decline")]
        : [gold("Borrow $1,000", "borrow"), ghost("Make do", "decline")],
    payload: { t: "expand", id },
  };
}

function opsCard(s: GameState): CardView {
  const p = cur(s);
  if (!p.business) return noCompany();
  const ids = ["break", "refund", "smooth"] as const;
  const r = rand(s.seed);
  s.seed = r.seed;
  return renderOps(p, ids[Math.floor(r.value * ids.length)]!);
}

function renderOps(p: Player, id: "break" | "refund" | "smooth"): CardView {
  const insured = !!p.business?.insured;
  if (id === "smooth") {
    return cardShell({
      title: "A smooth operations month",
      story: "Nothing breaks. A process you wrote on a napkin actually works, and payroll eases.",
      art: "/game/art/career.jpg",
      tag: "Operations",
      lines: [{ k: "Payroll", v: "−$200/mo", tone: "up" }],
      choices: [gold("Take the quiet", "ok", true)],
      payload: { t: "ops", id },
    });
  }
  if (id === "refund") {
    return cardShell({
      title: "A wave of refunds",
      story: insured
        ? "The cover you bought takes the worst of it. Revenue still flinches."
        : "A promise was louder than the work. You give some of it back.",
      art: "/game/art/health.jpg",
      tag: "Operations",
      lines: insured
        ? [
            { k: "Revenue", v: "−$250/mo", tone: "down" },
            { k: "Cash", v: "−$150", tone: "down" },
            { k: "Cover", v: "Used up", tone: "gold" },
          ]
        : [
            { k: "Revenue", v: "−$600/mo", tone: "down" },
            { k: "Cash", v: "−$400", tone: "down" },
          ],
      choices: [gold("Make it right", "ok", true)],
      payload: { t: "ops", id },
    });
  }
  const cost = insured ? 400 : 1100;
  return {
    title: "Something breaks",
    story: insured
      ? "The oven, the press, the van — whichever it is, the policy you bought makes the repair smaller."
      : "The thing you depend on stops. Pay for the repair, or lose the revenue while you improvise.",
    art: "/game/art/health.jpg",
    tag: "Operations",
    lines: [
      { k: "Repair", v: money(cost), tone: "down" },
      { k: "Or lose", v: "−$900/mo revenue", tone: "down" },
    ],
    choices:
      p.cash >= cost
        ? [gold(`Pay ${money(cost)}`, "pay"), ghost("Improvise", "skip")]
        : [gold("Borrow $1,000", "borrow"), ghost("Improvise", "skip")],
    payload: { t: "ops", id: "break" },
  };
}

function pitchCard(p: Player): CardView {
  if (!p.business) return noCompany();
  return {
    title: "An angel in the doorway",
    story: `${p.business.name} can take outside money. The check is large. So is the payroll they quietly add for 'oversight.'`,
    art: "/game/art/friends.jpg",
    tag: "Pitch",
    lines: [
      { k: "Cash", v: "+$10,000", tone: "up" },
      { k: "Revenue", v: "+$2,200/mo", tone: "up" },
      { k: "Payroll", v: "+$750/mo", tone: "down" },
    ],
    choices: [gold("Take the check", "accept"), ghost("Keep the cap table", "decline")],
    payload: { t: "pitch" },
  };
}

function pressCard(s: GameState): CardView {
  const p = cur(s);
  if (!p.business) return noCompany();
  const r = rand(s.seed);
  s.seed = r.seed;
  const id = r.value < 0.55 ? "feature" : "scandal";
  return renderPress(p, id);
}

function renderPress(p: Player, id: "feature" | "scandal"): CardView {
  const insured = !!p.business?.insured;
  if (id === "feature") {
    return cardShell({
      title: "A kind feature",
      story: "Someone with readers describes the work without sneering. The month gets larger.",
      art: "/game/art/lifestyle.jpg",
      tag: "Press",
      lines: [{ k: "Revenue", v: "+12%", tone: "up" }],
      choices: [gold("Let it run", "ok", true)],
      payload: { t: "press", id },
    });
  }
  return cardShell({
    title: "A sharp correction",
    story: insured
      ? "The piece is unkind. The cover you bought keeps it from becoming a wound."
      : "A headline gets the feeling right and the facts wrong. Revenue notices before you can answer.",
    art: "/game/art/market.jpg",
    tag: "Press",
    lines: insured
      ? [
          { k: "Revenue", v: "−4%", tone: "down" },
          { k: "Cash", v: "−$250", tone: "down" },
        ]
      : [
          { k: "Revenue", v: "−10%", tone: "down" },
          { k: "Cash", v: "−$700", tone: "down" },
        ],
    choices: [gold("Face it", "ok", true)],
    payload: { t: "press", id },
  });
}

function brandCard(p: Player): CardView {
  if (!p.business) return noCompany();
  const cost = 2400;
  return {
    title: "Put the name on it",
    story: `A proper mark for ${p.business.name}: type, a sign, a way for strangers to remember you on purpose.`,
    art: "/game/art/studio.jpg",
    tag: "Brand",
    lines: [
      { k: "Cost", v: money(cost), tone: "down" },
      { k: "Revenue", v: "+$1,200/mo", tone: "up" },
    ],
    choices:
      p.cash >= cost
        ? [gold("Commission it", "accept"), ghost("Stay unnamed", "decline")]
        : [gold("Borrow $1,000", "borrow"), ghost("Stay unnamed", "decline")],
    payload: { t: "brand" },
  };
}

function scaleCard(p: Player): CardView {
  if (!p.business) return noCompany();
  const cost = 12000;
  return {
    title: "Scale, properly",
    story: "Not another cute experiment. A real step: more capacity, more people, a number that starts to look like the goal.",
    art: "/game/art/big.jpg",
    tag: "Scale",
    lines: [
      { k: "Cost", v: money(cost), tone: "down" },
      { k: "Revenue", v: "+$8,500/mo", tone: "up" },
      { k: "Payroll", v: "+$2,000/mo", tone: "down" },
    ],
    choices:
      p.cash >= cost
        ? [gold("Scale", "accept"), ghost("Not yet", "decline")]
        : [gold("Borrow $1,000", "borrow"), ghost("Not yet", "decline")],
    payload: { t: "scale" },
  };
}

function exitCard(s: GameState): CardView {
  const p = cur(s);
  if (!p.business) return noCompany();
  const r = rand(s.seed);
  s.seed = r.seed;
  const multiple = 16 + Math.floor(r.value * 10);
  const price = p.business.revenue * multiple;
  return {
    title: "An exit offer",
    story: `A buyer wants ${p.business.name}. The check is ${multiple} months of revenue. Sell and walk back to the Freedom Track with the fortune, or keep the doors and the life.`,
    art: "/game/art/big.jpg",
    tag: "Exit",
    lines: [
      { k: "Offer", v: money(price), tone: "gold" },
      { k: "Revenue now", v: `${money(p.business.revenue)}/mo`, tone: "up" },
    ],
    choices: [gold("Sell the company", "sell"), ghost("Keep it", "hold")],
    payload: { t: "exit", price },
  };
}

function checkMilestone(s: GameState): GameState | null {
  const p = cur(s);
  const st = statement(p);
  if (p.level < 2 && p.track === "freedom" && (p.dreamBought || st.passive >= PASSIVE_WIN)) {
    const reason: GoalReason = p.dreamBought ? "dream" : "flow";
    return blip({ ...s, phase: "card", screen: "play", card: ascentCard(p, reason) }, "win");
  }
  if (p.level >= 2 && !p.stretchClaimed && p.business && p.business.revenue >= VENTURE_GOAL) {
    return blip({ ...s, phase: "card", screen: "play", card: summitCard(p, "venture") }, "win");
  }
  if (p.level >= 2 && !p.stretchClaimed && p.keptRevenue && (p.cash >= FORTUNE_CASH || st.passive >= FORTUNE_PASSIVE)) {
    return blip({ ...s, phase: "card", screen: "play", card: summitCard(p, "fortune") }, "win");
  }
  return null;
}

function win(s: GameState, reason: WinReason): GameState {
  return blip(
    {
      ...s,
      phase: "win",
      screen: "win",
      winReason: reason,
      winner: s.current,
      card: null,
    },
    "win",
  );
}

function finish(s: GameState, note: string, reaction: Reaction = "idle"): GameState {
  let n = withP(log(s, note), (p) => ({ ...p, reaction }));
  if (cur(n).cash < 0) {
    return blip({ ...n, phase: "card", card: loanCard(false) }, "card");
  }
  const mile = checkMilestone(n);
  if (mile) return mile;
  return advance(n);
}

function advance(s: GameState): GameState {
  if (s.players.length > 1) return blip({ ...s, phase: "pass", card: null }, "whoosh");
  return beginTurn({ ...s, turn: s.turn + 1 });
}

function beginTurn(s: GameState): GameState {
  const faded: string[] = [];
  let n = withP(s, (p) => {
    const turns = p.turns + 1;
    let calm = p.calm;
    let friends = p.friends.map((f) => ({ ...f }));
    if (turns % 3 === 0) {
      if (calm > 0) calm -= 1;
      else {
        friends = friends
          .map((f) => ({ ...f, loyalty: f.loyalty - 1 }))
          .filter((f) => {
            if (f.loyalty <= 0) {
              faded.push(friendDef(f.id).name);
              return false;
            }
            return true;
          });
      }
    }
    return { ...p, turns, calm, friends, householdIn: Math.max(0, p.householdIn - 1), reaction: "idle", vitals: driftVitals(p.vitals ?? startingVitals(p.characterId), turns) };
  });
  for (const name of faded) n = log(n, `${name} faded from your circle.`);
  const p = cur(n);
  if (p.brokeTurns > 0) return { ...n, phase: "broke", card: null };
  if (p.skipTurns > 0) {
    return {
      ...n,
      phase: "card",
      card: cardShell({
        title: "You promised to rest",
        story: "The die stays in the tray. Health asked for a day and you already agreed.",
        art: "/game/art/health.jpg",
        tag: "Rest",
        payload: { t: "skip" },
      }),
    };
  }
  return { ...n, phase: "idle", card: null };
}

function addLoan(p: Player, seq: number): Player {
  return {
    ...p,
    cash: p.cash + LOAN_CASH,
    liabilities: [...p.liabilities, { id: `l${seq}`, name: "Bank loan", principal: LOAN_CASH, payment: LOAN_PAYMENT }],
  };
}

function applyMarket(p: Player, id: string): { player: Player; note: string; reaction: Reaction } {
  const assets = p.assets.map((a) => ({ ...a }));
  if (id === "rents") {
    if (!assets.length) return { player: { ...p, cash: p.cash + 200 }, note: "No assets yet. A stranger tips you $200.", reaction: "happy" };
    return { player: { ...p, assets: assets.map((a) => ({ ...a, cashFlow: a.cashFlow + 120 })) }, note: "Rents rise. Every asset pays +$120/mo.", reaction: "happy" };
  }
  if (id === "tenant") {
    if (!assets.length) return { player: { ...p, cash: p.cash - 150 }, note: "No tenant to lose. A fee still finds you.", reaction: "stressed" };
    const i = assets.reduce((bi, a, idx) => (a.cashFlow > assets[bi]!.cashFlow ? idx : bi), 0);
    assets[i] = { ...assets[i]!, cashFlow: Math.max(40, assets[i]!.cashFlow - 180) };
    return { player: { ...p, assets }, note: `${assets[i]!.name} loses a payer.`, reaction: "stressed" };
  }
  if (id === "viral") {
    if (!assets.length) return { player: { ...p, cash: p.cash + 300 }, note: "You go slightly viral. +$300.", reaction: "proud" };
    const i = 0;
    assets[i] = { ...assets[i]!, cashFlow: assets[i]!.cashFlow + 220 };
    return { player: { ...p, assets }, note: `${assets[i]!.name} catches a wave. +$220/mo.`, reaction: "proud" };
  }
  if (id === "rates") {
    if (!p.liabilities.length) return { player: { ...p, cash: p.cash - 100 }, note: "Rates rise, but you owe no notes. A fee still stings.", reaction: "stressed" };
    return {
      player: { ...p, liabilities: p.liabilities.map((l) => ({ ...l, payment: l.payment + 40 })) },
      note: "Every note costs +$40/mo.",
      reaction: "stressed",
    };
  }
  if (id === "boom") return { player: { ...p, nextCfBoost: true }, note: "Your next deal will cash-flow 20% harder.", reaction: "happy" };
  if (id === "crash") {
    if (!assets.length) return { player: { ...p, cash: Math.max(0, p.cash - 200) }, note: "The crash barely knows your name. −$200.", reaction: "stressed" };
    assets[0] = { ...assets[0]!, cashFlow: Math.max(30, Math.round(assets[0]!.cashFlow * 0.7)) };
    return { player: { ...p, assets }, note: `${assets[0]!.name} is marked down.`, reaction: "stressed" };
  }
  if (id === "glut") return { player: { ...p, nextDownCut: true }, note: "Your next down payment is 20% lighter.", reaction: "happy" };
  const due = Math.max(50, Math.round(p.cash * 0.08));
  return { player: { ...p, cash: p.cash - due }, note: `You prepay ${money(due)} against a tax rumor.`, reaction: "stressed" };
}

function applyBoom(p: Player, id: string, _seq: number): { player: Player; note: string; reaction: Reaction } {
  if (id === "lift") {
    if (!p.assets.length) return { player: { ...p, cash: p.cash + 800 }, note: "The boom pays you a freelance rush. +$800.", reaction: "happy" };
    return {
      player: { ...p, assets: p.assets.map((a) => ({ ...a, cashFlow: Math.round(a.cashFlow * 1.15) })) },
      note: "Passive income lifts 15%.",
      reaction: "proud",
    };
  }
  if (id === "drop") {
    if (!p.assets.length) return { player: { ...p, cash: p.cash - 600 }, note: "The crash still sends a bill. −$600.", reaction: "stressed" };
    return {
      player: { ...p, assets: p.assets.map((a) => ({ ...a, cashFlow: Math.max(40, Math.round(a.cashFlow * 0.85)) })) },
      note: "Passive income falls 15%.",
      reaction: "stressed",
    };
  }
  if (id === "wind") return { player: { ...p, cash: p.cash + 2000 }, note: "A forgotten dividend wires $2,000.", reaction: "proud" };
  if (id === "hit") {
    return { player: { ...p, cash: p.cash - 1200 }, note: "A correction takes $1,200.", reaction: "stressed" };
  }
  return { player: p, note: "The market shrugs.", reaction: "idle" };
}

function repossess(p: Player): Player {
  if (!p.assets.length) return { ...p, cash: 0, brokeTurns: 1, reaction: "stressed" };
  let idx = 0;
  p.assets.forEach((a, i) => {
    if (a.cashFlow < p.assets[idx]!.cashFlow) idx = i;
  });
  const gone = p.assets[idx]!;
  return {
    ...p,
    cash: 0,
    brokeTurns: 1,
    reaction: "stressed",
    assets: p.assets.filter((_, i) => i !== idx),
    liabilities: p.liabilities.filter((l) => l.id !== `${gone.id}:note`),
  };
}

export type Action =
  | { type: "ROLL" }
  | { type: "REVEAL" }
  | { type: "STEP" }
  | { type: "CHOICE"; id: string }
  | { type: "READY" }
  | { type: "BREATHE" }
  | { type: "BORROW" }
  | { type: "REPAY"; id: string }
  | { type: "SELL"; id: string }
  | { type: "ENTER" }
  | { type: "DREAM" }
  | { type: "HOUSE" }
  | { type: "RETIRE" }
  | { type: "CIRCLE"; friendId: string }
  | { type: "LIFE"; kind: "birthday" | "museum" | "sleep" }
  | { type: "WEAR"; outfit: OutfitId }
  | { type: "BUY_CLOTH"; outfit: OutfitId }
  | { type: "BUY_HOME"; id: string }
  | { type: "TOGGLE_HOME"; id: string }
  | { type: "MENU" }
  | { type: "RULES" }
  | { type: "CREDITS" }
  | { type: "MUTE" }
  | { type: "NEW"; picks: Pick[] }
  | { type: "CONTINUE"; saved: GameState };

export function reduce(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "MENU":
      return { ...state, screen: "menu" };
    case "RULES":
      return { ...state, screen: "rules" };
    case "CREDITS":
      return { ...state, screen: "credits" };
    case "MUTE":
      return { ...state, muted: !state.muted };
    case "NEW":
      return createMatch(action.picks, (Date.now() ^ (state.seed + 17)) >>> 0, state.muted);
    case "CONTINUE":
      return hydrate(action.saved);
    case "ROLL":
      return doRoll(state);
    case "REVEAL":
      return state.phase === "rolling" ? blip({ ...state, phase: "moving" }, "whoosh") : state;
    case "STEP":
      return doStep(state);
    case "CHOICE":
      return doChoice(state, action.id);
    case "READY":
      if (state.phase !== "pass") return state;
      return beginTurn({ ...state, current: (state.current + 1) % state.players.length, turn: state.turn + 1, card: null });
    case "BREATHE":
      return doBreathe(state);
    case "BORROW":
      return doBorrow(state);
    case "REPAY":
      return doRepay(state, action.id);
    case "SELL":
      return doSell(state, action.id);
    case "ENTER":
      return doEnter(state);
    case "DREAM":
      if (state.phase !== "idle") return state;
      return blip({ ...state, phase: "card", card: dreamCard(cur(state)) }, "card");
    case "HOUSE":
      return doHouse(state);
    case "RETIRE":
      return doRetire(state);
    case "CIRCLE":
      return doCircle(state, action.friendId);
    case "LIFE":
      return doLife(state, action.kind);
    case "WEAR":
      return doWear(state, action.outfit);
    case "BUY_CLOTH":
      return doBuyCloth(state, action.outfit);
    case "BUY_HOME":
      return doBuyHome(state, action.id);
    case "TOGGLE_HOME":
      return doToggleHome(state, action.id);
    default:
      return state;
  }
}

function doRoll(s: GameState): GameState {
  if (s.screen !== "play" || s.phase !== "idle") return s;
  const p = cur(s);
  const r = rand(s.seed);
  const die = 1 + Math.floor(r.value * 6);
  const len = trackOf(p.track).length;
  const path: number[] = [];
  for (let i = 1; i <= die; i++) path.push((p.position + i) % len);
  return blip(
    { ...s, seed: r.seed, die, path, step: 0, phase: "rolling", moveSerial: s.moveSerial + 1, passedPay: 0, card: null },
    "dice",
  );
}

function doStep(s: GameState): GameState {
  if (s.phase !== "moving") return s;
  const index = s.path[s.step];
  if (index === undefined) return landing(s);
  const last = s.step === s.path.length - 1;
  let n = collect(s, index, last);
  n = { ...n, step: s.step + 1 };
  if (!last) return n;
  return landing(n);
}

function doChoice(s: GameState, id: string): GameState {
  if (s.phase !== "card" || !s.card) return s;
  const payload = s.card.payload;
  const p = cur(s);
  if (id === "borrow") {
    const n = withP({ ...s, seq: s.seq + 1 }, (pl) => addLoan(pl, s.seq));
    const rebuilt = rebuild(n, payload);
    return blip(log({ ...rebuilt, phase: "card" }, "Borrowed $1,000 at $100/mo."), "cash");
  }
  if (payload.t === "start") {
    if (s.intro && s.current < s.players.length - 1) {
      const next = { ...s, current: s.current + 1 };
      return blip({ ...next, card: startCard(cur(next)) }, "card");
    }
    return beginTurn({ ...s, current: 0, intro: false, turn: 1, card: null });
  }
  if (payload.t === "ok" || payload.t === "letter") {
    if (payload.t === "letter") return finish(withP(s, (pl) => ({ ...pl, cash: pl.cash + 120 })), "A letter steadies you. +$120.", "happy");
    return finish(s, s.card.title);
  }
  if (payload.t === "skip") {
    return finish(withP(s, (pl) => ({ ...pl, skipTurns: 0 })), "You kept your promise to rest.", "idle");
  }
  if (payload.t === "deal") return resolveDeal(s, payload, id);
  if (payload.t === "deal2") return resolveDeal2(s, payload, id);
  if (payload.t === "spend") return resolveSpend(s, payload, id);
  if (payload.t === "career") return resolveCareer(s, payload, id);
  if (payload.t === "partner") {
    if (id !== "accept") return finish(s, "You kept your evenings.", "idle");
    return finish(withP(s, (pl) => ({ ...pl, partner: { id: payload.id, helped: false } })), `You and ${partnerName(payload.id)} start a household.`, "love");
  }
  if (payload.t === "help") {
    if (id !== "accept" || !p.partner) return finish(s, "The venture waits.", "idle");
    return finish(
      withP({ ...s, seq: s.seq + 1 }, (pl) => ({
        ...pl,
        partner: { ...pl.partner!, helped: true },
        assets: [...pl.assets, { id: `a${s.seq}`, name: "Household venture", cashFlow: 360, down: 0, cost: 0 }],
      })),
      "A household venture pays +$360/mo.",
      "proud",
    );
  }
  if (payload.t === "breakup") {
    if (id === "leave") {
      return finish(withP(s, (pl) => ({ ...pl, partner: null, cash: pl.cash - 400 })), "You part ways. The split costs $400.", "stressed");
    }
    return finish(withP(s, (pl) => ({ ...pl, expenseMods: pl.expenseMods + 180 })), "You make up. The household costs +$180/mo.", "love");
  }
  if (payload.t === "child") {
    if (p.children.length >= MAX_CHILDREN) return finish(s, "The house is full.", "love");
    return finish(
      withP({ ...s, seq: s.seq + 1 }, (pl) => ({
        ...pl,
        children: [...pl.children, { id: `c${s.seq}`, name: payload.name }],
      })),
      `${payload.name} joins the family. +$${CHILD_COST}/mo.`,
      "love",
    );
  }
  if (payload.t === "friend") {
    if (id === "decline" || id === "ignore") return finish(s, "You let the introduction pass.", "idle");
    if (p.friends.some((f) => f.id === payload.id)) return finish(s, "You already know them.", "idle");
    if (p.friends.length >= MAX_FRIENDS) return finish(s, "Your circle is already full.", "idle");
    const role = id === "biz" ? "partner" : "friend";
    const name = friendDef(payload.id).name;
    return finish(
      withP(s, (pl) => {
        const vitals = bumpVitals(pl.vitals, { social: FRIEND_SOCIAL_BONUS });
        const socialGain = Math.max(0, vitals.social - (pl.vitals?.social ?? 50));
        return { ...pl, friends: [...pl.friends, { ...blankFriend(payload.id, role, s.turn), socialGain }], calm: 2, vitals };
      }),
      role === "partner" ? `${name} joins as a business partner. +$${ALLY_INCOME}/mo.` : `${name} joins your circle.`,
      role === "partner" ? "proud" : "happy",
    );
  }
  if (payload.t === "circle") return resolveCircle(s, payload, id);
  if (payload.t === "rate") return resolveRate(s, payload.friendId, id);
  if (payload.t === "friendAct") return resolveFriendAct(s, payload.id, id);
  if (payload.t === "market") {
    const applied = applyMarket(p, payload.id);
    return finish(withP(s, () => applied.player), applied.note, applied.reaction);
  }
  if (payload.t === "tax") {
    if (id === "borrow") return doChoice(s, "borrow");
    return finish(withP(s, (pl) => ({ ...pl, cash: pl.cash - payload.amount })), `Tax paid ${money(payload.amount)}.`, "stressed");
  }
  if (payload.t === "health") {
    if (id === "rest") return finish(withP(s, (pl) => ({ ...pl, skipTurns: pl.skipTurns + 1 })), "You will skip your next turn to recover.", "idle");
    if (p.cash < 320) return blip({ ...withP({ ...s, seq: s.seq + 1 }, (pl) => addLoan(pl, s.seq)), card: healthCard() }, "cash");
    return finish(withP(s, (pl) => ({ ...pl, cash: pl.cash - 320 })), "Clinic bill paid. $320.", "idle");
  }
  if (payload.t === "rest") {
    if (id === "give") {
      if (p.cash < 200) return blip(log(withP({ ...s, seq: s.seq + 1 }, (pl) => addLoan(pl, s.seq)), "Borrowed to give."), "cash");
      return finish(
        withP(s, (pl) => ({
          ...pl,
          cash: pl.cash - 200,
          expenseMods: pl.expenseMods - 40,
          friends: pl.friends.map((f) => ({ ...f, loyalty: Math.min(4, f.loyalty + 1) })),
          calm: 2,
        })),
        "You give $200. Living costs ease by $40/mo.",
        "proud",
      );
    }
    return finish(withP(s, (pl) => ({ ...pl, brokeTurns: 0, skipTurns: 0 })), "You rest. The next turn is yours again.", "happy");
  }
  if (payload.t === "mentor") {
    if (id === "raise") {
      const bonus = hasTrait(p, "Mentor") ? 350 : 150;
      return finish(withP(s, (pl) => ({ ...pl, salaryBonus: pl.salaryBonus + bonus })), `A mentor lifts your salary +$${bonus}/mo.`, "proud");
    }
    if (id === "eye") return finish(withP(s, (pl) => ({ ...pl, nextCfBoost: true })), "The next asset you buy will pay more.", "proud");
    return finish(withP(s, (pl) => ({ ...pl, cash: pl.cash + 250 })), "Mentorship comes with $250.", "happy");
  }
  if (payload.t === "legacy") return resolveLegacy(s, payload.id, id);
  if (payload.t === "boom") {
    const applied = applyBoom(p, payload.id, s.seq);
    return finish(withP(s, () => applied.player), applied.note, applied.reaction);
  }
  if (payload.t === "dream") return resolveDream(s, id);
  if (payload.t === "give") return resolveGive(s, id);
  if (payload.t === "family") return resolveFamily(s, id);
  if (payload.t === "loan") {
    if (id === "scrape") {
      return finish(
        withP(s, (pl) => ({ ...pl, cash: 0, brokeTurns: 0 })),
        "You pay what cash you have. The rest of this quiet month is forgiven.",
        "stressed",
      );
    }
    if (id === "broke") {
      const before = p.assets.length;
      const next = repossess(p);
      const note = before ? "Broke. A small asset is repossessed and you skip a turn." : "Broke. Cash resets and you skip a turn.";
      return finish(withP(s, () => next), note, "stressed");
    }
    const n = withP({ ...s, seq: s.seq + 1 }, (pl) => addLoan(pl, s.seq));
    if (cur(n).cash < 0) return blip({ ...n, phase: "card", card: loanCard(!!payload.fromBroke) }, "cash");
    if (payload.fromBroke) {
      return finish(withP(n, (pl) => ({ ...pl, brokeTurns: 0 })), "The loan covers this quiet month.", "stressed");
    }
    return finish(n, "The loan covers the hole.", "stressed");
  }
  if (payload.t === "freedom") return finish(s, "You stand on the Freedom Track.", "proud");
  if (payload.t === "house") return resolveHouse(s, id);
  if (payload.t === "ascent") {
    if (id === "found") return foundBusiness(s, payload.reason);
    if (id === "keep") return keepRevenue(s, payload.reason);
    return s;
  }
  if (payload.t === "summit") {
    if (id === "retire") {
      const reason: WinReason = payload.kind === "venture" ? "venture" : "fortune";
      return win(
        withP(s, (pl) => ({ ...pl, stretchClaimed: true, capstone: payload.kind })),
        reason,
      );
    }
    return finish(
      withP(s, (pl) => ({ ...pl, stretchClaimed: true, capstone: payload.kind })),
      "You stay. The goal is banked, and the month continues.",
      "proud",
    );
  }
  if (payload.t === "client") return resolveClient(s, payload.id, id);
  if (payload.t === "hire") return resolveHire(s, payload.id, id);
  if (payload.t === "expand") return resolveExpand(s, payload.id, id);
  if (payload.t === "ops") return resolveOps(s, payload.id, id);
  if (payload.t === "pitch") return resolvePitch(s, id);
  if (payload.t === "press") return resolvePress(s, payload.id);
  if (payload.t === "brand") return resolveBrand(s, id);
  if (payload.t === "scale") return resolveScale(s, id);
  if (payload.t === "exit") return resolveExit(s, payload.price, id);
  if (payload.t === "life") return resolveLife(s, payload.kind, id);
  return s;
}

function rebuild(s: GameState, payload: Payload): GameState {
  const p = cur(s);
  if (payload.t === "deal") {
    const deal = dealById(payload.dealId);
    return { ...s, card: dealCard(p, deal, payload.pool) };
  }
  if (payload.t === "deal2") return { ...s, card: twoDealCard(p, dealById(payload.a), dealById(payload.b)) };
  if (payload.t === "spend") {
    const spend = LIFESTYLE.find((x) => x.id === payload.spendId)!;
    const amount = spendAmount(p, spend);
    return {
      ...s,
      card: {
        ...s.card!,
        lines: [
          { k: "Pay", v: money(amount), tone: "down" },
          ...(spend.monthly ? [{ k: "Then monthly", v: `${money(spend.monthly)}/mo`, tone: "down" as const }] : []),
        ],
        choices: p.cash >= amount ? [gold("Pay", "pay"), ghost("Let it pass", "decline")] : [gold("Borrow $1,000", "borrow"), ghost("Let it pass", "decline")],
        payload: { t: "spend", spendId: spend.id, amount },
      },
    };
  }
  if (payload.t === "dream") return { ...s, card: dreamCard(p) };
  if (payload.t === "legacy") {
    const item = LEGACY.find((x) => x.id === payload.id)!;
    const afford = p.cash >= item.cost;
    return {
      ...s,
      card: {
        title: item.title,
        story: item.story,
        art: "/game/art/scholar.jpg",
        tag: "Legacy project",
        lines: [
          { k: "Cost", v: money(item.cost), tone: "down" },
          { k: "Passive", v: `${money(item.cashFlow, true)}/mo`, tone: "up" },
          { k: "Cash", v: money(p.cash), tone: "gold" },
        ],
        choices: afford
          ? [gold("Fund it", "accept"), ghost("Not this decade", "decline")]
          : [gold("Borrow $1,000", "borrow"), ghost("Decline", "decline")],
        payload,
      },
    };
  }
  if (payload.t === "tax") return { ...s, card: taxCard(p) };
  if (payload.t === "give") return { ...s, card: giveCard(p) };
  if (payload.t === "career" && payload.kind === "cert") return { ...s, card: { ...s.card!, choices: p.cash >= 900 ? [gold("Pay $900", "take"), ghost("Skip it", "decline")] : [gold("Borrow $1,000", "borrow"), ghost("Skip it", "decline")] } };
  if (payload.t === "health") return { ...s, card: healthCard() };
  if (payload.t === "client") return { ...s, card: renderClient(p, payload.id) };
  if (payload.t === "hire") return { ...s, card: renderHire(p, payload.id) };
  if (payload.t === "expand") return { ...s, card: renderExpand(p, payload.id) };
  if (payload.t === "ops") return { ...s, card: renderOps(p, payload.id) };
  if (payload.t === "brand") return { ...s, card: brandCard(p) };
  if (payload.t === "scale") return { ...s, card: scaleCard(p) };
  if (payload.t === "pitch") return { ...s, card: pitchCard(p) };
  return s;
}

function resolveDeal(s: GameState, payload: Extract<Payload, { t: "deal" }>, id: string): GameState {
  if (id === "decline") return finish(s, `Passed on ${dealById(payload.dealId).title}.`, "idle");
  if (id !== "accept") return s;
  const deal = dealById(payload.dealId);
  const p = cur(s);
  if (p.cash < payload.down) return s;
  const next = takeDeal(p, deal, payload.down, payload.cashFlow, s.seq);
  const note = deal.passive
    ? `Bought ${deal.title}. ${money(payload.cashFlow, true)}/mo passive.`
    : `Took ${deal.title}. ${money(payload.cashFlow, true)}/mo earned.`;
  return finish(withP({ ...s, seq: s.seq + 1 }, () => next), note, "proud");
}

function resolveDeal2(s: GameState, payload: Extract<Payload, { t: "deal2" }>, id: string): GameState {
  if (id === "decline") return finish(s, "You left both deals on the table.", "idle");
  if (id !== "a" && id !== "b") return s;
  const dealId = id === "a" ? payload.a : payload.b;
  const down = id === "a" ? payload.downA : payload.downB;
  const cashFlow = id === "a" ? payload.cfA : payload.cfB;
  return resolveDeal(s, { t: "deal", dealId, pool: "small", down, cashFlow }, "accept");
}

function resolveSpend(s: GameState, payload: Extract<Payload, { t: "spend" }>, id: string): GameState {
  if (id !== "pay") return finish(s, "You let the lifestyle expense pass.", "idle");
  const spend = LIFESTYLE.find((x) => x.id === payload.spendId)!;
  if (cur(s).cash < payload.amount) return s;
  return finish(
    withP(s, (p) => ({ ...p, cash: p.cash - payload.amount, expenseMods: p.expenseMods + (spend.monthly ?? 0) })),
    `Paid ${spend.title}. ${money(payload.amount)}.`,
    "stressed",
  );
}

function drawSome<T>(s: GameState, pool: T[], n: number): T[] {
  const left = [...pool];
  const out: T[] = [];
  while (out.length < n && left.length) {
    const r = rand(s.seed);
    s.seed = r.seed;
    const i = Math.floor(r.value * left.length);
    out.push(left.splice(i, 1)[0]!);
  }
  return out;
}

function resolveCareer(s: GameState, payload: Extract<Payload, { t: "career" }>, id: string): GameState {
  if (id === "decline") return finish(s, "You stayed in the job you know.", "idle");
  const p = cur(s);
  if (payload.kind === "promo") {
    const extra = hasTrait(p, "Mentor") ? 200 : 0;
    return finish(
      withP(s, (pl) => ({ ...pl, salaryBonus: pl.salaryBonus + 650 + extra, expenseMods: pl.expenseMods + 140 })),
      `Promoted. Salary +$${650 + extra}/mo, expenses +$140.`,
      "proud",
    );
  }
  if (payload.kind === "hustle") {
    return finish(withP(s, (pl) => ({ ...pl, sideIncome: pl.sideIncome + 420, expenseMods: pl.expenseMods + 60 })), "Side hustle +$420/mo.", "happy");
  }
  if (payload.kind === "solo") {
    let n = withP(s, (pl) => ({ ...pl, careerId: "solo", salaryBonus: 0 }));
    if (cur(s).assets.length) {
      n = withP(n, (pl) => ({
        ...pl,
        assets: pl.assets.map((a, i) => (i === 0 ? { ...a, cashFlow: a.cashFlow + 400 } : a)),
      }));
    }
    return finish(n, "You quit to run it yourself.", "proud");
  }
  if (payload.kind === "burn") return finish(withP(s, (pl) => ({ ...pl, salaryBonus: pl.salaryBonus - 250 })), "Burnout. Salary −$250/mo.", "stressed");
  if (payload.kind === "cert") {
    if (p.cash < 900) return s;
    return finish(withP(s, (pl) => ({ ...pl, cash: pl.cash - 900, salaryBonus: pl.salaryBonus + 800 })), "Certified. Salary +$800/mo.", "proud");
  }
  if (payload.kind === "city") return finish(withP(s, (pl) => ({ ...pl, expenseMods: pl.expenseMods - 180 })), "A cheaper city. Expenses −$180/mo.", "happy");
  if (payload.kind === "offer" || payload.kind === "layoff") {
    const picked = id.startsWith("take:") ? id.slice(5) : id === "take" ? payload.careerId : undefined;
    if (!picked) return id === "decline" ? finish(s, "You stayed in the job you know.", "idle") : s;
    const next = CAREERS.find((c) => c.id === picked);
    if (!next || next.id === "solo") return s;
    const title = next.title;
    return finish(
      withP(s, (pl) => ({
        ...pl,
        careerId: next.id,
        salaryBonus: clothDelta(pl.outfit),
        cash: pl.cash + (payload.kind === "layoff" ? 600 : 0),
      })),
      payload.kind === "layoff"
        ? `Layoff. You start as a ${title}. +$600 severance. Clothes ${money(clothDelta(p.outfit), true)}/mo.`
        : `New career: ${title}. Clothes ${money(clothDelta(p.outfit), true)}/mo.`,
      payload.kind === "layoff" ? "stressed" : "proud",
    );
  }
  return s;
}

function doWear(s: GameState, outfit: OutfitId): GameState {
  if (s.screen !== "play" || s.phase !== "idle") return s;
  const p = cur(s);
  if (!isOutfit(outfit) || p.outfit === outfit) return s;
  if (!(p.ownedOutfits ?? ["jeans"]).includes(outfit)) return s;
  return withP(s, (pl) => ({ ...pl, outfit }));
}

function doBuyCloth(s: GameState, outfit: OutfitId): GameState {
  if (s.screen !== "play" || s.phase !== "idle") return s;
  if (outfit === "jeans" || !isOutfit(outfit)) return s;
  const cost = CLOTH_PRICE[outfit];
  const p = cur(s);
  const owned = p.ownedOutfits ?? ["jeans"];
  if (owned.includes(outfit) || p.cash < cost) return s;
  return log(
    withP(s, (pl) => ({ ...pl, cash: pl.cash - cost, ownedOutfits: [...owned, outfit] })),
    `Bought clothes for ${money(cost)}. They are in the wardrobe.`,
  );
}

function doBuyHome(s: GameState, id: string): GameState {
  if (s.screen !== "play" || s.phase !== "idle") return s;
  const item = homeItem(id);
  const p = cur(s);
  if (!item || p.level < HOME_LEVEL) return s;
  const owned = p.homeOwned ?? [];
  if (owned.includes(id) || p.cash < item.cost) return s;
  return log(
    withP(s, (pl) => ({
      ...pl,
      cash: pl.cash - item.cost,
      homeOwned: [...owned, id],
      homeOn: [...(pl.homeOn ?? []), id],
      vitals: bumpVitals(pl.vitals, item.bump),
    })),
    `Bought ${item.name} for ${money(item.cost)}. It is in the house.`,
  );
}

function doToggleHome(s: GameState, id: string): GameState {
  if (s.screen !== "play" || s.phase !== "idle") return s;
  const item = homeItem(id);
  const p = cur(s);
  if (!item || !(p.homeOwned ?? []).includes(id)) return s;
  const on = (p.homeOn ?? []).includes(id);
  const flip: Partial<Vitals> = {};
  for (const key of ["content", "social", "mind", "luck"] as const) {
    const n = item.bump[key];
    if (n) flip[key] = on ? -n : n;
  }
  return withP(s, (pl) => ({
    ...pl,
    homeOn: on ? (pl.homeOn ?? []).filter((x) => x !== id) : [...(pl.homeOn ?? []), id],
    vitals: bumpVitals(pl.vitals, flip),
  }));
}

function doLife(s: GameState, kind: "birthday" | "museum" | "sleep"): GameState {
  if (s.screen !== "play" || s.phase !== "idle") return s;
  const p = cur(s);
  if (p.lifeTurn === s.turn) return s;
  if (kind === "birthday" && p.friends.length === 0) return s;
  const cost = kind === "birthday" ? BIRTHDAY_COST : kind === "museum" ? MUSEUM_COST : 0;
  if (cost > 0 && p.cash < cost) return s;
  return blip(
    {
      ...s,
      phase: "card",
      card: {
        title: kind === "birthday" ? "A friend's birthday" : kind === "museum" ? "The museum" : "Sleep",
        story:
          kind === "birthday"
            ? "The circle saved you a chair. Cake, noise, and a bill. Happiness and the room both get warmer."
            : kind === "museum"
              ? "An afternoon with the paintings. The ticket is small. Your head comes back fuller."
              : "You close the day. No one pays you, and the board spends its chances without you.",
        art: kind === "sleep" ? "/game/art/health.jpg" : kind === "museum" ? "/game/art/studio.jpg" : "/game/art/friends.jpg",
        tag: "Your day",
        lines:
          kind === "sleep"
            ? [
                { k: "Cost", v: money(0), tone: "gold" },
                { k: "Happiness", v: "Rises", tone: "up" },
                { k: "Lucky", v: "Slips", tone: "down" },
                { k: "The board", v: "You miss this roll", tone: "down" },
              ]
            : [
                { k: "Cost", v: money(cost), tone: "down" },
                {
                  k: kind === "birthday" ? "Happiness" : "Intelligence",
                  v: "Rises",
                  tone: "up",
                },
                ...(kind === "birthday" ? [{ k: "Social", v: "Rises", tone: "up" as const }] : []),
              ],
        choices: [gold(kind === "sleep" ? "Sleep" : "Go", "go"), ghost("Not now", "decline")],
        payload: { t: "life", kind },
      },
    },
    "card",
  );
}

function resolveLife(s: GameState, kind: "birthday" | "museum" | "sleep", id: string): GameState {
  if (id !== "go") return blip({ ...s, phase: "idle", card: null }, null);
  const p = cur(s);
  if (p.lifeTurn === s.turn) return blip({ ...s, phase: "idle", card: null }, null);
  if (kind === "sleep") {
    return finish(
      withP(s, (pl) => ({
        ...pl,
        lifeTurn: s.turn,
        vitals: bumpVitals(pl.vitals, { content: 12, social: -4, luck: -8 }),
      })),
      "You slept through the day and missed the board.",
      "idle",
    );
  }
  const cost = kind === "birthday" ? BIRTHDAY_COST : MUSEUM_COST;
  if (p.cash < cost) return s;
  if (kind === "birthday") {
    const friend = [...p.friends].sort((a, b) => b.likes - a.likes || a.sinceTurn - b.sinceTurn)[0];
    if (!friend) return blip({ ...s, phase: "idle", card: null }, null);
    const who = friendDef(friend.id).name.split(" ")[0];
    const n = withP(log(s, `${who}'s birthday costs ${money(cost)}. Happiness and social rise.`), (pl) => ({
      ...pl,
      cash: pl.cash - cost,
      lifeTurn: s.turn,
      reaction: "happy" as const,
      vitals: bumpVitals(pl.vitals, { content: 14, social: 16 }),
      friends: addLedger(pl.friends, friend.id, 0, cost),
    }));
    if (cur(n).cash < 0) return blip({ ...n, phase: "card", card: loanCard(false) }, "cash");
    return blip({ ...n, phase: "idle", card: null }, "cash");
  }
  const n = withP(log(s, `The museum costs ${money(cost)}. Intelligence rises.`), (pl) => ({
    ...pl,
    cash: pl.cash - cost,
    lifeTurn: s.turn,
    reaction: "proud" as const,
    vitals: bumpVitals(pl.vitals, { mind: 14, content: 4 }),
  }));
  if (cur(n).cash < 0) return blip({ ...n, phase: "card", card: loanCard(false) }, "cash");
  return blip({ ...n, phase: "idle", card: null }, "cash");
}

function doCircle(s: GameState, friendId: string): GameState {
  if (s.screen !== "play" || s.phase !== "idle") return s;
  const p = cur(s);
  if (p.circleTurn === s.turn) return s;
  if (!p.friends.some((f) => f.id === friendId)) return s;
  return blip({ ...s, phase: "card", card: circleCard(s, friendId) }, "card");
}

const STOCK_NAMES = ["Harbor paper", "Night-market shares", "Ferry bond", "Ink index"];
const SHOP_NAMES = ["Flower stall", "Corner counter", "Late kiosk", "Paper shop"];

function circleKind(friendId: string, turn: number, seed: number): "party" | "movies" | "gift" | "mission" | "stocks" | "shop" {
  const trait = friendDef(friendId).friendTrait ?? "";
  const bag =
    trait === "Party-goer"
      ? (["party", "party", "movies", "movies", "gift", "shop"] as const)
      : trait === "Investor"
        ? (["stocks", "stocks", "shop", "mission", "gift", "movies"] as const)
        : trait === "Connector"
          ? (["shop", "shop", "mission", "stocks", "party", "gift"] as const)
          : trait === "Mentor"
            ? (["mission", "gift", "gift", "stocks", "shop", "movies"] as const)
            : (["movies", "gift", "gift", "party", "mission", "shop"] as const);
  const n = (seed + turn * 17 + friendId.charCodeAt(0) * 13) >>> 0;
  return bag[n % bag.length]!;
}

function circleCard(s: GameState, friendId: string): CardView {
  const person = friendDef(friendId);
  const n = (s.seed + s.turn * 17 + friendId.charCodeAt(0) * 13) >>> 0;
  const kind = circleKind(friendId, s.turn, s.seed);
  const cost = kind === "party" ? 80 + (n % 5) * 40 : kind === "movies" ? 40 + (n % 4) * 20 : 0;
  const gain = kind === "gift" ? 60 + (n % 5) * 40 : kind === "mission" ? 280 + (n % 6) * 90 : 0;
  const down = kind === "stocks" ? 600 + (n % 5) * 200 : kind === "shop" ? 1200 + (n % 4) * 400 : 0;
  const cashFlow = kind === "stocks" ? 70 + (n % 5) * 30 : kind === "shop" ? 160 + (n % 5) * 50 : 0;
  const assetName = kind === "stocks" ? STOCK_NAMES[n % STOCK_NAMES.length]! : kind === "shop" ? SHOP_NAMES[n % SHOP_NAMES.length]! : "";
  const price = kind === "stocks" || kind === "shop" ? down : cost;
  const afford = price === 0 || cur(s).cash >= price;
  const copy = {
    party: {
      tag: "Birthday",
      speech: "It's my birthday stretch. Come if you can stand the cake and the bill.",
      story: "A party with the circle. It costs cash, and it counts.",
      yes: "Go to the party",
    },
    movies: {
      tag: "Movies",
      speech: "There's a late showing. I'll hold a seat if you buy your ticket.",
      story: "Two hours in the dark. The ticket is the whole price.",
      yes: "Go to the movies",
    },
    gift: {
      tag: "A gift",
      speech: "I found a little extra this week. It's yours if you want it.",
      story: "Not a loan. A gift from someone in the circle.",
      yes: "Take the gift",
    },
    mission: {
      tag: "A mission",
      speech: "I have a job that needs you this week. It pays when it's done.",
      story: "A short hire. Cash now, no monthly string attached.",
      yes: "Take the mission",
    },
    stocks: {
      tag: "A market tip",
      speech: "A quiet name is moving. I can walk you into a small position.",
      story: afford ? "You pay the down payment today." : "You can't cover the down payment yet. Borrow, or come back.",
      yes: "Buy the shares",
    },
    shop: {
      tag: "A shop",
      speech: "That empty counter could open under your name. I'll stand with you.",
      story: afford ? "It needs a down payment, then it pays every month." : "The counter is waiting, but the down payment is short.",
      yes: "Open the shop",
    },
  }[kind];
  const lines: Line[] = [];
  if (cost) lines.push({ k: "Cost", v: money(cost), tone: "down" });
  if (gain) lines.push({ k: "Cash", v: money(gain, true), tone: "up" });
  if (down) lines.push({ k: "Down payment", v: money(down), tone: "down" });
  if (cashFlow) lines.push({ k: "Passive cash flow", v: `${money(cashFlow, true)}/mo`, tone: "up" });
  if (assetName) lines.push({ k: "Offer", v: assetName, tone: "gold" });
  const choices: Choice[] = [];
  if (afford) choices.push(gold(copy.yes, "accept"));
  choices.push(ghost("Not this time", "decline"));
  return {
    title: person.name,
    story: copy.story,
    speech: copy.speech,
    mood: kind === "party" || kind === "movies" ? "happy" : "proud",
    art: "/game/art/friends.jpg",
    portrait: person.portrait,
    tag: copy.tag,
    lines,
    choices,
    payload: { t: "circle", friendId, kind, cost, gain, down, cashFlow, assetName },
  };
}

function openRate(s: GameState, friendId: string, note: string, reaction: Reaction, patch: (p: Player) => Player): GameState {
  const person = friendDef(friendId);
  const n = withP(log(s, note), (p) => ({ ...patch(p), reaction, circleTurn: s.turn }));
  if (cur(n).cash < 0) return blip({ ...n, phase: "card", card: loanCard(false) }, "cash");
  return blip(
    {
      ...n,
      phase: "card",
      card: {
        title: person.name,
        story: note,
        speech: "So. How do you feel about me after that?",
        mood: reaction,
        art: "/game/art/friends.jpg",
        portrait: person.portrait,
        tag: "After",
        lines: [
          { k: "Like", v: "A heart stays on the ledger", tone: "up" },
          { k: "Dislike", v: "Honesty is also a kind of care", tone: "down" },
        ],
        choices: [gold("Like ❤️", "like"), ghost("Dislike 👎", "dislike")],
        payload: { t: "rate", friendId },
      },
    },
    "card",
  );
}

function resolveCircle(s: GameState, payload: Extract<Payload, { t: "circle" }>, id: string): GameState {
  if (id !== "accept") return blip({ ...s, phase: "idle", card: null }, null);
  const p = cur(s);
  if (!p.friends.some((f) => f.id === payload.friendId)) return { ...s, phase: "idle", card: null };
  const who = friendDef(payload.friendId).name.split(" ")[0];
  if (payload.kind === "party" || payload.kind === "movies") {
    if (p.cash < payload.cost) return s;
    const note = payload.kind === "party" ? `${who}'s birthday costs ${money(payload.cost)}.` : `Movies with ${who} cost ${money(payload.cost)}.`;
    return openRate(s, payload.friendId, note, "happy", (pl) => ({
      ...pl,
      cash: pl.cash - payload.cost,
      vitals: bumpVitals(pl.vitals, payload.kind === "party" ? { content: 12, social: 14 } : { content: 8, social: 10 }),
      friends: addLedger(pl.friends, payload.friendId, 0, payload.cost),
    }));
  }
  if (payload.kind === "gift" || payload.kind === "mission") {
    const note = payload.kind === "gift" ? `${who} gives you ${money(payload.gain)}.` : `${who} pays ${money(payload.gain)} for the mission.`;
    return openRate(s, payload.friendId, note, "happy", (pl) => ({
      ...pl,
      cash: pl.cash + payload.gain,
      vitals: bumpVitals(pl.vitals, payload.kind === "mission" ? { mind: 8, luck: 5 } : { content: 4, social: 4 }),
      friends: addLedger(pl.friends, payload.friendId, payload.gain, 0),
    }));
  }
  if (p.cash < payload.down) return s;
  const note =
    payload.kind === "stocks"
      ? `${who}'s tip: ${payload.assetName} pays ${money(payload.cashFlow, true)}/mo.`
      : `${payload.assetName} opens with ${who}. ${money(payload.cashFlow, true)}/mo.`;
  return openRate({ ...s, seq: s.seq + 1 }, payload.friendId, note, "proud", (pl) => ({
    ...pl,
    cash: pl.cash - payload.down,
    vitals: bumpVitals(pl.vitals, payload.kind === "stocks" ? { luck: 8, mind: 3 } : { mind: 6, luck: 2 }),
    assets: [...pl.assets, { id: `a${s.seq}`, name: payload.assetName, cashFlow: payload.cashFlow, down: payload.down, cost: payload.down }],
    friends: addLedger(pl.friends, payload.friendId, 0, payload.down),
  }));
}

function resolveRate(s: GameState, friendId: string, id: string): GameState {
  if (s.card?.payload.t !== "rate") return s;
  const like = id === "like";
  const who = friendDef(friendId).name.split(" ")[0];
  const note = like ? `You liked the time with ${who}.` : `You disliked the time with ${who}.`;
  const n = withP(log(s, note), (p) => ({
    ...p,
    reaction: like ? "love" : "stressed",
    friends: p.friends.map((f) =>
      f.id === friendId
        ? {
            ...f,
            likes: f.likes + (like ? 1 : 0),
            dislikes: f.dislikes + (like ? 0 : 1),
            loyalty: like ? Math.min(4, f.loyalty + 1) : Math.max(1, f.loyalty - 1),
          }
        : f,
    ),
  }));
  const mile = checkMilestone(n);
  if (mile) return mile;
  return blip({ ...n, phase: "idle", card: null }, null);
}

function resolveFriendAct(s: GameState, id: string, choice: string): GameState {
  const def = friendDef(id);
  if (choice === "decline") return finish(withP(s, (p) => ({ ...p, calm: 1 })), "You stayed in. Loyalty holds a little.", "idle");
  if (def.friendTrait === "Party-goer") {
    const cost = 80 + cur(s).friends.length * 70;
    return finish(
      withP(s, (p) => ({
        ...p,
        cash: p.cash - cost,
        calm: 2,
        friends: p.friends.map((f) => (f.id === id ? { ...f, loyalty: Math.min(4, f.loyalty + 1) } : f)),
      })),
      `A night out costs ${money(cost)}.`,
      "stressed",
    );
  }
  if (def.friendTrait === "Connector") {
    const n = withP(s, (p) => ({ ...p, calm: 2, friends: bump(p, id) }));
    const deal = SMALL_DEALS[(n.seq + n.turn) % SMALL_DEALS.length]!;
    return blip(log({ ...n, phase: "card", card: dealCard(cur(n), deal, "small") }, "Jun opens one more small deal."), "card");
  }
  if (def.friendTrait === "Investor") {
    return finish(withP(s, (p) => ({ ...p, nextDownCut: true, calm: 2, friends: bump(p, id) })), "Noa cuts your next down payment.", "happy");
  }
  if (def.friendTrait === "Mentor") {
    return finish(withP(s, (p) => ({ ...p, salaryBonus: p.salaryBonus + 200, calm: 2, friends: bump(p, id) })), "Daichi’s advice is worth +$200/mo.", "proud");
  }
  return finish(withP(s, (p) => ({ ...p, cash: p.cash + 150, calm: 2, friends: bump(p, id) })), "Omar covered $150 of groceries.", "happy");
}

function bump(p: Player, id: string): FriendState[] {
  return p.friends.map((f) => (f.id === id ? { ...f, loyalty: Math.min(4, f.loyalty + 1) } : f));
}

function resolveLegacy(s: GameState, id: string, choice: string): GameState {
  if (choice !== "accept") return finish(s, "The legacy project can wait.", "idle");
  const item = LEGACY.find((x) => x.id === id)!;
  if (cur(s).cash < item.cost) return s;
  return finish(
    withP({ ...s, seq: s.seq + 1 }, (p) => ({
      ...p,
      cash: p.cash - item.cost,
      assets: [...p.assets, { id: `a${s.seq}`, name: item.title, cashFlow: item.cashFlow, down: item.cost, cost: item.cost }],
    })),
    `${item.title} pays ${money(item.cashFlow, true)}/mo.`,
    "proud",
  );
}

function resolveDream(s: GameState, id: string): GameState {
  if (id !== "buy") return finish(s, "The dream stays on the card.", "idle");
  const p = cur(s);
  const dream = dreamById(p.dreamId);
  if (p.track !== "freedom" || p.cash < dream.cost || p.dreamBought) return finish(s, "Not yet.", "idle");
  return finish(withP(s, (pl) => ({ ...pl, cash: pl.cash - dream.cost, dreamBought: true })), `You bought ${dream.name}.`, "proud");
}

function resolveGive(s: GameState, id: string): GameState {
  if (id !== "give") return finish(s, "You keep the money.", "idle");
  if (cur(s).cash < 1500) return s;
  const scholar = dreamById(cur(s).dreamId).id === "scholar";
  return finish(
    withP({ ...s, seq: s.seq + 1 }, (p) => ({
      ...p,
      cash: p.cash - 1500,
      expenseMods: p.expenseMods - 120,
      assets: scholar ? [...p.assets, { id: `a${s.seq}`, name: "Scholarship match", cashFlow: 200, down: 0, cost: 0 }] : p.assets,
    })),
    scholar ? "You give $1,500. Expenses −$120/mo and a match pays +$200." : "You give $1,500. Expenses −$120/mo.",
    "proud",
  );
}

function resolveFamily(s: GameState, id: string): GameState {
  const p = cur(s);
  if (!p.partner && p.children.length === 0) {
    return finish(withP(s, (pl) => ({ ...pl, cash: pl.cash - 40 })), "Flowers cost a net $40.", "happy");
  }
  const cost = id === "quiet" ? 200 : 800;
  if (p.cash < cost) {
    return blip(log(withP({ ...s, seq: s.seq + 1 }, (pl) => addLoan(pl, s.seq)), "Borrowed so the day could happen."), "cash");
  }
  return finish(
    withP(s, (pl) => ({
      ...pl,
      cash: pl.cash - cost,
      calm: 3,
      expenseMods: id === "party" ? pl.expenseMods - 50 : pl.expenseMods,
      friends: pl.friends.map((f) => ({ ...f, loyalty: Math.min(4, f.loyalty + 1) })),
    })),
    id === "party" ? "The party costs $800 and loosens the month by $50." : "A quiet gift. $200.",
    "love",
  );
}

function growBiz(p: Player, revenueDelta: number, payrollDelta: number, cashDelta = 0, useCover = false): Player {
  if (!p.business) return { ...p, cash: p.cash + cashDelta };
  const insured = useCover ? false : p.business.insured;
  return {
    ...p,
    cash: p.cash + cashDelta,
    business: clampBiz(
      { ...p.business, insured },
      p.business.revenue + revenueDelta,
      p.business.payroll + payrollDelta,
    ),
  };
}

function resolveClient(s: GameState, kind: "retainer" | "whale" | "walkin", id: string): GameState {
  if (!cur(s).business) return finish(s, "No company to serve.", "idle");
  if (kind === "walkin" || id === "ok") {
    return finish(withP(s, (p) => growBiz(p, 350, 0, 900)), "A walk-in stays. +$900 and +$350/mo revenue.", "happy");
  }
  if (id !== "accept") return finish(s, "You let the client pass.", "idle");
  if (kind === "whale") {
    if (cur(s).cash < 2200) return s;
    return finish(withP(s, (p) => growBiz(p, 4200, 700, -2200)), "The whale signs. +$4,200/mo revenue.", "proud");
  }
  return finish(withP(s, (p) => growBiz(p, 1400, 280)), "Retainer signed. +$1,400/mo revenue.", "happy");
}

function resolveHire(s: GameState, kind: "lead" | "crew", id: string): GameState {
  if (id !== "accept") return finish(s, "You stay lean.", "idle");
  if (!cur(s).business) return finish(s, "No company to staff.", "idle");
  const cost = kind === "lead" ? 2500 : 700;
  if (cur(s).cash < cost) return s;
  if (kind === "lead") {
    return finish(withP(s, (p) => growBiz(p, 1900, 650, -cost)), "A lead joins. +$1,900/mo revenue.", "proud");
  }
  return finish(withP(s, (p) => growBiz(p, 800, 300, -cost)), "Two part-timers join. +$800/mo revenue.", "happy");
}

function resolveExpand(s: GameState, kind: "site" | "gear", id: string): GameState {
  if (id !== "accept") return finish(s, "You keep the company the size it is.", "idle");
  if (!cur(s).business) return finish(s, "Nothing to expand.", "idle");
  const cost = kind === "site" ? 7500 : 2800;
  if (cur(s).cash < cost) return s;
  if (kind === "site") {
    return finish(withP(s, (p) => growBiz(p, 5200, 1500, -cost)), "A second site opens. +$5,200/mo revenue.", "proud");
  }
  return finish(withP(s, (p) => growBiz(p, 1700, 180, -cost)), "New tools. +$1,700/mo revenue.", "happy");
}

function resolveOps(s: GameState, kind: "break" | "refund" | "smooth", id: string): GameState {
  const p = cur(s);
  if (!p.business) return finish(s, "Operations can wait.", "idle");
  if (kind === "smooth") {
    return finish(withP(s, (pl) => growBiz(pl, 0, -200)), "A smooth month. Payroll −$200.", "happy");
  }
  if (kind === "refund") {
    const covered = p.business.insured;
    return finish(
      withP(s, (pl) => growBiz(pl, covered ? -250 : -600, 0, covered ? -150 : -400, covered)),
      covered ? "Refunds, softened by cover." : "Refunds thin the company.",
      "stressed",
    );
  }
  if (id === "skip") {
    return finish(withP(s, (pl) => growBiz(pl, -900, 0)), "You improvise. Revenue −$900/mo.", "stressed");
  }
  const cost = p.business.insured ? 400 : 1100;
  if (p.cash < cost) return s;
  return finish(
    withP(s, (pl) => growBiz(pl, 0, 0, -cost, !!pl.business?.insured)),
    `Repair paid. ${money(cost)}.`,
    "stressed",
  );
}

function resolvePitch(s: GameState, id: string): GameState {
  if (id !== "accept") return finish(s, "You keep the company to yourself.", "proud");
  if (!cur(s).business) return finish(s, "No company to fund.", "idle");
  return finish(withP(s, (p) => growBiz(p, 2200, 750, 10000)), "Angel money lands. +$10,000 and +$2,200/mo.", "proud");
}

function resolvePress(s: GameState, kind: "feature" | "scandal"): GameState {
  const p = cur(s);
  if (!p.business) return finish(s, "No one is writing about you.", "idle");
  if (kind === "feature") {
    const bump = Math.round(p.business.revenue * 0.12);
    return finish(withP(s, (pl) => growBiz(pl, bump, 0)), `A kind feature. Revenue +${money(bump)}/mo.`, "proud");
  }
  const covered = p.business.insured;
  const drop = Math.round(p.business.revenue * (covered ? 0.04 : 0.1));
  const cash = covered ? -250 : -700;
  return finish(
    withP(s, (pl) => growBiz(pl, -drop, 0, cash, covered)),
    covered ? "The piece stings less than it could have." : "The piece costs you.",
    "stressed",
  );
}

function resolveBrand(s: GameState, id: string): GameState {
  if (id !== "accept") return finish(s, "The name can wait.", "idle");
  if (cur(s).cash < 2400 || !cur(s).business) return s;
  return finish(withP(s, (p) => growBiz(p, 1200, 0, -2400)), "The brand lands. +$1,200/mo revenue.", "proud");
}

function resolveScale(s: GameState, id: string): GameState {
  if (id !== "accept") return finish(s, "You hold the current size.", "idle");
  if (cur(s).cash < 12000 || !cur(s).business) return s;
  return finish(withP(s, (p) => growBiz(p, 8500, 2000, -12000)), "You scale. +$8,500/mo revenue.", "proud");
}

function resolveExit(s: GameState, price: number, id: string): GameState {
  if (id !== "sell") {
    return finish(
      withP(s, (p) => (p.business ? growBiz(p, 400, 0) : p)),
      "You keep the company. Revenue edges up.",
      "proud",
    );
  }
  const name = cur(s).business?.name ?? "the company";
  return finish(
    withP(s, (p) => ({
      ...p,
      cash: p.cash + price,
      business: null,
      track: "freedom",
      position: 0,
      stretchClaimed: true,
      capstone: "exit",
      reaction: "proud",
    })),
    `Sold ${name} for ${money(price)}. Back on the Freedom Track, still in the game.`,
    "proud",
  );
}

function resolveHouse(s: GameState, id: string): GameState {
  if (!cur(s).partner || id === "decline") return finish(withP(s, (p) => ({ ...p, householdIn: 2 })), "The household talk can wait.", "idle");
  if (id === "budget") {
    return finish(withP(s, (p) => ({ ...p, cash: p.cash - 100, expenseMods: p.expenseMods - 80, householdIn: 3 })), "Shared budget. −$100 now, −$80/mo expenses.", "love");
  }
  if (cur(s).cash < 500) return finish(s, "The project needs $500 you don’t have.", "stressed");
  return finish(
    withP({ ...s, seq: s.seq + 1 }, (p) => ({
      ...p,
      cash: p.cash - 500,
      householdIn: 3,
      assets: [...p.assets, { id: `a${s.seq}`, name: "Household project", cashFlow: 180, down: 500, cost: 500 }],
    })),
    "Household project pays +$180/mo.",
    "proud",
  );
}

function doBreathe(s: GameState): GameState {
  if (s.phase !== "broke") return s;
  const st = statement(cur(s));
  if (st.cashFlow < 0) {
    const due = -st.cashFlow;
    if (cur(s).cash < due) {
      return blip({ ...s, phase: "card", card: loanCard(true) }, "card");
    }
    return finish(withP(s, (p) => ({ ...p, cash: p.cash - due, brokeTurns: 0 })), `You sat out and still paid ${money(due)}.`, "stressed");
  }
  return finish(withP(s, (p) => ({ ...p, brokeTurns: 0 })), "You catch your breath. No roll this turn.", "idle");
}

function doBorrow(s: GameState): GameState {
  if (s.phase === "card") return doChoice(s, "borrow");
  if (s.phase !== "idle") return s;
  return blip(log(withP({ ...s, seq: s.seq + 1 }, (p) => addLoan(p, s.seq)), "Borrowed $1,000 at $100/mo."), "cash");
}

function doRepay(s: GameState, id: string): GameState {
  if (s.phase !== "idle") return s;
  const loan = cur(s).liabilities.find((l) => l.id === id);
  if (!loan || cur(s).cash < loan.principal) return s;
  return blip(
    log(
      withP(s, (p) => ({
        ...p,
        cash: p.cash - loan.principal,
        liabilities: p.liabilities.filter((l) => l.id !== id),
      })),
      `Repaid ${loan.name}.`,
    ),
    "cash",
  );
}

function doSell(s: GameState, id: string): GameState {
  if (s.phase !== "idle") return s;
  const asset = cur(s).assets.find((a) => a.id === id);
  if (!asset) return s;
  const proceeds = Math.max(100, Math.round(asset.down * 0.7 + asset.cost * 0.15));
  return blip(
    log(
      withP(s, (p) => ({
        ...p,
        cash: p.cash + proceeds,
        assets: p.assets.filter((a) => a.id !== id),
        liabilities: p.liabilities.filter((l) => l.id !== `${id}:note`),
      })),
      `Sold ${asset.name} for ${money(proceeds)}.`,
    ),
    "cash",
  );
}

function doEnter(s: GameState): GameState {
  if (s.phase !== "idle") return s;
  const p = cur(s);
  if (p.track !== "grind" || !unlocked(p)) return s;
  const amount = statement(p).cashFlow;
  let n = withP(s, (pl) => ({ ...pl, track: "freedom", position: 0, cash: pl.cash + amount, reaction: "proud" }));
  n = log(n, `The gate opens. Stipend ${money(amount, true)}.`);
  const card = buildSpace(n, "premium");
  return blip(
    {
      ...n,
      phase: "card",
      passedPay: 0,
      card: {
        ...card,
        lines: [paydayLine(amount), ...card.lines],
        story: `You step onto the Freedom Track. ${card.story}`,
      },
    },
    "win",
  );
}

function doRetire(s: GameState): GameState {
  if (s.phase !== "idle" || s.screen !== "play") return s;
  const p = cur(s);
  if (p.level < 2) return s;
  const reason: WinReason =
    p.capstone === "exit"
      ? "exit"
      : p.capstone === "venture"
        ? "venture"
        : p.capstone === "fortune"
          ? "fortune"
          : p.goalReason === "dream"
            ? "dream"
            : "flow";
  return win(s, reason);
}

function ownedOutfitsOf(raw: Player): OutfitId[] {
  const list = Array.isArray(raw.ownedOutfits) ? raw.ownedOutfits.filter(isOutfit) : [];
  const set = new Set<OutfitId>(list.length ? list : ["jeans"]);
  set.add("jeans");
  if (isOutfit(raw.outfit)) set.add(raw.outfit);
  return [...set];
}

function hydratePlayer(raw: Player): Player {
  const level = raw.level === 2 ? 2 : 1;
  const goalReason = raw.goalReason === "dream" || raw.goalReason === "flow" ? raw.goalReason : null;
  const capstone = raw.capstone === "exit" || raw.capstone === "venture" || raw.capstone === "fortune" ? raw.capstone : null;
  return {
    ...raw,
    level,
    business: raw.business ?? null,
    keptRevenue: !!raw.keptRevenue,
    stretchClaimed: !!raw.stretchClaimed,
    goalReason,
    capstone,
    custom: raw.custom ?? null,
    // DEF-GF-04: tolerate partial saves (missing arrays / cash, unknown friend ids) instead of crashing.
    cash: Number.isFinite(Number(raw.cash)) ? Number(raw.cash) : 0,
    children: Array.isArray(raw.children) ? raw.children : [],
    assets: Array.isArray(raw.assets) ? raw.assets : [],
    liabilities: Array.isArray(raw.liabilities) ? raw.liabilities : [],
    friends: (Array.isArray(raw.friends) ? raw.friends : []).filter((f) => FRIENDS.some((d) => d.id === f?.id)).map((f) => ({
      ...f,
      role: f.role === "partner" ? "partner" : f.role ?? "friend",
      sinceTurn: typeof f.sinceTurn === "number" ? f.sinceTurn : 1,
      earned: f.earned ?? 0,
      spent: f.spent ?? 0,
      likes: f.likes ?? 0,
      dislikes: f.dislikes ?? 0,
    })),
    circleTurn: raw.circleTurn ?? 0,
    lifeTurn: typeof raw.lifeTurn === "number" ? raw.lifeTurn : 0,
    outfit: isOutfit(raw.outfit) ? raw.outfit : "jeans",
    ownedOutfits: ownedOutfitsOf(raw),
    homeOwned: Array.isArray(raw.homeOwned) ? raw.homeOwned.filter((id) => typeof id === "string") : [],
    homeOn: Array.isArray(raw.homeOn) ? raw.homeOn.filter((id) => typeof id === "string") : [],
    vitals: normalizeVitals(raw.vitals, raw.characterId),
  };
}

export function hydrate(saved: GameState): GameState {
  const players = (saved.players ?? []).map((p) => hydratePlayer(p));
  let s: GameState = {
    ...blankMenu(),
    ...saved,
    players,
    sfx: null,
    history: Array.isArray(saved.history) ? saved.history : saved.log ?? [],
  };
  if (!players.length) return { ...blankMenu(), muted: !!saved.muted };
  if (s.screen === "win" || s.phase === "win") {
    const idx = Math.min(Math.max(s.winner ?? 0, 0), players.length - 1);
    const p = players[idx]!;
    if (p.level < 2) {
      const reason: GoalReason = s.winReason === "flow" ? "flow" : p.dreamBought ? "dream" : "flow";
      return blip({ ...s, screen: "play", phase: "card", current: idx, card: ascentCard(p, reason) }, null);
    }
    return { ...s, screen: "win", phase: "win", current: idx, card: null };
  }
  if (s.screen === "rules" || s.screen === "credits" || s.screen === "menu") {
    return { ...s, screen: "play" };
  }
  return { ...s, screen: "play" };
}

function doHouse(s: GameState): GameState {
  if (s.phase !== "idle" || !cur(s).partner || cur(s).householdIn > 0) return s;
  const person = partnerDef(cur(s))!;
  return blip(
    {
      ...s,
      phase: "card",
      card: {
        title: "Household decision",
        story: `${person.name.split(" ")[0]} spreads the month on the table and waits.`,
        art: "/game/art/love.jpg",
        portrait: person.portrait,
        tag: "Household",
        lines: [
          { k: "Shared budget", v: "−$100 now, −$80/mo expenses", tone: "up" },
          { k: "Side project", v: "$500 for +$180/mo passive", tone: "gold" },
        ],
        choices: [gold("Shared budget", "budget"), gold("Fund the project", "project"), ghost("Not tonight", "decline")],
        payload: { t: "house" },
      },
    },
    "card",
  );
}

function partnerName(id: string): string {
  return PARTNERS.find((p) => p.id === id)?.name ?? "them";
}

export function dreamOf(p: Player): DreamDef {
  return dreamById(p.dreamId);
}

export function portraitOf(p: Player): string {
  return face(p).portrait;
}

export function nameOf(p: Player): string {
  return face(p).name;
}
