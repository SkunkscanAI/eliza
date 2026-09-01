const VERDICT_TONE: Record<string, string> = {
  low_risk: "text-signal-green",
  medium_risk: "text-signal-yellow",
  high_risk: "text-signal-red",
};

// Sticky, always-visible while scrolling a long report - the "here's the
// bottom line" a webpage should lead with, unlike a paginated PDF where the
// executive summary is just the first page.
//
// Deliberately executiveVerdict-only, not executiveVerdict + skunkScore -
// they answer two different questions (immediate transaction risk vs.
// long-term wallet reputation) and showing both side by side here read as
// one tool giving two contradicting verdicts (e.g. a green "Low risk
// wallet" headline next to a 2-star SkunkScore), a real, confirmed
// user-trust issue. SkunkScore now lives in its own section further down
// the report (see Report.tsx's "SkunkScore" section) with copy explicit
// about what it does and doesn't measure. The risk/trust/exposure badges
// here are executiveVerdict's OWN inputs (the evidence behind this exact
// verdict) - showing them can never introduce a second opinion, since
// they're restating this verdict's own reasoning, not a competing score.
export function ReportSummaryBar({
  headline,
  verdict,
  riskDisplay,
  trustDisplay,
  exposureDisplay,
}: {
  headline: string;
  verdict: string;
  riskDisplay?: string;
  trustDisplay?: string;
  exposureDisplay?: string;
}) {
  return (
    <div className="sticky top-16 z-30 border-b border-ink-800 bg-ink-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className={`text-base font-semibold sm:text-lg ${VERDICT_TONE[verdict] ?? "text-ink-50"}`}>
          {headline}
        </p>
        {(riskDisplay || trustDisplay || exposureDisplay) && (
          <div className="flex items-center gap-3 text-sm text-ink-200">
            {riskDisplay && <span>Risk {riskDisplay}</span>}
            {trustDisplay && <span>Trust {trustDisplay}</span>}
            {exposureDisplay && <span>Exposure {exposureDisplay}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
