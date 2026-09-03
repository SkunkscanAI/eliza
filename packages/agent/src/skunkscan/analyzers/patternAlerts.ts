import {
  SupportedChain,
  WalletPatternAlert,
  WalletRelationship,
} from "../types";
import {
  detectRaiseAndDrainPattern,
  RaiseAndDrainEvidence,
} from "../patterns/raiseAndDrain";
import { checkKnownLabelMatches } from "../patterns/knownLabelMatch";
import { ScamPatternCandidateStore } from "../candidates/store";
import type { RuntimeDb } from "../candidates/sql";

// Independent behavioral scam-pattern detection, wired into the live
// investigation - deliberately separate from exposure.ts's purely
// list-based scam/rug_pull/suspicious flags (see types.ts's
// WalletPatternAlert doc comment). This is the one piece of the pipeline
// that touches a database, since the whole point is to persist a
// detection once and stop recomputing it on every future search of the
// same wallet - every other analyzer in this pipeline is a pure function
// over already-fetched chain data.

const REQUIRED_EVIDENCE_NUMERIC_FIELDS: Array<keyof RaiseAndDrainEvidence> = [
  "drainRatio",
  "hoursBetweenInboundAndOutbound",
  "dormancyDays",
];

// DB-stored evidence round-trips through jsonb -> JSON.parse, so its shape
// is a runtime boundary like any other provider response - validated here
// rather than blindly cast, per this codebase's established
// silent-fallback-honesty convention (a malformed stored row must throw,
// not silently render "NaN% drained").
function parseStoredRaiseAndDrainEvidence(
  value: Record<string, unknown>,
): RaiseAndDrainEvidence {
  for (const field of REQUIRED_EVIDENCE_NUMERIC_FIELDS) {
    if (typeof value[field] !== "number" || !Number.isFinite(value[field])) {
      throw new Error(
        `[patternAlerts] stored raise_and_drain evidence missing/invalid numeric field "${field}"`,
      );
    }
  }
  return value as unknown as RaiseAndDrainEvidence;
}

// Built entirely from the detector's own real output fields - never a
// static, generic sentence. Matches the shape given as the worked example:
// "92% of inbound drained within 9 days, no further inbound activity, 45
// days dormant since."
export function buildRaiseAndDrainEvidenceSummary(
  evidence: RaiseAndDrainEvidence,
): string {
  const drainPercent = Math.round(evidence.drainRatio * 100);
  const daysToDrain = Math.round(
    evidence.hoursBetweenInboundAndOutbound / 24,
  );
  const dormancyDays = Math.round(evidence.dormancyDays);

  return (
    `${drainPercent}% of inbound funds drained within ${daysToDrain} day${daysToDrain === 1 ? "" : "s"}, ` +
    `no further inbound activity, ${dormancyDays} day${dormancyDays === 1 ? "" : "s"} dormant since.`
  );
}

function toPatternAlert(
  detectedAt: Date,
  evidence: RaiseAndDrainEvidence,
  reviewStatus: WalletPatternAlert["reviewStatus"],
): WalletPatternAlert {
  return {
    patternId: "raise_and_drain",
    detectedAt: detectedAt.toISOString(),
    evidenceSummary: buildRaiseAndDrainEvidenceSummary(evidence),
    reviewStatus,
  };
}

export async function analyzeWalletPatternAlerts(
  chain: SupportedChain,
  address: string,
  relationships: WalletRelationship[],
  db: RuntimeDb | undefined,
  nowTimestamp: number = Math.floor(Date.now() / 1000),
): Promise<WalletPatternAlert[]> {
  // No persistence layer available (a standalone script/test, or a
  // deployment without a configured database) - the detector can still
  // run as pure computation over already-fetched relationships, it just
  // can't be deduplicated against history or reviewed later. Every result
  // here is "pending" since nothing durable exists to hold any other
  // status.
  if (!db) {
    const evidence = detectRaiseAndDrainPattern(relationships, nowTimestamp);
    if (!evidence) return [];
    return [toPatternAlert(new Date(nowTimestamp * 1000), evidence, "pending")];
  }

  const store = new ScamPatternCandidateStore(db);
  const existing = await store.byAddress(chain, address);

  if (existing) {
    // A human has already reviewed this and confirmed it's not real -
    // showing it anyway would mean displaying something already known to
    // be wrong. Suppressed for every future investigation of this wallet,
    // not just this one.
    if (existing.reviewStatus === "rejected") return [];

    const evidence = parseStoredRaiseAndDrainEvidence(existing.evidence);
    return [toPatternAlert(existing.createdAt, evidence, existing.reviewStatus)];
  }

  // Not seen before - run the live detector once, and if it matches,
  // persist it so no future investigation of this same wallet needs to
  // recompute it.
  const evidence = detectRaiseAndDrainPattern(relationships, nowTimestamp);
  if (!evidence) return [];

  const { hasKnownLabelMatch, labelMatches } = checkKnownLabelMatches(
    chain,
    address,
    relationships,
  );
  const inserted = await store.insert({
    chain,
    address,
    patterns: ["raise_and_drain"],
    evidence,
    hasKnownLabelMatch,
    labelMatches,
  });

  return [toPatternAlert(inserted.createdAt, evidence, inserted.reviewStatus)];
}
