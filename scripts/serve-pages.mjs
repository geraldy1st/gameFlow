#!/usr/bin/env node
/**
 * Local check for the GitHub Pages build: serves `dist-pages/` under the same
 * subpath Pages uses (`/gameFlow/`) on 0.0.0.0:8090. Unknown paths get
 * 404.html with a 404 status, like Pages.
 *
 *   npm run build:pages && npm run preview:pages
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..", "dist-pages");
const base = process.env.PAGES_BASE ?? "/gameFlow/";
const port = Number(process.env.PORT ?? 8090);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".woff2": "font/woff2",
};

async function fileFor(urlPath) {
  const rel = normalize(decodeURIComponent(urlPath)).replace(/^([/\\])+/, "");
  const full = join(root, rel);
  if (!full.startsWith(root)) return null;
  try {
    const s = await stat(full);
    if (s.isDirectory()) return fileFor(join(urlPath, "index.html"));
    return full;
  } catch {
    return null;
  }
}

createServer(async (req, res) => {
  const path = (req.url ?? "/").split("?", 1)[0];
  if (path === base.slice(0, -1)) {
    res.writeHead(301, { location: base }).end();
    return;
  }
  const file = path.startsWith(base) ? await fileFor(path.slice(base.length - 1)) : null;
  const target = file ?? join(root, "404.html");
  try {
    const body = await readFile(target);
    res.writeHead(file ? 200 : 404, {
      "content-type": types[extname(target)] ?? "application/octet-stream",
    });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" }).end("Not found");
  }
}).listen(port, "0.0.0.0", () => {
  console.log(`Serving ${root} at http://localhost:${port}${base}`);
});
