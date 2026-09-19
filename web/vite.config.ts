import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  base: "/csp/preflight/",
  resolve: {
    alias: {
      "@data": path.resolve(__dirname, "../src/data"),
    },
  },
  server: {
    port: 5173,
    fs: { allow: [".."] },
    proxy: {
      "/api": "http://localhost:52773",
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
