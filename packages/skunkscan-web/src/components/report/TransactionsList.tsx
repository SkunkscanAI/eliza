type Transaction = {
  transactionId: string;
  blockHeight?: number;
  blockTime?: number;
  status: string;
};

const MAX_SHOWN = 25;

export function TransactionsList({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) {
    return <p className="text-sm text-ink-400">No recent transactions were found.</p>;
  }

  const shown = transactions.slice(0, MAX_SHOWN);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead>
          <tr className="border-b border-ink-800 text-xs uppercase tracking-wide text-ink-400">
            <th className="pb-2 pr-4 font-medium">Transaction</th>
            <th className="pb-2 pr-4 font-medium">Time</th>
            <th className="pb-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((tx) => (
            <tr key={tx.transactionId} className="border-b border-ink-800/60">
              <td className="py-2 pr-4 font-mono text-xs text-ink-200">
                {tx.transactionId.slice(0, 10)}…{tx.transactionId.slice(-6)}
              </td>
              <td className="py-2 pr-4 text-ink-200">
                {tx.blockTime ? new Date(tx.blockTime * 1000).toLocaleString() : "Unknown"}
              </td>
              <td className="py-2 capitalize text-ink-200">{tx.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {transactions.length > MAX_SHOWN && (
        <p className="mt-3 text-xs text-ink-400">
          Showing the {MAX_SHOWN} most recent of {transactions.length} transactions in the sample.
        </p>
      )}
    </div>
  );
}
