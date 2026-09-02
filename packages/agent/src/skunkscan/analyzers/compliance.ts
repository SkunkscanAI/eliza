import {
  WalletComplianceScreeningSummary,
  WalletExposureSummary,
} from "../types";
import {
  createConfidenceResponse,
} from "../confidence/framework";
import { getSystemSourcesChecked } from "./sourceDisclosure";

export function analyzeWalletCompliance(
  exposure: WalletExposureSummary,
): WalletComplianceScreeningSummary {
  const matches: WalletComplianceScreeningSummary["matches"] = [];

  // Was previously filtered to sanctioned/adverse_media only, silently
  // dropping scam/rug_pull/suspicious hits even though the
  // "SkunkScan Internal Registry" source below already claimed connected
  // coverage for exactly those 3 categories - a real compliance-
  // completeness gap, not a display duplication (see the investigation
  // behind this fix). Now forwards all 5 categories exposure.matches can
  // produce, mapping category directly to type with no new detection
  // logic - the underlying registry hit is the same data, just no longer
  // discarded here.
  const complianceMatchType: Record<
    (typeof exposure.matches)[number]["category"],
    WalletComplianceScreeningSummary["matches"][number]["type"]
  > = {
    sanctioned: "sanctions",
    adverse_media: "adverse_media",
    scam: "scam",
    rug_pull: "rug_pull",
    suspicious: "suspicious",
  };

  for (const match of exposure.matches) {
    matches.push({
      type: complianceMatchType[match.category],
      source: match.source,
      label: match.label,
      confidence: match.confidence,
      notes: [`Relationship: ${match.relationship}`],
    });
  }

  // Real status, not hardcoded - "connected" only becomes true once the
  // OFAC list has actually loaded successfully at least once (see
  // sanctionsRegistry.ts). A cold-boot investigation that runs before the
  // first refresh completes, or a case where every refresh attempt has
  // failed, correctly reports "unavailable" rather than a false
  // "connected" that would make an unchecked wallet look clean.
  //
  // The wallet-independent source list itself now lives in
  // sourceDisclosure.ts (getSystemSourcesChecked) so exposure.ts/trust.ts/
  // risk.ts - which run before this function and can't import this file
  // without a circular dependency - can build the same scope-disclosure
  // text without duplicating these names as separate literals. Same
  // fields, same values as before; only the definition moved.
  const sourcesChecked: WalletComplianceScreeningSummary["sourcesChecked"] =
    getSystemSourcesChecked();

  const confidenceAnalysis = createConfidenceResponse([
    {
      condition: exposure.evidenceConfidence === "high",
      score: 35,
      reason: "Exposure evidence confidence is high.",
    },
    {
      condition: exposure.evidenceConfidence === "medium",
      score: 25,
      reason: "Exposure evidence confidence is medium.",
    },
    {
      condition: sourcesChecked.some(
        (source) => source.status === "connected",
      ),
      score: 30,
      reason: "At least one screening source is connected.",
    },
    {
      condition: sourcesChecked.length > 0,
      score: 20,
      reason: "Screening source metadata is available.",
    },
    {
      condition: matches.length > 0,
      score: 15,
      reason: "Compliance-related match was identified.",
    },
  ]);

  return {
    sourcesChecked,

    sanctionsStatus:
      matches.some((match) => match.type === "sanctions")
        ? "possible_match"
        : "no_match_in_connected_sources",

    adverseMediaStatus:
      matches.some((match) => match.type === "adverse_media")
        ? "possible_match"
        : "no_match_in_connected_sources",

    // Sourced directly from exposure's own booleans, not re-derived via
    // matches.some(...) like sanctions/adverse_media above - exposure.ts
    // already computes these at no extra cost, and reusing them keeps this
    // file from re-implementing logic exposure.ts owns.
    scamStatus: exposure.hasKnownScamExposure
      ? "possible_match"
      : "no_match_in_connected_sources",

    rugPullStatus: exposure.hasKnownRugPullExposure
      ? "possible_match"
      : "no_match_in_connected_sources",

    suspiciousStatus: exposure.hasKnownSuspiciousExposure
      ? "possible_match"
      : "no_match_in_connected_sources",

    evidenceConfidence: confidenceAnalysis.level,

    confidenceAnalysis,

    screeningConfidence:
      matches.length > 0
        ? confidenceAnalysis.level
        : "medium",

    matches,

    // Previously identical text regardless of the wallet - didn't say
    // whether this specific wallet had any matches, or which sources were
    // actually checked vs. still planned. Built from sourcesChecked/matches
    // above rather than restating them, so it can't drift out of sync.
    limitations: buildComplianceLimitations(sourcesChecked, matches),
  };
}

function buildComplianceLimitations(
  sourcesChecked: WalletComplianceScreeningSummary["sourcesChecked"],
  matches: WalletComplianceScreeningSummary["matches"],
): string[] {
  const connectedSourceNames = sourcesChecked
    .filter((source) => source.status === "connected")
    .map((source) => source.name);

  const plannedSourceNames = sourcesChecked
    .filter((source) => source.status === "planned")
    .map((source) => source.name);

  // Distinct from "planned" (never integrated) - a source that IS
  // integrated but whose data hasn't loaded successfully right now (e.g.
  // the OFAC list's first refresh hasn't completed, or every refresh
  // attempt has failed). Silently grouping this with "planned" or
  // "connected" would either overstate coverage or hide a real, temporary
  // gap - see sanctionsRegistry.ts's status tracking.
  const unavailableSourceNames = sourcesChecked
    .filter((source) => source.status === "unavailable")
    .map((source) => source.name);

  const limitations: string[] = [
    matches.length > 0
      ? `${matches.length} compliance-related match${matches.length === 1 ? "" : "es"} ${matches.length === 1 ? "was" : "were"} identified against connected sources (${connectedSourceNames.join(", ")}) and should be reviewed.`
      : `No compliance-related matches were identified against connected sources (${connectedSourceNames.join(", ")}).`,
  ];

  if (unavailableSourceNames.length > 0) {
    limitations.push(
      `${unavailableSourceNames.join(", ")} ${unavailableSourceNames.length === 1 ? "is" : "are"} normally connected but temporarily unavailable for this investigation - screening for ${unavailableSourceNames.length === 1 ? "that category was" : "those categories were"} not performed, not confirmed clean.`,
    );
  }

  if (plannedSourceNames.length > 0) {
    limitations.push(
      `${plannedSourceNames.join(", ")} ${plannedSourceNames.length === 1 ? "is" : "are"} not yet connected - screening for ${plannedSourceNames.length === 1 ? "that category is" : "those categories is"} not yet active.`,
    );
  }

  return limitations;
}
