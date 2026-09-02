import { WalletComplianceScreeningSource } from "../types";
import { getSanctionsRegistryStatus } from "../exposure/sanctionsRegistry";

// The wallet-independent "what sources exist, and are they connected right
// now" list - moved here from compliance.ts so exposure.ts/trust.ts/risk.ts
// (which all run BEFORE compliance.ts in the pipeline; compliance.ts is
// built FROM exposure.ts's own output, so those files can't import
// compliance.ts's sourcesChecked without a circular dependency) can build
// the same scope-disclosure text without duplicating source names as
// separate literals. compliance.ts imports this back and layers its own
// wallet-specific matches on top - same fields, same values, single place
// the source list itself is defined.
export function getSystemSourcesChecked(): WalletComplianceScreeningSource[] {
  const sanctionsRegistryStatus = getSanctionsRegistryStatus();

  return [
    {
      name: "SkunkScan Internal Registry",
      category: "internal_registry",
      status: "connected",
      coverage: [
        "Known scam wallets",
        "Known rug pulls",
        "Known suspicious wallets",
      ],
      lastUpdatedAt: null,
      notes: ["Maintained by SkunkScan."],
    },
    {
      name: "OFAC Sanctions List (SDN)",
      category: "sanctions",
      status: sanctionsRegistryStatus.connected ? "connected" : "unavailable",
      // Deliberately OFAC only, not "OFAC, EU, UK, UN" - investigated
      // directly and confirmed EU/UK do not publish crypto addresses in a
      // free, reliably-structured form (EU: no consistent structured
      // field, not even modeled by OpenSanctions' own multi-source
      // aggregator; UK: addresses appear only in free-text fields, not a
      // structured one) and UN does not appear to publish crypto addresses
      // in any form. Overstating coverage here would be the same class of
      // dishonesty already fixed elsewhere in this compliance pipeline.
      coverage: [
        "US Treasury OFAC Specially Designated Nationals (SDN) list",
        "Bitcoin, Ethereum, BNB Chain, and Solana addresses directly",
        "Base addresses indirectly, via Ethereum's shared 0x address format (not an OFAC-confirmed Base-specific designation)",
      ],
      lastUpdatedAt: sanctionsRegistryStatus.lastUpdatedAt,
      notes: [
        sanctionsRegistryStatus.connected
          ? "Self-hosted from 0xB10C/ofac-sanctioned-digital-currency-addresses (MIT), refreshed periodically from the OFAC SDN list."
          : "The OFAC sanctions list has not loaded successfully yet - sanctions screening is temporarily unavailable, not confirmed clean.",
        "EU, UK, and UN sanctions lists are not connected: EU and UK do designate some crypto addresses, but not in a free, reliably-structured form suitable for self-hosting; UN does not appear to publish crypto addresses at all. Broader sanctions coverage would require a commercial provider that has done this linking work itself.",
        "Only self, funding-wallet, and in-sample counterparty matches are checked against this list - unlike the internal registry above, sanctioned-address exposure is not backed by the reverse transaction-history index, since scanning 1,000+ addresses' full history is not feasible the way it is for a small hand-curated list.",
      ],
    },
    {
      name: "Adverse Media Provider",
      category: "adverse_media",
      status: "planned",
      coverage: [
        "News",
        "Law enforcement",
        "Regulatory actions",
      ],
      lastUpdatedAt: null,
      notes: ["External provider integration planned."],
    },
  ];
}

// Single source of truth for "what did we actually check" scope text, so
// this doesn't get duplicated - and drift - across trust.ts, exposure.ts,
// decision.ts, caseSummary.ts, and the Trust Check card. Reads directly off
// getSystemSourcesChecked() / compliance.ts's sourcesChecked (the one place
// the real, live source list and connection status already exist) rather
// than restating source names as static literals in each of those files.
export function describeConnectedSources(
  sourcesChecked: WalletComplianceScreeningSource[] | undefined,
): string {
  const connected = (sourcesChecked ?? [])
    .filter((source) => source.status === "connected")
    .map((source) => source.name);

  if (connected.length === 0) {
    return "no currently connected screening sources";
  }

  if (connected.length === 1) {
    return connected[0];
  }

  return `${connected.slice(0, -1).join(", ")} and ${connected[connected.length - 1]}`;
}

// A short, reusable qualifier for pairing with any positive (clean /
// low-risk / no-match) finding, naming the real connected sources inline so
// the disclosure is part of the claim itself rather than a separate
// limitations section the reader has to find and cross-reference.
export function buildScopeDisclosure(
  sourcesChecked: WalletComplianceScreeningSource[] | undefined,
): string {
  return `Checked against ${describeConnectedSources(sourcesChecked)} only - not a guarantee of safety, and not a comprehensive screen.`;
}
