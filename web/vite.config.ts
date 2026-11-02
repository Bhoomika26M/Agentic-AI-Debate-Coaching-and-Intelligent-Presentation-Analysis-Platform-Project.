import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8000",
      // The voice socket has to be proxied as a websocket, not an HTTP request.
      "/ws": { target: "ws://127.0.0.1:8000", ws: true },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "framer-motion"],
          auth: ["@supabase/supabase-js", "zod"],
        },
      },
    },
  },
});
