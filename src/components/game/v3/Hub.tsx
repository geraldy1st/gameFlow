/**
 * GameFlow v3 — bottom bar (Day · Activities · Ledger · Menu) and its panels. Nothing scrolls: internal tabs and
 * the Pager split whatever does not fit. Data comes from the engine (statement, skills) and tuning.ts.
 */
import { sceneOfMinigame } from "@/scenes/registry";
import { useEffect, useLayoutEffect, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { FRIENDS, PARTNERS } from "@/game/data";
import { cur, furnitureFree, homeDayOf, ownsGood, progressOf, quizOpen, quizWait, shopPrice, statement, type Action, type GameState, type Player } from "@/game/engine";
import { formatCompact } from "@/game/format-compact";
import { MINIGAME_REGISTRY, MINIGAME_SOON } from "@/minigames/registry";
import { CLASS_QUIZ, CURVES, AFFINITY_SEED, GOODS_CATEGORIES, SKILL_RULES, SOON_GOODS, type GoodsCategory } from "@/game/tuning";
import { ARTICLES, SHOP_DEFINITIONS, articlesOfShop, shopById, shopOfArticle, shopOfType, type ShopDefinition } from "@/game/articles";
import { HOME_LEVEL, HOME_SHOP } from "@/game/shop";
import { FURNITURE, HOME_SLOTS_PER_TURN, HOUSING, RESALE_RATE, housingById, slotsLeftText } from "@/game/home-data";
import { BIRTHDAY_COST, MUSEUM_COST, OUTFITS, clothDelta, type OutfitId } from "@/game/life";
import { SKILL_IDS, SKILL_NAMES, experienceXp, maxFriends, skillLevel, skillXp, type SkillId } from "@/game/skills";
import { SKILL_INFO, skillInfo } from "@/game/skills-info";
import { unlockState, unlockText } from "@/game/shops";
import { METRO_EVERY } from "@/game/metro-run";
import type { Lang } from "@/game/i18n";
import { Ico } from "../boite/icons";
import { fmtMoney } from "../boite/format";
import { LevelBar } from "./LevelBar";
import { Pager } from "./Pager";
import "./v3.css";
import { toWebp, webpFallback } from "../webp";

type TFn = (text: string, vars?: Record<string, string | number>) => string;
export type HubTab = "day" | "acts" | "ledger" | "menu";
type Go = (a: Action) => void;

/** Compact money, localised order: $1.2K (en) · 1.2K $ (fr, es). */
function cmoney(lang: Lang, n: number): string {
  const v = formatCompact(Math.abs(n));
  const sign = n < 0 ? "−" : "";
  return lang === "en" ? `${sign}$${v}` : `${sign}${v} $`;
}

const SKILL_COLOR: Record<SkillId, string> = Object.fromEntries(SKILL_INFO.map((s) => [s.id, s.color])) as Record<SkillId, string>;

/* ------------------------------------------------------------------ bottom bar */

export function BottomNav({ tab, onTab, t, navRef }: { tab: HubTab | null; onTab: (t: HubTab) => void; t: TFn; navRef?: RefObject<HTMLElement | null> }) {
  const items: [HubTab, string, string][] = [
    ["day", "Day", "sun"],
    ["acts", "Activities", "game"],
    ["ledger", "Ledger", "ledger"],
    ["menu", "Menu", "menu"],
  ];
  return (
    <nav className="v3-nav" aria-label={t("Main navigation")} ref={navRef as RefObject<HTMLElement>}>
      {items.map(([id, label, icon]) => (
        <button key={id} type="button" aria-current={tab === id ? "page" : undefined} onClick={() => onTab(id)}>
          <Ico name={icon} />
          <span>{t(label)}</span>
        </button>
      ))}
    </nav>
  );
}

/**
 * The panel layer: on a phone it covers the screen above the bottom bar; on a desktop it takes the side column
 * (the `anchor` element) above the bar.
 */
export function HubLayer({ anchor, nav, children, label, onClose }: { anchor: RefObject<HTMLElement | null>; nav: RefObject<HTMLElement | null>; children: ReactNode; label: string; onClose: () => void }) {
  const [box, setBox] = useState<CSSProperties>({});
  useLayoutEffect(() => {
    const place = () => {
      const n = nav.current?.getBoundingClientRect();
      const a = anchor.current?.getBoundingClientRect();
      const bottom = n ? Math.max(0, window.innerHeight - n.top + 8) : 84;
      if (a && a.width > 0 && window.innerWidth >= 900) {
        setBox({ left: a.left, width: a.width, top: Math.max(8, a.top), bottom });
      } else {
        setBox({ left: 8, right: 8, top: 8, bottom });
      }
    };
    place();
    window.addEventListener("resize", place);
    const ro = new ResizeObserver(place);
    if (nav.current) ro.observe(nav.current);
    if (anchor.current) ro.observe(anchor.current);
    return () => {
      window.removeEventListener("resize", place);
      ro.disconnect();
    };
  }, [anchor, nav]);
  return (
    <section
      className="v3 v3-layer"
      role="dialog"
      aria-modal="false"
      aria-label={label}
      style={box}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      {children}
    </section>
  );
}

function PanelHead({ kicker, title, t, onClose }: { kicker: string; title: string; t: TFn; onClose: () => void }) {
  return (
    <div className="v3-head">
      <div className="v3-head-t">
        <p className="v3-kicker">{kicker}</p>
        <h2>{title}</h2>
      </div>
      <button type="button" className="v3-x" onClick={onClose} aria-label={t("Close")}>
        <Ico name="close" />
      </button>
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange, t, label }: { tabs: [T, string][]; value: T; onChange: (v: T) => void; t: TFn; label: string }) {
  return (
    <div className="v3-tabs" role="tablist" aria-label={label}>
      {tabs.map(([id, name]) => (
        <button key={id} type="button" role="tab" aria-selected={value === id} onClick={() => onChange(id)}>
          {t(name)}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ Day */

export type DayTab = "income" | "goods" | "circle" | "stats" | "home";

export function DayPanel({ state, tab, setTab, t, lang, go, onFriend, onHome, onClose }: { state: GameState; tab: DayTab; setTab: (t: DayTab) => void; t: TFn; lang: Lang; go: Go; onFriend: (id: string) => void; onHome?: (homeId: string) => void; onClose: () => void }) {
  const p = cur(state);
  return (
    <div className="v3-panel">
      <PanelHead kicker={t("Day")} title={t(tab === "income" ? "Income" : tab === "goods" ? "Goods" : tab === "circle" ? "Circle" : tab === "home" ? "Home" : "Stats")} t={t} onClose={onClose} />
      <Tabs<DayTab>
        tabs={[
          ["income", "Income"],
          ["goods", "Goods"],
          ["circle", "Circle"],
          ["stats", "Stats"],
          ["home", "Home"],
        ]}
        value={tab}
        onChange={setTab}
        t={t}
        label={t("Day")}
      />
      <div className="v3-body">
        {tab === "income" && <IncomeTab p={p} t={t} lang={lang} />}
        {tab === "goods" && <GoodsTab state={state} p={p} t={t} lang={lang} go={go} />}
        {tab === "circle" && <CircleTab state={state} p={p} t={t} onFriend={onFriend} />}
        {tab === "stats" && <StatsTab state={state} p={p} t={t} lang={lang} go={go} />}
        {tab === "home" && <HomeTab state={state} p={p} t={t} lang={lang} go={go} onHome={onHome} />}
      </div>
    </div>
  );
}

/** Chez Aoi: owned housings (Enter), the home counter, and the inventory with resale at 50 %. */
export function HomeTab({ state, p, t, lang, go, onHome }: { state: GameState; p: Player; t: TFn; lang: Lang; go: Go; onHome?: (homeId: string) => void }) {
  const idle = state.phase === "idle" && !state.practice;
  const homes = Object.keys(p.housing ?? {}).filter((id) => !!housingById(id));
  const d = homeDayOf(p);
  const free = FURNITURE.filter((f) => furnitureFree(p, f.id) > 0);
  type Row = { id: string; node: ReactNode };
  const rows: Row[] = [
    ...homes.map((id) => ({
      id: `h:${id}`,
      node: (
        <div className="v3-card">
          <span className="v3-ic" aria-hidden="true"><Ico name="house" /></span>
          <span className="v3-tx">
            <strong>{t(housingById(id)!.name)}</strong>
            <small>{slotsLeftText(t, HOME_SLOTS_PER_TURN - d.used, HOME_SLOTS_PER_TURN)}</small>
          </span>
          <button type="button" className="v3-tag act" data-home-enter={id} disabled={!idle || !onHome} onClick={() => onHome?.(id)}>{t("Enter")}</button>
        </div>
      ),
    })),
    ...free.map((f) => ({
      id: `f:${f.id}`,
      node: (
        <div className="v3-card">
          <span className="v3-ic" aria-hidden="true"><Ico name={f.icon} /></span>
          <span className="v3-tx">
            <strong>{t(f.name)}</strong>
            <small>{t("In your home")}</small>
          </span>
          <button type="button" className="v3-tag act" disabled={!idle} onClick={() => go({ type: "SELL_FURNITURE", id: f.id })} aria-label={t("Sell {item} for {amount}", { item: t(f.name), amount: fmtMoney(lang, Math.floor(f.price * RESALE_RATE)) })}>
            {t("Sell")} {cmoney(lang, Math.floor(f.price * RESALE_RATE))}
          </button>
        </div>
      ),
    })),
  ];
  if (!rows.length) return <p className="v3-muted">{t("No home yet. Immo Dada (Activities › Shops) sells apartments and home supplies.")}</p>;
  return (
    <>
      <p className="v3-muted">{t("Each home action uses one time slot, no turn spent.")} {slotsLeftText(t, HOME_SLOTS_PER_TURN - d.used, HOME_SLOTS_PER_TURN)}</p>
      <Pager items={rows} minW={200} itemH={62} t={t} label={t("Home")} render={(r) => r.node} />
    </>
  );
}

/** Immo Dada: housing (one in stock, the others "out of stock") and home supplies; same design as the shops. */
function ImmoView({ state, p, t, lang, go, onBack, onBackHome, focusItem }: { state: GameState; p: Player; t: TFn; lang: Lang; go: Go; onBack: () => void; onBackHome?: () => void; focusItem?: string }) {
  const idle = state.phase === "idle" && !state.practice;
  type Item = { id: string; name: string; note: string; icon: string; price: number; owned?: boolean; out?: boolean; buy: () => void };
  const items: Item[] = [
    ...HOUSING.map((h) => ({ id: h.id, name: t(h.name), note: h.inStock ? t("Empty on purchase") : fmtMoney(lang, h.price), icon: "house", price: h.price, owned: !!p.housing?.[h.id], out: !h.inStock, buy: () => go({ type: "BUY_HOUSING", id: h.id }) })),
    ...FURNITURE.map((f) => ({ id: f.id, name: t(f.name), note: t("Home supply · resale {amount}", { amount: fmtMoney(lang, Math.floor(f.price * RESALE_RATE)) }), icon: f.icon, price: f.price, owned: furnitureFree(p, f.id) > 0, buy: () => go({ type: "BUY_FURNITURE", id: f.id }) })),
  ];
  const focusIndex = focusItem ? items.findIndex((it) => it.id === focusItem) : -1;
  // DEF-HOME-02: the furniture asked for by a padlock is shown, highlighted and focused.
  useEffect(() => {
    if (focusIndex < 0) return;
    const id = setTimeout(() => {
      const el = document.querySelector<HTMLElement>(`[data-immo-item="${focusItem}"]`);
      el?.scrollIntoView?.({ block: "nearest" });
      (el?.querySelector<HTMLElement>("button") ?? el)?.focus();
    }, 50);
    return () => clearTimeout(id);
  }, [focusIndex, focusItem]);
  return (
    <>
      <div className="v3-subrow">
        {onBackHome ? (
          <button type="button" className="v3-link" data-back-home onClick={onBackHome}>
            ← {t("Back to the apartment")}
          </button>
        ) : (
          <button type="button" className="v3-link" onClick={onBack}>
            ← {t("Shops")}
          </button>
        )}
        <span className="v3-cash">{t("Cash")}{lang === "en" ? ": " : " : "}<b>{cmoney(lang, p.cash)}</b></span>
      </div>
      <Pager
        items={items}
        minW={200}
        itemH={62}
        t={t}
        label="Immo Dada"
        focusIndex={focusIndex >= 0 ? focusIndex : undefined}
        render={(it) => (
          <div className={`v3-card ${it.out ? "locked" : ""} ${it.id === focusItem ? "hl" : ""}`} data-immo-item={it.id} tabIndex={it.id === focusItem ? -1 : undefined}>
            <span className="v3-ic" aria-hidden="true"><Ico name={it.icon} /></span>
            <span className="v3-tx">
              <strong>{it.name}</strong>
              <small>{it.note}</small>
            </span>
            {it.owned ? (
              <span className="v3-tag own">{t("Owned")}</span>
            ) : it.out ? (
              <span className="v3-tag">{t("Out of stock")}</span>
            ) : (
              <button type="button" className="v3-tag act" disabled={!idle || p.cash < it.price} onClick={it.buy} aria-label={t("Buy {item} for {amount}", { item: it.name, amount: fmtMoney(lang, it.price) })}>
                {cmoney(lang, it.price)}
              </button>
            )}
          </div>
        )}
      />
      {!idle && <p className="v3-muted">{t("Shops serve you between two rolls.")}</p>}
    </>
  );
}

function IncomeTab({ p, t, lang }: { p: Player; t: TFn; lang: Lang }) {
  const st = statement(p);
  const gap = Math.max(0, st.expenses - st.passive);
  const ratio = st.expenses > 0 ? Math.min(1, st.passive / st.expenses) : 1;
  // Fills the tab on tall phones: every income and expense line, paginated (never scrolls).
  const breakdown: [string, number][] = (
    [
      [t("Cash"), p.cash],
      ...p.assets.map((a) => [t(a.name), a.cashFlow] as [string, number]),
      [t("Taxes"), -st.taxes],
      [t("Rent"), -st.rent],
      [t("Food & transport"), -(st.food + st.transport)],
      [t("Other + lifestyle"), -(st.other + st.mods)],
      [t("Partner"), -st.partnerExpense],
      [t("Children"), -st.childCost],
      [t("Debt payments"), -st.debtPay],
    ] as [string, number][]
  ).filter(([, v], i) => i === 0 || v !== 0);
  return (
    <div className="v3-income">
      <div className="v3-rows">
        <div className="v3-row sal">
          <span>{t("Salary")}</span>
          <b>{fmtMoney(lang, st.salary, true)}{t("/mo")}</b>
        </div>
        {st.healthBonus > 0 && (
          <div className="v3-row sub">
            <span>{t("{skill} Lv. {n}", { skill: t("Health"), n: skillLevel(p, "health") })}</span>
            <b>{fmtMoney(lang, st.healthBonus, true)}</b>
          </div>
        )}
        {st.gigIncome > 0 && (
          <div className="v3-row sub">
            <span>{t("Side incomes")}</span>
            <b>{fmtMoney(lang, st.gigIncome, true)}</b>
          </div>
        )}
        <div className="v3-row pas">
          <span>{t("Passive income")}</span>
          <b>{fmtMoney(lang, st.passive, true)}{t("/mo")}</b>
        </div>
        <div className="v3-row dep">
          <span>{t("Expenses")}</span>
          <b>{fmtMoney(lang, -st.expenses)}{t("/mo")}</b>
        </div>
        <div className="v3-row total">
          <span>{t("Monthly cash flow")}</span>
          <b>{fmtMoney(lang, st.cashFlow, true)}</b>
        </div>
      </div>
      <div className="v3-gate">
        <div className="v3-g-l">
          <span>{t("The Gate")}</span>
          <span>{Math.round(ratio * 100)}%</span>
        </div>
        <div className="v3-gauge" role="progressbar" aria-label={t("The Gate")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(ratio * 100)}>
          <i style={{ width: `${ratio * 100}%` }} />
        </div>
        <p>{gap > 0 ? t("{amount} of passive income still to go.", { amount: fmtMoney(lang, gap) }) : t("Passive income covers your expenses: the Gate is open.")}</p>
        {!SKILL_RULES.creativity.countsTowardGate && st.gigIncome > 0 && <p className="v3-muted">{t("Side incomes are earned income: they do not open the Gate.")}</p>}
      </div>
      <p className="v3-lg-sub">{t("Where the money goes")}</p>
      <Pager
        items={breakdown}
        itemH={30}
        minW={200}
        maxCols={2}
        t={t}
        label={t("Expense lines")}
        render={([label, v]) => (
          <div className="v3-exp">
            <span>{label}</span>
            <span className="num">{fmtMoney(lang, v, true)}</span>
          </div>
        )}
      />
    </div>
  );
}

interface GoodRow {
  id: string;
  name: string;
  note: string;
  icon: string;
  owned: boolean;
  on?: boolean;
  /** Locked silhouette: "???" + this condition. */
  locked?: string;
  act?: () => void;
  actLabel?: string;
}

function goodsRows(state: GameState, p: Player, cat: GoodsCategory, t: TFn, lang: Lang, go: Go): GoodRow[] {
  const idle = state.phase === "idle";
  const pr = progressOf(p);
  const shopNote = (shop: ShopDefinition | undefined) => {
    if (!shop) return t("Coming in an update");
    const u = unlockState(shop.unlock, pr);
    if (u.open) return t("On sale at: {shop}", { shop: t(shop.name) });
    const txt = unlockText(u);
    return `${t(shop.name)} · ${t(txt.k, txt.v)}`;
  };
  const rows: GoodRow[] = [];
  if (cat === "wardrobe") {
    const owned = p.ownedOutfits ?? ["jeans"];
    for (const o of OUTFITS) {
      const has = owned.includes(o.id);
      const d = clothDelta(o.id);
      rows.push({
        id: o.id,
        name: has ? t(o.name) : "???",
        note: has ? (d === 0 ? t("Changes nothing") : t("{amount}/mo on an offer", { amount: fmtMoney(lang, d, true) })) : shopNote(shopOfType("cloth")),
        icon: o.id === "night" ? "dress" : o.id === "shirt" || o.id === "tee" ? "shirt" : "jeans",
        owned: has,
        on: p.outfit === o.id,
        locked: has ? undefined : "1",
        act: has && idle && p.outfit !== o.id ? () => go({ type: "WEAR", outfit: o.id as OutfitId }) : undefined,
        actLabel: p.outfit === o.id ? t("Worn") : t("Wear"),
      });
    }
  }
  if (cat === "homes") {
    for (const h of HOME_SHOP) {
      const has = (p.homeOwned ?? []).includes(h.id);
      const on = (p.homeOn ?? []).includes(h.id);
      rows.push({
        id: h.id,
        name: has ? t(h.name) : "???",
        note: has ? (on ? t("Equipped") : t("Stored")) : shopNote(shopOfType("home-item")),
        icon: "lamp",
        owned: has,
        on,
        locked: has ? undefined : "1",
        act: has && idle ? () => go({ type: "TOGGLE_HOME", id: h.id }) : undefined,
        actLabel: on ? t("Put away") : t("Equip"),
      });
    }
  }
  for (const g of ARTICLES.filter((x) => x.type === "good" && x.cat === cat)) {
    const has = ownsGood(p, g.id);
    const shop = shopOfArticle("good", g.id);
    const n = p.goodsCount?.[g.id] ?? 0;
    rows.push({ id: g.id, name: has ? t(g.name) + (n > 1 ? ` ×${n}` : "") : "???", note: has ? t(g.note ?? "") : shopNote(shop), icon: g.icon, owned: has, locked: has ? undefined : "1" });
  }
  for (const s of SOON_GOODS.filter((x) => x.cat === cat)) rows.push({ id: s.id, name: "???", note: t(s.when), icon: s.icon, owned: false, locked: "1" });
  // owned first, then silhouettes
  return rows.sort((a, b) => Number(b.owned) - Number(a.owned));
}

function GoodsTab({ state, p, t, lang, go }: { state: GameState; p: Player; t: TFn; lang: Lang; go: Go }) {
  const [cat, setCat] = useState<GoodsCategory>(GOODS_CATEGORIES[0]!.id);
  const rows = goodsRows(state, p, cat, t, lang, go);
  return (
    <>
      <div className="v3-chips" role="group" aria-label={t("Categories")}>
        {GOODS_CATEGORIES.map((c) => {
          const n = goodsRows(state, p, c.id, t, lang, go).filter((r) => r.owned).length;
          return (
            <button key={c.id} type="button" className="v3-chip" aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>
              <Ico name={c.icon} />
              {t(c.name)}
              <em>{n}</em>
            </button>
          );
        })}
      </div>
      <Pager
        key={cat}
        items={rows}
        minW={170}
        itemH={62}
        t={t}
        label={t("Goods")}
        render={(r) => (
          <div className={`v3-card ${r.locked ? "locked" : ""} ${r.on ? "on" : ""}`}>
            <span className="v3-ic" aria-hidden="true">
              <Ico name={r.locked ? "unknown" : r.icon} />
            </span>
            <span className="v3-tx">
              <strong>{r.name}</strong>
              <small>
                {r.locked && <Ico name="lock" className="v3-lock" />}
                {r.note}
              </small>
            </span>
            {r.act ? (
              <button type="button" className="v3-tag act" onClick={r.act}>
                {r.actLabel}
              </button>
            ) : r.owned ? (
              <span className="v3-tag own">{r.on ? r.actLabel ?? t("Owned") : t("Owned")}</span>
            ) : null}
          </div>
        )}
      />
    </>
  );
}

/** Affinity XP of a friend (no engine field: derived from likes and loyalty, tuning.ts AFFINITY_SEED). */
function affinityXp(f: { likes: number; loyalty: number }): number {
  return Math.max(0, f.likes) * AFFINITY_SEED.perLike + Math.max(0, f.loyalty) * AFFINITY_SEED.perLoyalty;
}

function CircleTab({ state, p, t, onFriend }: { state: GameState; p: Player; t: TFn; onFriend: (id: string) => void }) {
  const people: { id: string; name: string; portrait: string; note: string; xp: number | null }[] = [];
  if (p.partner) {
    const d = PARTNERS.find((x) => x.id === p.partner!.id);
    if (d) people.push({ id: d.id, name: d.name.split(" ")[0]!, portrait: d.portrait, note: t("partner"), xp: null });
  }
  for (const f of p.friends) {
    const d = FRIENDS.find((x) => x.id === f.id);
    if (d) people.push({ id: d.id, name: d.name.split(" ")[0]!, portrait: d.portrait, note: t(f.role === "partner" ? "Business partner" : d.friendTrait ?? d.trait), xp: affinityXp(f) });
  }
  const seats = maxFriends(p);
  return (
    <>
      <p className="v3-line">
        {t("Friend seats: {n} / {m}", { n: p.friends.length, m: seats })}
        {state.phase === "idle" && p.circleTurn === state.turn ? ` · ${t("You already saw your circle this turn.")}` : ""}
      </p>
      {people.length === 0 ? (
        <p className="v3-empty">{t("Love, family, and friends show up on their squares.")}</p>
      ) : (
        <Pager
          items={people}
          minW={104}
          itemH={128}
          maxCols={6}
          t={t}
          label={t("Circle")}
          render={(x) => (
            <button type="button" className="v3-card v3-friend" onClick={() => onFriend(x.id)}>
              <img src={toWebp(x.portrait)} alt="" loading="lazy" decoding="async" onError={webpFallback} />
              <strong>{x.name}</strong>
              <small>{x.note}</small>
              {x.xp !== null && <LevelBar label={x.name} xp={x.xp} curve={CURVES.affinity} color="var(--coral)" t={t} compact />}
            </button>
          )}
        />
      )}
    </>
  );
}

function StatsTab({ state, p, t, lang, go }: { state: GameState; p: Player; t: TFn; lang: Lang; go: Go }) {
  const [view, setView] = useState<"skills" | "acts">("skills");
  const idle = state.phase === "idle";
  const used = p.lifeTurn === state.turn;
  return (
    <>
      <div className="v3-subhead">
        <LevelBar label={t("Experience")} xp={experienceXp(p)} curve={CURVES.xp} color="var(--gold)" t={t} />
        <div className="v3-seg" role="group" aria-label={t("Stats")}>
          <button type="button" aria-pressed={view === "skills"} onClick={() => setView("skills")}>
            {t("Skills")}
          </button>
          <button type="button" aria-pressed={view === "acts"} onClick={() => setView("acts")}>
            {t("Today’s activity")}
          </button>
        </div>
      </div>
      {view === "skills" ? (
        <Pager
          items={[...SKILL_IDS]}
          minW={220}
          itemH={50}
          maxCols={2}
          t={t}
          label={t("Skills")}
          render={(id) => <LevelBar label={t(SKILL_NAMES[id])} xp={skillXp(p, id)} curve={CURVES.skill} color={SKILL_COLOR[id]} t={t} icon={<Ico name={skillInfo(id).icon} />} />}
        />
      ) : (
        <div className="v3-dayacts">
          {used && <p className="v3-line">{t("You already spent part of this day.")}</p>}
          <button type="button" className="v3-card" disabled={!idle || used || p.friends.length === 0 || p.cash < BIRTHDAY_COST} onClick={() => go({ type: "LIFE", kind: "birthday" })}>
            <span className="v3-ic"><Ico name="gift" /></span>
            <span className="v3-tx">
              <strong>{t("A friend's birthday")}</strong>
              <small>{p.friends.length === 0 ? t("No one in the circle yet.") : `${fmtMoney(lang, BIRTHDAY_COST)} · ${t("Happiness")} + ${t("Social")}`}</small>
            </span>
          </button>
          <button type="button" className="v3-card" disabled={!idle || used || p.cash < MUSEUM_COST} onClick={() => go({ type: "LIFE", kind: "museum" })}>
            <span className="v3-ic"><Ico name="frame" /></span>
            <span className="v3-tx">
              <strong>{t("The museum")}</strong>
              <small>{`${fmtMoney(lang, MUSEUM_COST)} · ${t("Intelligence")} + ${t("Creativity")}`}</small>
            </span>
          </button>
          <button type="button" className="v3-card" disabled={!idle || used} onClick={() => go({ type: "LIFE", kind: "sleep" })}>
            <span className="v3-ic"><Ico name="moon" /></span>
            <span className="v3-tx">
              <strong>{t("Sleep")}</strong>
              <small>{t("Free. Happiness and Health rise. You miss this roll.")}</small>
            </span>
          </button>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ Activities */

export function ActivitiesPanel({ state, t, lang, go, onQuiz, onMetroPractice, onClose, initialShop, onBackHome, focusItem }: { state: GameState; t: TFn; lang: Lang; go: Go; onQuiz: () => void; onMetroPractice?: () => void; onClose: () => void; initialShop?: string; onBackHome?: () => void; focusItem?: string }) {
  const p = cur(state);
  const [tab, setTab] = useState<"shops" | "games">("shops");
  const [shop, setShop] = useState<string | null>(initialShop ?? null);
  const open = shop && shop !== "immo" ? shopById(shop) : undefined;
  const immo = shop === "immo";
  const pr = progressOf(p);
  return (
    <div className="v3-panel">
      <PanelHead kicker={t("Activities")} title={immo ? "Immo Dada" : open ? t(open.name) : t(tab === "shops" ? "Shops" : "Mini-games")} t={t} onClose={onClose} />
      {!open && !immo && (
        <Tabs<"shops" | "games">
          tabs={[
            ["shops", "Shops"],
            ["games", "Mini-games"],
          ]}
          value={tab}
          onChange={setTab}
          t={t}
          label={t("Activities")}
        />
      )}
      <div className="v3-body">
        {immo ? (
          <ImmoView state={state} p={p} t={t} lang={lang} go={go} onBack={() => setShop(null)} onBackHome={onBackHome} focusItem={focusItem} />
        ) : open ? (
          <ShopView shop={open} state={state} p={p} t={t} lang={lang} go={go} onBack={() => setShop(null)} />
        ) : tab === "shops" ? (
          <Pager
            items={[IMMO_CARD, ...SHOP_DEFINITIONS]}
            minW={200}
            itemH={62}
            t={t}
            label={t("Shops")}
            render={(s) => {
              if (s === IMMO_CARD)
                return (
                  <button type="button" className="v3-card" onClick={() => setShop("immo")} style={{ "--c": "#3E7CB1" } as CSSProperties}>
                    <span className="v3-ic tint" aria-hidden="true"><Ico name="house" /></span>
                    <span className="v3-tx">
                      <strong>Immo Dada</strong>
                      <small>{t("Housing and home supplies")}</small>
                    </span>
                    <span className="v3-tag">→</span>
                  </button>
                );
              const u = unlockState(s.unlock, pr);
              const txt = unlockText(u);
              return (
                <button type="button" className={`v3-card ${u.open ? "" : "locked"}`} disabled={!u.open} onClick={() => setShop(s.id)} style={{ "--c": s.color } as CSSProperties}>
                  <span className="v3-ic tint" aria-hidden="true"><Ico name={u.open ? s.icon : "lock"} /></span>
                  <span className="v3-tx">
                    <strong>{t(s.name)}</strong>
                    <small>{u.open ? t("Open") : t(txt.k, txt.v)}</small>
                  </span>
                  {u.open && <span className="v3-tag">→</span>}
                </button>
              );
            }}
          />
        ) : (
          <GamesTab state={state} p={p} t={t} onQuiz={onQuiz} onMetroPractice={onMetroPractice} />
        )}
      </div>
    </div>
  );
}

/** Immo Dada's entry in the shops list (its own page, same design). */
const IMMO_CARD = { id: "immo", name: "Immo Dada", icon: "house", color: "#3E7CB1", unlock: SHOP_DEFINITIONS[0]!.unlock, sells: SHOP_DEFINITIONS[0]!.sells } as ShopDefinition;

function ShopView({ shop, state, p, t, lang, go, onBack }: { shop: ShopDefinition; state: GameState; p: Player; t: TFn; lang: Lang; go: Go; onBack: () => void }) {
  const idle = state.phase === "idle";
  type Item = { id: string; name: string; note: string; icon: string; price: number; base: number; owned: boolean; buy: () => void; locked?: string };
  const items: Item[] = [];
  // Batch 6: every shop lists its articles through the article model (articles.ts), in the same order as before.
  for (const a of articlesOfShop(shop)) {
    if (a.type === "cloth") {
      const d = clothDelta(a.id as OutfitId);
      items.push({ id: a.id, name: t(a.name), note: t("{amount}/mo on an offer", { amount: fmtMoney(lang, d, true) }), icon: a.icon, base: a.price, price: shopPrice(p, a.price), owned: (p.ownedOutfits ?? ["jeans"]).includes(a.id as OutfitId), buy: () => go({ type: "BUY_CLOTH", outfit: a.id as OutfitId }) });
    } else if (a.type === "home-item") {
      items.push({ id: a.id, name: t(a.name), note: t("Mood at home"), icon: a.icon, base: a.price, price: shopPrice(p, a.price), owned: (p.homeOwned ?? []).includes(a.id), buy: () => go({ type: "BUY_HOME", id: a.id }), locked: p.level < HOME_LEVEL ? t("Opens once the Gate is crossed") : undefined });
    } else if (a.type === "good") {
      items.push({ id: a.id, name: t(a.name), note: t(a.note ?? ""), icon: a.icon, base: a.price, price: shopPrice(p, a.price), owned: !a.repeat && ownsGood(p, a.id), buy: () => go({ type: "BUY_GOOD", id: a.id }) });
    }
  }
  const nego = skillLevel(p, "nego");
  const disc = items[0] ? 1 - items[0].price / items[0].base : 0;
  return (
    <>
      <div className="v3-subrow">
        <button type="button" className="v3-link" onClick={onBack}>
          ← {t("Shops")}
        </button>
        {disc > 0.001 && <span className="v3-skillchip" style={{ "--c": SKILL_COLOR.nego } as CSSProperties}>{t("{skill} Lv. {n}", { skill: t("Negotiation"), n: nego })}{lang === "en" ? ": " : " : "}−{Math.round(disc * 100)}%</span>}
        <span className="v3-cash">{t("Cash")}{lang === "en" ? ": " : " : "}<b>{cmoney(lang, p.cash)}</b></span>
      </div>
      <Pager
        items={items}
        minW={200}
        itemH={62}
        t={t}
        label={t(shop.name)}
        render={(it) => (
          <div className={`v3-card ${it.locked ? "locked" : ""}`}>
            <span className="v3-ic" aria-hidden="true"><Ico name={it.icon} /></span>
            <span className="v3-tx">
              <strong>{it.name}</strong>
              <small>{it.locked ?? it.note}</small>
            </span>
            {it.owned ? (
              <span className="v3-tag own">{t("Owned")}</span>
            ) : (
              <button type="button" className="v3-tag act" disabled={!idle || !!it.locked || p.cash < it.price} onClick={it.buy} aria-label={t("Buy {item} for {amount}", { item: it.name, amount: fmtMoney(lang, it.price) })}>
                {cmoney(lang, it.price)}
              </button>
            )}
          </div>
        )}
      />
      {!idle && <p className="v3-muted">{t("Shops serve you between two rolls.")}</p>}
    </>
  );
}

function GamesTab({ state, p, t, onQuiz, onMetroPractice }: { state: GameState; p: Player; t: TFn; onQuiz: () => void; onMetroPractice?: () => void }) {
  const nextMetro = (Math.floor(Math.max(0, p.turns - 1) / METRO_EVERY) + 1) * METRO_EVERY;
  const wait = quizWait(p);
  const canQuiz = state.phase === "idle" && quizOpen(p) && !state.training && !state.practice;
  return (
    <div className="v3-games">
      {/* Batch 7: a "menu" mini-game is listed when an open scene hosts it (the school hosts the class quiz). */}
      {[...MINIGAME_REGISTRY.filter((g) => g.entry !== "menu" || !!sceneOfMinigame(g.id)), ...MINIGAME_SOON].map((g) =>
        "soon" in g ? (
          <div key={g.id} className="v3-card v3-game soon">
            <span className="v3-ic" aria-hidden="true"><Ico name="unknown" /></span>
            <span className="v3-tx">
              <strong>{t("Coming soon")}</strong>
              <small>{t("A new mini-game arrives in an update.")}</small>
            </span>
          </div>
        ) : g.entry === "offer" ? (
          // Free play (practice: nothing credited); the every-10-turns offer still pays.
          <button key={g.id} type="button" className="v3-card v3-game" style={{ "--c": "var(--sky)" } as CSSProperties} disabled={!onMetroPractice || state.screen !== "play"} onClick={onMetroPractice} aria-describedby={`${g.id}-practice-note`}>
            <span className="v3-ic tint" aria-hidden="true"><Ico name="run" /></span>
            <span className="v3-tx">
              <strong>{t(g.name)}</strong>
              <small>{t(g.note)} · {t("next after turn {n}", { n: nextMetro })}</small>
              <small id={`${g.id}-practice-note`}>{t("Free play: practice, no gains")}</small>
            </span>
            {onMetroPractice && <span className="v3-tag act">{t("Play")}</span>}
          </button>
        ) : (
          <button key={g.id} type="button" className="v3-card v3-game" style={{ "--c": "var(--lilac)" } as CSSProperties} disabled={!canQuiz} onClick={onQuiz}>
            <span className="v3-ic tint" aria-hidden="true"><Ico name="quiz" /></span>
            <span className="v3-tx">
              <strong>{t(g.name)}</strong>
              <small>
                {t("{perfect} with no mistakes, otherwise {partial}", { perfect: `$${CLASS_QUIZ.perfectReward}`, partial: `$${CLASS_QUIZ.partialReward}` })}
                {wait > 0 ? ` · ${t("again in {n} turns", { n: wait })}` : ""}
              </small>
            </span>
            {canQuiz && <span className="v3-tag act">{t("Play")}</span>}
          </button>
        ),
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Menu & Legend */

export interface MenuItem {
  label: string;
  icon: string;
  onClick: () => void;
  hl?: boolean;
  pressed?: boolean;
}

export function MenuPanel({ items, t, onClose }: { items: MenuItem[]; t: TFn; onClose: () => void }) {
  return (
    <div className="v3-panel">
      <PanelHead kicker={t("Menu")} title={t("Menu")} t={t} onClose={onClose} />
      <div className="v3-body">
        <Pager
          items={items}
          minW={150}
          itemH={52}
          maxCols={2}
          t={t}
          label={t("Menu")}
          render={(m) => (
            <button type="button" className={`v3-card v3-tile ${m.hl ? "hl" : ""}`} onClick={m.onClick} aria-pressed={m.pressed}>
              <span className="v3-ic" aria-hidden="true"><Ico name={m.icon} /></span>
              <span className="v3-tx">
                <strong>{m.label}</strong>
              </span>
            </button>
          )}
        />
      </div>
    </div>
  );
}

export function LegendPanel({ map, player, t, lang, onClose, onBack }: { map: ReactNode; player: Player | null; t: TFn; lang: Lang; onClose: () => void; onBack: () => void }) {
  const [tab, setTab] = useState<"map" | "skills">("map");
  return (
    <div className="v3-panel">
      <PanelHead kicker={t("Legend")} title={t(tab === "map" ? "Network map" : "Skills")} t={t} onClose={onClose} />
      <Tabs<"map" | "skills">
        tabs={[
          ["map", "Network map"],
          ["skills", "Skills"],
        ]}
        value={tab}
        onChange={setTab}
        t={t}
        label={t("Legend")}
      />
      <div className="v3-body">
        {tab === "map" ? (
          <div className="v3-legend-map">{map}</div>
        ) : (
          <>
            <p className="v3-line">{t("Each skill has a level without a cap. Its effect grows by steps, then stops at a ceiling.")}</p>
            <Pager
              items={SKILL_INFO}
              minW={260}
              itemH={158}
              maxCols={3}
              t={t}
              label={t("Skills")}
              render={(s) => (
                <div className="v3-card v3-skill" style={{ "--c": s.color } as CSSProperties}>
                  <span className="v3-ic tint" aria-hidden="true"><Ico name={s.icon} /></span>
                  <span className="v3-tx">
                    <strong>
                      {t(SKILL_NAMES[s.id])}
                      {player ? <em> · {t("Lv. {n}", { n: formatCompact(skillLevel(player, s.id)) })}</em> : null}
                    </strong>
                    <small className="d">{t(s.desc)}</small>
                    <small>▼ {t(s.low)}</small>
                    <small>▲ {t(s.high)}</small>
                    <small>＋ {t(s.up)}</small>
                  </span>
                </div>
              )}
            />
            <p className="v3-example">
              {t("Example on a deal card")}
              {lang === "en" ? ": " : " : "}
              <span className="v3-skillchip" style={{ "--c": SKILL_COLOR.nego } as CSSProperties}>
                {t("{skill} Lv. {n}", { skill: t("Negotiation"), n: 3 })}
                {lang === "en" ? ": " : " : "}−10%
              </span>
            </p>
          </>
        )}
        <button type="button" className="v3-link" onClick={onBack}>
          ← {t("Menu")}
        </button>
      </div>
    </div>
  );
}

/** Affinity block for the friend sheet. */
export function FriendAffinity({ f, name, t }: { f: { likes: number; loyalty: number }; name: string; t: TFn }) {
  return (
    <div className="v3 v3-aff">
      <LevelBar label={t("Affinity with {name}", { name })} xp={affinityXp(f)} curve={CURVES.affinity} color="var(--coral)" t={t} />
      <p className="v3-acts">
        {(
          [
            ["Party", ["Happiness", "Social", "Charisma"]],
            ["Movies", ["Happiness", "Social"]],
            ["Mission", ["Intelligence", "Luck"]],
            ["Stocks", ["Luck", "Intelligence"]],
          ] as [string, string[]][]
        ).map(([k, sk]) => (
          <span key={k}>
            <b>{t(k)}</b> {sk.map((x) => t(x)).join(" · ")}
          </span>
        ))}
      </p>
    </div>
  );
}

