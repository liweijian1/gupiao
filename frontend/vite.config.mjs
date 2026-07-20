import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Production is mounted below /stock-macro/ while local development stays at /.
  base: process.env.VITE_DEPLOY_BASE ?? "/",
  optimizeDeps: {
    include: ["react", "react-dom/client"],
  },
  server: {
    warmup: {
      clientFiles: ["./src/main.jsx"],
    },
  },
  plugins: [react()],
});
