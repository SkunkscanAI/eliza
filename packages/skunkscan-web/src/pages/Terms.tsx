import { LegalDisclaimerBanner } from "../components/legal/LegalDisclaimerBanner";
import { LegalSection } from "../components/legal/LegalSection";

const LAST_UPDATED = "14 August 2026";

export function Terms() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold text-ink-50 sm:text-4xl">Terms of Service</h1>
      <p className="mt-2 text-sm text-ink-400">Last updated: {LAST_UPDATED}</p>

      <div className="mt-6">
        <LegalDisclaimerBanner />
      </div>

      <div className="mt-8">
        <LegalSection title="1. Acceptance of these terms">
          <p>
            By using SkunkScan (the website, the free Trust Check tool, and any paid
            investigation features), you agree to these terms. If you don't agree, please don't
            use the service.
          </p>
        </LegalSection>

        <LegalSection title="2. What SkunkScan is">
          <p>
            SkunkScan is a wallet risk-check tool. You paste a public wallet address for a
            supported blockchain (currently Ethereum, Solana, Base, BNB Chain, and Bitcoin), and
            SkunkScan analyzes real on-chain data to return a risk summary - a free Trust Check
            (green/yellow/red plus reasons), and a more detailed full investigation report.
          </p>
          <p>
            SkunkScan does not require you to create an account, connect a wallet, or provide any
            personal information to use the free Trust Check or the full report.
          </p>
        </LegalSection>

        <LegalSection title="3. Not financial or legal advice">
          <p>
            SkunkScan provides evidence-based analysis of public blockchain data. It is not
            financial advice, investment advice, or legal advice, and it does not establish the
            identity, intent, or legality of any wallet's owner or activity. A "low risk" result
            is not a guarantee of safety - it means no evidence of risk was found in what
            SkunkScan was able to check. Always use your own judgment before sending funds.
          </p>
        </LegalSection>

        <LegalSection title="4. Accuracy and limitations">
          <p>
            SkunkScan's analysis is only as complete as the data it can retrieve from third-party
            blockchain data providers at the time of the check, and coverage genuinely differs by
            chain and by feature - see{" "}
            <a href="/how-it-works" className="text-signal-green hover:text-signal-green-dark">
              How It Works
            </a>{" "}
            for the specific, real limitations of each supported chain. SkunkScan does not
            guarantee the completeness, accuracy, or timeliness of any result, and results can
            change as on-chain activity changes or as SkunkScan's data providers update their own
            information.
          </p>
        </LegalSection>

        <LegalSection title="5. Free and paid tiers">
          <p>
            The Trust Check (green/yellow/red verdict with reasons) is free, with no account
            required, and is expected to remain free going forward.
          </p>
          <p>
            SkunkScan has published two paid tiers - a one-off full investigation (€4.99 per
            wallet) and a monthly subscription (€19.99/month) - describing what they will include.
            As of this update, <strong>live payment processing is not yet implemented</strong>;
            no payment is currently being collected for these tiers. This section will be updated
            with real terms (billing, refunds, cancellation) once payment goes live.
          </p>
        </LegalSection>

        <LegalSection title="6. Acceptable use">
          <p>
            Don't use SkunkScan to attempt to overwhelm, disrupt, or reverse-engineer the service,
            or to violate any applicable law. SkunkScan may restrict or suspend access for abuse.
          </p>
        </LegalSection>

        <LegalSection title="7. Third-party data providers">
          <p>
            SkunkScan's backend retrieves on-chain data from third-party blockchain data
            providers to produce its results: Helius (Solana), Moralis (Ethereum, Base, and BNB
            Chain), Blockchair (Bitcoin), and Jupiter (Solana token pricing). Only the wallet
            address you submit is sent to these providers, from SkunkScan's server - your browser
            never contacts them directly. SkunkScan does not control these providers' own
            accuracy, uptime, or data practices.
          </p>
        </LegalSection>

        <LegalSection title="8. Intellectual property">
          <p>
            The SkunkScan name, branding, and the site's content (excluding the underlying public
            blockchain data itself, which SkunkScan doesn't own) belong to the SkunkScan team.
          </p>
        </LegalSection>

        <LegalSection title="9. Disclaimers and limitation of liability" needsReview>
          <p>
            SkunkScan is provided "as is" and "as available," without warranties of any kind,
            express or implied. To the fullest extent permitted by law, SkunkScan and its team
            will not be liable for any indirect, incidental, or consequential damages, or for any
            loss of funds, arising from use of or reliance on the service.
          </p>
          <p className="text-ink-400">
            This is conservative, standard placeholder language, not a lawyer-reviewed liability
            clause. It needs real legal review before being treated as final and binding -
            particularly once real payment exists, since payment changes the legal relationship
            with users.
          </p>
        </LegalSection>

        <LegalSection title="10. Governing law and disputes" needsReview>
          <p className="text-ink-400">
            No governing law or dispute-resolution jurisdiction has been chosen yet - that
            decision depends on where the SkunkScan entity ends up being formally registered,
            which hasn't happened yet. This section is a placeholder until that decision is made
            and reviewed by a lawyer.
          </p>
        </LegalSection>

        <LegalSection title="11. Changes to these terms">
          <p>
            SkunkScan may update these terms as the product changes (for example, once payment
            and accounts go live). Material changes will be reflected by updating the "Last
            updated" date above.
          </p>
        </LegalSection>

        <LegalSection title="12. Contact">
          <p>
            Questions about these terms:{" "}
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
