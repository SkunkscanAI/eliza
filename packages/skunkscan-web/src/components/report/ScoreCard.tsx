import { SignalList } from "./SignalList";
import { ArrowRight } from "../ui/icons";

// Every scoring analyzer (whale/trust/risk/exposure/smartMoney/strategy/
// conviction/alpha/investmentStyle/profitability/reputation) returns the
// same real shape - a level, a score, positive evidence, negative/
// conflicting evidence, and limitations - just under different field
// names per analyzer. One reusable card instead of bespoke markup x11.
export function ScoreCard({
  title,
  level,
  displayScore,
  summary,
  positive = [],
  negative = [],
  limitations = [],
}: {
  title: string;
  level: string;
  displayScore: string;
  // Optional one-sentence, per-wallet explanation (e.g. an analyzer's
  // investorExplanation.summary) - only worth passing when it states real
  // information not already visible elsewhere on this card (a number, a
  // specific finding), not when it would just restate the score/level
  // already shown above. Rendered with visual priority over the bullet
  // list below, since it's meant to resolve "why this score" at a glance
  // rather than require reading through undifferentiated reasons.
  summary?: string;
  positive?: string[];
  negative?: string[];
  limitations?: string[];
}) {
  return (
    <div className="rounded-lg border border-ink-800 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink-50">{title}</h3>
        <span className="text-xs uppercase tracking-wide text-ink-400">{level.replace(/_/g, " ")}</span>
      </div>
      <p className="mt-1 text-2xl font-bold text-ink-50">{displayScore}</p>
      {summary && <p className="mt-2 text-sm text-ink-200">{summary}</p>}

      {positive.length > 0 && (
        <div className="mt-3">
          <SignalList items={positive} />
        </div>
      )}
      {negative.length > 0 && (
        <div className="mt-3">
          <SignalList items={negative} tone="muted" />
        </div>
      )}
      {limitations.length > 0 && (
        <p className="mt-3 text-xs text-ink-400">{limitations[0]}</p>
      )}

      {/* Evidence-gated: only appears when this card actually has real
          evidence behind it (positive/negative signals or a disclosed
          limitation) - links to the report's real structured evidence
          records, not a freeform explanation. */}
      {(positive.length > 0 || negative.length > 0 || limitations.length > 0) && (
        <a
          href="#evidence"
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-signal-green hover:text-signal-green-dark"
        >
          Why? See the evidence
          <ArrowRight className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}
