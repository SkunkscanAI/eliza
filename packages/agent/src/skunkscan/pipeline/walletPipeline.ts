import { analyzeWalletActivity } from "../analyzers/activity";
import { analyzeWalletAge } from "../analyzers/walletAge";
import { analyzeWalletDormancy } from "../analyzers/walletDormancy";
import { analyzeWalletAssessment } from "../analyzers/assessment";
import { analyzeWalletBehavior } from "../analyzers/behavior";
import { analyzeWalletCaseSummary } from "../analyzers/caseSummary";
import { analyzeWalletCompliance } from "../analyzers/compliance";
import { analyzeWalletCustodyProfile } from "../analyzers/custody";
import { analyzeWalletDecision } from "../analyzers/decision";
import { analyzeWalletDeFi } from "../analyzers/defi";
import { analyzeWalletDisplayScores } from "../analyzers/display";
import { analyzeWalletEvidence } from "../analyzers/evidence";
import { analyzeWalletEvidenceRecords } from "../analyzers/evidenceRecords";
import { analyzeExecutiveVerdict } from "../analyzers/executiveVerdict";
import { analyzeWalletExposure } from "../analyzers/exposure";
import { analyzeWalletFunding } from "../analyzers/funding";
import { analyzeWalletIntelligenceBrief } from "../analyzers/intelligenceBrief";
import { analyzeInvestigationNarrative } from "../analyzers/investigationNarrative";
import { analyzeInvestigationReplay } from "../analyzers/investigationReplay";
import { analyzeInvestigationReport } from "../analyzers/investigationReport";
import { analyzeWalletPatternAlerts } from "../analyzers/patternAlerts";
import { analyzeWalletPortfolio } from "../analyzers/portfolio";
import { analyzeProtocolIntelligence } from "../analyzers/protocolIntelligence";
import { analyzeWalletProtocols } from "../analyzers/protocols";
import { analyzeWalletRelationships } from "../analyzers/relationships";
import { analyzeWalletRisk } from "../analyzers/risk";
import { analyzeWalletSmartMoney } from "../analyzers/smartMoney";
import { analyzeWalletConviction } from "../analyzers/conviction";
import { analyzeWalletAlpha } from "../analyzers/alpha";
import { analyzeInvestmentStyle } from "../analyzers/investmentStyle";
import { analyzeWalletProfitability } from "../analyzers/profitability";
import { analyzeWalletReputation } from "../analyzers/reputation";
import { analyzeSkunkScore } from "../analyzers/skunkScore";
import { analyzeWalletStrategy } from "../analyzers/strategy";
import { analyzeWalletTransactionRisk } from "../analyzers/transactionRisk";
import { analyzeWalletTrust } from "../analyzers/trust";
import { analyzeWalletWhaleStatus } from "../analyzers/whale";
import { getWalletIntelligenceSources } from "../sources/registry";
import {
  WalletPipelineInput,
  WalletPipelineOutput,
} from "./types";

