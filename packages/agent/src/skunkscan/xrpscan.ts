// Raw XRPScan REST calls for XRP Ledger data. Mirrors blockchair.ts's/
// moralis.ts's/helius.ts's structure: small typed fetch functions, no SDK
// dependency (fetch() only).
//
// Provider choice: XRPScan was picked over Bithomp for the free/keyless
// tier - live-confirmed XRPScan's account-info and account-transactions
// endpoints both return real data with NO API key or auth header at all
// (HTTP 200, real payloads, not a stub/error shape), whereas Bithomp's
// documented free tier is a much tighter 10 requests/minute / 2,000/day
// and (per its own docs) requires a key. XRPScan's documented free
// ("Developer") tier is 10,000 requests/day - real, current pricing
// confirmed via docs.xrpscan.com/api-documentation/pricing at the time
// this was written, not assumed.
//
// Live-verified against a real, long-lived XRPL account
// (rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH, activated 2014-09-12 per its own
// `inception` field, cross-checkable on any XRPL explorer) - response
// shapes below match the actual live payloads, not just XRPScan's docs.
// One real discrepancy found this way: XRPScan's own docs describe
// `Amount` as "value and currency details" without giving the shape -
// live-confirmed it's always an object (`{value, currency}`, plus
// `issuer` for issued/non-XRP currencies), even for a plain XRP payment -
// never a bare drops string the way some other XRPL tooling represents
// it. Typed that way below, not assumed from the docs prose.
//
// Two distinct, inconsistent-with-each-other real error shapes,
// live-confirmed by actually calling both endpoints with bad input rather
// than trusting the docs:
// 1. A malformed/invalid address string ("Invalid address") - a genuine
//    non-2xx status (404), but with a PLAIN-TEXT body, not JSON.
// 2. A syntactically valid address that was never activated on the ledger
//    (no account exists) - account-info returns this as HTTP 200 with a
//    JSON `{"error": {"error": "actNotFound", ...}}` envelope (the exact
//    Blockchair-style "200 OK but really an error" trap this codebase
//    already has a name for), while account-transactions returns the SAME
//    JSON error envelope but with HTTP 404. Both endpoints are checked for
//    this shape regardless of status code below - relying on
//    response.ok alone would silently treat case 2 as a successful,
//    real-looking (but actually error-shaped) account/transaction result.

const XRPSCAN_BASE_URL = "https://api.xrpscan.com/api/v1";

// Same lesson already learned fixing Solana's token-holdings timeout and
// applied to blockchair.ts: fetch() only waits for response headers, not
// the full body, so the abort timer must stay armed across every await
// that touches the response, cleared only once in a shared finally.
const XRPSCAN_TIMEOUT_MS = 20_000;

export class XrpscanRequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string | null) {
    super(
      message
        ? `XRPScan request failed with status ${status}: ${message}`
        : `XRPScan request failed with status ${status}`,
    );
    this.name = "XrpscanRequestError";
    this.status = status;
  }
}

type XrpscanErrorEnvelope = {
  error?: {
    status?: string;
    error?: string;
    error_code?: number;
    error_message?: string;
  };
};

function asXrpscanErrorMessage(value: unknown): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const envelope = value as XrpscanErrorEnvelope;

  if (!envelope.error) {
    return null;
  }

  return (
    envelope.error.error_message ??
    envelope.error.error ??
    "Unknown XRPScan error"
  );
}

