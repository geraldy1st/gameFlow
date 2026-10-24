/**
 * Before/after captures for QA and Mirage (test only).
 *   node tools/perf/shots.mjs <url> <tag> <outdir>
 * iPhone 13 (390x844, DPR 3, touch => @media (hover: none)): board, the « Journée » menu and a
 * deal/overlay modal (blur vs no blur), Metro at ~2 s / 8 s / 14 s.
 */
import { mkdirSync } from "node:fs";
const PW = process.env.PW_MODULE ?? "/usr/local/lib/pnpm/5/.pnpm/playwright@1.63.0-alpha-2026-08-31/node_modules/playwright/index.mjs";
const pw = await import(PW);
const [, , URL, TAG, OUT] = process.argv;
mkdirSync(OUT, { recursive: true });
const b = await pw.chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const ctx = await b.newContext({ ...pw.devices["iPhone 13"], defaultBrowserType: undefined, reducedMotion: "reduce" });
const p = await ctx.newPage();
const W = (ms) => p.waitForTimeout(ms);
const shot = (n) => p.screenshot({ path: `${OUT}/${TAG}-${n}.png` });
await p.goto(URL);
await p.evaluate(() => { localStorage.clear(); localStorage.setItem("gameflow-tutorial-seen", "training-v1"); localStorage.setItem("gameflow-intro-seen", "1"); localStorage.setItem("gameflow-lang", "fr"); });
await p.goto(URL); await W(800);
await shot("01-menu");
await p.locator(".startrow .btn.gold, .startrow .gold").first().click(); await W(900);
await shot("02-opening-card-overlay");
for (let i = 0; i < 4; i++) { const x = p.locator(".card-sheet .btn-gold").first(); if (await x.count()) { await x.click().catch(() => {}); await W(300); } else break; }
for (let i = 0; i < 6; i++) { const d = p.locator("[role=dialog]:visible button:visible"); if (!(await d.count())) break; await d.last().click().catch(() => {}); await W(300); }
await W(500); await shot("03-board");
await p.getByRole("button", { name: "Statut", exact: true }).first().click().catch(() => {}); await W(900); await shot("04-status-modal"); await p.keyboard.press("Escape"); await W(400);
await p.getByRole("button", { name: "Journée", exact: true }).first().click().catch(() => {}); await W(900); await shot("05-journee-menu"); await p.keyboard.press("Escape"); await W(400);
await p.getByRole("button", { name: "Registre", exact: true }).first().click().catch(() => {}); await W(900); await shot("06-registre"); await p.keyboard.press("Escape"); await W(400);
// Metro: full motion for the run itself
await ctx.close();
const ctx2 = await b.newContext({ ...pw.devices["iPhone 13"], defaultBrowserType: undefined });
const q = await ctx2.newPage();
await q.goto(URL);
await q.evaluate(() => { localStorage.clear(); localStorage.setItem("gameflow-tutorial-seen", "training-v1"); localStorage.setItem("gameflow-intro-seen", "1"); localStorage.setItem("gameflow-lang", "fr"); });
await q.goto(URL); await q.waitForTimeout(500);
await q.locator(".startrow .btn.gold, .startrow .gold").first().click(); await q.waitForTimeout(600);
for (let i = 0; i < 4; i++) { const x = q.locator(".card-sheet .btn-gold").first(); if (await x.count()) { await x.click().catch(() => {}); await q.waitForTimeout(300); } else break; }
for (let i = 0; i < 6; i++) { const d = q.locator("[role=dialog]:visible button:visible"); if (!(await d.count())) break; await d.last().click().catch(() => {}); await q.waitForTimeout(300); }
await q.getByRole("button", { name: "Activités", exact: true }).first().click(); await q.waitForTimeout(800);
const tabs = q.locator("[role=tab]:visible", { hasText: /Jeux|Mini/ }); if (await tabs.count()) { await tabs.first().click(); await q.waitForTimeout(400); }
await q.screenshot({ path: `${OUT}/${TAG}-07-activites.png` });
await q.locator("button.v3-game:visible").first().click({ timeout: 5000 }); await q.waitForTimeout(800);
for (let k = 0; k < 3; k++) { const s = q.locator("button:visible", { hasText: /Commencer|Jouer|Go|Partir/ }).first(); if (await s.count()) { await s.click().catch(() => {}); await q.waitForTimeout(500); } }
const t0 = Date.now();
for (const [n, at] of [["08-metro-2s", 2000], ["09-metro-8s", 8000], ["10-metro-14s", 14000]]) { await q.waitForTimeout(Math.max(0, at - (Date.now() - t0))); await q.screenshot({ path: `${OUT}/${TAG}-${n}.png` }); }
await b.close();
console.log("ok", TAG);
