import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  cacheDir: "node_modules/.vite",
  plugins: [react()],
  build: {
    rollupOptions: {
      input: resolve(__dirname, "index.html"),
    },
  },
});
