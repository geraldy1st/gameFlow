/**
 * Refacto batch 5bis: wider fingerprint policies (see __tests__/fp-policy.ts).
 * - v1 = the original policy, gives 844f62971aa0030a since the payday invite (was c5b22799e4ee85a3) (regression, same as engine-fingerprint.test.ts).
 * - v2 = v1 + goods / home / circle / tutorial actions at a low weight: the reference for batches 6 to 8.
 * - goods = the same actions at a strong weight.
 * A deliberate behaviour change updates V2 / GOODS here in its own commit, with the reason (Crypto recomputes them
 * with engine-fp.mjs patched by /workspace/home-plan/engine-fp-policy.patch).
 */
import { describe, expect, it } from "vitest";
import * as E from "./engine";
import { fingerprint } from "./__tests__/fp-policy";

// payday-friends (Oct 2026, payday invite, docs/tutorial/RULES.md §14): new EXPECTED on purpose.
// Before: v1 102806 c5b22799e4ee85a3, v2 113072 b1e4c5091917bb8b, goods 150459 dc218d2a0d1a37a3.
const V1 = { games: 200, states: 93335, chainAll: "844f62971aa0030a" };
// home-aoi (Oct 2026): the policy draws the Chez Aoi actions; v1 unchanged. Before: v2 96474 394ef915bd1f65bc,
// goods 125714 e82698fd19744dd9.
const V2 = { games: 200, states: 97743, chainAll: "252d74648c1362ea" };
const GOODS = { games: 200, states: 119053, chainAll: "f115ba6d98c443e0" };
const HOME = { games: 200, states: 119799, chainAll: "947b511f7be9de6f" };
const EXTRA = ["BUY_GOOD", "BUY_CLOTH", "WEAR", "BUY_HOME", "TOGGLE_HOME", "HOUSE", "CIRCLE", "SKIP_TRAINING"];
const HOME_EXTRA = ["BUY_HOUSING", "BUY_FURNITURE", "SELL_FURNITURE", "HOME_PLACE", "HOME_STORE", "HOME_ACT"];
// HOME_ENTER is drawn but never changes the state while a single housing is in stock (nothing to switch to).

const strip = ({ games, states, chainAll }: { games: number; states: number; chainAll: string }) => ({ games, states, chainAll });

describe("engine fingerprint policies (batch 5bis)", () => {
  it("v1 (original policy) gives 844f62971aa0030a (payday invite)", () => {
    const f = fingerprint(E, "v1");
    expect(strip(f)).toEqual(V1);
    for (const t of [...EXTRA, ...HOME_EXTRA, "HOME_ENTER"]) expect(f.effective[t] ?? 0, t).toBe(0);
  }, 120_000);

  it("v2 (low-weight goods / home / circle / tutorial)", () => {
    const f = fingerprint(E, "v2");
    expect(strip(f)).toEqual(V2);
    for (const t of ["BUY_GOOD", "BUY_CLOTH", "WEAR", "BUY_HOME", "HOUSE", "CIRCLE", "SKIP_TRAINING"]) expect(f.effective[t] ?? 0, t).toBeGreaterThan(0);
  }, 120_000);

  it("goods (strong weight): every extra action changes the state somewhere", () => {
    const f = fingerprint(E, "goods");
    expect(strip(f)).toEqual(GOODS);
    for (const t of EXTRA) expect(f.effective[t] ?? 0, t).toBeGreaterThan(0);
  }, 120_000);

  it("home (strong weight, Chez Aoi actions only): every home action changes the state somewhere", () => {
    const f = fingerprint(E, "home");
    expect(strip(f)).toEqual(HOME);
    for (const t of HOME_EXTRA) expect(f.effective[t] ?? 0, t).toBeGreaterThan(0);
  }, 120_000);
});
