export type SolanaBalanceResult = {
  address: string;
  lamports: number;
  sol: number;
};

export type SolanaSignatureResult = {
  signature: string;
  slot?: number;
  blockTime?: number | null;
  err?: unknown;
};

export type SolanaOldestSignatureResult = {
  signature: string | null;
  blockTime: number | null;
};

export type SolanaParsedNativeTransfer = {
  fromUserAccount?: string;
  toUserAccount?: string;
  amount?: number;
};

export type SolanaParsedTokenTransfer = {
  fromUserAccount?: string;
  toUserAccount?: string;
  fromTokenAccount?: string;
  toTokenAccount?: string;
  tokenAmount?: number;
  mint?: string;
};

export type SolanaParsedTokenBalanceChange = {
  userAccount?: string;
  tokenAccount?: string;
  mint?: string;
  rawTokenAmount?: {
    tokenAmount?: string;
    decimals?: number;
  };
};

export type SolanaParsedAccountData = {
  account?: string;
  nativeBalanceChange?: number;
  tokenBalanceChanges?: SolanaParsedTokenBalanceChange[];
};

export type SolanaParsedInstruction = {
  accounts?: string[];
  data?: string;
  programId?: string;
  innerInstructions?: SolanaParsedInstruction[];
};

export type SolanaParsedTransaction = {
  description?: string;
  type?: string;
  source?: string;
  fee?: number;
  feePayer?: string;
  signature?: string;
  slot?: number;
  timestamp?: number;

  nativeTransfers?: SolanaParsedNativeTransfer[];
  tokenTransfers?: SolanaParsedTokenTransfer[];
  accountData?: SolanaParsedAccountData[];

  transactionError?: {
    error?: unknown;
  } | null;

  instructions?: SolanaParsedInstruction[];
};

// Solana spam-NFT filtering: DEFERRED, not implemented. This is a known,
// investigated gap - not an oversight. Unlike the EVM chains
// (Ethereum/BSC/Base, see moralis.ts's isLikelySpamNftTransaction), Solana's
// recentTransactions/transactionCountSample/activityLevel currently include
// NFT spam uncounted, because Helius has no native spam/scam flag anywhere
// in its API (confirmed: not in the enhanced-transactions schema above, not
// in the DAS getAssetsByOwner schema - only an unrelated `burnt` field
// exists there), and two candidate pattern-based signals were tested against
// real wallets and both produced real false positives:
//
// 1. `feePayer !== wallet` alone (the recipient didn't pay gas, so it was
//    pushed to them, not chosen). Correctly caught 8/8 confirmed spam
//    entries in a real spam-heavy wallet (all COMPRESSED_NFT_MINT /
//    BUBBLEGUM, minted directly to the victim by a bot). But it also
//    false-positives on real, wanted, gas-sponsored distributions: the
//    Solana Mobile "Seeker Genesis Token" (a real, non-transferable reward
//    for real Seeker phone owners) is sponsored-gas the same way - the
//    recipient wallet held exactly that one token and nothing else, yet the
//    signal would flag it as spam.
// 2. `feePayer !== wallet` AND `type === "COMPRESSED_NFT_MINT"` (narrowing
//    to "someone else minted a brand-new disposable cNFT directly into your
//    wallet", not just any sponsored transfer) - still false-positives.
//    "DePunks", a real 10k-supply generative PFP collection (not a
//    phishing lure), was minted the exact same way as confirmed spam:
//    type=COMPRESSED_NFT_MINT, source=BUBBLEGUM, feePayer = a project
//    deployer wallet, not the recipient. There is no field-level
//    distinction between "a real project sponsor-minted you something you
//    wanted" and "a spam bot sponsor-minted you something you didn't" -
//    `creators[].verified` doesn't help either (false even on the
//    legitimate DePunks asset).
//
// Do not reintroduce either signal without a validated fix for these
// specific false positives. Phase 2 (Solana spam-NFT filtering) is a
// deferred, open research item, not closed - see wallet.ts's Solana branch
// for the corresponding user-facing transparency note.

function getHeliusApiKey(): string {
  const apiKey = process.env.HELIUS_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      "Missing HELIUS_API_KEY environment variable",
    );
  }

  return apiKey;
}

function getHeliusRpcUrl(): string {
  const apiKey = getHeliusApiKey();

  return `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;
}

function getHeliusApiUrl(path: string): string {
  const apiKey = getHeliusApiKey();

  return `https://api.helius.xyz${path}?api-key=${apiKey}`;
}

