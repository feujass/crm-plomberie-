import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "lib/facturation/facturx-schematron.validate.ts",
      "lib/facturation/facturx-fuzz.validate.ts",
    ],
    testTimeout: 600_000,
    hookTimeout: 600_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
