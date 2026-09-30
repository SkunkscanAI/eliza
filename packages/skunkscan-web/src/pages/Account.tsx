import { useEffect, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { Button } from "../components/ui/button";
import { API_BASE_URL } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

type SavedInvestigation = {
  id: string;
  chain: string;
  address: string;
  tier: "green" | "yellow" | "red" | null;
  headline: string | null;
  savedAt: string;
};

// Same 3-color convention as TrustCheckWidget's own TIER_STYLE - a saved
// search's dot uses the identical color meaning as the free Trust Check
// card, not a second color scheme for the same 3 states.
const TIER_DOT_COLOR: Record<"green" | "yellow" | "red", string> = {
  green: "bg-signal-green",
  yellow: "bg-signal-yellow",
  red: "bg-signal-red",
};

function truncateAddress(address: string): string {
  return address.length > 14 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}

function formatSavedDate(savedAt: string): string {
  const parsed = new Date(savedAt);
  return Number.isNaN(parsed.getTime()) ? savedAt : parsed.toISOString().slice(0, 10);
}

function RecentSearches() {
  const [investigations, setInvestigations] = useState<SavedInvestigation[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(`${API_BASE_URL}/api/skunkscan/investigations`, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load recent searches.");
        const body = (await response.json()) as { investigations: SavedInvestigation[] };
        if (!cancelled) setInvestigations(body.investigations);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load recent searches.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <p className="text-sm text-signal-red">{error}</p>;
  }

  if (investigations === null) {
    return <p className="text-sm text-ink-400">Loading…</p>;
  }

  if (investigations.length === 0) {
    return (
      <p className="text-sm text-ink-400">
        No searches yet - wallets you check will show up here.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-ink-800">
      {investigations.map((item) => (
        <li key={item.id}>
          <Link
            to={`/report/${item.chain}/${encodeURIComponent(item.address)}`}
            className="flex items-center gap-3 py-3 hover:bg-ink-800/40"
          >
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                item.tier ? TIER_DOT_COLOR[item.tier] : "bg-ink-600"
              }`}
              aria-hidden="true"
            />
            <span className="flex-1 min-w-0">
              <span className="block truncate text-sm text-ink-50">
                {item.chain} · {truncateAddress(item.address)}
              </span>
              {item.headline && (
                <span className="block truncate text-xs text-ink-400">{item.headline}</span>
              )}
            </span>
            <span className="shrink-0 text-xs text-ink-400">{formatSavedDate(item.savedAt)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

// "Change password" reuses the existing forgot-password flow rather than a
// dedicated authenticated change-password endpoint - none exists yet (see
// this milestone's own scoping decision). Sends the reset email to the
// logged-in user's own address; they complete it the same way a real
// password reset already works.
export function Account() {
  const [searchParams] = useSearchParams();
  const { user, logout } = useAuth();
  const [changePasswordState, setChangePasswordState] = useState<"idle" | "sending" | "sent">(
    "idle",
  );
  const [loggingOut, setLoggingOut] = useState(false);

  if (user === undefined) {
    return (
      <section className="mx-auto max-w-md px-4 py-12 text-center sm:px-6 sm:py-16">
        <p className="text-base text-ink-400">Loading…</p>
      </section>
    );
  }

  if (user === null) {
    return <Navigate to="/login" replace />;
  }

  async function handleChangePassword() {
    if (!user || changePasswordState !== "idle") return;
    setChangePasswordState("sending");
    try {
      await fetch(`${API_BASE_URL}/api/skunkscan/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });
    } finally {
      setChangePasswordState("sent");
    }
  }

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    await logout();
  }

  return (
    <section className="mx-auto max-w-md px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-2xl font-bold text-ink-50 sm:text-3xl">Your account</h1>

      {searchParams.get("justRegistered") === "1" && !user.emailVerified && (
        <p className="mt-4 rounded-lg border border-ink-700 bg-ink-900/60 p-4 text-sm text-ink-200">
          Check your inbox to verify your email address.
        </p>
      )}

      <div className="mt-8 rounded-2xl border border-ink-800 bg-ink-900/60 p-6">
        <dl className="space-y-4">
          <div>
            <dt className="text-sm text-ink-400">Email</dt>
            <dd className="mt-1 text-base text-ink-50">{user.email}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-400">Email status</dt>
            <dd className="mt-1 text-base">
              {user.emailVerified ? (
                <span className="text-signal-green">Verified</span>
              ) : (
                <span className="text-signal-yellow">Not verified</span>
              )}
            </dd>
          </div>
        </dl>

        <div className="mt-6 border-t border-ink-800 pt-6">
          {changePasswordState === "sent" ? (
            <p className="text-sm text-ink-200">
              If your account is reachable, a password reset link has been sent to {user.email}.
            </p>
          ) : (
            <Button
              variant="secondary"
              onClick={handleChangePassword}
              disabled={changePasswordState === "sending"}
            >
              {changePasswordState === "sending" ? "Sending…" : "Change password"}
            </Button>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-ink-800 bg-ink-900/60 p-6">
        <h2 className="text-lg font-semibold text-ink-50">Plan &amp; Billing</h2>
        <p className="mt-2 text-sm text-ink-200">
          You're currently on the Free plan. Paid plans are coming soon.
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-ink-800 bg-ink-900/60 p-6">
        <h2 className="text-lg font-semibold text-ink-50">Recent searches</h2>
        <div className="mt-4">
          <RecentSearches />
        </div>
      </div>

      <Button variant="ghost" onClick={handleLogout} disabled={loggingOut} className="mt-6">
        {loggingOut ? "Logging out…" : "Log out"}
      </Button>
    </section>
  );
}
