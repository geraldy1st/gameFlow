/**
 * Reduce N bench runs to medians and compare a candidate against a reference.
 *   node tools/perf/median.mjs <ref1.json,ref2.json,...> <cand1.json,...> [label]
 * Prints a markdown table (median of each metric per segment) with the relative gain.
 */
import { readFileSync } from "node:fs";
const [, , refArg, candArg, label = ""] = process.argv;
const load = (a) => a.split(",").map((f) => JSON.parse(readFileSync(f, "utf8")));
const med = (xs) => { const v = xs.filter((x) => typeof x === "number" && Number.isFinite(x)).sort((a, b) => a - b); if (!v.length) return null; const m = v.length >> 1; return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; };
const R = load(refArg), C = load(candArg);
const METRICS = ["fps", "jank50", "longTaskMs", "commits", "layouts", "styleRecalcs", "max"];
const higherBetter = new Set(["fps"]);
const segs = [...new Set([...R, ...C].flatMap((o) => Object.keys(o.seg)))];
console.log(`### ${label} (${R[0].engine}) — médianes de ${R.length} / ${C.length} exécutions\n`);
console.log("| Segment | Mesure | Réf. 5b01180 | Branche | Gain |\n|---|---|---|---|---|");
for (const s of segs) for (const m of METRICS) {
  const r = med(R.map((o) => o.seg[s]?.[m])), c = med(C.map((o) => o.seg[s]?.[m]));
  if (r === null && c === null) continue;
  let g = "";
  if (r !== null && c !== null && r !== 0) { const d = higherBetter.has(m) ? (c - r) / r : (r - c) / r; g = `${d >= 0 ? "+" : ""}${Math.round(d * 100)} %`; }
  console.log(`| ${s} | ${m} | ${r ?? "—"} | ${c ?? "—"} | ${g} |`);
}
const top = (k) => [med(R.map((o) => o[k])), med(C.map((o) => o[k]))];
for (const k of ["imgKB_board", "heapEnd"]) { const [r, c] = top(k); if (r !== null || c !== null) console.log(`| — | ${k} | ${r} | ${c} | ${r && c !== null ? `${Math.round(((r - c) / r) * 100)} %` : ""} |`); }
const nav = (o) => o.nav?.imgKB; console.log(`| load | nav.imgKB | ${med(R.map(nav))} | ${med(C.map(nav))} | |`);
const heaps = (xs) => xs.map((o) => (o.metroHeap ?? []).join("→")).join(" ; ");
console.log(`\nMetro heap after GC (MB, before run 1 → after run 3): réf ${heaps(R)} | branche ${heaps(C)}`);
console.log(`HTTP >= 400: réf ${R.map((o) => o.http?.length ?? "?").join("/")} | branche ${C.map((o) => o.http?.length ?? "?").join("/")}`);
for (const o of C) for (const h of o.http ?? []) console.log(`  - ${h}`);
