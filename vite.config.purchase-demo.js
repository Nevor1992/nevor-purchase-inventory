import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// Purchase · Inventory demo build.
// Inlines all JS/CSS into ONE self-contained dist-purchase-demo/index.html
// so it can be shared as a single file — nhân sự mở trực tiếp trong trình
// duyệt, không cần cài đặt, không cần đăng nhập, không cần server.
export default defineConfig({
  root: "demo/purchase-inventory",
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: "../../dist-purchase-demo",
    emptyOutDir: true,
    sourcemap: false,
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 100000000,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
