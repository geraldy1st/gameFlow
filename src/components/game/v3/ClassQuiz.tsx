/**
 * GameFlow v3 — « Quiz en classe », two painted shots (port of the mockup's v3/quiz.js):
 * 1. intro / end: Kyoko M. at the board (slow Ken Burns, cut with reduced motion);
 * 2. questions: over-the-shoulder notebook; the chosen keyword is handwritten, ticked or struck out + corrected.
 * The cash goes through the engine (QUIZ action) when the player leaves the end screen.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { CLASS_QUESTIONS, CREATIVE_QUESTION, LESSON } from "@/game/class-quiz";
import { SKILL_NAMES, quizCash, quizXpBonus, rewardPoints, type SkillId } from "@/game/skills";
import { SKILL_INFO } from "@/game/skills-info";
import { creativeOpen } from "@/game/engine";
import { Ico } from "../boite/icons";
import { CLASS_QUIZ } from "@/game/tuning";
import type { Player } from "@/game/engine";
import type { Lang } from "@/game/i18n";
import { fmtMoney } from "../boite/format";

type TFn = (text: string, vars?: Record<string, string | number>) => string;
type Shot = "intro" | "q" | "bonus" | "end";

const IW = 1280;
const IH = 720;
const POS = { t: { m: [0.45, 0.5], d: [0.45, 0.4] }, n: { m: [0.55, 0.7], d: [0.55, 0.7] } } as const;
const L = "ABCD";
const BASE = `${import.meta.env.BASE_URL ?? "/"}game/quiz/`.replace(/\/\/+/g, "/");

function Pic({ name }: { name: string }) {
  return (
    <picture>
      <source type="image/webp" srcSet={`${BASE}${name}-768.webp 768w, ${BASE}${name}-1280.webp 1280w`} sizes="100vw" />
      <img src={`${BASE}${name}-1280.webp`} alt="" draggable={false} />
    </picture>
  );
}

/** Shuffles the answers once per quiz (keeps the right index). */
function shuffled(seed: number) {
  return CLASS_QUESTIONS.map((q, qi) => {
    const order = [0, 1, 2, 3];
    let s = (seed + qi * 7919) >>> 0;
    for (let i = 3; i > 0; i--) {
      s = (Math.imul(s, 1103515245) + 12345) >>> 0;
      const j = s % (i + 1);
      [order[i], order[j]] = [order[j]!, order[i]!];
    }
    return { q, order, answer: order.indexOf(q.answer) };
  });
}

