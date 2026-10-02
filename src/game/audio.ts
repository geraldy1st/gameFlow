export type SfxName = "dice" | "card" | "cash" | "whoosh" | "win" | null;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.22;
    master.connect(ctx.destination);
  }
  return ctx;
}

export function unlockAudio(): void {
  const c = context();
  if (c && c.state === "suspended") void c.resume();
}

export function setMuted(next: boolean): void {
  muted = next;
  if (master && ctx) {
    master.gain.setTargetAtTime(next ? 0 : 0.22, ctx.currentTime, 0.02);
  }
}

export function resumeAudio(): void {
  if (ctx && ctx.state === "suspended") void ctx.resume();
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType,
  gain: number,
  delay = 0,
  slide?: number,
): void {
  const c = context();
  if (!c || !master || muted) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise(dur: number, gain: number, delay = 0): void {
  const c = context();
  if (!c || !master || muted) return;
  const t0 = c.currentTime + delay;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 900;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(master);
  src.start(t0);
}

export function playSfx(name: SfxName): void {
  if (!name || muted) return;
  unlockAudio();
  if (name === "dice") {
    noise(0.18, 0.35);
    tone(180, 0.12, "triangle", 0.2);
    tone(240, 0.08, "square", 0.05, 0.08);
  } else if (name === "card") {
    noise(0.22, 0.18);
    tone(520, 0.18, "sine", 0.08, 0.02, 280);
  } else if (name === "cash") {
    tone(660, 0.12, "sine", 0.16);
    tone(880, 0.18, "sine", 0.14, 0.08);
  } else if (name === "whoosh") {
    noise(0.16, 0.22);
    tone(300, 0.16, "sine", 0.06, 0, 140);
  } else if (name === "win") {
    tone(523, 0.16, "sine", 0.16);
    tone(659, 0.16, "sine", 0.14, 0.12);
    tone(784, 0.28, "sine", 0.16, 0.24);
  }
}
