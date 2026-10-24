/**
 * perf-ios bench (lots A and B). Measurement-only: every probe below is injected by
 * Playwright (addInitScript / CDP) into the page under test; nothing ships in the app.
 *
 *   node tools/perf/bench.mjs <webkit|chromium> <url> <tag> [out.json]
 *
 * Method (RES-3):
 * - frames: rAF deltas collected in-page; fps = frames / sum(deltas); jank50 = frames > 50 ms.
 * - longTasks: PerformanceObserver "longtask" (Chromium only), count and total ms.
 * - commits: React commits counted through a stub __REACT_DEVTOOLS_GLOBAL_HOOK__ (onCommitFiberRoot).
 * - layouts / styleRecalcs / heap: CDP Performance.getMetrics deltas (Chromium, CPU throttled x4).
 * - http: every response >= 400 is recorded (PERF-CA "0 404").
 * - imgKB_board: encoded image bytes transferred from first load until the board is idle.
 * - metro heap: JS heap after forced GC, after each of 3 consecutive Metro runs (R9).
 * Use tools/perf/median.mjs to reduce 3 runs to medians.
 */
const PW = process.env.PW_MODULE ?? "/usr/local/lib/pnpm/5/.pnpm/playwright@1.63.0-alpha-2026-08-31/node_modules/playwright/index.mjs";
const pw = await import(PW);
const [,, engine, URL, tag, OUT] = process.argv;
const fs = await import("node:fs");
const INIT = () => {
  const S = { f: [], lt: [], commits: 0 };
  window.__S = S;
  let last = 0;
  const tick = (t) => { if (last) S.f.push(t - last); last = t; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  try { new PerformanceObserver((l) => l.getEntries().forEach((e) => S.lt.push(e.duration))).observe({ type: "longtask", buffered: true }); } catch { /* WebKit: no longtask entries */ }
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = { supportsFiber: true, isDisabled: false, renderers: new Map(), inject(r) { this.renderers.set(1, r); return 1; }, onCommitFiberRoot() { S.commits++; }, onCommitFiberUnmount() {}, onPostCommitFiberRoot() {}, checkDCE() {} };
  window.__reset = () => { S.f = []; S.lt = []; S.commits = 0; last = 0; };
};
const b = engine === "webkit" ? await pw.webkit.launch() : await pw.chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const dev = pw.devices["iPhone 13"];
const ctx = await b.newContext(engine === "webkit" ? dev : { viewport: dev.viewport, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: dev.userAgent });
const p = await ctx.newPage();
await p.addInitScript(INIT);
if (process.env.EXP_DPR) await p.addInitScript((d) => Object.defineProperty(window, "devicePixelRatio", { get: () => d }), +process.env.EXP_DPR); // experiment only
const http = [];
p.on("response", (r) => { if (r.status() >= 400) http.push(`${r.status()} ${r.url().replace(/^https?:\/\/[^/]+/, "")}`); });
let cdp = null;
if (engine === "chromium") { cdp = await ctx.newCDPSession(p); await cdp.send("Performance.enable"); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 }); }
const metrics = async () => cdp ? Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value])) : {};
const out = { engine, tag, seg: {} };
async function seg(name, fn) {
  const m0 = await metrics();
  await p.evaluate(() => window.__reset && window.__reset());
  const t0 = Date.now();
  try { await fn(); } catch (e) { out.seg[name] = { err: String(e).slice(0, 120) }; return; }
  const s = await p.evaluate(() => window.__S || { f: [], lt: [], commits: 0 });
  const m1 = await metrics();
  const f = s.f.filter((x) => x < 2000).sort((a, b) => a - b);
  const sum = f.reduce((a, b) => a + b, 0);
  out.seg[name] = {
    ms: Date.now() - t0, frames: f.length, fps: f.length ? +(1000 * f.length / sum).toFixed(1) : 0,
    p95: f.length ? +f[Math.floor(f.length * .95)].toFixed(1) : 0, max: f.length ? +f[f.length - 1].toFixed(0) : 0,
    jank50: f.filter((x) => x > 50).length, longTasks: s.lt.length, longTaskMs: Math.round(s.lt.reduce((a, b) => a + b, 0)), commits: s.commits,
    ...(cdp ? { layouts: m1.LayoutCount - m0.LayoutCount, styleRecalcs: m1.RecalcStyleCount - m0.RecalcStyleCount, layoutMs: Math.round((m1.LayoutDuration - m0.LayoutDuration) * 1000), scriptMs: Math.round((m1.ScriptDuration - m0.ScriptDuration) * 1000), heapMB: +(m1.JSHeapUsedSize / 1e6).toFixed(1) } : {}),
  };
}
const W = (ms) => p.waitForTimeout(ms);
async function clear() {
  for (let i = 0; i < 8; i++) {
    const d = p.locator("[role=dialog]:visible button:visible");
    if (!(await d.count())) return;
    const skip = p.locator("[role=dialog]:visible button:visible", { hasText: /Passer|Continuer|OK|Fermer|Plus tard|Non/ }).first();
    await ((await skip.count()) ? skip : d.last()).click({ timeout: 2000 }).catch(() => {}); await W(400);
  }
}
if (process.env.ONLY_HOME) { await p.goto(URL); await p.evaluate(() => { localStorage.clear(); localStorage.setItem("gameflow-tutorial-seen", "training-v1"); localStorage.setItem("gameflow-intro-seen", "1"); localStorage.setItem("gameflow-lang", "fr"); }); await p.goto(URL); await W(500); await p.locator(".startrow .btn.gold, .startrow .gold").first().click(); await W(600); await clear(); }
if (!process.env.ONLY_HOME) await seg("load", async () => {
  await p.goto(URL);
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem("gameflow-tutorial-seen", "training-v1"); localStorage.setItem("gameflow-intro-seen", "1"); localStorage.setItem("gameflow-lang", "fr"); });
  await p.goto(URL, { waitUntil: "load" }); await W(1500);
  out.nav = await p.evaluate(() => { const n = performance.getEntriesByType("navigation")[0]; const r = performance.getEntriesByType("resource"); return { domContentLoaded: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd), resources: r.length, jsKB: Math.round(r.filter((x) => /\.js/.test(x.name)).reduce((a, x) => a + (x.encodedBodySize || x.transferSize || 0), 0) / 1024), imgKB: Math.round(r.filter((x) => /\.(jpe?g|png|webp)/.test(x.name)).reduce((a, x) => a + (x.encodedBodySize || 0), 0) / 1024) }; });
});
if (!process.env.ONLY_HOME) await seg("idle_board", async () => {
  await p.locator(".startrow .btn.gold, .startrow .gold").first().click(); await W(600);
  for (let i = 0; i < 4; i++) { const x = p.locator(".card-sheet .btn-gold").first(); if (await x.count()) { await x.click().catch(() => {}); await W(300); } else break; }
  await W(3000);
  out.imgKB_board = await p.evaluate(() => Math.round(performance.getEntriesByType("resource").filter((x) => /\.(jpe?g|png|webp)(\?|$)/i.test(x.name)).reduce((a, x) => a + (x.encodedBodySize || x.transferSize || 0), 0) / 1024));
});
if (!process.env.ONLY_HOME) await seg("dice_move", async () => {
  for (let i = 0; i < 2; i++) {
    await clear();
    await p.getByRole("button", { name: "Lancer le dé" }).click({ timeout: 5000 });
    await W(4000); await clear();
  }
});
if (!process.env.ONLY_HOME) await seg("menus", async () => {
  for (const n of ["Journée", "Activités", "Registre", "Menu", "Statut"]) { await clear(); await p.getByRole("button", { name: n, exact: true }).first().click({ timeout: 4000 }).catch(() => {}); await W(800); await p.keyboard.press("Escape"); await W(400); }
  await clear();
});
async function metroRun() {
  await clear(); await p.getByRole("button", { name: "Activités", exact: true }).first().click({ timeout: 4000 }); await W(800);
  const tabs = p.locator("[role=tab]:visible", { hasText: /Jeux|Mini/ }); if (await tabs.count()) { await tabs.first().click(); await W(400); }
  await p.locator("button.v3-game:visible").first().click({ timeout: 5000 }); await W(800);
  for (let k = 0; k < 3; k++) { const s = p.locator("button:visible", { hasText: /Commencer|Jouer|Go|Partir/ }).first(); if (await s.count()) { await s.click().catch(() => {}); await W(500); } }
  if (cdp) { await cdp.send("Profiler.enable"); await cdp.send("Profiler.start"); }
  for (let i = 0; i < 16; i++) { await p.keyboard.press(i % 2 ? "ArrowLeft" : "ArrowRight"); await p.mouse.click(195, 500).catch(() => {}); await W(400); }
  if (cdp) { const { profile } = await cdp.send("Profiler.stop"); const self = {}; const dt = profile.timeDeltas; const byId = new Map(profile.nodes.map((n) => [n.id, n])); profile.samples.forEach((id, i) => { const n = byId.get(id); const k = `${n.callFrame.functionName || "(anon)"}@${n.callFrame.url.split("/").pop()}:${n.callFrame.lineNumber}`; self[k] = (self[k] || 0) + (dt[i] || 0) / 1000; }); out.metroTop = Object.entries(self).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => `${k} ${Math.round(v)}ms`); }
  out.metroCanvas = await p.evaluate(() => { const c = document.querySelector("canvas"); return c ? [c.width, c.height, c.clientWidth, c.clientHeight] : null; });
}
const gcHeap = async () => { if (!cdp) return null; await cdp.send("HeapProfiler.collectGarbage").catch(() => {}); return +((await metrics()).JSHeapUsedSize / 1e6).toFixed(1); };
async function leaveMetro() { for (let i = 0; i < 4; i++) { await p.keyboard.press("Escape").catch(() => {}); const back = p.locator("button:visible", { hasText: /Retour|Continuer|Quitter|Fermer/ }).first(); if (await back.count()) await back.click({ timeout: 1500 }).catch(() => {}); await W(400); } await clear(); }
if (!process.env.ONLY_HOME) {
  out.metroHeap = [await gcHeap()];
  await seg("metro_runner", metroRun);
  if (cdp && !process.env.SKIP_METRO_REPEAT) {
    for (let r = 2; r <= 3; r++) { await W(16 * 400); await leaveMetro(); out.metroHeap.push(await gcHeap()); await seg(`metro_runner${r}`, metroRun); }
    await W(16 * 400); await leaveMetro(); out.metroHeap.push(await gcHeap());
  }
}
await p.keyboard.press("Escape").catch(()=>{});
await seg("home", async () => {
  const sv = await p.evaluate(() => { const sv = JSON.parse(localStorage.getItem("gameflow-save-v1")); const pl = sv.players[0]; Object.assign(pl, { cash: 3000, housing: { kichijoji: { slots: {} } }, homeCurrent: "kichijoji", furniture: { sofa: 1, "tv-stand": 1, "dining-table": 1, futon: 1, desk: 1 }, homeDay: { turn: pl.turns, used: 0, done: {} } }); return JSON.stringify(sv); });
  await p.addInitScript((j) => { if (!sessionStorage.getItem("seeded")) { sessionStorage.setItem("seeded", "1"); localStorage.setItem("gameflow-save-v1", j); } }, sv);
  await p.goto(URL); await W(800);
  await p.locator(".startrow button").first().click(); await W(800);
  await clear(); await p.getByRole("button", { name: "Journée", exact: true }).first().click({ timeout: 4000 }); await W(400);
  await p.locator('[role="tab"]', { hasText: "Maison" }).first().click(); await W(300);
  if (!(await p.locator("[data-home-enter]").count())) { await p.screenshot({ path: `/tmp/nohome-${engine}.png` }); throw new Error("no home: " + (await p.evaluate(() => [...document.querySelectorAll("[role=tab]")].map((x) => x.textContent.trim()).join("|")))); }
  await p.locator("[data-home-enter]").first().click(); await W(2000);
  const act = p.locator(".ho-acts button:not([data-locked]):not([disabled]), [data-act]:not([data-locked]):not([disabled])").first();
  if (await act.count()) { await act.click(); await W(4500); const up = p.locator("button:visible", { hasText: /Se lever/ }).first(); if (await up.count()) await up.click({ timeout: 5000 }).catch(() => {}); await W(3500); }
  for (const r of ["cuisine", "chambre", "salon"]) { const x = p.locator(`[data-room="${r}"]`); if (await x.count()) { await x.click({ timeout: 6000 }).catch(() => {}); await W(1500); } }
  out.videos = await p.evaluate(() => document.querySelectorAll("video").length);
});
out.heapEnd = (await metrics()).JSHeapUsedSize ? +((await metrics()).JSHeapUsedSize / 1e6).toFixed(1) : null;
out.http = http;
const json = JSON.stringify(out);
if (OUT) fs.writeFileSync(OUT, json);
console.log(json);
await b.close();
