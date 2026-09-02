import { WalletComplianceScreeningSource } from "../types";

// Single source of truth for "what did we actually check" scope text, so
// this doesn't get duplicated - and drift - across trust.ts, exposure.ts,
// decision.ts, caseSummary.ts, and the Trust Check card. Reads directly off
// compliance.ts's sourcesChecked (the one place the real, live source list
// and connection status already exist) rather than restating source names
// as static literals in each of those files.
export function describeConnectedSources(
  sourcesChecked: WalletComplianceScreeningSource[] | undefined,
): string {
  const connected = (sourcesChecked ?? [])
    .filter((source) => source.status === "connected")
    .map((source) => source.name);

  if (connected.length === 0) {
    return "no currently connected screening sources";
  }

  if (connected.length === 1) {
    return connected[0];
  }

  return `${connected.slice(0, -1).join(", ")} and ${connected[connected.length - 1]}`;
}

// A short, reusable qualifier for pairing with any positive (clean /
// low-risk / no-match) finding, naming the real connected sources inline so
// the disclosure is part of the claim itself rather than a separate
// limitations section the reader has to find and cross-reference.
export function buildScopeDisclosure(
  sourcesChecked: WalletComplianceScreeningSource[] | undefined,
): string {
  return `Checked against ${describeConnectedSources(sourcesChecked)} only - not a guarantee of safety, and not a comprehensive screen.`;
}
