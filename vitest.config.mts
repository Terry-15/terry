import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Les invariants du moteur se mesurent sur des milliers de matchs :
    // quelques dizaines de secondes sont normales, cinq secondes ne le sont pas.
    testTimeout: 180_000,
    hookTimeout: 180_000,
    include: ["src/**/*.test.ts"],
  },
});
