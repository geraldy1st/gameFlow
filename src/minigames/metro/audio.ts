/**
 * Metro run — v6.1: original procedural K-pop instrumental (124 BPM) + sound effects in Web Audio, after Mirage's
 * mockup. No sound file. The music only starts from a user gesture (« J'y vais »), stops on pause /
 * hidden tab, and the ♪ mute choice is kept in localStorage `gameflow-runner-mute`.
 */
import type { SkinMusic } from "./skins/types";

const RUNNER_MUTE_KEY = "gameflow-runner-mute";
export type Sfx = "jump" | "slide" | "hit" | "coin" | "win" | "fail" | "beep" | "go" | "pickup";

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

  /** v6.1: the music starts from bar 1 when the run starts (after the countdown, which only beeps). */
  restartMusic(): void {
    this.acc = 0;
    this.note = 0;
  }

  /** Called every frame with the elapsed time: schedules the 1/16 steps of the original K-pop instrumental (v6). */
  pump(dt: number): void {
    if (!this.on || this.muted || !this.ctx || !this.master) return;
    this.acc += dt;
    const st16 = 15 / KP.bpm;
    while (this.acc >= st16) {
      this.acc -= st16;
      kpStep(this.ctx, this.master, this.note++, this.ctx.currentTime + 0.03);
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
    } else if (name === "beep") {
      this.tone(w, 880, 0.16, "sine", 0.22, d);
      this.tone(w, 1760, 0.06, "triangle", 0.05, d);
    } else if (name === "go") {
      this.tone(w, 1760, 0.32, "sine", 0.24, d);
      this.tone(w, 2637, 0.2, "triangle", 0.07, d);
    } else if (name === "pickup") {
      this.tone(w, 1567.98, 0.09, "sine", 0.16, d);
      this.tone(w + 0.05, 2093, 0.16, "sine", 0.14, d);
      this.tone(w + 0.05, 4186, 0.08, "triangle", 0.03, d);
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

/* ---------------------------------------------------------------- v6 music: original procedural "K-pop" instrumental
 * 124 BPM, 16-bar loop (≈ 31 s): bars 1-4 verse (four-on-the-floor kick, off-beat hats, syncopated bass, pluck
 * arpeggios), 5-8 pre-chorus (+ claps, stabs, snare roll and riser in bar 8), 9-16 drop (crash, pumping supersaw
 * chords, original lead hook KP_HOOK). Progression vi–IV–I–V in A major. Port of Mirage's mockup (runner.js v6). */
const KP = { bpm: 124, bars: 16 };
const KP_ROOT = [42, 38, 45, 40];
const KP_CH = [[57, 61, 66], [57, 62, 66], [57, 61, 64], [56, 59, 64]];
const KP_BASS = [0, 3, 6, 8, 11, 14];
const KP_HOOK: [number, number, number][][] = [
  [[0, 76, 2], [2, 78, 2], [4, 81, 3], [7, 78, 3], [10, 76, 2], [12, 73, 2], [14, 76, 2]],
  [[0, 78, 3], [3, 76, 3], [6, 74, 2], [8, 76, 2], [10, 78, 2], [12, 81, 4]],
  [[0, 85, 2], [2, 83, 2], [4, 81, 3], [7, 76, 3], [10, 78, 2], [12, 76, 2], [14, 73, 2]],
  [[0, 71, 3], [3, 73, 3], [6, 76, 2], [8, 80, 2], [10, 83, 2], [12, 81, 4]],
];
const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const NOISE = new WeakMap<BaseAudioContext, AudioBuffer>();
function noiseBuf(ctx: BaseAudioContext): AudioBuffer {
  let b = NOISE.get(ctx);
  if (b) return b;
  b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = b.getChannelData(0);
  let x = 12345;
  for (let i = 0; i < d.length; i++) {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    d[i] = x / 0x3fffffff - 1;
  }
  NOISE.set(ctx, b);
  return b;
}
function nz(ctx: BaseAudioContext, dest: AudioNode, when: number, dur: number, type: BiquadFilterType, freq: number, gain: number, q = 0.8) {
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf(ctx);
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, when);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  s.connect(f);
  f.connect(g);
  g.connect(dest);
  s.start(when, Math.random() * 1.5);
  s.stop(when + dur + 0.02);
}
function kick(ctx: BaseAudioContext, dest: AudioNode, when: number) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(150, when);
  o.frequency.exponentialRampToValueAtTime(46, when + 0.11);
  g.gain.setValueAtTime(0.95, when);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.32);
  o.connect(g);
  g.connect(dest);
  o.start(when);
  o.stop(when + 0.34);
  nz(ctx, dest, when, 0.012, "highpass", 3000, 0.25);
}
function clap(ctx: BaseAudioContext, dest: AudioNode, when: number, gain = 0.32) {
  for (const d of [0, 0.011, 0.022]) nz(ctx, dest, when + d, d === 0.022 ? 0.16 : 0.03, "bandpass", 1300, gain, 1.2);
}
interface SynthOpts { types?: OscillatorType[]; detune?: number[]; cut?: number; gain?: number; atk?: number; pump?: boolean; q?: number }
function synth(ctx: BaseAudioContext, dest: AudioNode, when: number, freq: number, dur: number, { types = ["sawtooth"], detune = [0], cut = 2400, gain = 0.1, atk = 0.006, pump = false, q = 1 }: SynthOpts) {
  const f = ctx.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.setValueAtTime(cut, when);
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(gain * (pump ? 0.35 : 1), when + atk);
  if (pump) g.gain.linearRampToValueAtTime(gain, when + Math.min(dur * 0.6, 0.18));
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  f.connect(g);
  g.connect(dest);
  types.forEach((t, k) =>
    detune.forEach((dt) => {
      const o = ctx.createOscillator();
      o.type = t;
      o.frequency.setValueAtTime(freq, when);
      o.detune.value = dt + k * 3;
      o.connect(f);
      o.start(when);
      o.stop(when + dur + 0.03);
    }),
  );
}
/** One 1/16 step; n = absolute step index since the music started. */
export function kpStep(ctx: BaseAudioContext, dest: AudioNode, n: number, when: number): void {
  const st16 = 60 / KP.bpm / 4;
  const step = n % 16;
  const bar = Math.floor(n / 16) % KP.bars;
  const ch = bar % 4;
  const sec = bar < 4 ? "verse" : bar < 8 ? "pre" : "drop";
  const lastBuild = bar === 7 && step >= 12;
  if (step % 4 === 0 && !lastBuild) kick(ctx, dest, when);
  if (step % 4 === 2) nz(ctx, dest, when, sec === "drop" ? 0.05 : 0.035, "highpass", 7500, sec === "verse" ? 0.07 : 0.1);
  if (sec === "drop" && step % 2 === 1) nz(ctx, dest, when, 0.02, "highpass", 9000, 0.035);
  if (sec !== "verse" && (step === 4 || step === 12) && !lastBuild) clap(ctx, dest, when);
  if (bar === 7) {
    if (step >= 8 || step % 2 === 0) clap(ctx, dest, when, 0.08 + step * 0.012);
    if (step === 0) {
      const s = ctx.createBufferSource();
      s.buffer = noiseBuf(ctx);
      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.Q.value = 2;
      f.frequency.setValueAtTime(400, when);
      f.frequency.exponentialRampToValueAtTime(9000, when + st16 * 16);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.001, when);
      g.gain.exponentialRampToValueAtTime(0.22, when + st16 * 16);
      s.connect(f);
      f.connect(g);
      g.connect(dest);
      s.start(when);
      s.stop(when + st16 * 16 + 0.02);
      const o = ctx.createOscillator();
      const og = ctx.createGain();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(220, when);
      o.frequency.exponentialRampToValueAtTime(880, when + st16 * 16);
      og.gain.setValueAtTime(0.001, when);
      og.gain.exponentialRampToValueAtTime(0.05, when + st16 * 16);
      o.connect(og);
      og.connect(dest);
      o.start(when);
      o.stop(when + st16 * 16);
    }
  }
  if (bar === 8 && step === 0) nz(ctx, dest, when, 1.2, "lowpass", 6000, 0.18);
  if (KP_BASS.includes(step) && !lastBuild) synth(ctx, dest, when, mtof(KP_ROOT[ch]! + (step === 14 ? 12 : 0)), st16 * 2.2, { types: ["sawtooth", "square"], cut: sec === "drop" ? 900 : 650, gain: 0.13, q: 4 });
  const chord = KP_CH[ch]!;
  if (sec !== "drop") synth(ctx, dest, when, mtof(chord[step % 3]! + 12 + (step % 6 > 2 ? 12 : 0)), st16 * 1.6, { types: ["triangle", "square"], cut: 3200, gain: 0.045 });
  if (sec === "pre" && [0, 3, 6, 10].includes(step)) chord.forEach((m) => synth(ctx, dest, when, mtof(m), st16 * 2.4, { detune: [-8, 8], cut: 2200, gain: 0.03 }));
  if (sec === "drop" && step % 4 === 0) chord.forEach((m) => synth(ctx, dest, when, mtof(m), st16 * 3.8, { detune: [-14, 0, 14], cut: 3000, gain: 0.032, pump: true }));
  if (sec === "drop") {
    const ph = KP_HOOK[ch]!.find((h) => h[0] === step);
    if (ph) synth(ctx, dest, when, mtof(ph[1] + (bar >= 12 && ch % 2 === 0 ? 12 : 0)), st16 * ph[2] * 0.95, { types: ["square", "sawtooth"], detune: [-6, 6], cut: 4200, gain: 0.068, atk: 0.01 });
  }
  if (sec === "verse" && bar % 2 === 1) {
    const ph = KP_HOOK[ch]!.find((h) => h[0] === step);
    if (ph) synth(ctx, dest, when, mtof(ph[1] - 12), st16 * ph[2], { types: ["triangle"], cut: 2000, gain: 0.05 });
  }
}
