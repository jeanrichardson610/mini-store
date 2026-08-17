import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "demo",
  plugins: [react()],
  build: {
    // vite's default outDir is resolved relative to `root` (demo/dist),
    // but Vercel (and most static hosts) expect the build output at the
    // project root as `dist` — point it back there explicitly.
    outDir: "../dist",
    emptyOutDir: true,
  },
});