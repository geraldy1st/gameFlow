import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { CHARACTERS, FORTUNE_CASH, FORTUNE_PASSIVE, FRIENDS, INTRO_KEY, PARTNERS, PASSIVE_WIN, SAVE_KEY, TUTORIAL_KEY, VENTURE_GOAL } from "@/game/data";
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
  type GameState,
  type Pick,
  type Player,
  type Reaction,
} from "@/game/engine";
import { arrivalLine, arrivalMood, bodyPortrait, dressedPortrait, expressionOf, outcomeLine, phraseSalt, speakerIsNpc } from "@/game/speech";
import { DealSheet } from "./boite/DealSheet";
import { fmtMoney } from "./boite/format";
import { FriendScene, type FriendEvent } from "./boite/FriendScene";
import { CoinRain, GateScene } from "./boite/GateScene";
import { usePassiveHistory, type Point } from "./boite/history";
import { prefersReducedMotion, useIsMobile } from "./boite/hooks";
import { FAMILIES, IconDefs, Ico, type Family } from "./boite/icons";
import { IntroVideo, probeIntro, type IntroPick } from "./boite/IntroVideo";
import { MenuScreen } from "./boite/MenuScreen";
import { MetroBoard, trackSpaces } from "./boite/MetroBoard";
import { BoxDie, Dock, FlowBox, GateBox, MobileHud, PassiveChart, StationStrip, WhoBox, hereLabel, lineName, rollLabel } from "./boite/PlayerMat";

type TFn = (text: string, vars?: Record<string, string | number>) => string;

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

