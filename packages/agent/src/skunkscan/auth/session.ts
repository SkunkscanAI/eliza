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
import { generateRawToken, hashRawToken } from "./tokens";

export const SESSION_COOKIE_NAME = "skunkscan_session";

// 30 days - a plain "stay logged in" duration for a free product with no
// sensitive financial data behind the session (SkunkScan investigates
// public wallet addresses; an account holds only an email and saved-
// investigation preferences, nothing that raises this above a normal
// consumer-web session length).
export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

// Thin, session-specific names over the generic token helpers (see
// tokens.ts) - kept as named exports so PR 1's existing callers
// (auth-routes.ts) don't need to change, now that verificationTokens.ts
// (PR 2) is a second consumer of the same underlying crypto.
export const generateSessionToken = generateRawToken;
export const hashSessionToken = hashRawToken;

export function buildSessionCookie(rawToken: string): string {
  const maxAgeSeconds = Math.floor(SESSION_DURATION_MS / 1000);

  // Secure is unconditional, not gated on NODE_ENV - the production
  // deployment is always HTTPS (Railway terminates TLS in front of the
  // service), and there's no legitimate reason for this cookie to ever
  // travel over plain HTTP even in a local dev/staging environment.
  //
  // SameSite=None (not Lax) - confirmed live via skunkscan-web's PR 3
  // browser testing that Lax was wrong: Lax only rides along on a top-level
  // cross-site *navigation*, not a cross-site fetch()/XHR subresource
  // request, which is how every one of skunkscan-web's API calls is made
  // (frontend and backend are separate Railway origins in production - see
  // TrustCheckWidget.tsx's own API_BASE_URL comment). With Lax, register
  // itself worked (its POST response can set a cookie), but the very next
  // fetch("/me") silently omitted the cookie and came back unauthenticated
  // - every session check failed post-login. None requires Secure (already
  // set) and is fine here since this is never sent to a plain-HTTP origin.
  return [
    `${SESSION_COOKIE_NAME}=${rawToken}`,
    "HttpOnly",
    "Secure",
    "SameSite=None",
    "Path=/",
    `Max-Age=${maxAgeSeconds}`,
  ].join("; ");
}

export function buildSessionClearCookie(): string {
  return [
    `${SESSION_COOKIE_NAME}=`,
    "HttpOnly",
    "Secure",
    "SameSite=None",
    "Path=/",
    "Max-Age=0",
  ].join("; ");
}

// Sliding renewal: a session created today expires in exactly
// SESSION_DURATION_MS regardless of activity, unless something extends it -
// without this, an active user gets logged out mid-use the moment they
// cross the 30-day mark, which is a worse experience than what "stay
// logged in for 30 days" is meant to promise. Only renew once a session is
// getting close to expiring (not on every single authenticated request) -
// otherwise every page load would be a DB write for no benefit, since a
// session renewed an hour ago doesn't need renewing again yet.
export const SESSION_RENEWAL_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function shouldRenewSession(expiresAt: Date): boolean {
  return expiresAt.getTime() - Date.now() < SESSION_RENEWAL_THRESHOLD_MS;
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
