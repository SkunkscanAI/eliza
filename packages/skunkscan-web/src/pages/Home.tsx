import { Link } from "react-router-dom";
import { TrustCheckWidget } from "../components/TrustCheckWidget";
import { ArrowRight, Check, ShieldCheck } from "../components/ui/icons";

const TRUST_POINTS = [
  "Read-only analysis - we only ever read public on-chain data, never request access to your wallet.",
  "No seed phrases, ever - there's nothing to connect and nothing to sign.",
  "Evidence-backed findings - every score traces back to real on-chain data we can point to, not a vibe.",
  "Transparent methodology - every report discloses what we checked and what we didn't.",
];

const STEPS = [
  {
    title: "Paste the address",
    body: "Any wallet on Bitcoin, Ethereum, BNB Chain, XRP Ledger, Solana, or Base.",
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
            Skunk it before you trust it.
          </h1>
          <p className="mt-4 text-base text-ink-200 sm:text-lg">
            Paste a wallet address and get a free, plain-language risk check before you send
            crypto to it — or receive it from it. No account, no wallet connection, no catch.
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-ink-800 bg-ink-900/60 p-4 sm:mt-10 sm:p-8">
          <TrustCheckWidget />
        </div>

        <p className="mx-auto mt-4 max-w-2xl text-center text-sm text-ink-400">
          Works with Bitcoin, Ethereum, BNB Chain, XRP Ledger, Solana, and Base wallets.
        </p>
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

          <p className="mt-8 text-center">
            <Link
              to="/how-it-works"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-signal-green hover:text-signal-green-dark"
            >
              See exactly what we check per chain
              <ArrowRight className="h-4 w-4" />
            </Link>
          </p>
        </div>
      </section>

      <section className="border-t border-ink-800 bg-ink-900/40">
        <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
          <h2 className="text-center text-2xl font-semibold text-ink-50 sm:text-3xl">
            Built for verification, not speculation
          </h2>
          <ul className="mt-8 space-y-4">
            {TRUST_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-3 text-sm text-ink-200 sm:text-base">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-signal-green" />
                <span>{point}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8 rounded-lg border border-signal-yellow/40 bg-signal-yellow/10 p-4 text-sm sm:p-5">
            <p className="font-semibold text-signal-yellow">No guarantees</p>
            <p className="mt-1 text-ink-200">
              A low-risk result is not a guarantee of safety - it means no evidence of risk was
              found in what SkunkScan was able to check. Always use your own judgment before
              sending or receiving funds.
            </p>
          </div>

          <p className="mt-6 text-center">
            <Link
              to="/about"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-signal-green hover:text-signal-green-dark"
            >
              Read how we think about trust
              <ArrowRight className="h-4 w-4" />
            </Link>
          </p>
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
