import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { ArrowRight, ChevronDown, ShieldCheck } from "./ui/icons";
import { cn } from "../lib/utils";

// This service is now deployed standalone (its own Railway service, own
// origin - see railway.json), separate from the @elizaos/agent deployment
// that actually serves /api/skunkscan/*. The backend's CORS already allows
// any origin in production (wildcard-bind allowlist in
// server-helpers-auth.ts's resolveCorsOrigin - no server-side change was
// needed for this), but the fetch target itself must be absolute now that
// frontend and backend are different origins. Falls back to the relative
// path when the env var isn't set, so local dev (via vite.config.ts's proxy)
// and any future same-origin deployment keep working unchanged.
const API_BASE_URL = import.meta.env.VITE_SKUNKSCAN_API_BASE_URL ?? "";

// Mirrors SUPPORTED_CHAINS in packages/agent/src/skunkscan/types.ts and the
// WalletTrustCheckCard shape in the same file - kept as a plain local copy
// rather than a cross-package import since this page has no build-time
// dependency on @elizaos/agent (it only talks to it over HTTP).
const SUPPORTED_CHAINS = ["solana", "ethereum", "base", "bnb", "bitcoin"] as const;
type SupportedChain = (typeof SUPPORTED_CHAINS)[number];

const CHAIN_LABEL: Record<SupportedChain, string> = {
  solana: "Solana",
  ethereum: "Ethereum",
  base: "Base",
  bnb: "BNB Chain",
  bitcoin: "Bitcoin",
};

type TrustCheckTier = "green" | "yellow" | "red";

type TrustCheckCard = {
  chain: SupportedChain;
  address: string;
  status: "supported" | "unsupported_chain" | "invalid_address" | "error";
  tier: TrustCheckTier | null;
  headline: string;
  reasons: string[];
  riskDisplay?: string;
  trustDisplay?: string;
  exposureDisplay?: string;
  scopeDisclosure: string;
  warnings: string[];
};

const TIER_STYLE: Record<TrustCheckTier, { label: string; border: string; bg: string; text: string }> = {
  green: {
    label: "Low risk",
    border: "border-signal-green",
    bg: "bg-signal-green/10",
    text: "text-signal-green",
  },
  yellow: {
    label: "Review recommended",
    border: "border-signal-yellow",
    bg: "bg-signal-yellow/10",
    text: "text-signal-yellow",
  },
  red: {
    label: "High risk",
    border: "border-signal-red",
    bg: "bg-signal-red/10",
    text: "text-signal-red",
  },
};

export function TrustCheckWidget({ compact = false }: { compact?: boolean }) {
  const [chain, setChain] = useState<SupportedChain>("ethereum");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [card, setCard] = useState<TrustCheckCard | null>(null);
  const [showWhy, setShowWhy] = useState(true);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = address.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setCard(null);
    setShowWhy(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/skunkscan/trust-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chain, address: trimmed }),
      });
      const body = (await response.json()) as TrustCheckCard;

      if (!response.ok && body.status !== "supported") {
        setError(body.headline || "Could not check this wallet.");
        setCard(body);
        return;
      }

      setCard(body);
    } catch {
      setError("Something went wrong reaching SkunkScan. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 sm:flex-row sm:items-stretch"
      >
        <Select value={chain} onValueChange={(value) => setChain(value as SupportedChain)}>
          <SelectTrigger className="sm:w-40" aria-label="Chain">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SUPPORTED_CHAINS.map((chainOption) => (
              <SelectItem key={chainOption} value={chainOption}>
                {CHAIN_LABEL[chainOption]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder="Paste a wallet address"
          aria-label="Wallet address"
          className="flex-1"
          inputMode="text"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />

        <Button
          type="submit"
          disabled={loading || !address.trim()}
          size={compact ? "default" : "lg"}
          className="w-full sm:w-auto"
        >
          {loading ? "Checking…" : "Check for free"}
        </Button>
      </form>

      {!compact && (
        <>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-400">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            Free, no account needed. We never ask you to connect a wallet.
          </p>
          <p className="mt-1 pl-5 text-xs text-ink-400">
            Read-only analysis · We never request your seed phrase.
          </p>
        </>
      )}

      {error && !card && (
        <p className="mt-4 text-sm text-signal-red" role="alert">
          {error}
        </p>
      )}

      {card && card.tier && (
        <section
          className={`mt-6 rounded-xl border-2 p-5 sm:p-6 ${TIER_STYLE[card.tier].border} ${TIER_STYLE[card.tier].bg}`}
        >
          <p className={`text-sm font-semibold ${TIER_STYLE[card.tier].text}`}>
            {TIER_STYLE[card.tier].label}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-ink-50 sm:text-xl">{card.headline}</h3>

          {/* Shown on every tier, not just red - a green/yellow result is
              only ever "clean against what we checked," never a broader
              guarantee, and that has to be said in the same breath as the
              headline above, not buried in a separate limitations section. */}
          {card.scopeDisclosure && (
            <p className="mt-1 text-xs text-ink-400">{card.scopeDisclosure}</p>
          )}

          {/* Evidence-gated: this only renders at all when there's real
              evidence behind it (reasons is only ever populated for red-tier
              results - see the reasons field's comment in agent's types.ts).
              A clean green/yellow result has nothing to show here, so no
              "Why?" affordance appears for it at all - never a freeform
              explanation standing in for evidence that doesn't exist. */}
          {card.tier === "red" && card.reasons.length > 0 && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setShowWhy((current) => !current)}
                className="flex items-center gap-1.5 text-sm font-semibold text-ink-100 hover:text-ink-50"
                aria-expanded={showWhy}
              >
                Why this result?
                <ChevronDown
                  className={cn("h-4 w-4 transition-transform", showWhy && "rotate-180")}
                />
              </button>
              {showWhy && (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-100">
                  {card.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {(card.riskDisplay || card.trustDisplay || card.exposureDisplay) && (
            <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-1 text-sm text-ink-200 sm:grid-cols-3">
              {card.riskDisplay && (
                <div className="flex justify-between sm:block">
                  <dt className="text-ink-400">Risk</dt>
                  <dd>{card.riskDisplay}</dd>
                </div>
              )}
              {card.trustDisplay && (
                <div className="flex justify-between sm:block">
                  <dt className="text-ink-400">Trust</dt>
                  <dd>{card.trustDisplay}</dd>
                </div>
              )}
              {card.exposureDisplay && (
                <div className="flex justify-between sm:block">
                  <dt className="text-ink-400">Exposure</dt>
                  <dd>{card.exposureDisplay}</dd>
                </div>
              )}
            </dl>
          )}

          {/* Genuinely unlocked right now (no accounts/entitlements exist
              yet - see Milestone 4), so this link is always shown rather
              than hidden behind a paywall that doesn't exist. Once real
              gating lands, this link's destination/language may need to
              change (e.g. to a paywall/signup prompt), but that's a
              follow-up, not something to half-build now. */}
          <Link
            to={`/report/${card.chain}/${encodeURIComponent(card.address)}`}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-signal-green hover:text-signal-green-dark"
          >
            See the full investigation
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      )}
    </div>
  );
}
