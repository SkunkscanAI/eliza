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

// Ordered by real-world popularity/market-cap ranking (Bitcoin, Ethereum,
// BNB, XRP, Solana, Base) - the Ethereum/BNB/Base entry stays merged since
// their coverage is genuinely identical (same connector), positioned at
// Ethereum's rank rather than split into three duplicate cards.
const CHAIN_COVERAGE = [
  {
    chain: "Bitcoin",
    notes: [
      "Full balance and transaction history, including HD wallets (xpub/ypub/zpub) via address-derivation scanning.",
      "Known-infrastructure detection is deliberately narrower here: it covers a small number of independently-verified exchange reserve wallets only (currently Binance and Bitfinex). It structurally cannot cover exchanges' per-user deposit addresses, since those are unique per customer and never published - an unrecognized exchange deposit will show as an unknown counterparty, not as known infrastructure.",
      "Bitcoin has no native fungible-token standard, so \"token diversity\" isn't a meaningful signal here and is excluded from scoring rather than counted against a wallet.",
      "For HD wallets, address coverage is whatever the gap-limit scan found - addresses outside that scan window aren't included.",
    ],
  },
  {
    chain: "Ethereum, BNB Chain, Base",
    notes: [
      "Full token holdings, transaction history, and known-infrastructure detection (exchanges, DEX routers, bridges).",
      "Known spam/airdrop NFT patterns are filtered out of the activity sample.",
    ],
  },
  {
    chain: "XRP Ledger",
    notes: [
      "Full balance, trust-line (issued-currency) holdings, and transaction history.",
      "Balance interpretation accounts for the XRP Ledger's own reserve requirement (a portion of your balance that's non-spendable by protocol rule) - what's shown as spendable already has that reserve subtracted, not left for you to work out.",
      "Known-infrastructure detection is deliberately narrow here: it covers a single independently-verified exchange's hot and cold wallets only (currently Bitfinex). Most exchanges route deposits through one shared address disambiguated by a destination tag, which we don't yet check - a deposit to a known exchange address under a different tag than expected won't be flagged as such.",
      "Trust-line balances are only counted as holdings when they're genuinely positive; a trust line can also read zero or negative depending on which side of it your account is on, and neither of those is an asset you actually hold.",
    ],
  },
  {
    chain: "Solana",
    notes: [
      "Full token holdings and transaction history.",
      "No spam-NFT filter yet - this isn't an oversight. Two candidate filters were tested against real spam and real legitimate wallets, and both produced false positives on genuine NFTs, so nothing was shipped rather than risk hiding real activity. Your activity sample may include spam/airdrop transactions as a result.",
    ],
  },
];

const HONEST_LIMITS = [
  "Sample size: relationship and funding analysis is based on a wallet's most recent transactions, not its entire history - a deliberate cost/coverage tradeoff, not a silent gap. A real counterparty or funding event further back than that window won't be reflected yet.",
  "Compliance screening: we check known scam wallets, rug pulls, and suspicious wallets against our own internal registry, plus sanctions screening against the US Treasury's OFAC list (self-hosted, refreshed roughly every 12 hours). EU, UK, and UN sanctions lists aren't connected yet - EU and UK do designate some crypto addresses, but not in a free, reliably structured form we could self-host the way OFAC's is; UN doesn't appear to publish crypto addresses at all. Adverse-media screening from an external provider remains planned for a future release. We say this exactly, not in a way that implies broader coverage than we actually have.",
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
