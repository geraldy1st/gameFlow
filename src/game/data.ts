export type SpaceKind =
  | "payday"
  | "career"
  | "small"
  | "big"
  | "lifestyle"
  | "market"
  | "social"
  | "love"
  | "health"
  | "tax"
  | "mentor"
  | "rest"
  | "premium"
  | "legacy"
  | "boom"
  | "dream"
  | "philanthropy"
  | "family"
  | "client"
  | "hire"
  | "expand"
  | "ops"
  | "pitch"
  | "press"
  | "brand"
  | "scale"
  | "exit";

export interface SpaceDef {
  kind: SpaceKind;
  label: string;
}

export interface CareerDef {
  id: string;
  title: string;
  blurb: string;
  salary: number;
  taxes: number;
  rent: number;
  food: number;
  transport: number;
  other: number;
  starting?: boolean;
  /** 0 from the first month. 1 after turn 8. 2 at level 2 or turn 18. */
  tier?: 0 | 1 | 2;
}

export interface DreamDef {
  id: string;
  name: string;
  blurb: string;
  cost: number;
  art: string;
}

export interface CharacterDef {
  id: string;
  name: string;
  title: string;
  blurb: string;
  from: string;
  wants: string;
  bio: string;
  portrait: string;
}

export interface DealDef {
  id: string;
  title: string;
  story: string;
  art: string;
  cost: number;
  down: number;
  payment: number;
  cashFlow: number;
  passive: boolean;
}

export interface SpendDef {
  id: string;
  title: string;
  story: string;
  art: string;
  amount: number;
  monthly?: number;
}

export type FriendTrait =
  | "Connector"
  | "Investor"
  | "Mentor"
  | "Party-goer"
  | "Reliable roommate";

export interface PersonDef {
  id: string;
  name: string;
  trait: string;
  blurb: string;
  bio: string;
  portrait: string;
  income?: number;
  expense?: number;
  friendTrait?: FriendTrait;
}

export const SAVE_KEY = "gameflow-save-v1";
export const TUTORIAL_KEY = "gameflow-tutorial-seen";
export const INTRO_KEY = "gameflow-intro-seen";
export const PASSIVE_WIN = 50_000;
export const VENTURE_GOAL = 120_000;
export const FORTUNE_CASH = 250_000;
export const FORTUNE_PASSIVE = 100_000;
export const LOAN_CASH = 1000;
export const LOAN_PAYMENT = 100;
export const CHILD_COST = 480;
export const MAX_CHILDREN = 3;
export const MAX_FRIENDS = 5;

export const CHARACTERS: CharacterDef[] = [
  {
    id: "aoi",
    name: "Aoi Hoshino",
    title: "Ink-stained dreamer",
    blurb: "Paints menus by day and murals when the café closes. Quiet, stubborn hope.",
    from: "Harbor stairs, above a shuttered tackle shop",
    wants: "A room where the walls are allowed to be the art.",
    bio: "Aoi grew up over a tackle shop that closed before she could spell the sign. She learned money by watching her mother count late-ferry tips into a tin that never quite filled. Days, she pulls espresso and letters the chalkboard so carefully the regulars photograph it. Nights, she paints the alley wall the landlord pretends not to own. She is quiet in a crowded room and stubborn once she has decided. The ledger scares her less than a life where the only beautiful thing is the receipt.",
    portrait: "/game/portraits/aoi.jpg",
  },
  {
    id: "ren",
    name: "Ren Kisaragi",
    title: "Sharp ledger",
    blurb: "Counts every coin twice and still wants a bigger room than the numbers allow.",
    from: "A rented desk that faces a brick wall",
    wants: "Margin. A wider room. Work that pays him back for the evenings he already gave.",
    bio: "Ren double-counts because someone in the family once didn't, and they felt it for a year. He is the junior who stays after the partners leave, not from loyalty but because the columns are the only place he feels precise. He dresses like the job he wants and eats like the job he has. Friends call him cold until he slides the bill toward himself without comment. He keeps a sketch of a studio in the back of a notebook he tells people is for taxes. The numbers are how he hopes. He just refuses to hope out loud.",
    portrait: "/game/portraits/ren.jpg",
  },
  {
    id: "mio",
    name: "Mio Tanabe",
    title: "Soft bloom",
    blurb: "Knows every regular’s flower and which tab they pretend to forget.",
    from: "A flower cooler that hums on Market Street",
    wants: "A shop that still opens in February, not only for weddings.",
    bio: "Mio knows which customer is apologizing and which one is beginning. She learned the trade from an aunt who priced peonies by how sorry the buyer looked, then taught Mio to stop doing that. She is gentle with stems and exact with people. The tab book in her apron is more honest than most banks, written in pencil she wets on her tongue. She sends flowers to no one on her own birthday and pretends that is a preference. What she wants is simple and expensive: a counter, a cooler, and enough quiet income that kindness is no longer a loss.",
    portrait: "/game/portraits/mio.jpg",
  },
  {
    id: "sora",
    name: "Sora Vale",
    title: "Night-shift spark",
    blurb: "Breaks games for a living and wants to ship one that matters.",
    from: "A testing floor that forgets the sun exists",
    wants: "One thing with their name still on it when the shift ends.",
    bio: "Sora breaks games for a living and writes the proof so kindly that producers forget to be angry. They grew up sharing a console and a bedtime, and they still think a good night is a build that fails in an interesting way. Rent is a boss they have not patched. Under the jokes is a precise ambition: stop filing other people's crashes and fund a door that closes when the work is done. They will grind. They would just like the grind to belong to them, and to end in something a stranger can hold.",
    portrait: "/game/portraits/sora.jpg",
  },
];

