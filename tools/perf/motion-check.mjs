/**
 * Q2 / PERF-CA13 checks (test only).
 *   node tools/perf/motion-check.mjs <url> [engine=chromium]
 * 1. Active turn: the active pawn's idle animation is running.
 * 2. A modal opens: it is paused; after closing: running again (R4 resume).
 * 3. Tab hidden then visible: running again.
 * 4. During a roll: the pawn never stops; the die flickers (DOM) and settles on the engine's value.
 * 5. prefers-reduced-motion: no infinite animation at all; the die shows its final face at once.
 */
const PW = process.env.PW_MODULE ?? "/usr/local/lib/pnpm/5/.pnpm/playwright@1.63.0-alpha-2026-08-31/node_modules/playwright/index.mjs";
const pw = await import(PW);
const [, , URL, engine = "chromium"] = process.argv;
const b = engine === "webkit" ? await pw.webkit.launch() : await pw.chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const results = [];
const ok = (name, pass, info = "") => { results.push({ name, pass, info }); console.log(`${pass ? "PASS" : "FAIL"} ${name} ${info}`); };
async function start(reduced) {
  const ctx = await b.newContext({ ...pw.devices["iPhone 13"], ...(engine === "webkit" ? {} : { defaultBrowserType: undefined }), reducedMotion: reduced ? "reduce" : "no-preference" });
  const p = await ctx.newPage();
  await p.goto(URL);
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem("gameflow-tutorial-seen", "training-v1"); localStorage.setItem("gameflow-intro-seen", "1"); localStorage.setItem("gameflow-lang", "fr"); });
  await p.goto(URL); await p.waitForTimeout(500);
  await p.locator(".startrow .btn.gold, .startrow .gold").first().click(); await p.waitForTimeout(500);
  for (let i = 0; i < 4; i++) { const x = p.locator(".card-sheet .btn-gold").first(); if (await x.count()) { await x.click().catch(() => {}); await p.waitForTimeout(300); } else break; }
  for (let i = 0; i < 6; i++) { const d = p.locator("[role=dialog]:visible button:visible"); if (!(await d.count())) break; await d.last().click().catch(() => {}); await p.waitForTimeout(300); }
  return p;
}
const idle = (p) => p.evaluate(() => document.getAnimations().filter((a) => a.animationName === "idle").map((a) => a.playState));
const infinite = (p) => p.evaluate(() => document.getAnimations().filter((a) => a.effect?.getTiming().iterations === Infinity && a.playState === "running").map((a) => a.animationName));
let p = await start(false);
ok("active pawn bobs in active turn", (await idle(p)).includes("running"), JSON.stringify(await idle(p)));
await p.getByRole("button", { name: "Journée", exact: true }).first().click(); await p.waitForTimeout(500);
ok("paused while a modal is open", (await idle(p)).every((s) => s === "paused") && (await idle(p)).length > 0, JSON.stringify(await idle(p)));
await p.keyboard.press("Escape"); await p.waitForTimeout(500);
ok("resumes after the modal closes", (await idle(p)).includes("running"), JSON.stringify(await idle(p)));
await p.evaluate(() => { Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" }); document.dispatchEvent(new Event("visibilitychange")); });
await p.waitForTimeout(200);
await p.evaluate(() => { Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" }); document.dispatchEvent(new Event("visibilitychange")); });
await p.waitForTimeout(300);
ok("running after tab hidden then visible", (await idle(p)).includes("running"), JSON.stringify(await idle(p)));
const faces = [];
await p.getByRole("button", { name: "Lancer le dé" }).click();
const roll = await p.evaluate(() => new Promise((r) => { const seen = new Set(); const st = new Set(); const t0 = performance.now(); const k = () => { const d = document.querySelector(".bdie"); if (d) seen.add([...d.children].map((i) => (i.classList.contains("o") ? 1 : 0)).join("")); document.getAnimations().filter((a) => a.animationName === "idle").forEach((a) => st.add(a.playState)); if (performance.now() - t0 < 600) requestAnimationFrame(k); else r({ faces: seen.size, states: [...st] }); }; requestAnimationFrame(k); }));
ok("die flickers during the roll (DOM)", roll.faces > 1, `faces=${roll.faces}`);
ok("active pawn never stops during the roll", !roll.states.includes("paused"), JSON.stringify(roll.states));
await p.waitForTimeout(800);
const settled = await p.evaluate(() => { const d = document.querySelector(".bdie"); const lit = [...d.children].filter((i) => i.classList.contains("o")).length; return { lit, label: d.getAttribute("aria-label") }; });
const n = +(settled.label.match(/\d/) || [0])[0];
ok("die settles on the engine value", settled.lit === n, JSON.stringify(settled));
faces.push(settled);
await p.context().close();
p = await start(true);
ok("reduced motion: no infinite animation", (await infinite(p)).length === 0, JSON.stringify(await infinite(p)));
await p.getByRole("button", { name: "Lancer le dé" }).click();
const rm = await p.evaluate(() => new Promise((r) => { const seen = new Set(); const t0 = performance.now(); const k = () => { const d = document.querySelector(".bdie"); if (d) seen.add([...d.children].map((i) => (i.classList.contains("o") ? 1 : 0)).join("")); if (performance.now() - t0 < 600) requestAnimationFrame(k); else r(seen.size); }; requestAnimationFrame(k); }));
ok("reduced motion: die shows one face only (final)", rm === 1, `faces=${rm}`);
await b.close();
process.exit(results.every((r) => r.pass) ? 0 : 1);
