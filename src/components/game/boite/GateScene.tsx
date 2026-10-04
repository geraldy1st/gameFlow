/**
 * "The Gate opens!" — shown once when the active player's passive income first
 * exceeds expenses on Line 1. "Board the express" dispatches the engine ENTER
 * action; "One more lap" keeps playing on Line 1 (the board stays lit).
 */
import { useEffect, useRef } from "react";
import { nameOf, portraitOf, statement, type Player } from "@/game/engine";
import type { Lang } from "@/game/i18n";
import { expressionOf } from "@/game/speech";
import { fmtMoney } from "./format";
import { Ico } from "./icons";

type TFn = (text: string, vars?: Record<string, string | number>) => string;

export function CoinRain({ count = 34 }: { count?: number }) {
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: count }, (_, k) => (
        <i
          key={k}
          className={k % 3 === 0 ? "m" : ""}
          style={{ left: `${(k * 37) % 100}%`, animationDuration: `${2.4 + (k % 5) * 0.5}s`, animationDelay: `${(k * 0.37) % 2.2}s` }}
        >
          $
        </i>
      ))}
    </div>
  );
}

export function GateScene({ player, turn, t, lang, onBoard, onStay }: { player: Player; turn: number; t: TFn; lang: Lang; onBoard: () => void; onStay: () => void }) {
  const st = statement(player);
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);
  return (
    <div className="modal m-gate" role="dialog" aria-modal="true" aria-labelledby="gate-title" aria-describedby="gate-desc">
      <div className="gatecard">
        <div className="arch" aria-hidden="true">
          <div className="rays" />
          <svg viewBox="0 0 210 190" width="100%" height="100%" style={{ position: "relative" }}>
            <path d="M30 186V92a75 75 0 0 1 150 0v94z" fill="var(--gold)" stroke="var(--navy)" strokeWidth="6" />
            <path d="M54 186V96a51 51 0 0 1 102 0v90z" fill="var(--gold-tint)" stroke="var(--navy)" strokeWidth="5" />
            <path d="M54 186V96a51 51 0 0 1 20-40L96 70v116z" fill="var(--coral)" stroke="var(--navy)" strokeWidth="5" strokeLinejoin="round" />
            <circle cx="86" cy="130" r="5" fill="var(--navy)" />
            <path d="M105 186l26-110M120 186l40-90" stroke="var(--gold)" strokeWidth="8" opacity=".9" />
            <rect x="0" y="176" width="210" height="12" rx="6" fill="var(--navy)" />
            <g transform="translate(150 50)">
              <circle r="20" fill="var(--mint)" stroke="var(--navy)" strokeWidth="4" />
              <path d="M-8 1l6 6 11-12" fill="none" stroke="var(--navy)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </svg>
        </div>
        <p className="kicker">{t("Turn {turn} · Line 1 → Line 2", { turn })}</p>
        <h2 id="gate-title">{t("The Gate opens!")}</h2>
        <p id="gate-desc">{t("Your assets now pay for your whole month. The Freedom express is running: your salary is no longer required.")}</p>
        <div className="versus">
          <div className="p">
            <span className="label">{t("Passive income")}</span>
            <span className="num">{fmtMoney(lang, st.passive)}</span>
          </div>
          <span className="gt" aria-label={t("greater than")}>
            &gt;
          </span>
          <div className="e">
            <span className="label">{t("Expenses")}</span>
            <span className="num">{fmtMoney(lang, st.expenses)}</span>
          </div>
        </div>
        <svg className="express" viewBox="0 0 480 70" role="img" aria-label={t("Line 1 to the Gate to Line 2, now running")}>
          <path d="M20 35H200" stroke="var(--navy)" strokeWidth="14" strokeLinecap="round" />
          <path d="M20 35H200" stroke="var(--paper)" strokeWidth="2.5" strokeDasharray="10 9" />
          <path className="xglow" d="M280 35H462" stroke="var(--gold)" strokeWidth="34" strokeLinecap="round" opacity=".45" />
          <path d="M280 35H462" stroke="var(--navy)" strokeWidth="20" strokeLinecap="round" />
          <path d="M280 35H462" stroke="var(--gold)" strokeWidth="12" strokeLinecap="round" />
          <path className="xrun" d="M280 35H462" stroke="var(--paper)" strokeWidth="4" strokeDasharray="16 20" strokeLinecap="round" />
          <g transform="translate(240 35)">
            <rect x="-30" y="-25" width="60" height="60" rx="16" fill="var(--navy)" />
            <rect x="-30" y="-30" width="60" height="60" rx="16" fill="var(--gold)" stroke="var(--navy)" strokeWidth="4" />
            <use href="#i-door" x="-18" y="-18" width="36" height="36" style={{ color: "var(--navy)" }} />
          </g>
          <text x="22" y="66" className="xlab">
            {t("LINE 1 · GRIND")}
          </text>
          <text x="460" y="66" textAnchor="end" className="xlab">
            {t("LINE 2 · FREEDOM ✓")}
          </text>
        </svg>
        <div className="face">
          <img
            src={expressionOf(player, "proud")}
            alt={t("{name}, proud", { name: nameOf(player) })}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = portraitOf(player);
            }}
          />
        </div>
        <div className="choice">
          <button type="button" className="btn gold" ref={ref} onClick={onBoard}>
            <Ico name="door" />
            {t("Board the express")}
          </button>
          <button type="button" className="btn" onClick={onStay}>
            {t("One more lap")}
          </button>
        </div>
      </div>
    </div>
  );
}