export const DREAMS: DreamDef[] = [
  {
    id: "cafe",
    name: "Seaside café-gallery",
    blurb: "A cliff-path café where the walls are the exhibition.",
    cost: 16000,
    art: "/game/art/cafe.jpg",
  },
  {
    id: "studio",
    name: "Fund a manga studio",
    blurb: "Twelve desks, one editor, stories that leave the city.",
    cost: 18000,
    art: "/game/art/studio.jpg",
  },
  {
    id: "retreat",
    name: "Mountain retreat",
    blurb: "Cedar, fog, and a door you only open for people you love.",
    cost: 20000,
    art: "/game/art/retreat.jpg",
  },
  {
    id: "scholar",
    name: "Scholarship foundation",
    blurb: "Tuition for kids who draw on the backs of receipts.",
    cost: 17000,
    art: "/game/art/scholar.jpg",
  },
];

export const CAREERS: CareerDef[] = [
  {
    id: "barista",
    title: "Barista-artist",
    blurb: "Lattes, chalk menus, and paint under your nails.",
    salary: 3100,
    taxes: 420,
    rent: 980,
    food: 360,
    transport: 140,
    other: 160,
    starting: true,
  },
  {
    id: "accountant",
    title: "Junior accountant",
    blurb: "Other people’s decimals, your own cramped desk.",
    salary: 4200,
    taxes: 700,
    rent: 1100,
    food: 400,
    transport: 180,
    other: 220,
    starting: true,
  },
  {
    id: "nurse",
    title: "Nurse",
    blurb: "Night rotations and a calm that costs you sleep.",
    salary: 4800,
    taxes: 820,
    rent: 1200,
    food: 420,
    transport: 160,
    other: 250,
    starting: true,
  },
  {
    id: "rider",
    title: "Delivery rider",
    blurb: "The city is a route. Rain is not a reason.",
    salary: 2700,
    taxes: 280,
    rent: 800,
    food: 340,
    transport: 220,
    other: 120,
    starting: true,
  },
  {
    id: "lawyer",
    title: "Junior lawyer",
    blurb: "Long briefs, longer hours, a salary that looks richer than it feels.",
    salary: 6100,
    taxes: 1400,
    rent: 1600,
    food: 500,
    transport: 200,
    other: 400,
    starting: true,
  },
  {
    id: "tester",
    title: "Game tester",
    blurb: "You break builds until dawn and file the proof.",
    salary: 3400,
    taxes: 480,
    rent: 1000,
    food: 380,
    transport: 150,
    other: 200,
    starting: true,
  },
  {
    id: "florist",
    title: "Florist",
    blurb: "Stems, ribbon, and a cooler that hums like a secret.",
    salary: 2900,
    taxes: 340,
    rent: 860,
    food: 340,
    transport: 130,
    other: 150,
    starting: true,
  },
  {
    id: "warehouse",
    title: "Warehouse supervisor",
    blurb: "You know every pallet and which shift will call in sick.",
    salary: 3900,
    taxes: 560,
    rent: 1000,
    food: 400,
    transport: 180,
    other: 180,
    starting: true,
  },
  {
    id: "designer",
    title: "Studio designer",
    blurb: "Layouts, clients, and a salary that notices the portfolio.",
    salary: 5400,
    taxes: 980,
    rent: 1300,
    food: 420,
    transport: 160,
    other: 280,
    tier: 1,
  },
  {
    id: "teacher",
    title: "Night teacher",
    blurb: "A classroom after the other day. Steady, not glamorous.",
    salary: 4600,
    taxes: 760,
    rent: 1050,
    food: 380,
    transport: 170,
    other: 200,
    tier: 1,
  },
  {
    id: "chef",
    title: "Line chef",
    blurb: "Heat, tickets, and a wage that smells like the pass.",
    salary: 4300,
    taxes: 640,
    rent: 980,
    food: 280,
    transport: 150,
    other: 190,
    tier: 1,
  },
  {
    id: "analyst",
    title: "Market analyst",
    blurb: "Other people’s numbers, with your name on the memo.",
    salary: 5900,
    taxes: 1200,
    rent: 1450,
    food: 450,
    transport: 180,
    other: 320,
    tier: 1,
  },
  {
    id: "architect",
    title: "Architect",
    blurb: "Drawings that become buildings. The fee arrives in stages.",
    salary: 8200,
    taxes: 1900,
    rent: 1800,
    food: 520,
    transport: 200,
    other: 450,
    tier: 2,
  },
  {
    id: "producer",
    title: "Show producer",
    blurb: "Budgets, talent, and a credit if the thing ships.",
    salary: 8800,
    taxes: 2100,
    rent: 1900,
    food: 540,
    transport: 220,
    other: 500,
    tier: 2,
  },
  {
    id: "editor",
    title: "Editor-in-chief",
    blurb: "The last pencil on other people’s pages.",
    salary: 7600,
    taxes: 1700,
    rent: 1600,
    food: 480,
    transport: 180,
    other: 380,
    tier: 2,
  },
  {
    id: "clinic",
    title: "Clinic lead",
    blurb: "A floor of rooms, a staff, and a pager you asked for.",
    salary: 9400,
    taxes: 2300,
    rent: 2000,
    food: 500,
    transport: 200,
    other: 480,
    tier: 2,
  },
  {
    id: "solo",
    title: "Sole proprietor",
    blurb: "No badge. No net. The month pays only what you invoice.",
    salary: 1600,
    taxes: 200,
    rent: 700,
    food: 320,
    transport: 100,
    other: 80,
  },
];

