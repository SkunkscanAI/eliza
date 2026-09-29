/**
 * Password hashing for SkunkScan's own accounts (bcrypt, per the explicit
 * decision to keep this simple over argon2id at this stage).
 *
 * Uses `bcryptjs` - a pure-JS implementation of the bcrypt algorithm -
 * rather than the native `bcrypt` npm package. The native package requires
 * a node-gyp/native compilation step at install time, which is exactly the
 * "native-build friction" the bcrypt-over-argon2id decision was made to
 * avoid; bcryptjs produces byte-identical, fully bcrypt-compatible hashes
 * with zero native build step, so it's the package that actually delivers
 * on that stated goal.
 */
import bcrypt from "bcryptjs";

// 12 is bcryptjs's own documented "current default" recommendation - a
// deliberate, explicit choice rather than relying on whatever the
// library's own default happens to be today, so this doesn't silently
// change behavior on a future bcryptjs upgrade.
const BCRYPT_COST_FACTOR = 12;

export async function hashPassword(plaintextPassword: string): Promise<string> {
  return bcrypt.hash(plaintextPassword, BCRYPT_COST_FACTOR);
}

export async function verifyPassword(
  plaintextPassword: string,
  storedHash: string,
): Promise<boolean> {
  return bcrypt.compare(plaintextPassword, storedHash);
}

export const MIN_PASSWORD_LENGTH = 8;

// bcrypt (and bcryptjs) silently truncates its input at 72 BYTES - any
// password content past that point is ignored by the algorithm, so two
// different passwords sharing the same first 72 bytes hash identically
// and would be indistinguishable to this system. This was previously
// unenforced (PR 1-3 only checked a minimum length), a real correctness
// gap found during PR 4's hardening pass, not a stylistic strength rule -
// 72 is bcrypt's own hard limit, not a tunable choice.
export const MAX_PASSWORD_LENGTH = 72;

// A short, dependency-free blocklist of the most common real-world
// passwords/patterns - cheap to check, meaningfully blocks the worst
// attempts. Deliberately NOT paired with forced complexity rules
// (uppercase/digit/symbol requirements): current NIST 800-63B guidance
// recommends against those, since they push users toward predictable
// substitutions (e.g. "Password1!") without meaningfully improving
// security, in favor of exactly this kind of breach/common-list check.
const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "12345678",
  "123456789",
  "1234567890",
  "qwerty123",
  "qwertyui",
  "qwertyuiop",
  "letmein123",
  "welcome123",
  "admin1234",
  "iloveyou1",
  "passw0rd",
  "abc123456",
  "monkey123",
  "dragon123",
  "football1",
  "baseball1",
  "princess1",
  "sunshine1",
  "master1234",
  "shadow123",
  "superman1",
  "trustno1",
  "starwars1",
  "changeme1",
  "letmein11",
  "12345678a",
  "zaq12wsx",
]);

export type PasswordValidationError = "too_short" | "too_long" | "too_common";

const PASSWORD_VALIDATION_MESSAGES: Record<PasswordValidationError, string> = {
  too_short: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
  too_long: `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`,
  too_common: "This password is too common. Please choose a different one.",
};

export function validatePasswordStrength(password: string): PasswordValidationError | null {
  if (password.length < MIN_PASSWORD_LENGTH) return "too_short";
  if (password.length > MAX_PASSWORD_LENGTH) return "too_long";
  if (COMMON_PASSWORDS.has(password.toLowerCase())) return "too_common";
  return null;
}

export function passwordValidationMessage(error: PasswordValidationError): string {
  return PASSWORD_VALIDATION_MESSAGES[error];
}
