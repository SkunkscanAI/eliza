import { ReactNode } from "react";

export function LegalSection({
  title,
  needsReview = false,
  children,
}: {
  title: string;
  needsReview?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-ink-800 py-6 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-ink-50">{title}</h2>
        {needsReview && (
          <span className="rounded bg-signal-yellow/15 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-signal-yellow">
            Needs legal review
          </span>
        )}
      </div>
      <div className="mt-3 space-y-3 text-sm text-ink-200 sm:text-base">{children}</div>
    </section>
  );
}
