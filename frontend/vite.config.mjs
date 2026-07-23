import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Production is mounted below /stock-macro/ while local development stays at /.
  base: process.env.VITE_DEPLOY_BASE ?? "/",
  optimizeDeps: {
    include: ["react", "react-dom/client"],
  },
  server: {
    proxy: {
      "/quantdesk-api": {
        target: "http://127.0.0.1:8000",
        rewrite: (path) => path.replace("/quantdesk-api", ""),
      },
    },
    warmup: {
      clientFiles: ["./src/main.jsx"],
    },
  },
  plugins: [react()],
});