export function ClassQuiz({ player, lang, t, onFinish, onClose }: { player: Player; lang: Lang; t: TFn; onFinish: (correct: number, creative: number) => void; onClose: () => void }) {
  const [shot, setShot] = useState<Shot>("intro");
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [left, setLeft] = useState<number>(CLASS_QUIZ.seconds);
  const qs = useMemo(() => shuffled(Date.now() & 0xffff), []);
  const stage = useRef<HTMLDivElement>(null);
  const [frames, setFrames] = useState<{ t: CSSProperties; n: CSSProperties }>({ t: {}, n: {} });
  const root = useRef<HTMLElement>(null);
  const teacher = CLASS_QUIZ.teacherLabel;
  // Geraldy (11/10): 5/5 → 500 $, 1 to 4 → 250 $, 0 → nothing (no cash, no skill points).
  const [cpick, setCpick] = useState<number | null>(null);
  const grade = cpick === null ? 0 : CREATIVE_QUESTION.grade[cpick]!;
  const bonusCash = score > 0 ? (grade === 2 ? CLASS_QUIZ.creativeBest : grade === 1 ? CLASS_QUIZ.creativeOk : 0) : 0;
  const reward = quizCash(score, qs.length) + bonusCash;
  const gains = score > 0 ? rewardPoints("quiz.complete", 1 + quizXpBonus(player)) : {};
  if (score > 0 && grade > 0) gains.creativity = (gains.creativity ?? 0) + CLASS_QUIZ.creativeXp;

  // object-fit: cover by hand, so the hand layer and the handwriting stay glued to the painting.
  useLayoutEffect(() => {
    const el = stage.current;
    if (!el) return;
    const layout = () => {
      const cw = el.clientWidth;
      const ch = el.clientHeight;
      if (!cw) return;
      const mode = window.innerWidth >= 900 ? "d" : "m";
      const s = Math.max(cw / IW, ch / IH);
      const w = IW * s;
      const h = IH * s;
      const at = (k: "t" | "n"): CSSProperties => {
        const [px, py] = POS[k][mode];
        return { width: w, height: h, left: (cw - w) * px, top: (ch - h) * py };
      };
      setFrames({ t: at("t"), n: at("n") });
    };
    layout();
    const ro = new ResizeObserver(layout);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const answer = useCallback(
    (k: number) => {
      if (shot !== "q" || picked !== null) return;
      setPicked(k);
      if (k === qs[i]!.answer) setScore((n) => n + 1);
    },
    [shot, picked, qs, i],
  );

  useEffect(() => {
    if (shot !== "q" || picked !== null) return;
    const id = setInterval(() => setLeft((x) => Math.max(0, x - 0.1)), 100);
    return () => clearInterval(id);
  }, [shot, picked, i]);
  useEffect(() => {
    if (shot === "q" && picked === null && left <= 0) answer(-1);
  }, [left, shot, picked, answer]);

  useEffect(() => {
    const first = root.current?.querySelector<HTMLButtonElement>(shot === "q" ? (picked === null ? ".cq-ans" : "#cq-next") : shot === "bonus" ? (cpick === null ? ".cq-ans" : "#cq-next") : shot === "intro" ? "#cq-start" : "#cq-done");
    first?.focus({ preventScroll: true });
  }, [shot, i, picked, cpick]);

  const next = () => {
    if (picked === null) return;
    if (i + 1 >= qs.length) setShot(score > 0 && creativeOpen(player) ? "bonus" : "end");
    else {
      setI(i + 1);
      setPicked(null);
      setLeft(CLASS_QUIZ.seconds);
    }
  };
  const done = () => {
    onFinish(score, grade);
  };

  const cur = qs[i]!;
  const ok = picked !== null && picked === cur.answer;
  const kw = (k: number) => cur.q.kw[lang][cur.order[k]!]!;
  const W = 9.6;
  const colon = lang === "en" ? ": " : " : ";
  return (
    <section
      className="v3 cq"
      data-shot={shot}
      role="dialog"
      aria-modal="true"
      aria-label={t("Class quiz")}
      ref={root}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="cq-stage" ref={stage} aria-hidden="true">
        <div className="cq-shot t">
          <div className="cq-frame" style={frames.t}>
            <Pic name="quiz-teacher" />
          </div>
        </div>
        <div className="cq-shot n">
          <div className="cq-frame" style={frames.n}>
            <Pic name="quiz-notebook" />
            <div className="cq-hand">
              <Pic name="quiz-notebook" />
            </div>
            <svg className="cq-ink" viewBox={`0 0 ${IW} ${IH}`}>
              {shot === "q" && picked !== null && (
                <g transform="rotate(-11 664 626)" key={`${i}-${picked}`}>
                  {picked >= 0 && (
                    <>
                      <text className={`w ${ok ? "ok" : "ko"}`} x={664} y={626}>
                        {kw(picked)}
                      </text>
                      {ok ? (
                        <path className="tick" d={`M${672 + kw(picked).length * W} 612 l7 9 l14 -20`} />
                      ) : (
                        <path className="strike" d={`M660 618 L${668 + kw(picked).length * W} 616`} />
                      )}
                    </>
                  )}
                  {!ok && (
                    <text className="w fix" x={picked >= 0 ? 718 : 664} y={picked >= 0 ? 572 : 626} style={{ animationDelay: picked >= 0 ? "1250ms" : "0ms" }}>
                      {picked >= 0 ? cur.q.fix[lang] : kw(cur.answer)}
                    </text>
                  )}
                </g>
              )}
            </svg>
          </div>
        </div>
      </div>
      <div className="cq-ui">
        <div className="cq-top">
          <h2>{t("Class quiz")}</h2>
          <span className="cq-score">{t("Score {n} / {m}", { n: score, m: qs.length })}</span>
          <button type="button" className="v3-x" onClick={shot === "end" ? done : onClose} aria-label={t("Leave the quiz")}>
            ✕
          </button>
        </div>
        {shot === "q" && (
          <div className="cq-card">
            <div className="cq-meta">
              <span>{t("Question {n} / {m}", { n: i + 1, m: qs.length })}</span>
              <div className={`cq-timer ${left <= 5 ? "low" : ""}`} role="timer" aria-label={t("Time left")}>
                <i style={{ width: `${(left / CLASS_QUIZ.seconds) * 100}%` }} />
              </div>
              <span>{Math.ceil(left)} s</span>
            </div>
            <h3>{cur.q.q[lang]}</h3>
            <div className="cq-answers">
              {cur.order.map((orig, k) => (
                <button
                  key={k}
                  type="button"
                  className={`cq-ans ${picked !== null && k === cur.answer ? "good" : ""} ${picked === k && k !== cur.answer ? "bad" : ""}`}
                  disabled={picked !== null}
                  onClick={() => answer(k)}
                >
                  <i>{L[k]}</i>
                  {cur.q.choices[lang][orig]}
                </button>
              ))}
            </div>
            <button type="button" id="cq-next" className="v3-btn gold" disabled={picked === null} onClick={next}>
              {picked === null ? t("Answer to continue") : i < qs.length - 1 ? t("Next question →") : t("See the result →")}
            </button>
          </div>
        )}
        {shot === "q" && picked !== null && (
          <div className={`cq-fb ${ok ? "ok" : "ko"}`} role="status">
            <picture>
              <source type="image/webp" srcSet={`${BASE}quiz-teacher-face.webp`} />
              <img src={`${BASE}quiz-teacher-face.webp`} alt="" />
            </picture>
            <p>
              <i className="spk">{teacher}</i>
              <b>{ok ? t("Exactly!") : picked < 0 ? t("Time is up.") : t("Not quite.")}</b> {cur.q.why[lang]}
              <span>{cur.q.board[lang]}</span>
            </p>
          </div>
        )}
        {shot === "bonus" && (
          <div className="cq-card">
            <div className="cq-meta">
              <span>{t("Creative bonus")}</span>
            </div>
            <h3>{CREATIVE_QUESTION.q[lang]}</h3>
            <div className="cq-answers">
              {CREATIVE_QUESTION.choices[lang].map((c, k) => (
                <button key={k} type="button" className={`cq-ans ${cpick === k ? "good" : ""}`} disabled={cpick !== null} onClick={() => setCpick(k)}>
                  <i>{L[k]}</i>
                  {c}
                </button>
              ))}
            </div>
            <button type="button" id="cq-next" className="v3-btn gold" disabled={cpick === null} onClick={() => setShot("end")}>
              {cpick === null ? t("Answer to continue") : t("See the result →")}
            </button>
          </div>
        )}
        {shot === "bonus" && cpick !== null && (
          <div className="cq-fb ok" role="status">
            <img src={`${BASE}quiz-teacher-face.webp`} alt="" />
            <p>
              <i className="spk">{teacher}</i>
              <b>{grade === 2 ? t("Brilliant!") : t("That works.")}</b> {CREATIVE_QUESTION.why[lang]}
              <span>{t("+{amount} and +{xp} Creativity XP", { amount: fmtMoney(lang, grade === 2 ? CLASS_QUIZ.creativeBest : CLASS_QUIZ.creativeOk), xp: CLASS_QUIZ.creativeXp })}</span>
            </p>
          </div>
        )}
        {(shot === "intro" || shot === "end") && (
          <div className="cq-name">
            <b>{CLASS_QUIZ.teacherName}</b>
            <small>{t("Economics teacher")}</small>
          </div>
        )}
        {shot === "intro" && (
          <div className="cq-say">
            <p className="who">
              {teacher} · {t("at the board")}
            </p>
            <h3>{LESSON.title[lang]}</h3>
            <p>{LESSON.text[lang]}</p>
            <ol className="plan">
              {LESSON.plan[lang].map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ol>
            <div className="row">
              <small>{t("{n} questions · {s} s each · {perfect} with no mistakes, otherwise {partial}", { n: qs.length, s: CLASS_QUIZ.seconds, perfect: fmtMoney(lang, CLASS_QUIZ.perfectReward), partial: fmtMoney(lang, CLASS_QUIZ.partialReward) })}</small>
              <button type="button" id="cq-start" className="v3-btn gold" onClick={() => setShot("q")}>
                {t("Start")}
              </button>
            </div>
          </div>
        )}
        {shot === "end" && (
          <div className="cq-say">
            <p className="who">
              {teacher} · {t("end of the lesson")}
            </p>
            <h3>{score === qs.length ? t("No mistakes!") : score >= 3 ? t("Well played") : t("We review and come back")}</h3>
            <p>{score === qs.length ? t("Cash flow first, the rest follows.") : score >= 3 ? t("Read your notes tonight and you will get it all.") : t("We go over the board tonight, and tomorrow will be better.")}</p>
            <div className="res">
              <span className="big">
                {score} / {qs.length}
              </span>
              <span className="reward">{fmtMoney(lang, reward, true)}</span>
            </div>
            {score > 0 ? (
              <div className="cq-xp" aria-label={t("Skill points earned")}>
                {SKILL_INFO.filter((k) => (gains[k.id as SkillId] ?? 0) > 0).map((k) => (
                  <span key={k.id} className="cq-xpc" style={{ "--c": k.color } as CSSProperties}>
                    <Ico name={k.icon} />
                    {t(SKILL_NAMES[k.id as SkillId])}
                    <b>+{gains[k.id as SkillId]}</b>
                  </span>
                ))}
              </div>
            ) : (
              <small className="note">{t("No answer right: no cash and no skill points this time.")}</small>
            )}
            <small className="note">
              {t("The gain goes into your cash")}
              {colon}
              <span className="sig">— {CLASS_QUIZ.teacherName}</span>
            </small>
            <button type="button" id="cq-done" className="v3-btn gold" onClick={done}>
              {t("Back to activities")}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
