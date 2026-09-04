// XRP Ledger connector. PR 2 of the staged XRP build (see the XRPL
// integration investigation + approved 8-stage plan) - implements the
// standard BlockchainConnector interface using xrpscan.ts (PR 1). Still
// not fully wired into investigateWallet: wallet.ts's new "xrp" branch
// (this same PR) bypasses ALL of getNativeBalance()/getTransactions()/
// getOldestTransaction() in favor of calling xrpscan.ts directly - same
// rationale as chains/ethereum.ts's branch in wallet.ts (richer per-
// transaction data than a generic UniversalTransaction would preserve -
// see xrpscan.ts's header comment on Amount/DestinationTag/
// delivered_amount), plus one XRP-specific efficiency case neither
// Bitcoin nor Ethereum has: XRPScan's account-info response already
// carries both the balance AND the account's real activation timestamp
// (`inception`) in a single call, so going through this connector for
// balance and then bypassing it again for oldest-transaction would mean
// two separate requests to the exact same underlying endpoint. This
// connector's own methods are still fully and correctly implemented
// (registry/health-check/future-caller completeness), just not the path
// wallet.ts's specific orchestration takes.
import {
  ChainAdapterCapabilities,
  UniversalAssetIdentifier,
  UniversalTransaction,
} from "../types";

import {
  getXrplAccountInfo,
  getXrplAccountTransactions,
  XrpscanTransaction,
} from "../xrpscan";

import {
  AddressValidationResult,
  BlockchainConnector,
  BlockchainConnectorDescriptor,
  ChainConnectorHealth,
  ChainOperationResult,
  NativeBalanceResult,
  OldestTransactionResult,
  TokenBalancesResult,
  TransactionLookupResult,
  TransactionPageRequest,
  TransactionPageResult,
} from "./types";

const XRP_CHAIN_ID = "xrp";

// Ceiling for a caller-requested transaction limit. XRPScan's own default
// page size is 25 (live-confirmed); this connector doesn't attempt to
// exceed that per-page via a "limit" parameter, since XRPScan's docs
// describe pagination purely via the marker token, not a limit override -
// getTransactions() here returns one page (up to the observed default) and
// signals hasMore/nextCursor from the real marker, rather than assuming an
// unconfirmed limit parameter works.
const DEFAULT_TRANSACTION_LIMIT = 25;

const XRP_NATIVE_ASSET: UniversalAssetIdentifier = {
  chainId: XRP_CHAIN_ID,
  assetType: "native",
  // Must match priceProvider.ts's XRP_NATIVE_ASSET_PRICE_ID exactly - the
  // join key portfolio.ts uses to look up this asset's USD price.
  assetId: "xrp:native:XRP",
  symbol: "XRP",
  name: "XRP",
  decimals: 6,
  contractAddress: null,
  tokenId: null,
};

// transactionParsing/protocolDetection false at the CONNECTOR level only -
// this mirrors chains/bitcoin.ts's own "listed, not parsed by the
// connector" state. Real parsing exists (parsers/xrplTransaction.ts, this
// same PR) but wallet.ts calls it directly against xrpscan.ts's raw
// transaction data, not through this connector's getTransactions(), for
// the reason explained in this file's header comment - so from this
// connector's own point of view, transactions are still "listed only."
// tokenRetrieval false: trust-line/issued-currency support is PR 5 of the
// staged build, not this one - getTokenBalances always returns [] for now,
// same interim state Bitcoin's connector has for its own (structural, not
// staged) token-standard gap.
const XRP_CAPABILITIES: ChainAdapterCapabilities = {
  addressValidation: true,
  balanceRetrieval: true,
  transactionRetrieval: true,
  transactionParsing: false,
  tokenRetrieval: false,
  nftRetrieval: false,
  protocolDetection: false,
  internalTransferDetection: false,
  historicalTransactionRetrieval: true,
};

// Format-shape validation only (same spirit as bitcoin.ts/ethereum.ts's
// own regex checks - not full checksum validation). XRPL "classic"
// addresses are base58 (XRPL's own alphabet, not Bitcoin's), always start
// with "r", and are 25-35 characters - live-confirmed against
// rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH (34 chars) and several other real
// XRPScan-returned addresses during this connector's own verification.
const XRP_CLASSIC_ADDRESS_PATTERN = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;

function isValidXrplAddress(input: string): boolean {
  return XRP_CLASSIC_ADDRESS_PATTERN.test(input.trim());
}

function createSuccessResult<T>(
  data: T,
  warnings: ChainOperationResult<T>["warnings"] = [],
): ChainOperationResult<T> {
  return {
    status: warnings.length > 0 ? "partial" : "success",
    data,
    warnings,
  };
}

