import { TokenPrice, TokenPriceProvider } from "./types";

// XRP has no on-chain price oracle the way Solana has Jupiter - XRPScan
// doesn't expose a price endpoint either (confirmed: its documented
// endpoints cover account/transaction/NFT/token data only, not pricing).
// CoinGecko's keyless public endpoint is used instead, the same shape of
// off-chain price source Bitcoin already uses (Blockchair's own market-
// price endpoint) - just a different provider, since Blockchair's isn't
// XRP-aware. Live-confirmed working with NO API key:
// https://api.coingecko.com/api/v3/simple/price?ids=ripple&vs_currencies=usd
// returned a real, current price (not a stub/error). CoinGecko's own
// documentation is explicit that the fully keyless tier is rate-limited
// (~5-30 calls/min, dynamic) and "not suitable for production... scheduled
// polling" - acceptable here since this is called at most once per
// investigation (same call pattern as Bitcoin's own price fetch), not
// polled. If this proves unreliable under real investigation volume, the
// documented fallback is CoinGecko's free "Demo" API plan (requires a
// free-signup API key, 100 calls/min / 10,000 calls/month) - not
// implemented here since it needs a human to create that key, flagged
// for a follow-up if the keyless tier turns out to be the bottleneck.
//
// CoinGecko's coin ID for XRP is "ripple", not "xrp" - live-confirmed
// (querying ids=xrp returns an empty object, not an error, which would
// have been a silent-zero-price bug if assumed instead of tested).
const COINGECKO_XRP_PRICE_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=ripple&vs_currencies=usd";

const COINGECKO_TIMEOUT_MS = 10_000;

async function getXrpMarketPriceUsd(): Promise<number | null> {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(
    () => controller.abort(),
    COINGECKO_TIMEOUT_MS,
  );

  try {
    const response = await fetch(COINGECKO_XRP_PRICE_URL, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(
        `CoinGecko request failed with status ${response.status}`,
      );
    }

    const body = (await response.json()) as {
      ripple?: { usd?: number };
    };

    return typeof body.ripple?.usd === "number" ? body.ripple.usd : null;
  } finally {
    clearTimeout(timeoutHandle);
  }
}

// XRP has no native fungible-token standard the way ERC-20/SPL do - see
// portfolio.ts's existing bitcoin carve-out for the same situation, though
// XRP's trust-line/issued-currency mechanism (not yet wired into the
// pipeline as of this provider - see the staged XRP build plan) will need
// its own price lookups once PR 5 adds it. This provider only answers the
// native-XRP price ID for now, same scope as bitcoinTokenPriceProvider.
export class RippleTokenPriceProvider implements TokenPriceProvider {
  readonly chainId = "xrp";
  readonly providerName = "CoinGecko";

  async getTokenPrices(
    tokenIds: string[],
  ): Promise<Record<string, TokenPrice>> {
    const uniqueTokenIds = Array.from(
      new Set(tokenIds.map((tokenId) => tokenId.trim()).filter(Boolean)),
    );

    if (uniqueTokenIds.length === 0) {
      return {};
    }

    let priceUsd: number | null;

    try {
      priceUsd = await getXrpMarketPriceUsd();
    } catch {
      priceUsd = null;
    }

    return uniqueTokenIds.reduce<Record<string, TokenPrice>>(
      (prices, tokenId) => {
        prices[tokenId] = {
          tokenId,
          priceUsd,
          source: priceUsd !== null ? "coingecko" : "unknown",
        };

        return prices;
      },
      {},
    );
  }
}

export const rippleTokenPriceProvider = new RippleTokenPriceProvider();
