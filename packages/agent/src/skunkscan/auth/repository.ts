/**
 * Raw-SQL persistence for SkunkScan's own accounts, mirroring
 * candidates/store.ts's exact shape (same reason: needs to work both from
 * a live API route with a real runtime.adapter.db, and from a standalone
 * script/test with no full agent runtime booted). Reuses candidates/sql.ts's
 * helpers directly rather than duplicating them - they were already generic
 * (RuntimeDb, executeRawSql, sqlText, etc.), not candidate-specific despite
 * the file's location.
 */
import { randomUUID } from "node:crypto";
import {
  executeRawSql,
  sqlText,
  toText,
  type RuntimeDb,
} from "../candidates/sql";

const USERS_TABLE = "skunkscan.users";
const SESSIONS_TABLE = "skunkscan.sessions";

const USER_SELECT_COLUMNS =
  "id, email, password_hash, email_verified, created_at, updated_at";

export type StoredUser = {
  id: string;
  email: string;
  passwordHash: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type StoredSession = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
};

function parseTimestamp(value: unknown): Date {
  const date = new Date(toText(value));
  if (Number.isNaN(date.getTime())) {
    throw new Error(`[SkunkscanAuth] invalid timestamp from db: ${toText(value)}`);
  }
  return date;
}

function rowToUser(row: Record<string, unknown>): StoredUser {
  return {
    id: toText(row.id),
    email: toText(row.email),
    passwordHash: toText(row.password_hash),
    emailVerified: row.email_verified === true,
    createdAt: parseTimestamp(row.created_at),
    updatedAt: parseTimestamp(row.updated_at),
  };
}

function rowToSession(row: Record<string, unknown>): StoredSession {
  return {
    id: toText(row.id),
    userId: toText(row.user_id),
    tokenHash: toText(row.token_hash),
    expiresAt: parseTimestamp(row.expires_at),
  };
}

// Thrown on a duplicate email (the users.email unique constraint) so
// callers can distinguish "this email is already registered" from any
// other unexpected DB failure, rather than surfacing a raw Postgres
// constraint-violation message to the API caller.
export class EmailAlreadyRegisteredError extends Error {
  constructor(email: string) {
    super(`[SkunkscanAuth] email already registered: ${email}`);
    this.name = "EmailAlreadyRegisteredError";
  }
}

// Postgres' real unique-violation signal (error code 23505). Drizzle wraps
// the raw driver error in a DrizzleQueryError whose own `.message` is just
// "Failed query: ..." with no code/constraint info - the real Postgres
// error (code, constraint, detail) lives on `.cause`, live-confirmed by
// actually triggering a duplicate-email insert against a real PGlite
// database rather than assumed from Drizzle's docs. Checked structurally
// (a `code` property equal to "23505"), not by string-matching a message,
// so this can't silently stop working if Drizzle's own wrapper text ever
// changes.
function isUniqueViolation(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const cause = (error as { cause?: unknown }).cause;
  if (cause && typeof cause === "object" && "code" in cause) {
    return (cause as { code?: unknown }).code === "23505";
  }
  return false;
}

// Normalizes to lowercase once, here, rather than trusting every caller to
// remember - email lookups/inserts always go through this so a mixed-case
// login attempt (or a mixed-case address the user typed at signup) can
// never silently create a second account or fail to find the first one.
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export class UsersRepository {
  constructor(private readonly db: RuntimeDb) {}

  async create(email: string, passwordHash: string): Promise<StoredUser> {
    const normalizedEmail = normalizeEmail(email);
    const id = randomUUID();

    let rows: Array<Record<string, unknown>>;
    try {
      rows = await executeRawSql(
        this.db,
        `INSERT INTO ${USERS_TABLE} (id, email, password_hash)
         VALUES (${sqlText(id)}, ${sqlText(normalizedEmail)}, ${sqlText(passwordHash)})
         RETURNING ${USER_SELECT_COLUMNS}`,
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new EmailAlreadyRegisteredError(normalizedEmail);
      }
      throw error;
    }

    if (rows.length === 0) {
      throw new Error("[SkunkscanAuth] user insert returned no rows");
    }
    return rowToUser(rows[0]);
  }

  async findByEmail(email: string): Promise<StoredUser | null> {
    const rows = await executeRawSql(
      this.db,
      `SELECT ${USER_SELECT_COLUMNS} FROM ${USERS_TABLE}
       WHERE email = ${sqlText(normalizeEmail(email))}
       LIMIT 1`,
    );
    if (rows.length === 0) return null;
    return rowToUser(rows[0]);
  }

  async findById(id: string): Promise<StoredUser | null> {
    const rows = await executeRawSql(
      this.db,
      `SELECT ${USER_SELECT_COLUMNS} FROM ${USERS_TABLE} WHERE id = ${sqlText(id)} LIMIT 1`,
    );
    if (rows.length === 0) return null;
    return rowToUser(rows[0]);
  }

  async markEmailVerified(userId: string): Promise<void> {
    await executeRawSql(
      this.db,
      `UPDATE ${USERS_TABLE}
       SET email_verified = TRUE, updated_at = now()
       WHERE id = ${sqlText(userId)}`,
    );
  }

  async updatePasswordHash(userId: string, newPasswordHash: string): Promise<void> {
    await executeRawSql(
      this.db,
      `UPDATE ${USERS_TABLE}
       SET password_hash = ${sqlText(newPasswordHash)}, updated_at = now()
       WHERE id = ${sqlText(userId)}`,
    );
  }
}

export class SessionsRepository {
  constructor(private readonly db: RuntimeDb) {}

  async create(userId: string, tokenHash: string, expiresAt: Date): Promise<StoredSession> {
    const id = randomUUID();
    const rows = await executeRawSql(
      this.db,
      `INSERT INTO ${SESSIONS_TABLE} (id, user_id, token_hash, expires_at)
       VALUES (${sqlText(id)}, ${sqlText(userId)}, ${sqlText(tokenHash)}, ${sqlText(expiresAt.toISOString())})
       RETURNING id, user_id, token_hash, expires_at`,
    );
    if (rows.length === 0) {
      throw new Error("[SkunkscanAuth] session insert returned no rows");
    }
    return rowToSession(rows[0]);
  }

  // Returns null for a genuinely missing token AND for one that exists but
  // has expired - callers don't need to distinguish "no such session" from
  // "expired session" (both mean "not logged in"), and treating them the
  // same here avoids a second class of bug where a caller checks the
  // session but forgets to separately check expiry.
  async findValidByTokenHash(tokenHash: string): Promise<StoredSession | null> {
    const rows = await executeRawSql(
      this.db,
      `SELECT id, user_id, token_hash, expires_at FROM ${SESSIONS_TABLE}
       WHERE token_hash = ${sqlText(tokenHash)} AND expires_at > now()
       LIMIT 1`,
    );
    if (rows.length === 0) return null;
    return rowToSession(rows[0]);
  }

  async deleteByTokenHash(tokenHash: string): Promise<void> {
    await executeRawSql(
      this.db,
      `DELETE FROM ${SESSIONS_TABLE} WHERE token_hash = ${sqlText(tokenHash)}`,
    );
  }

  // Called on a successful password reset - a stolen/leaked session
  // cookie from before the reset should stop working the moment the
  // legitimate owner regains control via email, not silently keep
  // working until it naturally expires up to 30 days later.
  async deleteAllForUser(userId: string): Promise<void> {
    await executeRawSql(
      this.db,
      `DELETE FROM ${SESSIONS_TABLE} WHERE user_id = ${sqlText(userId)}`,
    );
  }
}
