import { defineConfig } from "vitest/config";

// Engine tests only (pure TS, no DOM). The app's vite.config.ts pulls in TanStack Start plugins we don't need here.
export default defineConfig({
  test: {
    include: ["src/game/**/*.test.ts"],
    environment: "node",
  },
});