async function callHeliusRpc<T>(
  id: string,
  method: string,
  params: unknown[],
  options?: { timeoutMs?: number },
): Promise<T> {
  const controller = options?.timeoutMs
    ? new AbortController()
    : undefined;
  const timeoutHandle =
    controller && options?.timeoutMs
      ? setTimeout(() => controller.abort(), options.timeoutMs)
      : undefined;

  // The timeout must stay armed across BOTH the fetch() call and the
  // response.json() read, not just fetch() - live-confirmed that fetch()
  // resolves as soon as response headers arrive (~700ms even for a reply
  // whose body takes 40+ seconds to fully transfer), so a timer cleared
  // right after fetch() resolves never protects the actual slow part. Both
  // steps share the same AbortSignal and both must run inside this try, or
  // the clearTimeout in finally fires too early and disarms the guard
  // before the body read that actually needs it even starts.
  try {
    const response = await fetch(getHeliusRpcUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id,
        method,
        params,
      }),
      signal: controller?.signal,
    });

    if (!response.ok) {
      throw new Error(
        `Helius request failed with status ${response.status}`,
      );
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(
        data.error.message ??
          "Helius returned an error",
      );
    }

    return data.result as T;
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

export async function getSolanaBalance(
  address: string,
): Promise<SolanaBalanceResult> {
  if (!address || address.trim().length === 0) {
    throw new Error("Wallet address is required");
  }

  const walletAddress = address.trim();

  const lamports = await callHeliusRpc<number>(
    "skunkscan-balance",
    "getBalance",
    [walletAddress],
  ).then((result: any) => result?.value);

  if (typeof lamports !== "number") {
    throw new Error(
      "Invalid Helius balance response",
    );
  }

  return {
    address: walletAddress,
    lamports,
    sol: lamports / 1_000_000_000,
  };
}

export async function getSolanaRecentSignatures(
  address: string,
  limit = 20,
): Promise<SolanaSignatureResult[]> {
  if (!address || address.trim().length === 0) {
    throw new Error("Wallet address is required");
  }

  const result =
    await callHeliusRpc<SolanaSignatureResult[]>(
      "skunkscan-signatures",
      "getSignaturesForAddress",
      [
        address.trim(),
        {
          limit,
        },
      ],
    );

  // A non-array result is a malformed RPC response, not "0 signatures" -
  // real empty results are already `[]`, which passes Array.isArray.
  // Silently substituting `[]` here would understate a wallet's real
  // transaction history without any error, the same bug class found in
  // Bitcoin's connector (see blockchair.ts's dashboard functions).
  if (!Array.isArray(result)) {
    throw new Error(
      "Helius returned a malformed getSignaturesForAddress response.",
    );
  }

  return result;
}

// sort-order=asc&limit=1 is a genuine single-call, server-side ascending
// lookup - not a "fetch a capped recent page and take the last entry"
// approximation (the bug Bitcoin's connector had). Live-confirmed against
// the Wrapped SOL mint (So11111111111111111111111111111111111111112) - a
// system account created at Solana's genesis (March 2020) that this same
// investigation found processes many transactions per second (100 recent
// transactions all landed within one single second): this call correctly
// returned blockTime 0 (slot 0, the genesis slot, which predates Unix
// timestamps - the correct representation of "the true beginning of the
// chain," not a bug). A capped-page bug applied to an account this active
// would have returned today's date, off by over 6 years - it didn't.
// Cross-checked stable against sort-order=asc&limit=10 (identical first
// entry). Investigated 2026-08-14.
export async function getSolanaOldestKnownSignature(
  address: string,
): Promise<SolanaOldestSignatureResult> {
  if (!address || address.trim().length === 0) {
    throw new Error("Wallet address is required");
  }

  const walletAddress = address.trim();

  const response = await fetch(
    `${getHeliusApiUrl(`/v0/addresses/${walletAddress}/transactions`)}&sort-order=asc&limit=1`,
  );

  if (!response.ok) {
    throw new Error(
      `Helius request failed with status ${response.status}`,
    );
  }

  const transactions =
    (await response.json()) as SolanaParsedTransaction[];

  // A non-array response here is malformed, not "this wallet has no
  // transactions" - a genuinely empty result is a real `[]`, which is
  // handled correctly below (oldest undefined -> signature/blockTime null,
  // a legitimate "never used" result). Silently treating malformed the
  // same as empty would report a wallet with real history as brand new.
  if (!Array.isArray(transactions)) {
    throw new Error(
      "Helius returned a malformed oldest-transaction response.",
    );
  }

  const oldest = transactions[0];

  return {
    signature: oldest?.signature ?? null,
    blockTime:
      typeof oldest?.timestamp === "number"
        ? oldest.timestamp
        : null,
  };
}