/** Money is never shown by colour alone: amounts on green/red rows always carry a sign. */
function signedRow(v: string, tone?: string): string {
  if (!/^\$\d/.test(v)) return v;
  if (tone === "up") return `+${v}`;
  if (tone === "down") return `−${v}`;
  return v;
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
                <strong className={row.tone ?? ""}>{signedRow(t(row.v), row.tone)}</strong>
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


function LedgerBody({
  player,
  state,
  dispatch,
  t,
  lang,
  points,
  onHistory,
  onFriend,
}: {
  player: Player;
  state: GameState;
  dispatch: (a: Action) => void;
  t: TFn;
  lang: Lang;
  points: Point[];
  onHistory: () => void;
  onFriend: (id: string) => void;
}) {
  const st = statement(player);
  const partner = player.partner ? PARTNERS.find((p) => p.id === player.partner!.id) : null;
  const idle = state.phase === "idle";
  const m = (n: number, signed = false) => fmtMoney(lang, n, signed);
  return (
    <div className="ledger">
      <div className="rows">
        <div><span>{t("Cash")}</span><strong className="num">{m(player.cash)}</strong></div>
        <div><span>{t("Salary & earned")}</span><strong className="num up">{m(st.salary, true)}</strong></div>
        <div><span>{t("Passive income")}</span><strong className="num up">{m(st.passive, true)}</strong></div>
        {st.allyIncome > 0 && <div><span>{t("Allied income")}</span><strong className="num up">{m(st.allyIncome, true)}</strong></div>}
        <div><span>{t("Monthly expenses")}</span><strong className="num down">{m(-st.expenses)}</strong></div>
        <div className="total"><span>{t("Monthly cash flow")}</span><strong className={`num ${st.cashFlow >= 0 ? "up" : "down"}`}>{m(st.cashFlow, true)}</strong></div>
      </div>
      <div className="m-only">
        <PassiveChart points={points.length ? points : [{ turn: state.turn, passive: st.passive }]} expenses={st.expenses} t={t} lang={lang} />
      </div>
      {idle && (
        <div className="chip-row">
          <button type="button" className="btn btn-ghost" onClick={() => dispatch({ type: "BORROW" })}>{t("Borrow $1,000")}</button>
          {partner && player.householdIn === 0 && (
            <button type="button" className="btn btn-ghost" onClick={() => dispatch({ type: "HOUSE" })}>{t("Household decision")}</button>
          )}
        </div>
      )}
      {player.business && (
        <div className="list-block">
          <h3>{t(player.business.name)}</h3>
          <div className="rows">
            <div><span>{t("Revenue")}</span><strong className="num up">{m(player.business.revenue, true)}{t("/mo")}</strong></div>
            <div><span>{t("Payroll")}</span><strong className="num down">{m(-player.business.payroll)}{t("/mo")}</strong></div>
            <div><span>{t("Venture goal")}</span><strong className="num">{m(VENTURE_GOAL)}{t("/mo")}</strong></div>
          </div>
        </div>
      )}
      {player.level >= 2 && player.keptRevenue && !player.stretchClaimed && (
        <p className="muted">{t("Level 2 aim: {passive}/mo passive, or {cash} cash.", { passive: m(FORTUNE_PASSIVE), cash: m(FORTUNE_CASH) })}</p>
      )}
      <details className="list-block">
        <summary>{t("Expense lines")}</summary>
        <div className="rows">
          <div><span>{t("Taxes")}</span><span className="num">{m(-st.taxes)}</span></div>
          <div><span>{t("Rent")}{st.roommate ? t(" (roommate)") : ""}</span><span className="num">{m(-st.rent)}</span></div>
          <div><span>{t("Food & transport")}</span><span className="num">{m(-(st.food + st.transport))}</span></div>
          <div><span>{t("Other + lifestyle")}</span><span className="num">{m(-(st.other + st.mods))}</span></div>
          <div><span>{t("Partner")}</span><span className="num">{m(-st.partnerExpense)}</span></div>
          <div><span>{t("Children")} ({player.children.length})</span><span className="num">{m(-st.childCost)}</span></div>
          <div><span>{t("Debt payments")}</span><span className="num">{m(-st.debtPay)}</span></div>
          {st.bizPayroll > 0 && <div><span>{t("Business payroll")}</span><span className="num">{m(-st.bizPayroll)}</span></div>}
          {st.allyCost > 0 && <div><span>{t("Business partners")}</span><span className="num">{m(-st.allyCost)}</span></div>}
        </div>
      </details>
      <div className="list-block">
        <h3>{t("Assets")}</h3>
        {player.assets.length === 0 && <p className="muted">{t("None yet. Deals live on the board.")}</p>}
        {player.assets.map((a) => (
          <div className="mini" key={a.id}>
            <span>{t(a.name)}</span>
            <span className="num up">{m(a.cashFlow, true)}{t("/mo")}</span>
            {idle && (
              <button type="button" className="linkish" onClick={() => dispatch({ type: "SELL", id: a.id })}>{t("Sell")}</button>
            )}
          </div>
        ))}
      </div>
      <div className="list-block">
        <h3>{t("Liabilities")}</h3>
        {player.liabilities.length === 0 && <p className="muted">{t("No notes. The bank is patient, not kind.")}</p>}
        {player.liabilities.map((l) => (
          <div className="mini" key={l.id}>
            <span>{t(l.name)}</span>
            <span className="num down">{m(-l.payment)}{t("/mo")}</span>
            {idle && player.cash >= l.principal && (
              <button type="button" className="linkish" onClick={() => dispatch({ type: "REPAY", id: l.id })}>{t("Repay")} {m(l.principal)}</button>
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
      <ul className="log">
        {state.log.map((line, i) => (
          <li key={`${line}-${i}`}>{t(line)}</li>
        ))}
      </ul>
      <button type="button" className="btn btn-ghost btn-wide" onClick={onHistory}>{t("Decisions")}</button>
    </div>
  );
}

function LegendBody({ t }: { t: TFn }) {
  return (
    <div className="legend-list">
      {(Object.keys(FAMILIES) as Family[]).map((k) => {
        const f = FAMILIES[k];
        return (
          <div className="lg-row" key={k}>
            <span className="lg-ic" style={{ background: f.bg, color: f.fg }}>
              <Ico name={f.icon} />
            </span>
            <span>
              <b>{t(f.name)}</b>
              {k === "ties" && <small>{t("Social + Love")}</small>}
              {k === "care" && <small>{t("Health, Rest, Charity")}</small>}
            </span>
          </div>
        );
      })}
      <div className="lg-row">
        <span className="lg-ic gate">
          <Ico name="door" />
        </span>
        <span>
          <b>{t("The Gate")}</b>
          <small>{t("Opens when passive income > expenses.")}</small>
        </span>
      </div>
    </div>
  );
}

function vitalBits(bump: Partial<Vitals>, t: TFn): string {
  const parts: string[] = [];
  if (bump.content) parts.push(`${t("Happiness")} +${bump.content}`);
  if (bump.social) parts.push(`${t("Social")} +${bump.social}`);
  if (bump.mind) parts.push(`${t("Intelligence")} +${bump.mind}`);
  if (bump.luck) parts.push(`${t("Lucky")} +${bump.luck}`);
  return parts.join(" · ");
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
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [gateSeen, setGateSeen] = useState<Record<string, boolean>>({});
  const [friendEv, setFriendEv] = useState<FriendEvent | null>(null);
  const [introMode, setIntroMode] = useState<IntroPick | null>(null);
  const [pendingPicks, setPendingPicks] = useState<Pick[] | null>(null);
  const pendingFriend = useRef<Omit<FriendEvent, "after"> | null>(null);
  // Every game action (clicks *and* keyboard shortcuts) goes through go(), which arms the friend scene.
  const goRef = useRef<(action: Action) => void>(() => {});
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
    if (localStorage.getItem(INTRO_KEY)) setIntro(null);
    else
      void probeIntro(prefersReducedMotion()).then((mode) => {
        if (mode) {
          setIntroMode(mode);
          setIntro(null);
        } else setIntro(0);
      });
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
    const pf = pendingFriend.current;
    if (pf && state.phase !== "card") {
      pendingFriend.current = null;
      const after = state.players.find((p) => p.id === pf.before.id);
      const joined = after?.friends.find((f) => f.id === pf.friendId);
      if (after && joined && !pf.before.friends.some((f) => f.id === pf.friendId)) {
        setOutcome(null);
        setFriendEv({ ...pf, after, role: joined.role === "partner" ? "partner" : "friend" });
        return;
      }
    }
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
      if (friendEv || introMode) return;
      if (gateOpenRef.current && !rules && !optionsOpen) {
        if (e.key === "Escape") dismissGateRef.current();
        return;
      }
      if (e.key === "Escape") {
        if (ledgerOpen) {
          setLedgerOpen(false);
          return;
        }
        if (legendOpen) {
          setLegendOpen(false);
          return;
        }
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
          if (decline) goRef.current({ type: "CHOICE", id: decline.id });
          else if (only && (only.id === "ok" || card.payload.t === "start" || card.payload.t === "skip")) {
            goRef.current({ type: "CHOICE", id: only.id });
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
      if (outcome || statusFor || historyOpen || friendId || circleOpen || confirmNew || dayOpen || wardrobeOpen || shopOpen || chat || ledgerOpen || legendOpen || rules || optionsOpen || bioId || trophyId) {
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
        if (confirm) goRef.current({ type: "CHOICE", id: confirm.id });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rules, tutorial, bioId, optionsOpen, trophyId, outcome, statusFor, historyOpen, friendId, circleOpen, confirmNew, dayOpen, wardrobeOpen, shopOpen, chat, intro, friendEv, introMode, ledgerOpen, legendOpen]);

  const go = (action: Action) => {
    unlockAudio();
    const s = stateRef.current;
    if (action.type === "CHOICE" && (action.id === "friend" || action.id === "biz") && s.phase === "card" && s.card?.payload.t === "friend") {
      const p = cur(s);
      const space = trackSpaces(p)[p.position];
      pendingFriend.current = { before: p, friendId: s.card.payload.id, role: action.id === "biz" ? "partner" : "friend", speech: s.card.speech ?? s.card.story, space: space?.label ?? "Social", turn: s.turn };
    }
    dispatch(action);
  };
  goRef.current = go;
  const continueSave = () => {
    unlockAudio();
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as GameState;
      if (saved.version === 1 && saved.players?.length) go({ type: "CONTINUE", saved });
    } catch {
      setHasSave(false);
    }
  };
  const startGame = (picks: Pick[]) => {
    setPendingPicks(null);
    setConfirmNew(false);
    go({ type: "NEW", picks });
    if (!localStorage.getItem(TUTORIAL_KEY)) setTutorial(0);
  };
  const replayIntro = () => {
    void probeIntro(prefersReducedMotion()).then((mode) => {
      if (mode) setIntroMode(mode);
      else setIntro(0);
    });
  };
  const closeFriend = useCallback(() => setFriendEv(null), []);
  const closeIntro = () => {
    localStorage.setItem(INTRO_KEY, "1");
    setIntroMode(null);
  };
  const saveNow = () => {
    if (!persistGame(stateRef.current)) return;
    setHasSave(true);
    setSavedFlash(true);
  };
  const beginNew = () => {
    setConfirmNew(false);
    if (pendingPicks) {
      startGame(pendingPicks);
      return;
    }
    if (stateRef.current.screen !== "menu") dispatch({ type: "MENU" });
  };

  const player = state.players.length ? cur(state) : null;
  const shownDie = state.phase === "rolling" ? flicker : state.die;
  const viewState = state.phase === "rolling" ? { ...state, die: shownDie } : state;
  const passiveHistory = usePassiveHistory(state);
  const points: Point[] = player ? (passiveHistory[player.id] ?? []) : [];
  const isMobile = useIsMobile();
  const otherOverlay = !!(outcome || friendEv || statusFor || historyOpen || friendId || circleOpen || dayOpen || shopOpen || wardrobeOpen || chat || ledgerOpen || legendOpen || rules || tutorial !== null || confirmNew || introMode || typeof intro === "number");
  const gateOpen = !!player && state.screen === "play" && state.phase === "idle" && player.track === "grind" && player.level < 2 && unlocked(player) && !gateSeen[player.id] && !otherOverlay;
  const dismissGate = () => {
    if (player) setGateSeen((g) => ({ ...g, [player.id]: true }));
  };
  const gateOpenRef = useRef(gateOpen);
  gateOpenRef.current = gateOpen;
  const dismissGateRef = useRef(dismissGate);
  dismissGateRef.current = dismissGate;
  useEffect(() => {
    // the Gate scene shows again if the player falls back below the line
    if (!player || !gateSeen[player.id] || unlocked(player)) return;
    setGateSeen((g) => ({ ...g, [player.id]: false }));
  }, [player, gateSeen]);
  const dream = player ? dreamOf(player) : null;
  const ctxButtons = player && state.phase === "idle" && (
    <>
      {player.track === "grind" && unlocked(player) && (
        <button type="button" className="btn gold" onClick={() => go({ type: "ENTER" })}>
          <Ico name="door" />
          {statement(player).passive >= PASSIVE_WIN ? t("The goal is met — step out") : t("Board the express")}
        </button>
      )}
      {player.track === "freedom" && !player.dreamBought && dream && (
        <button type="button" className="btn gold" onClick={() => go({ type: "DREAM" })}>
          <Ico name="star" />
          {t("Buy dream")} · <span className="num">{fmtMoney(lang, dream.cost)}</span>
        </button>
      )}
      {player.level >= 2 && (
        <button type="button" className="btn" onClick={() => go({ type: "RETIRE" })}>
          {t("Retire from the table")}
        </button>
      )}
    </>
  );
  const hasCtx = !!player && state.phase === "idle" && ((player.track === "grind" && unlocked(player)) || (player.track === "freedom" && !player.dreamBought) || player.level >= 2);
  const idle = state.phase === "idle";

  const topSub =
    state.screen === "play" && player
      ? `${t("Turn {turn}", { turn: state.turn })} · ${nameOf(player)} · ${lineName(player, t)}${player.level >= 2 ? ` · ${t("Level 2")}` : ""}`
      : t("A board game about cash flow");

  return (
    <div className={`gf-app ${state.screen === "play" ? "is-play" : ""}`}>
      <IconDefs />
      <div className="gf-shell">
        <header className="top">
          <div className="lid" aria-hidden="true">
            <Ico name="coin" />
          </div>
          <div className="brand">
            <h1>GameFlow</h1>
            <p>{topSub}</p>
          </div>
          <div className="sp" />
          <button type="button" className="chipbtn d-only" onClick={() => setRules(true)}>
            <Ico name="book" />
            {t("Rules")}
          </button>
          {state.screen === "menu" && (
            <button type="button" className="chipbtn" onClick={() => { setOptTab("lang"); setOptionsOpen(true); }}>
              {t("Options")}
            </button>
          )}
          {(state.screen === "play" || state.screen === "win") && (
            <button type="button" className="chipbtn d-only" onClick={saveNow} aria-live="polite">
              <Ico name={savedFlash ? "check" : "save"} />
              {savedFlash ? t("Saved") : t("Save")}
            </button>
          )}
          <button type="button" className="chipbtn" onClick={() => go({ type: "MUTE" })} aria-label={state.muted ? t("Unmute") : t("Mute")} aria-pressed={!state.muted}>
            <Ico name={state.muted ? "mute" : "sound"} />
          </button>
          {state.screen !== "menu" && (
            <button type="button" className="chipbtn" onClick={() => go({ type: "MENU" })}>
              {t("Menu")}
            </button>
          )}
        </header>

        {state.screen === "menu" && (
          <MenuScreen
            state={state}
            t={t}
            lang={lang}
            unlocked={unlockedIds(passed)}
            canCreate={trophies.peak.cash >= CREATE_CASH}
            hasSave={hasSave}
            onContinue={continueSave}
            onStart={(picks) => {
              unlockAudio();
              if (hasSave) {
                setPendingPicks(picks);
                setConfirmNew(true);
              } else startGame(picks);
            }}
            onQuiz={() => {
              setOptTab("quiz");
              setQuizId(null);
              setQuizDone(false);
              setOptionsOpen(true);
            }}
            onBio={setBioId}
          />
        )}

        {(state.screen === "rules" || state.screen === "credits") && (
          <section className="box rules-page">
            {state.screen === "rules" ? (
              <RulesBody t={t} />
            ) : (
              <div className="rules-copy">
                <p className="kicker">{t("Credits")}</p>
                <h2 className="display">{t("Made for this table")}</h2>
                <p>{t("GameFlow is an original game. It is not Monopoly, and it is not the Cashflow board. Characters, dreams, jobs, and the two rings were drawn for this ledger.")}</p>
                <p>{t("Aoi, Ren, Mio, and Sora, plus the people who might share their month, are original faces. Sound is synthesized in the browser. Progress stays on this device.")}</p>
              </div>
            )}
            <button type="button" className="btn btn-gold" onClick={() => go({ type: "MENU" })}>{t("Back")}</button>
          </section>
        )}

        {state.screen === "play" && player && (
          <main className="screen s-play">
            <MobileHud player={player} state={state} t={t} lang={lang} onStatus={() => setStatusFor(player)} />
            <section className="board-wrap">
              <div className={`board-sheet ${zoom ? "is-zoom" : ""}`}>
                <MetroBoard state={viewState} t={t} lang={lang} />
                <span className="youare m-only">{hereLabel(player, t)}</span>
                <button type="button" className="zoom m-only" aria-pressed={zoom} aria-label={zoom ? t("Zoom out of the map") : t("Zoom into the map")} onClick={() => setZoom((z) => !z)}>
                  <Ico name={zoom ? "unzoom" : "zoom"} />
                </button>
              </div>
            </section>
            <StationStrip player={player} t={t} />
            {!isMobile && (
              <aside className="mat d-only">
                <WhoBox player={player} state={state} t={t} lang={lang} onStatus={() => setStatusFor(player)} />
                <FlowBox player={player} t={t} lang={lang} />
                <GateBox player={player} t={t} lang={lang} points={points} />
                <Dock
                  state={viewState}
                  die={shownDie}
                  t={t}
                  onRoll={() => go({ type: "ROLL" })}
                  ctx={hasCtx ? ctxButtons : undefined}
                  actions={
                    <>
                      <button type="button" className="btn" disabled={!idle} onClick={() => setDayOpen(true)}>
                        <Ico name="sun" />
                        {t("Day")}
                      </button>
                      <button type="button" className="btn" onClick={() => setShopOpen(true)}>
                        <Ico name="bag" />
                        {t("Shop")}
                      </button>
                      {(player.friends.length > 0 || player.partner) && (
                        <button type="button" className="btn" onClick={() => setCircleOpen(true)}>
                          <Ico name="people" />
                          {t("Circle")}
                        </button>
                      )}
                      <button type="button" className="btn" onClick={() => setLedgerOpen(true)}>
                        <Ico name="ledger" />
                        {t("Ledger")}
                      </button>
                    </>
                  }
                />
              </aside>
            )}
            {isMobile && (
              <nav className="mdock m-only" aria-label={t("Actions")}>
                {hasCtx && <div className="ctx">{ctxButtons}</div>}
                <div className="row">
                  <BoxDie value={shownDie} rolling={state.phase === "rolling"} t={t} />
                  <button type="button" className="btn gold roll" disabled={!idle} onClick={() => go({ type: "ROLL" })}>
                    <Ico name="dice" />
                    {rollLabel(viewState, t)}
                  </button>
                </div>
                <div className="sec">
                  <button type="button" className="btn" disabled={!idle} onClick={() => setDayOpen(true)}>
                    <Ico name="sun" />
                    {t("Day")}
                  </button>
                  <button type="button" className="btn" onClick={() => setShopOpen(true)}>
                    <Ico name="bag" />
                    {t("Shop")}
                  </button>
                  <button type="button" className="btn" onClick={() => setLedgerOpen(true)}>
                    <Ico name="coin" />
                    {t("Ledger")}
                  </button>
                  <button type="button" className="btn" onClick={() => setLegendOpen(true)}>
                    <Ico name="key" />
                    {t("Legend")}
                  </button>
                </div>
              </nav>
            )}
          </main>
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
              <button className="btn btn-gold" onClick={() => go({ type: "MENU" })}>{t("Play again")}</button>
              <button className="btn btn-ghost" onClick={() => go({ type: "MENU" })}>{t("Menu")}</button>
            </div>
          </section>
        )}
      </div>

      {state.screen === "play" && state.phase === "card" && state.card && player && (
        state.card.payload.t === "deal" ? (
          <DealSheet card={state.card} player={player} t={t} lang={lang} onChoose={(id) => go({ type: "CHOICE", id })} />
        ) : (
          <CardModal card={state.card} player={player} turn={state.turn} t={t} onChoose={(id) => go({ type: "CHOICE", id })} />
        )
      )}

      {gateOpen && player && (
        <>
          {!prefersReducedMotion() && <CoinRain />}
          <GateScene
            player={player}
            turn={state.turn}
            t={t}
            lang={lang}
            onBoard={() => {
              dismissGate();
              go({ type: "ENTER" });
            }}
            onStay={dismissGate}
          />
        </>
      )}

      {friendEv && <FriendScene ev={friendEv} t={t} lang={lang} onDone={closeFriend} />}

      {ledgerOpen && player && state.screen === "play" && (
        <div className="overlay" onClick={() => setLedgerOpen(false)}>
          <article className="rules-sheet ledger-sheet" role="dialog" aria-modal="true" aria-labelledby="ledger-title" onClick={(e) => e.stopPropagation()}>
            <p className="kicker">{nameOf(player)}</p>
            <h2 id="ledger-title" className="display">{t("Ledger")}</h2>
            <LedgerBody
              player={player}
              state={state}
              dispatch={go}
              t={t}
              lang={lang}
              points={points}
              onHistory={() => { setLedgerOpen(false); setHistoryOpen(true); }}
              onFriend={(id) => { setLedgerOpen(false); setFriendId(id); }}
            />
            <button type="button" className="btn btn-gold" onClick={() => setLedgerOpen(false)}>{t("Close")}</button>
          </article>
        </div>
      )}

      {legendOpen && (
        <div className="overlay" onClick={() => setLegendOpen(false)}>
          <article className="rules-sheet" role="dialog" aria-modal="true" aria-labelledby="legend-title" onClick={(e) => e.stopPropagation()}>
            <p className="kicker">{t("NETWORK MAP")}</p>
            <h2 id="legend-title" className="display">{t("Legend")}</h2>
            <LegendBody t={t} />
            <div className="card-actions">
              <button type="button" className="btn btn-ghost" onClick={() => { setLegendOpen(false); setRules(true); }}>{t("Rules")}</button>
              <button type="button" className="btn btn-gold" onClick={() => setLegendOpen(false)}>{t("Close")}</button>
            </div>
          </article>
        </div>
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
                <div className="chip-row" style={{ marginTop: "0.9rem" }}>
                  <button type="button" className="btn btn-ghost" onClick={() => { setOptionsOpen(false); replayIntro(); }}>
                    {t("See the introduction again")}
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => { setOptionsOpen(false); go({ type: "CREDITS" }); }}>
                    {t("Credits")}
                  </button>
                </div>
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
              <button type="button" className="btn btn-ghost" onClick={() => { setConfirmNew(false); setPendingPicks(null); }}>{t("Keep the save")}</button>
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
      {introMode && <IntroVideo pick={introMode} lang={lang} t={t} onLang={(l) => { setLang(l); localStorage.setItem(LANG_KEY, l); }} onDone={closeIntro} />}
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
