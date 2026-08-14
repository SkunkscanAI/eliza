import { WalletDormancySummary } from "../types";

const ACTIVE_WITHIN_DAYS = 30;
const RECENT_WITHIN_DAYS = 180;

// Deliberately independent of analyzeWalletAge - dormancy is about how
// recently the wallet was last active, not how long ago it was first
// seen. Sourced from WalletActivitySummary.lastActiveAt (the most recent
// transaction in the analyzed sample), which is already computed
// correctly there - this function only buckets it.
export function analyzeWalletDormancy(
  lastActiveAt: number | null | undefined,
): WalletDormancySummary {
  if (typeof lastActiveAt !== "number") {
    return {
      lastActiveAt: null,
      daysSinceLastActivity: null,
      isDormant: false,
      classification: "unknown",
    };
  }

  const now = Math.floor(Date.now() / 1000);

  const daysSinceLastActivity = Math.max(
    0,
    Math.floor((now - lastActiveAt) / 86400),
  );

  let classification: WalletDormancySummary["classification"] = "dormant";

  if (daysSinceLastActivity <= ACTIVE_WITHIN_DAYS) {
    classification = "active";
  } else if (daysSinceLastActivity <= RECENT_WITHIN_DAYS) {
    classification = "recent";
  }

  return {
    lastActiveAt,
    daysSinceLastActivity,
    isDormant: classification === "dormant",
    classification,
  };
}
