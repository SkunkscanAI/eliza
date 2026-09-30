/**
 * Builds the lightweight InvestigationCase saved to a logged-in user's
 * search history (see schema.ts's header comment for why this is
 * intentionally NOT the full WalletInvestigationResult).
 *
 * Deliberately does NOT go through walletIntegration.ts's
 * createWalletInvestigation()/builder.ts's buildWalletInvestigation() -
 * that bridge is already broken independent of this work: its declared
 * CreateWalletInvestigationInput type (`{chain, address, walletAnalysis}`)
 * doesn't match any of its 4 real call sites in wallet.ts (which pass
 * `{chain, address, executiveVerdict, assessment, ...}` - no
 * `walletAnalysis` field at all), and walletIntegration.ts's own import of
 * `WalletPipelineResult` from pipeline/types doesn't exist there either -
 * both are pre-existing TS errors (TS2353/TS2724) already present in this
 * package's typecheck baseline before this file, not introduced or fixed
 * here. That whole bridge is out of scope to repair for this milestone;
 * this file builds a valid, minimal InvestigationCase directly instead.
 */
import { randomUUID } from "node:crypto";
import { tierForVerdict } from "../analyzers/trustCheckCard";
import type { InvestigationCase } from "./types";
import type { SupportedChain, WalletInvestigationResult } from "../types";

const CHAIN_LABEL: Record<SupportedChain, string> = {
  bitcoin: "Bitcoin",
  ethereum: "Ethereum",
  bnb: "BNB Chain",
  xrp: "XRP Ledger",
  solana: "Solana",
  base: "Base",
};

export function buildInvestigationCaseFromWalletResult(
  ownerId: string,
  chain: SupportedChain,
  address: string,
  result: WalletInvestigationResult,
): InvestigationCase {
  const tier = tierForVerdict(result.executiveVerdict);
  const headline = result.executiveVerdict?.headline ?? null;
  const now = new Date().toISOString();

  return {
    id: randomUUID(),
    title: `${CHAIN_LABEL[chain] ?? chain} wallet ${address}`,
    status: "completed",
    priority: "low",
    subjects: [
      {
        id: randomUUID(),
        type: "wallet",
        chain,
        identifier: address,
        addedAt: now,
      },
    ],
    evidence: [],
    findings: [],
    notes: [],
    auditTrail: [],
    tags: [chain],
    createdBy: ownerId,
    createdAt: now,
    updatedAt: now,
    // tierForVerdict/headline live here, not as a repurposed `status` -
    // see repository.ts's own doc comment on StoredInvestigationSummary.tier.
    metadata: { tier, headline },
  };
}
