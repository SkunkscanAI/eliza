import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Deployed as its own standalone Railway service (railway.json + Dockerfile
// in this package) with its own root URL - "/" is genuinely free here,
// unlike @elizaos/agent's shared deployment where the elizaOS dashboard
// still owns "/" (that deployment's separate /trust-check mount in
// packages/agent/src/api/server.ts's serveSkunkScanWeb is deliberately left
// untouched by this change, per the "don't touch shared production
// routing" call - it's a distinct, still-valid artifact built from this
// same source with base:"/trust-check/", not something this config
// produces anymore).
export default defineConfig({
  base: "/",
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist",
  },
  server: {
    port: 4466,
    // Dev-only convenience: proxies API calls to a locally running agent
    // process so `bun run dev` here works without CORS setup. Adjust the
    // target if your local agent binds a different port. Not used in
    // production - there VITE_SKUNKSCAN_API_BASE_URL (see
    // TrustCheckWidget.tsx) points directly at the deployed backend, since
    // frontend and backend are now different Railway services/origins.
    proxy: {
      "/api/skunkscan": "http://localhost:3000",
    },
  },
});
