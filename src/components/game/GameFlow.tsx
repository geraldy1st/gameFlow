import { Suspense, lazy, useCallback, useEffect, useReducer, useRef, useState } from "react";
import { CHARACTERS, DREAMS, FORTUNE_CASH, FORTUNE_PASSIVE, FRIENDS, INTRO_KEY, PARTNERS, PASSIVE_WIN, SAVE_KEY, TRAINING_TURNS, TUTORIAL_KEY, TUTORIAL_SEEN_VALUE, VENTURE_GOAL } from "@/game/data";
import { playSfx, resumeAudio, setMuted, unlockAudio } from "@/game/audio";
import { LANG_KEY, readLang, tr, trKey, type Lang } from "@/game/i18n";
import { CHATS, chatText } from "@/game/chats";
import { OUTFITS, type Vitals } from "@/game/life";
import { CREATE_CASH, QUIZ_UNLOCK, loadPassed, savePassed, unlockedIds } from "@/game/meta";
import { PASS_AT, QUIZZES } from "@/game/quizzes";
import { TROPHIES, TROPHY_KEY, recordsFor, type TrophyPeak } from "@/game/trophies";
import {
  blankMenu,
  hydrate,
  wasMultiSave,
  cur,
  dreamOf,
  nameOf,
  portraitOf,
  isPractice,
  reduce,
  statement,
  trainingFor,
  unlocked,
  type Action,
  type CardView,
  type Choice,
  type GameState,
  type Pick,
  type Player,
  type Reaction,
} from "@/game/engine";
import { metroOfferTurn } from "@/game/metro-run";
import { metroDoneAction } from "@/minigames/metro";
import { arrivalLine, arrivalMood, bodyPortrait, dressedPortrait, expressionOf, outcomeLine, phraseSalt, speakerIsNpc } from "@/game/speech";
import { DealSheet } from "./boite/DealSheet";
import { fmtMoney, localizeMoney } from "./boite/format";
import { FriendScene, type FriendEvent } from "./boite/FriendScene";
import { CoinRain, GateScene } from "./boite/GateScene";
import { usePassiveHistory, type Point } from "./boite/history";
import { prefersReducedMotion, useIsMobile, useModalFocus, useReducedMotion } from "./boite/hooks";
import { FAMILIES, IconDefs, Ico, type Family } from "./boite/icons";
import { IntroVideo, probeIntro, type IntroPick } from "./boite/IntroVideo";
import { MenuScreen } from "./boite/MenuScreen";
import { MetroBoard, trackSpaces } from "./boite/MetroBoard";
import { MinigameHost } from "@/minigames/MinigameHost";

/** Chez Aoi home layer: its own chunk, loaded when the player enters a home. */
const HomeLayer = lazy(() => import("@/scenes/home/HomeLayer"));
import { preloadMinigame } from "@/minigames/preload";
import { ActivitiesPanel, BottomNav, DayPanel, FriendAffinity, HubLayer, LegendPanel, MenuPanel, Tabs, type DayTab, type HubTab, type MenuItem } from "./v3/Hub";
import { Pager } from "./v3/Pager";
import type { RunnerAudio } from "./boite/metro-audio";
import { TrainingCoach, coachView, type TutLocal } from "./boite/TrainingCoach";
import {
  TRAINING_BACKUP_KEY,
  backupBeforeReplay,
  clearTutorialResult,
  hasBackup as backupExists,
  isTutorialResult,
  markTutorialResult,
  replayAsk as replayAskFor,
  type ReplayAsk,
  setAsideFreshGame,
  tutorialExit,
} from "@/game/tutorial-save";
import { TRAINING_STRINGS, fill } from "./boite/training-strings";
import { BoxDie, Dock, FlowBox, GateBox, MobileHud, PassiveChart, StationStrip, WhoBox, hereLabel, lineName, rollLabel } from "./boite/PlayerMat";

type TFn = (text: string, vars?: Record<string, string | number>) => string;

