/**
 * SkunkScan account routes: register/login/logout/me (Milestone 4, PR 1).
 * Deliberately no billing/entitlements anywhere here - see
 * skunkscan/auth/schema.ts's header comment for why.
 *
 * Split out from skunkscan-routes.ts (rather than added inline) since auth
 * is its own distinct concern with several endpoints - keeps that file
 * from growing into an unrelated grab-bag as this milestone adds more.
 */
import type http from "node:http";
import {
  EmailAlreadyRegisteredError,
  SessionsRepository,
  UsersRepository,
  type StoredUser,
} from "../skunkscan/auth/repository";
import { hashPassword, verifyPassword } from "../skunkscan/auth/password";
import {
  buildSessionClearCookie,
  buildSessionCookie,
  generateSessionToken,
  hashSessionToken,
  readSessionTokenFromCookieHeader,
  SESSION_DURATION_MS,
} from "../skunkscan/auth/session";
import type { RuntimeDb } from "../skunkscan/candidates/sql";

type JsonHelper = (res: http.ServerResponse, data: unknown, status?: number) => void;
type ErrorHelper = (res: http.ServerResponse, message: string, status?: number) => void;
type ReadJsonBodyHelper = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
) => Promise<Record<string, unknown> | null>;

// Same bare-minimum-floor philosophy as the rest of this milestone's
// staging: real password-strength rules are PR 4's job (rate-limiting,
// password strength, session-expiry hardening) - this only rejects
// something too short to be a real password at all, so PR 1 doesn't ship
// with zero validation while that real policy is still pending.
const MIN_PASSWORD_LENGTH = 8;

// Deliberately simple (not a full RFC 5322 parser) - matches this
// codebase's existing philosophy elsewhere of validating "plausible
// shape," not chasing edge cases a real verification email (PR 2) will
// catch anyway.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// A single publicly-safe view of a stored user - callers must never leak
// passwordHash back to a client, so this is the only shape routes below
// are allowed to return.
function toPublicUser(user: StoredUser): { id: string; email: string; createdAt: string } {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
  };
}

function setSessionCookie(res: http.ServerResponse, rawToken: string): void {
  res.setHeader("Set-Cookie", buildSessionCookie(rawToken));
}

function clearSessionCookie(res: http.ServerResponse): void {
  res.setHeader("Set-Cookie", buildSessionClearCookie());
}

async function createSessionForUser(
  sessions: SessionsRepository,
  userId: string,
): Promise<string> {
  const rawToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await sessions.create(userId, hashSessionToken(rawToken), expiresAt);
  return rawToken;
}

// Shared by the "me" route and (in a later PR) any route that needs to
// know who's logged in - resolves the real, currently-valid session user
// from the request's cookie, or null if there isn't one. Never throws for
// "not logged in" - that's an expected, common case, not an error.
export async function resolveSessionUser(
  req: http.IncomingMessage,
  db: RuntimeDb | undefined,
): Promise<StoredUser | null> {
  if (!db) return null;

  const rawToken = readSessionTokenFromCookieHeader(req.headers.cookie);
  if (!rawToken) return null;

  const sessions = new SessionsRepository(db);
  const session = await sessions.findValidByTokenHash(hashSessionToken(rawToken));
  if (!session) return null;

  const users = new UsersRepository(db);
  return users.findById(session.userId);
}

export async function handleSkunkScanAuthRoute(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  pathname: string,
  method: string,
  db: RuntimeDb | undefined,
  helpers: {
    json: JsonHelper;
    error: ErrorHelper;
    readJsonBody: ReadJsonBodyHelper;
  },
): Promise<boolean> {
  if (pathname === "/api/skunkscan/auth/register") {
    if (method !== "POST") {
      helpers.error(res, "Method not allowed", 405);
      return true;
    }

    if (!db) {
      helpers.error(res, "Accounts are not available in this environment.", 503);
      return true;
    }

    const body = await helpers.readJsonBody(req, res);
    if (!body) return true;

    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!EMAIL_PATTERN.test(email)) {
      helpers.error(res, "Enter a valid email address.", 400);
      return true;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      helpers.error(res, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`, 400);
      return true;
    }

    const users = new UsersRepository(db);
    const sessions = new SessionsRepository(db);

    let user: StoredUser;
    try {
      const passwordHash = await hashPassword(password);
      user = await users.create(email, passwordHash);
    } catch (error) {
      if (error instanceof EmailAlreadyRegisteredError) {
        helpers.error(res, "An account with this email already exists.", 409);
        return true;
      }
      throw error;
    }

    const rawToken = await createSessionForUser(sessions, user.id);
    setSessionCookie(res, rawToken);
    helpers.json(res, { user: toPublicUser(user) }, 201);
    return true;
  }

  if (pathname === "/api/skunkscan/auth/login") {
    if (method !== "POST") {
      helpers.error(res, "Method not allowed", 405);
      return true;
    }

    if (!db) {
      helpers.error(res, "Accounts are not available in this environment.", 503);
      return true;
    }

    const body = await helpers.readJsonBody(req, res);
    if (!body) return true;

    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    const users = new UsersRepository(db);
    const user = await users.findByEmail(email);

    // Same generic "Invalid email or password" message whether the email
    // doesn't exist at all or the password was wrong - a different message
    // per case would let an attacker enumerate registered emails.
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      helpers.error(res, "Invalid email or password.", 401);
      return true;
    }

    const sessions = new SessionsRepository(db);
    const rawToken = await createSessionForUser(sessions, user.id);
    setSessionCookie(res, rawToken);
    helpers.json(res, { user: toPublicUser(user) }, 200);
    return true;
  }

  if (pathname === "/api/skunkscan/auth/logout") {
    if (method !== "POST") {
      helpers.error(res, "Method not allowed", 405);
      return true;
    }

    const rawToken = readSessionTokenFromCookieHeader(req.headers.cookie);
    if (rawToken && db) {
      const sessions = new SessionsRepository(db);
      await sessions.deleteByTokenHash(hashSessionToken(rawToken));
    }

    clearSessionCookie(res);
    helpers.json(res, { loggedOut: true }, 200);
    return true;
  }

  if (pathname === "/api/skunkscan/auth/me") {
    if (method !== "GET") {
      helpers.error(res, "Method not allowed", 405);
      return true;
    }

    const user = await resolveSessionUser(req, db);
    if (!user) {
      helpers.error(res, "Not logged in.", 401);
      return true;
    }

    helpers.json(res, { user: toPublicUser(user) }, 200);
    return true;
  }

  return false;
}
