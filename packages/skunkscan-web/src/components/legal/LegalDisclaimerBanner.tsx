// Shown at the top of both /terms and /privacy. Deliberate, visible honesty
// about the document's actual status - not a polished final legal document,
// same "disclose what we don't have" principle as the rest of this site.
export function LegalDisclaimerBanner() {
  return (
    <div className="rounded-lg border border-signal-yellow/40 bg-signal-yellow/10 p-4 text-sm text-ink-100 sm:p-5">
      <p className="font-semibold text-signal-yellow">
        This page describes SkunkScan honestly, but it has not received formal legal review.
      </p>
      <p className="mt-2 text-ink-200">
        It is not yet a finalized, binding legal document, and no formal company entity is
        registered behind it yet. Sections marked{" "}
        <span className="font-semibold text-signal-yellow">Needs legal review</span> use
        conservative placeholder language pending real legal sign-off - this applies especially
        once real payment processing goes live.
      </p>
    </div>
  );
}
