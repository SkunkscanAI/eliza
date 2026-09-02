import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";

const PRINCIPLES = [
  {
    title: "Real evidence, not vibes",
    body: "Every score is built from data we can point to - a real transaction, a real balance, a real known-wallet match. If we can't verify something, it doesn't quietly count against - or for - a wallet.",
  },
  {
    title: "Confidence is shown, not assumed",
    body: "A result built on thin evidence is labeled as lower-confidence, not presented with the same certainty as one built on a full picture. Incomplete data is disclosed, never disguised as a clean result.",
  },
  {
    title: "Smaller and verified beats bigger and assumed",
    body: "Our known-infrastructure and exchange registries only include entries we've independently verified against the source itself - an exchange's own published reserve addresses, not a third-party list we're trusting blind. That means our coverage is narrower than it could be if we cut that corner. We think that trade is worth it.",
  },
  {
    title: "We tell you what we don't cover",
    body: "Every chain has real, disclosed gaps - some structural (Bitcoin has no fungible-token standard), some partially built (we self-host the US Treasury's OFAC sanctions list, but EU/UK/UN sanctions lists and commercial adverse-media screening aren't connected yet). We'd rather you see the honest edge of what we know than assume our silence means \"nothing to worry about.\"",
  },
];

export function About() {
  return (
    <div>
      <section className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6 sm:py-16">
        <h1 className="text-3xl font-bold text-ink-50 sm:text-4xl">About SkunkScan</h1>
        <p className="mt-4 text-base text-ink-200 sm:text-lg">
          SkunkScan exists for one moment: right before you send crypto to an address you're not
          sure about. The SkunkScan team built it to answer that moment honestly - with real
          on-chain evidence, no guessing, and no pretending to know more than we do.
        </p>
      </section>

      <section className="border-t border-ink-800 bg-ink-900/40">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <h2 className="text-2xl font-semibold text-ink-50 sm:text-3xl">
            How we think about trust
          </h2>
          <div className="mt-8 space-y-6">
            {PRINCIPLES.map((principle) => (
              <div key={principle.title} className="rounded-xl border border-ink-800 p-5 sm:p-6">
                <h3 className="text-lg font-semibold text-ink-50">{principle.title}</h3>
                <p className="mt-2 text-sm text-ink-200 sm:text-base">{principle.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
        <h2 className="text-xl font-semibold text-ink-50 sm:text-2xl">
          Want the full detail on what we check?
        </h2>
        <p className="mt-3 text-sm text-ink-200 sm:text-base">
          How It Works walks through the actual pipeline and the exact, real limitations of each
          supported chain.
        </p>
        <Button asChild size="lg" className="mt-6">
          <Link to="/how-it-works">Read how it works</Link>
        </Button>
      </section>
    </div>
  );
}
