import { TrustCheckWidget } from "../components/TrustCheckWidget";

// Same TrustCheckWidget component as the homepage - this route exists for
// direct links, sharing, and as the canonical "full tool" URL, not as a
// second copy of the form. See TrustCheckWidget.tsx.
export function Check() {
  return (
    <section className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-2xl font-bold text-ink-50 sm:text-3xl">Check a wallet</h1>
      <p className="mt-2 text-base text-ink-200">
        Paste any wallet address below for a free, instant risk check.
      </p>

      <div className="mt-8 rounded-2xl border border-ink-800 bg-ink-900/60 p-4 sm:p-8">
        <TrustCheckWidget />
      </div>
    </section>
  );
}
