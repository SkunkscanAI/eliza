import { Button } from "../components/ui/button";

const SUPPORT_EMAIL = "support@skunkscan.ai";

// mailto: for now, not a form - no live backend email-delivery
// infrastructure exists for this stack yet (see the routing-tradeoffs
// investigation this session for the same "don't ship infra we don't have
// a decided need for" reasoning). A form with nowhere real to send
// submissions would be worse than this. Real form + delivery is a scoped,
// justified addition later if contact volume/conversion data supports it.
export function Contact() {
  return (
    <section className="mx-auto max-w-2xl px-4 py-12 text-center sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold text-ink-50 sm:text-4xl">Contact</h1>
      <p className="mt-4 text-base text-ink-200 sm:text-lg">
        Question about a result, a bug to report, or something else - email us directly and
        we'll get back to you.
      </p>

      <Button asChild size="lg" className="mt-8">
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
      </Button>
    </section>
  );
}
