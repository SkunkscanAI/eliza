import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ReportSummaryBar } from "../components/report/ReportSummaryBar";
import { ReportNav } from "../components/report/ReportNav";
import { ReportSection } from "../components/report/ReportSection";
import { StatGrid } from "../components/report/StatGrid";
import { ScoreCard } from "../components/report/ScoreCard";
import { SignalList } from "../components/report/SignalList";
import { RelationshipsList } from "../components/report/RelationshipsList";
import { EvidenceRegister } from "../components/report/EvidenceRegister";
import { TransactionsList } from "../components/report/TransactionsList";
import { Link } from "react-router-dom";
import { ArrowRight } from "../components/ui/icons";

// This service is deployed standalone - see TrustCheckWidget.tsx's
// identical constant and comment for why this needs to be absolute.
const API_BASE_URL = import.meta.env.VITE_SKUNKSCAN_API_BASE_URL ?? "";

// Same ordering (by real-world popularity/market-cap, not alphabetical) as
// TrustCheckWidget.tsx's identical constant, kept consistent across the site
// even though this copy only gates route validity and isn't rendered as a
// visible list.
const SUPPORTED_CHAINS = ["bitcoin", "ethereum", "bnb", "xrp", "solana", "base"] as const;

// Deliberately typed loosely (Record<string, any>-ish via `any` fields) at
// the boundary rather than re-declaring the full WalletInvestigationResult
// shape here - this page has no build-time dependency on @elizaos/agent
// (same reasoning as TrustCheckWidget.tsx's local SUPPORTED_CHAINS copy),
// and re-typing ~40 nested analyzer shapes by hand would drift out of sync
// with the real backend types instead of catching drift at review time.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FullReport = Record<string, any>;

function formatUnixDate(unixSeconds: unknown): string | null {
  if (typeof unixSeconds !== "number") return null;
  return new Date(unixSeconds * 1000).toISOString().slice(0, 10);
}

