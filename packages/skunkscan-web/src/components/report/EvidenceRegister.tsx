type EvidenceRecord = {
  id: string;
  category: string;
  fact: string;
  sourceName: string;
  confidence: string;
  limitations: string[];
};

export function EvidenceRegister({ records }: { records: EvidenceRecord[] }) {
  if (records.length === 0) {
    return <p className="text-sm text-ink-400">No structured evidence records were produced.</p>;
  }

  return (
    <div className="space-y-4">
      {records.map((record) => (
        <div key={record.id} className="rounded-lg border border-ink-800 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs uppercase tracking-wide text-signal-green">
              {record.category.replace(/_/g, " ")}
            </span>
            <span className="text-xs text-ink-400">
              {record.confidence} confidence · {record.sourceName}
            </span>
          </div>
          <p className="mt-2 text-sm text-ink-100">{record.fact}</p>
          {record.limitations.length > 0 && (
            <p className="mt-2 text-xs text-ink-400">{record.limitations[0]}</p>
          )}
        </div>
      ))}
    </div>
  );
}
