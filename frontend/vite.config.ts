import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from 'node:url';
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: {
    three: fileURLToPath(new URL('../vendor/three.module.js', import.meta.url)),
    '/anatomy/vendor': fileURLToPath(new URL('../vendor', import.meta.url)),
  } },
  server: {
    host: "127.0.0.1",
    port: 4175,
    strictPort: true,
    fs: { allow: [".."] },
    proxy: Object.fromEntries(['/api', '/assets/anatomy', '/anatomy', '/calendar-connected.html', '/calendar-connected.js', '/style.css'].map(path => [path, {
      target: process.env.API_ORIGIN || 'http://127.0.0.1:4178',
      // Keep browser Host + Origin aligned for Rob's OAuth and CSRF checks.
      changeOrigin: false,
    }])),
  },
  build: { outDir: "build" },
  test: {
    include: ["src/tests/**/*.test.{ts,tsx}"],
    environment: "jsdom",
    setupFiles: ["./src/tests/setup.ts"],
  },
});
