import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0", // Allow external connections
    port: 3000,
    strictPort: false, // Try next available port if 3000 is taken
    hmr: {
      // Use localhost for HMR WebSocket - browsers can't connect to 0.0.0.0
      // The HTTP server can still be on 0.0.0.0 for external access
      host: "localhost",
      // Port will be automatically set to match the server port
      // This ensures HMR works even when server uses a different port
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  publicDir: 'public',
}));
