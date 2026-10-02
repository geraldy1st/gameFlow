import { useEffect, useReducer, useRef, useState } from "react";
import {
  Baby,
  BadgeDollarSign,
  Briefcase,
  Building2,
  Coins,
  Dices,
  Handshake,
  Heart,
  Landmark,
  Newspaper,
  Palette,
  Rocket,
  ScrollText,
  Sparkles,
  Store,
  UserPlus,
  Users,
  Volume2,
  VolumeX,
  Wrench,
} from "lucide-react";
import { CHARACTERS, DREAMS, FORTUNE_CASH, FORTUNE_PASSIVE, FREEDOM, FRIENDS, GRIND, INTRO_KEY, PARTNERS, PASSIVE_WIN, SAVE_KEY, TUTORIAL_KEY, VENTURE, VENTURE_GOAL, type SpaceKind } from "@/game/data";
import { playSfx, resumeAudio, setMuted, unlockAudio } from "@/game/audio";
import { LANG_KEY, readLang, tr, trKey, type Lang } from "@/game/i18n";
import { CHATS, chatText } from "@/game/chats";
import { BIRTHDAY_COST, MUSEUM_COST, OUTFITS, clothDelta, type OutfitId, type Vitals } from "@/game/life";
import { CREATE_CASH, QUIZ_UNLOCK, loadPassed, savePassed, unlockedIds } from "@/game/meta";
import { PASS_AT, QUIZZES } from "@/game/quizzes";
import { CLOTH_PRICE, HOME_LEVEL, HOME_SHOP } from "@/game/shop";
import { TROPHIES, TROPHY_KEY, mergeTrophies, type TrophyPeak } from "@/game/trophies";
import {
  blankMenu,
  cur,
  customPortrait,
  dreamOf,
  money,
  nameOf,
  portraitOf,
  reduce,
  statement,
  unlocked,
  type Action,
  type CardView,
  type Choice,
  type CustomLook,
  type GameState,
  type Pick,
  type Player,
  type Reaction,
} from "@/game/engine";
import { arrivalLine, arrivalMood, bodyPortrait, dressedPortrait, expressionOf, outcomeLine, phraseSalt, speakerIsNpc } from "@/game/speech";

type TFn = (text: string, vars?: Record<string, string | number>) => string;

const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function Die({ value, spinning }: { value: number; spinning: boolean }) {
  const on = new Set(PIPS[value] ?? []);
  return (
    <div className={spinning ? "die spin" : "die"} aria-label={`Die showing ${value}`}>
      {Array.from({ length: 9 }, (_, i) => (
        <i key={i} className={on.has(i) ? "on" : ""} />
      ))}
    </div>
  );
}

