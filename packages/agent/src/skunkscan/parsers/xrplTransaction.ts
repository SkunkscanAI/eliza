import { XrpscanAccountInfo, XrpscanTransaction } from "../xrpscan";
import { ParsedWalletTransaction } from "./transaction";

// Built now (PR 2 of the staged XRP build) but not yet wired into
// funding.ts/relationships.ts - those are PR 3. Mirrors
// parseEthereumTransaction()'s role: a thin reshape of an already-decoded
// source (XRPScan's transaction objects, live-confirmed rich enough to
// need no further decoding - see xrpscan.ts's header comment) into the
// chain-neutral ParsedWalletTransaction shape.
//
// Only a "tesSUCCESS" Payment produces a transfer - a failed transaction
// moved no real funds (unlike Bitcoin/EVM, XRPL has no "confirmed but
// reverted" concept to represent either way; a failed transaction is
// simply not a transfer), and only Payment transactions represent value
// movement at all (TrustSet, OfferCreate, AccountSet, etc. are real XRPL
// transaction types but don't move a balance the way this shape expects -
// out of scope here, not silently misrepresented as a $0 payment).
//
// meta.delivered_amount (not the top-level Amount/DeliverMax fields) is
// used as the authoritative transferred amount - XRPL's own documented
// way of expressing "what actually arrived," which can differ from the
// requested Amount on a partial payment. Falls back to Amount only when
// delivered_amount is absent, rather than throwing, since older/edge-case
// transactions may not carry it.
function isXrpCurrency(currency: string | undefined): boolean {
  return currency === "XRP";
}

// XRPL tokens (trust-line/issued-currency balances) have no single-address
// identifier the way an ERC-20 contract or SPL mint does - a currency code
// is only unique per-issuer (e.g. two different issuers can both issue a
// currency code "USD"). This composite key is this codebase's own
// synthetic ID for that pair, not something XRPL itself exposes - callers
// (portfolio.ts, exposure.ts, etc.) must treat it as an opaque tokenId,
// same as any other chain's tokenId, not attempt to parse it back apart.
export function buildXrplTokenId(currency: string, issuer: string): string {
  return `${currency}:${issuer}`;
}

export function parseXrplTransaction(
  transaction: XrpscanTransaction | null | undefined,
): ParsedWalletTransaction {
  const nativeTransfers: ParsedWalletTransaction["nativeTransfers"] = [];
  const tokenTransfers: ParsedWalletTransaction["tokenTransfers"] = [];

  const succeeded = transaction?.meta?.TransactionResult === "tesSUCCESS";

  if (
    succeeded &&
    transaction?.TransactionType === "Payment" &&
    transaction.Destination
  ) {
    const delivered =
      transaction.meta?.delivered_amount ??
      transaction.Amount ??
      transaction.DeliverMax;

    if (delivered) {
      const numericValue = Number(delivered.value);

      if (Number.isFinite(numericValue)) {
        if (isXrpCurrency(delivered.currency)) {
          nativeTransfers.push({
            from: transaction.Account ?? null,
            to: transaction.Destination,
            amountNative: numericValue,
          });
        } else if (delivered.issuer) {
          tokenTransfers.push({
            from: transaction.Account ?? null,
            to: transaction.Destination,
            contractAddress: buildXrplTokenId(
              delivered.currency,
              delivered.issuer,
            ),
            amount: numericValue,
          });
        }
      }
    }
  }

  return {
    signature: transaction?.hash ?? null,
    timestamp: transaction?.date
      ? Math.floor(Date.parse(transaction.date) / 1000)
      : null,
    nativeTransfers,
    tokenTransfers,
    // XRPL has no general-purpose smart-contract/program concept the way
    // EVM/Solana do (Payment/TrustSet/OfferCreate/etc. are protocol-level
    // transaction types, not calls into arbitrary deployed code) - empty
    // for every transaction, same as Bitcoin's parser.
    programOrContractIds: [],
  };
}

// XRPL treats account activation as a first-class, permanently-recorded
// event (see xrpscan.ts's XrpscanAccountInfo doc comment) - unlike
// Bitcoin/Ethereum, no transaction-history scan is needed to answer
// funding.ts's question. Builds the same ParsedWalletTransaction shape a
// real scanned "first transaction" would produce, from the account-info
// fields directly, so funding.ts (which only knows how to read that
// shape) needs no XRP-specific branch of its own. Returns null when the
// activation record is absent (see the field's own doc comment) -
// funding.ts already treats a null firstTransaction as "funding unknown,"
// the same fallback every other chain uses for the same situation.
export function buildXrplActivationTransaction(
  accountInfo: XrpscanAccountInfo,
): ParsedWalletTransaction | null {
  if (
    !accountInfo.parent ||
    typeof accountInfo.initial_balance !== "number" ||
    !Number.isFinite(accountInfo.initial_balance)
  ) {
    return null;
  }

  return {
    signature: accountInfo.tx_hash ?? null,
    timestamp: accountInfo.inception
      ? Math.floor(Date.parse(accountInfo.inception) / 1000)
      : null,
    nativeTransfers: [
      {
        from: accountInfo.parent,
        to: accountInfo.Account,
        amountNative: accountInfo.initial_balance,
      },
    ],
    tokenTransfers: [],
    programOrContractIds: [],
  };
}
