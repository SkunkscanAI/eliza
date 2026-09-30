/**
 * Persistence for a logged-in user's saved search/investigation history -
 * the real backer for investigations/repository.ts's InvestigationRepository
 * interface, which was designed for exactly this and left unimplemented
 * until now (Milestone 4, PR 5).
 *
 * Lives in the same `skunkscan` Postgres schema as auth/schema.ts and
 * candidates/schema.ts, for the same reason documented there.
 *
 * Deliberately does NOT store the full ~40-field WalletInvestigationResult -
 * Report.tsx already re-fetches live on every view (POST /api/skunkscan/
 * wallet), so a stored full snapshot would both duplicate that data and go
 * stale the moment new on-chain activity comes in. This table stores just
 * enough to render a history list and re-fetch: chain, address, a display
 * tier/headline (see analyzers/trustCheckCard.ts's tierForVerdict, reused
 * here rather than re-derived), and timestamps.
 */

import { boolean, jsonb, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { skunkscanPgSchema } from "../candidates/schema";
import { users } from "../auth/schema";

export const investigations = skunkscanPgSchema.table(
  "investigations",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    chain: text("chain").notNull(),
    address: text("address").notNull(),

    // "wallet" is the only InvestigationSubjectType this saves today - see
    // types.ts's InvestigationSubjectType for the fuller vocabulary a
    // future investigation type (transaction, token, ...) could use.
    title: text("title").notNull(),

    // Always "completed" for now - every save happens after a real
    // investigation finished running. InvestigationCase.status is a
    // case-management lifecycle field, not a risk tier; the tier/headline
    // below carry the actual green/yellow/red verdict for display.
    status: text("status").notNull().default("completed"),

    // WalletTrustCheckTier ("green"|"yellow"|"red") or null - same
    // tierForVerdict mapping the free Trust Check card uses, kept as its
    // own column (not buried in metadata) since it's what the history
    // list actually renders.
    tier: text("tier"),
    headline: text("headline"),

    // The lightweight InvestigationCase itself (id, title, status,
    // subjects/evidence/findings/notes/auditTrail, tags, createdBy,
    // timestamps, metadata:{tier,headline}) - NOT the full
    // WalletInvestigationResult (see this file's header comment for why).
    // Stored so findById() can faithfully return a real InvestigationCase
    // per the InvestigationRepository interface; listByOwner() never reads
    // this column, only the flat display columns above.
    caseData: jsonb("case_data").notNull(),

    // Investor-editable fields the InvestigationRepository interface
    // already anticipated - columns added now (cheap), editing UI
    // deliberately deferred to a later pass.
    personalLabel: text("personal_label"),
    personalNotes: text("personal_notes"),
    isWatchlisted: boolean("is_watchlisted").notNull().default(false),

    // createdAt: first time this (owner, chain, address) was saved.
    // updatedAt/savedAt share one moment in this auto-save flow (every
    // save is also "the most recent view"), so a single savedAt column
    // covers both rather than persisting two identical timestamps.
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    savedAt: timestamp("saved_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // One row per (owner, chain, address) - re-running the same wallet
    // upserts the existing row (fresh tier/headline/savedAt) instead of
    // creating a duplicate, so a user's history stays a meaningfully
    // diverse list rather than being spammed by repeat-checking one
    // wallet. See investigations/store.ts's save().
    unique().on(t.ownerId, t.chain, t.address),
  ],
);

export const investigationsSchema = { investigations } as const;
