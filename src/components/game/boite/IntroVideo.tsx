/**
 * Intro video. The videos are plain files in public/intro/ — swap them, no code change:
 *   intro-landscape.mp4 (wide screens, e.g. 1920x1080), intro-portrait.mp4 (phones, e.g. 1080x1920),
 *   intro.mp4 (fallback for both) and poster.jpg (first frame; shown under reduced motion).
 * The first variant that exists wins. The desktop frame follows the real video ratio.
 * Overlay text is HTML, translated through the game's i18n. Tap advances; Skip / Escape follow SKIP_TO.
 * Reduced motion: no autoplay, the poster is shown and the text fades in.
 * If no video (or poster) exists, or it cannot be decoded, the caller falls back to the illustrated slides.
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Lang } from "@/game/i18n";
import { Ico } from "./icons";
import { useReducedMotion } from "./hooks";

type TFn = (text: string, vars?: Record<string, string | number>) => string;

/** Designer's choice: Skip / Escape jump to the end card ("end") or straight into the game ("game"). */
export const SKIP_TO: "end" | "game" = "end";
/** Beat length in ms (normal / reduced motion), per the intro spec. */
const BEAT_MS = 2800;
const BEAT_MS_REDUCED = 3400;
/** Word stagger (ms) for the spring rise. */
const WORD_STAGGER = 42;

const BASE = import.meta.env.BASE_URL.endsWith("/") ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
export const INTRO_FILES = {
  landscape: `${BASE}intro/intro-landscape.mp4`,
  portrait: `${BASE}intro/intro-portrait.mp4`,
  fallback: `${BASE}intro/intro.mp4`,
  poster: `${BASE}intro/poster.jpg`,
};

/** English source (cut from the intro slides); *word* = gold highlight. Translations live in i18n-ui.ts. */
export const INTRO_BEATS = [
  { kicker: "Tokyo · 1/4", text: "Knowing how to *count* matters as much as knowing how to *work*." },
  { kicker: "Tokyo · 2/4", text: "Money *comes in*, money *goes out*, and no one does it for you." },
  { kicker: "Tokyo · 3/4", text: "School is over. The *diploma* is in the bag." },
  { kicker: "Tokyo · 4/4", text: "Ahead: a *first salary*, a *rent*, and a city that will not wait." },
] as const;
const INTRO_END = "Choose a life. The month begins.";

export type IntroPick = { kind: "video" | "poster"; src: string };

/** Static (Pages) builds list the files of public/intro at build time; elsewhere (dev) we probe. */
const SHIPPED: string[] | null = typeof import.meta.env.VITE_INTRO_FILES === "string" ? String(import.meta.env.VITE_INTRO_FILES).split(",") : null;

async function exists(url: string, kind: "video" | "image"): Promise<boolean> {
  if (SHIPPED && !SHIPPED.includes(url.split("/").pop() ?? "")) return false;
  try {
    const res = await fetch(url, { method: "HEAD", cache: "no-store" });
    // dev servers answer unknown paths with the SPA page (200 text/html): reject HTML.
    // Some static hosts send application/octet-stream for media, so accept that too.
    const type = (res.headers.get("content-type") ?? "").toLowerCase();
    return res.ok && (type.startsWith(`${kind}/`) || type.startsWith("application/octet-stream"));
  } catch {
    return false;
  }
}

/** Resolves what the intro can show: the best video for this screen, the poster (reduced motion), or null. */
export async function probeIntro(reduced: boolean): Promise<IntroPick | null> {
  if (reduced) return (await exists(INTRO_FILES.poster, "image")) ? { kind: "poster", src: INTRO_FILES.poster } : null;
  // No H.264 decoder (e.g. some Chromium builds): don't pick a video we can't play — the slides take over.
  if (typeof document !== "undefined" && !document.createElement("video").canPlayType('video/mp4; codecs="avc1.42E01E"')) return null;
  const wide = typeof window !== "undefined" && window.matchMedia("(min-width: 760px) and (orientation: landscape)").matches;
  for (const src of [wide ? INTRO_FILES.landscape : INTRO_FILES.portrait, INTRO_FILES.fallback]) {
    if (await exists(src, "video")) return { kind: "video", src };
  }
  return null;
}

function Words({ text, base = 0 }: { text: string; base?: number }) {
  let n = base;
  return (
    <>
      {text
        .split(/(\*[^*]+\*)/)
        .filter(Boolean)
        .flatMap((chunk, ci) => {
          const key = chunk.startsWith("*");
          return chunk
            .replace(/\*/g, "")
            .split(/(?<=\s)/)
            .filter((w) => w.length)
            .map((w, wi) => {
              const word = w.trimEnd();
              const space = w.length > word.length;
              const i = n++;
              return (
                <span key={`${ci}-${wi}`}>
                  <span className={`w ${key ? "k" : ""}`} style={{ animationDelay: `${90 + i * WORD_STAGGER}ms` }}>
                    {word}
                  </span>
                  {space ? " " : ""}
                </span>
              );
            });
        })}
    </>
  );
}

