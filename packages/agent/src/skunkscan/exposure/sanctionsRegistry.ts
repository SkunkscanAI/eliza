import { isEvmChain, SupportedChain } from "../types";
import { ExposureRegistryEntry } from "./staticRegistry";

// Source: 0xB10C/ofac-sanctioned-digital-currency-addresses (MIT license),
// a nightly-regenerated extraction of the US Treasury OFAC SDN list's
// "Digital Currency Address" identification entries, published to the
// repo's `lists` branch. Investigated directly before adding this file:
// confirmed real (fetched and inspected actual address content, not just
// the README), and confirmed actively maintained (recent automated
// "Automatically updated lists" commits on `lists`, not a dead snapshot).
//
// Deliberately EU/UK/UN are NOT included here, investigated the same way:
// - EU has published a handful of real crypto addresses in specific
//   sanctions packages (e.g. six Garantex wallets in the 16th Russia
//   package), but not through a consistently structured field - even
//   OpenSanctions, a dedicated multi-source sanctions aggregator that has
//   ingested the EU consolidated list for years, does not model EU-sourced
//   crypto wallets via its own CryptoWallet schema (only US OFAC, Israel's
//   NBCTF, Japan's MOF, and UK's OFSI are structurally modeled there).
// - UK's OFSI list does designate crypto addresses, but only inside
//   free-text "other information"/statement-of-reasons fields, not a
//   structured field - reliably extracting them would mean regex-matching
//   address-shaped substrings out of prose (real false-positive/negative
//   risk), a fundamentally weaker approach than OFAC's dedicated
//   "Digital Currency Address - <asset>" feature type. No existing free,
//   actively-maintained extractor (the UK equivalent of 0xB10C's OFAC
//   tool) was found.
// - UN sanctions lists do not appear to publish cryptocurrency addresses
//   in any form, structured or free-text - there is nothing to extract.
// None of the three currently meet the bar this OFAC source does (free,
// self-hostable, actively maintained, structured address data) - flagged
// honestly in compliance.ts's sourcesChecked rather than silently
// pretending broader coverage than this actually provides.

const OFAC_LIST_BASE_URL =
  "https://raw.githubusercontent.com/0xB10C/ofac-sanctioned-digital-currency-addresses/lists";

// Only the asset codes relevant to SkunkScan's 5 supported chains, out of
// the repo's 18 total. Base has no dedicated OFAC asset code - it's an
// Ethereum L2 sharing Ethereum's 0x address format, so the ETH list is
// reused for Base lookups too. This is coverage-by-shared-address-format,
// not an OFAC-confirmed Base-specific designation - disclosed as such in
// compliance.ts, not presented as equivalent to the other 4 chains'
// direct, asset-specific coverage.
const CHAIN_ASSET_CODES: Partial<Record<SupportedChain, string>> = {
  bitcoin: "XBT",
  ethereum: "ETH",
  bnb: "BSC",
  solana: "SOL",
  base: "ETH",
};

// Comfortably inside the upstream nightly (0 UTC) cadence without hammering
// GitHub's raw content host - a few hours of staleness on a government list
// that itself only updates once a day is a reasonable, disclosed tradeoff
// (see lastUpdatedAt surfaced via getSanctionsRegistryStatus below), not a
// silent gap.
const REFRESH_INTERVAL_MS = 12 * 60 * 60 * 1000;

let registryByChain: Partial<Record<SupportedChain, ReadonlySet<string>>> = {};
let lastSuccessfulRefreshAt: number | null = null;
let refreshTimer: ReturnType<typeof setInterval> | undefined;

