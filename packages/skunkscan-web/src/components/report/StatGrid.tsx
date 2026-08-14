// Reusable label/value grid - the bulk of the report's sections
// (whale/trust/risk/exposure, sub-scores, wallet overview) are the same
// "here are some labeled numbers and levels" shape, just from different
// analyzers. One component instead of bespoke markup per section.
export function StatGrid({
  stats,
}: {
  stats: { label: string; value: string; note?: string }[];
}) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label}>
          <dt className="text-xs uppercase tracking-wide text-ink-400">{stat.label}</dt>
          <dd className="mt-1 text-base font-medium text-ink-50">{stat.value}</dd>
          {stat.note && <dd className="mt-1 text-xs text-ink-400">{stat.note}</dd>}
        </div>
      ))}
    </dl>
  );
}
