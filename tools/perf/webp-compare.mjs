/**
 * RES-5: JPEG 1600 px vs WebP 800 px, side by side, at DPR 3 (iPhone 13), at the widest size the
 * game shows them (full-width art ~ 358 css px = 1074 physical px) plus a 3x crop of the face.
 *   node tools/perf/webp-compare.mjs <url-base> <outdir>   (url-base: .../gameFlow/)
 */
import { mkdirSync } from "node:fs";
const PW = process.env.PW_MODULE ?? "/usr/local/lib/pnpm/5/.pnpm/playwright@1.63.0-alpha-2026-08-31/node_modules/playwright/index.mjs";
const pw = await import(PW);
const [, , BASE, OUT] = process.argv;
mkdirSync(OUT, { recursive: true });
const files = ["portraits/custom/f-deep-auburn.jpg", "portraits/custom/m-fair-blonde.jpg", "portraits/custom/x-warm-brown.jpg", "art/big.jpg", "trophies/beach.jpg"];
const b = await pw.chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
const p = await ctx.newPage();
await p.goto(BASE);
for (const f of process.env.FILES ? process.env.FILES.split(",") : files) {
  const jpg = `${BASE}game/${f}`, webp = jpg.replace(/\.jpg$/, ".webp");
  await p.setContent(`<body style="margin:0;background:#fff;font:12px sans-serif"><div style="display:flex;flex-direction:column;gap:4px;padding:4px">
  <b>JPEG 1600 · ${f}</b><img src="${jpg}" style="width:382px">
  <b>WebP 800</b><img src="${webp}" style="width:382px"></div></body>`);
  await p.waitForLoadState("networkidle"); await p.waitForTimeout(300);
  const ok = await p.evaluate(() => [...document.images].every((i) => i.naturalWidth > 0));
  await p.screenshot({ path: `${OUT}/cmp-${f.replace(/\//g, "_").replace(/\.jpg$/, "")}.png`, fullPage: true });
  await p.setContent(`<body style="margin:0;display:flex;gap:4px"><div style="width:190px;height:420px;overflow:hidden"><img src="${jpg}" style="width:570px;margin:-60px 0 0 -190px"></div><div style="width:190px;height:420px;overflow:hidden"><img src="${webp}" style="width:570px;margin:-60px 0 0 -190px"></div></body>`);
  await p.waitForLoadState("networkidle"); await p.waitForTimeout(300);
  await p.screenshot({ path: `${OUT}/zoom3x-${f.replace(/\//g, "_").replace(/\.jpg$/, "")}.png` });
  console.log(f, ok ? "loaded" : "MISSING");
}
await b.close();