function createErrorResult<T>(
  error: unknown,
  code: string,
): ChainOperationResult<T> {
  const message =
    error instanceof Error ? error.message : "Unknown XRP connector error";

  return {
    status: "error",
    warnings: [],
    error: {
      code,
      message,
      retryable: true,
    },
  };
}

function parseXrpscanDate(date: string | undefined): number | null {
  if (!date) {
    return null;
  }

  const parsedMs = Date.parse(date);

  return Number.isFinite(parsedMs) ? Math.floor(parsedMs / 1000) : null;
}

function createUniversalTransaction(
  transaction: XrpscanTransaction,
): UniversalTransaction {
  return {
    chainId: XRP_CHAIN_ID,
    transactionId: transaction.hash,
    blockIdentifier: null,
    blockHeight: null,
    transactionIndex: null,
    timestamp: parseXrpscanDate(transaction.date),
    status:
      transaction.meta?.TransactionResult === "tesSUCCESS"
        ? "confirmed"
        : "failed",
    classifications: ["unknown"],
    initiator: null,
    signers: [],
    counterparties: [],
    transfers: [],
    fee: null,
    programOrContractIds: [],
    memo: null,
    rawDataAvailable: false,
    metadata: {
      provider: "xrpscan",
      transactionType: transaction.TransactionType,
      destinationTag: transaction.DestinationTag ?? null,
    },
  };
}

export const xrpConnectorDescriptor: BlockchainConnectorDescriptor = {
  chainId: XRP_CHAIN_ID,
  family: "xrp_ledger",
  supportLevel: "partial",
  capabilities: XRP_CAPABILITIES,
  providerNames: ["XRPScan"],
  limitations: [
    "Trust-line/issued-currency (non-XRP token) balances are not yet retrieved - getTokenBalances always returns an empty list. Support is planned as a later stage of this chain's rollout.",
    "Reserve-requirement-aware balance interpretation is not yet implemented - the reported native balance includes the account's non-spendable reserve, not just the spendable portion.",
    "Pagination beyond one page is not yet implemented in getTransactions - only the most recent page (XRPScan's own default page size) is returned, with hasMore reflecting whether a further page genuinely exists.",
    "Address validation is format-shape only (base58 prefix/length), not full checksum validation.",
  ],
};

export class XrpBlockchainConnector implements BlockchainConnector {
  readonly network = {
    id: XRP_CHAIN_ID,
    name: "XRP Ledger",
    family: "xrp_ledger" as const,
    networkType: "mainnet" as const,
    addressModel: "account" as const,
    nativeAssetSymbol: "XRP",
    nativeAssetDecimals: 6,
    finalityType: "deterministic" as const,
    capabilities: {
      supportsNativeAsset: true,
      supportsFungibleTokens: true,
      supportsNfts: false,
      supportsSmartContracts: false,
      supportsDefi: false,
      supportsStaking: false,
      supportsMemoOrTag: true,
      supportsInternalTransactions: false,
      supportsTransactionLogs: false,
      supportsTokenApprovals: false,
    },
    explorerUrl: "https://xrpscan.com",
    chainReference: "xrpl-mainnet",
    isEnabled: true,
  };

  readonly descriptor = xrpConnectorDescriptor;

  async validateAddress(
    address: string,
  ): Promise<ChainOperationResult<AddressValidationResult>> {
    const normalizedAddress = address.trim();
    const isValid = isValidXrplAddress(normalizedAddress);

    return createSuccessResult({
      chainId: XRP_CHAIN_ID,
      address,
      normalizedAddress: normalizedAddress || null,
      isValid,
      addressType: "unknown",
      // XRPL destination tags are a real, load-bearing concept (see the
      // XRPL integration investigation) for routing payments TO an
      // address, but they are not part of the address string itself and
      // are not required to look UP an account's own data - false here,
      // not a placeholder.
      memoOrTagRequired: false,
      reason: isValid
        ? null
        : "Input does not match a recognized XRP Ledger classic address format (base58, starting with \"r\").",
    });
  }

  async getNativeBalance(
    address: string,
  ): Promise<ChainOperationResult<NativeBalanceResult>> {
    try {
      const trimmedAddress = address.trim();
      const info = await getXrplAccountInfo(trimmedAddress);

      // Same independent-validation stance as bitcoin.ts's connector: a
      // missing/malformed balance field is a failed fetch, not a real $0
      // balance - not trusting xrpscan.ts's own guarantee blindly.
      const decimalAmount = Number(info.xrpBalance);

      if (!Number.isFinite(decimalAmount)) {
        throw new Error(
          "XRPScan did not return a valid balance for this address.",
        );
      }

      return createSuccessResult({
        chainId: XRP_CHAIN_ID,
        address: trimmedAddress,
        asset: XRP_NATIVE_ASSET,
        rawAmount: String(Math.round(decimalAmount * 1_000_000)),
        decimalAmount: String(decimalAmount),
        estimatedUsdValue: null,
        retrievedAt: new Date().toISOString(),
      });
    } catch (error) {
      return createErrorResult(error, "XRP_BALANCE_RETRIEVAL_FAILED");
    }
  }

