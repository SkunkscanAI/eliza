import { WalletExposureSummary, WalletRiskSummary } from "../types";

// The wallet-independent "does real exposure evidence override a
// recommendation that was computed without seeing it" rule - shared so
// caseSummary.ts and executiveVerdict.ts can't drift apart the way they did
// before this fix (a real OFAC-sanctioned wallet had executiveVerdict
// correctly say "High risk wallet" while caseSummary.executiveSummary still
// said "Recommendation: allow", because caseSummary.ts never received
// exposure as an input at all). Same reasoning as sourceDisclosure.ts's
// getSystemSourcesChecked()/describeConnectedSources(): a single place for
// logic that multiple independent analyzers need to agree on, rather than
// each one re-implementing its own copy that can silently go out of sync.
//
// baseRecommendation is whatever the caller already computed from its own
// evidence (risk level, behavior profile, decision factors, etc.) before
// considering exposure - this function only ever escalates that baseline
// toward more caution, never downgrades it, since a low-exposure result
// should never override a caller's own more serious finding.
export function elevateRecommendationForExposure(
  baseRecommendation: "allow" | "review" | "investigate" | "high_risk",
  risk: WalletRiskSummary,
  exposure: WalletExposureSummary,
): "allow" | "review" | "investigate" | "high_risk" {
  if (risk.level === "high" || exposure.exposureLevel === "high") {
    return "high_risk";
  }

  if (baseRecommendation === "high_risk" || baseRecommendation === "investigate") {
    return baseRecommendation;
  }

  if (baseRecommendation === "review" || exposure.exposureLevel === "medium") {
    return "review";
  }

  return baseRecommendation;
}
