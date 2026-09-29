/**
 * Generic random-token generation/hashing, shared by session.ts (session
 * cookies) and verificationTokens.ts (email-verification/password-reset
 * links) - extracted here rather than duplicated once a second consumer
 * needed the exact same "random bytes, SHA-256 hash for storage" pattern.
 * Both use cases share the same real security property: the raw token
 * exists only in the cookie/emailed link, never persisted - only its hash
 * is ever written to the database.
 */
import { randomBytes, createHash } from "node:crypto";

export function generateRawToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashRawToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}