export async function getSolanaParsedTransactions(
  signatures: string[],
): Promise<SolanaParsedTransaction[]> {
  const cleanedSignatures = signatures
    .map((signature) => signature.trim())
    .filter(Boolean);

  if (cleanedSignatures.length === 0) {
    return [];
  }

  const response = await fetch(
    getHeliusApiUrl("/v0/transactions"),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transactions: cleanedSignatures,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Helius transaction parse failed with status ${response.status}`,
    );
  }

  const data = await response.json();

  // A non-array response is malformed, not "none of these transactions
  // parsed" - silently returning [] here degrades funding/relationships/
  // exposure/age evidence without surfacing an error.
  if (!Array.isArray(data)) {
    throw new Error(
      "Helius returned a malformed transaction batch-parse response.",
    );
  }

  return data;
}

export type SolanaTokenHolding = {
  mint: string;
  amount: number;
  decimals: number;
  rawAmount: string;
};

export type SolanaTokenHoldingsResult = {
  holdings: SolanaTokenHolding[];
  // True when the real holding count exceeds what's returned above - either
  // because it was truncated to MAX_SOLANA_TOKEN_HOLDINGS after a successful
  // fetch, or because the fetch itself was aborted for taking too long (see
  // below) and holdings is empty. totalCount is the real count when known,
  // or null when the timeout fired before we ever learned it.
  truncated: boolean;
  totalCount: number | null;
};

// getTokenAccountsByOwner has no server-side pagination/limit parameter in
// the Solana JSON-RPC spec (unlike getSignaturesForAddress's `limit`) - live-
// confirmed against a real 1.4M-token-account wallet
// (5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1, investigated 2026-08-11):
// the RPC node always returns the full result set regardless of any params
// passed (dataSlice is documented as ignored under jsonParsed encoding, and
// there is no limit/offset equivalent), so a Moralis-style "cap what's
// fetched via pagination" isn't achievable here - the network transfer +
// JSON parse of the full response happens no matter what. That real wallet's
// getTokenAccountsByOwner call alone took 48.5s (of an ~65s total
// investigation), well past what a synchronous HTTP client (ReqBin,
// production 502s) will wait for. TOKEN_HOLDINGS_TIMEOUT_MS bounds the wait
// itself via AbortController; MAX_SOLANA_TOKEN_HOLDINGS is a second,
// independent guard for the case where the response DOES arrive in time but
// still has an unreasonable count (protects downstream processing and the
// price-lookup chunking in providers/pricing/solana.ts).
const TOKEN_HOLDINGS_TIMEOUT_MS = 20_000;
const MAX_SOLANA_TOKEN_HOLDINGS = 2000;

export async function getSolanaTokenHoldings(
  address: string,
): Promise<SolanaTokenHoldingsResult> {
  if (!address || address.trim().length === 0) {
    throw new Error("Wallet address is required");
  }

  let accounts: unknown[];
  try {
    accounts = await callHeliusRpc<any[]>(
      "skunkscan-token-accounts",
      "getTokenAccountsByOwner",
      [
        address.trim(),
        {
          programId:
            "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        },
        {
          encoding: "jsonParsed",
        },
      ],
      { timeoutMs: TOKEN_HOLDINGS_TIMEOUT_MS },
    ).then((result: any) => result?.value);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      // Wallet holds an extremely large number of token accounts (spam/dust
      // is the common real-world cause - see the comment above) - the RPC
      // node was still transferring the response when the timeout fired.
      // Degrade gracefully rather than blocking the whole investigation.
      return { holdings: [], truncated: true, totalCount: null };
    }
    throw error;
  }

  // Distinct from the AbortError branch above (a genuine timeout, honestly
  // surfaced as truncated:true) - this is a non-array result for some OTHER
  // reason, i.e. a malformed response. Previously this silently reported
  // "truncated: false, totalCount: 0" - a confident "wallet holds 0 token
  // accounts" claim indistinguishable from a real empty wallet. Throwing
  // matches getSolanaBalance's existing correct pattern in this same file.
  if (!Array.isArray(accounts)) {
    throw new Error(
      "Helius returned a malformed getTokenAccountsByOwner response.",
    );
  }

  const holdings = accounts
    .map((account: any) => {
      const info =
        account?.account?.data?.parsed?.info;

      const tokenAmount = info?.tokenAmount;

      return {
        mint: String(info?.mint ?? ""),
        amount: Number(
          tokenAmount?.uiAmount ?? 0,
        ),
        decimals: Number(
          tokenAmount?.decimals ?? 0,
        ),
        rawAmount: String(
          tokenAmount?.amount ?? "0",
        ),
      };
    })
    .filter(
      (token) =>
        token.mint.length > 0 &&
        token.amount > 0,
    );

  const truncated = holdings.length > MAX_SOLANA_TOKEN_HOLDINGS;

  return {
    holdings: truncated
      ? holdings.slice(0, MAX_SOLANA_TOKEN_HOLDINGS)
      : holdings,
    truncated,
    totalCount: holdings.length,
  };
}

export type SolanaNftHolding = {
  mint: string;
  name: string | null;
  collection: string | null;
  imageUrl: string | null;
};

type HeliusDasGrouping = {
  group_key?: string;
  group_value?: string;
  collection_metadata?: {
    name?: string;
  };
};

type HeliusDasFile = {
  uri?: string;
  mime?: string;
};

type HeliusDasAsset = {
  id?: string;
  interface?: string;
  content?: {
    metadata?: {
      name?: string;
    };
    links?: {
      image?: string;
    };
    files?: HeliusDasFile[];
  };
  grouping?: HeliusDasGrouping[];
};

type HeliusGetAssetsByOwnerResponse = {
  jsonrpc?: string;
  id?: string;
  result?: {
    total?: number;
    limit?: number;
    page?: number;
    items?: HeliusDasAsset[];
  };
  error?: {
    code?: number;
    message?: string;
  };
};

function isNftAsset(
  asset: HeliusDasAsset,
): boolean {
  const assetInterface = String(
    asset.interface ?? "",
  )
    .trim()
    .toLowerCase();

  return (
    assetInterface === "v1_nft" ||
    assetInterface === "programmablenft" ||
    assetInterface === "programmable_nft" ||
    assetInterface === "custom" ||
    assetInterface.includes("nft")
  );
}

function getNftCollection(
  asset: HeliusDasAsset,
): string | null {
  if (!Array.isArray(asset.grouping)) {
    return null;
  }

  const collectionGroup = asset.grouping.find(
    (group) =>
      group?.group_key === "collection",
  );

  if (!collectionGroup) {
    return null;
  }

  const collectionName =
    collectionGroup.collection_metadata?.name?.trim();

  if (collectionName) {
    return collectionName;
  }

  const collectionAddress =
    collectionGroup.group_value?.trim();

  return collectionAddress || null;
}

function getNftImageUrl(
  asset: HeliusDasAsset,
): string | null {
  const linkedImage =
    asset.content?.links?.image?.trim();

  if (linkedImage) {
    return linkedImage;
  }

  const files = asset.content?.files;

  if (!Array.isArray(files)) {
    return null;
  }

  const imageFile = files.find((file) => {
    const mime = file?.mime
      ?.trim()
      .toLowerCase();

    return (
      typeof mime === "string" &&
      mime.startsWith("image/") &&
      Boolean(file?.uri?.trim())
    );
  });

  if (imageFile?.uri?.trim()) {
    return imageFile.uri.trim();
  }

  const firstFileUrl = files.find(
    (file) => Boolean(file?.uri?.trim()),
  )?.uri;

  return firstFileUrl?.trim() || null;
}

export async function getSolanaNftHoldings(
  address: string,
): Promise<SolanaNftHolding[]> {
  const walletAddress = address.trim();

  if (!walletAddress) {
    throw new Error(
      "Wallet address is required",
    );
  }

  const response = await fetch(
    getHeliusRpcUrl(),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "skunkscan-nft-holdings",
        method: "getAssetsByOwner",
        params: {
          ownerAddress: walletAddress,
          page: 1,
          limit: 100,
          displayOptions: {
            showFungible: false,
            showNativeBalance: false,
            showCollectionMetadata: true,
            showUnverifiedCollections: false,
          },
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Helius NFT request failed with status ${response.status}`,
    );
  }

  const data =
    (await response.json()) as
      HeliusGetAssetsByOwnerResponse;

  if (data.error) {
    throw new Error(
      `Helius NFT request failed: ${
        data.error.message ??
        "Unknown DAS API error"
      }`,
    );
  }

  const items = data.result?.items;

  // Same honesty requirement as the other Helius functions above - a
  // missing/malformed `items` field is a malformed response, not "this
  // wallet holds 0 NFTs." NFT holdings are supplementary display data
  // (not used by any analyzer - see wallet.ts's tolerance comment), so a
  // thrown error here still degrades to an empty list at the connector
  // boundary rather than failing the whole investigation - but it does so
  // via an honest error path, not by pretending this function itself
  // succeeded with real data.
  if (!Array.isArray(items)) {
    throw new Error(
      "Helius returned a malformed getAssetsByOwner response.",
    );
  }

  return items
    .filter(isNftAsset)
    .slice(0, 10)
    .map((asset) => ({
      mint: String(asset.id ?? "").trim(),
      name:
        asset.content?.metadata?.name?.trim() ||
        null,
      collection: getNftCollection(asset),
      imageUrl: getNftImageUrl(asset),
    }))
    .filter((nft) => nft.mint.length > 0);
}
