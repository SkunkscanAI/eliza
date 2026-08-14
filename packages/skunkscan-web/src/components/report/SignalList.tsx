// Every analyzer exposes its evidence/caveats as a plain string array
// (reasons, notes, limitations, warnings) - one shared renderer for all of
// them rather than repeating a <ul> per section.
export function SignalList({
  items,
  tone = "neutral",
}: {
  items: string[];
  tone?: "neutral" | "muted";
}) {
  if (items.length === 0) return null;

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item}
          className={`flex gap-2.5 text-sm ${tone === "muted" ? "text-ink-400" : "text-ink-200"}`}
        >
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink-600" />
          {item}
        </li>
      ))}
    </ul>
  );
}
