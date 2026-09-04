import {
  WalletAlphaSummary,
  WalletProfitabilitySummary,
  WalletReputationSummary,
  WalletRiskSummary,
  WalletSmartMoneySummary,
  WalletTrustSummary,
} from "../types";
import {
  createConfidenceResponse,
} from "../confidence/framework";

type ReputationInput = {
  trust: WalletTrustSummary;
  risk: WalletRiskSummary;
  smartMoney: WalletSmartMoneySummary;
  alpha: WalletAlphaSummary;
  profitability: WalletProfitabilitySummary;
};

export function analyzeWalletReputation(
  input: ReputationInput
): WalletReputationSummary {
  let score =
    Math.round(
      input.trust.trustScore * 0.35 +
      input.alpha.alphaScore * 0.25 +
      input.smartMoney.smartMoneyScore * 0.20 +
      input.profitability.investorSkillScore * 0.20
    );

  score -= input.risk.score;

  score = Math.max(0, Math.min(100, score));

  let reputationLevel: WalletReputationSummary["reputationLevel"];

  if (score >= 85) reputationLevel = "excellent";
  else if (score >= 70) reputationLevel = "good";
  else if (score >= 55) reputationLevel = "moderate";
  else if (score >= 35) reputationLevel = "limited";
  else reputationLevel = "poor";

  const strengths: string[] = [];
  const concerns: string[] = [];

  if (input.trust.trustScore >= 70)
    strengths.push("Strong trust indicators.");

  // alpha is reputation's second-largest weight (25%, after trust's 35%),
  // but previously had no strength condition at all - a wallet with a
  // strong alpha reading contributed real, positive weight to the score
  // with zero visible explanation. Threshold matches smartMoney/
  // the Investor Skill Signal's existing 60 for consistency, rather than
  // introducing a third distinct value.
  if (input.alpha.alphaScore >= 60)
    strengths.push("Strong Alpha Score indicators.");

  if (input.smartMoney.smartMoneyScore >= 60)
    strengths.push("Shows smart-money characteristics.");

  if (input.profitability.investorSkillScore >= 60)
    strengths.push("Positive investor-skill-pattern indicators.");

  if (input.risk.level !== "low")
    concerns.push("Risk indicators reduce reputation.");

  // Previously hardcoded to "medium" with a static 3-line reasons array that
  // never mentioned smartMoney at all, despite it being reputation's
  // second-largest blend weight (20%, tied with profitability). Weights
  // below match the blend weights above (35/25/20/20 = 100) so a real
  // reputationScore actually built on strong evidence gets a real "high"
  // confidence, and smartMoney becomes visible in `reasons` when it
  // genuinely contributed.
  const confidenceAnalysis = createConfidenceResponse([
    {
      condition: input.trust.evidenceConfidence === "high",
      score: 35,
      reason: "Trust evidence confidence is high.",
    },
    {
      condition: input.alpha.evidenceConfidence === "high",
      score: 25,
      reason: "Alpha evidence confidence is high.",
    },
    {
      condition: input.smartMoney.evidenceConfidence === "high",
      score: 20,
      reason: "Smart Money evidence confidence is high.",
    },
    {
      condition: input.profitability.evidenceConfidence === "high",
      score: 20,
      reason: "Investor Skill Signal evidence confidence is high.",
    },
  ]);

  return {
    reputationScore: score,

    displayScore: `${(score / 10).toFixed(1)} / 10`,

    reputationLevel,

    confidence: confidenceAnalysis.level,

    evidenceConfidence: confidenceAnalysis.level,

    confidenceAnalysis,

    investorHeadline: `Wallet Reputation: ${reputationLevel}`,

    investorSummary:
      "The Reputation Score summarizes the wallet's overall credibility using trust, risk, alpha, the Investor Skill Signal, and smart-money indicators.",

    investorTakeaway:
      "Higher reputation scores suggest stronger overall blockchain characteristics, but they do not guarantee future performance or safety.",

    strengths,

    concerns,

    limitations: [
      "Reputation is evidence-based and not proof of legitimacy or ownership.",
    ],
  };
}
