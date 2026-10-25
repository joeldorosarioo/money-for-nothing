import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  },

  server: {
    watch: {
      ignored: ["**/playwright-report/**", "**/test-results/**", "**/coverage/**"]
    }
  },

  build: {
    manifest: true
  },

  plugins: [react(), tailwindcss()],
});
