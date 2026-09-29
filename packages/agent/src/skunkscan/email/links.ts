/**
 * Builds the real, clickable links embedded in verification/reset emails -
 * pointing at skunkscan-web (a separate deployed origin from this backend,
 * see TrustCheckWidget.tsx's own API_BASE_URL comment for why frontend and
 * backend are different origins in production). No such env var existed
 * for "where does the frontend live" before this PR - CORS already uses a
 * wildcard-allow-any-origin approach in production (server-helpers-auth.ts),
 * so this is a new, single-purpose variable just for building these links.
 *
 * Defaults to the local skunkscan-web dev server port (matching its own
 * vite.config.ts) so a local dev environment produces a real, clickable
 * localhost link out of the box - production deployments must set
 * SKUNKSCAN_WEB_BASE_URL explicitly or these links will point at
 * localhost, which is wrong but at least visibly, obviously wrong rather
 * than silently broken in a non-obvious way.
 */
import { logger } from "@elizaos/core";

const DEFAULT_WEB_BASE_URL = "http://localhost:4466";

function resolveWebBaseUrl(): string {
  const configured = process.env.SKUNKSCAN_WEB_BASE_URL?.trim();
  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  if (process.env.NODE_ENV === "production") {
    logger.warn(
      "[SkunkscanEmail] SKUNKSCAN_WEB_BASE_URL is not set in production - verification/reset email links will incorrectly point at localhost.",
    );
  }

  return DEFAULT_WEB_BASE_URL;
}

export function buildVerificationLink(rawToken: string): string {
  return `${resolveWebBaseUrl()}/verify-email?token=${encodeURIComponent(rawToken)}`;
}

export function buildPasswordResetLink(rawToken: string): string {
  return `${resolveWebBaseUrl()}/reset-password?token=${encodeURIComponent(rawToken)}`;
}