export const GRIND: SpaceDef[] = [
  { kind: "payday", label: "Payday" },
  { kind: "small", label: "Small Deal" },
  { kind: "lifestyle", label: "Lifestyle" },
  { kind: "social", label: "Social" },
  { kind: "career", label: "Career" },
  { kind: "market", label: "Market" },
  { kind: "small", label: "Small Deal" },
  { kind: "health", label: "Health" },
  { kind: "love", label: "Love" },
  { kind: "big", label: "Big Deal" },
  { kind: "tax", label: "Tax" },
  { kind: "rest", label: "Rest" },
  { kind: "payday", label: "Payday" },
  { kind: "small", label: "Small Deal" },
  { kind: "mentor", label: "Mentor" },
  { kind: "lifestyle", label: "Lifestyle" },
  { kind: "career", label: "Career" },
  { kind: "social", label: "Social" },
  { kind: "big", label: "Big Deal" },
  { kind: "market", label: "Market" },
  { kind: "love", label: "Love" },
  { kind: "health", label: "Health" },
  { kind: "small", label: "Small Deal" },
  { kind: "rest", label: "Charity" },
];

export const FREEDOM: SpaceDef[] = [
  { kind: "premium", label: "Premium" },
  { kind: "legacy", label: "Legacy" },
  { kind: "boom", label: "Boom" },
  { kind: "dream", label: "Dream" },
  { kind: "philanthropy", label: "Give" },
  { kind: "family", label: "Family" },
  { kind: "premium", label: "Premium" },
  { kind: "boom", label: "Crash" },
  { kind: "legacy", label: "Legacy" },
  { kind: "dream", label: "Dream" },
  { kind: "family", label: "Family" },
  { kind: "philanthropy", label: "Give" },
  { kind: "premium", label: "Premium" },
  { kind: "boom", label: "Market" },
  { kind: "legacy", label: "Legacy" },
  { kind: "dream", label: "Dream" },
];

