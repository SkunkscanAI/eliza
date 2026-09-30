/**
 * SkunkScan saved-search routes: a logged-in user's own investigation
 * history (Milestone 4, PR 5). Split out from skunkscan-routes.ts the same
 * way auth got its own file - a distinct concern, not a grab-bag addition.
 */
import type http from "node:http";
import { resolveSessionUser } from "./skunkscan-auth-routes";
import { InvestigationStore } from "../skunkscan/investigations/store";
import type { StoredInvestigationSummary } from "../skunkscan/investigations/repository";
import type { RuntimeDb } from "../skunkscan/candidates/sql";

type JsonHelper = (res: http.ServerResponse, data: unknown, status?: number) => void;
type ErrorHelper = (res: http.ServerResponse, message: string, status?: number) => void;

function toPublicSummary(summary: StoredInvestigationSummary) {
  return {
    id: summary.investigationId,
    chain: summary.chain,
    address: summary.address,
    tier: summary.tier ?? null,
    headline: summary.headline ?? null,
    savedAt: summary.savedAt,
  };
}

export async function handleSkunkScanInvestigationsRoute(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  pathname: string,
  method: string,
  db: RuntimeDb | undefined,
  helpers: { json: JsonHelper; error: ErrorHelper },
): Promise<boolean> {
  if (pathname !== "/api/skunkscan/investigations") return false;

  if (method !== "GET") {
    helpers.error(res, "Method not allowed", 405);
    return true;
  }

  const user = await resolveSessionUser(req, res, db);
  if (!user) {
    helpers.error(res, "Not logged in.", 401);
    return true;
  }

  if (!db) {
    helpers.error(res, "Search history is not available in this environment.", 503);
    return true;
  }

  const store = new InvestigationStore(db);
  const summaries = await store.listByOwner(user.id);
  helpers.json(res, { investigations: summaries.map(toPublicSummary) }, 200);
  return true;
}
