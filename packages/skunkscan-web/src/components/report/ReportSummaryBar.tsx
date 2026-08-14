const VERDICT_TONE: Record<string, string> = {
  low_risk: "text-signal-green",
  medium_risk: "text-signal-yellow",
  high_risk: "text-signal-red",
};

// Sticky, always-visible while scrolling a long report - the "here's the
// bottom line" a webpage should lead with, unlike a paginated PDF where the
// executive summary is just the first page. Reads executiveVerdict +
// skunkScore only - both already computed by the pipeline, nothing new.
export function ReportSummaryBar({
  headline,
  verdict,
  score,
  displayScore,
  stars,
}: {
  headline: string;
  verdict: string;
  score: number;
  displayScore: string;
  stars: number;
}) {
  return (
    <div className="sticky top-16 z-30 border-b border-ink-800 bg-ink-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className={`text-base font-semibold sm:text-lg ${VERDICT_TONE[verdict] ?? "text-ink-50"}`}>
          {headline}
        </p>
        <div className="flex items-center gap-3 text-sm text-ink-200">
          <span className="text-lg font-bold text-ink-50">{displayScore}</span>
          <span aria-hidden="true">{"★".repeat(stars)}{"☆".repeat(5 - stars)}</span>
          <span className="text-ink-400">SkunkScore: {score}/100</span>
        </div>
      </div>
    </div>
  );
}
