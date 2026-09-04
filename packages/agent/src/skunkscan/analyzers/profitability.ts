import {
  WalletAlphaSummary,
  WalletConvictionSummary,
  WalletPortfolioSummary,
  WalletProfitabilitySummary,
  WalletSmartMoneySummary,
  WalletStrategySummary,
  WalletTrustSummary,
} from "../types";

type ProfitabilityInput = {
  alpha: WalletAlphaSummary;
  conviction: WalletConvictionSummary;
  strategy: WalletStrategySummary;
  trust: WalletTrustSummary;
  smartMoney: WalletSmartMoneySummary;
  portfolio: WalletPortfolioSummary;
};

export function analyzeWalletProfitability(
  input: ProfitabilityInput,
): WalletProfitabilitySummary {
  // investorSkillScore below is a weighted blend of alpha/smartMoney/trust/
  // conviction - not hardcoded, a real computation. But alpha, smartMoney,
  // and conviction all read portfolio.diversityScore/diversityLevel
  // directly (see their own dataCompleteness handling), so when token
  // holdings were truncated/timed out, this blend rests on inputs we
  // already know are unreliable. Short-circuiting here, rather than
  // computing and displaying a number, is what prevents the exact bug this
  // was built to fix: a confident-looking score (e.g. 5.9/10) with no
  // positiveIndicators/negativeIndicators actually backing it.
  if (input.portfolio.dataCompleteness === "incomplete") {
    return {
      investorSkillScore: 0,
      displayScore: "N/A",
      investorSkillLevel: "unknown",
      resemblesProfitablePattern: "unknown",
      confidence: "low",
      evidenceConfidence: "low",
      confidenceAnalysis: {
        rawScore: 0,
        maxScore: 100,
        displayScore: "N/A",
        maxDisplayScore: 10,
        level: "low",
        reasons: [],
      },
      investorHeadline: "Insufficient Data for Investor Skill Signal",
      investorSummary:
        "Token holdings could not be fully retrieved for this wallet, so an investor-skill-pattern assessment could not be computed.",
      investorTakeaway:
        "This is not a weak-signal finding - it means the underlying portfolio data needed for this assessment was incomplete (the token-holdings fetch was truncated or timed out).",
      positiveIndicators: [],
      negativeIndicators: [],
      limitations: [
        "Token holdings could not be fully retrieved for this wallet (the fetch was truncated or timed out) - this assessment could not be computed from incomplete portfolio data.",
      ],
    };
  }

  let investorSkillScore = 0;

  // Surfaces the blend's own real inputs' already-computed reasons, rather
  // than reinventing explanation logic - alpha.ts and conviction.ts already
  // expose purpose-built positive/negative pairs (strengths/weaknesses,
  // supportingSignals/conflictingSignals); smartMoney.ts and trust.ts only
  // expose a positive array (their own `limitations` are evidence caveats,
  // not "this reduced the score" statements, so deliberately not folded in
  // here - a different kind of claim). This fixes the common case (a real,
  // confidently-computed score with nothing visibly backing it), not every
  // case - alpha.ts's own strengths/weaknesses are themselves populated by
  // narrow bonus conditions, so a sufficiently "middling on every axis"
  // wallet could still end up with empty indicators here. Not claiming
  // more than this actually delivers.
  const positiveIndicators: string[] = [
    ...input.alpha.strengths,
    ...input.conviction.supportingSignals,
    ...input.smartMoney.positiveSignals,
    ...input.trust.positiveSignals,
  ];
  const negativeIndicators: string[] = [
    ...input.alpha.weaknesses,
    ...input.conviction.conflictingSignals,
  ];
  const limitations: string[] = [];

  investorSkillScore += Math.round(input.alpha.alphaScore * 0.35);
  investorSkillScore += Math.round(input.smartMoney.smartMoneyScore * 0.25);
  investorSkillScore += Math.round(input.trust.trustScore * 0.20);
  investorSkillScore += Math.round(input.conviction.convictionScore * 0.20);

  investorSkillScore = Math.min(100, investorSkillScore);

  if (input.strategy.primaryStrategy === "holding") {
    investorSkillScore += 5;
    positiveIndicators.push("Long-term holding behavior detected.");
  }

  if (input.strategy.primaryStrategy === "accumulating") {
    investorSkillScore += 5;
    positiveIndicators.push("Accumulation behavior detected.");
  }

  // diversityApplicable is false only on chains with no native
  // fungible-token standard (currently Bitcoin - see portfolio.ts), where
  // diversityLevel always computes "none" regardless of actual wallet
  // behavior - not a meaningful signal to score on either direction.
  if (
    input.portfolio.diversityApplicable &&
    input.portfolio.diversityLevel === "high"
  ) {
    investorSkillScore += 5;
    positiveIndicators.push("High portfolio diversification.");
  }

  investorSkillScore = Math.min(100, investorSkillScore);

  let investorSkillLevel:
    | "unknown"
    | "weak"
    | "limited"
    | "moderate"
    | "strong"
    | "very_strong";

  if (investorSkillScore >= 90) {
    investorSkillLevel = "very_strong";
  } else if (investorSkillScore >= 75) {
    investorSkillLevel = "strong";
  } else if (investorSkillScore >= 55) {
    investorSkillLevel = "moderate";
  } else if (investorSkillScore >= 35) {
    investorSkillLevel = "limited";
  } else if (investorSkillScore > 0) {
    investorSkillLevel = "weak";
  } else {
    investorSkillLevel = "unknown";
  }

  let resemblesProfitablePattern:
    | "unknown"
    | "unlikely"
    | "possible"
    | "likely";

  if (investorSkillScore >= 75) {
    resemblesProfitablePattern = "likely";
  } else if (investorSkillScore >= 45) {
    resemblesProfitablePattern = "possible";
  } else if (investorSkillScore > 0) {
    resemblesProfitablePattern = "unlikely";
  } else {
    resemblesProfitablePattern = "unknown";
  }

  const confidence =
    investorSkillScore >= 70
      ? "high"
      : investorSkillScore >= 40
      ? "medium"
      : "low";

  limitations.push(
    "This score measures behavioral resemblance to patterns commonly associated with profitable investors using observable blockchain evidence - it does not measure actual trading profit or loss. No historical, point-in-time price data exists anywhere in this pipeline on any chain (spot-price-only today), so a real profit/loss calculation cannot be computed. This is a structural limitation, not a data-completeness gap - no amount of additional transaction history would change it.",
  );

  return {
    investorSkillScore,
    displayScore: `${(investorSkillScore / 10).toFixed(1)} / 10`,
    investorSkillLevel,
    resemblesProfitablePattern,
    confidence,
    evidenceConfidence: confidence,
    confidenceAnalysis: {
      rawScore: investorSkillScore,
      maxScore: 100,
      displayScore: `${(investorSkillScore / 10).toFixed(1)} / 10`,
      maxDisplayScore: 10,
      level: confidence,
      reasons: positiveIndicators,
    },
    investorHeadline: "Investor Skill Signal",
    investorSummary:
      "This score estimates how closely this wallet's behavior resembles patterns historically associated with profitable investors - it does not measure actual trading profit or loss. SkunkScan has no historical, point-in-time price data for any chain today, so a real profit/loss calculation ('what was this token worth when the wallet bought or sold it') cannot be computed, regardless of how much transaction history is analyzed.",
    investorTakeaway:
      "A high score means the wallet's behavior matches patterns often seen in profitable investors - not that this wallet has actually made money. This is a structural limitation, not a data-completeness gap: no amount of additional transaction history would let SkunkScan calculate real gains or losses without historical pricing data, which doesn't exist in the pipeline today.",
    positiveIndicators,
    negativeIndicators,
    limitations,
  };
}
