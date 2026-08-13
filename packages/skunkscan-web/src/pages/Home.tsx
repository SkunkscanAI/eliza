import { Link } from "react-router-dom";
import { TrustCheckWidget } from "../components/TrustCheckWidget";
import { ArrowRight, ShieldCheck } from "../components/ui/icons";

const STEPS = [
  {
    title: "Paste the address",
    body: "Any wallet on Solana, Ethereum, Base, BNB Chain, or Bitcoin.",
  },
  {
    title: "We check it in seconds",
    body: "Risk, trust, and exposure signals pulled from real on-chain data — no guessing.",
  },
  {
    title: "You get a straight answer",
    body: "Green, yellow, or red — plus the reasons why, in plain language.",
  },
];

export function Home() {
  return (
    <div>
      <section className="mx-auto max-w-5xl px-4 pt-12 pb-8 sm:px-6 sm:pt-20 sm:pb-12">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-ink-50 sm:text-5xl">
            Skunk it before you send it.
          </h1>
          <p className="mt-4 text-base text-ink-200 sm:text-lg">
            Paste a wallet address and get a free, plain-language risk check before you send
            crypto to it. No account, no wallet connection, no catch.
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-ink-800 bg-ink-900/60 p-4 sm:mt-10 sm:p-8">
          <TrustCheckWidget />
        </div>
      </section>

      <section className="border-t border-ink-800 bg-ink-900/40">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
          <h2 className="text-center text-2xl font-semibold text-ink-50 sm:text-3xl">
            How it works
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:mt-10 sm:grid-cols-3 sm:gap-8">
            {STEPS.map((step, index) => (
              <div key={step.title} className="rounded-xl border border-ink-800 p-5">
                <span className="text-sm font-semibold text-signal-green">
                  Step {index + 1}
                </span>
                <h3 className="mt-2 text-lg font-semibold text-ink-50">{step.title}</h3>
                <p className="mt-1 text-sm text-ink-200">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-ink-800 bg-ink-900/60 p-6 text-center sm:p-10">
          <ShieldCheck className="h-8 w-8 text-signal-green" />
          <h2 className="text-xl font-semibold text-ink-50 sm:text-2xl">
            Want the full picture on a wallet?
          </h2>
          <p className="max-w-md text-sm text-ink-200 sm:text-base">
            The free check above covers the essentials. Deeper investigation tiers are on the
            way.
          </p>
          <Link
            to="/pricing"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-signal-green hover:text-signal-green-dark"
          >
            See pricing
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
