// This service is deployed standalone (its own Railway service, own origin
// - see railway.json), separate from the @elizaos/agent deployment that
// actually serves /api/skunkscan/*. The backend's CORS already allows the
// specific reflected origin in production (resolveCorsOrigin in
// server-helpers-auth.ts) with Access-Control-Allow-Credentials: true, not
// a wildcard, so a credentialed cross-origin fetch works. Falls back to the
// relative path when the env var isn't set, so local dev (via
// vite.config.ts's proxy) and any future same-origin deployment keep
// working unchanged.
export const API_BASE_URL = import.meta.env.VITE_SKUNKSCAN_API_BASE_URL ?? "";
