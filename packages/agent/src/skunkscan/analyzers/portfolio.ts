import { getTokenMetadata } from "../providers/tokenMetadata";
import { WRAPPED_NATIVE_ASSET_ID } from "../providers/priceProvider";
import { TokenPrice } from "../providers/pricing/types";
import {
  SupportedChain,
  WalletBalance,
  WalletPortfolioSummary,
  WalletPortfolioToken,
  WalletTokenHolding,
} from "../types";

// Live-verified current network parameters (queried directly from a real
// rippled/clio server's server_state, not assumed from older
// documentation - the commonly-cited "10 XRP base reserve" figure is
// stale; reserves were reduced by a later amendment). These are network-
// governance parameters, not permanently fixed constants - XRPL fee
// voting can change them again, the same way it already has once. If a
// future investigation ever shows real accounts behaving as though these
// are wrong, re-verify live against a real server_state call rather than
// assuming these are still current.
const XRP_BASE_RESERVE = 1;
const XRP_OWNER_RESERVE_PER_ITEM = 0.2;

export function analyzeWalletPortfolio(
  nativeBalance: WalletBalance,
  tokenHoldings: WalletTokenHolding[],
  tokenPrices: Record<string, TokenPrice> = {},
  chain: SupportedChain,
  tokenHoldingsIncomplete = false,
  // XRP-specific: the account's OwnerCount (trust lines, offers, etc.),
  // needed to compute the real owner reserve. Optional and unused by every
  // other chain - undefined there, not 0, so a chain without this concept
  // can't be mistaken for "has a reserve of exactly the base amount."
  xrpOwnerCount?: number,
): WalletPortfolioSummary {
  const wrappedNativeAssetId = WRAPPED_NATIVE_ASSET_ID[chain];

  const nativePriceUsd = wrappedNativeAssetId
    ? tokenPrices[wrappedNativeAssetId]?.priceUsd ?? null
    : null;

  const nativeEstimatedUsdValue =
    nativePriceUsd !== null
      ? Number((nativeBalance.nativeAmount * nativePriceUsd).toFixed(2))
      : null;

  const topTokenHoldings: WalletPortfolioToken[] = tokenHoldings
    .map((token) => {
      const metadata = getTokenMetadata(chain, token.tokenId);
      const price = tokenPrices[token.tokenId]?.priceUsd ?? null;

      return {
        tokenId: token.tokenId,
        amount: token.amount,
        decimals: token.decimals,
        rawAmount: token.rawAmount,
        symbol: metadata?.symbol ?? null,
        name: metadata?.name ?? null,
        estimatedUsdValue:
          price !== null ? Number((token.amount * price).toFixed(2)) : null,
      };
    })
    .sort((a, b) => {
      const aValue = a.estimatedUsdValue ?? 0;
      const bValue = b.estimatedUsdValue ?? 0;

      if (bValue !== aValue) {
        return bValue - aValue;
      }

      return b.amount - a.amount;
    })
    .slice(0, 10);

  const tokenEstimatedUsdValue = tokenHoldings.reduce((total, token) => {
    const price = tokenPrices[token.tokenId]?.priceUsd ?? null;

    if (price === null) {
      return total;
    }

    return total + token.amount * price;
  }, 0);

  const estimatedTotalUsdValue =
    tokenEstimatedUsdValue + (nativeEstimatedUsdValue ?? 0);

  const hasAnyUsdPrice =
    nativeEstimatedUsdValue !== null ||
    tokenHoldings.some(
      (token) => tokenPrices[token.tokenId]?.priceUsd !== null,
    );

  const largestHoldingValue =
    topTokenHoldings.length > 0
      ? topTokenHoldings[0].estimatedUsdValue
      : null;

  const largestHoldingPercentage =
    hasAnyUsdPrice &&
    largestHoldingValue !== null &&
    estimatedTotalUsdValue > 0
      ? Number(((largestHoldingValue / estimatedTotalUsdValue) * 100).toFixed(2))
      : null;

  const concentrationLevel =
    tokenHoldings.length === 0
      ? "none"
      : largestHoldingPercentage !== null && largestHoldingPercentage >= 80
        ? "high"
        : largestHoldingPercentage !== null && largestHoldingPercentage >= 50
          ? "medium"
          : "low";

  const diversityScore =
    tokenHoldings.length === 0
      ? 0
      : tokenHoldings.length >= 10
        ? 90
        : tokenHoldings.length >= 5
          ? 65
          : tokenHoldings.length >= 2
            ? 35
            : 15;

  const diversityLevel =
    tokenHoldings.length === 0
      ? "none"
      : diversityScore >= 80
        ? "high"
        : diversityScore >= 50
          ? "medium"
          : "low";

  // Bitcoin has no native fungible-token standard - getTokenBalances()
  // always returns an empty list there (chains/bitcoin.ts), so
  // diversityScore/diversityLevel would always compute "none" regardless of
  // actual wallet behavior. See diversityApplicable's doc comment in types.ts.
  const diversityApplicable = chain !== "bitcoin";

  const nativeSymbol = nativeBalance.nativeSymbol;

  // XRP-specific: nativeBalance.nativeAmount is the wallet's TRUE total
  // balance (unchanged - still the wallet's real net worth), but part of
  // it is a network-enforced minimum the account can never actually spend
  // or send. Only computed when the caller supplied a real OwnerCount -
  // undefined (not chain === "xrp" alone) is the gate, so a chain that
  // adds a similar reserve concept later doesn't need a second special
  // case here, and XRP itself degrades to "not computed" rather than a
  // false "reserve is exactly 1 XRP" if OwnerCount is ever unavailable.
  const reserveRequirementNative =
    typeof xrpOwnerCount === "number" && Number.isFinite(xrpOwnerCount)
      ? Number(
          (
            XRP_BASE_RESERVE +
            xrpOwnerCount * XRP_OWNER_RESERVE_PER_ITEM
          ).toFixed(6),
        )
      : null;

  const spendableNativeAmount =
    reserveRequirementNative !== null
      ? Number(
          Math.max(
            0,
            nativeBalance.nativeAmount - reserveRequirementNative,
          ).toFixed(6),
        )
      : null;

  const notes = tokenHoldingsIncomplete
    ? [
        "Token holdings could not be fully retrieved for this wallet (the fetch was truncated or timed out) - tokenCount, diversityLevel, and estimatedTotalUsdValue below reflect only the partial data retrieved, not the wallet's true holdings. This is not the same as a wallet that genuinely holds no other tokens.",
      ]
    : tokenHoldings.length === 0
      ? nativeEstimatedUsdValue !== null
        ? [
            "No other token holdings were found for this wallet.",
            `Portfolio valuation reflects the native ${nativeSymbol} balance only.`,
          ]
        : [
            "No other token holdings were found for this wallet.",
            `The native ${nativeSymbol} balance could not be priced.`,
          ]
      : hasAnyUsdPrice
        ? [
            `Portfolio valuation is estimated using available token and native ${nativeSymbol} prices.`,
            "Some tokens may not have available USD pricing.",
          ]
        : [
            `No token or native ${nativeSymbol} USD prices were available for this wallet yet.`,
            "Portfolio concentration is estimated without USD valuation.",
          ];

  if (reserveRequirementNative !== null && spendableNativeAmount !== null) {
    notes.push(
      `${reserveRequirementNative} ${nativeSymbol} of the ${nativeBalance.nativeAmount} ${nativeSymbol} total balance is reserved by the XRP Ledger (a non-spendable minimum) - ${spendableNativeAmount} ${nativeSymbol} is actually spendable.`,
    );
  }

  return {
    nativeBalance: {
      ...nativeBalance,
      estimatedUsdValue: nativeEstimatedUsdValue,
    },
    tokenCount: tokenHoldings.length,
    largestHoldingPercentage,
    diversityScore,
    diversityLevel,
    topTokenHoldings,
    estimatedTotalUsdValue: hasAnyUsdPrice
      ? Number(estimatedTotalUsdValue.toFixed(2))
      : null,
    concentrationLevel,
    dataCompleteness: tokenHoldingsIncomplete ? "incomplete" : "complete",
    diversityApplicable,
    reserveRequirementNative,
    spendableNativeAmount,
    notes,
  };
}