// Hidden test hook for the metro run: only in dev builds (or a build made with VITE_METRO_HOOK=1, never the
// public one). `?metro-demo=win` lets a bot play the right gestures, `?metro-demo=crash` the wrong ones.
// `?metro-demo=hurt` takes one hit (+$250).
const METRO_HOOK = import.meta.env.DEV || import.meta.env.VITE_METRO_HOOK === "1";
// v6.1: the bots themselves live in the lazy metro chunk (runner.ts); only the hook's name is passed.
function metroDemoDriver(): "win" | "hurt" | "crash" | undefined {
  if (!METRO_HOOK || typeof window === "undefined") return undefined;
  const v = new URLSearchParams(window.location.search).get("metro-demo");
  return v === "win" || v === "hurt" || v === "crash" ? v : undefined;
}
/**
 * Same hook (dev / VITE_METRO_HOOK=1 builds only): `?metro-seed=<int>` picks the obstacle seed and
 * `?metro-length=<metres>` shortens the track (30 to 260 m) so a scripted run ends in a few seconds.
 * docs/refacto/TEST-HOOKS.md. In the public build METRO_HOOK is false and this returns {} (no effect).
 */
function metroDemoRun(): { seed?: number; length?: number } {
  if (!METRO_HOOK || typeof window === "undefined") return {};
  const q = new URLSearchParams(window.location.search);
  const int = (k: string) => {
    const v = q.get(k);
    return v !== null && /^\d+$/.test(v) ? Number(v) : undefined;
  };
  const seed = int("metro-seed");
  const len = int("metro-length");
  return { seed, length: len === undefined ? undefined : Math.max(30, Math.min(260, len)) };
}

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
  if (!/^(\$\d|\d[\d\u202f.]*\u00a0\$)/.test(v)) return v;
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
    { key: "luck", label: "Luck" },
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
      <p>{t("Roll, then your token walks the ring. Space or Enter confirms. Esc closes a card you may refuse. The game remembers itself on this device.")}</p>
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
}: {
  player: Player;
  state: GameState;
  dispatch: (a: Action) => void;
  t: TFn;
  lang: Lang;
  points: Point[];
  onHistory: () => void;
}) {
  // v3 no-scroll: three tabs (summary · assets & debts · journal); the long lists are paginated.
  const [tab, setTab] = useState<"sum" | "assets" | "log">("sum");
  const st = statement(player);
  const partner = player.partner ? PARTNERS.find((p) => p.id === player.partner!.id) : null;
  const idle = state.phase === "idle";
  const m = (n: number, signed = false) => fmtMoney(lang, n, signed);
  type Line = { k: string; label: string; value: string; cls: string; act?: { label: string; run: () => void } };
  const lines: Line[] = [
    ...player.assets.map((a) => ({ k: a.id, label: t(a.name), value: `${m(a.cashFlow, true)}${t("/mo")}`, cls: "up", act: idle ? { label: t("Sell"), run: () => dispatch({ type: "SELL", id: a.id }) } : undefined })),
    ...player.liabilities.map((l) => ({ k: l.id, label: t(l.name), value: `${m(-l.payment)}${t("/mo")}`, cls: "down", act: idle && player.cash >= l.principal ? { label: `${t("Repay")} ${m(l.principal)}`, run: () => dispatch({ type: "REPAY", id: l.id }) } : undefined })),
  ];
  const expenses: [string, number][] = [
    [t("Taxes"), st.taxes],
    [t("Rent") + (st.roommate ? t(" (roommate)") : ""), st.rent],
    [t("Food & transport"), st.food + st.transport],
    [t("Other + lifestyle"), st.other + st.mods],
    [t("Partner"), st.partnerExpense],
    [`${t("Children")} (${player.children.length})`, st.childCost],
    [t("Debt payments"), st.debtPay],
    ...(st.bizPayroll > 0 ? ([[t("Business payroll"), st.bizPayroll]] as [string, number][]) : []),
    ...(st.allyCost > 0 ? ([[t("Business partners"), st.allyCost]] as [string, number][]) : []),
  ];
  return (
    <div className="ledger v3-ledger">
      <div className="v3">
        <Tabs tabs={[["sum", "Summary"], ["assets", "Assets"], ["log", "Journal"]]} value={tab} onChange={setTab} t={t} label={t("Ledger")} />
      </div>
      {tab === "sum" && (
        <div className="v3-lg-body">
          <div className="rows">
            <div><span>{t("Cash")}</span><strong className="num">{m(player.cash)}</strong></div>
            <div><span>{t("Salary & earned")}</span><strong className="num up">{m(st.salary, true)}</strong></div>
            <div><span>{t("Passive income")}</span><strong className="num up">{m(st.passive, true)}</strong></div>
            {st.allyIncome > 0 && <div><span>{t("Allied income")}</span><strong className="num up">{m(st.allyIncome, true)}</strong></div>}
            <div><span>{t("Monthly expenses")}</span><strong className="num down">{m(-st.expenses)}</strong></div>
            <div className="total"><span>{t("Monthly cash flow")}</span><strong className={`num ${st.cashFlow >= 0 ? "up" : "down"}`}>{m(st.cashFlow, true)}</strong></div>
          </div>
          <div className="v3-lg-chart">
            <PassiveChart points={points.length ? points : [{ turn: state.turn, passive: st.passive }]} expenses={st.expenses} t={t} lang={lang} />
          </div>
          {player.business && (
            <p className="muted">
              {t(player.business.name)} · {t("Revenue")} {m(player.business.revenue, true)}{t("/mo")} · {t("Payroll")} {m(-player.business.payroll)}{t("/mo")} · {t("Venture goal")} {m(VENTURE_GOAL)}{t("/mo")}
            </p>
          )}
          {player.level >= 2 && player.keptRevenue && !player.stretchClaimed && (
            <p className="muted">{t("Level 2 aim: {passive}/mo passive, or {cash} cash.", { passive: m(FORTUNE_PASSIVE), cash: m(FORTUNE_CASH) })}</p>
          )}
          {idle && (
            <div className="chip-row">
              {!trainingFor(state) && (
                <button type="button" className="btn btn-ghost" onClick={() => dispatch({ type: "BORROW" })}>{t("Borrow $1,000")}</button>
              )}
              {partner && player.householdIn === 0 && (
                <button type="button" className="btn btn-ghost" onClick={() => dispatch({ type: "HOUSE" })}>{t("Household decision")}</button>
              )}
            </div>
          )}
        </div>
      )}
      {tab === "assets" && (
        <div className="v3-lg-body">
          {lines.length === 0 ? (
            <>
              <p className="muted">{t("None yet. Deals live on the board.")}</p>
              <p className="muted">{t("No notes. The bank is patient, not kind.")}</p>
            </>
          ) : (
            <Pager
              items={lines}
              itemH={52}
              minW={260}
              maxCols={2}
              t={t}
              label={t("Assets")}
              render={(l) => (
                <div className="mini v3-mini">
                  <span>{l.label}</span>
                  <span className={`num ${l.cls}`}>{l.value}</span>
                  {l.act && <button type="button" className="linkish" onClick={l.act.run}>{l.act.label}</button>}
                </div>
              )}
            />
          )}
          <p className="v3-lg-sub">{t("Expense lines")}</p>
          <Pager
            items={expenses.filter(([, v]) => v > 0)}
            itemH={30}
            minW={200}
            maxCols={2}
            t={t}
            label={t("Expense lines")}
            render={([label, v]) => (
              <div className="v3-exp"><span>{label}</span><span className="num">{m(-v)}</span></div>
            )}
          />
        </div>
      )}
      {tab === "log" && (
        <div className="v3-lg-body">
          <Pager
            items={state.log}
            itemH={36}
            minW={260}
            maxCols={1}
            t={t}
            label={t("Journal")}
            render={(line) => <p className="v3-logline">{t(line)}</p>}
          />
          <button type="button" className="btn btn-ghost btn-wide" onClick={onHistory}>{t("Decisions")}</button>
        </div>
      )}
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

const FRESH_TUT: TutLocal = { post: null, done: false };
/** Coach state when the scripted turns are over: the Gate coachmark, then the done card. */
const GATE_TUT: TutLocal = { post: { id: "t5gate", turn: TRAINING_TURNS }, done: false };

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
  useModalFocus();
  const [hasSave, setHasSave] = useState(false);
  const [rules, setRules] = useState(false);
  const [tutorial, setTutorial] = useState<number | null>(null);
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
  const [confirmNew, setConfirmNew] = useState(false);
  // v3 navigation: bottom bar Day · Activities · Ledger · Menu, and the class quiz.
  const [hub, setHub] = useState<HubTab | null>(null);
  const [dayTab, setDayTab] = useState<DayTab>("income");
  const [legendView, setLegendView] = useState(false);
  const [classQuiz, setClassQuiz] = useState(false);
  const [homeOpen, setHomeOpen] = useState<string | null>(null);
  /** Home v1: Immo Dada opened from a locked home action (its home id), with a way back to the apartment. */
  const [immoFrom, setImmoFrom] = useState<string | null>(null);
  /** DEF-HOME-02: furniture the padlock asked for, shown and focused in Immo Dada. */
  const [immoItem, setImmoItem] = useState<string | undefined>(undefined);
  const navRef = useRef<HTMLElement | null>(null);
  const asideRef = useRef<HTMLElement | null>(null);
  const [chat, setChat] = useState<{ friendId: string; index: number; step: number } | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [intro, setIntro] = useState<number | "boot" | null>("boot");
  const [tut, setTut] = useState<TutLocal | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [replayAsk, setReplayAsk] = useState<ReplayAsk>(null);
  const [hasBackup, setHasBackup] = useState(false);
  const [outcome, setOutcome] = useState<{ mood: Reaction; line: string; fact: string; portrait: string; fallback: string; name: string } | null>(null);
  // Metro run: the accepted offer being played (the game state only changes when it is over).
  // Offer closed because its chunk failed to load: hidden for this session only, no engine action (offer kept).
  const [metroDeferred, setMetroDeferred] = useState<number | null>(null);
  const [metroPlay, setMetroPlay] = useState<{ turn: number; audio: RunnerAudio | null; demo?: "win" | "hurt" | "crash"; practice?: boolean } | null>(null);
  const metroBusyRef = useRef(false);
  const reducedMotion = useReducedMotion();
  const phaseRef = useRef(state.phase);
  const logRef = useRef(state.log[0] ?? "");
  const stateRef = useRef(state);
  stateRef.current = state;
  const t: TFn = (text, vars) => localizeMoney(lang, tr(lang, text, vars));
  const money = (n: number, signed = false) => fmtMoney(lang, n, signed);
  const coach = coachView(state, tut);
  const coachRef = useRef(coach);
  coachRef.current = coach;
  const TS = TRAINING_STRINGS[lang];

  useEffect(() => {
    setHasSave(!!localStorage.getItem(SAVE_KEY));
    setHasBackup(backupExists(localStorage));
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
    // DEF-TUT-12: a tutorial game never feeds the records.
    if (!state.players.length || isPractice(state)) return;
    setTrophies((prev) => {
      const next = recordsFor(prev.ids, prev.peak, state);
      if (!next) return prev;
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

  // DEF-TUT-01: the 5 scripted turns are over as soon as the Gate coachmark shows. Write the "tutorial seen" flag
  // right away (RULES §8: at the end or on Skip), and fingerprint this save so a reload brings the coach back.
  const gateStep = tut?.post?.id === "t5gate" || !!tut?.done;
  useEffect(() => {
    if (!gateStep || state.training || state.screen !== "play" || !state.players.length) return;
    localStorage.setItem(TUTORIAL_KEY, TUTORIAL_SEEN_VALUE);
    markTutorialResult(localStorage, state);
  }, [gateStep, state]);

  useEffect(() => {
    if (!replayAsk) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setReplayAsk(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [replayAsk]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(id);
  }, [toast]);

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
    // The random faces are painted by <BoxDie> itself (DOM only); this loop only times the reveal.
    const loop = (now: number) => {
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
    if (prevPhase === "card" && state.phase === "idle" && logLine && logLine !== prevLog) {
      // The training coach speaks for the player during the scripted turns.
      if (coachRef.current || (state.training && !state.training.skipped && state.current === state.training.player)) return;
      const p = state.players[state.current];
      if (!p) return;
      setOutcome({
        mood: p.reaction,
        line: outcomeLine(p.reaction, phraseSalt(state.turn, p.position, tr("en", logLine).length)),
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
      if (metroBusyRef.current) return; // the metro offer / run owns the keyboard meanwhile
      if (friendEv || introMode || classQuiz) return;
      if (coachRef.current && !rules && !optionsOpen) return; // the coach owns Enter / Space meanwhile
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
        if (hub && !rules && !optionsOpen) {
          if (legendView) setLegendView(false);
          else setHub(null);
          return;
        }
        if (chat) {
          setChat(null);
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
      if (outcome || statusFor || historyOpen || friendId || confirmNew || chat || ledgerOpen || legendOpen || rules || optionsOpen || bioId || trophyId || hub) {
        if (e.key === "Enter" || e.key === " ") setOutcome(null);
        return;
      }
      if (e.target instanceof HTMLElement && e.target.closest("button, a, input, textarea, summary")) return;
      e.preventDefault();
      unlockAudio();
      if (s.phase === "idle" && s.screen === "play") dispatch({ type: "ROLL" });
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
  }, [rules, tutorial, bioId, optionsOpen, trophyId, outcome, statusFor, historyOpen, friendId, confirmNew, chat, intro, friendEv, introMode, ledgerOpen, legendOpen, hub, legendView, classQuiz]);

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
      if (saved.version === 1 && saved.players?.length) {
        // v3: the same-screen 2-player mode is gone; such a save goes on solo with one player (engine hydrate()).
        const multi = wasMultiSave(saved);
        const training = multi ? hydrate(saved).training : saved.training;
        go({ type: "CONTINUE", saved });
        // DEF-TUT-01: a reload on the Gate coachmark / done card comes back to it (the engine's training is already over).
        setTut(training && !training.skipped ? FRESH_TUT : isTutorialResult(localStorage, saved) ? GATE_TUT : null);
        if (multi) setToast(t("This 2-player game now goes on solo."));
      }
    } catch {
      setHasSave(false);
    }
  };
  const startGame = (picks: Pick[]) => {
    setPendingPicks(null);
    setConfirmNew(false);
    // First sitting on this device: the 5-turn training replaces the old rules slideshow (still in Rules).
    const training = !localStorage.getItem(TUTORIAL_KEY);
    clearTutorialResult(localStorage);
    if (!training) {
      go({ type: "NEW", picks, training: false });
      setTut(null);
      return;
    }
    // DEF-TUT-10: the real game is dealt now, at its true initial state (every player, random career, turn 1), and
    // set aside like "Replay the tutorial" does. The tutorial then runs on a throw-away solo game for player 1, and
    // Play / Skip bring the real game back untouched.
    setAsideFreshGame(localStorage, reduce(stateRef.current, { type: "NEW", picks, training: false }));
    setHasBackup(true);
    unlockAudio();
    go({ type: "NEW", picks: [picks[0]!], training: true });
    setTut(FRESH_TUT);
  };
  /** Player 1's character and dream, from the running game, the save, or the menu default. */
  const tutorialPick = (): Pick => {
    const fromPlayer = (p?: Player): Pick | null => (p ? { characterId: p.characterId, dreamId: p.dreamId, ...(p.custom ? { custom: p.custom } : {}) } : null);
    const live = fromPlayer(stateRef.current.players[0]);
    if (live) return live;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      const saved = raw ? (JSON.parse(raw) as GameState) : null;
      const p = fromPlayer(saved?.players?.[0]);
      if (p) return p;
    } catch {
      /* broken save: fall back to the default pick */
    }
    return { characterId: CHARACTERS[0]!.id, dreamId: DREAMS[0]!.id };
  };
  const startTraining = (pick: Pick) => {
    setReplayAsk(null);
    setOptionsOpen(false);
    unlockAudio();
    go({ type: "NEW", picks: [pick], training: true });
    setTut(FRESH_TUT);
  };
  /**
   * "Replay the tutorial" (Options). DEF-TUT-02: ask every time a game would be replaced, not only the first time,
   * and set the current real game aside every time (never a training state), so no game in progress is ever lost.
   */
  const replayTutorial = () => {
    setOptionsOpen(false);
    const ask = replayAskFor(localStorage);
    if (ask) {
      setReplayAsk(ask);
      return;
    }
    confirmReplay();
  };
  /** DEF-TUT-03: the done card's "Replay" replaces the tutorial's game too, so it asks first, like Options. */
  const replayFromDone = () => {
    setReplayAsk(replayAskFor(localStorage, { fromDoneCard: true }) ?? "restart");
  };
  const confirmReplay = () => {
    const pick = tutorialPick();
    backupBeforeReplay(localStorage);
    setHasBackup(backupExists(localStorage));
    startTraining(pick);
  };
  const restoreBackup = () => {
    const raw = localStorage.getItem(TRAINING_BACKUP_KEY);
    setTut(null);
    setOptionsOpen(false);
    if (!raw) return;
    localStorage.removeItem(TRAINING_BACKUP_KEY);
    setHasBackup(false);
    setReplayAsk(null);
    clearTutorialResult(localStorage);
    try {
      const saved = JSON.parse(raw) as GameState;
      localStorage.setItem(SAVE_KEY, raw);
      if (saved.version === 1 && saved.players?.length) go({ type: "CONTINUE", saved });
    } catch {
      /* unreadable backup: keep the current game */
    }
  };
  const markTutorialSeen = () => localStorage.setItem(TUTORIAL_KEY, TUTORIAL_SEEN_VALUE);
  /**
   * DEF-TUT-10: leaving the tutorial (Play on the done card, or Skip) always throws the tutorial game away: back to
   * the real game set aside, or, when there is none, a new game at its initial state with the same character.
   */
  const leaveTutorial = () => {
    markTutorialSeen();
    clearTutorialResult(localStorage);
    setTut(null);
    if (tutorialExit(localStorage) === "restore") {
      restoreBackup();
      return;
    }
    const pick = tutorialPick();
    go({ type: "NEW", picks: [pick], training: false });
  };
  const skipTraining = () => {
    leaveTutorial();
    setToast(TS.skipToast);
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

  const openHub = (tab: HubTab) => {
    setLegendView(false);
    if (tab === "ledger") {
      setHub(null);
      setLedgerOpen(true);
      return;
    }
    setHub((h) => (h === tab ? null : tab));
  };
  const menuItems: MenuItem[] = [
    { label: t("Legend"), icon: "key", hl: true, onClick: () => setLegendView(true) },
    { label: t("Rules"), icon: "list", onClick: () => setRules(true) },
    { label: savedFlash ? t("Saved") : t("Save"), icon: savedFlash ? "check" : "save", onClick: saveNow },
    { label: state.muted ? t("Sound off") : t("Sound on"), icon: state.muted ? "mute" : "sound", pressed: !state.muted, onClick: () => go({ type: "MUTE" }) },
    { label: t("Options"), icon: "wrench", onClick: () => { setOptTab("lang"); setOptionsOpen(true); } },
    { label: t("Finance quiz"), icon: "quiz", onClick: () => { setOptTab("quiz"); setQuizId(null); setQuizDone(false); setOptionsOpen(true); } },
    { label: t("Main menu"), icon: "house", onClick: () => { setHub(null); go({ type: "MENU" }); } },
    { label: t("Credits"), icon: "star", onClick: () => { setHub(null); go({ type: "CREDITS" }); } },
  ];
  const player = state.players.length ? cur(state) : null;
  const shownDie = state.die;
  const viewState = state;
  const passiveHistory = usePassiveHistory(state);
  const points: Point[] = player ? (passiveHistory[player.id] ?? []) : [];
  const isMobile = useIsMobile();
  const otherOverlay = !!(hub || classQuiz || coach || outcome || friendEv || statusFor || historyOpen || friendId || chat || ledgerOpen || legendOpen || rules || tutorial !== null || confirmNew || introMode || typeof intro === "number");
  // Metro run offer: due at the end of every 10th turn (never in the training / practice), one per multiple of 10.
  const metroDue = metroOfferTurn(state);
  const metroOffer = metroDue !== null && metroDeferred !== metroDue && !metroPlay && !otherOverlay && !optionsOpen;
  const metroBusy = metroOffer || !!metroPlay;
  metroBusyRef.current = metroBusy;
  // Lazy metro chunk: start the download as soon as an offer is due (offer and run share one chunk).
  useEffect(() => {
    if (metroDue !== null) preloadMinigame("metro", "offer");
  }, [metroDue]);
  // Lazy class quiz chunk: start the download when Activités opens.
  useEffect(() => {
    if (hub === "acts") preloadMinigame("quiz", "play");
  }, [hub]);
  const gateOpen = !!player && state.screen === "play" && state.phase === "idle" && player.track === "grind" && player.level < 2 && unlocked(player) && !gateSeen[player.id] && !otherOverlay && !metroBusy;
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

  // Header: "Training · Turn N/5" while the script runs, including the recap coachmarks shown after a turn.
  const trainingTurn =
    coach && coach.k !== "done"
      ? coach.turn
      : state.screen === "play" && state.training && !state.training.skipped && state.current === state.training.player
        ? Math.min(state.training.turn, 5)
        : 0;
  const topSub = trainingTurn && player
    ? fill(TS.topSub, { n: trainingTurn, name: nameOf(state.players[state.training?.player ?? 0] ?? player) })
    : state.screen === "play" && player
      ? `${t("Turn {turn}", { turn: state.turn })} · ${nameOf(player)} · ${lineName(player, t)}${player.level >= 2 ? ` · ${t("Level 2")}` : ""}`
      : t("A board game about cash flow");

  return (
    <div className={`gf-app ${state.screen === "play" ? "is-play" : ""} ${coach ? "tuto-on" : ""}`}>
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
          {/* Geraldy 16/10: no top-right "Menu" button; the bottom bar Menu › "Main menu" opens the same menu screen
              (rules / credits keep their "Back" button, the win screen its "Menu" button). */}
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
          // DEF-TUT-04: while the coach runs, the board and the dock behind it are inert (no Tab, no click).
          <main className="screen s-play" inert={!!coach || undefined}>
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
              <aside className="mat d-only" ref={asideRef}>
                <WhoBox player={player} state={state} t={t} lang={lang} onStatus={() => setStatusFor(player)} />
                <FlowBox player={player} t={t} lang={lang} />
                <GateBox player={player} t={t} lang={lang} points={points} />
                <Dock
                  state={viewState}
                  die={shownDie}
                  t={t}
                  onRoll={() => go({ type: "ROLL" })}
                  ctx={hasCtx ? ctxButtons : undefined}
                  actions={<BottomNav tab={hub} onTab={openHub} t={t} navRef={navRef} />}
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
                <BottomNav tab={hub} onTab={openHub} t={t} navRef={navRef} />
              </nav>
            )}
          </main>
        )}
        {state.screen === "play" && player && hub && !coach && !classQuiz && (
          <HubLayer anchor={asideRef} nav={navRef} label={t(hub === "day" ? "Day" : hub === "acts" ? "Activities" : "Menu")} onClose={() => { setImmoFrom(null); setHub(null); }}>
            {hub === "day" && <DayPanel state={state} tab={dayTab} setTab={setDayTab} t={t} lang={lang} go={go} onFriend={(id) => setFriendId(id)} onHome={(id) => { go({ type: "HOME_ENTER", homeId: id }); setHub(null); setHomeOpen(id); }} onClose={() => setHub(null)} />}
            {hub === "acts" && <ActivitiesPanel key={immoFrom ?? "acts"} initialShop={immoFrom ? "immo" : undefined} focusItem={immoFrom ? immoItem : undefined} onBackHome={immoFrom ? () => { const id = immoFrom; setImmoFrom(null); setHub(null); setHomeOpen(id); } : undefined} state={state} t={t} lang={lang} go={go} onQuiz={() => setClassQuiz(true)} onMetroPractice={() => { setHub(null); setMetroPlay({ turn: -1, audio: null, practice: true, demo: metroDemoDriver() }); }} onClose={() => { setImmoFrom(null); setHub(null); }} />}
            {hub === "menu" &&
              (legendView ? (
                <LegendPanel map={<LegendBody t={t} />} player={player} t={t} lang={lang} onClose={() => setHub(null)} onBack={() => setLegendView(false)} />
              ) : (
                <MenuPanel items={menuItems} t={t} onClose={() => setHub(null)} />
              ))}
          </HubLayer>
        )}
        {state.screen === "play" && player && homeOpen && (
          <Suspense fallback={null}>
            <HomeLayer
              state={state}
              homeId={homeOpen}
              t={t}
              go={go}
              onShop={(item) => {
                const id = homeOpen;
                setImmoItem(item);
                setHomeOpen(null);
                setImmoFrom(id);
                setHub("acts");
              }}
              onClose={() => {
                // R2: back to Day › Home with the focus on this home's "Enter" (the trigger), else on the panel.
                const id = homeOpen;
                setHomeOpen(null);
                setDayTab("home");
                setHub("day");
                setTimeout(() => (document.querySelector<HTMLElement>(`[data-home-enter="${id}"]`) ?? document.querySelector<HTMLElement>(".v3-panel button"))?.focus(), 0);
              }}
            />
          </Suspense>
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

      {state.screen === "play" && state.phase === "card" && state.card && player && !coach && (
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

      {coach && (
        <TrainingCoach
          state={state}
          view={coach}
          lang={lang}
          mobile={isMobile}
          reduced={prefersReducedMotion()}
          // DEF-TUT-10: "Play" already leads back to the game set aside, no separate "back to my game" link.
          hasBackup={false}
          onRoll={() => go({ type: "ROLL" })}
          onChoose={(id, post) => {
            go({ type: "CHOICE", id });
            if (post) setTut((x) => (x ? { ...x, post } : x));
          }}
          onPostDone={() => setTut((x) => (x ? { ...x, post: null } : x))}
          onFinish={() => {
            markTutorialSeen();
            // DEF-TUT-03: idempotent, a double click on "Got it" opens the done card once.
            setTut((x) => (x?.done ? x : { post: null, done: true }));
          }}
          onSkip={skipTraining}
          onPlay={leaveTutorial}
          onReplay={replayFromDone}
          onRestore={restoreBackup}
        />
      )}

      {replayAsk && (
        <div className="overlay tut-confirm" onClick={() => setReplayAsk(null)}>
          <div className="rules-sheet" role="dialog" aria-modal="true" aria-labelledby="replay-title" aria-describedby="replay-body" onClick={(e) => e.stopPropagation()}>
            <h2 id="replay-title" className="display">{TS.replay.title}</h2>
            <p id="replay-body">
              {replayAsk === "set-aside-replace"
                ? TS.replay.bodyReplace
                : replayAsk === "restart-keep"
                  ? TS.replay.bodyKeep
                  : replayAsk === "restart"
                    ? TS.replay.bodyRestart
                    : TS.replay.body}
            </p>
            <div className="card-actions">
              <button type="button" className="btn btn-ghost" data-autofocus onClick={() => setReplayAsk(null)}>{TS.replay.cancel}</button>
              <button type="button" className="btn btn-gold" onClick={confirmReplay}>{TS.replay.go}</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="tut-toast" role="status">
          {toast}
        </div>
      )}

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

      {classQuiz && player && state.screen === "play" && (
        <MinigameHost
          id="quiz"
          part="play"
          t={t}
          onClose={() => setClassQuiz(false)}
          props={{
            player,
            lang,
            t,
            onFinish: (correct: number, creative?: number) => {
              go({ type: "MINIGAME", id: "quiz", result: { correct, creative } });
              setClassQuiz(false);
              setHub("acts");
            },
            onClose: () => setClassQuiz(false),
          }}
        />
      )}
      {metroOffer && player && metroDue !== null && (
        <MinigameHost
          id="metro"
          part="offer"
          t={t}
          onClose={() => setMetroDeferred(metroDue)}
          props={{
            t,
            money,
            portrait: portraitOf(player),
            reduced: reducedMotion,
            gameMuted: state.muted,
            onDecline: () => go({ type: "MINIGAME", id: "metro", result: "decline" }),
            onRun: (audio: RunnerAudio) => setMetroPlay({ turn: metroDue, audio, demo: metroDemoDriver() }),
          }}
        />
      )}

      {metroPlay && player && (
        <MinigameHost
          id="metro"
          part="run"
          t={t}
          onClose={() => {
            // The run chunk failed to load: no result, the offer stays answerable (same as before the run started).
            setMetroPlay(null);
          }}
          props={{
            t,
            money,
            name: nameOf(player),
            faces: { idle: portraitOf(player), happy: expressionOf(player, "happy"), stressed: expressionOf(player, "stressed") },
            skirt: player.characterId === "aoi",
            cash: player.cash,
            reduced: reducedMotion,
            gameMuted: state.muted,
            audio: metroPlay.audio,
            demo: metroPlay.demo,
            practice: !!metroPlay.practice,
            ...metroDemoRun(),
            onDone: (lives: number, coins: number) => {
              setMetroPlay(null);
              // Free play from Activités › Mini-games: practice only, nothing reaches the engine.
              const action = metroDoneAction(!!metroPlay.practice, lives, coins);
              if (action) go(action);
            },
          }}
        />
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
                  <button type="button" className="btn btn-ghost" onClick={replayTutorial}>
                    {TS.done.replay}
                  </button>
                  {hasBackup && (
                    <button type="button" className="btn btn-ghost" onClick={restoreBackup}>
                      {TS.done.restore}
                    </button>
                  )}
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
                        <button type="button" className="btn btn-gold" onClick={() => { setStatusFor(null); setDayTab("goods"); setHub("day"); }}>{t("Goods")}</button>
                        <button type="button" className="btn btn-ghost" onClick={() => { setStatusFor(null); setHub("acts"); }}>{t("Activities")}</button>
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
                    {f && <FriendAffinity f={f} name={def.name.split(" ")[0]!} t={t} />}
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
      {introMode && <IntroVideo pick={introMode} lang={lang} t={t} onLang={(l) => { setLang(l); localStorage.setItem(LANG_KEY, l); }} onDone={closeIntro} onFail={() => { setIntroMode(null); setIntro(0); }} />}
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