function Ticker({ value, signed = false }: { value: number; signed?: boolean }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    const b = value;
    let raf = 0;
    const loop = (now: number) => {
      const t = Math.min(1, (now - start) / 420);
      const e = 1 - (1 - t) ** 2;
      setShown(Math.round(a + (b - a) * e));
      if (t < 1) raf = requestAnimationFrame(loop);
      else from.current = b;
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{money(shown, signed)}</>;
}

function slot(i: number, n: number, rx: number, ry: number) {
  const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
  return {
    left: `${50 + Math.cos(a) * rx}%`,
    top: `${50 + Math.sin(a) * ry}%`,
    faceRight: Math.sin(a) < 0,
  };
}

const ICONS: Partial<Record<SpaceKind, typeof Coins>> = {
  payday: Coins,
  career: Briefcase,
  small: Sparkles,
  big: Landmark,
  lifestyle: Sparkles,
  market: Landmark,
  social: Users,
  love: Heart,
  health: Heart,
  tax: ScrollText,
  mentor: Users,
  rest: Heart,
  premium: Sparkles,
  legacy: Landmark,
  boom: Landmark,
  dream: Sparkles,
  philanthropy: Heart,
  family: Baby,
  client: Store,
  hire: UserPlus,
  expand: Building2,
  ops: Wrench,
  pitch: Handshake,
  press: Newspaper,
  brand: Palette,
  scale: Rocket,
  exit: BadgeDollarSign,
};

function MoodFace({
  src,
  fallback,
  mood,
  className,
}: {
  src: string;
  fallback: string;
  mood: Reaction;
  className?: string;
}) {
  const [img, setImg] = useState(src);
  useEffect(() => setImg(src), [src]);
  return (
    <div className={`mood-face mood-${mood} ${className ?? ""}`}>
      <img src={img} alt="" onError={() => setImg(fallback)} />
      <i className="mark sweat" />
      <i className="mark blush left" />
      <i className="mark blush right" />
      <i className="mark heart" />
      <i className="mark star a" />
      <i className="mark star b" />
      <i className="mark glow" />
    </div>
  );
}

function TokenSprite({
  player,
  walking,
  faceRight,
  offset,
  onOpen,
}: {
  player: Player;
  walking: boolean;
  faceRight: boolean;
  offset: boolean;
  onOpen?: () => void;
}) {
  const [frame, setFrame] = useState(1);
  useEffect(() => {
    if (!walking) return;
    let i = 0;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const order = [2, 4, 3, 1];
    const loop = (now: number) => {
      const dt = Math.min(100, now - last);
      last = now;
      acc += dt;
      if (acc > 130) {
        acc = 0;
        i = (i + 1) % order.length;
        setFrame(order[i] ?? 1);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [walking]);
  const custom = player.custom;
  const src = custom
    ? customPortrait(custom)
    : `/game/tokens/${player.characterId}/frame-${walking ? frame : 1}.png`;
  const mood = walking ? "walk" : player.reaction;
  return (
    <button type="button" className={`token ${custom ? "is-portrait" : ""} ${mood} ${faceRight ? "" : "flip"} ${offset ? "is-p2" : ""}`} onClick={onOpen} aria-label={nameOf(player)}>
      <img src={src} alt="" />
    </button>
  );
}

function Board({ state, t, onStatus }: { state: GameState; t: TFn; onStatus: (player: Player) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const fit = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w < 8 || h < 8) return;
      setScale(Math.min(w / 860, h / 780));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const active = state.players.length ? cur(state) : null;
  const st = active ? statement(active) : null;
  const tight = scale < 0.72;
  const outerR: [number, number] = tight ? [41, 38] : [45, 42];
  const innerR: [number, number] = tight ? [27, 24] : [30.5, 27.5];
  return (
    <div className={`board-wrap ${tight ? "is-tight" : ""}`} ref={host}>
      <div className="board-scale" style={{ transform: `translate(-50%, -50%) scale(${scale})` }}>
        <div className="board">
        {(active?.track === "venture" ? VENTURE : FREEDOM).map((space, i) => {
          const ringSpaces = active?.track === "venture" ? VENTURE : FREEDOM;
          const pos = slot(i, ringSpaces.length, outerR[0], outerR[1]);
          const Icon = ICONS[space.kind] ?? Sparkles;
          const hot = active && active.track !== "grind" && active.position === i;
          const ring = active?.track === "venture" ? "The Venture" : "Freedom";
          return (
            <div key={`f${i}`} className={`space is-outer ${hot ? "is-hot" : ""}`} style={{ left: pos.left, top: pos.top }} title={`${t(space.label)} · ${t(ring)}`}>
              <Icon aria-hidden />
              <strong>{t(space.label)}</strong>
            </div>
          );
        })}
        {GRIND.map((space, i) => {
          const pos = slot(i, GRIND.length, innerR[0], innerR[1]);
          const Icon = ICONS[space.kind] ?? Sparkles;
          const hot = active?.track === "grind" && active.position === i;
          return (
            <div key={`g${i}`} className={`space ${hot ? "is-hot" : ""}`} style={{ left: pos.left, top: pos.top }} title={`${t(space.label)} · ${t("The Grind")}`}>
              <Icon aria-hidden />
              <strong>{t(space.label)}</strong>
            </div>
          );
        })}
        {state.players.map((p, idx) => {
          const track = p.track === "grind" ? GRIND : p.track === "venture" ? VENTURE : FREEDOM;
          const outer = p.track !== "grind";
          const pos = slot(p.position, track.length, outer ? outerR[0] : innerR[0], outer ? outerR[1] : innerR[1]);
          const walking = state.phase === "moving" && idx === state.current;
          return (
            <div key={`${p.id}-${walking ? p.position : "still"}`} className={`token-anchor ${walking ? "is-step" : ""}`} style={{ position: "absolute", left: pos.left, top: pos.top, zIndex: 5 }}>
              <TokenSprite player={p} walking={walking} faceRight={pos.faceRight} offset={idx === 1} onOpen={() => onStatus(p)} />
            </div>
          );
        })}
        <div className="medallion">
          <img src="/game/art/crest.jpg" alt="" />
          <h3>{t(active?.track === "venture" ? "The Venture" : active?.track === "freedom" ? "Freedom" : "The Grind")}</h3>
          {st && (
            <p>
              {t("Passive")} <Ticker value={st.passive} /> · {t("Expenses")} <Ticker value={st.expenses} />
            </p>
          )}
          {active && active.level >= 2 && active.track === "venture" && <div className="gate-pill">{t("Level 2 · Venture")}</div>}
          {active && active.level >= 2 && active.track === "freedom" && <div className="gate-pill">{t("Level 2")}</div>}
          {active && active.level < 2 && unlocked(active) && active.track === "grind" && <div className="gate-pill">{t("Gate is open")}</div>}
          {active && active.level < 2 && active.track === "freedom" && <div className="gate-pill">{t("Outer track")}</div>}
        </div>
      </div>
      </div>
    </div>
  );
}

function ChoiceButtons({ card, onChoose, t }: { card: CardView; onChoose: (id: string) => void; t: TFn }) {
  return (
    <div className="card-actions">
      {card.choices.map((c: Choice) => (
        <button key={c.id + c.label} className={`btn btn-${c.tone}`} onClick={() => onChoose(c.id)}>
          {t(c.label)}
        </button>
      ))}
    </div>
  );
}

function CardModal({
  card,
  player,
  turn,
  onChoose,
  t,
}: {
  card: CardView;
  player: Player;
  turn: number;
  onChoose: (id: string) => void;
  t: TFn;
}) {
  const npc = speakerIsNpc(card);
  const mood = npc ? (card.mood ?? "happy") : arrivalMood(card, player);
  const line = arrivalLine(card, player, phraseSalt(turn, player.position, card.title.length));
  const story = card.story;
  const portrait = npc && card.portrait ? card.portrait : expressionOf(player, mood);
  const fallback = npc && card.portrait ? card.portrait : portraitOf(player);
  const who = npc ? card.title : nameOf(player);
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="card-title">
      <article className={`card-sheet speak-card mood-${mood}`}>
        <MoodFace className="speak-face" src={portrait} fallback={fallback} mood={mood} />
        <div className="card-body">
          <p className="tag">{t(card.tag)}</p>
          <h2 id="card-title">{t(who)}</h2>
          <blockquote className="speech">{t(line)}</blockquote>
          {story !== line && <p className="story">{t(story)}</p>}
          {card.title !== who && <p className="muted">{t(card.title)}</p>}
          <div className="rows">
            {card.lines.map((row) => (
              <div key={row.k}>
                <span>{t(row.k)}</span>
                <strong className={row.tone ?? ""}>{t(row.v)}</strong>
              </div>
            ))}
          </div>
          <ChoiceButtons card={card} onChoose={onChoose} t={t} />
        </div>
      </article>
    </div>
  );
}

const INTRO_SLIDES = [
  {
    place: "Tokyo",
    art: "/game/art/intro-tokyo.jpg",
    line: "We live in a time when knowing how to count matters as much as knowing how to work. Money comes in, money goes out, and no one does it for you.",
  },
  {
    place: "Paris",
    art: "/game/art/intro-paris.jpg",
    line: "Knowing how to manage yourself matters just as much. Sleep, the people around you, what you learn, the luck you let pass: that lives inside a month too.",
  },
  {
    place: "New York",
    art: "/game/art/intro-newyork.jpg",
    line: "School is over. The diploma is in the bag. Ahead is working life: a first salary, a rent, and a city that will not wait.",
  },
  {
    place: "The table",
    art: "/game/art/crest.jpg",
    line: "Choose a life. The month begins.",
  },
] as const;

const RULES = [
  {
    h: "Cash flow",
    p: "Cash flow is salary plus passive income, minus monthly expenses. Assets put money in. Loans, lifestyle, and family costs take money out. A loan is $1,000 and costs $100 a month until you repay the principal. Landing on or passing Payday pays that month’s cash flow — or charges it, if the number is negative.",
  },
  {
    h: "Escape The Grind",
    p: "The inner loop is The Grind. When passive income is greater than total monthly expenses, the gate opens. Step onto the Freedom Track on your turn. You can keep grinding first if you want a fatter ledger.",
  },
  {
    h: "Career, partner, children, friends",
    p: "A new career rewrites salary and base expenses immediately. A partner adds their income and shared costs, and unlocks household decisions. Each child adds $480 a month, up to three. Friends (max five) can open a deal, cut rent, raise a salary, or drag you into a costly night. Loyalty fades if you neglect the social squares.",
  },
  {
    h: "Two ways to clear level 1",
    p: "On the Freedom Track, buy the dream you chose, or reach $50,000 a month in passive cash flow. That is not the end of the table. Level 2 begins, and you choose what the next month is for.",
  },
  {
    h: "Level 2",
    p: "Found a business and your cash flow seeds a company. Payroll starts, and the outer ring becomes The Venture: clients, hires, expansions, and an exit offer. Grow revenue toward $120,000 a month, or sell when a buyer appears. Or keep this revenue on the Freedom Track until passive income hits $100,000 a month or you hold $250,000 cash. After level 2 starts you may retire whenever you want. Until you do, the month keeps going.",
  },
  {
    h: "Your circle",
    p: "Before each roll, tap a friend. A birthday or a movie can cost money. They can also tip a stock, open a shop, or hire you for a paid mission. Then say if you liked them.",
  },
  {
    h: "Your day",
    p: "The bars under a portrait move a little every turn. Before you roll, Day can lift them: a birthday costs cash and raises happiness and social, the museum raises intelligence, and sleep is free but you miss the board.",
  },
  {
    h: "Wardrobe",
    p: "Open your portrait, then Wardrobe. A professional shirt improves a property or a new job by $300 a month. Shorts, a tee, jogging clothes, or going-out clothes worsen that offer by $300. Jeans change nothing. The difference is printed on the offer as clothes.",
  },
  {
    h: "Interact",
    p: "Tap a portrait in your circle, a friend or a partner. You see their name and their story, then Interact. The conversation does not move cash, bars, or the board.",
  },
  {
    h: "Shop",
    p: "Buy clothes before you roll. Owned pieces show up in the wardrobe, and a professional shirt still changes a property or a new job by $300 a month. At level 2 the home shop opens. Equip a lamp, a sofa, a desk, or a charm and the bars move.",
  },
  {
    h: "Quizzes",
    p: "Aoi is playable from the start. Options, then Quizzes: three finance quizzes of five questions. Pass one with 4 of 5 and another face unlocks. Creating your own character waits until you have held $1,000,000 cash.",
  },
  {
    h: "Rewards",
    p: "Paintings you earn stay under Options, then Rewards.",
  },
  {
    h: "This device",
    p: "Save any time. Continue on the home screen brings the table back to that exact moment, even mid-card.",
  },
];

function circlePerson(id: string) {
  return FRIENDS.find((f) => f.id === id) ?? PARTNERS.find((p) => p.id === id) ?? null;
}

function VitalsBars({ vitals, t }: { vitals: Vitals | undefined; t: TFn }) {
  if (!vitals) return null;
  const rows: { key: keyof Vitals; label: string }[] = [
    { key: "content", label: "Happiness" },
    { key: "social", label: "Social" },
    { key: "mind", label: "Intelligence" },
    { key: "luck", label: "Lucky" },
  ];
  return (
    <div className="vitals">
      {rows.map((row) => (
        <div className="vital" key={row.key}>
          <span>{t(row.label)}</span>
          <i>
            <b style={{ width: `${vitals[row.key]}%` }} />
          </i>
        </div>
      ))}
    </div>
  );
}

function RulesBody({ t }: { t: TFn }) {
  return (
    <div className="rules-copy">
      <p className="kicker">{t("How the table works")}</p>
      <h2 className="display" style={{ fontSize: "2.4rem", margin: "0 0 0.4rem" }}>
        {t("Rules")}
      </h2>
      {RULES.map((r) => (
        <section key={r.h}>
          <h3>{t(r.h)}</h3>
          <p>{t(r.p)}</p>
        </section>
      ))}
      <p>{t("Roll, then your token walks the ring. Space or Enter confirms. Esc closes a card you may refuse. Hot-seat: pass the table when asked. The game remembers itself on this device.")}</p>
    </div>
  );
}

function Statement({
  player,
  state,
  dispatch,
  t,
  onStatus,
  onHistory,
  onFriend,
  onCircle,
  onDay,
  onShop,
}: {
  player: Player;
  state: GameState;
  dispatch: (a: Action) => void;
  t: TFn;
  onStatus: () => void;
  onHistory: () => void;
  onFriend: (id: string) => void;
  onCircle: () => void;
  onDay: () => void;
  onShop: () => void;
}) {
  const st = statement(player);
  const dream = dreamOf(player);
  const partner = player.partner ? PARTNERS.find((p) => p.id === player.partner!.id) : null;
  const idle = state.phase === "idle";
  return (
    <aside className="panel">
      <div className="who">
        <div className="who-col">
          <button type="button" className="who-face" onClick={onStatus} aria-label={t("Status")}>
            <img src={dressedPortrait(player, player.reaction)} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).src = portraitOf(player); }} />
          </button>
          <VitalsBars vitals={player.vitals} t={t} />
          <p className="outfit-tag">{t(OUTFITS.find((o) => o.id === player.outfit)?.name ?? "Jeans")}</p>
        </div>
        <div>
          <h2>{nameOf(player)}</h2>
          <p>
            {t(st.career.title)}
            {player.custom ? ` · ${player.custom.age}` : ""}
            {player.level >= 2 ? ` · ${t("Level 2")}` : ""}
            {player.business ? ` · ${t(player.business.name)}` : ""}
          </p>
        </div>
        <Die value={state.die} spinning={state.phase === "rolling"} />
      </div>
      <div className="roll-row is-above">
        {state.phase === "idle" && (
          <button className="btn btn-gold" onClick={() => dispatch({ type: "ROLL" })}>
            <span style={{ display: "inline-flex", gap: "0.35rem", alignItems: "center" }}>
              <Dices size={18} /> {t("Roll")}
            </span>
          </button>
        )}
        {state.phase === "rolling" && <button className="btn btn-ghost" disabled>{t("The die is thinking")}</button>}
        {state.phase === "moving" && <button className="btn btn-ghost" disabled>{t("Walking the ring")}</button>}
        {idle && (
          <button className="btn btn-ghost" onClick={onDay}>{t("Day")}</button>
        )}
        {idle && (
          <button className="btn btn-ghost" onClick={onShop}>{t("Shop")}</button>
        )}
        {idle && (
          <button className="btn btn-ghost" onClick={() => dispatch({ type: "BORROW" })}>{t("Borrow $1,000")}</button>
        )}
        {(player.friends.length > 0 || player.partner) && (
          <button className="btn btn-ghost" onClick={onCircle}>{t("Circle")}</button>
        )}
      </div>
      <div className="flow-hero">
        <div>
          <span>{t("Monthly cash flow")}</span>
          <strong className={st.cashFlow >= 0 ? "" : "down"}>
            <Ticker value={st.cashFlow} signed />
          </strong>
        </div>
        <div>
          <span>{t("Cash")}</span>
          <strong>
            <Ticker value={player.cash} />
          </strong>
        </div>
      </div>
      <div className="rows">
        <div><span>{t("Salary & earned")}</span><strong className="up"><Ticker value={st.salary} /></strong></div>
        <div><span>{t("Passive income")}</span><strong className="up"><Ticker value={st.passive} /></strong></div>
        {st.allyIncome > 0 && <div><span>{t("Allied income")}</span><strong className="up">{money(st.allyIncome)}</strong></div>}
        <div><span>{t("Monthly expenses")}</span><strong className="down"><Ticker value={st.expenses} /></strong></div>
        <div><span>{t("Dream")}</span><strong className="gold">{player.dreamBought ? t("Owned") : t(dream.name)}</strong></div>
      </div>
      {player.business && (
        <div className="list-block">
          <h3>{t(player.business.name)}</h3>
          <div className="rows">
            <div><span>{t("Revenue")}</span><strong className="up">{money(player.business.revenue)}{t("/mo")}</strong></div>
            <div><span>{t("Payroll")}</span><strong className="down">{money(player.business.payroll)}{t("/mo")}</strong></div>
            <div><span>{t("Venture goal")}</span><strong className="gold">{money(VENTURE_GOAL)}{t("/mo")}</strong></div>
          </div>
        </div>
      )}
      {player.level >= 2 && player.keptRevenue && !player.stretchClaimed && (
        <p className="muted">{t("Level 2 aim: {passive}/mo passive, or {cash} cash.", { passive: money(FORTUNE_PASSIVE), cash: money(FORTUNE_CASH) })}</p>
      )}
      <details className="list-block">
        <summary>{t("Expense lines")}</summary>
        <div className="rows">
          <div><span>{t("Taxes")}</span><span>{money(st.taxes)}</span></div>
          <div><span>{t("Rent")}{st.roommate ? t(" (roommate)") : ""}</span><span>{money(st.rent)}</span></div>
          <div><span>{t("Food & transport")}</span><span>{money(st.food + st.transport)}</span></div>
          <div><span>{t("Other + lifestyle")}</span><span>{money(st.other + st.mods)}</span></div>
          <div><span>{t("Partner")}</span><span>{money(st.partnerExpense)}</span></div>
          <div><span>{t("Children")} ({player.children.length})</span><span>{money(st.childCost)}</span></div>
          <div><span>{t("Debt payments")}</span><span>{money(st.debtPay)}</span></div>
          {st.bizPayroll > 0 && <div><span>{t("Business payroll")}</span><span>{money(st.bizPayroll)}</span></div>}
          {st.allyCost > 0 && <div><span>{t("Business partners")}</span><span>{money(st.allyCost)}</span></div>}
        </div>
      </details>
      <div className="list-block">
        <h3>{t("Assets")}</h3>
        {player.assets.length === 0 && <p className="muted">{t("None yet. Deals live on the board.")}</p>}
        {player.assets.map((a) => (
          <div className="mini" key={a.id}>
            <span>{t(a.name)}</span>
            <span className="up">{money(a.cashFlow, true)}{t("/mo")}</span>
            {idle && (
              <button className="linkish" onClick={() => dispatch({ type: "SELL", id: a.id })}>{t("Sell")}</button>
            )}
          </div>
        ))}
      </div>
      <div className="list-block">
        <h3>{t("Liabilities")}</h3>
        {player.liabilities.length === 0 && <p className="muted">{t("No notes. The bank is patient, not kind.")}</p>}
        {player.liabilities.map((l) => (
          <div className="mini" key={l.id}>
            <span>{l.name}</span>
            <span className="down">{money(l.payment)}{t("/mo")}</span>
            {idle && player.cash >= l.principal && (
              <button className="linkish" onClick={() => dispatch({ type: "REPAY", id: l.id })}>{t("Repay")} {money(l.principal)}</button>
            )}
          </div>
        ))}
      </div>
      <div className="list-block">
        <h3>{t("Circle")}</h3>
        <div className="people">
          {partner && (
            <button type="button" className="person" onClick={() => onFriend(partner.id)}>
              <img src={partner.portrait} alt="" />
              <span>{partner.name.split(" ")[0]} · {t("partner")}</span>
            </button>
          )}
          {player.children.map((c) => (
            <figure key={c.id}>
              <img src="/game/art/love.jpg" alt="" />
              <figcaption>{c.name}</figcaption>
            </figure>
          ))}
          {player.friends.map((f) => {
            const def = FRIENDS.find((x) => x.id === f.id);
            if (!def) return null;
            return (
              <button type="button" key={f.id} className="person" onClick={() => onFriend(f.id)}>
                <img src={def.portrait} alt="" />
                <span>{def.name.split(" ")[0]} · {f.role === "partner" ? t("Business partner") : `${f.likes} ❤️`}</span>
              </button>
            );
          })}
          {!partner && player.friends.length === 0 && player.children.length === 0 && (
            <p className="muted">{t("Love, family, and friends show up on their squares.")}</p>
          )}
        </div>
        {idle && player.friends.length > 0 && player.circleTurn !== state.turn && (
          <p className="muted">{t("Before you roll, you can spend time with someone here.")}</p>
        )}
        {idle && player.friends.length > 0 && player.circleTurn === state.turn && (
          <p className="muted">{t("You already saw your circle this turn.")}</p>
        )}
      </div>
      {idle && player.track === "grind" && unlocked(player) && (
        <button className="btn btn-gold btn-wide" style={{ marginTop: "0.55rem" }} onClick={() => dispatch({ type: "ENTER" })}>
          {statement(player).passive >= PASSIVE_WIN ? t("The goal is met — step out") : t("Step onto the Freedom Track")}
        </button>
      )}
      {idle && player.track === "freedom" && !player.dreamBought && (
        <button className="btn btn-gold btn-wide" style={{ marginTop: "0.55rem" }} onClick={() => dispatch({ type: "DREAM" })}>
          {t("Buy dream")} · {money(dream.cost)}
        </button>
      )}
      {idle && partner && player.householdIn === 0 && (
        <button className="btn btn-ghost btn-wide" style={{ marginTop: "0.45rem" }} onClick={() => dispatch({ type: "HOUSE" })}>
          {t("Household decision")}
        </button>
      )}
      {idle && player.level >= 2 && (
        <button className="btn btn-ghost btn-wide" style={{ marginTop: "0.45rem" }} onClick={() => dispatch({ type: "RETIRE" })}>
          {t("Retire from the table")}
        </button>
      )}
      <ul className="log">
        {state.log.map((line, i) => (
          <li key={`${line}-${i}`}>{t(line)}</li>
        ))}
      </ul>
      <button type="button" className="btn btn-ghost btn-wide" style={{ marginTop: "0.55rem" }} onClick={onHistory}>{t("Decisions")}</button>
    </aside>
  );
}

