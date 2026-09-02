import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Check } from "../components/ui/icons";

type Tier = {
  name: string;
  price: string;
  cadence: string;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
};

const TIERS: Tier[] = [
  {
    name: "Free",
    price: "€0",
    cadence: "",
    description: "A quick, honest read before you send or get paid.",
    features: ["Trust Check verdict (green / yellow / red)", "Risk, trust, and exposure summary", "All 5 supported chains"],
    cta: "Check a wallet",
  },
  {
    name: "One-off check",
    price: "€4.99",
    cadence: "per wallet",
    description: "A full deep-dive investigation, once.",
    features: ["Everything in Free", "Full analyzer breakdown", "Relationship and funding trace", "Compliance screening detail"],
    cta: "Coming soon",
    highlighted: true,
  },
  {
    name: "Subscription",
    price: "€19.99",
    cadence: "per month",
    description: "For anyone checking wallets regularly.",
    features: ["Everything in One-off", "Unlimited full investigations", "Saved search history", "Priority support"],
    cta: "Coming soon",
  },
];

// Payment isn't wired up yet - entitlement tracking and billing are a
// separate, paused project (blocked on the Stripe-vs-Merchant-of-Record /
// VAT decision). This page shows the real, decided tiers as content only;
// the paid CTAs are disabled rather than linking to a checkout that doesn't
// exist, so this never overclaims what's actually live.
export function Pricing() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold text-ink-50 sm:text-4xl">Simple, honest pricing</h1>
        <p className="mt-3 text-base text-ink-200">
          Start free. Pay only if you want the full investigation.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 sm:mt-12 sm:grid-cols-3">
        {TIERS.map((tier) => (
          <div
            key={tier.name}
            className={`flex flex-col rounded-2xl border p-6 ${
              tier.highlighted
                ? "border-signal-green bg-signal-green/5"
                : "border-ink-800 bg-ink-900/40"
            }`}
          >
            <h2 className="text-lg font-semibold text-ink-50">{tier.name}</h2>
            <p className="mt-1 text-sm text-ink-400">{tier.description}</p>

            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-ink-50">{tier.price}</span>
              {tier.cadence && <span className="text-sm text-ink-400">{tier.cadence}</span>}
            </div>

            <ul className="mt-5 flex-1 space-y-2.5">
              {tier.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-ink-100">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-signal-green" />
                  {feature}
                </li>
              ))}
            </ul>

            {tier.name === "Free" ? (
              <Button asChild className="mt-6 w-full">
                <Link to="/check">{tier.cta}</Link>
              </Button>
            ) : (
              <Button variant="secondary" disabled className="mt-6 w-full">
                {tier.cta}
              </Button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
