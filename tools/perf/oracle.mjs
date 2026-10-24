/**
 * Differential oracle (RES-4 / PERF-CA15): same seed, same actions, same final game state.
 *   node tools/perf/oracle.mjs <url> <out.json> <fixture.json> [engine=chromium]
 * If <fixture.json> does not exist it is created from a fresh game on <url> (the engine's
 * seed lives in the save, so every target then starts from the very same state).
 * Math.random is replaced by a seeded PRNG (mulberry32, seed 20261024) and Date is frozen-forward,
 * both injected by Playwright (test only). Runs: new game, 2 rolls with their moves, 5 menus
 * opened/closed. Writes the saved game (localStorage "gameflow-save-v1") with volatile time
 * fields removed. Compare two outputs with `cmp` or `diff`.
 */
import { writeFileSync } from "node:fs";
const PW = process.env.PW_MODULE ?? "/usr/local/lib/pnpm/5/.pnpm/playwright@1.63.0-alpha-2026-08-31/node_modules/playwright/index.mjs";
const pw = await import(PW);
const [, , URL, OUT, FIX, engine = "chromium"] = process.argv;
const { existsSync, readFileSync } = await import("node:fs");
const b = engine === "webkit" ? await pw.webkit.launch() : await pw.chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const ctx = await b.newContext({ ...pw.devices["iPhone 13"], ...(engine === "webkit" ? {} : { defaultBrowserType: undefined }) });
await ctx.addInitScript(() => {
  let a = 20261024;
  Math.random = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const T0 = Date.parse("2026-10-24T12:00:00Z"); const real = Date.now.bind(Date); const start = real();
  Date.now = () => T0 + (real() - start);
});
const p = await ctx.newPage();
const errors = []; p.on("pageerror", (e) => errors.push(e.message));
const W = (ms) => p.waitForTimeout(ms);
async function clear() {
  for (let i = 0; i < 8; i++) {
    const d = p.locator("[role=dialog]:visible button:visible");
    if (!(await d.count())) return;
    const skip = p.locator("[role=dialog]:visible button:visible", { hasText: /Passer|Continuer|OK|Fermer|Plus tard|Non/ }).first();
    await ((await skip.count()) ? skip : d.last()).click({ timeout: 2000 }).catch(() => {}); await W(400);
  }
}
const prefs = () => { localStorage.clear(); localStorage.setItem("gameflow-tutorial-seen", "training-v1"); localStorage.setItem("gameflow-intro-seen", "1"); localStorage.setItem("gameflow-lang", "fr"); };
if (!existsSync(FIX)) {
  await p.goto(URL); await p.evaluate(prefs); await p.goto(URL); await W(600);
  await p.locator(".startrow .btn.gold, .startrow .gold").first().click(); await W(600);
  for (let i = 0; i < 4; i++) { const x = p.locator(".card-sheet .btn-gold").first(); if (await x.count()) { await x.click().catch(() => {}); await W(300); } else break; }
  await clear(); await W(500);
  writeFileSync(FIX, await p.evaluate(() => localStorage.getItem("gameflow-save-v1")));
}
const fixture = readFileSync(FIX, "utf8");
await p.goto(URL); await p.evaluate(prefs); await p.evaluate((j) => localStorage.setItem("gameflow-save-v1", j), fixture);
await p.goto(URL); await W(800);
await p.locator(".startrow button").first().click(); await W(800); await clear();
for (let i = 0; i < 2; i++) { await clear(); await p.getByRole("button", { name: "Lancer le dé" }).click({ timeout: 5000 }); await W(4000); await clear(); }
for (const n of ["Journée", "Activités", "Registre", "Menu", "Statut"]) { await clear(); await p.getByRole("button", { name: n, exact: true }).first().click({ timeout: 4000 }).catch(() => {}); await W(600); await p.keyboard.press("Escape"); await W(300); }
await clear(); await W(500);
const save = await p.evaluate(() => localStorage.getItem("gameflow-save-v1"));
const strip = (o) => (Array.isArray(o) ? o.map(strip) : o && typeof o === "object" ? Object.fromEntries(Object.entries(o).filter(([k]) => !/^(savedAt|updatedAt|createdAt|ts|time|sfxId)$/.test(k)).map(([k, v]) => [k, strip(v)])) : o);
const state = strip(JSON.parse(save));
writeFileSync(OUT, JSON.stringify({ errors, state }, null, 1));
console.log(`players=${state.players?.length} turns=${state.players?.[0]?.turns} pos=${state.players?.[0]?.position} cash=${state.players?.[0]?.cash} errors=${errors.length}`);
await b.close();
