/**
 * Metro v6.1 (Crypto R2 / R3 / hook): neon flicker period ≥ 333 ms and static under reduced motion, countdown digits
 * announced once each, coins on the validated level, and the seeded VITE_METRO_HOOK bots (win / hurt / crash).
 */
import { describe, expect, it } from "vitest";
import * as E from "@/game/engine";
import type { GameState } from "@/game/engine";
import { BLINK_STEP, NEON_STEP, blinkAlpha, neonAmp } from "./skins/neon";
import { METRO_COIN_VALUE, METRO_MAX_COINS, metroCoins, metroReward } from "./logic";
import { RUN, act, advanceRun, countdownDigit, demoDriver, newRun, type MetroAction, type RunState } from "./runner";
import { V61_STRINGS, withV61 } from "./i18n-v61";

function play(seed: number, bot: (s: RunState) => MetroAction | null, length: number = RUN.length): RunState {
  let s = newRun(seed, length);
  for (let i = 0; i < 60 * 120 && s.phase !== "done"; i++) {
    s = advanceRun(s, 1 / 60);
    const a = bot(s);
    if (a) s = act(s, a);
  }
  return s;
}

describe("metro v6.1 — R2 neon flicker", () => {
  it("changes state at most every 333 ms (piecewise constant on NEON_STEP)", () => {
    expect(NEON_STEP).toBeGreaterThanOrEqual(1 / 3);
    expect(BLINK_STEP).toBeGreaterThanOrEqual(1 / 3);
    for (let k = 0; k < 40; k++) {
      let last = neonAmp(0, k, false);
      let lastChange = 0;
      for (let i = 1; i <= 3000; i++) {
        const t = i / 300; // 10 s sampled every 3.3 ms
        const v = neonAmp(t, k, false);
        if (v !== last) {
          expect(t - lastChange).toBeGreaterThanOrEqual(NEON_STEP - 1e-9);
          lastChange = t;
          last = v;
        }
      }
    }
  });
  it("is static under reduced motion (no flicker, still blink)", () => {
    for (let i = 0; i < 1000; i++) expect(neonAmp(i / 97, i % 7, true)).toBe(0);
    for (let i = 1; i < 60; i++) expect(blinkAlpha(i / 100, true)).toBe(0.55);
    let changes = 0;
    for (let i = 60; i > 0; i--) if (blinkAlpha(i / 100, false) !== blinkAlpha((i - 1) / 100 || 1e-9, false)) changes++;
    expect(changes).toBeLessThanOrEqual(2); // 0.6 s of invulnerability: 1/3 s steps
  });
});

describe("metro v6.1 — R3 countdown", () => {
  it("3, 2, 1, one second each, each digit once, then the run", () => {
    let s = newRun();
    const said: number[] = [];
    let was = 0;
    while (s.phase === "count") {
      const d = countdownDigit(s);
      if (d !== was) said.push(d);
      was = d;
      expect(s.z).toBe(0); // frozen: the street does not move during the countdown
      s = advanceRun(s, 1 / 60);
    }
    expect(said).toEqual([3, 2, 1]);
    expect(s.phase).toBe("run");
    expect(s.t).toBeCloseTo(RUN.countdown, 1);
    expect(act(newRun(), "left")).toEqual(newRun()); // controls ignored during the countdown
  });
  it("the start word and the strings exist in fr / en / es", () => {
    const id = (x: string) => x;
    expect(withV61(id)("Let’s go!")).toBe("Let’s go!");
    expect(V61_STRINGS.fr["Let’s go!"]).toBe("C’est parti !");
    expect(V61_STRINGS.es["Let’s go!"]).toBe("¡Vamos!");
    expect(Object.keys(V61_STRINGS.fr).sort()).toEqual(Object.keys(V61_STRINGS.es).sort());
  });
});

describe("metro v6.1 — coins and the seeded hook bots (metro-demo win | hurt | crash, seed, length)", () => {
  it("the validated level has 53 coins, never more", () => {
    expect(newRun().coins.length).toBe(METRO_MAX_COINS);
    for (let seed = 1; seed <= 50; seed++) expect(newRun(seed).coins.length).toBeLessThanOrEqual(METRO_MAX_COINS);
  });

  const due = (): GameState => {
    const s0 = E.createMatch([{ characterId: "aoi", dreamId: "cafe" }], 3, true);
    const p = { ...s0.players[0]!, turns: 11 };
    delete (p as { metroTurn?: number }).metroTurn;
    return { ...s0, screen: "play", phase: "idle", training: undefined, intro: false, players: [p] } as unknown as GameState;
  };
  const credit = (r: RunState) => {
    const s = due();
    const lives = r.outcome === "won" ? r.lives : 0;
    const n = E.reduce(s, { type: "MINIGAME", id: "metro", result: { lives, coins: r.coinN } });
    return n.players[0]!.cash - s.players[0]!.cash;
  };

  for (const [seed, length] of [[RUN.seed, RUN.length], [42, 80], [7, 120]] as const) {
    it(`seed ${seed}, ${length} m: win = 3 lives, hurt = 2 lives, crash = 0 (coins kept)`, () => {
      const win = play(seed, demoDriver("win")!, length);
      expect(win.outcome).toBe("won");
      expect(win.lives).toBe(3);
      expect(credit(win)).toBe(metroReward(3) + metroCoins(win.coinN) * METRO_COIN_VALUE);
      const hurt = play(seed, demoDriver("hurt")!, length);
      expect(hurt.outcome).toBe("won");
      expect(hurt.lives).toBe(2);
      expect(credit(hurt)).toBe(250 + hurt.coinN * METRO_COIN_VALUE);
      const crash = play(seed, demoDriver("crash")!, length);
      expect(crash.outcome).toBe("lost");
      expect(crash.lives).toBe(0);
      expect(credit(crash)).toBe(crash.coinN * METRO_COIN_VALUE);
      // deterministic for a seed
      expect(play(seed, demoDriver("win")!, length).coinN).toBe(win.coinN);
    });
  }
});
