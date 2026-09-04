import { describe, expect, it } from "vitest";
import { investigateWallet } from "./wallet";

// Real regression guard, not a mock-based unit test - deliberately, matching
// this codebase's established testing philosophy (see e.g. the earlier
// incident where a mock-server test masked a real 401 auth bug). The bug
// this originally guarded against was purely structural: `executiveVerdict,`
// being silently dropped from investigateWallet()'s success-path return
// object literal for Solana/Ethereum/BNB/Base (fixed once in
// fix/skunkscan-missing-executive-verdict, then silently reintroduced by an
// unrelated later commit that touched the same file). A mocked test could
// pass while the real return object still drops the field if the mock
// doesn't force through the exact code path that assembles it - calling the
// real function against a real, known-stable address for every chain is
// the only test that would have caught this exact regression both times.
//
// Broadened to cover the whole bug class, not just executiveVerdict: a
// second instance turned up later (caseSummary, decision, investigationReport,
// and investigationNarrative were all computed by runWalletPipeline() but
// never pulled out of the destructured `pipeline` object at any of the 5
// per-chain call sites in wallet.ts, so they silently never reached the
// returned WalletInvestigationResult even though every one of them has a
// real field on that type). Same shape as the executiveVerdict bug -
// computed, then dropped on the way out - so every field runWalletPipeline()
// computes that WalletInvestigationResult declares a home for is asserted
// here, not just the two bugs found so far, to catch the next one too.
//
// Real addresses used (all previously live-verified earlier this session):
// - Bitcoin: a normal, fast-responding wallet (NOT the Genesis address,
//   which is deliberately slow/high-volume and used elsewhere for timeout
//   testing - a flaky regression guard is worse than no guard).
// - Ethereum/BNB/Base: Vitalik Buterin's public wallet.
// - Solana: a real wallet already used throughout this session's live
//   verification.
//
// Network-dependent and slower than a typical unit test - this is a
// deliberate tradeoff for a regression class that a mock could hide.
describe("investigateWallet - pipeline field wiring regression guard", () => {
  const CHAIN_ADDRESSES = [
    { chain: "bitcoin" as const, address: "34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo" },
    { chain: "ethereum" as const, address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" },
    { chain: "bnb" as const, address: "0x161ba15a5f335c9f06bb5bbb0a9ce14076fbb645" },
    { chain: "base" as const, address: "0x161ba15a5f335c9f06bb5bbb0a9ce14076fbb645" },
    { chain: "solana" as const, address: "CabQ27HBCj1FJTmMo3qJD12eL3sazNbnsxqLg1Yk2v7f" },
    // A real, long-lived XRPL account (activated 2014-09-12 per its own
    // on-ledger `inception` field, live-verified throughout the staged
    // XRP build's PR 1-3 work) - not a fabricated/test address.
    { chain: "xrp" as const, address: "rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH" },
  ];

  // Every field runWalletPipeline() computes (see pipeline/walletPipeline.ts's
  // return statement) that WalletInvestigationResult also declares a field
  // for - i.e. every one of these is expected to reach the final result on
  // a successful investigation, not just internal-only pipeline output like
  // transactionRiskAssessment (which has no corresponding result field and
  // is intentionally not asserted here).
  const EXPECTED_PIPELINE_FIELDS = [
    "activity",
    "age",
    "dormancy",
    "funding",
    "portfolio",
    "risk",
    "whale",
    "defi",
    "protocols",
    "protocolIntelligence",
    "behavior",
    "exposure",
    "relationships",
    "custodyProfile",
    "complianceScreening",
    "intelligenceSources",
    "trust",
    "display",
    "caseSummary",
    "transactionRisk",
    "smartMoney",
    "strategy",
    "conviction",
    "alpha",
    "investmentStyle",
    "profitability",
    "reputation",
    "skunkScore",
    "investigationReplay",
    "evidenceRecords",
    "decision",
    "assessment",
    "intelligenceBrief",
    "evidence",
    "executiveVerdict",
    "investigationReport",
    "investigationNarrative",
  ] as const;

  for (const { chain, address } of CHAIN_ADDRESSES) {
    it(
      `returns every pipeline-computed field on a real, successful investigation for ${chain}`,
      async () => {
        const result = await investigateWallet(chain, address);

        // A failed/unsupported result (e.g. a transient provider outage) is
        // a real environmental condition, not what this test guards against
        // - but if the investigation DID succeed, every field below must be
        // present. Asserting status too so a silent skip can't masquerade
        // as a pass.
        expect(result.status).toBe("supported");

        for (const field of EXPECTED_PIPELINE_FIELDS) {
          expect(
            result[field as keyof typeof result],
            `expected "${field}" to be defined on a supported ${chain} investigation`,
          ).toBeDefined();
        }

        expect(result.executiveVerdict?.verdict).toEqual(
          expect.stringMatching(/^(low_risk|review|investigate|high_risk)$/),
        );
      },
      30_000,
    );
  }
});
