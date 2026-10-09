/**
 * Metro run — original chiptune loop + sound effects in Web Audio (square / triangle oscillators, filtered noise),
 * after Mirage's mockup. No sound file. The music only starts from a user gesture (« J'y vais »), stops on pause /
 * hidden tab, and the ♪ mute choice is kept in localStorage `gameflow-runner-mute`.
 */
import type { SkinMusic } from "./metro-skin";

export const RUNNER_MUTE_KEY = "gameflow-runner-mute";
export type Sfx = "jump" | "slide" | "hit" | "coin" | "win" | "fail";

/** Saved choice; without one, follow the game's own mute. */
export function readRunnerMute(gameMuted: boolean): boolean {
  try {
    const v = localStorage.getItem(RUNNER_MUTE_KEY);
    return v === null ? gameMuted : v === "1";
  } catch {
    return gameMuted;
  }
}
export function saveRunnerMute(m: boolean): void {
  try {
    localStorage.setItem(RUNNER_MUTE_KEY, m ? "1" : "0");
  } catch {
    /* private mode */
  }
}

const VOLUME = 0.42;

export class RunnerAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private acc = 0;
  private note = 0;
  private on = false;
  constructor(
    private music: SkinMusic,
    private muted: boolean,
  ) {}

  /** Call from a click / tap handler (browsers only allow audio after a gesture). */
  unlock(): void {
    const AC = typeof window !== "undefined" ? window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext : undefined;
    if (!AC) return;
    try {
      if (!this.ctx) {
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.connect(this.ctx.destination);
      }
      this.master!.gain.setValueAtTime(this.muted ? 0 : VOLUME, this.ctx.currentTime);
      void this.ctx.resume();
      this.on = true;
      this.acc = 0;
      this.note = 0;
    } catch {
      this.ctx = null;
    }
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.ctx && this.master) this.master.gain.setValueAtTime(m ? 0 : VOLUME, this.ctx.currentTime);
  }

  /** Pause / hidden tab: fade out and stop scheduling. */
  silence(): void {
    this.on = false;
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.03);
  }
  resume(): void {
    if (!this.ctx || !this.master) return;
    this.on = true;
    void this.ctx.resume();
    this.master.gain.setValueAtTime(this.muted ? 0 : VOLUME, this.ctx.currentTime);
  }

  /** Called every frame with the elapsed time: schedules the melody eighth notes. */
  pump(dt: number): void {
    if (!this.on || this.muted || !this.ctx || !this.master) return;
    this.acc += dt;
    const eighth = 30 / this.music.bpm;
    while (this.acc >= eighth) {
      this.acc -= eighth;
      this.melody(this.note++, this.ctx.currentTime);
    }
  }

  sfx(name: Sfx): void {
    if (this.muted || !this.ctx || !this.master) return;
    const c = this.ctx;
    const d = this.master;
    const w = c.currentTime;
    const m = this.music;
    if (name === "jump") {
      this.tone(w, 520, 0.12, "square", 0.18, d);
      this.tone(w + 0.06, 780, 0.1, "square", 0.12, d);
    } else if (name === "slide") {
      this.noise(w, 0.16, 0.2, d);
      this.tone(w, 180, 0.14, "sawtooth", 0.08, d);
    } else if (name === "hit") {
      this.noise(w, 0.22, 0.35, d);
      this.tone(w, 90, 0.2, "square", 0.2, d);
    } else if (name === "coin") {
      this.tone(w, 880, 0.08, "square", 0.16, d);
      this.tone(w + 0.08, 1320, 0.12, "square", 0.14, d);
    } else if (name === "win") {
      [0, 2, 4, 7].forEach((deg, i) => this.tone(w + i * 0.09, 261.63 * Math.pow(2, (m.scale[Math.min(deg, m.scale.length - 1)]! - 60) / 12) * (m.root / 60), 0.18, "square", 0.16, d));
    } else {
      [4, 2, 0].forEach((deg, i) => this.tone(w + i * 0.12, 196 * Math.pow(2, deg / 12), 0.2, "square", 0.16, d));
    }
  }

  close(): void {
    this.on = false;
    const c = this.ctx;
    this.ctx = null;
    this.master = null;
    if (c) void c.close().catch(() => {});
  }

  private melody(n: number, when: number): void {
    const m = this.music;
    const d = this.master!;
    const deg = m.melody[n % m.melody.length]!;
    const beat = 60 / m.bpm;
    if (deg >= 0) {
      const semi = m.scale[Math.min(deg, m.scale.length - 1)]! - 60;
      const freq = 261.63 * Math.pow(2, semi / 12) * Math.pow(2, (m.root - 60) / 12);
      this.tone(when, freq, beat * 0.42, "square", 0.13, d);
      if (n % 2 === 0) this.tone(when, freq / 2, beat * 0.4, "triangle", 0.1, d);
    }
    if (n % 2 === 0) this.tone(when, 80 + (n % 4) * 20, 0.04, "square", 0.05, d);
  }

  private tone(when: number, freq: number, dur: number, type: OscillatorType, gain: number, dest: AudioNode): void {
    const c = this.ctx!;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, when);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, gain), when + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g);
    g.connect(dest);
    o.start(when);
    o.stop(when + dur + 0.02);
  }

  private noise(when: number, dur: number, gain: number, dest: AudioNode): void {
    const c = this.ctx!;
    const n = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource();
    s.buffer = buf;
    const g = c.createGain();
    g.gain.setValueAtTime(gain, when);
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 900;
    s.connect(f);
    f.connect(g);
    g.connect(dest);
    s.start(when);
  }
}
