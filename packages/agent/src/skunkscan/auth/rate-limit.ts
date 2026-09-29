/**
 * Generic in-memory fixed-window rate limiter for SkunkScan's own account
 * routes - the same fixed-window-counter-with-sweep shape as
 * api/bug-report-routes.ts's rateLimitBugReport, generalized into a class
 * so register/login/forgot-password can each get their own window/limit
 * without duplicating the counter logic three times.
 *
 * In-memory and per-process is a deliberate fit here: SkunkScan runs as a
 * single Railway service, not distributed infra, so there's no need for a
 * shared store (Redis, etc.) - see this milestone's own PR 4 scoping
 * decision. Known tradeoff, inherited from the same precedent: counts
 * reset on redeploy/restart, and this would need a shared store (e.g. the
 * same Postgres database) if this service is ever scaled to multiple
 * instances.
 */

type RateLimitEntry = { count: number; resetAt: number };

export class RateLimiter {
  private readonly attempts = new Map<string, RateLimitEntry>();

  constructor(
    private readonly windowMs: number,
    private readonly maxAttempts: number,
  ) {}

  // Keyed by the caller's own key (this milestone uses the client IP) -
  // returns true if this attempt is allowed (and counts it), false if the
  // caller has hit the limit for the current window.
  check(key: string | null): boolean {
    const resolvedKey = key ?? "unknown";
    const now = Date.now();
    this.sweepExpiredEntries(now);

    const current = this.attempts.get(resolvedKey);
    if (!current || now > current.resetAt) {
      this.attempts.set(resolvedKey, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    if (current.count >= this.maxAttempts) return false;
    current.count += 1;
    return true;
  }

  reset(): void {
    this.attempts.clear();
  }

  private sweepExpiredEntries(now: number, threshold = 100): void {
    if (this.attempts.size <= threshold) return;
    for (const [key, value] of this.attempts) {
      if (now > value.resetAt) this.attempts.delete(key);
    }
  }
}

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

// 5/15min - registering also fires a verification email, so this doubles
// as email-bombing protection, not just account-creation-spam protection.
export const registerRateLimiter = new RateLimiter(FIFTEEN_MINUTES_MS, 5);

// 10/15min - generous enough for a real user who mistypes a password a
// few times, tight enough to make brute-forcing a single account
// impractical from one IP.
export const loginRateLimiter = new RateLimiter(FIFTEEN_MINUTES_MS, 10);

// 5/15min - forgot-password sends an email on every call regardless of
// whether the account exists (see its own no-enumeration doc comment in
// skunkscan-auth-routes.ts), so this is specifically email-bombing
// protection for a target inbox.
export const forgotPasswordRateLimiter = new RateLimiter(FIFTEEN_MINUTES_MS, 5);
