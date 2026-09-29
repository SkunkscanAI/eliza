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

import { text, timestamp, uuid } from "drizzle-orm/pg-core";
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

export const authSchema = { users, sessions } as const;
