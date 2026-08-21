import { describe, expect, it } from "vitest";
import { investigateWallet } from "./wallet";

// Real regression guard, not a mock-based unit test - deliberately, matching
// this codebase's established testing philosophy (see e.g. the earlier
// incident where a mock-server test masked a real 401 auth bug). The bug
// this guards against was purely structural: `executiveVerdict,` being
// silently dropped from investigateWallet()'s success-path return object
// literal for Solana/Ethereum/BNB/Base (fixed once in
// fix/skunkscan-missing-executive-verdict, then silently reintroduced by an
// unrelated later commit that touched the same file). A mocked test could
// pass while the real return object still drops the field if the mock
// doesn't force through the exact code path that assembles it - calling the
// real function against a real, known-stable address for every chain is
// the only test that would have caught this exact regression both times.
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
describe("investigateWallet - executiveVerdict regression guard", () => {
  const CHAIN_ADDRESSES = [
    { chain: "bitcoin" as const, address: "34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo" },
    { chain: "ethereum" as const, address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" },
    { chain: "bnb" as const, address: "0x161ba15a5f335c9f06bb5bbb0a9ce14076fbb645" },
    { chain: "base" as const, address: "0x161ba15a5f335c9f06bb5bbb0a9ce14076fbb645" },
    { chain: "solana" as const, address: "CabQ27HBCj1FJTmMo3qJD12eL3sazNbnsxqLg1Yk2v7f" },
  ];

  for (const { chain, address } of CHAIN_ADDRESSES) {
    it(
      `returns a real, non-null executiveVerdict for ${chain}`,
      async () => {
        const result = await investigateWallet(chain, address);

        // A failed/unsupported result (e.g. a transient provider outage)
        // is a real environmental condition, not what this test guards
        // against - but if the investigation DID succeed, executiveVerdict
        // must be present. Asserting status too so a silent skip can't
        // masquerade as a pass.
        expect(result.status).toBe("supported");
        expect(result.executiveVerdict).toBeDefined();
        expect(result.executiveVerdict).not.toBeNull();
        expect(result.executiveVerdict?.verdict).toEqual(
          expect.stringMatching(/^(low_risk|review|investigate|high_risk)$/),
        );
      },
      30_000,
    );
  }
});
