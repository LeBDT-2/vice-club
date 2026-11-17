import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/** Tests d'intégration contre une base Supabase LOCALE (supabase start). */
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["tests/db/**/*.test.ts"],
    environment: "node",
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
    globalSetup: ["tests/db/global-setup.ts"],
  },
});