export async function runWalletPipeline(
  input: WalletPipelineInput,
): WalletPipelineOutput {
  // Used everywhere a transfer needs to be matched against "this wallet" -
  // funding/relationships/exposure. Falls back to the single address for
  // every chain except Bitcoin xpub input (see WalletPipelineInput's
  // addressSet doc comment).
  const matchAddresses = input.addressSet ?? input.address;

  const activity = analyzeWalletActivity(
    input.recentTransactions,
  );

  const age = analyzeWalletAge(
    input.oldestTransactionId,
    input.oldestTransactionTimestamp,
  );

  const dormancy = analyzeWalletDormancy(activity.lastActiveAt);

  const funding = analyzeWalletFunding(
    input.chain,
    matchAddresses,
    input.firstParsedTransaction,
    input.balance.nativeSymbol,
  );

  // Moved ahead of portfolio/risk/whale/defi/behavior (relationships only
  // ever depended on funding + raw input, never on any of those) so
  // patternAlerts below can run before risk.ts needs it - risk.ts and
  // everything downstream of it keep their exact same relative order,
  // just shifted a few lines later. See patternAlerts' own placement
  // comment for why this reorder exists.
  const relationships = analyzeWalletRelationships(
    funding,
    matchAddresses,
    input.normalizedRecentParsedTransactions,
    input.chain,
  );

  // Real, live bug this fixes: a genuine, algorithmically-confirmed
  // raise-and-drain match (all 4 of detectRaiseAndDrainPattern's strict
  // conditions satisfied) sat right next to a "Risk: 0.5/10" ScoreCard with
  // zero connection between them - risk.ts and decision.ts were computed
  // entirely inside this same function, before patternAlerts existed at
  // all (it used to be computed in wallet.ts, strictly after this whole
  // pipeline returned). Moved in here specifically so risk.ts (immediately
  // below) and decision.ts (further down) can both see it - see risk.ts's
  // and decision.ts's own comments for how each uses it.
  const patternAlerts = await analyzeWalletPatternAlerts(
    input.chain,
    input.patternAlertAddress,
    relationships.relationships,
    input.db,
  );

  const portfolio = analyzeWalletPortfolio(
    input.balance,
    input.tokenHoldings,
    input.tokenPrices,
    input.chain,
    input.tokenHoldingsIncomplete ?? false,
    input.xrpOwnerCount,
  );

  const risk = analyzeWalletRisk(
    input.balance.nativeAmount,
    activity,
    input.balance.nativeSymbol,
    patternAlerts,
  );

  const whale = analyzeWalletWhaleStatus(
    portfolio,
    age,
    activity,
    funding,
    risk,
    input.balance.nativeSymbol,
  );

  const defi = analyzeWalletDeFi(
    input.normalizedRecentParsedTransactions,
    input.chain,
  );

  const protocols = analyzeWalletProtocols(
    input.normalizedRecentParsedTransactions,
    input.chain,
  );

  const protocolIntelligence =
    analyzeProtocolIntelligence(protocols);

  const behavior = analyzeWalletBehavior(
  activity,
  age,
  defi,
  protocolIntelligence,
  whale,
  risk,
);

  const exposure = analyzeWalletExposure(
    matchAddresses,
    funding,
    input.chain,
    relationships.relationships,
  );

  const custodyProfile = analyzeWalletCustodyProfile(
    activity,
    funding,
    relationships,
  );

  const complianceScreening = analyzeWalletCompliance(
    exposure,
  );

  const intelligenceSources =
    getWalletIntelligenceSources();

  const trust = analyzeWalletTrust(
    age,
    activity,
    funding,
    exposure,
    risk,
  );

  const display = analyzeWalletDisplayScores(
    risk,
    trust,
    exposure,
    whale,
  );

  const caseSummary = analyzeWalletCaseSummary(
    age,
    risk,
    whale,
    defi,
    behavior,
    exposure,
  );

  const transactionRisk = analyzeWalletTransactionRisk(
    risk,
    trust,
    exposure,
    complianceScreening,
    caseSummary,
  );

  const {
    recommendation: _legacyTransactionRiskRecommendation,
    ...transactionRiskAssessment
  } = transactionRisk;

  void _legacyTransactionRiskRecommendation;

  const smartMoney = analyzeWalletSmartMoney(
    age,
    activity,
    defi,
    portfolio,
    whale,
    trust,
  );

  const strategy = analyzeWalletStrategy({
  activity,
  age,
  portfolio,
  behavior,
  defi,
  whale,
  smartMoney,
});

  const conviction = analyzeWalletConviction({
  activity,
  portfolio,
  behavior,
  strategy,
  whale,
  smartMoney,
});

  const alpha = analyzeWalletAlpha({
  risk,
  trust,
  portfolio,
  whale,
  smartMoney,
  strategy,
  conviction,
  defi,
  protocolIntelligence,
});

  const investmentStyle = analyzeInvestmentStyle({
  strategy,
  smartMoney,
  conviction,
  alpha,
  portfolio,
  whale,
  defi,
});

  const profitability = analyzeWalletProfitability({
  alpha,
  conviction,
  strategy,
  trust,
  smartMoney,
  portfolio,
});

  const reputation = analyzeWalletReputation({
  trust,
  risk,
  smartMoney,
  alpha,
  profitability,
});

  const skunkScore = analyzeSkunkScore({
  reputation,
  trust,
  risk,
  smartMoney,
  profitability,
  exposure,
});

  const investigationReplay =
    analyzeInvestigationReplay(
      portfolio,
      activity,
      age,
      dormancy,
      funding,
      defi,
      exposure,
      relationships,
      risk,
      whale,
      trust,
      input.chain,
    );

  const evidenceRecords =
    analyzeWalletEvidenceRecords(
      input.address,
      activity,
      age,
      dormancy,
      funding,
      portfolio,
      defi,
      exposure,
      relationships,
      complianceScreening,
      custodyProfile,
      risk,
      whale,
      smartMoney,
      transactionRisk,
      trust,
      input.chain,
    );

  const decision = analyzeWalletDecision(
    evidenceRecords,
    risk,
    trust,
    exposure,
    transactionRisk,
    patternAlerts,
  );

  const assessment = analyzeWalletAssessment(
    risk,
    trust,
    exposure,
    transactionRisk,
    evidenceRecords,
  );

  const intelligenceBrief =
    analyzeWalletIntelligenceBrief(
      assessment,
      evidenceRecords,
    );

  const evidence = analyzeWalletEvidence(
    evidenceRecords,
  );

  const executiveVerdict = analyzeExecutiveVerdict(
    display,
    behavior,
    caseSummary,
    evidence,
    exposure,
    risk,
    trust,
    decision,
  );

  const investigationReport =
    analyzeInvestigationReport(
      input.chain,
      input.address,
      executiveVerdict,
      caseSummary,
      decision,
      evidenceRecords,
    );

  const investigationNarrative =
    analyzeInvestigationNarrative(
      executiveVerdict,
      caseSummary,
      trust,
      decision,
      evidenceRecords,
    );

  return {
    activity,
    age,
    dormancy,
    funding,
    patternAlerts,
    portfolio,
    risk,
    whale,
    defi,
    protocols,
    protocolIntelligence,
    behavior,
    exposure,
    relationships,
    custodyProfile,
    complianceScreening,
    intelligenceSources,
    trust,
    display,
    caseSummary,
    transactionRisk,
    transactionRiskAssessment,
    smartMoney,
    strategy,
    conviction,
    alpha,
    investmentStyle,
    profitability,
    reputation,
    skunkScore,
    investigationReplay,
    evidenceRecords,
    decision,
    assessment,
    intelligenceBrief,
    evidence,
    executiveVerdict,
    investigationReport,
    investigationNarrative,
  };
}
