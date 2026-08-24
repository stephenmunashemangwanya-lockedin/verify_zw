import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  build: { manifest: true, sourcemap: false },
  server: { port: 5173 },
  preview: { port: 4173 },
  test: {
    include: ["src/test/**/*.test.{ts,tsx}"],
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    css: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/test/**", "src/main.tsx", "src/types/**"],
      reporter: ["text", "html", "lcov", "json-summary"],
      thresholds: { lines: 40, functions: 35, branches: 35, statements: 40 },
    },
  },
});
