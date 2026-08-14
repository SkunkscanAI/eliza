import { ReactNode, useState } from "react";
import { ChevronDown } from "../ui/icons";
import { cn } from "../../lib/utils";

// Chain-agnostic, purely presentational - reused across every report
// section regardless of which chain the data came from. Deliberately has
// no knowledge of entitlements/gating: Milestone 4 wraps this component in
// a permission check rather than this component knowing about locking
// itself, so the same section components work unlocked (now) and gated
// (later) without a rebuild.
export function ReportSection({
  id,
  title,
  subtitle,
  defaultOpen = true,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section id={id} className="scroll-mt-20 border-b border-ink-800 py-8 first:pt-0 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-4 text-left"
        aria-expanded={open}
      >
        <div>
          <h2 className="text-xl font-semibold text-ink-50 sm:text-2xl">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-ink-400">{subtitle}</p>}
        </div>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-ink-400 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && <div className="mt-6">{children}</div>}
    </section>
  );
}
