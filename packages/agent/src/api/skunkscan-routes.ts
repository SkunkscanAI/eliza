import type http from "node:http";
import type { IAgentRuntime } from "@elizaos/core";
import { investigateWallet } from "../skunkscan/wallet";
import { isSupportedChain, SUPPORTED_CHAINS, SupportedChain } from "../skunkscan/types";
import { buildTrustCheckCard } from "../skunkscan/analyzers/trustCheckCard";
import type { RuntimeDb } from "../skunkscan/candidates/sql";

// Same cast used by services/approval/sql.ts and
// services/knowledge-graph/sql.ts for the same purpose - `runtime.adapter.db`
// isn't typed as this narrow `{ execute }` shape at the @elizaos/core level,
// so every raw-SQL caller in this codebase narrows it the same way at the
// point of use. Returns undefined (not a throw) when no runtime/adapter is
// available - e.g. a standalone script - so pattern-alert detection can
// still run without persistence rather than fail the whole investigation.
function resolveRuntimeDb(runtime: IAgentRuntime | null | undefined): RuntimeDb | undefined {
  return (runtime?.adapter as { db?: RuntimeDb } | undefined)?.db;
}

type JsonHelper = (
  res: http.ServerResponse,
  data: unknown,
  status?: number,
) => void;

type ErrorHelper = (
  res: http.ServerResponse,
  message: string,
  status?: number,
) => void;

type ReadJsonBodyHelper = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
) => Promise<Record<string, unknown> | null>;

// Shared by both routes below - resolves and validates {chain, address} from
// the request body, or writes the appropriate error response itself and
// returns null so the caller just needs to check for that.
async function readWalletRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  helpers: {
    json: JsonHelper;
    readJsonBody: ReadJsonBodyHelper;
  },
): Promise<{ chain: SupportedChain; address: string } | null> {
  const body = await helpers.readJsonBody(req, res);
  if (!body) return null;

  const chain = typeof body.chain === "string" ? body.chain : "solana";
  const address = typeof body.address === "string" ? body.address : "";

  if (!isSupportedChain(chain)) {
    helpers.json(
      res,
      {
        error: "Unsupported chain",
        supportedChains: SUPPORTED_CHAINS,
      },
      400,
    );
    return null;
  }

  return { chain, address };
}

export async function handleSkunkScanRoute(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  pathname: string,
  method: string,
  helpers: {
    json: JsonHelper;
    error: ErrorHelper;
    readJsonBody: ReadJsonBodyHelper;
    // Optional so callers without a booted runtime (e.g. a future
    // standalone smoke test of this route module) still compile - pattern
    // alert detection degrades to non-persisted when this is absent, same
    // as investigateWallet()'s own `options.db` fallback.
    runtime?: IAgentRuntime | null;
  },
): Promise<boolean> {
  const db = resolveRuntimeDb(helpers.runtime);

  if (pathname === "/api/skunkscan/trust-check") {
    if (method !== "POST") {
      helpers.error(res, "Method not allowed", 405);
      return true;
    }

    const parsed = await readWalletRequest(req, res, helpers);
    if (!parsed) return true;

    const result = await investigateWallet(parsed.chain, parsed.address, { db });
    const card = buildTrustCheckCard(result);

    helpers.json(res, card, result.status === "supported" ? 200 : 400);
    return true;
  }

  if (pathname !== "/api/skunkscan/wallet") {
    return false;
  }

  if (method !== "POST") {
    helpers.error(res, "Method not allowed", 405);
    return true;
  }

  const parsed = await readWalletRequest(req, res, helpers);
  if (!parsed) return true;

  const result = await investigateWallet(parsed.chain, parsed.address, { db });

  helpers.json(res, result, result.status === "supported" ? 200 : 400);
  return true;
}