export function Report() {
  const { chain, address } = useParams<{ chain: string; address: string }>();
  const [report, setReport] = useState<FullReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chain || !address) return;
    if (!(SUPPORTED_CHAINS as readonly string[]).includes(chain)) {
      setError(`Unsupported chain: ${chain}`);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`${API_BASE_URL}/api/skunkscan/wallet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chain, address }),
    })
      .then((res) => res.json())
      .then((body: FullReport) => {
        if (body.status !== "supported") {
          setError(body.summary || "Could not investigate this wallet.");
          return;
        }
        setReport(body);
      })
      .catch(() => setError("Something went wrong reaching SkunkScan. Please try again."))
      .finally(() => setLoading(false));
  }, [chain, address]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center text-ink-400 sm:px-6">
        Loading full investigation…
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6">
        <p className="text-signal-red">{error ?? "This investigation could not be loaded."}</p>
      </div>
    );
  }

  const {
    skunkScore,
    executiveVerdict,
    balance,
    age,
    dormancy,
    activity,
    portfolio,
    nftHoldings,
    defi,
    protocols,
    protocolIntelligence,
    whale,
    trust,
    risk,
    exposure,
    custodyProfile,
    complianceScreening,
    transactionRisk,
    smartMoney,
    strategy,
    conviction,
    alpha,
    investmentStyle,
    profitability,
    reputation,
    relationships,
    funding,
    evidenceRecords,
    recentTransactions,
    transactionCountSample,
    patternAlerts,
    warnings,
  } = report;

  return (
    <div>
      {/* Temporarily fully unlocked - no auth/entitlement check here. Once
          Milestone 4 exists, gating wraps individual ReportSection children
          below; the section components themselves stay unchanged. */}
      <ReportSummaryBar
        headline={executiveVerdict?.headline ?? "Investigation complete"}
        verdict={executiveVerdict?.verdict ?? ""}
        riskDisplay={executiveVerdict?.riskDisplay}
        trustDisplay={executiveVerdict?.trustDisplay}
        exposureDisplay={executiveVerdict?.exposureDisplay}
      />

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="border-b border-ink-800 pb-4">
          <ReportNav />
        </div>

        <ReportSection id="overview" title="Wallet Overview" subtitle={`${chain} · ${address}`}>
          <StatGrid
            stats={[
              { label: "Balance", value: `${balance?.nativeAmount?.toLocaleString() ?? "-"} ${balance?.nativeSymbol ?? ""}` },
              {
                label: "Wallet age",
                value: age?.classification ?? "unknown",
                note: formatUnixDate(age?.firstKnownTransactionAt)
                  ? `First known transaction: ${formatUnixDate(age?.firstKnownTransactionAt)}`
                  : undefined,
              },
              {
                label: "Dormancy",
                value: dormancy?.classification ?? "unknown",
                note:
                  typeof dormancy?.daysSinceLastActivity === "number"
                    ? `${dormancy.daysSinceLastActivity} day(s) since last activity`
                    : undefined,
              },
              { label: "Activity level", value: activity?.activityLevel ?? "unknown" },
              {
                label: "Recommendation",
                value: executiveVerdict?.recommendation ?? "-",
                // suggestedAction is a full sentence, not a fragment - for a
                // positive/clean recommendation it already names the sources
                // this reflects (see executiveVerdict.ts's buildSuggestedAction),
                // so the same-breath disclosure lands right on the stat
                // itself, not only in the list below.
                note: executiveVerdict?.suggestedAction,
              },
            ]}
          />
          {executiveVerdict?.why?.length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-semibold text-ink-50">Why this recommendation</p>
              <div className="mt-2">
                <SignalList items={executiveVerdict.why} />
              </div>
            </div>
          )}
        </ReportSection>

        {/* Deliberately its own section, never merged into Risk & Trust or
            Compliance Screening below - a pattern alert is an independent
            behavioral observation about this wallet's own transaction
            history (e.g. raise-and-drain), not a match against
            staticRegistry.ts or the OFAC list. See types.ts's
            WalletPatternAlert doc comment. */}
        <ReportSection
          id="pattern-alerts"
          title="Pattern Alert"
          subtitle="Wallet-to-wallet native-asset (SOL/ETH) raise-and-drain detection only, within the recently analyzed transaction sample - does not cover token dumps or liquidity-pool rug pulls"
        >
          {patternAlerts && patternAlerts.length > 0 ? (
            <div className="space-y-3">
              {patternAlerts.map((alert: {
                patternId: string;
                detectedAt: string;
                evidenceSummary: string;
                reviewStatus: string;
              }) => (
                <div
                  key={`${alert.patternId}-${alert.detectedAt}`}
                  className="rounded-lg border border-dashed border-ink-600 bg-ink-900/60 p-4"
                >
                  <p className="text-sm font-semibold text-ink-50">
                    Pattern Alert: {alert.patternId.replace(/_/g, "-")}
                  </p>
                  <p className="mt-1 text-sm text-ink-200">
                    This wallet matched a known scam behavior pattern (
                    {alert.patternId.replace(/_/g, "-")}) on{" "}
                    {new Date(alert.detectedAt).toISOString().slice(0, 10)}. {alert.evidenceSummary}
                  </p>
                  <p className="mt-2 text-xs text-ink-400">
                    This is a behavioral observation, not a confirmed scam designation - and it only
                    covers the raise-and-drain pattern, not token dumps, liquidity-pool removals, or
                    activity outside the recently analyzed transaction sample.
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-400">
              No wallet-to-wallet SOL/ETH raise-and-drain pattern was found in the
              {typeof transactionCountSample === "number" ? ` ${transactionCountSample} most recently analyzed` : " recently analyzed"}
              {" "}transactions for this wallet. This does not cover token dumps, liquidity-pool
              removals, or activity outside that sample.
            </p>
          )}
        </ReportSection>

        <ReportSection id="portfolio" title="Portfolio Summary">
          <StatGrid
            stats={[
              { label: "Estimated value", value: portfolio?.estimatedTotalUsdValue != null ? `$${portfolio.estimatedTotalUsdValue.toLocaleString()}` : "Unavailable" },
              {
                label: "Token count",
                value: String(portfolio?.tokenCount ?? 0),
                note:
                  chain === "bitcoin"
                    ? "Bitcoin has no native token standard to check - not a checked-and-empty result."
                    : undefined,
              },
              { label: "Diversity", value: portfolio?.diversityApplicable === false ? "N/A for this chain" : (portfolio?.diversityLevel ?? "unknown") },
              { label: "Concentration", value: portfolio?.concentrationLevel ?? "unknown" },
              { label: "NFTs held", value: String(nftHoldings?.length ?? 0) },
              { label: "Data completeness", value: portfolio?.dataCompleteness ?? "unknown" },
            ]}
          />
          {portfolio?.notes?.length > 0 && (
            <div className="mt-6">
              <SignalList items={portfolio.notes} tone="muted" />
            </div>
          )}
        </ReportSection>

        <ReportSection id="defi" title="DeFi Activity">
          <StatGrid
            stats={[
              { label: "Protocols used", value: String(defi?.protocolCount ?? 0) },
              { label: "DeFi profile", value: defi?.profile ?? "none" },
              { label: "Verified protocols", value: String(protocols?.verifiedProtocols ?? 0) },
              { label: "Protocol diversity", value: protocolIntelligence?.protocolDiversity ?? "none" },
            ]}
          />
          {defi?.notes?.length > 0 && (
            <div className="mt-6">
              <SignalList items={defi.notes} tone="muted" />
            </div>
          )}
        </ReportSection>

        <ReportSection id="risk-signals" title="Whale, Trust, Risk & Exposure">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ScoreCard
              title="Whale"
              level={whale?.whaleLevel ?? "unknown"}
              displayScore={`${whale?.whaleScore ?? 0}/100`}
              // Whale is a blended score (USD value is only one of six
              // signals - age/activity/diversity/funding/risk make up the
              // rest), so a low-USD wallet can still land on a non-zero
              // score. investorExplanation.summary is the one place the
              // real USD figure actually gets stated - not shown anywhere
              // else on this card - so it's surfaced here to resolve that
              // apparent contradiction at a glance instead of requiring a
              // read through the undifferentiated reasons list below.
              summary={whale?.investorExplanation?.summary}
              positive={whale?.reasons}
              limitations={whale?.limitations}
            />
            <ScoreCard
              title="Trust"
              level={trust?.trustLevel ?? "unknown"}
              displayScore={`${trust?.trustScore ?? 0}/100`}
              positive={trust?.positiveSignals}
              limitations={trust?.limitations}
            />
            <ScoreCard
              title="Risk"
              level={risk?.level ?? "unknown"}
              displayScore={`${risk?.score ?? 0}/100`}
              positive={risk?.reasons}
              limitations={risk?.limitations}
            />
            <ScoreCard
              title="Exposure"
              level={exposure?.exposureLevel ?? "unknown"}
              displayScore={`${exposure?.exposureScore ?? 0}/100`}
              // Was reading exposure?.limitations, a field that doesn't
              // exist on WalletExposureSummary (the real field is `notes`)
              // - this line has been silently rendering nothing since the
              // Exposure card was added. Real bug, unrelated to this pass;
              // fixed here since it's the exact card being touched.
              limitations={exposure?.notes}
            />
            <ScoreCard
              title="Custody"
              level={custodyProfile?.custodyType ?? "unknown"}
              displayScore={custodyProfile?.temperatureProfile ?? "-"}
              positive={custodyProfile?.reasons}
              limitations={custodyProfile?.limitations}
            />
            <ScoreCard
              title="Transaction Risk"
              level={transactionRisk?.level ?? "unknown"}
              displayScore={transactionRisk?.displayScore ?? "-"}
              limitations={transactionRisk?.limitations}
            />
          </div>

          {complianceScreening && (
            <div className="mt-6 rounded-lg border border-ink-800 p-4">
              <h3 className="text-sm font-semibold text-ink-50">Compliance Screening</h3>
              {(() => {
                // Names the real source behind each status pill instead of
                // a bare "no match in connected sources" enum, reading
                // straight from sourcesChecked (the same real, live source
                // list compliance.ts builds) rather than a hardcoded name -
                // so this can't drift if a source's name or category ever
                // changes server-side.
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const sourceNameForCategory = (category: string) =>
                  complianceScreening.sourcesChecked?.find(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (source: any) => source.category === category,
                  )?.name;

                const internalRegistryName = sourceNameForCategory("internal_registry");
                const sanctionsSourceName = sourceNameForCategory("sanctions");

                const withSource = (status: string | undefined, sourceName: string | undefined) => {
                  const label = status?.replace(/_/g, " ") ?? "unknown";
                  return sourceName ? `${label} (${sourceName})` : label;
                };

                return (
                  <StatGrid
                    stats={[
                      { label: "Scam", value: withSource(complianceScreening.scamStatus, internalRegistryName) },
                      { label: "Rug pull", value: withSource(complianceScreening.rugPullStatus, internalRegistryName) },
                      { label: "Suspicious", value: withSource(complianceScreening.suspiciousStatus, internalRegistryName) },
                      { label: "Sanctions", value: withSource(complianceScreening.sanctionsStatus, sanctionsSourceName) },
                    ]}
                  />
                );
              })()}
              {/* Previously the 4 status pills above were the only thing
                  shown here - a "no match" pill with zero indication of
                  which sources were actually checked. complianceScreening
                  already computes this honestly server-side (see
                  compliance.ts's sourcesChecked/limitations) but it was
                  never rendered anywhere on the frontend. Rendering the
                  real array directly, not new static copy, so this can
                  never drift out of sync with what's actually connected. */}
              {complianceScreening.limitations?.length > 0 && (
                <div className="mt-4">
                  <SignalList items={complianceScreening.limitations} tone="muted" />
                </div>
              )}
            </div>
          )}
        </ReportSection>

        <ReportSection id="sub-scores" title="SkunkScore" subtitle="Long-term wallet quality - a separate signal from the Recommendation above">
          {/* Deliberately its own card, separate from the Recommendation
              banner at the top of the page - see ReportSummaryBar.tsx's
              comment for why the two were split apart. This is SkunkScore's
              home: the number, stars, and rating, plus the one sentence
              that keeps a reader from mistaking it for a second verdict. */}
          <div className="mb-6 flex flex-col gap-3 rounded-xl border border-ink-800 bg-ink-900/40 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-center gap-4">
              <span className="text-3xl font-bold text-ink-50">{skunkScore?.displayScore ?? "-"}</span>
              <div>
                <span aria-hidden="true" className="text-lg text-ink-200">
                  {"★".repeat(skunkScore?.stars ?? 0)}
                  {"☆".repeat(5 - (skunkScore?.stars ?? 0))}
                </span>
                <p className="text-sm text-ink-400">
                  {skunkScore?.recommendation ?? "SkunkScore unavailable"}
                </p>
              </div>
            </div>
          </div>
          <p className="mb-6 text-sm text-ink-200 sm:text-base">
            SkunkScore measures this wallet's overall long-term quality and reputation - trust
            history, smart-money behavior, and profitability. It's a separate question from the
            Recommendation at the top of this report, which reflects only immediate transaction
            risk. A wallet can be safe to transact with right now while still scoring lower here,
            or the reverse.
          </p>
          <Link
            to="/understanding-your-report"
            className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-signal-green hover:text-signal-green-dark"
          >
            What do these 14 scores actually mean?
            <ArrowRight className="h-4 w-4" />
          </Link>
          <h3 className="mb-3 text-sm font-semibold text-ink-50">What SkunkScore is built from</h3>
          <div className="mb-6 overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead>
                <tr className="border-b border-ink-800 text-xs uppercase tracking-wide text-ink-400">
                  <th className="pb-2 pr-4 font-medium">Component</th>
                  <th className="pb-2 pr-4 font-medium">Score</th>
                  <th className="pb-2 pr-4 font-medium">Weight</th>
                  <th className="pb-2 font-medium">Contribution</th>
                </tr>
              </thead>
              <tbody>
                {(skunkScore?.breakdown ?? []).map((term: { label: string; score: number; weight: number; contribution: number }) => (
                  <tr key={term.label} className="border-b border-ink-800/60">
                    <td className="py-2 pr-4 text-ink-200">{term.label}</td>
                    <td className="py-2 pr-4 text-ink-200">{term.score}/100</td>
                    <td className="py-2 pr-4 text-ink-200">{Math.round(term.weight * 100)}%</td>
                    <td className="py-2 text-ink-200">+{term.contribution}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ScoreCard title="Smart Money" level={smartMoney?.level ?? "unknown"} displayScore={smartMoney?.displayScore ?? "-"} positive={smartMoney?.positiveSignals} />
            <ScoreCard title="Strategy" level={strategy?.primaryStrategy ?? "unknown"} displayScore={strategy?.displayScore ?? "-"} positive={strategy?.supportingSignals} negative={strategy?.conflictingSignals} />
            <ScoreCard title="Conviction" level={conviction?.convictionLevel ?? "unknown"} displayScore={conviction?.displayScore ?? "-"} positive={conviction?.supportingSignals} negative={conviction?.conflictingSignals} limitations={conviction?.limitations} />
            <ScoreCard title="Alpha" level={alpha?.alphaLevel ?? "unknown"} displayScore={alpha?.displayScore ?? "-"} positive={alpha?.strengths} negative={alpha?.weaknesses} limitations={alpha?.limitations} />
            <ScoreCard title="Investment Style" level={investmentStyle?.style ?? "unknown"} displayScore={investmentStyle?.confidence ?? "-"} positive={investmentStyle?.supportingSignals} negative={investmentStyle?.conflictingSignals} />
            <ScoreCard title="Profitability" level={profitability?.profitabilityLevel ?? "unknown"} displayScore={profitability?.displayScore ?? "-"} positive={profitability?.positiveIndicators} negative={profitability?.negativeIndicators} />
            <ScoreCard title="Reputation" level={reputation?.reputationLevel ?? "unknown"} displayScore={reputation?.displayScore ?? "-"} positive={reputation?.strengths} negative={reputation?.concerns} limitations={reputation?.limitations} />
          </div>
        </ReportSection>

        <ReportSection
          id="relationships"
          title="Relationships"
          subtitle={`${relationships?.relationshipCount ?? 0} counted (${relationships?.knownInfrastructureCount ?? 0} known-infrastructure, shown but excluded from that count)`}
        >
          {funding?.fundingWallet && (
            <div className="mb-6 rounded-lg border border-ink-800 p-4">
              <h3 className="text-sm font-semibold text-ink-50">Funding source</h3>
              <StatGrid
                stats={[
                  { label: "Funded by", value: funding.fundingSourceLabel?.label ?? "Unknown" },
                  { label: "Source type", value: funding.fundingSourceType ?? "unknown" },
                  { label: "Amount", value: funding.fundingAmountNative != null ? `${funding.fundingAmountNative} ${balance?.nativeSymbol ?? ""}` : "-" },
                ]}
              />
            </div>
          )}
          <RelationshipsList relationships={relationships?.relationships ?? []} />
          {relationships?.notes?.length > 0 && (
            <div className="mt-6">
              <SignalList items={relationships.notes} tone="muted" />
            </div>
          )}
        </ReportSection>

        <ReportSection id="evidence" title="Evidence Register">
          <EvidenceRegister records={evidenceRecords ?? []} />
        </ReportSection>

        <ReportSection id="transactions" title="Recent Transactions" defaultOpen={false}>
          <TransactionsList transactions={recentTransactions ?? []} />
        </ReportSection>

        <ReportSection id="limitations" title="Limitations">
          <p className="mb-4 text-sm text-ink-400">
            Disclosed limitations for this specific investigation - see How It Works for what
            every chain covers in general.
          </p>
          <SignalList items={warnings ?? []} />
        </ReportSection>
      </div>
    </div>
  );
}
