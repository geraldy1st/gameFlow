/**
 * Home v1 "appartement d'Aoi" (Mirage's home3 prototype): 4 rooms, fixed layout, 8 data-driven actions played as
 * video sequences (player.ts). An action uses one time slot as soon as it starts (HOME_ACT), even if cut short by
 * "Se lever". Without its furniture an action shows a padlock and leads to Immo Dada (onShop); buying there and
 * coming back unlocks it at once (state-driven, no reload). Room selector and ✕ are disabled during an action.
 * Esc or ✕ closes; focus goes back to the opener (GameFlow).
 */
import { useEffect, useRef, useState } from "react";
import { Lock } from "lucide-react";
import { cur, homeActionLeft, homeActionState, homeDayOf, type Action, type GameState } from "@/game/engine";
import { HOME_SLOTS_PER_TURN, ROOMS, actionTodayText, actionsIn, dailyLimitOf, furnitureById, homeActionById, roomById, slotsLeftText, type RoomId } from "@/game/home-data";
import { HomePlayer } from "./player";
import "./home.css";

type TFn = (text: string, vars?: Record<string, string | number>) => string;

function useReducedMotion(): boolean {
  const [r] = useState(() => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches);
  return r;
}

export default function HomeLayer({ state, homeId, t, go, onClose, onShop }: { state: GameState; homeId: string; t: TFn; go: (a: Action) => void; onClose: () => void; onShop?: (furnitureId: string) => void }) {
  const p = cur(state);
  const home = p.housing?.[homeId];
  const reduce = useReducedMotion();
  const [roomId, setRoomId] = useState<RoomId>("salon");
  const [busy, setBusy] = useState<string | null>(null);
  const [sit, setSit] = useState(false);
  const [say, setSay] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const va = useRef<HTMLVideoElement>(null);
  const vb = useRef<HTMLVideoElement>(null);
  const player = useRef<HomePlayer | null>(null);
  const room = roomById(roomId);
  const d = homeDayOf(p);
  const idle = state.phase === "idle" && !state.practice;

  useEffect(() => {
    if (!va.current || !vb.current) return;
    const pl = new HomePlayer(va.current, vb.current, reduce);
    player.current = pl;
    return () => {
      pl.destroy();
      player.current = null;
    };
  }, [reduce]);
  useEffect(() => {
    player.current?.setRoom(room);
  }, [room, reduce]);
  // DEF-HOME-01: pause when hidden, resume the waiting loop when visible again.
  useEffect(() => {
    const vis = () => player.current?.setVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", vis);
    return () => document.removeEventListener("visibilitychange", vis);
  }, []);
  useEffect(() => {
    rootRef.current?.querySelector<HTMLElement>(".ho-rooms button")?.focus();
  }, []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [busy, onClose]);

  if (!home) return null;
  const run = async (id: string) => {
    const act = homeActionById(id);
    const pl = player.current;
    if (!act || !pl || busy || !idle || homeActionState(p, id) !== "open") return;
    go({ type: "HOME_ACT", id }); // the slot is used now
    setBusy(id);
    setSit(false);
    setSay(t(act.name));
    await pl.run(act, () => setSit(true));
    setSit(false);
    setBusy(null);
    setSay(t("Done: {action}.", { action: t(act.name) }));
    setTimeout(() => rootRef.current?.querySelector<HTMLElement>(`[data-act="${id}"]`)?.focus(), 0);
  };
  const left = HOME_SLOTS_PER_TURN - d.used;

  return (
    <div className="ho-layer" ref={rootRef} role="dialog" aria-modal="true" aria-label={t("At {name}'s", { name: "Aoi" })}>
      <div className="ho-head">
        <strong>{t("At {name}'s", { name: "Aoi" })} · {t(room.name)}</strong>
        <span className="ho-count" role="img" aria-label={slotsLeftText(t, left, HOME_SLOTS_PER_TURN)}>
          {Array.from({ length: HOME_SLOTS_PER_TURN }, (_, i) => <i key={i} className={i < left ? "on" : ""} />)}
        </span>
        <button type="button" className="ho-x" onClick={onClose} disabled={!!busy} aria-label={t("Close")}>✕</button>
      </div>
      <div className="ho-rooms" role="group" aria-label={t("Rooms")}>
        {ROOMS.map((r) => (
          <button key={r.id} type="button" data-room={r.id} aria-pressed={r.id === roomId} disabled={!!busy} onClick={() => setRoomId(r.id)}>
            {t(r.name)}
          </button>
        ))}
      </div>
      <div className="ho-stage">
        <video ref={va} muted playsInline preload="auto" aria-hidden="true" />
        <video ref={vb} muted playsInline preload="auto" aria-hidden="true" />
      </div>
      <div className="ho-dock">
        <div className="ho-acts">
          {actionsIn(roomId).map((a) => {
            const st = homeActionState(p, a.id);
            if (st === "locked") {
              const f = furnitureById(a.furniture)!;
              return (
                <button key={a.id} type="button" className="locked" data-act={a.id} data-locked disabled={!!busy || !onShop} onClick={() => onShop?.(f.id)}
                  aria-label={t("{action} locked — buy {item} at Immo Dada", { action: t(a.name), item: t(f.name) })}>
                  <Lock size={16} aria-hidden="true" /> {t(a.name)}
                </button>
              );
            }
            const today = actionTodayText(t, homeActionLeft(p, a.id), dailyLimitOf(a));
            return (
              <button key={a.id} type="button" className="gold" data-act={a.id} data-done={st === "done" || undefined} disabled={!!busy || !idle || st !== "open"} onClick={() => void run(a.id)}
                aria-label={today ? `${t(a.name)} — ${today}` : undefined} title={today || undefined}>
                {t(a.name)}{today && <small className="ho-today"> · {today}</small>}
              </button>
            );
          })}
          <button type="button" className="ghost" data-up disabled={!busy || !sit} onClick={() => { setSit(false); player.current?.up(); }}>
            {t("Get up")}
          </button>
        </div>
        <span className="ho-left">{slotsLeftText(t, left, HOME_SLOTS_PER_TURN)}</span>
        <p className="ho-live" aria-live="polite">{say}</p>
      </div>
    </div>
  );
}