const HAIR = ["black", "brown", "blonde", "auburn"] as const;
const SKIN = ["fair", "warm", "deep"] as const;
const SEX = [
  { id: "f", label: "Woman" },
  { id: "m", label: "Man" },
  { id: "x", label: "Another" },
] as const;

const blankLook = (): CustomLook => ({
  name: "",
  age: 24,
  sex: "f",
  hair: "black",
  skin: "fair",
  bio: "",
});

function vitalBits(bump: Partial<Vitals>, t: TFn): string {
  const parts: string[] = [];
  if (bump.content) parts.push(`${t("Happiness")} +${bump.content}`);
  if (bump.social) parts.push(`${t("Social")} +${bump.social}`);
  if (bump.mind) parts.push(`${t("Intelligence")} +${bump.mind}`);
  if (bump.luck) parts.push(`${t("Lucky")} +${bump.luck}`);
  return parts.join(" · ");
}

function Setup({
  onCancel,
  onStart,
  t,
  unlocked,
  canCreate,
}: {
  onCancel: () => void;
  onStart: (picks: Pick[]) => void;
  t: TFn;
  unlocked: string[];
  canCreate: boolean;
}) {
  const [count, setCount] = useState<1 | 2>(1);
  const [step, setStep] = useState(0);
  const [picks, setPicks] = useState<{ characterId?: string; dreamId?: string; custom?: CustomLook | null }[]>([{}, {}]);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<CustomLook>(blankLook);
  const current = picks[step] ?? {};
  const taken = new Set(
    picks
      .filter((_, i) => i !== step)
      .map((p) => p.characterId)
      .filter((id): id is string => !!id && id !== "custom"),
  );
  const ready = Boolean(current.dreamId && (current.characterId === "custom" ? current.custom?.name : current.characterId));
  const setPick = (patch: Partial<{ characterId: string; dreamId: string; custom: CustomLook | null }>) => {
    setPicks((prev) => prev.map((p, i) => (i === step ? { ...p, ...patch } : p)));
  };
  const useFace = () => {
    const name = draft.name.trim();
    if (!name) return;
    const age = Math.min(80, Math.max(18, Math.round(Number(draft.age) || 18)));
    const look: CustomLook = { ...draft, name, age, bio: draft.bio.trim().slice(0, 600) };
    setDraft(look);
    setPick({ characterId: "custom", custom: look });
    setCreating(false);
  };
  return (
    <section className="menu-hero">
      <div>
        <p className="kicker">{step === 0 ? t("Player one") : t("Player two")} · {count === 1 ? t("Solo") : t("Hot-seat")}</p>
        <h2 style={{ fontSize: "3rem" }}>{t("Choose a life")}</h2>
        <p className="lede">{t("Pick an original face, then the dream that ends the game if you can pay for it on the Freedom Track.")}</p>
        <div className="menu-actions">
          <button className={`btn ${count === 1 ? "btn-gold" : "btn-ghost"}`} onClick={() => { setCount(1); setStep(0); }}>{t("1 player")}</button>
          <button className={`btn ${count === 2 ? "btn-gold" : "btn-ghost"}`} onClick={() => setCount(2)}>{t("2 players")}</button>
        </div>
        <h3 style={{ marginTop: "1rem" }}>{t("Character")}</h3>
        <div className="cast">
          {CHARACTERS.map((c) => {
            const open = unlocked.includes(c.id);
            return (
              <button
                key={c.id}
                className={`${current.characterId === c.id ? "is-on" : ""} ${open ? "" : "is-locked"}`}
                disabled={!open || taken.has(c.id)}
                onClick={() => {
                  setCreating(false);
                  setPick({ characterId: c.id, custom: null });
                }}
              >
                <img src={c.portrait} alt="" />
                <strong>{c.name}</strong>
                <div className="muted">{open ? t(c.title) : t("Locked")}</div>
              </button>
            );
          })}
          {current.custom && (
            <button className={current.characterId === "custom" ? "is-on" : ""} onClick={() => setCreating(true)}>
              <img src={customPortrait(current.custom)} alt="" />
              <strong>{current.custom.name}</strong>
              <div className="muted">{current.custom.age}</div>
            </button>
          )}
        </div>
        {unlocked.length < CHARACTERS.length && (
          <p className="muted">{t("Pass a finance quiz in Options to unlock another face.")}</p>
        )}
        <button
          className={`btn ${creating || current.characterId === "custom" ? "btn-gold" : "btn-ghost"}`}
          style={{ marginTop: "0.7rem" }}
          disabled={!canCreate}
          onClick={() => {
            if (!canCreate) return;
            if (current.custom) setDraft(current.custom);
            setCreating((v) => !v);
          }}
        >
          {t("Create your own")}
        </button>
        {!canCreate && <p className="muted">{t("Reach $1,000,000 cash to create a character.")}</p>}
        {creating && canCreate && (
          <div className="creator">
            <img src={customPortrait(draft)} alt="" />
            <div>
              <p className="kicker">{t("Your character")}</p>
              <label className="field">
                {t("Name")}
                <input
                  value={draft.name}
                  maxLength={28}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </label>
              <label className="field">
                {t("Age")}
                <input
                  type="number"
                  min={18}
                  max={80}
                  value={draft.age}
                  onChange={(e) => setDraft({ ...draft, age: Number(e.target.value) })}
                />
              </label>
              <div className="field">
                {t("Sex")}
                <div className="chip-row">
                  {SEX.map((s) => (
                    <button key={s.id} type="button" className={`btn ${draft.sex === s.id ? "btn-gold" : "btn-ghost"}`} onClick={() => setDraft({ ...draft, sex: s.id })}>
                      {t(s.label)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                {t("Hair color")}
                <div className="chip-row">
                  {HAIR.map((h) => (
                    <button key={h} type="button" className={`btn ${draft.hair === h ? "btn-gold" : "btn-ghost"}`} onClick={() => setDraft({ ...draft, hair: h })}>
                      {t(h === "black" ? "Black" : h === "brown" ? "Brown" : h === "blonde" ? "Blonde" : "Auburn")}
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                {t("Skin color")}
                <div className="chip-row">
                  {SKIN.map((s) => (
                    <button key={s} type="button" className={`btn ${draft.skin === s ? "btn-gold" : "btn-ghost"}`} onClick={() => setDraft({ ...draft, skin: s })}>
                      {t(s === "fair" ? "Fair" : s === "warm" ? "Warm" : "Deep")}
                    </button>
                  ))}
                </div>
              </div>
              <label className="field">
                {t("Short biography")}
                <textarea
                  rows={4}
                  maxLength={600}
                  placeholder={t("Write a few lines they would recognize.")}
                  value={draft.bio}
                  onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
                />
              </label>
              <p className="muted">{t("Manga likeness. The portrait stays a young adult; age lives in the biography.")}</p>
              <button className="btn btn-gold" style={{ marginTop: "0.55rem" }} disabled={!draft.name.trim()} onClick={useFace}>
                {t("Use this face")}
              </button>
            </div>
          </div>
        )}
      </div>
      <div>
        <h3>{t("Dream")}</h3>
        <div className="pick-grid">
          {DREAMS.map((d) => (
            <button
              key={d.id}
              className={`pick-card ${current.dreamId === d.id ? "is-on" : ""}`}
              onClick={() => setPick({ dreamId: d.id })}
            >
              <img src={d.art} alt="" />
              <div>
                <strong>{t(d.name)}</strong>
                <p className="muted">{t(d.blurb)}</p>
                <p className="gold">{money(d.cost)}</p>
              </div>
            </button>
          ))}
        </div>
        <div className="menu-actions">
          <button className="btn btn-ghost" onClick={onCancel}>{t("Back")}</button>
          {count === 2 && step === 0 && (
            <button
              className="btn btn-gold"
              disabled={!ready}
              onClick={() => { setCreating(false); setStep(1); setDraft(picks[1]?.custom ?? blankLook()); }}
            >
              {t("Player two")}
            </button>
          )}
          {(count === 1 || step === 1) && (
            <button
              className="btn btn-gold"
              disabled={!ready}
              onClick={() => {
                const used = count === 1 ? picks.slice(0, 1) : picks.slice(0, 2);
                if (used.every((p) => p.dreamId && (p.characterId === "custom" ? p.custom?.name : p.characterId))) {
                  onStart(used.map((p) => ({
                    characterId: p.characterId === "custom" ? "custom" : p.characterId!,
                    dreamId: p.dreamId!,
                    custom: p.characterId === "custom" ? p.custom ?? null : null,
                  })));
                }
              }}
            >
              {t("Deal careers")}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function QuizDesk({
  lang,
  t,
  passed,
  quizId,
  step,
  picks,
  done,
  onPickList,
  onStart,
  onAnswer,
}: {
  lang: Lang;
  t: TFn;
  passed: string[];
  quizId: string | null;
  step: number;
  picks: number[];
  done: boolean;
  onPickList: () => void;
  onStart: (id: string) => void;
  onAnswer: (choice: number) => void;
}) {
  const quiz = QUIZZES.find((item) => item.id === quizId);
  if (!quiz) {
    return (
      <>
        <h2 id="options-title" className="display" style={{ marginTop: "0.8rem" }}>{t("Finance quizzes")}</h2>
        <p className="muted">{t("Aoi plays from the start. Pass a quiz, 4 of 5, and another face unlocks.")}</p>
        <div className="day-list">
          {QUIZZES.map((item) => {
            const who = CHARACTERS.find((c) => c.id === QUIZ_UNLOCK[item.id]);
            const ok = passed.includes(item.id);
            return (
              <button key={item.id} type="button" className="outfit" onClick={() => onStart(item.id)}>
                <strong>{item.title[lang]}</strong>
                <span>{ok ? t("Passed") : `${t("Unlocks")} ${who?.name ?? ""}`}</span>
              </button>
            );
          })}
        </div>
      </>
    );
  }
  const score = picks.filter((pick, i) => pick === quiz.questions[i]?.answer).length;
  if (done) {
    const ok = score >= PASS_AT;
    const who = CHARACTERS.find((c) => c.id === QUIZ_UNLOCK[quiz.id]);
    return (
      <>
        <h2 id="options-title" className="display" style={{ marginTop: "0.8rem" }}>{quiz.title[lang]}</h2>
        <p>{ok ? t("You passed.") : t("Not this time.")} {score}/5.</p>
        {ok && who && <p>{t("Unlocks")} {who.name}.</p>}
        <div className="chat-log">
          {quiz.questions.map((question, i) => (
            <p key={question.q.en} className={picks[i] === question.answer ? "bubble you" : "bubble them"}>
              <strong>{question.q[lang]}</strong>
              {question.why[lang]}
            </p>
          ))}
        </div>
        <button type="button" className="btn btn-gold" onClick={() => onStart(quiz.id)}>{t("Try again")}</button>
        <button type="button" className="btn btn-ghost" style={{ marginLeft: "0.4rem" }} onClick={onPickList}>{t("Back")}</button>
      </>
    );
  }
  const question = quiz.questions[step];
  if (!question) return null;
  return (
    <>
      <h2 id="options-title" className="display" style={{ marginTop: "0.8rem" }}>{quiz.title[lang]}</h2>
      <p className="kicker">{t("Question")} {step + 1}/5</p>
      <p>{question.q[lang]}</p>
      <div className="day-list">
        {question.choices[lang].map((choice, i) => (
          <button key={choice} type="button" className="outfit" onClick={() => onAnswer(i)}>
            <strong>{choice}</strong>
          </button>
        ))}
      </div>
    </>
  );
}

function persistGame(s: GameState): boolean {
  if ((s.screen !== "play" && s.screen !== "win") || s.players.length === 0) return false;
  localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  return true;
}

export function GameFlow() {
  const [state, dispatch] = useReducer(reduce, undefined, blankMenu);
  const [setup, setSetup] = useState(false);
  const [hasSave, setHasSave] = useState(false);
  const [rules, setRules] = useState(false);
  const [tutorial, setTutorial] = useState<number | null>(null);
  const [flicker, setFlicker] = useState(1);
  const [bioId, setBioId] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>("en");
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [optTab, setOptTab] = useState<"lang" | "rewards" | "quiz">("lang");
  const [passed, setPassed] = useState<string[]>([]);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [quizStep, setQuizStep] = useState(0);
  const [quizPicks, setQuizPicks] = useState<number[]>([]);
  const [quizDone, setQuizDone] = useState(false);
  const [trophyId, setTrophyId] = useState<string | null>(null);
  const [trophies, setTrophies] = useState<{ ids: string[]; peak: TrophyPeak }>({ ids: [], peak: { cash: 0, passive: 0 } });
  const [statusFor, setStatusFor] = useState<Player | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [friendId, setFriendId] = useState<string | null>(null);
  const [circleOpen, setCircleOpen] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const [dayOpen, setDayOpen] = useState(false);
  const [wardrobeOpen, setWardrobeOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [chat, setChat] = useState<{ friendId: string; index: number; step: number } | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [intro, setIntro] = useState<number | "boot" | null>("boot");
  const [outcome, setOutcome] = useState<{ mood: Reaction; line: string; fact: string; portrait: string; fallback: string; name: string } | null>(null);
  const phaseRef = useRef(state.phase);
  const logRef = useRef(state.log[0] ?? "");
  const stateRef = useRef(state);
  stateRef.current = state;
  const t: TFn = (text, vars) => tr(lang, text, vars);

  useEffect(() => {
    setHasSave(!!localStorage.getItem(SAVE_KEY));
    setLang(readLang());
    setPassed(loadPassed());
    setIntro(localStorage.getItem(INTRO_KEY) ? null : 0);
    try {
      const raw = localStorage.getItem(TROPHY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { ids?: string[]; peak?: TrophyPeak };
        if (Array.isArray(parsed.ids)) {
          setTrophies({
            ids: parsed.ids,
            peak: { cash: parsed.peak?.cash ?? 0, passive: parsed.peak?.passive ?? 0 },
          });
        }
      }
    } catch {
      /* ignore a broken trophy file */
    }
    const onVis = () => {
      if (document.visibilityState === "visible") resumeAudio();
      else if (persistGame(stateRef.current)) setHasSave(true);
    };
    const onHide = () => {
      if (persistGame(stateRef.current)) setHasSave(true);
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", onHide);
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    if (!state.players.length) return;
    setTrophies((prev) => {
      const next = mergeTrophies(prev.ids, prev.peak, state.players);
      const same =
        next.peak.cash === prev.peak.cash &&
        next.peak.passive === prev.peak.passive &&
        next.ids.length === prev.ids.length &&
        next.ids.every((id) => prev.ids.includes(id));
      if (same) return prev;
      localStorage.setItem(TROPHY_KEY, JSON.stringify(next));
      return next;
    });
  }, [state]);

  useEffect(() => {
    if (persistGame(state)) setHasSave(true);
  }, [state]);

  useEffect(() => {
    if (!savedFlash) return;
    const id = window.setTimeout(() => setSavedFlash(false), 1600);
    return () => window.clearTimeout(id);
  }, [savedFlash]);

  useEffect(() => {
    setMuted(state.muted);
  }, [state.muted]);

  useEffect(() => {
    if (state.sfx) playSfx(state.sfx);
  }, [state.sfxId, state.sfx]);

  useEffect(() => {
    if (state.phase !== "rolling") return;
    const started = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      setFlicker(1 + Math.floor(Math.random() * 6));
      if (now - started > 680) {
        dispatch({ type: "REVEAL" });
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [state.phase, state.moveSerial]);

  useEffect(() => {
    if (state.phase !== "moving") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const stepMs = reduced ? 16 : 260;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const loop = (now: number) => {
      acc += Math.min(80, now - last);
      last = now;
      if (acc >= stepMs) {
        acc -= stepMs;
        dispatch({ type: "STEP" });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [state.phase, state.moveSerial]);

  useEffect(() => {
    const prevPhase = phaseRef.current;
    const prevLog = logRef.current;
    const logLine = state.log[0] ?? "";
    phaseRef.current = state.phase;
    logRef.current = logLine;
    if (state.screen !== "play") return;
    if (prevPhase === "card" && (state.phase === "idle" || state.phase === "pass") && logLine && logLine !== prevLog) {
      const p = state.players[state.current];
      if (!p) return;
      setOutcome({
        mood: p.reaction,
        line: outcomeLine(p.reaction, phraseSalt(state.turn, p.position, logLine.length)),
        fact: logLine,
        portrait: dressedPortrait(p, p.reaction),
        fallback: portraitOf(p),
        name: nameOf(p),
      });
    } else if (state.phase === "card" || state.phase === "moving" || state.phase === "rolling") {
      setOutcome(null);
    }
  }, [state]);

  useEffect(() => {
    if (!outcome) return;
    const id = window.setTimeout(() => setOutcome(null), 3400);
    return () => window.clearTimeout(id);
  }, [outcome]);

  useEffect(() => {
    if (state.screen !== "play") return;
    if (state.phase === "card") return;
    const el = document.querySelector(".board-wrap");
    if (!el) return;
    if (el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: "nearest" });
  }, [state.phase, state.screen, state.moveSerial]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (e.key === "Escape") {
        if (typeof intro === "number") {
          localStorage.setItem(INTRO_KEY, "1");
          setIntro(null);
          return;
        }
        if (outcome) {
          setOutcome(null);
          return;
        }
        if (statusFor) {
          setStatusFor(null);
          return;
        }
        if (historyOpen) {
          setHistoryOpen(false);
          return;
        }
        if (friendId) {
          setFriendId(null);
          return;
        }
        if (circleOpen) {
          setCircleOpen(false);
          return;
        }
        if (chat) {
          setChat(null);
          return;
        }
        if (shopOpen) {
          setShopOpen(false);
          return;
        }
        if (wardrobeOpen) {
          setWardrobeOpen(false);
          return;
        }
        if (dayOpen) {
          setDayOpen(false);
          return;
        }
        if (confirmNew) {
          setConfirmNew(false);
          return;
        }
        if (optionsOpen) {
          setOptionsOpen(false);
          return;
        }
        if (trophyId) {
          setTrophyId(null);
          return;
        }
        if (bioId) {
          setBioId(null);
          return;
        }
        if (rules) {
          setRules(false);
          return;
        }
        if (tutorial !== null) {
          setTutorial(null);
          localStorage.setItem(TUTORIAL_KEY, "1");
          return;
        }
        if (s.screen === "rules" || s.screen === "credits") {
          dispatch({ type: "MENU" });
          return;
        }
        const card = s.card;
        if (s.phase === "card" && card) {
          const decline = card.choices.find((c) => c.id === "decline");
          const only = card.choices.length === 1 ? card.choices[0] : undefined;
          if (decline) dispatch({ type: "CHOICE", id: decline.id });
          else if (only && (only.id === "ok" || card.payload.t === "start" || card.payload.t === "skip")) {
            dispatch({ type: "CHOICE", id: only.id });
          }
        }
        return;
      }
      if (e.key !== "Enter" && e.key !== " ") return;
      if (typeof intro === "number") {
        e.preventDefault();
        setIntro((cur) => {
          if (typeof cur !== "number") return cur;
          if (cur >= INTRO_SLIDES.length - 1) {
            localStorage.setItem(INTRO_KEY, "1");
            return null;
          }
          return cur + 1;
        });
        return;
      }
      if (outcome || statusFor || historyOpen || friendId || circleOpen || confirmNew || dayOpen || wardrobeOpen || shopOpen || chat) {
        if (e.key === "Enter" || e.key === " ") setOutcome(null);
        return;
      }
      if (e.target instanceof HTMLElement && e.target.closest("button, a, input, textarea, summary")) return;
      e.preventDefault();
      unlockAudio();
      if (s.phase === "idle" && s.screen === "play") dispatch({ type: "ROLL" });
      else if (s.phase === "pass") dispatch({ type: "READY" });
      else if (s.phase === "broke") dispatch({ type: "BREATHE" });
      else if (s.phase === "card" && s.card) {
        const kind = s.card.payload.t;
        if (kind === "ascent" || kind === "summit" || kind === "exit" || kind === "rate" || kind === "life") return;
        const confirm = s.card.choices.find((c) => c.confirm) ?? s.card.choices.find((c) => c.tone === "gold");
        if (confirm) dispatch({ type: "CHOICE", id: confirm.id });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rules, tutorial, bioId, optionsOpen, trophyId, outcome, statusFor, historyOpen, friendId, circleOpen, confirmNew, dayOpen, wardrobeOpen, shopOpen, chat, intro]);

  const go = (action: Action) => {
    unlockAudio();
    dispatch(action);
  };
  const saveNow = () => {
    if (!persistGame(stateRef.current)) return;
    setHasSave(true);
    setSavedFlash(true);
  };
  const beginNew = () => {
    setConfirmNew(false);
    setSetup(true);
    if (stateRef.current.screen !== "menu") dispatch({ type: "MENU" });
  };

  const player = state.players.length ? cur(state) : null;
  const shownDie = state.phase === "rolling" ? flicker : state.die;

  return (
    <div className="gf-app">
      <div className="gf-shell">
        <header className="gf-top">
          <div className="brand">
            <img src="/game/art/crest.jpg" alt="" />
            <div>
              <h1>GameFlow</h1>
              <p>{state.screen === "play" && player ? `${t("Turn {turn} · {name}", { turn: state.turn, name: nameOf(player) })}${player.level >= 2 ? ` · ${t("Level 2")}` : ""}` : t("A ledger you can walk")}</p>
            </div>
          </div>
          <div className="top-actions">
            <button className="btn btn-ghost" onClick={() => setRules(true)}>{t("Rules")}</button>
            {state.screen === "menu" && !setup && (
              <button className="btn btn-ghost" onClick={() => setOptionsOpen(true)}>{t("Options")}</button>
            )}
            {(state.screen === "play" || state.screen === "win") && (
              <button className="btn btn-ghost" onClick={saveNow}>{savedFlash ? t("Saved") : t("Save")}</button>
            )}
            <button className="btn btn-ghost" onClick={() => go({ type: "MUTE" })} aria-label={state.muted ? t("Unmute") : t("Mute")}>
              {state.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            {state.screen !== "menu" && (
              <button className="btn btn-ghost" onClick={() => { setSetup(false); go({ type: "MENU" }); }}>{t("Menu")}</button>
            )}
          </div>
        </header>

        {state.screen === "menu" && !setup && (
          <section className="menu-hero">
            <div>
              <p className="kicker">{t("Original manga board")}</p>
              <h2>GameFlow</h2>
              <p className="lede">
                {t("Walk The Grind until your assets pay the month. Clear level 1 by buying your dream or reaching fifty thousand a month in passive income — then found a business, or keep that revenue and play on.")}
              </p>
              <div className="menu-actions">
                <button className="btn btn-gold" onClick={() => { unlockAudio(); if (hasSave) setConfirmNew(true); else setSetup(true); }}>{t("New game")}</button>
                <button
                  className="btn btn-ghost"
                  disabled={!hasSave}
                  onClick={() => {
                    unlockAudio();
                    const raw = localStorage.getItem(SAVE_KEY);
                    if (!raw) return;
                    try {
                      const saved = JSON.parse(raw) as GameState;
                      if (saved.version === 1 && saved.players?.length) {
                        setSetup(false);
                        go({ type: "CONTINUE", saved });
                      }
                    } catch {
                      setHasSave(false);
                    }
                  }}
                >
                  {t("Continue")}
                </button>
                <button className="btn btn-ghost" onClick={() => go({ type: "RULES" })}>{t("Rules")}</button>
                <button className="btn btn-ghost" onClick={() => go({ type: "CREDITS" })}>{t("Credits")}</button>
                <button className="btn btn-ghost" onClick={() => setOptionsOpen(true)}>{t("Options")}</button>
              </div>
              <p className="cast-hint">{t("Tap a portrait to read their story.")}</p>
              <div className="cast">
                {CHARACTERS.map((c) => {
                  const open = unlockedIds(passed).includes(c.id);
                  return (
                    <button key={c.id} type="button" className={`cast-face ${open ? "" : "is-locked"}`} onClick={() => setBioId(c.id)}>
                      <img src={c.portrait} alt="" />
                      <strong>{c.name}</strong>
                      <span>{open ? t("Biography") : t("Locked")}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="hero-art">
              <img src="/game/art/cafe.jpg" alt={t("Seaside café-gallery")} />
              <div className="hero-caption">
                <strong className="display" style={{ fontSize: "1.8rem" }}>{t("Two rings. One way out.")}</strong>
                <p>{t("Inner Grind. Outer Freedom. Deals, dinners, and the people who change the math.")}</p>
              </div>
            </div>
          </section>
        )}

        {state.screen === "menu" && setup && (
          <Setup
            t={t}
            unlocked={unlockedIds(passed)}
            canCreate={trophies.peak.cash >= CREATE_CASH}
            onCancel={() => setSetup(false)}
            onStart={(picks) => {
              setSetup(false);
              go({ type: "NEW", picks });
              if (!localStorage.getItem(TUTORIAL_KEY)) setTutorial(0);
            }}
          />
        )}

        {(state.screen === "rules" || state.screen === "credits") && (
          <section className="rules-sheet menu-hero" style={{ display: "block" }}>
            {state.screen === "rules" ? (
              <RulesBody t={t} />
            ) : (
              <div className="rules-copy">
                <p className="kicker">{t("Credits")}</p>
                <h2 className="display" style={{ fontSize: "2.6rem", marginTop: 0 }}>{t("Made for this table")}</h2>
                <p>{t("GameFlow is an original game. It is not Monopoly, and it is not the Cashflow board. Characters, dreams, jobs, and the two rings were drawn for this ledger.")}</p>
                <p>{t("Aoi, Ren, Mio, and Sora, plus the people who might share their month, are original faces. Sound is synthesized in the browser. Progress stays on this device.")}</p>
              </div>
            )}
            <button className="btn btn-gold" style={{ marginTop: "0.8rem" }} onClick={() => go({ type: "MENU" })}>{t("Back")}</button>
          </section>
        )}

        {state.screen === "play" && player && (
          <div className="gf-play">
            <Board state={{ ...state, die: shownDie }} t={t} onStatus={setStatusFor} />
            <div className="play-dock">
              <div className="dock-face-col">
                <button type="button" className="dock-face" onClick={() => setStatusFor(player)} aria-label={t("Status")}>
                  <img src={dressedPortrait(player, player.reaction)} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).src = portraitOf(player); }} />
                </button>
                <VitalsBars vitals={player.vitals} t={t} />
              </div>
              <div className="dock-actions">
                {state.phase === "idle" && (
                  <button className="btn btn-gold" onClick={() => go({ type: "ROLL" })}>{t("Roll")}</button>
                )}
                {state.phase === "rolling" && <button className="btn btn-ghost" disabled>{t("The die is thinking")}</button>}
                {state.phase === "moving" && <button className="btn btn-ghost" disabled>{t("Walking the ring")}</button>}
                {state.phase === "idle" && (
                  <button className="btn btn-ghost" onClick={() => go({ type: "BORROW" })}>{t("Borrow $1,000")}</button>
                )}
                {state.phase === "idle" && (
                  <button className="btn btn-ghost" onClick={() => setDayOpen(true)}>{t("Day")}</button>
                )}
                {state.phase === "idle" && (
                  <button className="btn btn-ghost" onClick={() => setShopOpen(true)}>{t("Shop")}</button>
                )}
                {(player.friends.length > 0 || player.partner) && (
                  <button type="button" className="btn btn-ghost" onClick={() => setCircleOpen(true)}>{t("Circle")}</button>
                )}
                <button type="button" className="btn btn-ghost" onClick={() => setHistoryOpen(true)}>{t("Decisions")}</button>
              </div>
              <div className="dock-flow">
                <span>{t("Monthly cash flow")}</span>
                <strong className={statement(player).cashFlow >= 0 ? "" : "down"}>
                  <Ticker value={statement(player).cashFlow} signed />
                </strong>
              </div>
            </div>
            <Statement
              player={player}
              state={{ ...state, die: shownDie }}
              dispatch={go}
              t={t}
              onStatus={() => setStatusFor(player)}
              onHistory={() => setHistoryOpen(true)}
              onFriend={setFriendId}
              onCircle={() => setCircleOpen(true)}
              onDay={() => setDayOpen(true)}
              onShop={() => setShopOpen(true)}
            />
          </div>
        )}

        {state.screen === "win" && player && (
          <section className="win-sheet">
            <p className="kicker">{t("You left the table")}</p>
            <h2 className="display" style={{ fontSize: "3rem", margin: "0.2rem 0" }}>
              {t(state.winReason === "dream"
                ? "The dream is yours"
                : state.winReason === "venture"
                  ? "The company stands"
                  : state.winReason === "exit"
                    ? "Sold, and finished"
                    : state.winReason === "fortune"
                      ? "A fortune, then rest"
                      : "Passive income, unbound")}
            </h2>
            <img className="win-portrait" src={portraitOf(state.players[state.winner]!)} alt="" />
            <p>
              {state.winReason === "dream"
                ? t("{name} bought {dream} and retired.", { name: nameOf(state.players[state.winner]!), dream: t(dreamOf(state.players[state.winner]!).name) })
                : state.winReason === "venture"
                  ? t("{name} built {biz} past {goal} a month and retired.", {
                      name: nameOf(state.players[state.winner]!),
                      biz: t(state.players[state.winner]!.business?.name ?? "a company"),
                      goal: money(VENTURE_GOAL),
                    })
                  : state.winReason === "exit"
                    ? t("{name} sold the company and retired with the check.", { name: nameOf(state.players[state.winner]!) })
                    : state.winReason === "fortune"
                      ? t("{name} hit the level 2 mark and retired.", { name: nameOf(state.players[state.winner]!) })
                      : t("{name} reached {passive} a month in passive income and retired.", {
                          name: nameOf(state.players[state.winner]!),
                          passive: money(statement(state.players[state.winner]!).passive),
                        })}
            </p>
            <p className="muted">{t("Cash left {cash} · Turn {turn}", { cash: money(state.players[state.winner]!.cash), turn: state.turn })}</p>
            <div className="menu-actions" style={{ justifyContent: "center" }}>
              <button className="btn btn-gold" onClick={() => { if (hasSave) setConfirmNew(true); else beginNew(); }}>{t("Play again")}</button>
              <button className="btn btn-ghost" onClick={() => go({ type: "MENU" })}>{t("Menu")}</button>
            </div>
          </section>
        )}
      </div>

      {state.screen === "play" && state.phase === "card" && state.card && player && (
        <CardModal card={state.card} player={player} turn={state.turn} t={t} onChoose={(id) => go({ type: "CHOICE", id })} />
      )}

      {state.screen === "play" && state.phase === "pass" && player && (
        <div className="overlay">
          <div className="pass-gate">
            <p className="kicker">{t("Hot-seat")}</p>
            <h2>{t("Pass the table")}</h2>
            <img src={portraitOf(state.players[(state.current + 1) % state.players.length]!)} alt="" />
            <p>{t("Next ledger belongs to {name}.", { name: nameOf(state.players[(state.current + 1) % state.players.length]!) })}</p>
            <button className="btn btn-gold" onClick={() => go({ type: "READY" })}>{t("I’m ready")}</button>
          </div>
        </div>
      )}

      {state.screen === "play" && state.phase === "broke" && player && (
        <div className="overlay">
          <div className="pass-gate">
            <p className="kicker">{t("Broke")}</p>
            <h2>{t("A turn on the bench")}</h2>
            <img src={portraitOf(player)} alt="" />
            <p>{t("You don’t roll. If the month is still short, you’ll be asked to pay what you can.")}</p>
            <button className="btn btn-gold" onClick={() => go({ type: "BREATHE" })}>{t("Catch your breath")}</button>
          </div>
        </div>
      )}

      {rules && (
        <div className="overlay" onClick={() => setRules(false)}>
          <div className="rules-sheet" onClick={(e) => e.stopPropagation()}>
            <RulesBody t={t} />
            <button className="btn btn-gold" style={{ marginTop: "0.8rem" }} onClick={() => setRules(false)}>{t("Close")}</button>
          </div>
        </div>
      )}

      {tutorial !== null && (
        <div className="overlay">
          <div className="rules-sheet tutorial">
            <p className="kicker">{t("First sitting")}</p>
            <h2 className="display" style={{ marginTop: 0 }}>{t(RULES[tutorial]?.h ?? "")}</h2>
            <p>{t(RULES[tutorial]?.p ?? "")}</p>
            <div className="dots" aria-hidden>
              {RULES.map((_, i) => (
                <i key={i} className={i === tutorial ? "on" : ""} />
              ))}
            </div>
            <div className="card-actions">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  localStorage.setItem(TUTORIAL_KEY, "1");
                  setTutorial(null);
                }}
              >
                {t("Skip")}
              </button>
              <button
                className="btn btn-gold"
                onClick={() => {
                  if (tutorial >= RULES.length - 1) {
                    localStorage.setItem(TUTORIAL_KEY, "1");
                    setTutorial(null);
                  } else setTutorial(tutorial + 1);
                }}
              >
                {tutorial >= RULES.length - 1 ? t("Sit down") : t("Next")}
              </button>
            </div>
          </div>
        </div>
      )}

      {bioId && CHARACTERS.some((c) => c.id === bioId) && (
        <div className="overlay" onClick={() => setBioId(null)}>
          <article className="bio-sheet" role="dialog" aria-modal="true" aria-labelledby="bio-title" onClick={(e) => e.stopPropagation()}>
            {CHARACTERS.filter((c) => c.id === bioId).map((bio) => (
              <div className="bio-layout" key={bio.id}>
                <img src={bio.portrait} alt="" />
                <div>
                  <p className="kicker">{t(bio.title)}</p>
                  <h2 id="bio-title">{bio.name}</h2>
                  <p className="bio-from">{trKey(lang, `from.${bio.id}`, bio.from)}</p>
                  <p>{trKey(lang, `bio.${bio.id}`, bio.bio)}</p>
                  <p className="bio-wants"><strong>{t("Wants")}. </strong>{trKey(lang, `wants.${bio.id}`, bio.wants)}</p>
                  <button type="button" className="btn btn-gold" onClick={() => setBioId(null)}>{t("Close")}</button>
                </div>
              </div>
            ))}
          </article>
        </div>
      )}

      {optionsOpen && (
        <div className="overlay" onClick={() => setOptionsOpen(false)}>
          <div className="rules-sheet options-sheet" role="dialog" aria-modal="true" aria-labelledby="options-title" onClick={(e) => e.stopPropagation()}>
            <p className="kicker">{t("Options")}</p>
            <div className="chip-row">
              <button type="button" className={`btn ${optTab === "lang" ? "btn-gold" : "btn-ghost"}`} onClick={() => setOptTab("lang")}>{t("Language")}</button>
              <button type="button" className={`btn ${optTab === "quiz" ? "btn-gold" : "btn-ghost"}`} onClick={() => { setOptTab("quiz"); setQuizId(null); setQuizDone(false); }}>{t("Quizzes")}</button>
              <button type="button" className={`btn ${optTab === "rewards" ? "btn-gold" : "btn-ghost"}`} onClick={() => setOptTab("rewards")}>{t("Rewards")}</button>
            </div>
            {optTab === "lang" && (
              <>
                <h2 id="options-title" className="display" style={{ marginTop: "0.8rem" }}>{t("Language")}</h2>
                <div className="chip-row">
                  {([
                    ["en", "English"],
                    ["fr", "Français"],
                    ["es", "Español"],
                  ] as const).map(([code, label]) => (
                    <button
                      key={code}
                      type="button"
                      className={`btn ${lang === code ? "btn-gold" : "btn-ghost"}`}
                      onClick={() => {
                        setLang(code);
                        localStorage.setItem(LANG_KEY, code);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button type="button" className="btn btn-ghost" style={{ marginTop: "0.9rem" }} onClick={() => { setOptionsOpen(false); setIntro(0); }}>
                  {t("See the introduction again")}
                </button>
              </>
            )}
            {optTab === "rewards" && (
              <>
                <h2 id="options-title" className="display" style={{ marginTop: "0.8rem" }}>{t("Rewards")}</h2>
                <p className="muted">{t("Locked until the month earns them.")}</p>
                <div className="trophy-grid">
                  {TROPHIES.map((piece) => {
                    const open = trophies.ids.includes(piece.id);
                    return (
                      <button
                        key={piece.id}
                        type="button"
                        className={open ? "trophy" : "trophy is-locked"}
                        onClick={() => setTrophyId(piece.id)}
                      >
                        <img src={piece.art} alt="" />
                        <span>{t(piece.name)}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            {optTab === "quiz" && (
              <QuizDesk
                lang={lang}
                t={t}
                passed={passed}
                quizId={quizId}
                step={quizStep}
                picks={quizPicks}
                done={quizDone}
                onPickList={() => { setQuizId(null); setQuizDone(false); }}
                onStart={(id) => { setQuizId(id); setQuizStep(0); setQuizPicks([]); setQuizDone(false); }}
                onAnswer={(choice) => {
                  const quiz = QUIZZES.find((item) => item.id === quizId);
                  if (!quiz || quizDone) return;
                  const next = [...quizPicks, choice];
                  setQuizPicks(next);
                  if (next.length >= quiz.questions.length) {
                    setQuizDone(true);
                    const score = next.filter((pick, i) => pick === quiz.questions[i]?.answer).length;
                    if (score >= PASS_AT && !passed.includes(quiz.id)) {
                      const saved = [...passed, quiz.id];
                      setPassed(saved);
                      savePassed(saved);
                    }
                  } else {
                    setQuizStep(next.length);
                  }
                }}
              />
            )}
            <button className="btn btn-ghost" style={{ marginTop: "1rem" }} onClick={() => setOptionsOpen(false)}>{t("Close")}</button>
          </div>
        </div>
      )}

      {trophyId && (
        <div className="overlay" onClick={() => setTrophyId(null)}>
          <article className="bio-sheet trophy-sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            {TROPHIES.filter((piece) => piece.id === trophyId).map((piece) => {
              const open = trophies.ids.includes(piece.id);
              return (
                <div key={piece.id}>
                  <img className={open ? "trophy-large" : "trophy-large is-dim"} src={piece.art} alt="" />
                  <p className="kicker">{t("Paintings")}</p>
                  <h2>{t(piece.name)}</h2>
                  <p>{open ? t(piece.hint) : `${t("Not yet")}. ${t(piece.hint)}`}</p>
                  <button type="button" className="btn btn-gold" onClick={() => setTrophyId(null)}>{t("Close")}</button>
                </div>
              );
            })}
          </article>
        </div>
      )}

      {outcome && state.screen === "play" && (
        <div className="overlay speak-pop" onClick={() => setOutcome(null)}>
          <article className="card-sheet speak-card" onClick={(e) => e.stopPropagation()}>
            <MoodFace className="speak-face" src={outcome.portrait} fallback={outcome.fallback} mood={outcome.mood} />
            <div className="card-body">
              <p className="tag">{outcome.name}</p>
              <blockquote className="speech">{t(outcome.line)}</blockquote>
              <p className="story">{t(outcome.fact)}</p>
              <button type="button" className="btn btn-gold" onClick={() => setOutcome(null)}>{t("Continue")}</button>
            </div>
          </article>
        </div>
      )}

      {statusFor && (
        <div className="overlay" onClick={() => setStatusFor(null)}>
          <article className="bio-sheet" role="dialog" aria-modal="true" aria-labelledby="status-title" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const who = player && player.id === statusFor.id ? player : statusFor;
              const mine = !!player && who.id === player.id && state.screen === "play";
              return (
                <div className="bio-layout">
                  <div className="who-col">
                    <img
                      className="body-shot"
                      src={bodyPortrait(who)}
                      alt=""
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = dressedPortrait(who, who.reaction);
                      }}
                    />
                    <VitalsBars vitals={who.vitals} t={t} />
                  </div>
                  <div>
                    <p className="kicker">{t("Status")}</p>
                    <h2 id="status-title">{nameOf(who)}</h2>
                    <p>
                      {t(statement(who).career.title)}
                      {who.custom ? ` · ${who.custom.age} ${t("Years")}` : ""}
                      {who.level >= 2 ? ` · ${t("Level 2")}` : ""}
                    </p>
                    <p className="muted">{t(OUTFITS.find((o) => o.id === who.outfit)?.name ?? "Jeans")}</p>
                    {who.custom?.bio ? <p>{who.custom.bio}</p> : null}
                    <div className="rows">
                      <div><span>{t("Monthly cash flow")}</span><strong>{money(statement(who).cashFlow, true)}</strong></div>
                      <div><span>{t("Cash")}</span><strong>{money(who.cash)}</strong></div>
                      <div><span>{t("Salary & earned")}</span><strong className="up">{money(statement(who).salary)}</strong></div>
                      <div><span>{t("Passive income")}</span><strong className="up">{money(statement(who).passive)}</strong></div>
                      <div><span>{t("Monthly expenses")}</span><strong className="down">{money(statement(who).expenses)}</strong></div>
                      <div><span>{t("Dream")}</span><strong className="gold">{who.dreamBought ? t("Owned") : t(dreamOf(who).name)}</strong></div>
                    </div>
                    {mine && (
                      <div className="menu-actions" style={{ marginTop: "0.8rem" }}>
                        <button type="button" className="btn btn-gold" onClick={() => setWardrobeOpen(true)}>{t("Wardrobe")}</button>
                        <button type="button" className="btn btn-ghost" onClick={() => setShopOpen(true)}>{t("Shop")}</button>
                      </div>
                    )}
                    <button type="button" className="btn btn-ghost" style={{ marginTop: "0.6rem" }} onClick={() => setStatusFor(null)}>{t("Close")}</button>
                  </div>
                </div>
              );
            })()}
          </article>
        </div>
      )}

      {historyOpen && (
        <div className="overlay" onClick={() => setHistoryOpen(false)}>
          <article className="rules-sheet" role="dialog" aria-modal="true" aria-labelledby="history-title" onClick={(e) => e.stopPropagation()}>
            <p className="kicker">{t("Decisions")}</p>
            <h2 id="history-title" className="display" style={{ marginTop: 0 }}>{t("Decisions")}</h2>
            {(state.history ?? []).length === 0 && <p>{t("No decisions yet.")}</p>}
            <ol className="history">
              {(state.history ?? []).map((line, i) => (
                <li key={`${line}-${i}`}>{t(line)}</li>
              ))}
            </ol>
            <button type="button" className="btn btn-gold" onClick={() => setHistoryOpen(false)}>{t("Close")}</button>
          </article>
        </div>
      )}

      {confirmNew && (
        <div className="overlay" onClick={() => setConfirmNew(false)}>
          <article className="rules-sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <p className="kicker">{t("Save")}</p>
            <h2 className="display" style={{ marginTop: 0 }}>{t("New game")}</h2>
            <p>{t("Start a new game? The saved table will be replaced.")}</p>
            <div className="menu-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setConfirmNew(false)}>{t("Keep the save")}</button>
              <button type="button" className="btn btn-gold" onClick={beginNew}>{t("Start anyway")}</button>
            </div>
          </article>
        </div>
      )}

      {circleOpen && player && (
        <div className="overlay" onClick={() => setCircleOpen(false)}>
          <article className="rules-sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <p className="kicker">{t("Circle")}</p>
            <h2 className="display" style={{ marginTop: 0 }}>{t("Your circle")}</h2>
            {player.friends.length === 0 && !player.partner && <p>{t("Love, family, and friends show up on their squares.")}</p>}
            <div className="people">
              {player.partner && PARTNERS.some((p) => p.id === player.partner!.id) && (
                <button type="button" className="person" onClick={() => { setCircleOpen(false); setFriendId(player.partner!.id); }}>
                  <img src={PARTNERS.find((p) => p.id === player.partner!.id)!.portrait} alt="" />
                  <span>{PARTNERS.find((p) => p.id === player.partner!.id)!.name.split(" ")[0]} · {t("partner")}</span>
                </button>
              )}
              {player.friends.map((f) => {
                const def = FRIENDS.find((x) => x.id === f.id);
                if (!def) return null;
                return (
                  <button type="button" key={f.id} className="person" onClick={() => { setCircleOpen(false); setFriendId(f.id); }}>
                    <img src={def.portrait} alt="" />
                    <span>{def.name.split(" ")[0]} · {f.likes} ❤️</span>
                  </button>
                );
              })}
            </div>
            <button type="button" className="btn btn-gold" style={{ marginTop: "0.8rem" }} onClick={() => setCircleOpen(false)}>{t("Close")}</button>
          </article>
        </div>
      )}

      {friendId && player && circlePerson(friendId) && (player.friends.some((f) => f.id === friendId) || player.partner?.id === friendId) && (
        <div className="overlay" onClick={() => setFriendId(null)}>
          <article className="bio-sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const def = circlePerson(friendId)!;
              const f = player.friends.find((x) => x.id === friendId);
              const turns = f ? Math.max(1, state.turn - f.sinceTurn + 1) : null;
              const can = !!f && state.screen === "play" && state.phase === "idle" && player.circleTurn !== state.turn;
              return (
                <div className="bio-layout">
                  <img src={def.portrait} alt="" />
                  <div>
                    <p className="kicker">{f?.role === "partner" ? t("Business partner") : player.partner?.id === friendId ? t("partner") : t(def.friendTrait ?? def.trait)}</p>
                    <h2>{def.name}</h2>
                    <p className="kicker">{t("Biography")}</p>
                    <p>{t(def.bio)}</p>
                    {f && turns !== null && (
                      <div className="rows">
                        <div><span>{t("Turns together")}</span><strong>{turns}</strong></div>
                        <div><span>{t("Won together")}</span><strong className="up">{money(f.earned)}</strong></div>
                        <div><span>{t("Spent together")}</span><strong className="down">{money(f.spent)}</strong></div>
                        <div><span>{t("Likes")}</span><strong>{f.likes} ❤️</strong></div>
                        <div><span>{t("Dislikes")}</span><strong>{f.dislikes} 👎</strong></div>
                      </div>
                    )}
                    <button
                      type="button"
                      className="btn btn-gold"
                      style={{ marginTop: "0.8rem" }}
                      onClick={() => setChat({ friendId: def.id, index: Math.floor(Math.random() * CHATS.length), step: 0 })}
                    >
                      {t("Interact")}
                    </button>
                    <p className="muted">{t("Talking changes nothing on the ledger.")}</p>
                    {can && (
                      <button type="button" className="btn btn-ghost" style={{ marginTop: "0.6rem" }} onClick={() => { setFriendId(null); go({ type: "CIRCLE", friendId: f.id }); }}>
                        {t("Spend time")}
                      </button>
                    )}
                    {f && state.screen === "play" && state.phase === "idle" && player.circleTurn === state.turn && (
                      <p className="muted">{t("You already saw your circle this turn.")}</p>
                    )}
                    <button type="button" className="btn btn-ghost" style={{ marginTop: "0.6rem" }} onClick={() => setFriendId(null)}>{t("Close")}</button>
                  </div>
                </div>
              );
            })()}
          </article>
        </div>
      )}

      {dayOpen && player && state.phase === "idle" && (
        <div className="overlay" onClick={() => setDayOpen(false)}>
          <article className="rules-sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <p className="kicker">{t("Day")}</p>
            <h2 className="display" style={{ marginTop: 0 }}>{t("Your day")}</h2>
            <p>{t("One activity before you roll. Sleep skips the board.")}</p>
            {player.lifeTurn === state.turn ? (
              <p>{t("You already spent part of this day.")}</p>
            ) : (
              <div className="day-list">
                <button
                  type="button"
                  className="outfit"
                  disabled={player.friends.length === 0 || player.cash < BIRTHDAY_COST}
                  onClick={() => { setDayOpen(false); go({ type: "LIFE", kind: "birthday" }); }}
                >
                  <strong>{t("A friend's birthday")}</strong>
                  <span>{player.friends.length === 0 ? t("No one in the circle yet.") : player.cash < BIRTHDAY_COST ? t("Not enough cash") : `${money(BIRTHDAY_COST)} · ${t("Happiness")} + ${t("Social")}`}</span>
                </button>
                <button
                  type="button"
                  className="outfit"
                  disabled={player.cash < MUSEUM_COST}
                  onClick={() => { setDayOpen(false); go({ type: "LIFE", kind: "museum" }); }}
                >
                  <strong>{t("The museum")}</strong>
                  <span>{player.cash < MUSEUM_COST ? t("Not enough cash") : `${money(MUSEUM_COST)} · ${t("Intelligence")}`}</span>
                </button>
                <button
                  type="button"
                  className="outfit"
                  onClick={() => { setDayOpen(false); go({ type: "LIFE", kind: "sleep" }); }}
                >
                  <strong>{t("Sleep")}</strong>
                  <span>{t("Free. Happiness rises. You miss this roll.")}</span>
                </button>
              </div>
            )}
            <button type="button" className="btn btn-ghost" style={{ marginTop: "0.8rem" }} onClick={() => setDayOpen(false)}>{t("Close")}</button>
          </article>
        </div>
      )}

      {shopOpen && player && (
        <div className="overlay" onClick={() => setShopOpen(false)}>
          <article className="rules-sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <p className="kicker">{t("Shop")}</p>
            <h2 className="display" style={{ marginTop: 0 }}>{t("Clothes shop")}</h2>
            <p>{t("Buy clothes here. They appear in the wardrobe.")}</p>
            <div className="day-list">
              {OUTFITS.filter((piece) => piece.id !== "jeans").map((piece) => {
                const id = piece.id as Exclude<OutfitId, "jeans">;
                const owned = (player.ownedOutfits ?? ["jeans"]).includes(piece.id);
                const cost = CLOTH_PRICE[id];
                const idle = state.phase === "idle";
                return (
                  <button
                    key={piece.id}
                    type="button"
                    className={owned ? "outfit on" : "outfit"}
                    disabled={!idle || owned || player.cash < cost}
                    onClick={() => go({ type: "BUY_CLOTH", outfit: piece.id })}
                  >
                    <strong>{t(piece.name)}</strong>
                    <span>{owned ? t("Owned") : player.cash < cost ? t("Not enough cash") : money(cost)}</span>
                    <em>{clothDelta(piece.id) === 0 ? money(0) : money(clothDelta(piece.id), true)}{t("/mo")}</em>
                  </button>
                );
              })}
            </div>
            <h2 className="display">{t("Home shop")}</h2>
            {player.level < HOME_LEVEL ? (
              <p>{t("The home shop opens at level 2.")}</p>
            ) : (
              <div className="day-list">
                {HOME_SHOP.map((item) => {
                  const owned = (player.homeOwned ?? []).includes(item.id);
                  const on = (player.homeOn ?? []).includes(item.id);
                  const idle = state.phase === "idle";
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={on ? "outfit on" : "outfit"}
                      disabled={!idle || (!owned && player.cash < item.cost)}
                      onClick={() => {
                        if (!owned) go({ type: "BUY_HOME", id: item.id });
                        else go({ type: "TOGGLE_HOME", id: item.id });
                      }}
                    >
                      <strong>{t(item.name)}</strong>
                      <span>{vitalBits(item.bump, t)}</span>
                      <em>{owned ? (on ? t("Equipped") : t("Equip")) : player.cash < item.cost ? t("Not enough cash") : money(item.cost)}</em>
                    </button>
                  );
                })}
              </div>
            )}
            <button type="button" className="btn btn-gold" style={{ marginTop: "0.8rem" }} onClick={() => setShopOpen(false)}>{t("Close")}</button>
          </article>
        </div>
      )}

      {wardrobeOpen && player && (
        <div className="overlay" onClick={() => setWardrobeOpen(false)}>
          <article className="rules-sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <p className="kicker">{t("Wardrobe")}</p>
            <h2 className="display" style={{ marginTop: 0 }}>{t("Wardrobe")}</h2>
            <p>{t("Only clothes you own are here. Jeans start with you. A professional shirt adds $300 a month on a property or a new job. The other outfits take $300 off.")}</p>
            {state.phase !== "idle" && <p>{t("Change clothes before you roll.")}</p>}
            <div className="wardrobe-layout">
              <img
                className="body-shot"
                src={bodyPortrait(player)}
                alt=""
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = dressedPortrait(player, player.reaction);
                }}
              />
              <div className="wardrobe-grid">
                {OUTFITS.filter((piece) => (player.ownedOutfits ?? ["jeans"]).includes(piece.id)).map((piece) => {
                  const delta = clothDelta(piece.id);
                  const on = player.outfit === piece.id;
                  return (
                    <button
                      key={piece.id}
                      type="button"
                      className={on ? "outfit on" : "outfit"}
                      disabled={state.phase !== "idle"}
                      onClick={() => go({ type: "WEAR", outfit: piece.id as OutfitId })}
                    >
                      <strong>{t(piece.name)}</strong>
                      <span>{t(piece.note)}</span>
                      <em>{delta === 0 ? money(0) : money(delta, true)}</em>
                    </button>
                  );
                })}
              </div>
            </div>
            <button type="button" className="btn btn-ghost" style={{ marginTop: "0.8rem" }} onClick={() => { setWardrobeOpen(false); setShopOpen(true); }}>{t("Shop")}</button>
            <button type="button" className="btn btn-gold" style={{ marginTop: "0.8rem", marginLeft: "0.4rem" }} onClick={() => setWardrobeOpen(false)}>{t("Close")}</button>
          </article>
        </div>
      )}

      {chat && player && circlePerson(chat.friendId) && (
        <div className="overlay" onClick={() => setChat(null)}>
          <article className="rules-sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const def = circlePerson(chat.friendId)!;
              const script = CHATS[chat.index % CHATS.length]!;
              const shown = script.lines.slice(0, chat.step + 1);
              const done = chat.step >= script.lines.length - 1;
              return (
                <>
                  <p className="kicker">{t(script.topic)}</p>
                  <h2 className="display" style={{ marginTop: 0 }}>{def.name}</h2>
                  <p className="muted">{t("Talking changes nothing on the ledger.")}</p>
                  <div className="chat-log">
                    {shown.map((row, i) => (
                      <div key={`${script.id}-${i}`} className={`bubble-row ${row.who === "you" ? "you" : "them"}`}>
                        <img
                          className="chat-face"
                          src={row.who === "you" ? portraitOf(player) : def.portrait}
                          alt=""
                        />
                        <p className={row.who === "you" ? "bubble you" : "bubble them"}>
                          <strong>{row.who === "you" ? nameOf(player) : def.name.split(" ")[0]}</strong>
                          {chatText(lang, row)}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="card-actions">
                    {!done && (
                      <button type="button" className="btn btn-gold" onClick={() => setChat({ ...chat, step: chat.step + 1 })}>{t("Next line")}</button>
                    )}
                    <button type="button" className="btn btn-ghost" onClick={() => setChat(null)}>{t("That's enough")}</button>
                  </div>
                </>
              );
            })()}
          </article>
        </div>
      )}
      {intro === "boot" && <div className="intro-frame intro-boot" />}
      {typeof intro === "number" && (
        <div className="intro-frame" role="dialog" aria-modal="true">
          <img className={intro === 3 ? "intro-crest" : undefined} src={INTRO_SLIDES[intro].art} alt="" />
          <div className="intro-copy">
            <p className="kicker">{t(INTRO_SLIDES[intro].place)} · {intro + 1}/4</p>
            <p className="intro-line">{t(INTRO_SLIDES[intro].line)}</p>
            <div className="menu-actions">
              <button type="button" className="btn btn-ghost" onClick={() => { localStorage.setItem(INTRO_KEY, "1"); setIntro(null); }}>{t("Skip")}</button>
              <button
                type="button"
                className="btn btn-gold"
                onClick={() => {
                  if (intro >= INTRO_SLIDES.length - 1) {
                    localStorage.setItem(INTRO_KEY, "1");
                    setIntro(null);
                  } else {
                    setIntro(intro + 1);
                  }
                }}
              >
                {t("Next")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
