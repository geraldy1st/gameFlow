/**
 * Deal card: the offer (price, down payment, cash flow, loan) plus a live
 * "If you buy…" panel — cash, passive income, expenses and monthly flow before
 * → after, the Gate gauge preview and a profitability hint. Full-screen on
 * desktop, bottom sheet on mobile. Numbers come from the engine payload
 * (already priced: investor friend, outfit, boosts) and the deal definition.
 */
import { useEffect, useRef, type ReactNode } from "react";
import { BIG_DEALS, PREMIUM_DEALS, SMALL_DEALS, type DealDef } from "@/game/data";
import { statement, unlocked, type CardView, type Player } from "@/game/engine";
import type { Lang } from "@/game/i18n";
import { colon, fmtDec, fmtMoney, fmtNum } from "./format";
import { Gauge, gaugeMax } from "./Gauge";
import { Ico } from "./icons";
import { rich } from "./PlayerMat";

type TFn = (text: string, vars?: Record<string, string | number>) => string;

export function dealDef(id: string): DealDef | undefined {
  return [...SMALL_DEALS, ...BIG_DEALS, ...PREMIUM_DEALS].find((d) => d.id === id);
}

/** Pure before/after projection of taking a deal (mirrors engine takeDeal()). */
export function projectDeal(p: Player, deal: DealDef, down: number, cashFlow: number) {
  const st = statement(p);
  const passive = deal.passive ? st.passive + cashFlow : st.passive;
  const salary = deal.passive ? st.salary : st.salary + cashFlow;
  const expenses = st.expenses + deal.payment;
  return {
    before: { cash: p.cash, passive: st.passive, salary: st.salary, expenses: st.expenses, flow: st.cashFlow },
    after: { cash: p.cash - down, passive, salary, expenses, flow: salary + passive - expenses },
  };
}

function Delta({ label, tag, was, now, good, lang, signed = false }: { label: string; tag?: ReactNode; was: number; now: number; good: boolean; lang: Lang; signed?: boolean }) {
  const same = was === now;
  return (
    <div className="delta">
      <span>
        {label} {tag}
      </span>
      <span className={`was num ${same ? "same" : ""}`}>{fmtMoney(lang, was, signed)}</span>
      <span className="arr" aria-hidden="true">
        →
      </span>
      <span className={`num ${same ? "" : good ? "up" : "dn"}`}>{fmtMoney(lang, now, signed)}</span>
    </div>
  );
}

