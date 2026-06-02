import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        "/api": env.VITE_API_BASE_URL || "http://localhost:4000",
        "/uploads": env.VITE_API_BASE_URL || "http://localhost:4000"
      }
    }
  };
});
