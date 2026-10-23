/**
 * Home v1 clip player (Mirage's home3 prototype, made a module): two stacked <video>, the next clip is loaded in
 * the hidden one, then a 300 ms crossfade (CSS). Each action is go → loop (as long as the player wants) → return.
 * - "Se lever" cuts the loop at once: ping-pong loop → jump to the mirror position, then play to the cut frame at
 *   upRate (×2) or faster, so the return clip always starts within UP_MAX_DELAY s (DEF-HOME3-01, Lire);
 *   forward "fade" loop (shower) → same phase of the last cycle, at rate 1.
 * - Reduced motion: no imposed loop animation (the loop clip waits on its cut frame), plain fades.
 * - Blob cache for the current room only: entering a room revokes the other rooms' object URLs (Android memory).
 */
import { UP_MAX_DELAY, actionsIn, type HomeActionDef, type RoomDef } from "@/game/home-data";

const EARLY = 0.3; // end a clip 300 ms early so the crossfade hides the cut
const MAX_RATE = 8;

export class HomePlayer {
  private v: [HTMLVideoElement, HTMLVideoElement];
  private cur = 0;
  private cache = new Map<string, Promise<string>>();
  private wantUp = false;
  private alive = true;
  private room: RoomDef | null = null;
  /** Clip phase of the running action ("loop" = waiting loop). */
  phase: "idle" | "go" | "loop" | "return" = "idle";

  constructor(a: HTMLVideoElement, b: HTMLVideoElement, private reduce: boolean) {
    this.v = [a, b];
    a.classList.add("on");
  }

  /** Object URLs currently held (tests / debug). */
  cached(): string[] {
    return [...this.cache.keys()];
  }

  private clip(src: string): Promise<string> {
    let p = this.cache.get(src);
    if (!p) {
      p = fetch(src)
        .then((r) => {
          if (!r.ok) throw new Error(`${src} ${r.status}`);
          return r.blob();
        })
        .then((b) => URL.createObjectURL(b))
        .catch(() => {
          this.cache.delete(src);
          return src;
        });
      this.cache.set(src, p);
    }
    return p;
  }

  private drop(keep: (src: string) => boolean) {
    for (const [src, p] of [...this.cache]) {
      if (keep(src)) continue;
      this.cache.delete(src);
      void p.then((u) => u.startsWith("blob:") && URL.revokeObjectURL(u));
    }
  }

  /** Shows the room's still and keeps (or loads) only its clips. */
  setRoom(room: RoomDef) {
    this.room = room;
    this.drop((src) => src.startsWith(room.dir));
    const nx = this.v[1 - this.cur]!;
    nx.pause();
    nx.removeAttribute("src");
    nx.load();
    nx.poster = room.start;
    nx.dataset.clip = "";
    this.swap();
    for (const a of actionsIn(room.id)) for (const k of ["aller", "attente", "retour"]) void this.clip(`${room.dir}${a.id}-${k}.mp4`);
  }

  private swap() {
    const nx = this.v[1 - this.cur]!;
    nx.classList.add("on");
    this.v[this.cur]!.classList.remove("on");
    this.cur = 1 - this.cur;
  }

  private async show(src: string, play = true): Promise<HTMLVideoElement> {
    const url = await this.clip(src);
    const nx = this.v[1 - this.cur]!;
    await new Promise<void>((res) => {
      nx.onerror = nx.oncanplay = () => {
        nx.onerror = nx.oncanplay = null;
        res();
      };
      nx.src = url;
      nx.dataset.clip = src.split("/").pop() ?? "";
      delete nx.dataset.upRate;
      nx.playbackRate = nx.defaultPlaybackRate = 1;
      nx.loop = false;
      nx.load();
    });
    nx.currentTime = 0;
    if (play) await nx.play().catch(() => {});
    this.swap();
    return nx;
  }

  /** Polls every 40 ms until `done` returns true (timeupdate alone is ~250 ms coarse). */
  private until(el: HTMLVideoElement, done: (t: number, d: number) => boolean): Promise<void> {
    return new Promise((res) => {
      const id = setInterval(() => {
        const d = el.duration || 0;
        if (!this.alive || el.error || (d && done(el.currentTime, d)) || (el.ended && !el.loop)) {
          clearInterval(id);
          res();
        }
      }, 40);
    });
  }

  /** DEF-HOME-01: hidden → pause both videos; visible again → resume the waiting loop (not with reduced motion). */
  setVisible(visible: boolean) {
    if (!visible) {
      for (const v of this.v) v.pause();
      return;
    }
    const el = this.v[this.cur]!;
    if (this.alive && this.phase === "loop" && !this.reduce && el.paused) void el.play()?.catch?.(() => {});
  }

  up() {
    this.wantUp = true;
  }

  /** Plays one action; `onSit` when the loop starts ("Se lever" may be pressed). */
  async run(act: HomeActionDef, onSit: () => void): Promise<void> {
    const dir = this.room?.dir ?? "";
    this.wantUp = false;
    this.phase = "go";
    let el = await this.show(`${dir}${act.id}-aller.mp4`);
    await this.until(el, (t, d) => t >= d - (this.reduce ? 0.05 : EARLY));
    if (!this.alive) return;
    el = await this.show(`${dir}${act.id}-attente.mp4`, !this.reduce);
    this.phase = "loop";
    onSit();
    if (this.reduce) {
      await this.until(el, () => this.wantUp);
    } else {
      let cut = false;
      await this.until(el, (t, d) => {
        if (this.wantUp && !cut) {
          cut = true;
          let to = t;
          if (act.loop === "pingpong") to = t < d / 2 ? d - t : t;
          else if (act.period && t < d - act.period) to = d - act.period + (t % act.period);
          if (to !== t) el.currentTime = to;
          const left = Math.max(0, d - EARLY - to);
          el.playbackRate = Math.min(MAX_RATE, Math.max(act.upRate, left / UP_MAX_DELAY));
          el.dataset.upRate = String(el.playbackRate);
          return false;
        }
        if (t >= d - EARLY) {
          if (this.wantUp) return true;
          el.currentTime = 0; // loop
        }
        return false;
      });
    }
    if (!this.alive) return;
    this.phase = "return";
    el = await this.show(`${dir}${act.id}-retour.mp4`);
    await this.until(el, (t, d) => t >= d - 0.02);
    el.pause();
    this.phase = "idle";
  }

  destroy() {
    this.alive = false;
    for (const v of this.v) v.pause();
    this.drop(() => false);
  }
}
