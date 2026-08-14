// Real shipped changes only, newest first - dates pulled from actual merge
// history, not approximated. Internal/infra-only changes (the standalone
// Railway service migration, the auth-exemption backend fix) are
// deliberately left out - this is a user-facing "what's new" log, not a
// deploy log.
const ENTRIES = [
  {
    date: "14 August 2026",
    title: "Terms of Service and Privacy Policy",
    body: "Published /terms and /privacy - an honest description of what SkunkScan actually does today, clearly marked as pending real legal review rather than presented as finalized documents.",
  },
  {
    date: "14 August 2026",
    title: "Full investigation report",
    body: "Added the full investigation report page - risk, trust, exposure, sub-scores, relationships, evidence, and recent transactions for a wallet, reusing the same free pipeline as the Trust Check. Linked from every Trust Check result.",
  },
  {
    date: "13 August 2026",
    title: "How It Works, About, FAQ, and Contact",
    body: "Added the site's explanatory pages: a real per-chain breakdown of what SkunkScan checks (and doesn't yet), the team's scoring philosophy, answers to common questions, and a direct contact email.",
  },
  {
    date: "13 August 2026",
    title: "SkunkScan launches",
    body: "Homepage with the free Trust Check tool built in, a dedicated /check page, and a pricing page. The free Trust Check remains free, no account required.",
  },
];

export function Changelog() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold text-ink-50 sm:text-4xl">Changelog</h1>
      <p className="mt-3 text-sm text-ink-400 sm:text-base">
        What's shipped so far, newest first.
      </p>

      <div className="mt-10 space-y-8">
        {ENTRIES.map((entry) => (
          <div key={entry.title} className="border-b border-ink-800 pb-8 last:border-b-0">
            <p className="text-xs uppercase tracking-wide text-ink-400">{entry.date}</p>
            <h2 className="mt-1 text-lg font-semibold text-ink-50">{entry.title}</h2>
            <p className="mt-2 text-sm text-ink-200 sm:text-base">{entry.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