export const VENTURE: SpaceDef[] = [
  { kind: "payday", label: "Books" },
  { kind: "client", label: "Client" },
  { kind: "hire", label: "Hire" },
  { kind: "expand", label: "Expand" },
  { kind: "ops", label: "Ops" },
  { kind: "pitch", label: "Pitch" },
  { kind: "client", label: "Client" },
  { kind: "press", label: "Press" },
  { kind: "hire", label: "Hire" },
  { kind: "expand", label: "Expand" },
  { kind: "brand", label: "Brand" },
  { kind: "client", label: "Client" },
  { kind: "ops", label: "Ops" },
  { kind: "pitch", label: "Pitch" },
  { kind: "scale", label: "Scale" },
  { kind: "exit", label: "Exit" },
];

export const BUSINESSES: Record<string, { name: string; blurb: string }> = {
  cafe: {
    name: "Cliff Path Company",
    blurb: "The café-gallery becomes a small group: one room, a roasting contract, and staff who know the regulars by the cup they pretend not to reorder.",
  },
  studio: {
    name: "Night Desk Studio",
    blurb: "The pages incorporate. Printers, a night editor, and a payroll that expects the next volume.",
  },
  retreat: {
    name: "Cedar & Fog",
    blurb: "The mountain idea gets a ledger, a cook, and keys you no longer carry on your own ring.",
  },
  scholar: {
    name: "Receipt Scholars",
    blurb: "The foundation starts behaving like a company that has to earn the gifts it wants to give.",
  },
};

export function businessFor(dreamId: string): { name: string; blurb: string } {
  return BUSINESSES[dreamId] ?? BUSINESSES.cafe!;
}

export const SMALL_DEALS: DealDef[] = [
  { id: "cart", title: "Used espresso cart", story: "The previous owner left a dent and a loyal morning crowd.", art: "/game/art/small.jpg", cost: 2400, down: 800, payment: 160, cashFlow: 420, passive: true },
  { id: "murals", title: "Weekend mural gigs", story: "Three shop walls want a sky. You can paint them after shift.", art: "/game/art/small.jpg", cost: 150, down: 150, payment: 0, cashFlow: 220, passive: false },
  { id: "stickers", title: "Online sticker shop", story: "Your sketches start selling while you sleep. Barely.", art: "/game/art/studio.jpg", cost: 400, down: 400, payment: 0, cashFlow: 160, passive: true },
  { id: "cameras", title: "Secondhand camera rental", story: "Two scratched bodies, one honest lens, weekend tourists.", art: "/game/art/small.jpg", cost: 2200, down: 700, payment: 150, cashFlow: 380, passive: true },
  { id: "room", title: "Spare-room sublet", story: "A cousin’s futon becomes a quiet little income.", art: "/game/art/big.jpg", cost: 500, down: 500, payment: 0, cashFlow: 340, passive: true },
  { id: "stall", title: "Pop-up flower stall", story: "Friday market, buckets, and people who buy peonies to apologize.", art: "/game/art/small.jpg", cost: 1800, down: 650, payment: 110, cashFlow: 320, passive: true },
  { id: "tutor", title: "Night-shift tutoring", story: "Exam season. You trade sleep for hourly cash.", art: "/game/art/career.jpg", cost: 100, down: 100, payment: 0, cashFlow: 260, passive: false },
  { id: "vending", title: "Two-machine vending route", story: "Snacks in a station hallway. Someone has to restock Tuesdays.", art: "/game/art/market.jpg", cost: 3200, down: 1100, payment: 210, cashFlow: 520, passive: true },
  { id: "desk", title: "Shared studio desk", story: "You sublease the window seat three days a week.", art: "/game/art/studio.jpg", cost: 900, down: 900, payment: 0, cashFlow: 240, passive: true },
  { id: "bikes", title: "Three courier bikes", story: "Used, tuned, and rented to riders who hate the bus.", art: "/game/art/small.jpg", cost: 2100, down: 750, payment: 130, cashFlow: 360, passive: true },
  { id: "zine", title: "Recipe zine subscriptions", story: "Forty readers. Then sixty. The printer likes you.", art: "/game/art/studio.jpg", cost: 250, down: 250, payment: 0, cashFlow: 140, passive: true },
  { id: "bakery", title: "Night-bakery share", story: "You buy a slice of a 4 a.m. oven and its cinnamon reputation.", art: "/game/art/small.jpg", cost: 3000, down: 1200, payment: 180, cashFlow: 480, passive: true },
];

