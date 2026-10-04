/**
 * Menu + character select in one screen ("Choose a life"): mode chips,
 * 4-portrait grid (locked faces open the finance quiz), the picked face's
 * story and the 3-step how-to, the box-lid board, dreams and the start row.
 * Two players pick one after the other (same flow as the old Setup).
 */
import { useState } from "react";
import { CHARACTERS, DREAMS } from "@/game/data";
import { customPortrait, type CustomLook, type GameState, type Pick } from "@/game/engine";
import type { Lang } from "@/game/i18n";
import { colon, fmtMoney } from "./format";
import { Ico } from "./icons";
import { MetroBoard } from "./MetroBoard";

type TFn = (text: string, vars?: Record<string, string | number>) => string;

const HAIR = ["black", "brown", "blonde", "auburn"] as const;
const SKIN = ["fair", "warm", "deep"] as const;
const SEX = [
  { id: "f", label: "Woman" },
  { id: "m", label: "Man" },
  { id: "x", label: "Another" },
] as const;
const blankLook = (): CustomLook => ({ name: "", age: 24, sex: "f", hair: "black", skin: "fair", bio: "" });

type Draft = { characterId?: string; dreamId?: string; custom?: CustomLook | null };

export function MenuScreen({
  state,
  t,
  lang,
  unlocked,
  canCreate,
  hasSave,
  onContinue,
  onStart,
  onQuiz,
  onBio,
}: {
  state: GameState;
  t: TFn;
  lang: Lang;
  unlocked: string[];
  canCreate: boolean;
  hasSave: boolean;
  onContinue: () => void;
  onStart: (picks: Pick[]) => void;
  onQuiz: () => void;
  onBio: (id: string) => void;
}) {
  const [count, setCount] = useState<1 | 2>(1);
  const [step, setStep] = useState(0);
  const [picks, setPicks] = useState<Draft[]>([{ characterId: "aoi", dreamId: DREAMS[0]?.id }, {}]);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<CustomLook>(blankLook);
  const current = picks[step] ?? {};
  const taken = new Set(
    picks
      .slice(0, count)
      .filter((_, i) => i !== step)
      .map((p) => p.characterId)
      .filter((id): id is string => !!id && id !== "custom"),
  );
  const ready = Boolean(current.dreamId && (current.characterId === "custom" ? current.custom?.name : current.characterId && unlocked.includes(current.characterId) && !taken.has(current.characterId)));
  const setPick = (patch: Draft) => setPicks((prev) => prev.map((p, i) => (i === step ? { ...p, ...patch } : p)));
  const useFace = () => {
    const name = draft.name.trim();
    if (!name) return;
    const age = Math.min(80, Math.max(18, Math.round(Number(draft.age) || 18)));
    const look: CustomLook = { ...draft, name, age, bio: draft.bio.trim().slice(0, 600) };
    setDraft(look);
    setPick({ characterId: "custom", custom: look });
    setCreating(false);
  };
  const start = () => {
    const used = picks.slice(0, count);
    if (!used.every((p) => p.dreamId && (p.characterId === "custom" ? p.custom?.name : p.characterId))) return;
    onStart(
      used.map((p) => ({
        characterId: p.characterId === "custom" ? "custom" : p.characterId!,
        dreamId: p.dreamId!,
        custom: p.characterId === "custom" ? (p.custom ?? null) : null,
      })),
    );
  };
  const shown = CHARACTERS.find((c) => c.id === current.characterId);
  const c2 = colon(lang);
  const twoFirst = count === 2 && step === 0;

  return (
    <main className="screen s-menu">
      <div className="menu-main">
        <div className="hero">
          <p className="kick">{count === 2 ? (step === 0 ? t("Player one") : t("Player two")) : t("Original manga board · 1 or 2 players")}</p>
          <h2>{t("Choose a life")}</h2>
          <p>{t("Ride Line 1 until your assets pay the month. When your passive income beats your expenses, the Gate opens onto the Freedom express.")}</p>
          <div className="modes" role="group" aria-label={t("Players")}>
            <button type="button" className={`chipbtn ${count === 1 ? "is-on" : ""}`} aria-pressed={count === 1} onClick={() => { setCount(1); setStep(0); }}>
              {t("1 player")}
            </button>
            <button type="button" className={`chipbtn ${count === 2 ? "is-on" : ""}`} aria-pressed={count === 2} onClick={() => setCount(2)}>
              {t("2 players · same screen")}
            </button>
            <button type="button" className="chipbtn" onClick={onQuiz}>
              <Ico name="cap" />
              {t("Finance quiz")}
            </button>
            <button
              type="button"
              className={`chipbtn ${creating || current.characterId === "custom" ? "is-on" : ""}`}
              aria-pressed={creating}
              disabled={!canCreate}
              title={canCreate ? undefined : t("Reach $1,000,000 cash to create a character.")}
              onClick={() => {
                if (!canCreate) return;
                if (current.custom) setDraft(current.custom);
                setCreating((v) => !v);
              }}
            >
              {canCreate ? <Ico name="star" /> : <Ico name="lock" />}
              {t("Create your own")}
            </button>
          </div>
        </div>

        <div className="chars" role="radiogroup" aria-label={t("Character")}>
          {CHARACTERS.map((c) => {
            const open = unlocked.includes(c.id);
            const on = current.characterId === c.id;
            const busy = taken.has(c.id);
            return (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={on}
                aria-disabled={busy || undefined}
                className={`char ${on ? "on" : ""} ${open ? "" : "locked"}`}
                onClick={() => {
                  if (!open) {
                    onQuiz();
                    return;
                  }
                  if (busy) return;
                  setCreating(false);
                  setPick({ characterId: c.id, custom: null });
                }}
              >
                <div className="pic">
                  <img src={c.portrait} alt="" />
                </div>
                {!open && (
                  <span className="lock">
                    <Ico name="lock" />
                    {t("Pass a quiz")}
                  </span>
                )}
                <strong>{c.name}</strong>
                <span>{open ? (busy ? t("Player one") : t(c.title)) : t("Locked")}</span>
              </button>
            );
          })}
          {current.custom && (
            <button type="button" role="radio" aria-checked={current.characterId === "custom"} className={`char ${current.characterId === "custom" ? "on" : ""}`} onClick={() => setPick({ characterId: "custom" })}>
              <div className="pic">
                <img src={customPortrait(current.custom)} alt="" />
              </div>
              <strong>{current.custom.name}</strong>
              <span>{current.custom.age}</span>
            </button>
          )}
        </div>

        {creating && canCreate && (
          <div className="box creator">
            <img src={customPortrait(draft)} alt="" />
            <div>
              <p className="kicker">{t("Your character")}</p>
              <label className="field">
                {t("Name")}
                <input value={draft.name} maxLength={28} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </label>
              <label className="field">
                {t("Age")}
                <input type="number" min={18} max={80} value={draft.age} onChange={(e) => setDraft({ ...draft, age: Number(e.target.value) })} />
              </label>
              <div className="field">
                {t("Sex")}
                <div className="chip-row">
                  {SEX.map((s) => (
                    <button key={s.id} type="button" className={`btn ${draft.sex === s.id ? "btn-gold" : "btn-ghost"}`} aria-pressed={draft.sex === s.id} onClick={() => setDraft({ ...draft, sex: s.id })}>
                      {t(s.label)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                {t("Hair color")}
                <div className="chip-row">
                  {HAIR.map((h) => (
                    <button key={h} type="button" className={`btn ${draft.hair === h ? "btn-gold" : "btn-ghost"}`} aria-pressed={draft.hair === h} onClick={() => setDraft({ ...draft, hair: h })}>
                      {t(h === "black" ? "Black" : h === "brown" ? "Brown" : h === "blonde" ? "Blonde" : "Auburn")}
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                {t("Skin color")}
                <div className="chip-row">
                  {SKIN.map((s) => (
                    <button key={s} type="button" className={`btn ${draft.skin === s ? "btn-gold" : "btn-ghost"}`} aria-pressed={draft.skin === s} onClick={() => setDraft({ ...draft, skin: s })}>
                      {t(s === "fair" ? "Fair" : s === "warm" ? "Warm" : "Deep")}
                    </button>
                  ))}
                </div>
              </div>
              <label className="field">
                {t("Short biography")}
                <textarea rows={4} maxLength={600} placeholder={t("Write a few lines they would recognize.")} value={draft.bio} onChange={(e) => setDraft({ ...draft, bio: e.target.value })} />
              </label>
              <p className="muted">{t("Manga likeness. The portrait stays a young adult; age lives in the biography.")}</p>
              <button type="button" className="btn btn-gold" disabled={!draft.name.trim()} onClick={useFace}>
                {t("Use this face")}
              </button>
            </div>
          </div>
        )}

        <div className="box howto">
          <div className="bio">
            {shown ? (
              <>
                <b>
                  {shown.name} · {t(shown.title)}
                </b>
                <p>
                  <strong>{t("From")}{c2}</strong>
                  {t(shown.from)}
                </p>
                <p>
                  <strong>{t("Wants")}{c2}</strong>
                  {t(shown.wants)}
                </p>
                <p>{t(shown.blurb)}</p>
                <button type="button" className="linkish" onClick={() => onBio(shown.id)}>
                  {t("Read their story")}
                </button>
              </>
            ) : current.custom ? (
              <>
                <b>{current.custom.name}</b>
                <p>{current.custom.bio || t("Write a few lines they would recognize.")}</p>
              </>
            ) : null}
          </div>
          <div className="steps">
            <div className="step">
              <i className="s1">1</i>
              <span>
                <b>{t("Line 1 · The Grind")}</b>
                {t("Buy assets: every deal adds passive income.")}
              </span>
            </div>
            <div className="step">
              <i className="s2">
                <Ico name="door" />
              </i>
              <span>
                <b>{t("The Gate")}</b>
                {t("When passive > expenses, it opens.")}
              </span>
            </div>
            <div className="step">
              <i className="s3">
                <Ico name="star" />
              </i>
              <span>
                <b>{t("Line 2 · Freedom")}</b>
                {t("Buy your dream, or aim for {goal}/mo of passive income.", { goal: fmtMoney(lang, 50000) })}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="menu-side">
        <div className="boxlid d-only">
          <MetroBoard state={state} t={t} lang={lang} lid />
          <div className="title">{t("Two lines. One Gate.")}</div>
        </div>
        <div className="box dreambox">
          <h3 className="h3">
            <span className="dot" style={{ background: "var(--gold)" }} />
            {t("Your dream")}
            <span className="r">{t("bought on Line 2")}</span>
          </h3>
          <div className="dreams" role="radiogroup" aria-label={t("Dream")}>
            {DREAMS.map((d) => (
              <button key={d.id} type="button" role="radio" aria-checked={current.dreamId === d.id} className={`dream ${current.dreamId === d.id ? "on" : ""}`} onClick={() => setPick({ dreamId: d.id })}>
                <img src={d.art} alt="" />
                <div>
                  <strong>{t(d.name)}</strong>
                  <p>{t(d.blurb)}</p>
                  <span className="cost num">
                    <Ico name="coin" />
                    {fmtMoney(lang, d.cost)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="startrow">
          {step === 1 ? (
            <button type="button" className="btn" onClick={() => setStep(0)}>
              {t("Back")}
            </button>
          ) : (
            <button type="button" className="btn" disabled={!hasSave} onClick={onContinue}>
              {t("Continue")}
            </button>
          )}
          {twoFirst ? (
            <button
              type="button"
              className="btn gold"
              disabled={!ready}
              onClick={() => {
                setCreating(false);
                setStep(1);
                setDraft(picks[1]?.custom ?? blankLook());
                setPicks((prev) => prev.map((p, i) => (i === 1 && !p.dreamId ? { ...p, dreamId: DREAMS[1]?.id } : p)));
              }}
            >
              {t("Player two")}
              <span className="d-only">&nbsp;→</span>
            </button>
          ) : (
            <button type="button" className="btn gold" disabled={!ready} onClick={start}>
              {t("Deal careers")}
              <span className="d-only">&nbsp;→</span>
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
