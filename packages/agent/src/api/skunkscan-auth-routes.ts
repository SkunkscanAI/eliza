/**
 * SkunkScan account routes: register/login/logout/me (Milestone 4, PR 1),
 * plus email verification and forgot/reset password (PR 2). Deliberately
 * no billing/entitlements anywhere here - see skunkscan/auth/schema.ts's
 * header comment for why.
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
import { VerificationTokensRepository } from "../skunkscan/auth/verificationTokens";
import {
  hashPassword,
  passwordValidationMessage,
  validatePasswordStrength,
  verifyPassword,
} from "../skunkscan/auth/password";
import {
  buildSessionClearCookie,
  buildSessionCookie,
  generateSessionToken,
  hashSessionToken,
  readSessionTokenFromCookieHeader,
  SESSION_DURATION_MS,
  shouldRenewSession,
} from "../skunkscan/auth/session";
import {
  forgotPasswordRateLimiter,
  loginRateLimiter,
  registerRateLimiter,
} from "../skunkscan/auth/rate-limit";
import type { RuntimeDb } from "../skunkscan/candidates/sql";
import { skunkscanEmailService } from "../skunkscan/email/service";
import { buildPasswordResetEmail, buildVerificationEmail } from "../skunkscan/email/templates";
import { buildPasswordResetLink, buildVerificationLink } from "../skunkscan/email/links";

type JsonHelper = (res: http.ServerResponse, data: unknown, status?: number) => void;
type ErrorHelper = (res: http.ServerResponse, message: string, status?: number) => void;
type ReadJsonBodyHelper = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
) => Promise<Record<string, unknown> | null>;

// Deliberately simple (not a full RFC 5322 parser) - matches this
// codebase's existing philosophy elsewhere of validating "plausible
// shape," not chasing edge cases a real verification email (PR 2) will
// catch anyway.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// A single publicly-safe view of a stored user - callers must never leak
// passwordHash back to a client, so this is the only shape routes below
// are allowed to return.
function toPublicUser(
  user: StoredUser,
): { id: string; email: string; emailVerified: boolean; createdAt: string } {
  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt.toISOString(),
  };
}

// Best-effort: a verification email failing to send is never a reason to
// fail registration itself - the account is real and usable either way
// (verification never gated login/use in this milestone), and there's
// nothing more disruptive to do here yet with no resend endpoint. Logged
// inside skunkscanEmailService.send() itself; this function only decides
// whether to bother trying.
async function issueAndSendVerificationEmail(
  db: RuntimeDb,
  user: StoredUser,
): Promise<void> {
  const verificationTokens = new VerificationTokensRepository(db);
  const { rawToken } = await verificationTokens.create(user.id, "verify_email");
  await skunkscanEmailService.send({
    to: user.email,
    ...buildVerificationEmail(buildVerificationLink(rawToken)),
  });
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
//
// `res` is used only for sliding renewal (see session.ts's
// shouldRenewSession): when the session is close to expiring, this
// extends it in the DB *and* re-sends the same session cookie with a
// fresh Max-Age - renewing only the DB row would be pointless, since the
// browser would still drop the cookie client-side at the original
// 30-day mark regardless of what the server thinks the session's expiry
// is. The token value itself never changes, only the expiry, so this is
// always the same cookie value, just re-issued.
export async function resolveSessionUser(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  db: RuntimeDb | undefined,
): Promise<StoredUser | null> {
  if (!db) return null;

  const rawToken = readSessionTokenFromCookieHeader(req.headers.cookie);
  if (!rawToken) return null;

  const sessions = new SessionsRepository(db);
  const tokenHash = hashSessionToken(rawToken);
  const session = await sessions.findValidByTokenHash(tokenHash);
  if (!session) return null;

  if (shouldRenewSession(session.expiresAt)) {
    await sessions.renew(tokenHash, new Date(Date.now() + SESSION_DURATION_MS));
    setSessionCookie(res, rawToken);
  }

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

    if (!registerRateLimiter.check(req.socket.remoteAddress ?? null)) {
      helpers.error(res, "Too many registration attempts. Please try again later.", 429);
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

    const passwordError = validatePasswordStrength(password);
    if (passwordError) {
      helpers.error(res, passwordValidationMessage(passwordError), 400);
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

    // Fire-and-forget on purpose - see issueAndSendVerificationEmail's own
    // doc comment for why this never blocks or fails the registration
    // response itself.
    void issueAndSendVerificationEmail(db, user).catch(() => {
      /* already logged inside skunkscanEmailService.send() */
    });

    helpers.json(res, { user: toPublicUser(user) }, 201);
    return true;
  }

  if (pathname === "/api/skunkscan/auth/verify-email") {
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

    const token = typeof body.token === "string" ? body.token : "";
    if (!token) {
      helpers.error(res, "Missing verification token.", 400);
      return true;
    }

    const verificationTokens = new VerificationTokensRepository(db);
    const consumed = await verificationTokens.consumeIfValid(token, "verify_email");
    if (!consumed) {
      helpers.error(res, "This verification link is invalid or has expired.", 400);
      return true;
    }

    const users = new UsersRepository(db);
    await users.markEmailVerified(consumed.userId);
    const user = await users.findById(consumed.userId);

    helpers.json(res, { user: user ? toPublicUser(user) : null, verified: true }, 200);
    return true;
  }

  if (pathname === "/api/skunkscan/auth/forgot-password") {
    if (method !== "POST") {
      helpers.error(res, "Method not allowed", 405);
      return true;
    }

    if (!db) {
      helpers.error(res, "Accounts are not available in this environment.", 503);
      return true;
    }

    if (!forgotPasswordRateLimiter.check(req.socket.remoteAddress ?? null)) {
      // Deliberately still a real 429, not folded into the generic
      // success response below - rate-limiting by IP happens before any
      // per-email lookup, so it can't leak whether a specific email is
      // registered (every caller from that IP gets the same 429
      // regardless of which email they send).
      helpers.error(res, "Too many requests. Please try again later.", 429);
      return true;
    }

    const body = await helpers.readJsonBody(req, res);
    if (!body) return true;

    const email = typeof body.email === "string" ? body.email.trim() : "";

    // Same generic response regardless of whether this email is actually
    // registered - a different response for "no such account" would let
    // an attacker enumerate registered emails via this endpoint, exactly
    // the same reasoning login's generic "Invalid email or password"
    // already uses.
    const genericResponse = {
      message: "If an account exists for this email, a password reset link has been sent.",
    };

    const users = new UsersRepository(db);
    const user = await users.findByEmail(email);

    if (user) {
      const verificationTokens = new VerificationTokensRepository(db);
      const { rawToken } = await verificationTokens.create(user.id, "reset_password");
      // Best-effort, same reasoning as issueAndSendVerificationEmail - a
      // send failure must not turn into a different HTTP response here,
      // since that would itself leak whether the account exists.
      await skunkscanEmailService
        .send({
          to: user.email,
          ...buildPasswordResetEmail(buildPasswordResetLink(rawToken)),
        })
        .catch(() => {
          /* already logged inside skunkscanEmailService.send() */
        });
    }

    helpers.json(res, genericResponse, 200);
    return true;
  }

  if (pathname === "/api/skunkscan/auth/reset-password") {
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

    const token = typeof body.token === "string" ? body.token : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

    if (!token) {
      helpers.error(res, "Missing reset token.", 400);
      return true;
    }

    const passwordError = validatePasswordStrength(newPassword);
    if (passwordError) {
      helpers.error(res, passwordValidationMessage(passwordError), 400);
      return true;
    }

    const verificationTokens = new VerificationTokensRepository(db);
    const consumed = await verificationTokens.consumeIfValid(token, "reset_password");
    if (!consumed) {
      helpers.error(res, "This password reset link is invalid or has expired.", 400);
      return true;
    }

    const users = new UsersRepository(db);
    const newPasswordHash = await hashPassword(newPassword);
    await users.updatePasswordHash(consumed.userId, newPasswordHash);

    // A successful reset invalidates every existing session for this
    // user, not just the one making this request - see
    // SessionsRepository.deleteAllForUser's own doc comment for why.
    const sessions = new SessionsRepository(db);
    await sessions.deleteAllForUser(consumed.userId);
    clearSessionCookie(res);

    helpers.json(res, { passwordReset: true }, 200);
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

    if (!loginRateLimiter.check(req.socket.remoteAddress ?? null)) {
      helpers.error(res, "Too many login attempts. Please try again later.", 429);
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

    const user = await resolveSessionUser(req, res, db);
    if (!user) {
      helpers.error(res, "Not logged in.", 401);
      return true;
    }

    helpers.json(res, { user: toPublicUser(user) }, 200);
    return true;
  }

  return false;
}