/** `onFail`: the video can't be played (codec, network) — the caller shows the slide intro instead, without marking it seen. */
export function IntroVideo({ pick, lang, t, onLang, onDone, onFail }: { pick: IntroPick; lang: Lang; t: TFn; onLang: (l: Lang) => void; onDone: () => void; onFail?: () => void }) {
  const mode = pick.kind;
  const [ar, setAr] = useState<string | null>(null);
  const reduced = useReducedMotion();
  const [beat, setBeat] = useState(0);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playRef = useRef<HTMLButtonElement>(null);
  const n = INTRO_BEATS.length;
  const ended = beat >= n;
  const next = () => setBeat((b) => Math.min(n, b + 1));
  const toEnd = () => setBeat(n);
  const skip = () => (SKIP_TO === "game" ? onDone() : toEnd());

  useEffect(() => {
    if (ended) {
      const id = window.setTimeout(() => playRef.current?.focus({ preventScroll: true }), reduced ? 0 : 700);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(next, reduced ? BEAT_MS_REDUCED : BEAT_MS);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat, ended, reduced]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (ended) onDone();
        else skip();
      } else if ((e.key === " " || e.key === "Enter" || e.key === "ArrowRight") && !(e.target instanceof HTMLElement && e.target.closest("button"))) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (ended) onDone();
        else next();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ended, onDone]);

  // React sets `muted` as a property only: make sure autoplay (which needs muted) actually starts
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.play().catch(() => undefined);
  }, []);

  const toggleSound = () => {
    const v = videoRef.current;
    const m = !muted;
    setMuted(m);
    if (v) {
      v.muted = m;
      if (!m && v.paused) v.play().catch(() => undefined);
    }
  };
  const b = INTRO_BEATS[Math.min(beat, n - 1)]!;

  return (
    <div className={`intro-v ${ended ? "ended" : ""}`} style={ar ? ({ "--ar": ar } as CSSProperties) : undefined} role="dialog" aria-modal="true" aria-label={t("Introduction")} onClick={(e) => !(e.target as HTMLElement).closest("button") && next()}>
      {mode === "video" ? (
        <video className="bgv" src={pick.src} poster={INTRO_FILES.poster} muted autoPlay loop playsInline aria-hidden="true" tabIndex={-1} />
      ) : (
        <img className="bgv" src={pick.src} alt="" aria-hidden="true" />
      )}
      <div className="frame">
        <div className="screen">
          {mode === "video" ? (
            <video
              ref={videoRef}
              className="mainv"
              src={pick.src}
              poster={INTRO_FILES.poster}
              muted={muted}
              autoPlay
              loop
              playsInline
              preload="auto"
              aria-hidden="true"
              onLoadedMetadata={(e) => {
                const v = e.currentTarget;
                if (v.videoWidth && v.videoHeight) setAr(`${v.videoWidth} / ${v.videoHeight}`);
              }}
              onError={onFail ?? onDone}
            />
          ) : (
            <img
              className="mainv"
              src={pick.src}
              alt=""
              onLoad={(e) => {
                const i = e.currentTarget;
                if (i.naturalWidth && i.naturalHeight) setAr(`${i.naturalWidth} / ${i.naturalHeight}`);
              }}
            />
          )}
          <div className="scrim" />
        </div>
        <div className="cap" aria-live="polite">
          <div className="cap-in" key={beat}>
            {!ended ? (
              <div>
                <span className="kicker">
                  <i />
                  {t(b.kicker)}
                </span>
                <p className="line">
                  <Words text={t(b.text)} />
                </p>
                <div className="dots" aria-hidden="true">
                  {INTRO_BEATS.map((_, j) => (
                    <b key={j} className={j <= beat ? "on" : ""} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="endc">
                <div className="logo">
                  <svg className="mark" viewBox="0 0 32 32" aria-hidden="true">
                    <rect x="1" y="1" width="30" height="30" rx="8" fill="#1B2A41" />
                    <circle cx="16" cy="16" r="10.2" fill="none" stroke="#FFC745" strokeWidth="2.6" />
                    <circle cx="16" cy="16" r="5.2" fill="none" stroke="#FFF6E5" strokeWidth="2" />
                    <circle cx="23.4" cy="10.6" r="2.8" fill="#FF8A73" stroke="#1B2A41" strokeWidth="1" />
                  </svg>
                  <div className="word">
                    game<span>Flow</span>
                  </div>
                </div>
                <p className="tag">
                  <Words text={t(INTRO_END)} />
                </p>
                <button type="button" className="play" ref={playRef} onClick={onDone}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 4.5l13 7.5-13 7.5z" fill="currentColor" />
                  </svg>
                  {t("Play")}
                </button>
              </div>
            )}
          </div>
        </div>
        <p className="hint">{t("Tap to continue")}</p>
      </div>
      <div className="top">
        <div className="langs" role="group" aria-label={t("Language")}>
          {(["fr", "en", "es"] as Lang[]).map((l) => (
            <button key={l} type="button" aria-pressed={l === lang} onClick={() => onLang(l)}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="right">
          {mode === "video" && (
            <button type="button" className="ib" aria-pressed={!muted} aria-label={muted ? t("Unmute") : t("Mute")} onClick={toggleSound}>
              <Ico name={muted ? "mute" : "sound"} />
            </button>
          )}
          <button type="button" className="pill js-skip" onClick={ended ? onDone : skip}>
            {t("Skip")}
            <Ico name="skip" />
          </button>
        </div>
      </div>
    </div>
  );
}
