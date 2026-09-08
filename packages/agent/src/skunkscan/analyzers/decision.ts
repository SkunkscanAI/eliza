import {
  WalletDecisionFactor,
  WalletDecisionSummary,
  WalletEvidenceRecord,
  WalletExposureSummary,
  WalletPatternAlert,
  WalletRiskSummary,
  WalletTransactionRiskSummary,
  WalletTrustSummary,
} from "../types";
import { createConfidenceResponse } from "../confidence/framework";
import { describeConnectedSources, getSystemSourcesChecked } from "./sourceDisclosure";

export function analyzeWalletDecision(
  evidenceRecords: WalletEvidenceRecord[],
  risk: WalletRiskSummary,
  trust: WalletTrustSummary,
  exposure: WalletExposureSummary,
  transactionRisk: WalletTransactionRiskSummary,
  patternAlerts: WalletPatternAlert[],
): WalletDecisionSummary {
  const factors: WalletDecisionFactor[] = [];
  const limitations: string[] = [];

  const findEvidenceId = (
    id: string,
  ): string[] =>
    evidenceRecords.some((record) => record.id === id)
      ? [id]
      : [];

  factors.push({
    id: "risk-factor",
    category: "risk",
    effect:
      risk.level === "high"
        ? "negative"
        : risk.level === "medium"
          ? "negative"
          : "positive",
    weight:
      risk.level === "high"
        ? 40
        : risk.level === "medium"
          ? 20
          : 10,
    description: `Wallet risk level is ${risk.level}.`,
    evidenceRecordIds: findEvidenceId("risk-assessment"),
  });

  factors.push({
    id: "trust-factor",
    category: "trust",
    effect:
      trust.trustLevel === "high" ||
      trust.trustLevel === "very_high"
        ? "positive"
        : trust.trustLevel === "medium"
          ? "neutral"
          : "negative",
    weight:
      trust.trustLevel === "very_high"
        ? 20
        : trust.trustLevel === "high"
          ? 15
          : trust.trustLevel === "medium"
            ? 5
            : 15,
    description: `Wallet trust level is ${trust.trustLevel}.`,
    evidenceRecordIds: findEvidenceId("trust-assessment"),
  });

  factors.push({
    id: "exposure-factor",
    category: "exposure",
    effect:
      exposure.exposureLevel === "none"
        ? "positive"
        : "negative",
    weight:
      exposure.exposureLevel === "high"
        ? 40
        : exposure.exposureLevel === "medium"
          ? 25
          : exposure.exposureLevel === "low"
            ? 10
            : 10,
    description:
      exposure.exposureLevel === "none"
        ? `Wallet exposure level is none, checked against ${describeConnectedSources(getSystemSourcesChecked())}.`
        : `Wallet exposure level is ${exposure.exposureLevel}.`,
    evidenceRecordIds: findEvidenceId("exposure-summary"),
  });

  // Real bug this fixes: a confirmed pattern alert (see
  // analyzers/patternAlerts.ts / patterns/raiseAndDrain.ts) previously had
  // no factor here at all - decision/executiveVerdict could reach "allow"
  // for a wallet showing a genuine raise-and-drain match. weight 70 alone
  // is enough to force the "high_risk" tier (negativeWeight >= 70) on its
  // own, independent of every other factor - a confirmed match is treated
  // as at least as serious as this model's strongest single existing
  // signal, per the same reasoning risk.ts's own patternAlerts handling
  // uses (a genuine match is direct risk evidence, not a disclosure-only
  // addendum).
  factors.push({
    id: "pattern-alert-factor",
    category: "pattern_alert",
    effect: patternAlerts.length > 0 ? "negative" : "positive",
    weight: patternAlerts.length > 0 ? 70 : 10,
    description:
      patternAlerts.length > 0
        ? `A confirmed behavioral scam pattern was detected: ${patternAlerts
            .map((alert) => alert.evidenceSummary)
            .join(" ")}`
        : "No confirmed behavioral scam patterns were detected.",
    // No dedicated pattern-alert evidence record exists yet in
    // evidenceRecords.ts (out of scope for this fix) - findEvidenceId
    // already returns [] gracefully for an id that isn't present, same as
    // every other factor above.
    evidenceRecordIds: findEvidenceId("pattern-alert-summary"),
  });

  factors.push({
    id: "transaction-risk-factor",
    category: "transaction_risk",
    effect:
      transactionRisk.level === "low"
        ? "positive"
        : "negative",
    weight:
      transactionRisk.level === "high"
        ? 35
        : transactionRisk.level === "medium"
          ? 20
          : 10,
    description:
      `Wallet-context transaction risk is ${transactionRisk.level}.`,
    evidenceRecordIds: findEvidenceId(
      "transaction-risk-assessment",
    ),
  });

  let negativeWeight = 0;
  let positiveWeight = 0;

  for (const factor of factors) {
    if (factor.effect === "negative") {
      negativeWeight += factor.weight;
    }

    if (factor.effect === "positive") {
      positiveWeight += factor.weight;
    }
  }

  const decision =
    negativeWeight >= 70
      ? "high_risk"
      : negativeWeight >= 40
        ? "investigate"
        : negativeWeight >= 20
          ? "review"
          : "low_risk";

  const recommendation =
    decision === "high_risk"
      ? "high_risk"
      : decision === "investigate"
        ? "investigate"
        : decision === "review"
          ? "review"
          : "allow";

  const confidenceAnalysis = createConfidenceResponse([
    {
      condition: evidenceRecords.length >= 10,
      score: 30,
      reason:
        "A broad set of structured evidence records was available.",
    },
    {
      condition: evidenceRecords.length >= 5,
      score: 20,
      reason:
        "Multiple structured evidence records were available.",
    },
    {
      condition: exposure.evidenceConfidence === "high",
      score: 20,
      reason: "Exposure evidence confidence is high.",
    },
    {
      condition: trust.confidence === "high",
      score: 15,
      reason: "Trust assessment confidence is high.",
    },
    {
      condition: transactionRisk.level !== "high",
      score: 10,
      reason:
        "No high wallet-context transaction risk was identified.",
    },
    {
      condition: positiveWeight > negativeWeight,
      score: 5,
      reason:
        "Positive decision factors outweigh negative factors.",
    },
  ]);

  if (evidenceRecords.length < 5) {
    limitations.push(
      "The decision was produced from a limited number of structured evidence records.",
    );
  }

  if (trust.confidence === "low") {
    limitations.push(
      "Trust assessment confidence is low.",
    );
  }

  if (patternAlerts.length > 0) {
    limitations.push(
      "A pattern alert is a behavioral observation, not a confirmed scam designation - it reflects a match against a known scam-behavior signature, not a human-reviewed determination.",
    );
  }

  const supportingEvidenceRecordIds = Array.from(
    new Set(
      factors.flatMap(
        (factor) => factor.evidenceRecordIds,
      ),
    ),
  );

  return {
    decision,
    recommendation,
    confidence: confidenceAnalysis.level,
    confidenceAnalysis,
    factors,
    supportingEvidenceRecordIds,
    limitations,
  };
}
