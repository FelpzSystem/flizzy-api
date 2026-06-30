import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@workspace/api-zod": path.resolve(__dirname, "src/__mocks__/@workspace/api-zod.ts"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    typecheck: {
      tsconfig: "./tsconfig.test.json",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.d.ts", "src/__mocks__/**", "src/__tests__/**"],
    },
  },
});
