/**
 * Raw-SQL implementation of InvestigationRepository (see repository.ts's
 * own doc comment - this interface was designed for exactly this and left
 * unimplemented until Milestone 4, PR 5). Same RuntimeDb raw-SQL pattern
 * as auth/repository.ts and candidates/store.ts.
 */
import { executeRawSql, parseJsonRecord, sqlBoolean, sqlJson, sqlText, toText, type RuntimeDb } from "../candidates/sql";
import { InvestigationCase } from "./types";
import {
  InvestigationOwnerId,
  InvestigationRepository,
  SaveInvestigationInput,
  StoredInvestigation,
  StoredInvestigationSummary,
} from "./repository";

const TABLE = "skunkscan.investigations";

// A user's own search history is a convenience list, not an archive - past
// this many rows, the oldest gets evicted on the next new save (re-saving
// an existing (owner, chain, address) row never counts against the cap,
// since it's an update, not a new row). See save()'s own comment for why
// this only runs after a genuine insert.
const MAX_SAVED_PER_OWNER = 100;

function parseTimestamp(value: unknown): string {
  const date = new Date(toText(value));
  if (Number.isNaN(date.getTime())) {
    throw new Error(`[SkunkscanInvestigations] invalid timestamp from db: ${toText(value)}`);
  }
  return date.toISOString();
}

function parseOptionalText(value: unknown): string | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  return toText(value);
}

function parseTier(value: unknown): "green" | "yellow" | "red" | null {
  const text = toText(value, "");
  return text === "green" || text === "yellow" || text === "red" ? text : null;
}

function rowToStoredInvestigation(row: Record<string, unknown>): StoredInvestigation {
  return {
    ownerId: toText(row.owner_id),
    investigation: parseJsonRecord(row.case_data) as unknown as InvestigationCase,
    savedAt: parseTimestamp(row.saved_at),
    personalLabel: parseOptionalText(row.personal_label),
    personalNotes: parseOptionalText(row.personal_notes),
    isWatchlisted: row.is_watchlisted === true,
  };
}

function rowToSummary(row: Record<string, unknown>): StoredInvestigationSummary {
  return {
    investigationId: toText(row.id),
    ownerId: toText(row.owner_id),
    title: toText(row.title),
    chain: toText(row.chain),
    address: toText(row.address),
    status: toText(row.status) as StoredInvestigationSummary["status"],
    createdAt: parseTimestamp(row.created_at),
    updatedAt: parseTimestamp(row.saved_at),
    savedAt: parseTimestamp(row.saved_at),
    personalLabel: parseOptionalText(row.personal_label),
    isWatchlisted: row.is_watchlisted === true,
    tier: parseTier(row.tier),
    headline: parseOptionalText(row.headline),
  };
}

export class InvestigationStore implements InvestigationRepository {
  constructor(private readonly db: RuntimeDb) {}

  // Upserts on (ownerId, chain, address) - re-running the same wallet
  // updates the existing row (fresh tier/headline/case_data/savedAt)
  // rather than creating a duplicate, per this milestone's own scoping
  // decision (a user's history should stay a diverse list of wallets
  // they've checked, not be spammed by repeat-checking one wallet).
  async save(input: SaveInvestigationInput): Promise<StoredInvestigation> {
    const subject = input.investigation.subjects[0];
    const chain = subject?.chain ?? "unknown";
    const address = subject?.identifier ?? "";
    const metadata = (input.investigation.metadata ?? {}) as Record<string, unknown>;
    const tier = parseTier(metadata.tier);
    const headline = typeof metadata.headline === "string" ? metadata.headline : null;

    const rows = await executeRawSql(
      this.db,
      `INSERT INTO ${TABLE} (
         owner_id, chain, address, title, status, tier, headline,
         personal_label, personal_notes, is_watchlisted, case_data
       )
       VALUES (
         ${sqlText(input.ownerId)}, ${sqlText(chain)}, ${sqlText(address)},
         ${sqlText(input.investigation.title)}, ${sqlText(input.investigation.status)},
         ${sqlText(tier)}, ${sqlText(headline)},
         ${sqlText(input.personalLabel ?? null)}, ${sqlText(input.personalNotes ?? null)},
         ${sqlBoolean(input.isWatchlisted ?? false)}, ${sqlJson(input.investigation)}
       )
       ON CONFLICT (owner_id, chain, address) DO UPDATE SET
         title = EXCLUDED.title,
         status = EXCLUDED.status,
         tier = EXCLUDED.tier,
         headline = EXCLUDED.headline,
         case_data = EXCLUDED.case_data,
         saved_at = now()
       RETURNING *, (xmax = 0) AS inserted`,
    );
    if (rows.length === 0) {
      throw new Error("[SkunkscanInvestigations] investigation upsert returned no rows");
    }

    const row = rows[0];
    if (row.inserted === true) {
      await this.evictOldestBeyondCap(input.ownerId);
    }

    return rowToStoredInvestigation(row);
  }