export function DealSheet({ card, player, t, lang, onChoose }: { card: CardView; player: Player; t: TFn; lang: Lang; onChoose: (id: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, [card.title]);
  if (card.payload.t !== "deal") return null;
  const payload = card.payload;
  const deal = dealDef(payload.dealId);
  if (!deal) return null;
  const { down, cashFlow } = payload;
  const { before, after } = projectDeal(player, deal, down, cashFlow);
  const principal = Math.max(0, deal.cost - down);
  const net = cashFlow - deal.payment;
  const max = gaugeMax(before.expenses, after.expenses, after.passive);
  const wasOpen = unlocked(player);
  const opens = player.track === "grind" && player.level < 2 && !wasOpen && after.passive > after.expenses;
  const gapAfter = after.expenses - after.passive;
  const big = payload.pool !== "small";
  const short = card.lines.find((l) => l.k === "You are short");
  const extras = card.lines.filter((l) => l.k === "Clothes" || l.k === "Investor friend");
  const tag = t(card.tag);

  let roi: ReactNode;
  if (net <= 0) {
    roi = rich(t("Careful: this costs {amount}/mo more than it brings in."), { amount: <b>{fmtMoney(lang, -net)}</b> });
  } else if (down <= 0) {
    roi = rich(t("No money down: {net}/mo from the first payday."), { net: <b>{fmtMoney(lang, net, true)}</b> });
  } else {
    const paydays = down / net;
    const yearly = Math.round(((net * 12) / down) * 100);
    const gain =
      deal.payment > 0
        ? rich(t("Net gain: {net}/mo ({flow} − {payment} loan)."), { net: <b>{fmtMoney(lang, net, true)}</b>, flow: fmtNum(lang, cashFlow), payment: fmtNum(lang, deal.payment) })
        : rich(t("Net gain: {net}/mo."), { net: <b>{fmtMoney(lang, net, true)}</b> });
    roi = (
      <>
        {gain}{" "}
        {rich(t("Your {down} down payment comes back in ≈ {n} paydays, a net return of {pct}%/yr."), {
          down: fmtMoney(lang, down),
          n: <b>{fmtDec(lang, paydays)}</b>,
          pct: <b>{fmtNum(lang, yearly)}</b>,
        })}
      </>
    );
  }

  return (
    <div className="modal m-deal" role="dialog" aria-modal="true" aria-labelledby="deal-title" aria-describedby="deal-impact">
      <div className="dealwrap" ref={ref} tabIndex={-1}>
        <article className={`card ${big ? "is-big" : ""} ${payload.pool === "premium" ? "is-premium" : ""}`}>
          <div className="hd">
            <b>
              <Ico name={big ? "up2" : "up"} />
              {tag}
            </b>
            <span className="pill">{deal.passive ? t("Asset") : t("Side income")}</span>
          </div>
          <div className="ill">
            <img src={card.art} alt="" />
          </div>
          <div className="bd">
            <h2 id="deal-title">{t(card.title)}</h2>
            <p className="story">{t(card.story)}</p>
            <div className="stats">
              <div className="stat">
                <span className="label">{t("Price")}</span>
                <span className="num">{fmtMoney(lang, deal.cost)}</span>
              </div>
              <div className="stat out">
                <span className="label">{deal.passive ? t("Down payment") : t("Cost")}</span>
                <span className="num">{fmtMoney(lang, -down)}</span>
              </div>
              <div className="stat in">
                <span className="label">{t("Flow / mo")}</span>
                <span className="num">{fmtMoney(lang, cashFlow, true)}</span>
              </div>
            </div>
            {deal.payment > 0 && (
              <div className="loan">
                <span>{t("Loan of {principal} · monthly payment", { principal: fmtMoney(lang, principal) })}</span>
                <span className="num">
                  {fmtMoney(lang, -deal.payment)}
                  {t("/mo")}
                </span>
              </div>
            )}
            {extras.length > 0 && (
              <ul className="mods">
                {extras.map((l) => (
                  <li key={l.k}>
                    {t(l.k)}{colon(lang)}<b>{t(l.v)}</b>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </article>
        <section className="impact" id="deal-impact" aria-label={t("If you buy…")}>
          <h3 className="impact-h">
            <span className="dot" />
            {t("If you buy…")}
          </h3>
          <Delta label={t("Cash")} was={before.cash} now={after.cash} good={after.cash >= before.cash} lang={lang} />
          {deal.passive ? (
            <Delta label={t("Passive income")} tag={<span className="tag g">{fmtNum(lang, cashFlow, true)}</span>} was={before.passive} now={after.passive} good lang={lang} />
          ) : (
            <Delta label={t("Salary & earned")} tag={<span className="tag g">{fmtNum(lang, cashFlow, true)}</span>} was={before.salary} now={after.salary} good lang={lang} />
          )}
          <Delta
            label={t("Expenses")}
            tag={deal.payment > 0 ? <span className="tag r">{t("+{amount} loan", { amount: fmtNum(lang, deal.payment) })}</span> : undefined}
            was={before.expenses}
            now={after.expenses}
            good={after.expenses <= before.expenses}
            lang={lang}
          />
          <Delta label={t("Monthly cash flow")} was={before.flow} now={after.flow} good={after.flow >= before.flow} lang={lang} signed />
          <Gauge passive={before.passive} after={after.passive} expenses={after.expenses} max={max} lang={lang} t={t} className="gauge-after" />
          {opens ? (
            <div className="opens">
              <Ico name="door" />
              <span>{t("Passive {passive} > expenses {expenses}: the Gate opens!", { passive: fmtMoney(lang, after.passive), expenses: fmtMoney(lang, after.expenses) })}</span>
            </div>
          ) : player.track === "grind" && player.level < 2 && !wasOpen && gapAfter > 0 ? (
            <p className="after-gap">{rich(t("After this: {amount} of passive income still to go."), { amount: <b>{fmtMoney(lang, gapAfter)}</b> })}</p>
          ) : null}
          <div className="roi">
            <Ico name="bulb" />
            <span>{roi}</span>
          </div>
          {short && (
            <p className="short" role="note">
              {t("You are short")}{colon(lang)}<b>{fmtMoney(lang, down - player.cash)}</b>
            </p>
          )}
          <div className="choice">
            {card.choices.map((c) => (
              <button key={c.id + c.label} type="button" className={`btn ${c.tone === "gold" ? "gold" : c.tone === "rose" ? "rose" : ""}`} onClick={() => onChoose(c.id)}>
                {c.id === "accept" ? (
                  <>
                    <Ico name="coin" />
                    {deal.passive ? t("Buy") : t("Take it")} <span className="num">{fmtMoney(lang, down)}</span>
                  </>
                ) : c.id === "decline" ? (
                  t("Pass")
                ) : (
                  t(c.label)
                )}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
