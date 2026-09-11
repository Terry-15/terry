import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  // Même alias que Next.js, sinon le harnais ne voit pas la couche « jeu ».
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    // Les invariants du moteur se mesurent sur des milliers de matchs :
    // quelques dizaines de secondes sont normales, cinq secondes ne le sont pas.
    testTimeout: 180_000,
    hookTimeout: 180_000,
    include: ["src/**/*.test.ts"],
  },
});
