import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// Demo build: inlines all JS/CSS into a single self-contained index.html
// so the prototype can be shared as one file / hosted as an artifact.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: "dist-demo",
    sourcemap: false,
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