export const BIG_DEALS: DealDef[] = [
  { id: "laundry", title: "Corner laundromat", story: "Eight machines, a flickering sign, and coins that never quite sleep.", art: "/game/art/big.jpg", cost: 16000, down: 4000, payment: 700, cashFlow: 1600, passive: true },
  { id: "walkup", title: "Six-unit walk-up", story: "The stairwell smells like soup. The rents clear anyway.", art: "/game/art/big.jpg", cost: 28000, down: 6500, payment: 1100, cashFlow: 2600, passive: true },
  { id: "franchise", title: "Manga-print franchise", story: "A license, a glossy counter, and fans who queue in the rain.", art: "/game/art/studio.jpg", cost: 20000, down: 5200, payment: 800, cashFlow: 2000, passive: true },
  { id: "hall", title: "Night-market food hall", story: "Four stalls under one roof. You own the roof, not the recipes.", art: "/game/art/market.jpg", cost: 14000, down: 3600, payment: 550, cashFlow: 1450, passive: true },
  { id: "hostel", title: "Boutique hostel floor", story: "Bunks with good linen and a ledger that finally smiles.", art: "/game/art/big.jpg", cost: 30000, down: 7200, payment: 1200, cashFlow: 2900, passive: true },
  { id: "booths", title: "Recording-booth rental", story: "Singers book the midnight hour. You book the profit.", art: "/game/art/studio.jpg", cost: 10000, down: 2800, payment: 400, cashFlow: 1100, passive: true },
  { id: "vans", title: "Co-op delivery vans", story: "Two vans, shared drivers, routes you no longer ride yourself.", art: "/game/art/market.jpg", cost: 18000, down: 4800, payment: 750, cashFlow: 1850, passive: true },
  { id: "clinic", title: "Small clinic partnership", story: "You don’t practice. You keep the lights on for people who do.", art: "/game/art/health.jpg", cost: 36000, down: 8000, payment: 1400, cashFlow: 3400, passive: true },
];

export const PREMIUM_DEALS: DealDef[] = [
  { id: "warehouse", title: "Harbor warehouse conversion", story: "Brick, tide, and studios that rent before the paint dries.", art: "/game/art/big.jpg", cost: 50000, down: 12000, payment: 1800, cashFlow: 7200, passive: true },
  { id: "distributor", title: "Regional comic distributor", story: "Boxes, routes, and a cut of every volume that lands.", art: "/game/art/studio.jpg", cost: 64000, down: 15000, payment: 2200, cashFlow: 9500, passive: true },
  { id: "onsen", title: "Hot-spring inn share", story: "Steam, cedar, and guests who book a year ahead.", art: "/game/art/retreat.jpg", cost: 80000, down: 18000, payment: 2600, cashFlow: 12000, passive: true },
  { id: "solar", title: "Solar rooftop portfolio", story: "Other people’s roofs. Your quiet kilowatts.", art: "/game/art/big.jpg", cost: 42000, down: 10000, payment: 1500, cashFlow: 6400, passive: true },
  { id: "chain", title: "Clinic-chain seed", story: "Three neighborhoods, one back office, a very large yes.", art: "/game/art/health.jpg", cost: 90000, down: 22000, payment: 3000, cashFlow: 15000, passive: true },
  { id: "retail", title: "Transit-adjacent retail", story: "The corner everyone walks past. Now they pay rent to you.", art: "/game/art/market.jpg", cost: 58000, down: 14000, payment: 2000, cashFlow: 8800, passive: true },
];

