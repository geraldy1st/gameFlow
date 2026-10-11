// Port of the mockup's v3/format.test.cjs (9 tests) to Vitest.
import { describe, expect, it } from "vitest";
import { formatCompact as f, levelState, moneyFull, money, suffix } from "./format-compact";

describe("formatCompact / money / levelState (v3)", () => {
  it("under 1,000: integer as is", () => {
    expect(f(0)).toBe("0");
    expect(f(7)).toBe("7");
    expect(f(999)).toBe("999");
    expect(f(999.99)).toBe("999");
  });
  it("exact K, M, B, T", () => {
    expect(f(1000)).toBe("1K");
    expect(f(1e6)).toBe("1M");
    expect(f(1e9)).toBe("1B");
    expect(f(1e12)).toBe("1T");
  });
  it("one decimal, truncated, no trailing zero", () => {
    expect(f(1200)).toBe("1.2K");
    expect(f(1250)).toBe("1.2K");
    expect(f(1999)).toBe("1.9K");
    expect(f(1050)).toBe("1K");
    expect(f(6450)).toBe("6.4K");
    expect(f(999999)).toBe("999.9K");
    expect(f(1234567)).toBe("1.2M");
    expect(f(25_600_000_000)).toBe("25.6B");
  });
  it("beyond T: aa, ab … az, ba", () => {
    expect(f(1e15)).toBe("1aa");
    expect(f(1e18)).toBe("1ab");
    expect(f(2.5e15)).toBe("2.5aa");
    expect(suffix(5)).toBe("aa");
    expect(suffix(30)).toBe("az");
    expect(suffix(31)).toBe("ba");
    expect(suffix(5 + 676 - 1)).toBe("zz");
    expect(suffix(5 + 676)).toBe("aaa");
  });
  it("very large numbers and bigint", () => {
    expect(f(1e21)).toBe("1ac");
    expect(f(1e300)).toBe("1" + suffix(100));
    expect(f(10n ** 2100n)).toBe("1" + suffix(700));
    expect(f(1234n * 10n ** 2100n)).toBe("1.2" + suffix(701));
  });
  it("negatives, options, invalid input", () => {
    expect(f(-1500)).toBe("-1.5K");
    expect(f(-12)).toBe("-12");
    expect(f(1500, { sep: "," })).toBe("1,5K");
    expect(f(1234, { decimals: 2 })).toBe("1.23K");
    expect(f(NaN)).toBe("0");
    expect(f(Infinity)).toBe("∞");
    expect(money(6450)).toBe("6.4K $");
  });
  it("moneyFull: narrow space and sign", () => {
    expect(moneyFull(6450)).toBe("6\u202F450\u00A0$");
    expect(moneyFull(2340, true)).toBe("+2\u202F340\u00A0$");
    expect(moneyFull(-2580)).toBe("−2\u202F580\u00A0$");
  });
  it("linear levelState: 100 % → level +1, bar back to 0", () => {
    expect(levelState(0)).toEqual({ level: 1, into: 0, need: 100, ratio: 0 });
    expect(levelState(99)).toEqual({ level: 1, into: 99, need: 100, ratio: 0.99 });
    expect(levelState(100)).toEqual({ level: 2, into: 0, need: 100, ratio: 0 });
    expect(levelState(1e15).level).toBe(1e13 + 1);
  });
  it("geometric levelState, no cap", () => {
    const o = { base: 100, growth: 1.5 };
    expect(levelState(99, o).level).toBe(1);
    expect(levelState(100, o).level).toBe(2);
    expect(levelState(249, o).level).toBe(2);
    expect(levelState(250, o).level).toBe(3);
    const s = levelState(250, o);
    expect(s.into).toBe(0);
    expect(s.need).toBe(225);
    const huge = levelState(1e300, o);
    expect(huge.level > 1600 && huge.ratio >= 0 && huge.ratio < 1).toBe(true);
  });
});
