import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";

const pages = process.env.GITHUB_PAGES === "true";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "github-pages-files",
      closeBundle() {
        const dist = path.resolve(__dirname, "dist");
        const index = path.join(dist, "index.html");
        if (!fs.existsSync(index)) return;
        fs.writeFileSync(path.join(dist, ".nojekyll"), "");
        fs.copyFileSync(index, path.join(dist, "404.html"));
      },
    },
  ],
  base: pages ? "/iris-preflight/" : "/csp/preflight/",
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
