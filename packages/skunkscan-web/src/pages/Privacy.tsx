import { LegalDisclaimerBanner } from "../components/legal/LegalDisclaimerBanner";
import { LegalSection } from "../components/legal/LegalSection";

const LAST_UPDATED = "14 August 2026";

export function Privacy() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold text-ink-50 sm:text-4xl">Privacy Policy</h1>
      <p className="mt-2 text-sm text-ink-400">Last updated: {LAST_UPDATED}</p>

      <div className="mt-6">
        <LegalDisclaimerBanner />
      </div>

      <div className="mt-8">
        <LegalSection title="1. What data SkunkScan processes">
          <p>
            To check a wallet, you submit a public blockchain wallet address. A wallet address is
            public, on-chain data - it's visible to anyone on the relevant blockchain, and by
            itself it isn't the kind of information that traditionally identifies you personally
            (like a name or email). SkunkScan doesn't ask for your name, email, or any account
            information to use the free Trust Check or the full report - you don't need an
            account.
          </p>
          <p>
            <strong>A real nuance worth knowing:</strong> if a wallet address is publicly or
            privately linked to a real person elsewhere (for example, an exchange KYC record, a
            public social media post, or your own future SkunkScan account), it could become
            identifying in that context. SkunkScan doesn't perform or have access to that kind of
            linking itself, but the underlying address data isn't inherently anonymous forever -
            just not directly identifying on its own, the way it's used here.
          </p>
        </LegalSection>

        <LegalSection title="2. What SkunkScan does not currently collect or store">
          <p>
            As of this update, SkunkScan does not use cookies, browser storage, or any
            analytics/tracking scripts on this website - this was verified directly against the
            site's own code, not assumed. There are no user accounts yet, so there is nothing tied
            to "your" identity to store in the first place. Wallet checks are not saved anywhere
            server-side once a result is returned to you - each check is processed fresh,
            on-demand, and nothing about the search (which address, which chain, when) is written
            to a database.
          </p>
        </LegalSection>

        <LegalSection title="3. How your wallet address is used">
          <p>
            When you submit an address, SkunkScan's server fetches real on-chain data about that
            address from third-party blockchain data providers (see below), runs it through
            SkunkScan's analysis, and returns the result to you. That's the entire flow - the
            address isn't used for anything else, and your browser never sends the address
            directly to those third-party providers; only SkunkScan's own server does.
          </p>
        </LegalSection>

        <LegalSection title="4. Third-party data providers">
          <p>SkunkScan's backend calls these providers, sending only the wallet address being checked (CoinGecko is the one exception - noted below):</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Helius</strong> - Solana on-chain data
            </li>
            <li>
              <strong>Moralis</strong> - Ethereum, Base, and BNB Chain on-chain data
            </li>
            <li>
              <strong>Blockchair</strong> - Bitcoin on-chain data
            </li>
            <li>
              <strong>XRPScan</strong> - XRP Ledger on-chain data
            </li>
            <li>
              <strong>Jupiter</strong> - Solana token pricing
            </li>
            <li>
              <strong>CoinGecko</strong> - XRP price data (queried only for XRP's own market
              price - your wallet address is never sent to CoinGecko)
            </li>
          </ul>
          <p>
            These providers have their own privacy practices and may process data in their own
            infrastructure/jurisdictions, which SkunkScan doesn't control. SkunkScan only sends
            the wallet address - never your IP address, browser information, or any other data
            about you as the person making the request.
          </p>
        </LegalSection>

        <LegalSection title="5. Standard server/hosting logs" needsReview>
          <p className="text-ink-400">
            Like essentially any website, SkunkScan's hosting infrastructure (Railway) may
            briefly capture standard technical request data (such as IP address and timestamp) as
            part of normal server operation - this is a standard hosting-level behavior, not
            something SkunkScan's own application code specifically collects, stores, or uses.
            The exact retention period for this infrastructure-level logging hasn't been
            precisely confirmed and reviewed yet - flagging honestly rather than asserting an
            exact number.
          </p>
        </LegalSection>

        <LegalSection title="6. Your rights (GDPR and similar)" needsReview>
          <p className="text-ink-400">
            Since SkunkScan doesn't currently collect or store personal data tied to an
            identifiable person, there generally isn't personal data of yours held to access,
            correct, or delete today. Once accounts, saved searches, or payment exist, this
            section needs to be rewritten with real GDPR-compliant rights language (access,
            rectification, erasure, portability, a named data controller, and a real complaints
            process) and reviewed by a lawyer before being treated as final.
          </p>
        </LegalSection>

        <LegalSection title="7. Children's privacy">
          <p>
            SkunkScan is not directed at children, and doesn't knowingly collect data from
            children.
          </p>
        </LegalSection>

        <LegalSection title="8. Changes to this policy">
          <p>
            This policy will be updated as SkunkScan's product changes - especially once accounts,
            saved searches, or payment go live, all of which will genuinely change what data
            exists. Material changes will be reflected by updating the "Last updated" date above.
          </p>
        </LegalSection>

        <LegalSection title="9. Contact">
          <p>
            Questions about this policy:{" "}
            <a
              href="mailto:support@skunkscan.ai"
              className="text-signal-green hover:text-signal-green-dark"
            >
              support@skunkscan.ai
            </a>
            .
          </p>
        </LegalSection>
      </div>
    </section>
  );
}