  async getTokenBalances(
    address: string,
  ): Promise<ChainOperationResult<TokenBalancesResult>> {
    return createSuccessResult(
      {
        chainId: XRP_CHAIN_ID,
        address: address.trim(),
        balances: [],
        retrievedAt: new Date().toISOString(),
      },
      [
        {
          code: "XRP_TRUST_LINES_NOT_YET_RETRIEVED",
          message:
            "Trust-line/issued-currency balances are not yet retrieved for this wallet - this list is always empty for now, not an indication the wallet holds no other assets. Support is planned as a later stage of this chain's rollout.",
        },
      ],
    );
  }

  async getTransactions(
    address: string,
    request: TransactionPageRequest = {},
  ): Promise<ChainOperationResult<TransactionPageResult>> {
    try {
      const trimmedAddress = address.trim();
      const marker =
        typeof request.cursor === "string" ? request.cursor : undefined;

      const result = await getXrplAccountTransactions(
        trimmedAddress,
        marker,
      );

      const transactions = result.transactions.map(createUniversalTransaction);

      return createSuccessResult(
        {
          chainId: XRP_CHAIN_ID,
          address: trimmedAddress,
          transactions,
          nextCursor: result.marker ?? null,
          hasMore: Boolean(result.marker),
          retrievedAt: new Date().toISOString(),
        },
        [
          {
            code: "XRP_TRANSACTION_COVERAGE_PARTIAL",
            message: `Transactions are listed but not yet parsed by this connector's own getTransactions() - transfers are not populated here (wallet.ts's XRP branch parses XRPScan's raw data directly instead - see parsers/xrplTransaction.ts). Only ${DEFAULT_TRANSACTION_LIMIT} transaction(s) per page are returned.`,
          },
        ],
      );
    } catch (error) {
      return createErrorResult(error, "XRP_TRANSACTION_RETRIEVAL_FAILED");
    }
  }

  async getTransaction(
    transactionId: string,
  ): Promise<ChainOperationResult<TransactionLookupResult>> {
    // Not implemented in this stage of the build - XRPScan does expose a
    // single-transaction lookup, but nothing in this codebase calls
    // getTransaction() for any chain outside of a direct single-hash
    // lookup use case this PR doesn't need yet. Explicit "unsupported"
    // status, not a silent empty success, so a future caller can't
    // mistake this for "looked up, found nothing."
    return {
      status: "unsupported",
      warnings: [],
      error: {
        code: "XRP_TRANSACTION_LOOKUP_NOT_IMPLEMENTED",
        message: `Single-transaction lookup is not yet implemented for XRP Ledger (requested: ${transactionId.trim()}).`,
        retryable: false,
      },
    };
  }

  async getOldestTransaction(
    address: string,
  ): Promise<ChainOperationResult<OldestTransactionResult>> {
    try {
      const trimmedAddress = address.trim();

      // XRPScan's account-info response carries the account's real
      // AccountRoot creation timestamp (`inception`) directly - live-
      // confirmed present and accurate (cross-checked against a known-old
      // account during this connector's own verification). This is
      // XRPL's own authoritative activation record, not inferred from a
      // paginated transaction scan the way Bitcoin/Ethereum's oldest-
      // transaction detection has to be - no separate transaction-list
      // request needed here at all.
      const info = await getXrplAccountInfo(trimmedAddress);
      const timestamp = parseXrpscanDate(info.inception);

      return createSuccessResult({
        chainId: XRP_CHAIN_ID,
        address: trimmedAddress,
        transactionId: null,
        transaction: null,
        timestamp,
        retrievedAt: new Date().toISOString(),
      });
    } catch (error) {
      return createErrorResult(error, "XRP_OLDEST_TRANSACTION_FAILED");
    }
  }

  async getHealth(): Promise<ChainConnectorHealth> {
    return {
      chainId: XRP_CHAIN_ID,
      status: "healthy",
      checkedAt: new Date().toISOString(),
      providerNames: ["XRPScan"],
      notes: [
        "XRPScan's free tier requires no API key - live-confirmed, not assumed.",
        "No network request was performed during this health check.",
      ],
    };
  }
}

export const xrpBlockchainConnector = new XrpBlockchainConnector();
