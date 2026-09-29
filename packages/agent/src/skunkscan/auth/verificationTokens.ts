/**
 * Raw-SQL persistence for email-verification and password-reset tokens -
 * same RuntimeDb raw-SQL pattern as repository.ts (users/sessions), same
 * candidates/sql.ts helpers reused directly.
 */
import { randomUUID } from "node:crypto";
import { executeRawSql, sqlText, toText, type RuntimeDb } from "../candidates/sql";
import { generateRawToken, hashRawToken } from "./tokens";

const TABLE = "skunkscan.verification_tokens";

export type TokenPurpose = "verify_email" | "reset_password";

const VALID_PURPOSES: ReadonlySet<TokenPurpose> = new Set([
  "verify_email",
  "reset_password",
]);

// verify_email links are emailed once at signup and have no security-
// sensitive action behind them (just flips a boolean) - a generous 24h
// window. reset_password directly grants a password change, so it gets a
// much shorter, more conventional 1h window - the same asymmetry
// cloud-shared's own email-link expiries use for the same two purposes.
const TOKEN_DURATIONS_MS: Record<TokenPurpose, number> = {
  verify_email: 24 * 60 * 60 * 1000,
  reset_password: 60 * 60 * 1000,
};

export type StoredVerificationToken = {
  id: string;
  userId: string;
  purpose: TokenPurpose;
  expiresAt: Date;
  usedAt: Date | null;
};

function parseTimestamp(value: unknown): Date {
  const date = new Date(toText(value));
  if (Number.isNaN(date.getTime())) {
    throw new Error(`[SkunkscanAuth] invalid timestamp from db: ${toText(value)}`);
  }
  return date;
}

function parseOptionalTimestamp(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  return parseTimestamp(value);
}

function parsePurpose(value: unknown): TokenPurpose {
  const text = toText(value);
  if (!VALID_PURPOSES.has(text as TokenPurpose)) {
    throw new Error(`[SkunkscanAuth] unknown verification token purpose from db: ${text}`);
  }
  return text as TokenPurpose;
}

function rowToToken(row: Record<string, unknown>): StoredVerificationToken {
  return {
    id: toText(row.id),
    userId: toText(row.user_id),
    purpose: parsePurpose(row.purpose),
    expiresAt: parseTimestamp(row.expires_at),
    usedAt: parseOptionalTimestamp(row.used_at),
  };
}

export class VerificationTokensRepository {
  constructor(private readonly db: RuntimeDb) {}

  /**
   * Issues a new token for the given purpose and returns the RAW token
   * (to embed in the emailed link) alongside the stored record - the raw
   * value is never returned again after this call, matching sessions'
   * same never-persisted-in-the-clear property.
   */
  async create(
    userId: string,
    purpose: TokenPurpose,
  ): Promise<{ rawToken: string; record: StoredVerificationToken }> {
    const rawToken = generateRawToken();
    const tokenHash = hashRawToken(rawToken);
    const id = randomUUID();
    const expiresAt = new Date(Date.now() + TOKEN_DURATIONS_MS[purpose]);

    const rows = await executeRawSql(
      this.db,
      `INSERT INTO ${TABLE} (id, user_id, token_hash, purpose, expires_at)
       VALUES (${sqlText(id)}, ${sqlText(userId)}, ${sqlText(tokenHash)}, ${sqlText(purpose)}, ${sqlText(expiresAt.toISOString())})
       RETURNING id, user_id, purpose, expires_at, used_at`,
    );
    if (rows.length === 0) {
      throw new Error("[SkunkscanAuth] verification token insert returned no rows");
    }

    return { rawToken, record: rowToToken(rows[0]) };
  }

  /**
   * Looks up a token by its raw value and required purpose. Returns null
   * (not a distinct "wrong purpose" error) for a token that exists but
   * doesn't match the expected purpose - a caller asking specifically for
   * a reset_password token shouldn't be told anything about a
   * verify_email token that happens to share the same raw string space
   * (they don't, in practice, since tokens are random, but the purpose
   * check is defense-in-depth against ever consuming a token for the
   * wrong action). Does NOT check expiry/used-at here - see
   * consumeIfValid() for the real one-time-use, not-expired check, kept
   * separate so a caller can distinguish "no such token" from "token
   * exists but is expired/already used" if it ever needs to.
   */
  async findByRawToken(
    rawToken: string,
    purpose: TokenPurpose,
  ): Promise<StoredVerificationToken | null> {
    const rows = await executeRawSql(
      this.db,
      `SELECT id, user_id, purpose, expires_at, used_at FROM ${TABLE}
       WHERE token_hash = ${sqlText(hashRawToken(rawToken))} AND purpose = ${sqlText(purpose)}
       LIMIT 1`,
    );
    if (rows.length === 0) return null;
    return rowToToken(rows[0]);
  }

  /**
   * Atomically marks a token used, but only if it's genuinely still valid
   * (not expired, not already used) - the UPDATE's WHERE clause itself
   * enforces this, so two concurrent requests racing to consume the same
   * token can't both succeed (only the first UPDATE actually matches a
   * row; the second sees 0 rows affected). Returns the token record on
   * success, null if it was already expired/used/didn't exist.
   */
  async consumeIfValid(
    rawToken: string,
    purpose: TokenPurpose,
  ): Promise<StoredVerificationToken | null> {
    const rows = await executeRawSql(
      this.db,
      `UPDATE ${TABLE}
       SET used_at = now()
       WHERE token_hash = ${sqlText(hashRawToken(rawToken))}
         AND purpose = ${sqlText(purpose)}
         AND used_at IS NULL
         AND expires_at > now()
       RETURNING id, user_id, purpose, expires_at, used_at`,
    );
    if (rows.length === 0) return null;
    return rowToToken(rows[0]);
  }
}
