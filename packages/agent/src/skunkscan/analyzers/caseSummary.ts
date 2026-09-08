import {
  WalletAgeSummary,
  WalletBehaviorSummary,
  WalletCaseSummary,
  WalletDeFiSummary,
  WalletExposureSummary,
  WalletRiskSummary,
  WalletWhaleSummary,
} from "../types";
import { describeConnectedSources, getSystemSourcesChecked } from "./sourceDisclosure";
import { elevateRecommendationForExposure } from "./recommendationEscalation";

export function analyzeWalletCaseSummary(
  age: WalletAgeSummary,
  risk: WalletRiskSummary,
  whale: WalletWhaleSummary,
  defi: WalletDeFiSummary,
  behavior: WalletBehaviorSummary,
  exposure: WalletExposureSummary,
): WalletCaseSummary {
  const keyFindings: string[] = [];

  if (age.classification === "veteran") {
    keyFindings.push("Veteran wallet.");
  } else if (age.classification === "established") {
    keyFindings.push("Established wallet.");
  } else if (age.classification === "new") {
    keyFindings.push("Recently created wallet.");
  }

  keyFindings.push(`Risk level: ${risk.level}.`);

  if (whale.isWhale) {
    keyFindings.push("Large portfolio detected.");
  }

  if (defi.protocolCount > 0) {
    keyFindings.push(
      `Uses ${defi.protocolCount} recognized DeFi protocol(s).`,
    );
  }

  keyFindings.push(
    `Behavior profile: ${behavior.primaryProfile.replace(/_/g, " ")}.`,
  );

  let recommendation: WalletCaseSummary["recommendation"];

  if (risk.level === "high") {
    recommendation = "high_risk";
  } else if (risk.level === "medium") {
    recommendation = "investigate";
  } else if (behavior.primaryProfile === "new_wallet") {
    recommendation = "review";
  } else {
    recommendation = "allow";
  }

  // The check above only considers risk/behavior - a wallet can pass both
  // and still have real exposure evidence (e.g. a direct OFAC sanctions
  // match) that risk/behavior alone wouldn't surface. Escalates rather than
  // recomputes from scratch, so this can't silently drift from
  // executiveVerdict.ts's own exposure handling - see
  // recommendationEscalation.ts's doc comment for why this is shared rather
  // than duplicated.
  recommendation = elevateRecommendationForExposure(
    recommendation,
    risk,
    exposure,
  );

  if (exposure.exposureLevel !== "none") {
    keyFindings.push(`Exposure level: ${exposure.exposureLevel}.`);
  }

  const headline =
    behavior.primaryProfile === "unknown"
      ? "Wallet investigation completed"
      : `${behavior.primaryProfile
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase())}`;

  const executiveSummary =
    `This wallet is classified as ${behavior.primaryProfile.replace(
      /_/g,
      " ",
    )} with a ${risk.level} risk assessment. ` +
    `Recommendation: ${recommendation.replace(/_/g, " ")}.` +
    // Only the positive/clean recommendation needs the scope caveat in the
    // same breath - a "review"/"investigate"/"high_risk" recommendation is
    // already a call to look closer, not a claim that could be misread as
    // a broader guarantee.
    (recommendation === "allow"
      ? ` This reflects only ${describeConnectedSources(getSystemSourcesChecked())}, not a guarantee.`
      : "");

  return {
    headline,
    executiveSummary,
    keyFindings,
    recommendation,
  };
}
