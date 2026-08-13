import {
  WalletActivitySummary,
  WalletAgeSummary,
  WalletBehaviorSummary,
  WalletDeFiSummary,
  WalletPortfolioSummary,
  WalletSmartMoneySummary,
  WalletStrategySummary,
  WalletWhaleSummary,
} from "../types";

type StrategyInput = {
  activity: WalletActivitySummary;
  age: WalletAgeSummary;
  portfolio: WalletPortfolioSummary;
  behavior: WalletBehaviorSummary;
  defi: WalletDeFiSummary;
  whale: WalletWhaleSummary;
  smartMoney: WalletSmartMoneySummary;
};

export function analyzeWalletStrategy(
  input: StrategyInput,
): WalletStrategySummary {

  let score = 0;

  const supportingSignals: string[] = [];
  const conflictingSignals: string[] = [];
  const limitations: string[] = [];

  let strategy: WalletStrategySummary["primaryStrategy"] =
    "unknown";

  // -----------------------------
  // Dormant
  // -----------------------------

  if (input.activity.activityLevel === "none") {
    strategy = "dormant";
    score = 15;

    conflictingSignals.push(
      "No recent on-chain activity was detected.",
    );
  }

  // -----------------------------
  // Long-term holder
  // -----------------------------

  else if (
    input.age.classification === "established" &&
    input.activity.activityLevel === "low"
  ) {
    strategy = "holding";
    score += 70;

    supportingSignals.push(
      "Established wallet with limited recent trading activity.",
    );
  }

  // -----------------------------
  // Active trader
  // -----------------------------

  else if (
    input.activity.activityLevel === "high"
  ) {
    strategy = "active_trading";
    score += 70;

    supportingSignals.push(
      "High recent transaction activity suggests active trading.",
    );
  }

  // -----------------------------
  // Accumulating
  // -----------------------------

  else if (
    input.age.classification === "established" &&
    input.portfolio.diversityLevel !== "low"
  ) {
    strategy = "accumulating";
    score += 60;

    supportingSignals.push(
      "Established wallet with diversified holdings.",
    );
  }

  // -----------------------------
  // Supporting evidence
  // -----------------------------

  if (input.smartMoney.level === "high") {
    score += 15;

    supportingSignals.push(
      "Strong Smart Money profile detected.",
    );
  }

  if (input.whale.isWhale) {
    score += 10;

    supportingSignals.push(
      "Whale characteristics strengthen the strategy assessment.",
    );
  }

  if (
    input.defi.profile === "power_user"
  ) {
    score += 10;

    supportingSignals.push(
      "Regular DeFi usage supports strategic participation.",
    );
  }

  // Previously compared against "long_term_investor" - a value
  // WalletBehaviorSummary["primaryProfile"] can never actually produce
  // (confirmed via its type union), so this branch was permanently dead;
  // the "active_trader" branch below was reachable but, like this one,
  // added no supportingSignals text - both silently changed the score with
  // no visible explanation. Fixed to "holder" (matching this file's own
  // "holding" strategy concept and behavior.ts's real "holder" value) and
  // both now explain themselves identically - this is deliberately framed
  // as "an independent classifier corroborates this assessment" (a
  // confidence signal), not "active trading scores higher than holding" -
  // both directions get the same +10 and the same kind of explanation.
  if (input.behavior.primaryProfile === "holder") {
    score += 10;

    supportingSignals.push(
      "An independent behavioral classification also identifies this wallet as a holder, corroborating this assessment.",
    );
  }

  if (input.behavior.primaryProfile === "active_trader") {
    score += 10;

    supportingSignals.push(
      "An independent behavioral classification also identifies this wallet as an active trader, corroborating this assessment.",
    );
  }

  if (score > 100) {
    score = 100;
  }

  const confidence =
    score >= 75
      ? "high"
      : score >= 45
      ? "medium"
      : "low";

  if (strategy === "unknown") {
    limitations.push(
      "Available evidence was insufficient to confidently identify a dominant investment strategy.",
    );
  }

  return {
    primaryStrategy: strategy,
    // Renamed from strategyScore - "strategy" implied a judgment of which
    // trading philosophy is better; this is a measure of how much evidence
    // supports the classification, not a ranking of active vs. passive
    // trading. primaryStrategy stays the neutral behavioral descriptor.
    activityScore: score,
    displayScore: (score / 10).toFixed(1),
    confidence,
    evidenceConfidence: confidence,
    confidenceAnalysis: {
      rawScore: score,
      maxScore: 100,
      displayScore: (score / 10).toFixed(1),
      maxDisplayScore: 10,
      level: confidence,
      reasons: [
        ...supportingSignals,
        ...conflictingSignals,
      ],
    },
    investorHeadline: strategy
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase()),
    investorSummary:
      "The strategy classification is inferred from wallet age, activity, portfolio composition, Smart Money indicators, DeFi participation, and behavioral evidence.",
    investorTakeaway:
      "Treat this as an evidence-based view of how the wallet appears to invest, not as a prediction of future performance.",
    supportingSignals,
    conflictingSignals,
    limitations,
  };
}