export const LIFESTYLE: SpendDef[] = [
  { id: "sneakers", title: "Limited sneakers", story: "They drop at noon. Your resolve does not.", art: "/game/art/lifestyle.jpg", amount: 420 },
  { id: "dinner", title: "The long dinner", story: "A table of people you like and a bill that arrives like weather.", art: "/game/art/friends.jpg", amount: 180 },
  { id: "phone", title: "New phone", story: "The old one still calls. The new one understands you, allegedly.", art: "/game/art/lifestyle.jpg", amount: 980 },
  { id: "rail", title: "Weekend rail trip", story: "Two nights, one sea view, zero emails if you are brave.", art: "/game/art/cafe.jpg", amount: 360 },
  { id: "coat", title: "Designer coat", story: "It fits like a decision you are not sure you can afford.", art: "/game/art/lifestyle.jpg", amount: 740 },
  { id: "subs", title: "Subscription shrine", story: "Three apps, two crates, one magazine. They renew forever.", art: "/game/art/lifestyle.jpg", amount: 40, monthly: 70 },
  { id: "concert", title: "Concert tickets", story: "The band you loved at twenty is in town and not cheaper.", art: "/game/art/friends.jpg", amount: 240 },
  { id: "gadget", title: "Kitchen gadget", story: "It juliennes. You will use it twice and smile anyway.", art: "/game/art/lifestyle.jpg", amount: 310 },
  { id: "pens", title: "Gold-ink pen set", story: "Unnecessary. Beautiful. Dangerous near a signature.", art: "/game/art/lifestyle.jpg", amount: 160 },
  { id: "marathon", title: "Marathon kit", story: "Entry fee, shoes, and a story you can tell even if you walk.", art: "/game/art/health.jpg", amount: 280 },
];

export const PARTNERS: PersonDef[] = [
  { id: "haru", name: "Haru Imai", trait: "Mapmaker", blurb: "Studies every room before sitting down.", bio: "Haru draws a room before he agrees to sit in it. He maps a month the way he maps a street: the exits, the light, and the corner you will regret. Living with him means the groceries have a plan and the weekend has a margin. He is quiet until the plan is wrong, and then he is exact.", portrait: "/game/portraits/haru.jpg", income: 1500, expense: 720 },
  { id: "kei", name: "Kei Morita", trait: "Deal-eye", blurb: "Talks in down payments and means it kindly.", bio: "Kei talks in down payments and means it as care. She can hear a bad deal in the first sentence and still buy the coffee while she explains. She wants a household that can refuse a pretty number. Affection, for her, is a clear no said in time.", portrait: "/game/portraits/kei.jpg", income: 2400, expense: 1200 },
  { id: "nana", name: "Nana Shimizu", trait: "Steady", blurb: "Shows up with soup and a spreadsheet.", bio: "Nana arrives with soup first and the spreadsheet after. She notices who has not eaten and which bill is quietly late. Steadiness is her way of loving people without a speech. She will not let a hard month become a secret.", portrait: "/game/portraits/nana.jpg", income: 1700, expense: 680 },
  { id: "yuu", name: "Yuu Pell", trait: "Spark", blurb: "Turns an ordinary Tuesday into a festival.", bio: "Yuu can turn an ordinary Tuesday into a festival with a speaker and too many oranges. They spend joy easily and earn it back in company. The ledger makes them fidget. The people in the room do not. They believe a life that never celebrates is just a longer bill.", portrait: "/game/portraits/yuu.jpg", income: 980, expense: 860 },
];

