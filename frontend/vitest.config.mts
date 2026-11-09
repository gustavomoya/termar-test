import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    include: ["lib/**/*.test.ts"],
    exclude: ["node_modules", ".next", ".next-e2e"],
    restoreMocks: true,
    clearMocks: true,
  },
});
