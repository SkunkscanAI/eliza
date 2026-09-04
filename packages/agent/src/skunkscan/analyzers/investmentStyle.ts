import {
  WalletAlphaSummary,
  WalletConvictionSummary,
  WalletDeFiSummary,
  WalletInvestmentStyleSummary,
  WalletPortfolioSummary,
  WalletSmartMoneySummary,
  WalletStrategySummary,
  WalletWhaleSummary,
} from "../types";

type InvestmentStyleInput = {
  strategy: WalletStrategySummary;
  smartMoney: WalletSmartMoneySummary;
  conviction: WalletConvictionSummary;
  alpha: WalletAlphaSummary;
  portfolio: WalletPortfolioSummary;
  whale: WalletWhaleSummary;
  defi: WalletDeFiSummary;
};

export function analyzeInvestmentStyle(
  input: InvestmentStyleInput,
): WalletInvestmentStyleSummary {

  const supportingSignals: string[] = [];
  const conflictingSignals: string[] = [];
  const limitations: string[] = [];

  let style:
    | "long_term_investor"
    | "active_trader"
    | "swing_trader"
    | "momentum_trader"
    | "accumulator"
    | "defi_investor"
    | "yield_farmer"
    | "meme_coin_trader"
    | "portfolio_scale_investor"
    | "passive_holder"
    | "diversified_investor"
    | "mixed" = "mixed";

  // Each of the 5 checks below unconditionally overwrites `style` if true -
  // last match wins, not a scored priority. matchedStyleLabels tracks every
  // condition that matched (not just the final winner), so when more than
  // one is true simultaneously, the ones that got silently overwritten
  // become real conflictingSignals instead of disappearing - a wallet that
  // is simultaneously portfolio-scale AND highly diversified genuinely has
  // conflicting classification evidence, not a clean single answer.
  const matchedStyleLabels: { style: string; label: string }[] = [];

  // Gated on whaleLevel medium/large, not the broader isWhale flag - see
  // smartMoney.ts's identical comment for why isWhale alone (true even at
  // whaleLevel "small") previously let a genuinely small portfolio
  // (real-world case: ~$38) pick up this classification.
  if (
    input.whale.whaleLevel === "medium" ||
    input.whale.whaleLevel === "large"
  ) {
    style = "portfolio_scale_investor";
    supportingSignals.push("Portfolio-scale characteristics detected.");
    matchedStyleLabels.push({ style: "portfolio_scale_investor", label: "Portfolio-scale characteristics" });
  }

  if (input.strategy.primaryStrategy === "holding") {
    style = "long_term_investor";
    supportingSignals.push("Holding strategy detected.");
    matchedStyleLabels.push({ style: "long_term_investor", label: "Holding strategy" });
  }

  if (input.strategy.primaryStrategy === "accumulating") {
    style = "accumulator";
    supportingSignals.push("Accumulation strategy detected.");
    matchedStyleLabels.push({ style: "accumulator", label: "Accumulation strategy" });
  }

  if (input.defi.protocolCount > 0) {
    style = "defi_investor";
    supportingSignals.push("Recognized DeFi participation.");
    matchedStyleLabels.push({ style: "defi_investor", label: "DeFi participation" });
  }

  if (input.portfolio.diversityLevel === "high") {
    style = "diversified_investor";
    supportingSignals.push("Highly diversified portfolio.");
    matchedStyleLabels.push({ style: "diversified_investor", label: "High portfolio diversity" });
  }

  const overriddenStyleMatches = matchedStyleLabels.filter(
    (match) => match.style !== style,
  );

  if (overriddenStyleMatches.length > 0) {
    conflictingSignals.push(
      `This wallet also shows ${overriddenStyleMatches.map((match) => match.label.toLowerCase()).join(", ")} - equally real evidence for a different style than "${style.replaceAll("_", " ")}", which was chosen only because it was the last matching condition checked.`,
    );
  }

  if (
    input.conviction.convictionLevel === "low" ||
    input.conviction.convictionLevel === "very_low"
  ) {
    conflictingSignals.push(
      "Low measured conviction contradicts a confidently-assigned style label.",
    );
  }

  if (
    input.smartMoney.level === "none" &&
    style !== "mixed"
  ) {
    conflictingSignals.push(
      "No smart-money characteristics were detected, despite a specific style classification.",
    );
  }

  if (style === "mixed") {
    limitations.push(
      "No single investment style pattern was distinctly identified from the available evidence - none of the portfolio-scale, strategy, DeFi, or diversification conditions matched.",
    );
  }

  // Previously borrowed alpha.alphaScore - a different analyzer's score,
  // unrelated to how decisively `style` itself was chosen. Ties confidence
  // to this file's own evidence instead: overriddenStyleMatches already
  // measures exactly this (how many other style conditions also matched
  // and got silently overwritten - the same evidence conflictingSignals
  // above is built from).
  let confidence: "low" | "medium" | "high";
  let confidenceScore: number;

  if (style === "mixed") {
    confidence = "low";
    confidenceScore = 20;
  } else if (overriddenStyleMatches.length === 0) {
    confidence = "high";
    confidenceScore = 90;
  } else if (overriddenStyleMatches.length === 1) {
    confidence = "medium";
    confidenceScore = 55;
  } else {
    confidence = "low";
    confidenceScore = 20;

    limitations.push(
      "Confidence in this style classification is low because multiple competing style signals were detected - see conflictingSignals for the specific overlap.",
    );
  }

  return {
    style,
    confidence,
    evidenceConfidence: confidence,
    confidenceAnalysis: {
      rawScore: confidenceScore,
      maxScore: 100,
      displayScore:
        `${(confidenceScore / 10).toFixed(1)} / 10`,
      maxDisplayScore: 10,
      level: confidence,
      reasons: supportingSignals,
    },
    investorHeadline:
      `Investment Style: ${style.replaceAll("_", " ")}`,
    investorSummary:
      "Investment Style summarizes how this wallet typically participates in the market using blockchain evidence.",
    investorTakeaway:
      "This classification helps investors understand the wallet's overall investment behavior rather than a single transaction.",
    styleDescription:
      style.replaceAll("_", " "),
    supportingSignals,
    conflictingSignals,
    limitations,
  };
}