export const FRIENDS: PersonDef[] = [
  { id: "jun", name: "Jun Sato", trait: "Connector", friendTrait: "Connector", blurb: "Knows who is quietly selling.", bio: "Jun grew up passing notes between market stalls and never really stopped. He remembers who is selling before they put up a sign, and he introduces people the way other people pass salt. He does not invest. He opens the door and steps aside.", portrait: "/game/portraits/jun.jpg" },
  { id: "daichi", name: "Daichi Morin", trait: "Mentor", friendTrait: "Mentor", blurb: "Asks the question you are avoiding.", bio: "Daichi taught night classes until the questions became more useful than the syllabus. He still asks the one you are dodging, then waits, which is worse. Money, to him, is a story you tell yourself until the month disagrees. He would rather you be accurate than comfortable.", portrait: "/game/portraits/daichi.jpg" },
  { id: "omar", name: "Omar Reed", trait: "Reliable roommate", friendTrait: "Reliable roommate", blurb: "Splits the rent and the quiet.", bio: "Omar splits the rent down to the coin and the quiet down the middle. He cooks when the house is tense and leaves the kitchen cleaner than he found it. He is not loud about loyalty. He is there on the Tuesday the boiler fails.", portrait: "/game/portraits/omar.jpg" },
  { id: "lila", name: "Lila Voss", trait: "Party-goer", friendTrait: "Party-goer", blurb: "A night out that becomes a story.", bio: "Lila treats a Tuesday as if it might become a story, if someone says yes. She knows the late tables, the cheap tickets, and which friend needs to leave the house. The bill is part of the night. So is the laugh after it.", portrait: "/game/portraits/lila.jpg" },
  { id: "noa", name: "Noa Quinn", trait: "Investor", friendTrait: "Investor", blurb: "Funds small runs and remembers the terms.", bio: "Noa funds small runs and writes the terms where you can see them. She likes a clear no more than a muddy yes. If she tips a share, she has already done the boring reading, and she will not pretend the risk is a favor.", portrait: "/game/portraits/noa.jpg" },
];

export const CHILD_NAMES = ["Kiri", "Botan", "Suzu", "Mei", "Io", "Aya", "Nico", "Haruki", "Renji"];

export const LEGACY = [
  { id: "library", title: "Name a library wing", story: "A brass plate, a reading room, and yield that outlives the party.", cost: 3000, cashFlow: 500 },
  { id: "edition", title: "Publish a collected edition", story: "Your old pages, bound properly. Royalties arrive like letters.", cost: 2200, cashFlow: 650 },
  { id: "cohort", title: "Mentor a cohort", story: "Six newcomers, one studio night a week, a fund that compounds goodwill.", cost: 1600, cashFlow: 350 },
];

export const BOOMS = [
  { id: "lift", title: "Market boom", story: "Rents and royalties stretch upward like they heard good news." },
  { id: "drop", title: "Market crash", story: "A headline. Then a quieter number on everything you own." },
  { id: "wind", title: "Unexpected dividend", story: "A venture you forgot still had your name on it." },
  { id: "hit", title: "Sharp correction", story: "The quarter turns. Cash leaves before you can argue." },
];

export function careerById(id: string): CareerDef {
  const c = CAREERS.find((x) => x.id === id);
  if (!c) throw new Error(`missing career ${id}`);
  return c;
}

/** Later careers join the offers as the table goes on. */
export function openCareers(turn: number, level: number): CareerDef[] {
  const tier = level >= 2 || turn >= 18 ? 2 : turn >= 8 ? 1 : 0;
  return CAREERS.filter((c) => c.id !== "solo" && (c.tier ?? 0) <= tier);
}

export function characterById(id: string): CharacterDef {
  const c = CHARACTERS.find((x) => x.id === id);
  if (!c) throw new Error(`missing character ${id}`);
  return c;
}

export function dreamById(id: string): DreamDef {
  const d = DREAMS.find((x) => x.id === id);
  if (!d) throw new Error(`missing dream ${id}`);
  return d;
}

export function trackOf(track: "grind" | "freedom" | "venture"): SpaceDef[] {
  if (track === "grind") return GRIND;
  if (track === "venture") return VENTURE;
  return FREEDOM;
}

export function baseExpenses(c: CareerDef): number {
  return c.taxes + c.rent + c.food + c.transport + c.other;
}
