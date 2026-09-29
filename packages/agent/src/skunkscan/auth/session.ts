/**
 * Session tokens for SkunkScan's own accounts: a random opaque token in an
 * httpOnly cookie, looked up against a DB-backed sessions table - chosen
 * over a JWT specifically because SkunkScan already has a real database
 * (the same one candidates/store.ts already uses via runtime.adapter.db),
 * so a stateless-token scheme would add complexity (revocation-before-
 * expiry, secret rotation) without buying anything a DB lookup doesn't
 * already give for free. Only the SHA-256 hash of the token is ever
 * persisted (see auth/schema.ts's sessions.tokenHash doc comment) - the
 * raw token exists only in the cookie itself.
 */
import { randomBytes, createHash } from "node:crypto";

export const SESSION_COOKIE_NAME = "skunkscan_session";

// 30 days - a plain "stay logged in" duration for a free product with no
// sensitive financial data behind the session (SkunkScan investigates
// public wallet addresses; an account holds only an email and saved-
// investigation preferences, nothing that raises this above a normal
// consumer-web session length).
export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashSessionToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function buildSessionCookie(rawToken: string): string {
  const maxAgeSeconds = Math.floor(SESSION_DURATION_MS / 1000);

  // Secure is unconditional, not gated on NODE_ENV - the production
  // deployment is always HTTPS (Railway terminates TLS in front of the
  // service), and there's no legitimate reason for this cookie to ever
  // travel over plain HTTP even in a local dev/staging environment.
  // SameSite=Lax (not Strict) because the frontend and backend are
  // separate origins in production (see TrustCheckWidget.tsx's own
  // API_BASE_URL comment) - Strict would silently drop the cookie on the
  // first cross-site navigation into the app.
  return [
    `${SESSION_COOKIE_NAME}=${rawToken}`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${maxAgeSeconds}`,
  ].join("; ");
}

export function buildSessionClearCookie(): string {
  return [
    `${SESSION_COOKIE_NAME}=`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Path=/",
    "Max-Age=0",
  ].join("; ");
}

export function readSessionTokenFromCookieHeader(
  cookieHeader: string | undefined,
): string | null {
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rawValueParts] = part.trim().split("=");
    if (rawName === SESSION_COOKIE_NAME) {
      return rawValueParts.join("=") || null;
    }
  }

  return null;
}
