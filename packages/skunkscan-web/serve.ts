// Minimal standalone static file server for this Railway service. Mirrors
// packages/agent/src/api/static-file-server.ts's serveSkunkScanWeb SPA-
// fallback logic (any non-asset path gets index.html so React Router's
// client-side routing works on a hard refresh/deep link) but standalone -
// this service has no dependency on @elizaos/agent at all, it only talks to
// it over HTTP (VITE_SKUNKSCAN_API_BASE_URL, baked in at build time).
import { existsSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";

const DIST_DIR = resolve(import.meta.dir, "dist");
const PORT = Number(process.env.PORT) || 4466;

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

if (!existsSync(join(DIST_DIR, "index.html"))) {
  console.error(`[skunkscan-web] dist/index.html not found at ${DIST_DIR} - build before serving.`);
  process.exit(1);
}

Bun.serve({
  port: PORT,
  hostname: "0.0.0.0",
  fetch(req) {
    const url = new URL(req.url);
    const pathname = decodeURIComponent(url.pathname);

    if (pathname === "/health") {
      return new Response("ok", { status: 200 });
    }

    const candidatePath = resolve(join(DIST_DIR, pathname));
    if (
      candidatePath !== DIST_DIR &&
      !candidatePath.startsWith(DIST_DIR + "/") &&
      !candidatePath.startsWith(DIST_DIR + "\\")
    ) {
      return new Response("Forbidden", { status: 403 });
    }

    try {
      const stat = statSync(candidatePath);
      if (stat.isFile()) {
        const ext = extname(candidatePath).toLowerCase();
        const cacheControl = pathname.startsWith("/assets/")
          ? "public, max-age=31536000, immutable"
          : "public, max-age=0, must-revalidate";
        return new Response(Bun.file(candidatePath), {
          headers: {
            "Content-Type": MIME[ext] ?? "application/octet-stream",
            "Cache-Control": cacheControl,
          },
        });
      }
    } catch {
      // Not a file on disk - fall through to the SPA index fallback below.
    }

    // Single-page app - any non-asset request (no extension, or .html)
    // falls back to index.html so React Router's client-side routes
    // (/pricing, /check, ...) work on a direct navigation/refresh.
    const ext = extname(pathname).toLowerCase();
    if (ext && ext !== ".html") {
      return new Response("Not found", { status: 404 });
    }

    return new Response(Bun.file(join(DIST_DIR, "index.html")), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=0, must-revalidate",
      },
    });
  },
});

console.log(`[skunkscan-web] listening on :${PORT}, serving ${DIST_DIR}`);
