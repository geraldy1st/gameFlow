/**
 * Chez Aoi home layer (H4–H6), loaded on demand (its own chunk). Painted 4-room apartment, furniture in predefined
 * slots (one button per slot: pointer, touch and keyboard alike, WCAG 2.1.1 / 2.5.7), the resident (Aoi for every
 * character for now, home-data.ts RESIDENTS) and the Sieste. Esc or ✕ closes; focus goes back to the opener.
 * Nap clip: 3 WebP strips ≤ 4096 px, one decoded at a time; still frame with reduced motion or if a strip fails.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { cur, furnitureFree, homeDayOf, napPoints, type Action, type GameState } from "@/game/engine";
import { FURNITURE, HOME_SLOTS_PER_TURN, HOME_TYPE, furnitureById, housingById, residentFor, type ClipDef, type RoomDef, type RoomId } from "@/game/home-data";
import "./home.css";

type TFn = (text: string, vars?: Record<string, string | number>) => string;
const W = HOME_TYPE.w, H = HOME_TYPE.h;
const ppm = (room: RoomDef, y: number) => Math.max(40, (y - room.horizon) / HOME_TYPE.camH);
const pct = (v: number, of: number) => `${(v / of) * 100}%`;

function useReducedMotion(): boolean {
  const [r, setR] = useState(() => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    if (typeof matchMedia !== "function") return;
    const m = matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setR(m.matches);
    m.addEventListener?.("change", on);
    return () => m.removeEventListener?.("change", on);
  }, []);
  return r;
}

/** Plays the nap clip strip by strip (one decoded image alive at a time), then calls onDone. */
function NapClip({ clip, reduce, onDone }: { clip: ClipDef; reduce: boolean; onDone: () => void }) {
  const [frame, setFrame] = useState(0);
  const [strip, setStrip] = useState<string | null>(null);
  const [still, setStill] = useState(reduce);
  useEffect(() => {
    if (reduce) {
      const id = setTimeout(onDone, 1200);
      return () => clearTimeout(id);
    }
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const play = async (k: number) => {
      if (!alive) return;
      if (k >= clip.strips.length) return void onDone();
      const img = new Image();
      img.src = clip.strips[k]!;
      try {
        await img.decode();
      } catch {
        if (alive) setStill(true);
        timer = setTimeout(onDone, 1200);
        return;
      }
      if (!alive) return;
      setStrip(img.src);
      const n = Math.min(clip.perStrip, clip.frames - k * clip.perStrip);
      let f = 0;
      const tick = () => {
        if (!alive) return;
        setFrame(f);
        f++;
        if (f < n) timer = setTimeout(tick, 1000 / clip.fps);
        else timer = setTimeout(() => void play(k + 1), 1000 / clip.fps);
      };
      tick();
    };
    void play(0);
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [clip, reduce, onDone]);
  if (still || !strip) return <img className="ho-nap" src={clip.still} alt="" />;
  return <span className="ho-nap" style={{ backgroundImage: `url(${strip})`, backgroundSize: `${clip.perStrip * 100}% 100%`, backgroundPosition: `${(frame / Math.max(1, clip.perStrip - 1)) * 100}% 0` }} />;
}

export default function HomeLayer({ state, homeId, t, go, onClose }: { state: GameState; homeId: string; t: TFn; go: (a: Action) => void; onClose: () => void }) {
  const p = cur(state);
  const home = p.housing?.[homeId];
  const reduce = useReducedMotion();
  const [roomId, setRoomId] = useState<RoomId>("salon");
  const [pick, setPick] = useState<string | null>(null);
  const [napping, setNapping] = useState(false);
  const [say, setSay] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(typeof document !== "undefined" ? document.activeElement : null);
  const room = HOME_TYPE.rooms.find((r) => r.id === roomId)!;
  const resident = residentFor(p.characterId).def;
  const outfit = resident.outfits.includes(p.outfit) ? p.outfit : "jeans";
  const d = homeDayOf(p);
  const idle = state.phase === "idle" && !state.practice;

  useEffect(() => {
    rootRef.current?.querySelector<HTMLElement>("button")?.focus();
    const back = opener.current;
    return () => (back as HTMLElement | null)?.focus?.();
  }, []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (pick) setPick(null);
        else onClose();
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [pick, onClose]);
  const done = useMemo(() => () => setNapping(false), []);

  if (!home) return null;
  const slotOf = pick ? room.slots.find((s) => s.id === pick) : undefined;
  const inSlot = pick ? home.slots[pick] : undefined;
  const choices = slotOf ? FURNITURE.filter((f) => furnitureFree(p, f.id) > 0 && (!slotOf.only || slotOf.only.includes(f.id))) : [];
  const [sx, sy] = room.stand;
  const bodyH = resident.hM * ppm(room, sy);
  const nap = () => {
    const pts = napPoints(p);
    go({ type: "HOME_ACT", id: "nap" });
    setSay(t("Nap at home: +{n} on every gauge.", { n: pts }));
    if (resident.nap) setNapping(true);
  };

  return (
    <div className="ho-layer" ref={rootRef} role="dialog" aria-modal="true" aria-label={t(housingById(homeId)?.name ?? "Home")}>
      <header className="ho-head">
        <strong>{t(housingById(homeId)?.name ?? "Home")}</strong>
        <span className="ho-count" aria-label={t("{n} of {max} time slots left today", { n: HOME_SLOTS_PER_TURN - d.used, max: HOME_SLOTS_PER_TURN })}>
          {Array.from({ length: HOME_SLOTS_PER_TURN }, (_, i) => (
            <i key={i} className={i < HOME_SLOTS_PER_TURN - d.used ? "on" : ""} />
          ))}
        </span>
        <button type="button" className="ho-x" onClick={onClose} aria-label={t("Close")}>✕</button>
      </header>
      <nav className="ho-rooms" aria-label={t("Rooms")}>
        {HOME_TYPE.rooms.map((r) => (
          <button key={r.id} type="button" aria-pressed={r.id === roomId} onClick={() => { setRoomId(r.id); setPick(null); }}>
            {t(r.name)}
          </button>
        ))}
      </nav>
      <div className="ho-stage" style={{ aspectRatio: `${W} / ${H}` }}>
        <img className="ho-bg" src={room.bg} alt="" />
        {[...room.slots].sort((a, b) => a.y - b.y).map((s) => {
          const it = home.slots[s.id];
          const f = it ? furnitureById(it) : undefined;
          const w = f ? f.wM * ppm(room, s.y) : 90;
          const h = f ? w * f.ar : 60;
          const where = `${t(room.name)}, ${t(s.label)}`;
          return (
            <button
              key={s.id}
              type="button"
              className={`ho-slot ${f ? "full" : "empty"} ${pick === s.id ? "sel" : ""}`}
              style={{ left: pct(s.x - w / 2, W), top: pct(s.y - h, H), width: pct(w, W), height: pct(h, H), zIndex: Math.round(s.y) }}
              disabled={!idle}
              aria-label={f ? t("{item}, {where}. Change or store", { item: t(f.name), where }) : t("Empty slot, {where}. Place furniture", { where })}
              onClick={() => setPick(pick === s.id ? null : s.id)}
            >
              {f ? <img src={`/game/scenes/home/${f.id}.webp`} alt="" /> : <span aria-hidden="true">+</span>}
            </button>
          );
        })}
        <div className="ho-res" style={{ left: pct(sx, W), top: pct(sy, H), height: pct(bodyH, H), zIndex: napping ? 2000 : Math.round(sy) + 1 }}>
          {napping && resident.nap ? <NapClip clip={resident.nap} reduce={reduce || outfit !== resident.nap.outfit} onDone={done} /> : <img src={resident.body.replace("{outfit}", outfit)} alt="" />}
        </div>
      </div>
      <div className="ho-dock">
        {slotOf ? (
          <div className="ho-pick" role="group" aria-label={`${t(room.name)}, ${t(slotOf.label)}`}>
            {choices.map((f) => (
              <button key={f.id} type="button" onClick={() => { go({ type: "HOME_PLACE", homeId, slot: slotOf.id, itemId: f.id }); setSay(t("{item} placed.", { item: t(f.name) })); setPick(null); }}>
                {t(f.name)} × {furnitureFree(p, f.id)}
              </button>
            ))}
            {inSlot && (
              <button type="button" onClick={() => { go({ type: "HOME_STORE", homeId, slot: slotOf.id }); setSay(t("{item} stored in the inventory.", { item: t(furnitureById(inSlot)!.name) })); setPick(null); }}>
                {t("Store")}
              </button>
            )}
            {!choices.length && !inSlot && <span>{t("Nothing to place here. Immo Dada sells home supplies.")}</span>}
            <button type="button" className="ghost" onClick={() => setPick(null)}>{t("Cancel")}</button>
          </div>
        ) : (
          <div className="ho-acts">
            <button type="button" className="gold" disabled={!idle || napping || d.used >= HOME_SLOTS_PER_TURN} onClick={nap}>
              {t("Nap")} · +{napPoints(p)}
            </button>
            <span>{Object.keys(home.slots).length ? t("Pick a slot to change the furniture.") : t("Everything is empty! Pick a slot to place furniture.")}</span>
          </div>
        )}
        <p className="ho-live" aria-live="polite">{say}</p>
      </div>
    </div>
  );
}
