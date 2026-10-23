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
// home-v1 (23/10/2026, Aoi apartment: 8 furniture, 8 actions, no placement): new v2 / goods / home EXPECTED on purpose; v1 unchanged.
// Before: v1 102806 c5b22799e4ee85a3, v2 113072 b1e4c5091917bb8b, goods 150459 dc218d2a0d1a37a3.
const V1 = { games: 200, states: 93335, chainAll: "844f62971aa0030a" };
// home-aoi (Oct 2026): the policy draws the Chez Aoi actions; v1 unchanged. Before: v2 96474 394ef915bd1f65bc,
// goods 125714 e82698fd19744dd9.
const V2 = { games: 200, states: 97734, chainAll: "43fa7281563ccb83" };
const GOODS = { games: 200, states: 122121, chainAll: "e64d226c6b39ff79" };
const HOME = { games: 200, states: 132196, chainAll: "69697a232d57fd07" };
const EXTRA = ["BUY_GOOD", "BUY_CLOTH", "WEAR", "BUY_HOME", "TOGGLE_HOME", "HOUSE", "CIRCLE", "SKIP_TRAINING"];
// home-v1: HOME_PLACE / HOME_STORE are refused (fixed layout), so they must never change the state.
const HOME_EXTRA = ["BUY_HOUSING", "BUY_FURNITURE", "SELL_FURNITURE", "HOME_ACT"];
const HOME_REFUSED = ["HOME_PLACE", "HOME_STORE"];
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
    for (const t of HOME_REFUSED) expect(f.effective[t] ?? 0, t).toBe(0);
  }, 120_000);
});
