import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Engine tests only (pure TS, no DOM). The app's vite.config.ts pulls in TanStack Start plugins we don't need here.
export default defineConfig({
  resolve: {
    // Same "@/..." alias as the app, so pure helpers that live next to components can be tested too.
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/game/**/*.test.ts"],
    environment: "node",
  },
});
