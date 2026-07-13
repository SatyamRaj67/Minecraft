import { resolve } from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "Minecraft Engine Tests",
    environment: "jsdom",
    globals: true,
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/visual/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["src.**/*.worker.ts", "src/main.ts"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
    isolate: true,
    dangerouslyIgnoreUnhandledErrors: false,
  },
  resolve: {
    alias: {
      "@/": resolve(__dirname, "./src/"),
      '@/core':      resolve(__dirname, './src/core'),
      '@/platform':  resolve(__dirname, './src/platform'),
      '@/renderer':  resolve(__dirname, './src/renderer'),
      '@/world':     resolve(__dirname, './src/world'),
      '@/assets':    resolve(__dirname, './src/assets'),
      '@/debug':     resolve(__dirname, './src/debug'),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify("test"),
    __DEV__: JSON.stringify(true),
  },
});
