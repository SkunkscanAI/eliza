import { WalletAgeSummary } from "../types";

export function analyzeWalletAge(
  firstKnownTransactionId: string | null,
  firstKnownTransactionTime: number | null,
): WalletAgeSummary {
  // firstKnownTransactionId is optional context, not a gate - some
  // sources (Bitcoin's connector, via Blockchair's first_seen_receiving/
  // first_seen_spending address stats) supply an authoritative first-
  // activity timestamp without a specific transaction hash attached to
  // it. The timestamp alone is enough to classify age.
  if (firstKnownTransactionTime === null) {
    return {
      firstKnownTransaction: null,
      firstKnownTransactionAt: null,
      ageInDays: null,
      ageInMonths: null,
      classification: "unknown",
    };
  }

  const now = Math.floor(Date.now() / 1000);

  const ageInDays = Math.floor(
    (now - firstKnownTransactionTime) / 86400,
  );

  const ageInMonths = Math.floor(ageInDays / 30);

  let classification: WalletAgeSummary["classification"] = "new";

  if (ageInMonths >= 24) {
    classification = "veteran";
  } else if (ageInMonths >= 6) {
    classification = "established";
  }

  return {
    firstKnownTransaction: firstKnownTransactionId,
    firstKnownTransactionAt: firstKnownTransactionTime,
    ageInDays,
    ageInMonths,
    classification,
  };
}
