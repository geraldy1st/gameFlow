/**
 * Client-only entry for the static GitHub Pages build (`npm run build:pages`,
 * see `vite.pages.config.ts`). The game is fully client-side (localStorage), so
 * this mounts it directly — no TanStack Start server, auth provider, server
 * functions, connectors, /api routes or preview bridge. The normal dev/Grok
 * Build entry (`src/router.tsx` + `src/routes/`) is untouched.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GameFlow } from "@/components/game/GameFlow";
import "../styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GameFlow />
  </StrictMode>,
);
