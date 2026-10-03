/**
 * Static, client-only build for GitHub Pages: `npm run build:pages` → `dist-pages/`.
 *
 * Separate from `vite.config.ts` on purpose, so the Grok Build dev server and
 * the Vercel build are unchanged. Sets VITE_STATIC=1 and serves under
 * PAGES_BASE (default `/gameFlow/`, matching https://<user>.github.io/gameFlow/).
 */
import { copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "vite";
import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const base = process.env.PAGES_BASE ?? "/gameFlow/";
const outDir = resolve(import.meta.dirname, "dist-pages");

/**
 * Game code references public assets as root-absolute strings ("/game/…").
 * Rewrite those literals to live under `base` at build time instead of
 * touching every call site in the game source.
 */
function basePublicAssets(): Plugin {
  return {
    name: "pages:base-public-assets",
    enforce: "pre",
    transform(code, id) {
      if (!/\/src\/.*\.tsx?$/.test(id.split("?")[0])) return null;
      if (!code.includes("/game/")) return null;
      return { code: code.replace(/(["'`(])\/game\//g, `$1${base}game/`), map: null };
    },
  };
}

/** GitHub Pages serves 404.html for unknown paths — reuse the SPA shell. */
function spaFallback(): Plugin {
  return {
    name: "pages:404-fallback",
    apply: "build",
    closeBundle() {
      const index = resolve(outDir, "index.html");
      if (existsSync(index)) copyFileSync(index, resolve(outDir, "404.html"));
    },
  };
}

export default defineConfig({
  root: resolve(import.meta.dirname, "pages"),
  publicDir: resolve(import.meta.dirname, "public"),
  envDir: import.meta.dirname,
  base,
  resolve: { tsconfigPaths: true },
  define: { "import.meta.env.VITE_STATIC": JSON.stringify("1") },
  plugins: [basePublicAssets(), tailwindcss(), viteReact(), spaFallback()],
  build: { outDir, emptyOutDir: true },
});
