import { Link } from "react-router-dom";

// One real explanation per score, written once here rather than repeated
// under each ScoreCard everywhere it appears in the report - see Report.tsx's
// Sub-Scores section, which links here instead of duplicating this content.
const SCORES = [
  {
    name: "SkunkScore",
    body: "The single overall number shown at the top of your report - a weighted blend of the scores below. Your report's own Sub-Scores breakdown table shows the exact weight each component contributed to your specific result, rather than us stating fixed percentages here that could drift out of sync with the real calculation.",
  },
  {
    name: "Whale",
    body: "How large and established this wallet's on-chain footprint looks - based on estimated portfolio value, wallet age, and recent activity. A high whale score is a size signal, not a trust signal on its own.",
  },
  {
    name: "Trust",
    body: "How much verified evidence supports trusting this wallet - built from wallet age, activity consistency, whether a funding source could be identified, and whether any exposure to risky wallets was found.",
  },
  {
    name: "Risk",
    body: "Evidence of risk found in the transaction sample SkunkScan was able to analyze. A low risk score means no evidence of risk was found in what we checked - not a guarantee nothing risky exists outside that sample.",
  },
  {
    name: "Exposure",
    body: "Whether this wallet has a direct or indirect on-chain connection to wallets already flagged as risky (scams, sanctioned addresses, known bad actors) in SkunkScan's sources.",
  },
  {
    name: "Custody",
    body: "Whether this wallet's behavior looks like a self-custodied personal wallet or an exchange-hosted (hot) wallet - based on funding patterns and activity, not a definitive on-chain fact.",
  },
  {
    name: "Transaction Risk",
    body: "A narrower, wallet-context risk read specifically about the transaction-level patterns SkunkScan analyzed, as distinct from the broader Risk score above.",
  },
  {
    name: "Smart Money",
    body: "Whether this wallet's behavior resembles patterns associated with experienced, informed investors - based on age, activity, DeFi usage, and portfolio composition. A label, not a certification.",
  },
  {
    name: "Strategy",
    body: "SkunkScan's best inference of this wallet's dominant on-chain behavior pattern (for example, holding versus actively accumulating), based on wallet age and recent activity level.",
  },
  {
    name: "Conviction",
    body: "How consistently this wallet's actual activity supports its inferred Strategy, versus showing conflicting signals.",
  },
  {
    name: "Alpha",
    body: "Whether this wallet shows signs of unusually well-timed or well-informed positioning, drawing on risk, trust, portfolio, and DeFi signals together.",
  },
  {
    name: "Investment Style",
    body: "A behavioral category (for example, long-term holder versus active trader) inferred from Strategy, Smart Money, Conviction, and Alpha together.",
  },
  {
    name: "Investor Skill Signal",
    body: "How closely this wallet's behavior resembles patterns historically associated with profitable investors, based on Alpha, Conviction, Strategy, Trust, and Smart Money together. This is a structural limitation, not a data-completeness gap: SkunkScan has no historical, point-in-time price data on any chain today, so it cannot calculate real trading profit or loss - no amount of additional transaction history would change that.",
  },
  {
    name: "Reputation",
    body: "An aggregate standing signal combining Trust, Risk, Smart Money, Alpha, and the Investor Skill Signal into one summary read of this wallet's overall on-chain track record.",
  },
];

export function UnderstandingYourReport() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold text-ink-50 sm:text-4xl">Understanding Your Report</h1>
      <p className="mt-4 text-base text-ink-200 sm:text-lg">
        Every full investigation report shows the same 14 scores. Here's what each one actually
        measures, in plain language - written once here instead of repeated under every score
        everywhere it appears.
      </p>

      <div className="mt-6 rounded-lg border border-signal-yellow/40 bg-signal-yellow/10 p-4 text-sm sm:p-5">
        <p className="font-semibold text-signal-yellow">
          These are evidence-based estimates, not guarantees.
        </p>
        <p className="mt-1 text-ink-200">
          Every score is built from real on-chain data SkunkScan could actually check. A good
          score on any of these means no evidence of a problem was found in what we checked - it
          is not a certification and does not cover activity outside what's visible on-chain.
        </p>
      </div>

      <div className="mt-10 space-y-8">
        {SCORES.map((score) => (
          <div key={score.name} className="border-b border-ink-800 pb-8 last:border-b-0">
            <h2 className="text-lg font-semibold text-ink-50">{score.name}</h2>
            <p className="mt-2 text-sm text-ink-200 sm:text-base">{score.body}</p>
          </div>
        ))}
      </div>

      <p className="mt-10 text-sm text-ink-400">
        Want the full detail on how we build these from real chain data?{" "}
        <Link to="/how-it-works" className="text-signal-green hover:text-signal-green-dark">
          Read How It Works
        </Link>
        .
      </p>
    </section>
  );
}
