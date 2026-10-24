/**
 * Lot B static "0 404" check: every manifest entry has its .webp (and .jpg) in public/ and in
 * the built dist-pages/, and no built JS hard-codes a game .webp outside the manifest.
 *   node tools/perf/check-webp.mjs [distDir=dist-pages]
 * The runtime side ("0 response >= 400 on the full path") is bench.mjs → out.http.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
const dist = process.argv[2] ?? "dist-pages";
const list = JSON.parse(readFileSync("src/components/game/webp-manifest.json", "utf8"));
const errs = [];
for (const r of list) for (const root of ["public/game", `${dist}/game`]) for (const f of [r, r.replace(/\.jpg$/, ".webp")]) if (!existsSync(`${root}/${f}`)) errs.push(`missing ${root}/${f}`);
const allowed = new Set(list.map((r) => r.replace(/\.jpg$/, ".webp")));
const js = readdirSync(`${dist}/assets`).filter((f) => f.endsWith(".js"));
for (const f of js) for (const m of readFileSync(`${dist}/assets/${f}`, "utf8").matchAll(/game\/((?:art|portraits|trophies)\/[A-Za-z0-9._/-]+\.webp)/g)) if (!allowed.has(m[1])) errs.push(`unlisted webp literal ${m[1]} in ${f}`);
console.log(`${list.length} manifest entries, ${errs.length} problem(s)`);
errs.forEach((e) => console.log(" -", e));
process.exit(errs.length ? 1 : 0);