async function callXrpscanRest<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(
    () => controller.abort(),
    XRPSCAN_TIMEOUT_MS,
  );

  try {
    const response = await fetch(`${XRPSCAN_BASE_URL}${path}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    // Read the body once, as text, regardless of status - XRPScan's real
    // behavior mixes plain-text bodies (invalid-address case) and JSON
    // bodies (account-not-found case) across both 2xx and non-2xx
    // statuses (see this file's header comment), so neither "check
    // response.ok" nor "assume JSON" alone is safe here.
    const bodyText = await response.text();

    let parsedBody: unknown = null;
    try {
      parsedBody = bodyText ? JSON.parse(bodyText) : null;
    } catch {
      // Not JSON (e.g. the plain-text "Invalid address" case) - handled
      // below via bodyText directly.
    }

    const errorMessage = asXrpscanErrorMessage(parsedBody);

    if (!response.ok || errorMessage !== null) {
      throw new XrpscanRequestError(
        response.status,
        errorMessage ?? bodyText.trim() ?? null,
      );
    }

    return parsedBody as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        `XRPScan request timed out after ${XRPSCAN_TIMEOUT_MS}ms (${path})`,
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutHandle);
  }
}

// Only the fields this codebase actually reads - XRPScan's real response
// carries more (Flags, previousAffectingTransactionID, accountName, etc.,
// live-confirmed above), left untyped here rather than fully modeled,
// matching blockchair.ts's own "only what's used" convention.
export type XrpscanAccountInfo = {
  Account: string;
  // Decimal XRP, e.g. "1113.551285" - NOT drops. XRPScan also returns
  // `Balance` (drops, e.g. "1113551285") but every other chain's raw
  // provider layer in this codebase already hands the connector a decimal
  // amount, so this is the field actually used.
  xrpBalance: string;
  Sequence: number;
  OwnerCount: number;
  // ISO 8601 - the account's real activation timestamp, live-confirmed
  // present and accurate (cross-checked against a known-old account).
  // Equivalent to Blockchair's first_seen_receiving for age purposes, but
  // arguably more authoritative here: it's XRPL's own AccountRoot
  // creation record, not inferred from a paginated transaction scan.
  inception?: string;
  // The account that funded this account's activation, and how much (in
  // decimal XRP, not drops - live-confirmed: a real account's
  // initial_balance of 30 matches a plausible real top-up amount, not
  // 0.00003 XRP). Together with `inception` and `tx_hash`, this is a
  // direct, authoritative "who funded this wallet and when" record -
  // unlike Bitcoin/Ethereum, no scan of the transaction history is needed
  // to answer analyzers/funding.ts's question, since XRPL treats account
  // activation as a first-class, permanently-recorded ledger event.
  // Absent only for accounts this tracking doesn't cover (e.g. one of the
  // handful of XRPL genesis accounts) - treated as "funding unknown" by
  // wallet.ts, the same fallback every other chain already has for a
  // wallet whose first transaction can't be determined.
  parent?: string;
  initial_balance?: number;
  tx_hash?: string;
};

export async function getXrplAccountInfo(
  address: string,
): Promise<XrpscanAccountInfo> {
  return callXrpscanRest<XrpscanAccountInfo>(
    `/account/${encodeURIComponent(address)}`,
  );
}

// Live-confirmed shape: Amount/DeliverMax are always {value, currency}
// objects (plus `issuer` when currency !== "XRP") - see this file's header
// comment. meta.delivered_amount is the actually-received amount (use this
// over top-level Amount/DeliverMax when parsing - it's XRPL's own
// documented way of expressing "what really arrived," accounting for
// partial payments).
export type XrpscanCurrencyAmount = {
  value: number | string;
  currency: string;
  issuer?: string;
};

export type XrpscanTransaction = {
  hash: string;
  Account: string;
  Destination?: string;
  DestinationTag?: number;
  TransactionType: string;
  Amount?: XrpscanCurrencyAmount;
  DeliverMax?: XrpscanCurrencyAmount;
  // ISO 8601, live-confirmed (see this file's header comment) - not epoch
  // seconds, not a rippled-native "ripple epoch" value.
  date?: string;
  meta?: {
    TransactionResult?: string;
    delivered_amount?: XrpscanCurrencyAmount;
  };
};

export type XrpscanAccountTransactions = {
  account: string;
  transactions: XrpscanTransaction[];
  // Marker-based pagination (live-confirmed, not offset/limit-based) -
  // opaque token from one response, passed back as `?marker=` to get the
  // next page. Present only when more pages exist.
  marker?: string;
  limit: number;
};

export async function getXrplAccountTransactions(
  address: string,
  marker?: string,
): Promise<XrpscanAccountTransactions> {
  const query = marker ? `?marker=${encodeURIComponent(marker)}` : "";

  return callXrpscanRest<XrpscanAccountTransactions>(
    `/account/${encodeURIComponent(address)}/transactions${query}`,
  );
}

// XRPScan's page size is fixed at 25 and ignores a `limit` query override
// (live-confirmed: requesting limit=5 still returns 25) - this loops via
// the real marker token to assemble a larger sample, matching this
// codebase's other account-based chains' sample sizes (Ethereum: 100)
// rather than settling for XRPScan's smaller default. Always returns the
// MOST RECENT transactions (XRPScan exposes no ascending/oldest-first
// mode either - live-confirmed a `forward=true` param is silently
// ignored), same limitation every other chain's "recent sample, not full
// history" analysis already has and discloses.
export async function getXrplRecentAccountTransactions(
  address: string,
  targetCount: number,
): Promise<XrpscanTransaction[]> {
  const transactions: XrpscanTransaction[] = [];
  let marker: string | undefined;

  do {
    const page = await getXrplAccountTransactions(address, marker);
    transactions.push(...page.transactions);
    marker = page.marker;
  } while (marker && transactions.length < targetCount);

  return transactions.slice(0, targetCount);
}
