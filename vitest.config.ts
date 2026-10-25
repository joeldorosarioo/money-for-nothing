import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}", "src/**/*.integration.test.ts"],

    coverage: {
      provider: "v8",

      reporter: ["text", "html", "json-summary"],
      include: ["src/features/**/*.ts", "src/shared/money/**/*.ts"],
      exclude: ["**/*.test.ts", "**/*.integration.test.ts", "**/index.ts"],
    },
  },
});
