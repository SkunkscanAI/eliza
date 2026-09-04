import {
  WalletExposureSummary,
  WalletProfitabilitySummary,
  WalletReputationSummary,
  WalletRiskSummary,
  WalletSkunkScoreSummary,
  WalletSmartMoneySummary,
  WalletTrustSummary,
} from "../types";

type SkunkScoreInput = {
  reputation: WalletReputationSummary;
  trust: WalletTrustSummary;
  risk: WalletRiskSummary;
  smartMoney: WalletSmartMoneySummary;
  profitability: WalletProfitabilitySummary;
  exposure: WalletExposureSummary;
};

export function analyzeSkunkScore(
  input: SkunkScoreInput,
): WalletSkunkScoreSummary {
  // Named so `breakdown` below can expose the same terms the score is
  // already built from, instead of recomputing anything.
  const breakdownTerms: { label: string; score: number; weight: number }[] = [
    { label: "Reputation", score: input.reputation.reputationScore, weight: 0.35 },
    { label: "Trust", score: input.trust.trustScore, weight: 0.20 },
    { label: "Risk (inverted)", score: 100 - input.risk.score, weight: 0.20 },
    { label: "Smart Money", score: input.smartMoney.smartMoneyScore, weight: 0.10 },
    { label: "Investor Skill Signal", score: input.profitability.investorSkillScore, weight: 0.10 },
    { label: "Exposure (inverted)", score: 100 - input.exposure.exposureScore, weight: 0.05 },
  ];

  let score = Math.round(
    breakdownTerms.reduce(
      (total, term) => total + term.score * term.weight,
      0,
    ),
  );

  score = Math.max(0, Math.min(100, score));

  const breakdown = breakdownTerms.map((term) => ({
    label: term.label,
    score: term.score,
    weight: term.weight,
    contribution: Math.round(term.score * term.weight),
  }));

  let rating: WalletSkunkScoreSummary["rating"];
  let stars: 1 | 2 | 3 | 4 | 5;
  let recommendation: string;

  if (score >= 85) {
    rating = "excellent";
    stars = 5;
    recommendation = "Highly Recommended";
  } else if (score >= 70) {
    rating = "very_good";
    stars = 4;
    recommendation = "Recommended";
  } else if (score >= 55) {
    rating = "good";
    stars = 3;
    recommendation = "Worth Reviewing";
  } else if (score >= 35) {
    rating = "fair";
    stars = 2;
    recommendation = "Proceed With Caution";
  } else {
    rating = "poor";
    stars = 1;
    recommendation = "High Caution";
  }

  return {
    score,
    displayScore: `${(score / 10).toFixed(1)} / 10`,
    rating,
    stars,
    recommendation,
    summary: `Overall wallet assessment: ${recommendation}.`,
    breakdown,
  };
}
