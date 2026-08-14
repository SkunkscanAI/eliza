const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "portfolio", label: "Portfolio" },
  { id: "defi", label: "DeFi Activity" },
  { id: "risk-signals", label: "Risk & Trust" },
  { id: "sub-scores", label: "Sub-Scores" },
  { id: "relationships", label: "Relationships" },
  { id: "evidence", label: "Evidence Register" },
  { id: "transactions", label: "Transactions" },
  { id: "limitations", label: "Limitations" },
];

// Anchor nav for the 9 report sections - a PDF gets this for free from
// pagination, a single scrolling webpage doesn't, especially on mobile.
export function ReportNav() {
  return (
    <nav className="scrollbar-none -mx-4 flex gap-4 overflow-x-auto px-4 pb-3 text-sm sm:mx-0 sm:flex-wrap sm:px-0">
      {SECTIONS.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          className="shrink-0 text-ink-400 hover:text-signal-green"
        >
          {section.label}
        </a>
      ))}
    </nav>
  );
}
