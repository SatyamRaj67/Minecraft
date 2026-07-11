import { defineConfig } from "vite";
import wgsl from "vite-plugin-wgsl";
import { resolve } from "path";

export default defineConfig({
  plugins: [
    wgsl({
      include: ["**/*.wgsl", "**/*.glsl", "**/*.vert", "**/*.frag"],
    }),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "@core": resolve(__dirname, "src/core"),
      "@platform": resolve(__dirname, "src/platform"),
      "@renderer": resolve(__dirname, "src/renderer"),
      "@world": resolve(__dirname, "src/world"),
      "@assets": resolve(__dirname, "src/assets"),
      "@debug": resolve(__dirname, "src/debug"),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? "0.0.0"),
    __DEV__: JSON.stringify(process.env.NODE_ENV !== "production"),
  },
  worker: {
    format: "es",
    plugins: () => [wgsl({
      include: ["**/*.wgsl", "**/*.glsl", "**/*.vert", "**/*.frag"],
    })],
  },
  build: {
    target: "es2025",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // @ts-ignore
          "engine-core": ["./src/core/Engine.ts"],
        },
      },
    },
  },
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  optimizeDeps: {
    exclude: [],
  },
});