async function fetchAssetList(assetCode: string): Promise<string[]> {
  const response = await fetch(
    `${OFAC_LIST_BASE_URL}/sanctioned_addresses_${assetCode}.txt`,
  );

  if (!response.ok) {
    throw new Error(
      `OFAC sanctions list fetch failed for asset ${assetCode}: HTTP ${response.status}`,
    );
  }

  const text = await response.text();

  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

async function refreshSanctionsRegistry(): Promise<void> {
  // Fetch each distinct asset code once (ETH is reused for both ethereum
  // and base) rather than once per chain - halves the real request count.
  const distinctAssetCodes = Array.from(
    new Set(Object.values(CHAIN_ASSET_CODES)),
  );

  const addressesByAsset = new Map<string, string[]>();

  for (const assetCode of distinctAssetCodes) {
    addressesByAsset.set(assetCode, await fetchAssetList(assetCode));
  }

  // Only reached if every fetch above succeeded - a partial failure (e.g.
  // the SOL file 404s while XBT/ETH/BSC succeed) throws out of the loop
  // before this point, leaving the previous (stale but real) registry
  // serving lookups untouched rather than silently downgrading chains
  // that were previously covered. Matches this codebase's established
  // "throw on a bad fetch, never silently substitute an empty/partial
  // result" rule.
  const nextRegistry: Partial<Record<SupportedChain, ReadonlySet<string>>> = {};

  for (const [chain, assetCode] of Object.entries(CHAIN_ASSET_CODES) as [
    SupportedChain,
    string,
  ][]) {
    const addresses = addressesByAsset.get(assetCode) ?? [];

    // EVM addresses are normalized lowercase at load time, same convention
    // as staticRegistry.ts - Bitcoin/Solana addresses are case-sensitive
    // and stored exactly as published.
    nextRegistry[chain] = new Set(
      isEvmChain(chain)
        ? addresses.map((address) => address.toLowerCase())
        : addresses,
    );
  }

  registryByChain = nextRegistry;
  lastSuccessfulRefreshAt = Date.now();
}

// Idempotent - safe to call from multiple code paths (e.g. server boot and
// the first real investigation) without starting duplicate timers.
export function ensureSanctionsRegistryStarted(): void {
  if (refreshTimer) {
    return;
  }

  void refreshSanctionsRegistry().catch((error) => {
    // eslint-disable-next-line no-console
    console.error(
      "[sanctionsRegistry] initial OFAC sanctions list load failed - sanctions screening stays unavailable until a refresh succeeds:",
      error,
    );
  });

  refreshTimer = setInterval(() => {
    void refreshSanctionsRegistry().catch((error) => {
      // eslint-disable-next-line no-console
      console.error(
        "[sanctionsRegistry] periodic OFAC sanctions list refresh failed - continuing to serve the last successfully-loaded list:",
        error,
      );
    });
  }, REFRESH_INTERVAL_MS);

  // Don't keep the process alive solely for this timer.
  refreshTimer.unref?.();
}

export function lookupSanctionsRegistry(
  chain: SupportedChain,
  address: string | null | undefined,
): ExposureRegistryEntry | null {
  if (!address) {
    return null;
  }

  const list = registryByChain[chain];

  if (!list) {
    return null;
  }

  const normalizedAddress = isEvmChain(chain) ? address.toLowerCase() : address;

  if (!list.has(normalizedAddress)) {
    return null;
  }

  return {
    address: normalizedAddress,
    label: "OFAC Sanctions List (SDN)",
    category: "sanctioned",
    confidence: "high",
    source: "external_provider",
    // Overwritten by every real caller (self/funder/counterparty checks in
    // exposure.ts) - placeholder defaults only, same pattern
    // staticRegistry.ts's entries already use.
    relationship: "self",
    contributesToScore: true,
  };
}

// Read by compliance.ts to decide the real "Sanctions Provider"
// sourcesChecked status (connected vs. unavailable) and to surface a real
// lastUpdatedAt instead of the previous hardcoded null - never claims
// "connected" if no successful load has ever completed.
export function getSanctionsRegistryStatus(): {
  connected: boolean;
  lastUpdatedAt: string | null;
} {
  return {
    connected: lastSuccessfulRefreshAt !== null,
    lastUpdatedAt: lastSuccessfulRefreshAt
      ? new Date(lastSuccessfulRefreshAt).toISOString()
      : null,
  };
}
