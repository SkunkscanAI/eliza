type Relationship = {
  address: string;
  relationship: string;
  label: string | null;
  direction: string;
  interactionCount: number;
  isKnownInfrastructure: boolean;
  infrastructureLabel: string | null;
};

// Capped display, not the full list - a wallet can have dozens/hundreds of
// relationships (relationshipCount is shown separately as the real total).
// Sorted by interactionCount server-side already; take the top slice.
const MAX_SHOWN = 20;

export function RelationshipsList({ relationships }: { relationships: Relationship[] }) {
  if (relationships.length === 0) {
    return <p className="text-sm text-ink-400">No direct relationships were identified.</p>;
  }

  const shown = relationships.slice(0, MAX_SHOWN);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="border-b border-ink-800 text-xs uppercase tracking-wide text-ink-400">
            <th className="pb-2 pr-4 font-medium">Address</th>
            <th className="pb-2 pr-4 font-medium">Type</th>
            <th className="pb-2 pr-4 font-medium">Direction</th>
            <th className="pb-2 font-medium">Interactions</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((rel) => (
            <tr key={rel.address} className="border-b border-ink-800/60">
              <td className="py-2 pr-4 font-mono text-xs text-ink-200">
                {rel.address.slice(0, 10)}…{rel.address.slice(-6)}
                {rel.isKnownInfrastructure && rel.infrastructureLabel && (
                  <span className="ml-2 rounded bg-ink-800 px-1.5 py-0.5 text-[10px] uppercase text-ink-400">
                    {rel.infrastructureLabel}
                  </span>
                )}
              </td>
              <td className="py-2 pr-4 capitalize text-ink-200">{rel.relationship}</td>
              <td className="py-2 pr-4 capitalize text-ink-200">{rel.direction}</td>
              <td className="py-2 text-ink-200">{rel.interactionCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {relationships.length > MAX_SHOWN && (
        <p className="mt-3 text-xs text-ink-400">
          Showing the top {MAX_SHOWN} of {relationships.length} relationships.
        </p>
      )}
    </div>
  );
}
