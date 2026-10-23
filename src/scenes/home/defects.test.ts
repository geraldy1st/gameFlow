import { describe, expect, it, vi } from "vitest";
import { HomePlayer } from "./player";
import { pageOf } from "../../components/game/v3/page-of";

const vid = () => ({ paused: true, pause: vi.fn(function (this: { paused: boolean }) { this.paused = true; }), play: vi.fn(function (this: { paused: boolean }) { this.paused = false; return Promise.resolve(); }), classList: { toggle() {}, add() {}, remove() {} }, style: {} }) as unknown as HTMLVideoElement;

describe("DEF-HOME-01 visibility", () => {
  it("pauses when hidden and resumes the loop when visible", () => {
    const a = vid(), b = vid();
    const p = new HomePlayer(a, b, false);
    p.phase = "loop";
    p.setVisible(false);
    expect(a.pause).toHaveBeenCalled();
    expect(b.pause).toHaveBeenCalled();
    p.setVisible(true);
    expect((a.play as ReturnType<typeof vi.fn>).mock.calls.length + (b.play as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });
  it("does not resume outside the loop or with reduced motion", () => {
    const a = vid(), b = vid();
    const p = new HomePlayer(a, b, false);
    p.setVisible(true);
    const r = new HomePlayer(a, b, true);
    r.phase = "loop";
    r.setVisible(true);
    expect(a.play).not.toHaveBeenCalled();
    expect(b.play).not.toHaveBeenCalled();
  });
});

describe("DEF-HOME-02 page of focused item", () => {
  it("maps index to page", () => {
    expect(pageOf(0, 4)).toBe(0);
    expect(pageOf(3, 4)).toBe(0);
    expect(pageOf(4, 4)).toBe(1);
    expect(pageOf(11, 3)).toBe(3);
    expect(pageOf(5, 0)).toBe(5);
  });
});

describe("DEF-HOME-04 focus after an action", () => {
  const btn = (attrs: Record<string, string>, disabled = false) => ({ disabled, dataset: { act: attrs.act }, attrs });
  const root = (acts: ReturnType<typeof btn>[], rooms: ReturnType<typeof btn>[]) => ({
    querySelectorAll: () => acts,
    querySelector: (sel: string) => rooms.find((r) => !r.disabled && (!sel.includes("aria-pressed") || r.attrs.pressed === "true")) ?? null,
  }) as unknown as ParentNode;
  const rooms = [btn({ room: "salon" }), btn({ room: "chambre", pressed: "true" })];
  it("keeps the action when still enabled", async () => {
    const { focusAfterAction } = await import("./focus");
    const a = btn({ act: "lire" });
    expect(focusAfterAction(root([a, btn({ act: "dormir" })], rooms), "lire")).toBe(a);
  });
  it("moves to the next enabled action (wrapping) when the action is now disabled", async () => {
    const { focusAfterAction } = await import("./focus");
    const d = btn({ act: "dormir" });
    expect(focusAfterAction(root([d, btn({ act: "lire" }, true)], rooms), "lire")).toBe(d);
  });
  it("falls back to the current room selector, never null", async () => {
    const { focusAfterAction } = await import("./focus");
    expect(focusAfterAction(root([btn({ act: "canape" }, true), btn({ act: "tele" }, true)], rooms), "canape")).toBe(rooms[1]);
  });
});
