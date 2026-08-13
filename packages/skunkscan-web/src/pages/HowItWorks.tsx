import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";

const PIPELINE_STEPS = [
  {
    title: "We pull real on-chain data",
    body: "Balances, token holdings, and recent transaction history, fetched directly from each chain's own data provider - not a static list, not a guess.",
  },
  {
    title: "We run it through a real analysis pipeline",
    body: "Risk, trust, exposure, funding source, relationships, whale characteristics, and more - each one a separate, evidence-based check, not a single black-box score.",
  },
  {
    title: "We give you a straight answer, with reasons",
    body: "Green, yellow, or red, plus the specific evidence behind it. If something couldn't be checked, we say so - a missing signal isn't hidden as a clean result.",
  },
];

const CHAIN_COVERAGE = [
  {
    chain: "Ethereum, Base, BNB Chain",
    notes: [
      "Full token holdings, transaction history, and known-infrastructure detection (exchanges, DEX routers, bridges).",
      "Known spam/airdrop NFT patterns are filtered out of the activity sample.",
    ],
  },
  {
    chain: "Solana",
    notes: [
      "Full token holdings and transaction history.",
      "No spam-NFT filter yet - this isn't an oversight. Two candidate filters were tested against real spam and real legitimate wallets, and both produced false positives on genuine NFTs, so nothing was shipped rather than risk hiding real activity. Your activity sample may include spam/airdrop transactions as a result.",
    ],
  },
  {
    chain: "Bitcoin",
    notes: [
      "Full balance and transaction history, including HD wallets (xpub/ypub/zpub) via address-derivation scanning.",
      "Known-infrastructure detection is deliberately narrower here: it covers a small number of independently-verified exchange reserve wallets only (currently Binance and Bitfinex). It structurally cannot cover exchanges' per-user deposit addresses, since those are unique per customer and never published - an unrecognized exchange deposit will show as an unknown counterparty, not as known infrastructure.",
      "Bitcoin has no native fungible-token standard, so \"token diversity\" isn't a meaningful signal here and is excluded from scoring rather than counted against a wallet.",
      "For HD wallets, address coverage is whatever the gap-limit scan found - addresses outside that scan window aren't included.",
    ],
  },
];

const HONEST_LIMITS = [
  "Sample size: relationship and funding analysis is based on a wallet's most recent transactions, not its entire history - a deliberate cost/coverage tradeoff, not a silent gap. A real counterparty or funding event further back than that window won't be reflected yet.",
  "Compliance screening: our internal registry (known scam, rug-pull, and suspicious wallets) is connected today. Sanctions and adverse-media screening from external providers is planned, not yet connected - we mark that honestly rather than implying broader coverage than we have.",
  "Incomplete data is never silently treated as \"clean\": if a token-holdings fetch is truncated or times out, we say so explicitly rather than scoring a wallet as if it genuinely holds nothing else.",
];

export function HowItWorks() {
  return (
    <div>
      <section className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6 sm:py-16">
        <h1 className="text-3xl font-bold text-ink-50 sm:text-4xl">How SkunkScan works</h1>
        <p className="mt-4 text-base text-ink-200 sm:text-lg">
          No guessing. Every result is built from real on-chain evidence, and we tell you
          exactly what that evidence is - and isn't.
        </p>
      </section>

      <section className="border-t border-ink-800 bg-ink-900/40">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8">
            {PIPELINE_STEPS.map((step, index) => (
              <div key={step.title} className="rounded-xl border border-ink-800 p-5">
                <span className="text-sm font-semibold text-signal-green">Step {index + 1}</span>
                <h2 className="mt-2 text-lg font-semibold text-ink-50">{step.title}</h2>
                <p className="mt-1 text-sm text-ink-200">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <h2 className="text-2xl font-semibold text-ink-50 sm:text-3xl">
          What each chain actually covers
        </h2>
        <p className="mt-3 text-sm text-ink-200 sm:text-base">
          Coverage genuinely differs by chain - some of that is a permanent, structural
          difference between blockchains, not something we plan to "fix." We'd rather tell you
          exactly where the edges are than let a chain's result imply more certainty than we
          actually have.
        </p>

        <div className="mt-8 space-y-6">
          {CHAIN_COVERAGE.map((entry) => (
            <div key={entry.chain} className="rounded-xl border border-ink-800 p-5 sm:p-6">
              <h3 className="text-lg font-semibold text-ink-50">{entry.chain}</h3>
              <ul className="mt-3 space-y-2">
                {entry.notes.map((note) => (
                  <li key={note} className="text-sm text-ink-200">
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-ink-800 bg-ink-900/40">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <h2 className="text-2xl font-semibold text-ink-50 sm:text-3xl">
            Limitations we disclose on purpose
          </h2>
          <ul className="mt-6 space-y-4">
            {HONEST_LIMITS.map((item) => (
              <li key={item} className="flex gap-3 text-sm text-ink-200 sm:text-base">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-signal-green" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-2xl px-4 py-12 text-center sm:px-6 sm:py-16">
        <h2 className="text-xl font-semibold text-ink-50 sm:text-2xl">
          See it work on a real wallet
        </h2>
        <Button asChild size="lg" className="mt-6">
          <Link to="/check">Check a wallet for free</Link>
        </Button>
      </section>
    </div>
  );
}
