/**
 * Persistence for SkunkScan's own user accounts (Milestone 4, PR 1:
 * register/login/logout/session - deliberately no billing/entitlements
 * fields anywhere here, since that depends on a still-pending Stripe-vs-
 * Merchant-of-Record decision this work is scoped to stay independent of).
 *
 * Lives in the same `skunkscan` Postgres schema as
 * candidates/schema.ts's scam_pattern_candidates table, for the same
 * reason documented there - this is SkunkScan-specific data, not shared
 * elizaOS runtime state, and keeping it out of the public schema avoids
 * any collision with @elizaos/core's own base tables.
 */

import { boolean, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { skunkscanPgSchema } from "../candidates/schema";

export const users = skunkscanPgSchema.table("users", {
  id: uuid("id").primaryKey().defaultRandom(),

  // Stored lowercased (case-insensitive login/uniqueness) - normalized in
  // application code (see auth/repository.ts), not a DB-level citext
  // column, matching this codebase's existing convention of enforcing
  // simple normalization rules in code rather than reaching for a
  // Postgres extension.
  email: text("email").notNull().unique(),

  // bcrypt hash (bcryptjs - see auth/password.ts's doc comment for why
  // the pure-JS package, not the native `bcrypt` binding, was used) -
  // never the plaintext password, never reversible.
  passwordHash: text("password_hash").notNull(),

  // PR 2: whether the user has clicked a real verification link (see
  // verificationTokens below). Does not gate login/use of the account -
  // this milestone never made verification a login requirement, only a
  // real, honest status the account carries.
  emailVerified: boolean("email_verified").notNull().default(false),

  // Deliberately no `plan`/`subscription`/`credits`/`organization_id`
  // field - entitlements are out of scope for this milestone by design,
  // see this file's own header comment.

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sessions = skunkscanPgSchema.table("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),

  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // SHA-256 hex digest of the raw session token - the raw token itself
  // only ever exists in the httpOnly cookie sent to the browser and is
  // never persisted, so a database read (or a backup/leak of this table)
  // can't be used to forge a session the way storing the raw token
  // would allow. See auth/session.ts for the hashing.
  tokenHash: text("token_hash").notNull().unique(),

  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// PR 2: a single table for both purposes (verify_email and
// reset_password) rather than two - they're structurally identical (a
// hashed one-time token tied to a user, an expiry, a used-once marker),
// and a `purpose` column is enough to keep them from being confused with
// each other (checked explicitly wherever a token is consumed - see
// auth/verificationTokens.ts).
export const verificationTokens = skunkscanPgSchema.table("verification_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),

  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // SHA-256 hex digest of the raw token - same reasoning as
  // sessions.tokenHash above: the raw token only ever exists in the
  // emailed link, never persisted.
  tokenHash: text("token_hash").notNull().unique(),

  purpose: text("purpose").notNull(),

  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),

  // Null until consumed. A token is valid to use exactly once - checked
  // explicitly (usedAt IS NULL) rather than deleting the row on use, so a
  // second attempt with the same (now-stale) link gets a real "this link
  // was already used" answer instead of "invalid token" indistinguishable
  // from a typo or a token that never existed.
  usedAt: timestamp("used_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const authSchema = { users, sessions, verificationTokens } as const;
