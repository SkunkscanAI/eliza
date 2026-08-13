import { Link } from "react-router-dom";

const FAQ_ITEMS = [
  {
    question: "Why does my clean wallet show a warning?",
    answer:
      "A warning isn't always about risk - most warnings are us disclosing a real limitation in what we could check, not a red flag about the wallet itself. For example, if a wallet's full token history couldn't be retrieved in time, we say so explicitly rather than silently treating it as \"holds nothing else.\" On Solana specifically, spam and airdrop transactions aren't filtered out yet, so a wallet's activity sample may look busier than its real usage. Read the specific warning text - it will tell you exactly what couldn't be checked, not that something is wrong.",
  },
  {
    question: "Why isn't my chain's data as complete as another chain's?",
    answer:
      "Chain coverage genuinely differs, and some of that is permanent, not a bug we're planning to fix. Bitcoin has no native fungible-token standard, so \"token diversity\" isn't a real signal there the way it is on Ethereum. Bitcoin's known-infrastructure detection is also narrower by necessity - exchanges publish their own reserve addresses, but never their per-user deposit addresses, so we can only ever recognize the reserve wallets, not every exchange-linked address. See How It Works for the full, honest breakdown per chain.",
  },
  {
    question: "Does a green result mean the wallet is 100% safe?",
    answer:
      "No. A green result means we didn't find evidence of risk in what we were able to check - it's not a guarantee, and it doesn't cover assets or activity outside what's visible on-chain (funds on an exchange, a different wallet, etc.). Treat it as one real, evidence-based input, not a final verdict.",
  },
  {
    question: "Does checking a wallet cost anything?",
    answer:
      "The Trust Check (green/yellow/red plus the reasons why) is free, with no account required. We never ask you to connect a wallet - you're only ever pasting a public address. Deeper investigation tiers are paid; see Pricing.",
  },
  {
    question: "Do you store the addresses I check?",
    answer:
      "We're not going to overstate this with a promise we haven't built the infrastructure to back up yet - see How It Works and About for how seriously we take not overclaiming. If you have a specific privacy question, contact us directly and we'll give you a real answer rather than a boilerplate one.",
  },
  {
    question: "Which chains do you support?",
    answer: "Ethereum, Solana, Base, BNB Chain, and Bitcoin today.",
  },
];

export function Faq() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold text-ink-50 sm:text-4xl">Frequently asked questions</h1>

      <div className="mt-10 space-y-8">
        {FAQ_ITEMS.map((item) => (
          <div key={item.question} className="border-b border-ink-800 pb-8 last:border-b-0">
            <h2 className="text-lg font-semibold text-ink-50">{item.question}</h2>
            <p className="mt-2 text-sm text-ink-200 sm:text-base">{item.answer}</p>
          </div>
        ))}
      </div>

      <p className="mt-10 text-sm text-ink-400">
        Question not answered here?{" "}
        <Link to="/contact" className="text-signal-green hover:text-signal-green-dark">
          Contact us
        </Link>
        .
      </p>
    </section>
  );
}