  async findById(
    ownerId: InvestigationOwnerId,
    investigationId: string,
  ): Promise<StoredInvestigation | null> {
    const rows = await executeRawSql(
      this.db,
      `SELECT * FROM ${TABLE}
       WHERE id = ${sqlText(investigationId)} AND owner_id = ${sqlText(ownerId)}
       LIMIT 1`,
    );
    if (rows.length === 0) return null;
    return rowToStoredInvestigation(rows[0]);
  }

  async listByOwner(ownerId: InvestigationOwnerId): Promise<StoredInvestigationSummary[]> {
    const rows = await executeRawSql(
      this.db,
      `SELECT id, owner_id, title, chain, address, status, tier, headline,
              created_at, saved_at, personal_label, is_watchlisted
       FROM ${TABLE}
       WHERE owner_id = ${sqlText(ownerId)}
       ORDER BY saved_at DESC
       LIMIT ${MAX_SAVED_PER_OWNER}`,
    );
    return rows.map(rowToSummary);
  }

  async updatePersonalDetails(
    ownerId: InvestigationOwnerId,
    investigationId: string,
    updates: { personalLabel?: string; personalNotes?: string; isWatchlisted?: boolean },
  ): Promise<StoredInvestigation | null> {
    const setClauses: string[] = [];
    if (updates.personalLabel !== undefined) {
      setClauses.push(`personal_label = ${sqlText(updates.personalLabel)}`);
    }
    if (updates.personalNotes !== undefined) {
      setClauses.push(`personal_notes = ${sqlText(updates.personalNotes)}`);
    }
    if (updates.isWatchlisted !== undefined) {
      setClauses.push(`is_watchlisted = ${sqlBoolean(updates.isWatchlisted)}`);
    }
    if (setClauses.length === 0) {
      return this.findById(ownerId, investigationId);
    }

    const rows = await executeRawSql(
      this.db,
      `UPDATE ${TABLE} SET ${setClauses.join(", ")}
       WHERE id = ${sqlText(investigationId)} AND owner_id = ${sqlText(ownerId)}
       RETURNING *`,
    );
    if (rows.length === 0) return null;
    return rowToStoredInvestigation(rows[0]);
  }

  async delete(ownerId: InvestigationOwnerId, investigationId: string): Promise<boolean> {
    const rows = await executeRawSql(
      this.db,
      `DELETE FROM ${TABLE}
       WHERE id = ${sqlText(investigationId)} AND owner_id = ${sqlText(ownerId)}
       RETURNING id`,
    );
    return rows.length > 0;
  }

  private async evictOldestBeyondCap(ownerId: InvestigationOwnerId): Promise<void> {
    await executeRawSql(
      this.db,
      `DELETE FROM ${TABLE}
       WHERE owner_id = ${sqlText(ownerId)}
         AND id NOT IN (
           SELECT id FROM ${TABLE}
           WHERE owner_id = ${sqlText(ownerId)}
           ORDER BY saved_at DESC
           LIMIT ${MAX_SAVED_PER_OWNER}
         )`,
    );
  }
}
